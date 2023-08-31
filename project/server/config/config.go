package config

import (
	"log"
	"os"

	"golang.org/x/oauth2"
	"gopkg.in/yaml.v3"
)

type Config struct {
	Server  ServerConfig
	Admin   AdminConfig
	Jwt     JwtConfig
	Oauth2  Oauth2Config
	Mongodb MongodbConfig
	Redis   RedisConfig
	Minio   MinioConfig
	Docker  DockerConfig
	Judger  JudgerConfig
	Debug   DebugConfig
}

type ServerConfig struct {
	Host string
	Port int
}

type AdminConfig struct {
	Username string
	Fullname string
}

type JwtConfig struct {
	Secret string
	Days   int
}

type Oauth2Config struct {
	Config  oauth2.Config
	UserAPI string
}

type MongodbConfig struct {
	Host     string
	Port     int
	Database string
	Username string
	Password string
}

type RedisConfig struct {
	Host     string
	Port     int
	Database int
	Password string
}

type MinioConfig struct {
	Endpoint  string
	Secure    bool
	AccessKey string
	SecretKey string
	Region    string
	Bucket    string
}

type DockerConfig struct {
	Url string
}

type JudgerConfig struct {
	Num int
}

type DebugConfig struct {
	Debug bool
}

func GetConfig() Config {
	file, err := os.ReadFile("config.yaml")
	if err != nil {
		log.Fatalln(err)
	}
	var config Config
	err = yaml.Unmarshal(file, &config)
	if err != nil {
		log.Fatalln(err)
	}
	if config.Judger.Num < 1 {
		log.Fatalf("Illegal judger num %d\n", config.Judger.Num)
	}
	return config
}
