package service

import (
	"context"
	"log"
	"naive-server/config"
	"naive-server/models"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"github.com/minio/minio-go/v7"
	"go.mongodb.org/mongo-driver/mongo"
)

func ListenRemover(config config.Config, gtColl *mongo.Collection, minioClient *minio.Client, removerChan chan models.GraderTemplate) {
	log.Println("Listening remover ...")
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatalln(err)
	}
	for gt := range removerChan {
		log.Printf("new remove request: %s\n", gt.Slug)
		cli.ImageRemove(context.Background(), gt.TagName(config.Docker.Url), types.ImageRemoveOptions{})
		minioClient.RemoveObject(context.Background(), config.Minio.Bucket, gt.FileName(), minio.RemoveObjectOptions{})
	}
}
