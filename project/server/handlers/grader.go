package handlers

import (
	"errors"
	"log"
	"naive-server/models"
	"net/http"
	"path"

	"github.com/gin-gonic/gin"
	"github.com/minio/minio-go/v7"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (h *Handler) findGrader(aslug, pslug string) (models.Grader, error) {
	var grader models.Grader
	err := h.gradeColl.FindOne(h.ctx, bson.M{"assignment": aslug, "problem": pslug}).Decode(&grader)
	return grader, err
}

func (h *Handler) findGraderDo(aslug, pslug string, c *gin.Context, findFunc func(models.Grader, models.GraderTemplate) error, notFindFunc func() error) {
	h.findProblemDo(aslug, pslug, c, func(a models.Assignment, p models.Problem) error {
		grader, err := h.findGrader(aslug, pslug)
		if err == nil {
			h.findGTDo(grader.Template, c, func(gt models.GraderTemplate) error {
				return findFunc(grader, gt)
			}, func() error {
				return errors.New("有Grader没Template???")
			})
		} else if err == mongo.ErrNoDocuments {
			err = notFindFunc()
		}
		return err
	}, func(a models.Assignment) error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("不存在此问题"))
		return nil
	})
}

func (h *Handler) getGrader(c *gin.Context) {
	aslug := c.Query("assignment")
	pslug := c.Query("problem")
	h.findGraderDo(aslug, pslug, c, func(g models.Grader, gt models.GraderTemplate) error {
		gt.Message = ""
		c.JSON(http.StatusOK, gin.H{"grader": g, "template": gt})
		return nil
	}, func() error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("无此Grader"))
		return nil
	})
}

func (h *Handler) createGrader(g models.Grader) (models.Grader, error) {
	_, err := h.gradeColl.InsertOne(h.ctx, g)
	if err == nil {
		return h.findGrader(g.Assignment, g.Problem)
	} else {
		return models.Grader{}, nil
	}
}

func (h *Handler) updateGrader(g models.Grader) error {
	_, err := h.gradeColl.UpdateByID(h.ctx, g.ID, bson.D{{Key: "$set", Value: g}})
	return err
}

func (h *Handler) postGrader(c *gin.Context) {
	var grader models.Grader
	if err := c.ShouldBindJSON(&grader); err != nil {
		abortErrorJSON(c, http.StatusBadRequest, err)
		return
	}
	h.findGTDo(grader.Template, c, func(_ models.GraderTemplate) error {
		h.findGraderDo(grader.Assignment, grader.Problem, c, func(g models.Grader, _ models.GraderTemplate) error {
			g.Template = grader.Template
			err := h.updateGrader(grader)
			if err == nil {
				c.JSON(http.StatusOK, grader)
			}
			return err
		}, func() error {
			grader.HasFile = false
			g, err := h.createGrader(grader)
			if err == nil {
				c.JSON(http.StatusCreated, g)
			}
			return err
		})
		return nil
	}, func() error {
		abortErrorJSON(c, http.StatusBadRequest, errors.New("无此Template"))
		return nil
	})
}

func (h *Handler) deleteGrader(c *gin.Context) {
	aslug := c.Query("assignment")
	pslug := c.Query("problem")
	h.findGraderDo(aslug, pslug, c, func(g models.Grader, gt models.GraderTemplate) error {
		_, err := h.gradeColl.DeleteOne(h.ctx, bson.M{"_id": g.ID})
		if err == nil {
			c.JSON(http.StatusOK, g)
		}
		return err
	}, func() error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("无此Grader"))
		return nil
	})
}

func (h *Handler) postGraderFile(c *gin.Context) {
	aslug := c.PostForm("assignment")
	pslug := c.PostForm("problem")
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
	h.findGraderDo(aslug, pslug, c, func(g models.Grader, gt models.GraderTemplate) error {
		if path.Ext(file.Filename) != ".tar" {
			abortErrorJSON(c, http.StatusBadRequest, errors.New("后缀名错误"))
			return nil
		}
		if g.HasFile {
			abortErrorJSON(c, http.StatusBadRequest, errors.New("已配置文件"))
			return nil
		}
		if gt.IsHuman {
			abortErrorJSON(c, http.StatusBadRequest, errors.New("人工Grader无需配置文件"))
			return nil
		}
		g.HasFile = true
		_, err := h.minioClient.PutObject(h.ctx, h.config.Minio.Bucket, g.FileName(), src, file.Size, minio.PutObjectOptions{})
		if err != nil {
			return err
		}
		if err := h.updateGrader(g); err != nil {
			return err
		}
		c.JSON(http.StatusCreated, g)
		return nil
	}, func() error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("无此Grader"))
		return nil
	})
}

func (h *Handler) removeGraderFile(c *gin.Context) {
	aslug := c.Query("assignment")
	pslug := c.Query("problem")
	h.findGraderDo(aslug, pslug, c, func(g models.Grader, _ models.GraderTemplate) error {
		g.HasFile = false
		if err := h.updateGrader(g); err != nil {
			return err
		}
		err := h.minioClient.RemoveObject(h.ctx, h.config.Minio.Bucket, g.FileName(), minio.RemoveObjectOptions{})
		if err == nil {
			c.JSON(http.StatusOK, g)
		}
		return err
	}, func() error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("无此Grader"))
		return nil
	})
}

func (h *Handler) GraderRegister(r *gin.Engine) {
	_, err := h.gradeColl.Indexes().CreateMany(h.ctx, []mongo.IndexModel{{
		Keys:    bson.D{{Key: "assignment", Value: 1}, {Key: "problem", Value: 1}},
		Options: options.Index().SetUnique(true),
	}, {
		Keys: bson.D{{Key: "template", Value: 1}},
	}})
	if err != nil {
		log.Fatalln(err)
	}
	v := r.Group("/grader", h.authMid(models.RoleStaff))
	v.GET("", h.getGrader)
	v.POST("", h.postGrader)
	v.PUT("", h.postGrader)
	v.DELETE("", h.deleteGrader)
	v.POST("/file", h.postGraderFile)
	v.DELETE("/file", h.removeGraderFile)
}
