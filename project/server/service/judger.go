package service

import (
	"archive/tar"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"naive-server/config"
	"naive-server/models"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

func createTarFile(f io.Reader, name string) (io.Reader, error) {
	var buf bytes.Buffer
	tw := tar.NewWriter(&buf)
	body, err := io.ReadAll(f)
	if err != nil {
		return nil, err
	}
	hdr := &tar.Header{
		Name: name,
		Mode: 0664,
		Size: int64(len(body)),
	}
	tw.WriteHeader(hdr)
	_, err = tw.Write(body)
	if err != nil {
		return nil, err
	}
	return &buf, nil
}

func extractTarFile(f io.Reader) (io.Reader, error) {
	var buf, res bytes.Buffer
	tr := tar.NewReader(&buf)
	_, err := io.Copy(&buf, f)
	if err != nil {
		return nil, err
	}
	_, err = tr.Next()
	if err != nil {
		return nil, err
	}
	_, err = io.Copy(&res, tr)
	if err != nil {
		return nil, err
	}
	return &res, nil
}

func judge(ctx context.Context, cli *client.Client, config config.Config, minioClient *minio.Client, sub models.Submission, gt models.GraderTemplate, grader models.Grader) (models.Result, error) {
	inspect, _, err := cli.ImageInspectWithRaw(ctx, gt.TagName(config.Docker.Url))
	if err != nil {
		//log.Println(1)
		return models.Result{}, err
	}
	uid, err := uuid.NewRandom()
	if err != nil {
		//log.Println(2)
		return models.Result{}, err
	}
	entrypoint := inspect.Config.Entrypoint
	entrypoint = append(entrypoint, fmt.Sprintf("%s%s", sub.UserName, sub.FileType))
	entrypoint = append(entrypoint, fmt.Sprintf("%s.json", uid.String()))
	cconfig := container.Config{
		Image:           gt.TagName(config.Docker.Url),
		Entrypoint:      entrypoint,
		NetworkDisabled: true,
	}
	hconfig := container.HostConfig{}
	hconfig.CPUPeriod = 100000
	hconfig.CPUQuota = 100000
	hconfig.Memory = 256 * 1024 * 1024
	hconfig.MemorySwappiness = new(int64)
	resp, err := cli.ContainerCreate(ctx, &cconfig, &hconfig, nil, nil, "")
	if err != nil {
		//log.Println(3)
		return models.Result{}, err
	}
	defer cli.ContainerRemove(ctx, resp.ID, types.ContainerRemoveOptions{
		Force: true,
	})
	if grader.HasFile {
		gfile, err := minioClient.GetObject(ctx, config.Minio.Bucket, grader.FileName(), minio.GetObjectOptions{})
		if err != nil {
			//log.Println(4)
			return models.Result{}, err
		}
		defer gfile.Close()
		err = cli.CopyToContainer(ctx, resp.ID, "/home/user", gfile, types.CopyToContainerOptions{})
		if err != nil {
			//log.Println(5)
			return models.Result{}, err
		}
	}
	subfile, err := minioClient.GetObject(ctx, config.Minio.Bucket, sub.FileName(), minio.GetObjectOptions{})
	if err != nil {
		//log.Println(6)
		return models.Result{}, err
	}
	defer subfile.Close()
	tarsub, err := createTarFile(subfile, fmt.Sprintf("%s%s", sub.UserName, sub.FileType))
	if err != nil {
		//log.Println(7)
		return models.Result{}, err
	}
	err = cli.CopyToContainer(ctx, resp.ID, "/home/user", tarsub, types.CopyToContainerOptions{})
	if err != nil {
		//log.Println(8)
		return models.Result{}, err
	}
	err = cli.ContainerStart(ctx, resp.ID, types.ContainerStartOptions{})
	if err != nil {
		//log.Println(9)
		return models.Result{}, err
	}
	statusCh, errCh := cli.ContainerWait(ctx, resp.ID, container.WaitConditionNotRunning)
	select {
	case err := <-errCh:
		if err != nil {
			//log.Println(10)
			return models.Result{}, err
		}
	case <-statusCh:
	}
	tarres, _, err := cli.CopyFromContainer(ctx, resp.ID, fmt.Sprintf("/home/user/%s.json", uid.String()))
	if err != nil {
		//log.Println(11)
		return models.Result{}, err
	}
	defer tarres.Close()
	jsonres, err := extractTarFile(tarres)
	if err != nil {
		//log.Println(12)
		return models.Result{}, err
	}
	var res models.Result
	err = json.NewDecoder(jsonres).Decode(&res)
	if err != nil {
		//log.Println(13)
		return models.Result{}, err
	}
	res.Time = time.Now()
	return res, nil
}

func findGT(gtColl *mongo.Collection, slug string) (models.GraderTemplate, error) {
	var gt models.GraderTemplate
	err := gtColl.FindOne(context.TODO(), bson.M{"slug": slug}).Decode(&gt)
	return gt, err
}

func findGrader(graderColl *mongo.Collection, aslug, pslug string) (models.Grader, error) {
	var grader models.Grader
	err := graderColl.FindOne(context.TODO(), bson.M{"assignment": aslug, "problem": pslug}).Decode(&grader)
	return grader, err
}

func setErrorSubmission(sub models.Submission, msg string, subColl *mongo.Collection) {
	log.Printf("Judge sub %s failed: %s\n", sub.FileName(), msg)
	sub.InQueue = false
	sub.Graded = true
	sub.Result = models.Result{
		Score:    0,
		MaxScore: 0,
		Message:  msg,
		Details:  nil,
		Time:     time.Now(),
	}
	updateSub(sub, subColl)
}

func updateSub(s models.Submission, subColl *mongo.Collection) error {
	var old models.Submission
	err := subColl.FindOne(context.TODO(), bson.M{"_id": s.ID}).Decode(&old)
	if err != nil {
		return err
	}
	if old.Graded {
		return errors.New("already graded")
	}
	_, err = subColl.UpdateByID(context.Background(), s.ID, bson.D{{Key: "$set", Value: s}})
	return err
}

func ListenJudger(config config.Config, subColl *mongo.Collection, gtColl *mongo.Collection, graderColl *mongo.Collection, minioClient *minio.Client, judgerChan chan models.Submission) {
	log.Println("Listening judger ...")
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatalln(err)
	}
	for sub := range judgerChan {
		log.Printf("New judge request: %s\n", sub.FileName())
		if sub.Graded || !sub.InQueue {
			continue
		}
		g, err := findGrader(graderColl, sub.Assignment, sub.Problem)
		if err != nil {
			setErrorSubmission(sub, "Grader不存在，请等待助教配置", subColl)
			continue
		}
		gt, err := findGT(gtColl, g.Template)
		if err != nil || gt.IsHuman {
			setErrorSubmission(sub, "Grader不存在，请等待助教配置", subColl)
			continue
		}
		if !gt.Built {
			setErrorSubmission(sub, "Grader未编译完成，请耐心等待", subColl)
			continue
		}
		if gt.Error {
			setErrorSubmission(sub, "Grader编译出错，请等待助教修复", subColl)
			continue
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
		res, err := judge(ctx, cli, config, minioClient, sub, gt, g)
		cancel()
		if err != nil {
			setErrorSubmission(sub, "评分时出错，请联系助教，错误信息如下:\n"+err.Error(), subColl)
			continue
		}
		sub.InQueue = false
		sub.Graded = true
		sub.Result = res
		updateSub(sub, subColl)
		log.Printf("Judge sub %s succeed: %f/%f\n", sub.FileName(), res.Score, res.MaxScore)
	}
}
