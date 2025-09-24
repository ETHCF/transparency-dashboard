package main

import (
	"context"
	"os"
	"os/exec"
	"os/signal"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/alchemy"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/config"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/db"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/eth"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/types"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()
	conf, err := config.NewConfig(ctx)
	if err != nil {
		panic(err)
	}
	log := conf.GetLogger()
	err = exec.Command("tern", "migrate", "--migrations", "./migrations", "--host", conf.PSQL.DBHost, "--database", conf.PSQL.DBName, "--user", conf.PSQL.DBUser, "--password", conf.PSQL.DBPassword).Run()
	if err != nil {
		log.WithError(err).Error("failed to run migration")
	}
	dbConn, err := conf.ConnectPSQL(ctx)
	if err != nil {
		log.WithError(err).Fatal("failed to connect to PSQL")
	}

	adminDB, err := db.NewAdminDB(ctx, conf, dbConn)
	if err != nil {
		log.WithError(err).Fatal("failed to connect to admin PSQL")
	}

	err = adminDB.AddAdmin(ctx, types.Admin{Name: "Super Admin", Address: conf.InitialAdminAddress})
	if err != nil {
		log.WithError(err).Warn("failed to add initial admin")
	}

	metaDB, err := db.NewMetaDB(dbConn)
	if err != nil {
		log.WithError(err).Fatal("failed to connect to metadata PSQL")
	}

	settingDB, err := db.NewSettingsDB(conf, dbConn)
	if err != nil {
		log.WithError(err).Fatal("failed to connect to settings PSQL")
	}

	treasuryDB, err := db.NewTreasuryDB(ctx, conf, dbConn, settingDB)
	if err != nil {
		log.WithError(err).Fatal("failed to connect to treasury PSQL")
	}

	alchemyAPI := alchemy.NewAPI(conf)
	ethRPC := eth.NewClient(conf)

	tracker := NewTracker(conf, ethRPC, alchemyAPI, metaDB, treasuryDB)

	tracker.Start(ctx)

}
