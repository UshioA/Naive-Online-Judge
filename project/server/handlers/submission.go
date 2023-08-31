package handlers

import (
	"errors"
	"log"
	"naive-server/models"
	"net/http"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/minio/minio-go/v7"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (h *Handler) findAllSubmission(start, limit int64, condition bson.M, sort bson.D) ([]models.Submission, int64, error) {
	collection := h.subColl
	total, err := collection.CountDocuments(h.ctx, condition)
	if err != nil {
		return nil, 0, err
	}
	opts := options.Find().SetSort(sort).SetSkip(start)
	if limit > 0 {
		opts = opts.SetLimit(limit)
	}
	cur, err := collection.Find(h.ctx, condition, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(h.ctx)
	submissions := make([]models.Submission, 0)
	if err := cur.All(h.ctx, &submissions); err != nil {
		return nil, 0, err
	}
	return submissions, total, nil
}

func (h *Handler) getAllSubmission(c *gin.Context) {
	start, limit, err := parseStartLimit(c)
	if err != nil {
		abortErrorJSON(c, http.StatusBadRequest, err)
		return
	}
	aslug := c.Query("assignment")
	pslug := c.Query("problem")
	condition := bson.M{}
	if aslug != "" && pslug != "" {
		condition["assignment"] = aslug
		condition["problem"] = pslug
	}
	username := c.Query("username")
	user := getUser(c)
	if user.Role == models.RoleStudent {
		if username == "" {
			username = user.UserName
		} else if username != user.UserName {
			abortErrorJSON(c, http.StatusForbidden, errors.New("无权查看"))
			return
		}
	}
	if username != "" {
		condition["username"] = username
	}
	graded := c.DefaultQuery("graded", "")
	if graded == "y" {
		condition["graded"] = true
	} else if graded == "n" {
		condition["graded"] = false
	} else if graded != "" {
		abortErrorJSON(c, http.StatusBadRequest, errors.New("参数无效"))
		return
	}
	submissions, total, err := h.findAllSubmission(start, limit, condition, bson.D{{Key: "time", Value: -1}})
	if err != nil {
		abortErrorJSON(c, http.StatusInternalServerError, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"submissions": submissions, "total": total})
}

func (h *Handler) findSubmission(assignment, problem, username string, count int64) (models.Submission, error) {
	var submission models.Submission
	err := h.subColl.FindOne(h.ctx, bson.M{"assignment": assignment, "problem": problem, "username": username, "count": count}).Decode(&submission)
	return submission, err
}

func canReadSubmission(reader models.User, readee models.Submission) bool {
	if reader.Role < models.RoleStudent {
		return true
	} else {
		return readee.UserName == reader.UserName
	}
}

func (h *Handler) findSubmissionDo(assignment, problem, username string, count int64, c *gin.Context, findFunc func(models.Submission) error, notFindFunc func() error) {
	submission, err := h.findSubmission(assignment, problem, username, count)
	if err == nil {
		if canReadSubmission(getUser(c), submission) {
			err = findFunc(submission)
		} else {
			abortErrorJSON(c, http.StatusForbidden, errors.New("无权查看"))
		}
	} else if err == mongo.ErrNoDocuments {
		err = notFindFunc()
	}
	if err != nil {
		abortErrorJSON(c, http.StatusInternalServerError, err)
	}
}

func (h *Handler) getSubmission(c *gin.Context) {
	aslug := c.Query("assignment")
	pslug := c.Query("problem")
	username := c.DefaultQuery("username", getUser(c).UserName)
	count, err := strconv.ParseInt(c.Query("count"), 10, 64)
	if err != nil {
		abortErrorJSON(c, http.StatusBadRequest, err)
	}
	h.findSubmissionDo(aslug, pslug, username, count, c, func(s models.Submission) error {
		c.JSON(http.StatusOK, s)
		return nil
	}, func() error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("无此提交"))
		return nil
	})
}

func canPostSubmission(writer models.User, writee models.Submission, assign models.Assignment, prob models.Problem) bool {
	if writer.Role < models.RoleStudent {
		return true
	} else if writer.UserName != writee.UserName {
		return false
	} else {
		return writee.Time.After(assign.BeginTime) && writee.Time.Before(assign.EndTime) && (prob.SubmitCountLimit < 0 || writee.Count < prob.SubmitCountLimit)
	}
}

