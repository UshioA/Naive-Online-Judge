package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Problem struct {
	ID               primitive.ObjectID `json:"id"               bson:"_id,omitempty"`
	Assignment       string             `json:"assignment"       bson:"assignment"`
	Slug             string             `json:"slug"             bson:"slug"`
	Title            string             `json:"title"            bson:"title"`
	Description      string             `json:"description"      bson:"description"`
	SubmitFileType   string             `json:"submitFileType"   bson:"submitFileType"`
	SubmitFileSize   int64              `json:"submitFileSize"   bson:"submitFileSize"`
	SubmitCountLimit int64              `json:"submitCountLimit" bson:"submitCountLimit"`
	TotalScore       float64            `json:"totalScore"       bson:"totalScore"`
}
