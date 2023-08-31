package handlers

import (
	"errors"
	"log"
	"math/rand"
	"naive-server/models"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func canReadUser(reader models.User, readee models.User) bool {
	if reader.Role == models.RoleStudent {
		return reader.UserName == readee.UserName
	}
	return true
}

func canWriteUser(writer models.User, writee models.User) bool {
	if writer.UserName == writee.UserName {
		return true
	}
	switch writer.Role {
	case models.RoleAdmin:
		return true
	case models.RoleStaff:
		return writee.Role == models.RoleStudent
	default:
		return false
	}
}

func mergeUser(writer models.User, dst *models.User, src models.User) bool {
	if !canWriteUser(writer, *dst) {
		return false
	}
	switch writer.Role {
	case models.RoleAdmin:
		if src.Role != 0 && dst.Role != 0 {
			dst.Role = src.Role
		}
		fallthrough
	case models.RoleStaff:
		if src.GitlabID != 0 {
			dst.GitlabID = src.GitlabID
		}
		if src.Gongde != 0 {
			dst.Gongde = src.Gongde
		}
		if src.LastGD.Unix() != 0 {
			dst.LastGD = src.LastGD
		}
		fallthrough
	case models.RoleStudent:
		if src.FullName != "" {
			dst.FullName = src.FullName
		}
		if src.Email != "" {
			dst.Email = src.Email
		}
	}
	return true
}

func (h *Handler) findUser(stuID string) (models.User, error) {
	var user models.User
	collection := h.userColl
	err := collection.FindOne(h.ctx, bson.M{"username": stuID}).Decode(&user)
	return user, err
}

func (h *Handler) findUserDo(stuID string, c *gin.Context, findFunc func(models.User) error, notFindFunc func() error) {
	user, err := h.findUser(stuID)
	if err == nil {
		err = findFunc(user)
	} else if err == mongo.ErrNoDocuments {
		err = notFindFunc()
	}
	if err != nil {
		abortErrorJSON(c, http.StatusInternalServerError, err)
	}
}

func (h *Handler) createUser(user models.User) (models.User, error) {
	_, err := h.userColl.InsertOne(h.ctx, user)
	if err == nil {
		return h.findUser(user.UserName)
	} else {
		return models.User{}, nil
	}
}

func (h *Handler) updateUser(user models.User) error {
	_, err := h.userColl.UpdateByID(h.ctx, user.ID, bson.D{{Key: "$set", Value: user}})
	return err
}

func (h *Handler) postUser(c *gin.Context) {
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		abortErrorJSON(c, http.StatusBadRequest, err)
		return
	}
	if !isValidSlug(user.UserName) {
		abortErrorJSON(c, http.StatusBadRequest, errors.New("学号不合法"))
		return
	}
	if !canWriteUser(getUser(c), user) {
		abortErrorJSON(c, http.StatusForbidden, errors.New("无权操作"))
		return
	}
	h.findUserDo(user.UserName, c, func(u models.User) error {
		c.JSON(http.StatusOK, u)
		return nil
	}, func() error {
		u, err := h.createUser(user)
		if err != nil {
			return err
		}
		c.JSON(http.StatusCreated, u)
		return nil
	})
}

func (h *Handler) getUser(c *gin.Context) {
	user := getUser(c)
	username := c.DefaultQuery("username", user.UserName)
	h.findUserDo(username, c, func(u models.User) error {
		if canReadUser(user, u) {
			c.JSON(http.StatusOK, u)
		} else {
			abortErrorJSON(c, http.StatusForbidden, errors.New("无权访问"))
		}
		return nil
	}, func() error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("查无此人"))
		return nil
	})
}

func (h *Handler) putUser(c *gin.Context) {
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		abortErrorJSON(c, http.StatusBadRequest, err)
		return
	}
	h.findUserDo(user.UserName, c, func(u models.User) error {
		if mergeUser(getUser(c), &u, user) {
			err := h.updateUser(u)
			if err == nil {
				c.JSON(http.StatusOK, u)
			}
			return err
		} else {
			abortErrorJSON(c, http.StatusForbidden, errors.New("无权操作"))
			return nil
		}
	}, func() error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("查无此人"))
		return nil
	})
}