func (h *Handler) countSubmission(assignment, problem, username string) (int64, error) {
	return h.subColl.CountDocuments(h.ctx, bson.M{"assignment": assignment, "problem": problem, "username": username})
}

func (h *Handler) createSubmission(submission models.Submission) (models.Submission, error) {
	_, err := h.subColl.InsertOne(h.ctx, submission)
	if err == nil {
		return h.findSubmission(submission.Assignment, submission.Problem, submission.UserName, submission.Count)
	} else {
		return models.Submission{}, nil
	}
}

func (h *Handler) postSubmission(c *gin.Context) {
	u := getUser(c)
	aslug := c.PostForm("assignment")
	pslug := c.PostForm("problem")
	username := c.DefaultPostForm("username", u.UserName)
	file, err := c.FormFile("file")
	if err != nil {
		abortErrorJSON(c, http.StatusBadRequest, err)
		return
	}
	src, err := file.Open()
	if err != nil {
		abortErrorJSON(c, http.StatusBadRequest, err)
		return
	}
	defer src.Close()
	h.findProblemDo(aslug, pslug, c, func(a models.Assignment, p models.Problem) error {
		fileType := ""
		for _, availType := range strings.Split(p.SubmitFileType, ",") {
			availType = strings.TrimSpace(availType)
			if path.Ext(file.Filename) == availType {
				fileType = availType
				break
			}
		}
		if fileType == "" {
			abortErrorJSON(c, http.StatusBadRequest, errors.New("后缀名错误"))
			return nil
		}
		if file.Size > p.SubmitFileSize*1024*1024 {
			abortErrorJSON(c, http.StatusBadRequest, errors.New("文件太大"))
			return nil
		}
		count, err := h.countSubmission(aslug, pslug, username)
		if err != nil {
			return err
		}
		submission := models.Submission{
			Assignment: aslug,
			Problem:    pslug,
			UserName:   username,
			Count:      count,
			FileType:   fileType,
			Time:       time.Now(),
			InQueue:    false,
			Graded:     false,
		}
		if !canPostSubmission(u, submission, a, p) {
			abortErrorJSON(c, http.StatusForbidden, errors.New("无权提交"))
			return nil
		}
		s, err := h.createSubmission(submission)
		if err != nil {
			return err
		}
		_, err = h.minioClient.PutObject(h.ctx, h.config.Minio.Bucket, submission.FileName(), src, file.Size, minio.PutObjectOptions{})
		if err != nil {
			return err
		}
		h.findGraderDo(aslug, pslug, c, func(g models.Grader, gt models.GraderTemplate) error {
			if !gt.IsHuman && gt.Built && !gt.Error {
				s.InQueue = true
				if err := h.updateSubmission(s); err != nil {
					return err
				}
				go func() {
					h.judgerChan <- s
				}()
			}
			return nil
		}, func() error {
			return nil
		})
		c.JSON(http.StatusCreated, s)
		return nil
	}, func(a models.Assignment) error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("不存在此问题"))
		return nil
	})
}

func (h *Handler) updateSubmission(submission models.Submission) error {
	_, err := h.subColl.UpdateByID(h.ctx, submission.ID, bson.D{{Key: "$set", Value: submission}})
	return err
}

func (h *Handler) putSubmission(c *gin.Context) {
	var submission models.Submission
	if err := c.ShouldBindJSON(&submission); err != nil {
		abortErrorJSON(c, http.StatusBadRequest, err)
		return
	}
	h.findSubmissionDo(submission.Assignment, submission.Problem, submission.UserName, submission.Count, c, func(s models.Submission) error {
		s.Result = submission.Result
		s.Graded = submission.Graded
		err := h.updateSubmission(s)
		if err == nil {
			c.JSON(http.StatusOK, s)
		}
		return err
	}, func() error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("不存在此提交"))
		return nil
	})
}

