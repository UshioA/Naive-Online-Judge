package handlers

import (
	"archive/tar"
	"bytes"
	"errors"
	"fmt"
	"io"
	"log"
	"naive-server/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/minio/minio-go/v7"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (h *Handler) findAllProblem(start int64, limit int64, aslug string) ([]models.Problem, int64, error) {
	collection := h.probColl
	condition := bson.M{"assignment": aslug}
	total, err := collection.CountDocuments(h.ctx, condition)
	if err != nil {
		return nil, 0, err
	}
	opts := options.Find().SetSort(bson.D{{Key: "slug", Value: 1}}).SetSkip(start).SetProjection(bson.D{{Key: "description", Value: 0}})
	if limit > 0 {
		opts = opts.SetLimit(limit)
	}
	cur, err := collection.Find(h.ctx, condition, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(h.ctx)
	problems := make([]models.Problem, 0)
	if err := cur.All(h.ctx, &problems); err != nil {
		return nil, 0, err
	}
	return problems, total, nil
}

func (h *Handler) findProblem(aslug, pslug string) (models.Problem, error) {
	var problem models.Problem
	err := h.probColl.FindOne(h.ctx, bson.M{"assignment": aslug, "slug": pslug}).Decode(&problem)
	return problem, err
}

func (h *Handler) findProblemDo(aslug, pslug string, c *gin.Context, findFunc func(models.Assignment, models.Problem) error, notFindFunc func(models.Assignment) error) {
	h.findAssignmentDo(aslug, c, func(a models.Assignment) error {
		problem, err := h.findProblem(aslug, pslug)
		if err == nil {
			err = findFunc(a, problem)
		} else if err == mongo.ErrNoDocuments {
			err = notFindFunc(a)
		}
		return err
	}, func() error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("不存在此作业"))
		return nil
	})
}

func (h *Handler) getAllProblem(c *gin.Context) {
	aslug := c.Query("assignment")
	start, limit, err := parseStartLimit(c)
	if err != nil {
		abortErrorJSON(c, http.StatusBadRequest, err)
		return
	}
	h.findAssignmentDo(aslug, c, func(a models.Assignment) error {
		problems, total, err := h.findAllProblem(start, limit, aslug)
		if err != nil {
			return err
		}
		c.JSON(http.StatusOK, gin.H{"problems": problems, "total": total})
		return nil
	}, func() error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("不存在此作业"))
		return nil
	})
}

func (h *Handler) getProblem(c *gin.Context) {
	aslug := c.Query("assignment")
	pslug := c.Query("slug")
	h.findProblemDo(aslug, pslug, c, func(a models.Assignment, p models.Problem) error {
		c.JSON(http.StatusOK, p)
		return nil
	}, func(a models.Assignment) error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("不存在此题目"))
		return nil
	})
}

func (h *Handler) createProblem(assign models.Assignment, prob models.Problem) (models.Problem, error) {
	_, err := h.probColl.InsertOne(h.ctx, prob)
	if err == nil {
		return h.findProblem(assign.Slug, prob.Slug)
	} else {
		return models.Problem{}, nil
	}
}

func (h *Handler) postProblem(c *gin.Context) {
	var prob models.Problem
	if err := c.ShouldBindJSON(&prob); err != nil {
		abortErrorJSON(c, http.StatusBadRequest, err)
		return
	}
	if !isValidSlug(prob.Slug) {
		abortErrorJSON(c, http.StatusBadRequest, errors.New("代号不合法"))
		return
	}
	if !isValidTypes(prob.SubmitFileType) {
		abortErrorJSON(c, http.StatusBadRequest, errors.New("提交文件类型不合法"))
		return
	}
	h.findProblemDo(prob.Assignment, prob.Slug, c, func(a models.Assignment, p models.Problem) error {
		c.JSON(http.StatusOK, p)
		return nil
	}, func(a models.Assignment) error {
		p, err := h.createProblem(a, prob)
		if err == nil {
			c.JSON(http.StatusCreated, p)
		}
		return err
	})
}

