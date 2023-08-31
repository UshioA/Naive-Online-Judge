package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	RoleAdmin int = iota
	RoleStaff
	RoleStudent
)

type User struct {
	ID       primitive.ObjectID `json:"id"       bson:"_id,omitempty"`
	UserName string             `json:"username" bson:"username"`
	FullName string             `json:"fullname" bson:"fullname"`
	Email    string             `json:"email"    bson:"email"`
	Role     int                `json:"role"     bson:"role"`
	GitlabID int                `json:"gitlabid" bson:"gitlabid"`
	Gongde   int64              `json:"gongde"   bson:"gongde"`
	LastGD   time.Time          `json:"lastgd"   bson:"lastgd"`
}