func (h *Handler) downloadSubmission(c *gin.Context) {
	aslug := c.Query("assignment")
	pslug := c.Query("problem")
	username := c.DefaultQuery("username", getUser(c).UserName)
	count, err := strconv.ParseInt(c.Query("count"), 10, 64)
	if err != nil {
		abortErrorJSON(c, http.StatusBadRequest, err)
	}
	h.findSubmissionDo(aslug, pslug, username, count, c, func(s models.Submission) error {
		file, err := h.minioClient.GetObject(h.ctx, h.config.Minio.Bucket, s.FileName(), minio.GetObjectOptions{})
		if err != nil {
			return err
		}
		defer file.Close()
		stat, err := file.Stat()
		if err != nil {
			return err
		}
		c.DataFromReader(http.StatusOK, stat.Size, stat.ContentType, file, nil)
		return nil
	}, func() error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("无此提交"))
		return nil
	})
}

func (h *Handler) canSubmit(c *gin.Context) {
	aslug := c.Query("assignment")
	pslug := c.Query("problem")
	username := c.DefaultQuery("username", getUser(c).UserName)
	h.findProblemDo(aslug, pslug, c, func(a models.Assignment, p models.Problem) error {
		count, err := h.countSubmission(aslug, pslug, username)
		if err != nil {
			return err
		}
		submission := models.Submission{
			Assignment: aslug,
			Problem:    pslug,
			UserName:   username,
			Count:      count,
			FileType:   "",
			Time:       time.Now(),
			Graded:     false,
		}
		c.JSON(http.StatusOK, gin.H{"can": canPostSubmission(getUser(c), submission, a, p), "count": count, "limit": p.SubmitCountLimit, "ddl": a.EndTime})
		return nil
	}, func(a models.Assignment) error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("不存在此问题"))
		return nil
	})
}

func (h *Handler) rejudgeSubmission(c *gin.Context) {
	var submission models.Submission
	if err := c.ShouldBindJSON(&submission); err != nil {
		abortErrorJSON(c, http.StatusBadRequest, err)
		return
	}
	h.findSubmissionDo(submission.Assignment, submission.Problem, submission.UserName, submission.Count, c, func(s models.Submission) error {
		h.findGraderDo(submission.Assignment, submission.Problem, c, func(g models.Grader, gt models.GraderTemplate) error {
			if !gt.IsHuman && gt.Built && !gt.Error {
				s.InQueue = true
				s.Graded = false
				s.Result = models.Result{}
				if err := h.updateSubmission(s); err != nil {
					return err
				}
				go func() {
					h.judgerChan <- s
				}()
				c.JSON(http.StatusOK, s)
			} else {
				abortErrorJSON(c, http.StatusBadRequest, errors.New("不是机器Grader"))
			}
			return nil
		}, func() error {
			abortErrorJSON(c, http.StatusBadRequest, errors.New("不是机器Grader"))
			return nil
		})
		return nil
	}, func() error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("无此提交"))
		return nil
	})
}

func (h *Handler) SubmissionRegister(r *gin.Engine) {
	collection := h.subColl
	indexModels := []mongo.IndexModel{{
		Keys:    bson.D{{Key: "assignment", Value: 1}, {Key: "problem", Value: 1}, {Key: "username", Value: 1}, {Key: "count", Value: 1}},
		Options: options.Index().SetUnique(true),
	}, {
		Keys: bson.D{{Key: "time", Value: 1}},
	}, {
		Keys: bson.D{{Key: "username", Value: 1}, {Key: "count", Value: 1}},
	}}
	_, err := collection.Indexes().CreateMany(h.ctx, indexModels)
	if err != nil {
		log.Fatalln(err)
	}
	v := r.Group("/submissions")
	v.GET("/all", h.authMid(models.RoleStudent), h.getAllSubmission)
	v.GET("", h.authMid(models.RoleStudent), h.getSubmission)
	v.POST("", h.authMid(models.RoleStudent), h.postSubmission)
	v.PUT("", h.authMid(models.RoleStaff), h.putSubmission)
	v.GET("/download", h.authMid(models.RoleStudent), h.downloadSubmission)
	v.GET("/can", h.authMid(models.RoleStudent), h.canSubmit)
	v.POST("/rejudge", h.authMid(models.RoleStaff), h.rejudgeSubmission)
}
