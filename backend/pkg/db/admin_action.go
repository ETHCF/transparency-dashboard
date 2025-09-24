package db

import (
	"context"
	"fmt"
	"strings"

	"github.com/cockroachdb/errors"
	"github.com/innodv/psql"
	"github.com/jmoiron/sqlx"
	"github.com/sirupsen/logrus"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/config"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/types"
)

type AdminActionDB interface {
	RecordAdminAction(ctx context.Context, action types.AdminAction) error
	ListAdminActions(ctx context.Context, resourceType, resourceID string) ([]types.AdminAction, error)
}

type adminAction struct {
	log               logrus.Ext1FieldLogger
	dbConn            *sqlx.DB
	recordAdminAction *sqlx.NamedStmt
	listAdminActions  *sqlx.Stmt
}

func NewAdminActionDB(ctx context.Context, conf *config.Config, dbConn *sqlx.DB) (AdminActionDB, error) {

	aaCols := psql.GetSQLColumnsQuoted[types.AdminAction]()
	recordAdminAction, err := dbConn.PrepareNamedContext(ctx, fmt.Sprintf(`INSERT INTO "admin_actions" (%s)
	VALUES (%s)`, strings.Join(aaCols, ", "), ":"+strings.Join(psql.GetSQLColumns[types.AdminAction](), ", :")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare RecordAdminAction statement")
	}

	listAdminActions, err := dbConn.PreparexContext(ctx, fmt.Sprintf(`SELECT %s FROM "admin_actions" WHERE "resource_type" = $1 AND "resource_id" = $2`, strings.Join(aaCols, ", ")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare ListAdminActions statement")
	}

	return &adminAction{
		log:               conf.GetLogger(),
		dbConn:            dbConn,
		recordAdminAction: recordAdminAction,
		listAdminActions:  listAdminActions,
	}, nil
}

func (a *adminAction) RecordAdminAction(ctx context.Context, action types.AdminAction) error {
	_, err := a.recordAdminAction.ExecContext(ctx, action)
	return err
}

func (a *adminAction) ListAdminActions(ctx context.Context, resourceType, resourceID string) ([]types.AdminAction, error) {
	var actions []types.AdminAction
	err := a.listAdminActions.SelectContext(ctx, &actions, resourceType, resourceID)
	if err != nil {
		return nil, errors.Wrap(err, "failed to list admin actions")
	}
	return actions, nil
}
