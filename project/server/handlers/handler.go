package handlers

import (
	"context"
	"fmt"
	"log"
	"naive-server/config"
	"naive-server/models"
	"naive-server/service"

	"github.com/go-redis/redis/v8"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Handler struct {
	ctx         context.Context
	config      config.Config
	userColl    *mongo.Collection
	assignColl  *mongo.Collection
	probColl    *mongo.Collection
	subColl     *mongo.Collection
	gtColl      *mongo.Collection
	gradeColl   *mongo.Collection
	redisClient *redis.Client
	minioClient *minio.Client
	builderChan chan models.GraderTemplate
	judgerChan  chan models.Submission
	removerChan chan models.GraderTemplate
}

func NewHandler(ctx context.Context, config config.Config) *Handler {
	database := linkMongodb(config.Mongodb)
	redisClient := linkRedis(config.Redis)
	minioClient := linkMinio(config.Minio)
	return &Handler{
		ctx:         ctx,
		config:      config,
		userColl:    database.Collection("user"),
		assignColl:  database.Collection("assignment"),
		probColl:    database.Collection("problem"),
		subColl:     database.Collection("submission"),
		gtColl:      database.Collection("grader_template"),
		gradeColl:   database.Collection("grader"),
		redisClient: redisClient,
		minioClient: minioClient,
		builderChan: make(chan models.GraderTemplate, 1024),
		judgerChan:  make(chan models.Submission, 4096),
		removerChan: make(chan models.GraderTemplate, 1024),
	}
}

func linkMongodb(config config.MongodbConfig) *mongo.Database {
	clientOptions := options.Client().ApplyURI(fmt.Sprintf("mongodb://%s:%s@%s:%d/%s", config.Username, config.Password, config.Host, config.Port, config.Database))
	ctx := context.Background()
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		log.Fatalln(err)
	}
	if err = client.Ping(ctx, nil); err != nil {
		log.Fatalln(err)
	}
	return client.Database(config.Database)
}

func linkRedis(config config.RedisConfig) *redis.Client {
	return redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", config.Host, config.Port),
		Password: config.Password,
		DB:       config.Database,
	})
}

func linkMinio(config config.MinioConfig) *minio.Client {
	minioClient, err := minio.New(config.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(config.AccessKey, config.SecretKey, ""),
		Secure: config.Secure,
	})
	if err != nil {
		log.Fatalln(err)
	}
	err = minioClient.MakeBucket(context.TODO(), config.Bucket, minio.MakeBucketOptions{Region: config.Region, ObjectLocking: false})
	if err != nil {
		exists, err2 := minioClient.BucketExists(context.TODO(), config.Bucket)
		if err2 != nil || !exists {
			log.Fatalln(err, err2)
		}
	}
	return minioClient
}

func (h *Handler) GoBuilder() {
	go service.ListenBuilder(h.config, h.gtColl, h.minioClient, h.builderChan)
}

func (h *Handler) GoRemover() {
	go service.ListenRemover(h.config, h.gtColl, h.minioClient, h.removerChan)
}

func (h *Handler) GoJudger() {
	go service.ListenJudger(h.config, h.subColl, h.gtColl, h.gradeColl, h.minioClient, h.judgerChan)
}
