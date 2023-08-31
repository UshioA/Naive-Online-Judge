package handlers

import (
	"errors"
	"regexp"
	"strconv"

	"github.com/gin-gonic/gin"
)

func parseStartLimit(c *gin.Context) (int64, int64, error) {
	start, err := strconv.ParseInt(c.DefaultQuery("start", "0"), 10, 64)
	if err != nil {
		return -1, -1, err
	} else if start < 0 {
		return -1, -1, errors.New("start不合法")
	}
	limit, err := strconv.ParseInt(c.DefaultQuery("limit", "0"), 10, 64)
	if err != nil {
		return -1, -1, err
	} else if limit < 0 {
		return -1, -1, errors.New("limit不合法")
	}
	return start, limit, nil
}

func abortErrorJSON(c *gin.Context, code int, err error) {
	if err != nil {
		c.AbortWithStatusJSON(code, gin.H{"message": err.Error()})
		c.Error(err)
	}
}

var slugRe = regexp.MustCompile("^[a-zA-Z0-9_]+$")

func isValidSlug(slug string) bool {
	return slugRe.MatchString(slug)
}

var typesRe = regexp.MustCompile(`^\.[a-zA-Z0-9]+(,\s*\.[a-zA-Z0-9]+)*$`)

func isValidTypes(types string) bool {
	return typesRe.MatchString(types)
}

var dslugRe = regexp.MustCompile("^[a-z0-9_]+$")

func isValidDslug(slug string) bool {
	return dslugRe.MatchString(slug)
}
