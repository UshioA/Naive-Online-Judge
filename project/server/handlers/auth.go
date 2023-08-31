package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"naive-server/models"
	"net/http"
	"regexp"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/mongo"
)

type gitlabUser struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

type loginDto struct {
	Code     string `json:"code"`
	State    string `json:"state"`
	Platform string `json:"platform"`
	FullName string `json:"fullname"`
	DbgCode  int    `json:"dbgcode"`
}

func (h *Handler) redirect(c *gin.Context) {
	state := c.Query("state")
	authURL := h.config.Oauth2.Config.AuthCodeURL(state)
	c.Redirect(http.StatusSeeOther, authURL)
}

func (h *Handler) getGitlabUser(dto loginDto) (gitlabUser, error) {
	if h.config.Debug.Debug && dto.DbgCode > 0 {
		return gitlabUser{
			ID:    dto.DbgCode,
			Name:  "TestUser",
			Email: fmt.Sprintf("%09d@smail.nju.edu.cn", dto.DbgCode-1),
		}, nil
	}
	token, err := h.config.Oauth2.Config.Exchange(h.ctx, dto.Code)
	if err != nil {
		return gitlabUser{}, err
	}
	client := h.config.Oauth2.Config.Client(h.ctx, token)
	resp, err := client.Get(h.config.Oauth2.UserAPI)
	if err != nil {
		return gitlabUser{}, err
	}
	defer resp.Body.Close()
	var user gitlabUser
	err = json.NewDecoder(resp.Body).Decode(&user)
	if err != nil {
		return gitlabUser{}, err
	}
	return user, nil
}

func getStudentID(email string) (string, error) {
	re := regexp.MustCompile(`(.+)@(smail\.)?nju\.edu\.cn`)
	match := re.FindStringSubmatch(email)
	if match == nil || len(match) <= 2 {
		return "", errors.New("南京大学代码托管服务提供的账户邮箱不是南京大学的有效邮箱，该地址无法使用外部登录。")
	}
	return match[1], nil
}

func (h *Handler) getJwtToken(user models.User) (string, time.Time, error) {
	exp := time.Now().Add(time.Hour * 24 * time.Duration(h.config.Jwt.Days))
	jwtToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":    user.GitlabID,
		"email": user.Email,
		"exp":   exp.Unix(),
	})
	jwtTokenString, err := jwtToken.SignedString([]byte(h.config.Jwt.Secret))
	if err != nil {
		return "", time.Time{}, err
	}
	err = h.redisClient.Set(h.ctx, jwtTokenString, user.UserName, time.Hour*24*time.Duration(h.config.Jwt.Days)).Err()
	if err != nil {
		return "", time.Time{}, err
	}
	return jwtTokenString, exp, nil
}

func (h *Handler) loginAuthorized(c *gin.Context) {
	var dto loginDto
	if err := c.ShouldBindJSON(&dto); err != nil {
		abortErrorJSON(c, http.StatusBadRequest, err)
		return
	}
	gitlabUser, err := h.getGitlabUser(dto)
	if err != nil {
		abortErrorJSON(c, http.StatusInternalServerError, err)
		return
	}
	stuID, err := getStudentID(gitlabUser.Email)
	if err != nil {
		abortErrorJSON(c, http.StatusBadRequest, err)
		return
	}
	h.findUserDo(stuID, c, func(u models.User) error {
		u.GitlabID = gitlabUser.ID
		if u.Email == "" {
			u.Email = gitlabUser.Email
		}
		if err := h.updateUser(u); err != nil {
			return err
		}
		jwtTokenString, exp, err := h.getJwtToken(u)
		if err != nil {
			return err
		}
		c.JSON(http.StatusOK, gin.H{"token": jwtTokenString, "user": u, "exp": exp})
		return nil
	}, func() error {
		abortErrorJSON(c, http.StatusBadRequest, errors.New("南京大学代码托管服务提供的账户邮箱前缀为"+stuID+"，该前缀不是学（工）号或在本系统中不存在。请先注册。"))
		return nil
	})
}

func (h *Handler) registerAuthorized(c *gin.Context) {
	var dto loginDto
	if err := c.ShouldBindJSON(&dto); err != nil {
		abortErrorJSON(c, http.StatusBadRequest, err)
		return
	}
	if dto.FullName == "" {
		abortErrorJSON(c, http.StatusBadRequest, errors.New("姓名为空"))
		return
	}
	gitlabUser, err := h.getGitlabUser(dto)
	if err != nil {
		abortErrorJSON(c, http.StatusInternalServerError, err)
		return
	}
	stuID, err := getStudentID(gitlabUser.Email)
	if err != nil {
		abortErrorJSON(c, http.StatusBadRequest, err)
		return
	}
	h.findUserDo(stuID, c, func(_ models.User) error {
		abortErrorJSON(c, http.StatusBadRequest, errors.New("南京大学代码托管服务提供的账户已被注册。"))
		return nil
	}, func() error {
		user := models.User{
			UserName: stuID,
			FullName: dto.FullName,
			Email:    gitlabUser.Email,
			Role:     models.RoleStudent,
			GitlabID: gitlabUser.ID,
		}
		_, err = h.createUser(user)
		if err != nil {
			return err
		}
		jwtTokenString, exp, err := h.getJwtToken(user)
		if err != nil {
			return err
		}
		c.JSON(http.StatusOK, gin.H{"token": jwtTokenString, "user": user, "exp": exp})
		return nil
	})
}

func (h *Handler) authJwt(c *gin.Context) (models.User, error) {
	authHeader := c.GetHeader("Authorization")
	if len(authHeader) < 8 || authHeader[:7] != "Bearer " {
		err := errors.New("未认证")
		abortErrorJSON(c, http.StatusUnauthorized, err)
		return models.User{}, err
	}
	jwtTokenString := authHeader[7:]
	var stuID string
	if h.config.Debug.Debug && jwtTokenString == "1145141919810" {
		stuID = "000000000"
	} else {
		var err error
		stuID, err = h.redisClient.Get(h.ctx, jwtTokenString).Result()
		if err != nil {
			abortErrorJSON(c, http.StatusUnauthorized, err)
			return models.User{}, err
		}
	}
	user, err := h.findUser(stuID)
	if err != nil {
		abortErrorJSON(c, http.StatusUnauthorized, err)
		return models.User{}, err
	}
	return user, nil
}

func (h *Handler) authMid(role int) func(c *gin.Context) {
	return func(c *gin.Context) {
		user, err := h.authJwt(c)
		if err == nil {
			if user.Role > role {
				abortErrorJSON(c, http.StatusForbidden, errors.New("无权访问"))
			} else {
				c.Set("user", user)
			}
		}
	}
}

func getUser(c *gin.Context) models.User {
	user, _ := c.Get("user")
	return user.(models.User)
}

func (h *Handler) AuthRegister(r *gin.Engine) {
	user, err := h.findUser(h.config.Admin.Username)
	if err == nil {
		if user.Role != models.RoleAdmin {
			user.Role = models.RoleAdmin
			h.updateUser(user)
		}
	} else if err == mongo.ErrNoDocuments {
		_, err := h.createUser(models.User{
			UserName: h.config.Admin.Username,
			FullName: h.config.Admin.Fullname,
			Role:     models.RoleAdmin,
		})
		if err != nil {
			log.Fatalln(err)
		}
	} else {
		log.Fatalln(err)
	}
	v := r.Group("/auth/gitlab")
	v.GET("/login", h.redirect)
	v.POST("/login/callback", h.loginAuthorized)
	v.POST("/register/callback", h.registerAuthorized)
}