func (h *Handler) updateProblem(prob models.Problem) error {
	_, err := h.probColl.UpdateByID(h.ctx, prob.ID, bson.D{{Key: "$set", Value: prob}})
	return err
}

func (h *Handler) putProblem(c *gin.Context) {
	var prob models.Problem
	if err := c.ShouldBindJSON(&prob); err != nil {
		abortErrorJSON(c, http.StatusBadRequest, err)
		return
	}
	if !isValidTypes(prob.SubmitFileType) {
		abortErrorJSON(c, http.StatusBadRequest, errors.New("提交文件类型不合法"))
		return
	}
	h.findProblemDo(prob.Assignment, prob.Slug, c, func(a models.Assignment, p models.Problem) error {
		prob.ID = p.ID
		err := h.updateProblem(prob)
		if err == nil {
			c.JSON(http.StatusOK, prob)
		}
		return err
	}, func(a models.Assignment) error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("不存在此题目"))
		return nil
	})
}

func (h *Handler) deleteProblem(c *gin.Context) {
	aslug := c.Query("assignment")
	pslug := c.Query("slug")
	h.findProblemDo(aslug, pslug, c, func(a models.Assignment, p models.Problem) error {
		_, err := h.probColl.DeleteOne(h.ctx, bson.M{"_id": p.ID})
		if err == nil {
			if err == nil {
				_, err = h.subColl.DeleteMany(h.ctx, bson.M{"problem": p.Slug})
				if err == nil {
					_, err = h.gradeColl.DeleteMany(h.ctx, bson.M{"problem": p.Slug})
					if err == nil {
						c.JSON(http.StatusOK, p)
					}
				}
			}
		}
		return err
	}, func(a models.Assignment) error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("不存在此题目"))
		return nil
	})
}

func (h *Handler) rejudgeProblem(c *gin.Context) {
	var prob models.Problem
	if err := c.ShouldBindJSON(&prob); err != nil {
		abortErrorJSON(c, http.StatusBadRequest, err)
		return
	}
	h.findProblemDo(prob.Assignment, prob.Slug, c, func(a models.Assignment, p models.Problem) error {
		h.findGraderDo(prob.Assignment, prob.Slug, c, func(g models.Grader, gt models.GraderTemplate) error {
			submissions, _, err := h.findAllSubmission(0, 0, bson.M{"assignment": prob.Assignment, "problem": prob.Slug}, bson.D{{Key: "time", Value: 1}})
			if err != nil {
				return err
			}
			for i := range submissions {
				submissions[i].InQueue = true
				submissions[i].Graded = false
				submissions[i].Result = models.Result{}
				if err := h.updateSubmission(submissions[i]); err != nil {
					return err
				}
			}
			go func() {
				for _, s := range submissions {
					h.judgerChan <- s
				}
			}()
			c.JSON(http.StatusOK, submissions)
			return nil
		}, func() error {
			abortErrorJSON(c, http.StatusBadRequest, errors.New("不是机器Grader"))
			return nil
		})
		return nil
	}, func(a models.Assignment) error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("不存在此题目"))
		return nil
	})
}

func addToTar(tw *tar.Writer, f io.Reader, name string, size int64, isdir bool) error {
	hdr := tar.Header{
		Typeflag: tar.TypeReg,
		Name:     name,
		Mode:     0664,
		Size:     size,
	}
	if isdir {
		hdr.Typeflag = tar.TypeDir
		hdr.Mode = 0775
	}
	if err := tw.WriteHeader(&hdr); err != nil {
		return err
	}
	if !isdir {
		if _, err := io.Copy(tw, f); err != nil {
			return err
		}
	}
	return nil
}

