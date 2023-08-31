package models

type StatisticsA struct {
	Username string `json:"username"   bson:"_id"`
	Best     Best   `json:"best"       bson:"best"`
}

type Best struct {
	Count    int64   `json:"count"     bson:"count"`
	FileType string  `json:"filetype"  bson:"filetype"`
	Score    float64 `json:"score"     bson:"score"`
}

type StatisticsB struct {
	Username string  `json:"username"  bson:"_id"`
	Best     float64 `json:"best"      bson:"best"`
}

type CSVPair struct {
	Assignment string `json:"assignment" bson:"assignment"`
	Problem    string `json:"problem"    bson:"problem"`
}
