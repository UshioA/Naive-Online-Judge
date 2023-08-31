package service

import (
	"bufio"
	"context"
	"errors"
	"io"
	"log"
	"naive-server/config"
	"naive-server/models"
	"strings"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"github.com/minio/minio-go/v7"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type resType struct {
	res string
	err error
}

func build(ctx context.Context, cli *client.Client, config config.Config, minioClient *minio.Client, gt models.GraderTemplate) (chan resType, error) {
	file, err := minioClient.GetObject(ctx, config.Minio.Bucket, gt.FileName(), minio.GetObjectOptions{})
	if err != nil {
		return nil, err
	}
	defer file.Close()
	resp, err := cli.ImageBuild(ctx, file, types.ImageBuildOptions{
		Dockerfile:  "Dockerfile",
		Tags:        []string{gt.TagName(config.Docker.Url)},
		Remove:      true,
		ForceRemove: true,
		NoCache:     true,
	})
	if err != nil {
		return nil, err
	}
	msgChan := make(chan resType, 128)
	go func() {
		scanner := bufio.NewScanner(resp.Body)
		for scanner.Scan() {
			msgChan <- resType{scanner.Text(), nil}
		}
		if scanner.Err() == nil {
			msgChan <- resType{"", io.EOF}
		} else {
			msgChan <- resType{"", scanner.Err()}
		}
		close(msgChan)
	}()
	return msgChan, nil
}

func updateGT(gt models.GraderTemplate, gtColl *mongo.Collection) error {
	var old models.GraderTemplate
	err := gtColl.FindOne(context.TODO(), bson.M{"_id": gt.ID}).Decode(&old)
	if err != nil {
		return err
	}
	if old.IsHuman || old.ImageTag != gt.ImageTag {
		return errors.New("grader changed")
	}
	_, err = gtColl.UpdateByID(context.Background(), gt.ID, bson.D{{Key: "$set", Value: gt}})
	return err
}

func ListenBuilder(config config.Config, gtColl *mongo.Collection, minioClient *minio.Client, builderChan chan models.GraderTemplate) {
	log.Println("Listening builder ...")
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatalln(err)
	}
	for gt := range builderChan {
		log.Printf("new build request: %s\n", gt.Slug)
		if gt.IsHuman || gt.Built {
			continue
		}
		gt.Error = false
		gt.Message = ""
		ctx, cancel := context.WithCancel(context.Background())
		msgChan, err := build(ctx, cli, config, minioClient, gt)
		if err != nil {
			log.Printf("err when build: %v\n", err)
			gt.Built = true
			gt.Error = true
			gt.Message = err.Error()
			updateGT(gt, gtColl)
			cancel()
		} else {
			timer := time.AfterFunc(10*time.Minute, cancel)
			for msg := range msgChan {
				log.Printf("new msg: %v\n", msg)
				if msg.err == nil {
					if strings.Contains(msg.res, "error") {
						gt.Error = true
					}
					gt.Message += msg.res + "\n"
				} else if msg.err == io.EOF {
					gt.Built = true
				} else {
					gt.Message += msg.res + "\n" + "Error: " + msg.err.Error() + "\n"
					gt.Built = true
					gt.Error = true
				}
				if updateGT(gt, gtColl) != nil || (gt.Built && gt.Error) {
					log.Printf("build failed: %s\n", gt.Slug)
					cancel()
					timer.Stop()
					cli.ImageRemove(context.Background(), gt.TagName(config.Docker.Url), types.ImageRemoveOptions{})
					minioClient.RemoveObject(context.Background(), config.Minio.Bucket, gt.FileName(), minio.RemoveObjectOptions{})
					break
				}
				if gt.Built {
					log.Printf("build succeed: %s\n", gt.Slug)
					break
				}
			}
			cancel()
			timer.Stop()
		}
	}
}