func (h *Handler) downloadProblemSubmission(c *gin.Context) {
	aslug := c.Query("assignment")
	pslug := c.Query("problem")
	h.findProblemDo(aslug, pslug, c, func(_ models.Assignment, _ models.Problem) error {
		subs, _, err := h.findAllSubmission(0, 0, bson.M{"assignment": aslug, "problem": pslug}, bson.D{{Key: "username", Value: 1}, {Key: "count", Value: 1}})
		if err != nil {
			return err
		}
		var buf bytes.Buffer
		tw := tar.NewWriter(&buf)
		curr := ""
		for _, sub := range subs {
			if curr != sub.UserName {
				err := addToTar(tw, nil, sub.UserName+"/", 0, true)
				if err != nil {
					return err
				}
				curr = sub.UserName
			}
			file, err := h.minioClient.GetObject(h.ctx, h.config.Minio.Bucket, sub.FileName(), minio.GetObjectOptions{})
			if err != nil {
				return err
			}
			stat, err := file.Stat()
			if err != nil {
				file.Close()
				return err
			}
			err = addToTar(tw, file, fmt.Sprintf("%s/%d%s", sub.UserName, sub.Count, sub.FileType), stat.Size, false)
			if err != nil {
				file.Close()
				return err
			}
			file.Close()
		}
		tw.Close()
		c.DataFromReader(http.StatusOK, int64(buf.Len()), "application/x-tar", &buf, nil)
		return nil
	}, func(_ models.Assignment) error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("不存在此题目"))
		return nil
	})
}

func (h *Handler) downloadBestSubmission(c *gin.Context) {
	aslug := c.Query("assignment")
	pslug := c.Query("problem")
	h.findProblemDo(aslug, pslug, c, func(_ models.Assignment, _ models.Problem) error {
		subs, err := h.statisticSubA(aslug, pslug)
		if err != nil {
			return err
		}
		var buf bytes.Buffer
		tw := tar.NewWriter(&buf)
		for _, sub := range subs {
			s := models.Submission{
				Assignment: aslug,
				Problem:    pslug,
				UserName:   sub.Username,
				Count:      sub.Best.Count,
				FileType:   sub.Best.FileType,
			}
			file, err := h.minioClient.GetObject(h.ctx, h.config.Minio.Bucket, s.FileName(), minio.GetObjectOptions{})
			if err != nil {
				return err
			}
			stat, err := file.Stat()
			if err != nil {
				file.Close()
				return err
			}
			err = addToTar(tw, file, fmt.Sprintf("%s-%d%s", sub.Username, sub.Best.Count, sub.Best.FileType), stat.Size, false)
			if err != nil {
				file.Close()
				return err
			}
			file.Close()
		}
		tw.Close()
		c.DataFromReader(http.StatusOK, int64(buf.Len()), "application/x-tar", &buf, nil)
		return nil
	}, func(_ models.Assignment) error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("不存在此题目"))
		return nil
	})
}

func (h *Handler) ProblemRegister(r *gin.Engine) {
	collection := h.probColl
	indexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "assignment", Value: 1}, {Key: "slug", Value: 1}},
		Options: options.Index().SetUnique(true),
	}
	_, err := collection.Indexes().CreateOne(h.ctx, indexModel)
	if err != nil {
		log.Fatalln(err)
	}
	v := r.Group("/problems")
	v.GET("/all", h.authMid(models.RoleStudent), h.getAllProblem)
	v.GET("", h.authMid(models.RoleStudent), h.getProblem)
	v.POST("", h.authMid(models.RoleStaff), h.postProblem)
	v.PUT("", h.authMid(models.RoleStaff), h.putProblem)
	v.DELETE("", h.authMid(models.RoleStaff), h.deleteProblem)
	v.POST("/rejudge", h.authMid(models.RoleStaff), h.rejudgeProblem)
	v.GET("/download", h.authMid(models.RoleStaff), h.downloadProblemSubmission)
	v.GET("/download/best", h.authMid(models.RoleStaff), h.downloadBestSubmission)
}
