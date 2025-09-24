package db

import (
	"context"
	"fmt"
	"strings"

	"github.com/numbergroup/errors"
	"github.com/innodv/psql"
	"github.com/jmoiron/sqlx"
	"github.com/sirupsen/logrus"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/config"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/types"
)

type AdminDB interface {
	// Admin management methods
	GetAdmins(ctx context.Context) ([]types.Admin, error)
	AddAdmin(ctx context.Context, admin types.Admin) error
	RemoveAdmin(ctx context.Context, address string) error
	AdminExists(ctx context.Context, address string) (bool, error)
}

type admin struct {
	conf            *config.Config
	log             logrus.Ext1FieldLogger
	dbConn          *sqlx.DB
	getAdmins       *sqlx.Stmt
	addAdmin        *sqlx.NamedStmt
	removeAdmin     *sqlx.Stmt
	adminExists     *sqlx.Stmt
	getAdminActions *sqlx.Stmt
}

func NewAdminDB(ctx context.Context, conf *config.Config, dbConn *sqlx.DB) (AdminDB, error) {

	adminCols := psql.GetSQLColumnsQuoted[types.Admin]()
	adminColsNoQuote := psql.GetSQLColumns[types.Admin]()

	getAdminsQuery := fmt.Sprintf(`SELECT %s FROM "admins"`, strings.Join(adminCols, ", "))
	getAdmins, err := dbConn.PreparexContext(ctx, getAdminsQuery)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to prepare GetAdmins statement with query: %s", getAdminsQuery)
	}

	addAdmin, err := dbConn.PrepareNamedContext(ctx, fmt.Sprintf(`INSERT INTO "admins" (%s) VALUES (%s)`,
		strings.Join(adminCols, ", "), ":"+strings.Join(adminColsNoQuote, ", :")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare AddAdmin statement")
	}

	removeAdmin, err := dbConn.PreparexContext(ctx, `DELETE FROM "admins" WHERE "address" = $1`)
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare RemoveAdmin statement")
	}

	adminExists, err := dbConn.PreparexContext(ctx, `SELECT EXISTS(SELECT 1 FROM "admins" WHERE "address" = $1)`)
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare AdminExists statement")
	}

	return &admin{
		log:         conf.GetLogger(),
		conf:        conf,
		dbConn:      dbConn,
		getAdmins:   getAdmins,
		addAdmin:    addAdmin,
		removeAdmin: removeAdmin,
		adminExists: adminExists,
	}, nil
}

func (a *admin) GetAdmins(ctx context.Context) ([]types.Admin, error) {
	var admins []types.Admin
	err := a.getAdmins.SelectContext(ctx, &admins)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get admins")
	}
	if len(admins) == 0 {
		admins = []types.Admin{}
	}
	admins = append(admins, types.Admin{
		Address: a.conf.InitialAdminAddress,
		Name:    "Super Admin",
	})
	return admins, nil
}

func (a *admin) AddAdmin(ctx context.Context, admin types.Admin) error {
	_, err := a.addAdmin.ExecContext(ctx, admin)
	if err != nil {
		return errors.Wrap(err, "failed to add admin")
	}
	return nil
}

func (a *admin) RemoveAdmin(ctx context.Context, address string) error {
	result, err := a.removeAdmin.ExecContext(ctx, address)
	if err != nil {
		return errors.Wrap(err, "failed to remove admin")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return errors.Wrap(err, "failed to get rows affected")
	}

	if rowsAffected == 0 {
		return errors.New("admin not found")
	}

	return nil
}

func (a *admin) AdminExists(ctx context.Context, address string) (bool, error) {
	if address == a.conf.InitialAdminAddress {
		return true, nil
	}
	var exists bool
	err := a.adminExists.GetContext(ctx, &exists, address)
	if err != nil {
		return false, errors.Wrap(err, "failed to check if admin exists")
	}
	return exists, nil
}