func (h *Handler) deleteUser(c *gin.Context) {
	username := c.Query("username")
	h.findUserDo(username, c, func(u models.User) error {
		if !canWriteUser(getUser(c), u) {
			abortErrorJSON(c, http.StatusForbidden, errors.New("无权操作"))
			return nil
		}
		_, err := h.userColl.DeleteOne(h.ctx, bson.M{"_id": u.ID})
		if err == nil {
			c.JSON(http.StatusOK, u)
		}
		return err
	}, func() error {
		abortErrorJSON(c, http.StatusNotFound, errors.New("查无此人"))
		return nil
	})
}

func (h *Handler) findAllUsers(start int64, limit int64) ([]models.User, int64, error) {
	collection := h.userColl
	total, err := collection.CountDocuments(h.ctx, bson.M{})
	if err != nil {
		return nil, 0, err
	}
	opts := options.Find().SetSort(bson.D{{Key: "username", Value: 1}}).SetSkip(start)
	if limit > 0 {
		opts = opts.SetLimit(limit)
	}
	cur, err := collection.Find(h.ctx, bson.M{}, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(h.ctx)
	users := make([]models.User, 0)
	if err := cur.All(h.ctx, &users); err != nil {
		return nil, 0, err
	}
	return users, total, nil
}

func (h *Handler) getAllUsers(c *gin.Context) {
	start, limit, err := parseStartLimit(c)
	if err != nil {
		abortErrorJSON(c, http.StatusBadRequest, err)
		return
	}
	users, total, err := h.findAllUsers(start, limit)
	if err != nil {
		abortErrorJSON(c, http.StatusInternalServerError, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"users": users, "total": total})
}

func (h *Handler) gdSign(c *gin.Context) {
	user := getUser(c)
	last := user.LastGD.Local()
	curr := time.Now()
	if last.Year() == curr.Year() && last.YearDay() == curr.YearDay() {
		abortErrorJSON(c, http.StatusBadRequest, errors.New("今日已签到"))
		return
	}
	user.Gongde += rand.Int63n(10) + 1
	user.LastGD = curr
	err := h.updateUser(user)
	if err != nil {
		abortErrorJSON(c, http.StatusInternalServerError, err)
	} else {
		c.JSON(http.StatusOK, user)
	}
}

func (h *Handler) gdRank(c *gin.Context) {
	opts := options.Find().SetSort(bson.D{{Key: "gongde", Value: -1}}).SetLimit(50).SetProjection(bson.D{{Key: "username", Value: 1}, {Key: "fullname", Value: 1}, {Key: "gongde", Value: 1}})
	cur, err := h.userColl.Find(h.ctx, bson.M{}, opts)
	if err != nil {
		abortErrorJSON(c, http.StatusInternalServerError, err)
		return
	}
	defer cur.Close(h.ctx)
	users := make([]models.User, 0)
	if err := cur.All(h.ctx, &users); err != nil {
		abortErrorJSON(c, http.StatusInternalServerError, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"users": users})
}

func (h *Handler) UserRegister(r *gin.Engine) {
	collection := h.userColl
	indexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "username", Value: 1}},
		Options: options.Index().SetUnique(true),
	}
	_, err := collection.Indexes().CreateOne(h.ctx, indexModel)
	if err != nil {
		log.Fatalln(err)
	}
	v := r.Group("/users")
	v.POST("", h.authMid(models.RoleStaff), h.postUser)
	v.GET("", h.authMid(models.RoleStudent), h.getUser)
	v.PUT("", h.authMid(models.RoleStudent), h.putUser)
	v.DELETE("", h.authMid(models.RoleStaff), h.deleteUser)
	v.GET("/all", h.authMid(models.RoleStaff), h.getAllUsers)
	v.GET("/gongde", h.authMid(models.RoleStudent), h.gdSign)
	v.GET("/gongde/rank", h.authMid(models.RoleStudent), h.gdRank)
}
