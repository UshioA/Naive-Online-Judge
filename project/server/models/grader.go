package models

import (
	"fmt"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type GraderTemplate struct {
	ID      primitive.ObjectID `json:"id"            bson:"_id,omitempty"`
	Slug    string             `json:"slug"          bson:"slug"`
	IsHuman bool               `json:"ishuman"       bson:"ishuman"`
	Human   []ResultDetail     `json:"human"         bson:"human"`
	/* Below is not need when POST/PUT */
	ImageTag string `json:"imagetag"      bson:"imagetag"`
	Built    bool   `json:"built"         bson:"built"`
	Error    bool   `json:"error"         bson:"error"`
	Message  string `json:"message"       bson:"message"`
}

func (g GraderTemplate) FileName() string {
	return fmt.Sprintf("gt/%s-%s.tar", g.Slug, g.ImageTag)
}

func (g GraderTemplate) TagName(url string) string {
	return fmt.Sprintf("%s/%s:%s", url, g.Slug, g.ImageTag)
}

type Grader struct {
	ID         primitive.ObjectID `json:"id"            bson:"_id,omitempty"`
	Assignment string             `json:"assignment"    bson:"assignment"`
	Problem    string             `json:"problem"       bson:"problem"`
	Template   string             `json:"template"      bson:"template"`
	/* Below is not need when POST/PUT */
	HasFile bool `json:"hasfile"       bson:"hasfile"`
}

func (g Grader) FileName() string {
	return fmt.Sprintf("grader/%s/%s.tar", g.Assignment, g.Problem)
}
