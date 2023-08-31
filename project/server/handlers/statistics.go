package handlers

import (
	"bytes"
	"encoding/csv"
	"errors"
	"fmt"
	"naive-server/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

func (h *Handler) statisticSubA(aslug, pslug string) ([]models.StatisticsA, error) {
	cur, err := h.subColl.Aggregate(h.ctx, mongo.Pipeline{
		bson.D{
			{Key: "$match",
				Value: bson.D{
					{Key: "assignment", Value: aslug},
					{Key: "problem", Value: pslug},
					{Key: "graded", Value: true},
				},
			},
		},
		bson.D{
			{Key: "$group",
				Value: bson.D{
					{Key: "_id", Value: "$username"},
					{Key: "best",
						Value: bson.D{
							{Key: "$top",
								Value: bson.D{
									{Key: "output",
										Value: bson.D{
											{Key: "count", Value: "$count"},
											{Key: "filetype", Value: "$filetype"},
											{Key: "score", Value: "$result.score"},
										},
									},
									{Key: "sortBy",
										Value: bson.D{
											{Key: "result.score", Value: -1},
											{Key: "count", Value: -1},
										},
									},
								},
							},
						},
					},
				},
			},
		}})
	if err != nil {
		return nil, err
	}
	res := make([]models.StatisticsA, 0)
	if err := cur.All(h.ctx, &res); err != nil {
		return nil, err
	}
	return res, nil
}

func (h *Handler) statisticSubB(aslug, pslug string) ([]models.StatisticsB, error) {
	cur, err := h.subColl.Aggregate(h.ctx, mongo.Pipeline{
		bson.D{
			{Key: "$match",
				Value: bson.D{
					{Key: "assignment", Value: aslug},
					{Key: "problem", Value: pslug},
					{Key: "graded", Value: true},
				},
			},
		},
		bson.D{
			{Key: "$group",
				Value: bson.D{
					{Key: "_id", Value: "$username"},
					{Key: "best", Value: bson.D{{Key: "$max", Value: "$result.score"}}},
				},
			},
		}})
	if err != nil {
		return nil, err
	}
	res := make([]models.StatisticsB, 0)
	if err := cur.All(h.ctx, &res); err != nil {
		return nil, err
	}
	return res, nil
}

func (h *Handler) getStatisticsSingle(c *gin.Context) {
	aslug := c.Query("assignment")
	pslug := c.Query("problem")
	user := getUser(c)
	username := c.DefaultQuery("username", user.UserName)
	if user.Role > models.RoleStaff && username != user.UserName {
		abortErrorJSON(c, http.StatusForbidden, errors.New("无权查看"))
		return
	}
	cur, err := h.subColl.Aggregate(h.ctx, mongo.Pipeline{
		bson.D{
			{Key: "$match",
				Value: bson.D{
					{Key: "assignment", Value: aslug},
					{Key: "problem", Value: pslug},
					{Key: "username", Value: username},
					{Key: "graded", Value: true},
				},
			},
		},
		bson.D{
			{Key: "$group",
				Value: bson.D{
					{Key: "_id", Value: "$username"},
					{Key: "best", Value: bson.D{{Key: "$max", Value: "$result.score"}}},
				},
			},
		}})
	if err != nil {
		abortErrorJSON(c, http.StatusInternalServerError, err)
		return
	}
	res := make([]models.StatisticsB, 0)
	if err := cur.All(h.ctx, &res); err != nil {
		abortErrorJSON(c, http.StatusInternalServerError, err)
		return
	}
	if len(res) == 0 {
		c.JSON(http.StatusOK, gin.H{"best": 0.0})
	} else {
		c.JSON(http.StatusOK, gin.H{"best": res[0].Best})
	}
}

func (h *Handler) getStatisticsProblem(c *gin.Context) {
	aslug := c.Query("assignment")
	pslug := c.Query("problem")
	h.findProblemDo(aslug, pslug, c, func(_ models.Assignment, p models.Problem) error {
		total, err := h.userColl.CountDocuments(h.ctx, bson.M{})
		if err != nil {
			return err
		}
		res, err := h.statisticSubB(aslug, pslug)
		if err != nil {
			return err
		}
		num, ac, sum, avg := len(res), 0, 0.0, 0.0
		for _, r := range res {
			if r.Best >= p.TotalScore {
				ac += 1
			}
			sum += r.Best
		}
		if num > 0 {
			avg = sum / float64(num)
		}
		c.JSON(http.StatusOK, gin.H{"num": num, "ac": ac, "avg": avg, "total": total})
		return nil
	}, func(a models.Assignment) error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("无此问题"))
		return nil
	})
}

func (h *Handler) downloadStatisticsCSV(c *gin.Context) {
	var pairs []models.CSVPair
	if err := c.ShouldBindJSON(&pairs); err != nil {
		abortErrorJSON(c, http.StatusBadRequest, err)
		return
	}
	first := []string{"Username"}
	for _, p := range pairs {
		first = append(first, fmt.Sprintf("%s-%s", p.Assignment, p.Problem))
	}
	res := [][]string{first}
	stumap := make(map[string]int)
	stu, _, err := h.findAllUsers(0, 0)
	if err != nil {
		abortErrorJSON(c, http.StatusBadRequest, err)
		return
	}
	for _, s := range stu {
		res = append(res, []string{s.UserName})
		stumap[s.UserName] = len(res) - 1
	}
	for i, p := range pairs {
		stB, err := h.statisticSubB(p.Assignment, p.Problem)
		if err != nil {
			abortErrorJSON(c, http.StatusInternalServerError, err)
			return
		}
		for _, st := range stB {
			n, ok := stumap[st.Username]
			if ok {
				res[n] = append(res[n], fmt.Sprint(st.Best))
			}
		}
		for j := range res {
			if len(res[j]) < i+2 {
				res[j] = append(res[j], "0")
			}
		}
	}
	var buf bytes.Buffer
	cr := csv.NewWriter(&buf)
	if err := cr.WriteAll(res); err != nil {
		abortErrorJSON(c, http.StatusInternalServerError, err)
		return
	}
	c.DataFromReader(http.StatusOK, int64(buf.Len()), "text/csv", &buf, nil)
}

func (h *Handler) StatisticsRegister(r *gin.Engine) {
	v := r.Group("/statistics")
	v.GET("/single", h.authMid(models.RoleStudent), h.getStatisticsSingle)
	v.GET("/problem", h.authMid(models.RoleStaff), h.getStatisticsProblem)
	v.POST("/csv", h.authMid(models.RoleStaff), h.downloadStatisticsCSV)
}
