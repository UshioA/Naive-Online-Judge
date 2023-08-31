package models

import (
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Submission struct {
	ID         primitive.ObjectID `json:"id"           bson:"_id,omitempty"`
	Assignment string             `json:"assignment"   bson:"assignment"`
	Problem    string             `json:"problem"      bson:"problem"`
	UserName   string             `json:"username"     bson:"username"`
	Count      int64              `json:"count"        bson:"count"`
	FileType   string             `json:"filetype"     bson:"filetype"`
	Time       time.Time          `json:"time"         bson:"time"`
	InQueue    bool               `json:"inqueue"      bson:"inqueue"`
	Graded     bool               `json:"graded"       bson:"graded"`
	Result     Result             `json:"result"       bson:"result"`
}

type Result struct {
	Score    float64        `json:"score"     bson:"score"`
	MaxScore float64        `json:"maxscore"  bson:"maxscore"`
	Message  string         `json:"message"   bson:"message"`
	Details  []ResultDetail `json:"details"   bson:"details"`
	Time     time.Time      `json:"time"      bson:"time"`
}

type ResultDetail struct {
	Title    string  `json:"title"    bson:"title"`
	Score    float64 `json:"score"    bson:"score"`
	MaxScore float64 `json:"maxscore" bson:"maxscore"`
	Message  string  `json:"message"  bson:"message"`
}

func (s Submission) FileName() string {
	return fmt.Sprintf("submissions/%s/%s/%s/%d%s", s.Assignment, s.Problem, s.UserName, s.Count, s.FileType)
}
