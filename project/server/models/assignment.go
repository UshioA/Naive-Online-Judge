package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Assignment struct {
	ID        primitive.ObjectID `json:"id"           bson:"_id,omitempty"`
	Slug      string             `json:"slug"         bson:"slug"`
	Title     string             `json:"title"        bson:"title"`
	BeginTime time.Time          `json:"beginTime"    bson:"beginTime"`
	EndTime   time.Time          `json:"endTime"      bson:"endTime"`
}
