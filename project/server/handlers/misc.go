package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func (h *Handler) MiscRegister(r *gin.Engine) {
	v := r.Group("/misc")
	v.GET("/time", func(c *gin.Context) {
		c.String(http.StatusOK, time.Now().Format(time.RFC3339))
	})
	v.GET("/version", func(c *gin.Context) {
		c.String(http.StatusOK, "2023.03.12")
	})
}
