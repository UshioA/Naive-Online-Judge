package handlers

import (
	"errors"
	"log"
	"naive-server/models"
	"net/http"
	"path"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/minio/minio-go/v7"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (h *Handler) findGT(slug string) (models.GraderTemplate, error) {
	var gt models.GraderTemplate
	err := h.gtColl.FindOne(h.ctx, bson.M{"slug": slug}).Decode(&gt)
	return gt, err
}

func (h *Handler) findGTDo(slug string, c *gin.Context, findFunc func(models.GraderTemplate) error, notFindFunc func() error) {
	gt, err := h.findGT(slug)
	if err == nil {
		err = findFunc(gt)
	} else if err == mongo.ErrNoDocuments {
		err = notFindFunc()
	}
	if err != nil {
		abortErrorJSON(c, http.StatusInternalServerError, err)
	}
}

func (h *Handler) getGT(c *gin.Context) {
	slug := c.Query("slug")
	h.findGTDo(slug, c, func(g models.GraderTemplate) error {
		c.JSON(http.StatusOK, g)
		return nil
	}, func() error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("不存在此评分模板"))
		return nil
	})
}

func (h *Handler) createGT(gt models.GraderTemplate) (models.GraderTemplate, error) {
	_, err := h.gtColl.InsertOne(h.ctx, gt)
	if err == nil {
		return h.findGT(gt.Slug)
	} else {
		return models.GraderTemplate{}, nil
	}
}

func (h *Handler) postGT(c *gin.Context) {
	var gt models.GraderTemplate
	if err := c.ShouldBindJSON(&gt); err != nil {
		abortErrorJSON(c, http.StatusBadRequest, err)
		return
	}
	if !isValidDslug(gt.Slug) {
		abortErrorJSON(c, http.StatusBadRequest, errors.New("代号不合法"))
		return
	}
	gt.IsHuman = true
	gt.ImageTag = ""
	gt.Built = false
	gt.Error = false
	gt.Message = ""
	h.findGTDo(gt.Slug, c, func(g models.GraderTemplate) error {
		c.JSON(http.StatusOK, g)
		return nil
	}, func() error {
		u, err := h.createGT(gt)
		if err != nil {
			return err
		}
		c.JSON(http.StatusCreated, u)
		return nil
	})
}

func (h *Handler) updateGT(gt models.GraderTemplate) error {
	_, err := h.gtColl.UpdateByID(h.ctx, gt.ID, bson.D{{Key: "$set", Value: gt}})
	return err
}

func (h *Handler) putGT(c *gin.Context) {
	var gt models.GraderTemplate
	if err := c.ShouldBindJSON(&gt); err != nil {
		abortErrorJSON(c, http.StatusBadRequest, err)
		return
	}
	h.findGTDo(gt.Slug, c, func(g models.GraderTemplate) error {
		if !g.IsHuman {
			abortErrorJSON(c, http.StatusBadRequest, errors.New("不是人工Grader"))
			return nil
		}
		g.Human = gt.Human
		err := h.updateGT(g)
		if err == nil {
			c.JSON(http.StatusOK, g)
		}
		return err
	}, func() error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("不存在此评分模板"))
		return nil
	})
}

func (h *Handler) deleteGT(c *gin.Context) {
	slug := c.Query("slug")
	h.findGTDo(slug, c, func(g models.GraderTemplate) error {
		_, err := h.gtColl.DeleteOne(h.ctx, bson.M{"_id": g.ID})
		if err == nil {
			_, err = h.gradeColl.DeleteMany(h.ctx, bson.M{"template": g.Slug})
			if err == nil {
				c.JSON(http.StatusOK, g)
			}
		}
		return err
	}, func() error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("不存在此评分模板"))
		return nil
	})
}

func (h *Handler) findAllGTs(start int64, limit int64) ([]models.GraderTemplate, int64, error) {
	collection := h.gtColl
	total, err := collection.CountDocuments(h.ctx, bson.M{})
	if err != nil {
		return nil, 0, err
	}
	opts := options.Find().SetSort(bson.D{{Key: "slug", Value: 1}}).SetSkip(start).SetProjection(bson.D{{Key: "message", Value: 0}})
	if limit > 0 {
		opts = opts.SetLimit(limit)
	}
	cur, err := collection.Find(h.ctx, bson.M{}, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(h.ctx)
	gts := make([]models.GraderTemplate, 0)
	if err := cur.All(h.ctx, &gts); err != nil {
		return nil, 0, err
	}
	return gts, total, nil
}

func (h *Handler) getAllGTs(c *gin.Context) {
	start, limit, err := parseStartLimit(c)
	if err != nil {
		abortErrorJSON(c, http.StatusBadRequest, err)
		return
	}
	gts, total, err := h.findAllGTs(start, limit)
	if err != nil {
		abortErrorJSON(c, http.StatusInternalServerError, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"gts": gts, "total": total})
}

func (h *Handler) postGTImage(c *gin.Context) {
	slug := c.PostForm("slug")
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
	h.findGTDo(slug, c, func(gt models.GraderTemplate) error {
		if path.Ext(file.Filename) != ".tar" {
			abortErrorJSON(c, http.StatusBadRequest, errors.New("后缀名错误"))
			return nil
		}
		if !gt.IsHuman {
			abortErrorJSON(c, http.StatusBadRequest, errors.New("已配置Docker"))
			return nil
		}
		gt.IsHuman = false
		gt.Human = nil
		gt.ImageTag = time.Now().Format("20060102-150405")
		gt.Built = false
		gt.Error = false
		gt.Message = ""
		_, err := h.minioClient.PutObject(h.ctx, h.config.Minio.Bucket, gt.FileName(), src, file.Size, minio.PutObjectOptions{})
		if err != nil {
			return err
		}
		if err := h.updateGT(gt); err != nil {
			return err
		}
		go func() {
			h.builderChan <- gt
		}()
		c.JSON(http.StatusCreated, gt)
		return nil
	}, func() error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("不存在此Grader"))
		return nil
	})
}

func (h *Handler) removeGTImage(c *gin.Context) {
	slug := c.Query("slug")
	h.findGTDo(slug, c, func(gt models.GraderTemplate) error {
		if gt.IsHuman {
			abortErrorJSON(c, http.StatusBadRequest, errors.New("不是机器Grader"))
			return nil
		}
		gt.IsHuman = true
		gt.Built = false
		gt.Error = false
		gt.Message = ""
		if err := h.updateGT(gt); err != nil {
			return err
		}
		go func() {
			h.removerChan <- gt
		}()
		c.JSON(http.StatusOK, gt)
		return nil
	}, func() error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("不存在此Grader"))
		return nil
	})
}

func (h *Handler) GTRegister(r *gin.Engine) {
	_, err := h.gtColl.Indexes().CreateOne(h.ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "slug", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		log.Fatalln(err)
	}
	v := r.Group("/gt", h.authMid(models.RoleStaff))
	v.GET("", h.getGT)
	v.POST("", h.postGT)
	v.PUT("", h.putGT)
	v.DELETE("", h.deleteGT)
	v.GET("/all", h.getAllGTs)
	v.POST("/image", h.postGTImage)
	v.DELETE("/image", h.removeGTImage)
}
