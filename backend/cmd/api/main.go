package main

import (
	"context"

	"github.com/gin-gonic/gin"
	"github.com/numbergroup/server"

	"github.com/ETHCF/transparency-dashboard/backend/cmd/api/routes"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/auth"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/config"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/db"
)

func main() {
	ctx := context.Background()
	conf, err := config.NewConfig(ctx)
	if err != nil {
		panic(err)
	}
	logger := conf.GetLogger()

	dbConn, err := conf.ConnectPSQL(ctx)
	if err != nil {
		logger.WithError(err).Fatal("failed to connect to database")
	}

	dbPacket, err := db.NewDatabasePacket(ctx, conf, dbConn)
	if err != nil {
		logger.WithError(err).Fatal("failed to create database interfaces")
	}

	privateKey, err := dbPacket.SettingsDB.LoadJWTKey(ctx)
	if err != nil {
		logger.WithError(err).Fatal("failed to load jwt key")
	}

	jwtManager, err := auth.NewJWTManager(conf, privateKey)
	if err != nil {
		logger.WithError(err).Fatal("failed to create jwt manager")
	}

	tokenVerifier, err := auth.NewTokenVerifier(conf, dbPacket.AuthDB, dbPacket.AdminDB)
	if err != nil {
		logger.WithError(err).Fatal("failed to create token verifier")
	}

	middleware, err := auth.NewMiddleware(conf, jwtManager)
	if err != nil {
		logger.WithError(err).Fatal("failed to create auth middleware")
	}

	handle := routes.NewRouteHandler(conf, dbPacket, routes.AuthPacket{
		AuthMiddleware: middleware,
		TokenVerifier:  tokenVerifier,
		TokenIssuer:    jwtManager,
	})

	r := gin.Default()
	r.Use(server.CORSAllowAll)

	handle.ApplyRoutes(r)
	logger.Info("starting server")
	err = server.ListenWithGracefulShutdown(ctx, logger, r, conf.ServerConfig)
	if err != nil {
		logger.WithError(err).Fatal("failed to start server")
	}
}
