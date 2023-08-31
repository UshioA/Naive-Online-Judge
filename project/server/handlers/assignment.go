package handlers

import (
	"errors"
	"log"
	"naive-server/models"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (h *Handler) findAssignments(start int64, limit int64, condition bson.M, sort int) ([]models.Assignment, int64, error) {
	collection := h.assignColl
	total, err := collection.CountDocuments(h.ctx, condition)
	if err != nil {
		return nil, 0, err
	}
	opts := options.Find().SetSort(bson.D{{Key: "endTime", Value: sort}, {Key: "beginTime", Value: sort}}).SetSkip(start)
	if limit > 0 {
		opts = opts.SetLimit(limit)
	}
	cur, err := collection.Find(h.ctx, condition, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(h.ctx)
	assignments := make([]models.Assignment, 0)
	if err := cur.All(h.ctx, &assignments); err != nil {
		return nil, 0, err
	}
	return assignments, total, nil
}

func (h *Handler) findCondAssignments(c *gin.Context, condition bson.M, sort int) {
	start, limit, err := parseStartLimit(c)
	if err != nil {
		abortErrorJSON(c, http.StatusBadRequest, err)
		return
	}
	if getUser(c).Role == models.RoleStudent {
		condition["beginTime"] = bson.M{"$lte": time.Now()}
	}
	assignments, total, err := h.findAssignments(start, limit, condition, sort)
	if err != nil {
		abortErrorJSON(c, http.StatusInternalServerError, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"assignments": assignments, "total": total})
}

func (h *Handler) getAllAssignment(c *gin.Context) {
	h.findCondAssignments(c, bson.M{}, -1)
}

func (h *Handler) getOnAssignment(c *gin.Context) {
	h.findCondAssignments(c, bson.M{"endTime": bson.M{"$gt": time.Now()}}, 1)
}

func (h *Handler) getFinishAssignment(c *gin.Context) {
	h.findCondAssignments(c, bson.M{"endTime": bson.M{"$lte": time.Now()}}, -1)
}

func (h *Handler) findAssignment(slug string) (models.Assignment, error) {
	var assignment models.Assignment
	err := h.assignColl.FindOne(h.ctx, bson.M{"slug": slug}).Decode(&assignment)
	return assignment, err
}

func (h *Handler) findAssignmentDo(slug string, c *gin.Context, findFunc func(models.Assignment) error, notFindFunc func() error) {
	assignment, err := h.findAssignment(slug)
	if err == nil {
		if canReadAssign(getUser(c), assignment) {
			err = findFunc(assignment)
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

func canReadAssign(reader models.User, readee models.Assignment) bool {
	if reader.Role < models.RoleStudent {
		return true
	} else {
		return readee.BeginTime.Before(time.Now())
	}
}

func (h *Handler) getAssignment(c *gin.Context) {
	slug := c.Query("slug")
	h.findAssignmentDo(slug, c, func(a models.Assignment) error {
		c.JSON(http.StatusOK, a)
		return nil
	}, func() error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("不存在此作业"))
		return nil
	})
}

func (h *Handler) createAssignment(assign models.Assignment) (models.Assignment, error) {
	_, err := h.assignColl.InsertOne(h.ctx, assign)
	if err == nil {
		return h.findAssignment(assign.Slug)
	} else {
		return models.Assignment{}, nil
	}
}

func (h *Handler) updateAssignment(assign models.Assignment) error {
	_, err := h.assignColl.UpdateByID(h.ctx, assign.ID, bson.D{{Key: "$set", Value: assign}})
	return err
}

func (h *Handler) postAssignment(c *gin.Context) {
	var assign models.Assignment
	if err := c.ShouldBindJSON(&assign); err != nil {
		abortErrorJSON(c, http.StatusBadRequest, err)
		return
	}
	if !isValidSlug(assign.Slug) {
		abortErrorJSON(c, http.StatusBadRequest, errors.New("代号不合法"))
		return
	}
	h.findAssignmentDo(assign.Slug, c, func(a models.Assignment) error {
		c.JSON(http.StatusOK, a)
		return nil
	}, func() error {
		u, err := h.createAssignment(assign)
		if err != nil {
			return err
		}
		c.JSON(http.StatusCreated, u)
		return nil
	})
}

func (h *Handler) putAssignment(c *gin.Context) {
	var assign models.Assignment
	if err := c.ShouldBindJSON(&assign); err != nil {
		abortErrorJSON(c, http.StatusBadRequest, err)
		return
	}
	h.findAssignmentDo(assign.Slug, c, func(a models.Assignment) error {
		assign.ID = a.ID
		err := h.updateAssignment(assign)
		if err == nil {
			c.JSON(http.StatusOK, assign)
		}
		return err
	}, func() error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("不存在此作业"))
		return nil
	})
}

func (h *Handler) deleteAssignment(c *gin.Context) {
	slug := c.Query("slug")
	h.findAssignmentDo(slug, c, func(a models.Assignment) error {
		_, err := h.assignColl.DeleteOne(h.ctx, bson.M{"_id": a.ID})
		if err == nil {
			_, err = h.probColl.DeleteMany(h.ctx, bson.M{"assignment": a.Slug})
			if err == nil {
				_, err = h.subColl.DeleteMany(h.ctx, bson.M{"assignment": a.Slug})
				if err == nil {
					_, err = h.gradeColl.DeleteMany(h.ctx, bson.M{"assignment": a.Slug})
					if err == nil {
						c.JSON(http.StatusOK, a)
					}
				}
			}
		}
		return err
	}, func() error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("不存在此作业"))
		return nil
	})
}

func (h *Handler) AssignmentRegister(r *gin.Engine) {
	collection := h.assignColl
	indexModels := []mongo.IndexModel{{
		Keys:    bson.D{{Key: "slug", Value: 1}},
		Options: options.Index().SetUnique(true),
	}, {
		Keys: bson.D{{Key: "beginTime", Value: 1}},
	}, {
		Keys: bson.D{{Key: "endTime", Value: 1}},
	}}
	_, err := collection.Indexes().CreateMany(h.ctx, indexModels)
	if err != nil {
		log.Fatalln(err)
	}
	v := r.Group("/assignments")
	v.GET("/all", h.authMid(models.RoleStudent), h.getAllAssignment)
	v.GET("/on", h.authMid(models.RoleStudent), h.getOnAssignment)
	v.GET("/finish", h.authMid(models.RoleStudent), h.getFinishAssignment)
	v.GET("", h.authMid(models.RoleStudent), h.getAssignment)
	v.POST("", h.authMid(models.RoleStaff), h.postAssignment)
	v.PUT("", h.authMid(models.RoleStaff), h.putAssignment)
	v.DELETE("", h.authMid(models.RoleStaff), h.deleteAssignment)
}
