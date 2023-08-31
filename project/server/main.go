package main

import (
	"context"
	"fmt"
	"naive-server/config"
	"naive-server/handlers"

	"github.com/gin-gonic/gin"
)

func main() {
	config := config.GetConfig()
	h := handlers.NewHandler(context.Background(), config)
	r := gin.Default()
	h.MiscRegister(r)
	h.AuthRegister(r)
	h.UserRegister(r)
	h.AssignmentRegister(r)
	h.ProblemRegister(r)
	h.SubmissionRegister(r)
	h.GTRegister(r)
	h.GraderRegister(r)
	h.StatisticsRegister(r)
	h.GoBuilder()
	h.GoRemover()
	for i := 0; i < config.Judger.Num; i++ {
		h.GoJudger()
	}
	r.Run(fmt.Sprintf("%s:%d", config.Server.Host, config.Server.Port))
}
