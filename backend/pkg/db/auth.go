package db

import (
	"context"
	"time"

	"github.com/cockroachdb/errors"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/sirupsen/logrus"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/config"
)

type AuthDB interface {
	GenerateNonce(ctx context.Context, address, ip string) (uuid.UUID, error)
	CheckAndConsumeNonce(ctx context.Context, address, ip string, nonce uuid.UUID) (bool, error)
}

type authDB struct {
	db          *sqlx.DB
	log         logrus.Ext1FieldLogger
	conf        *config.Config
	insertNonce *sqlx.Stmt
	deleteNonce *sqlx.Stmt
}

func NewAuthDB(ctx context.Context, conf *config.Config, sdb *sqlx.DB) (AuthDB, error) {
	insertNonce, err := sdb.PreparexContext(ctx, "SELECT update_or_get_nonce($1, $2, $3, $4)")
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare insert nonce statement")
	}
	deleteNonce, err := sdb.PreparexContext(ctx, "DELETE FROM \"auth_nonces\" WHERE \"nonce\" = $1 AND \"ip_addr\" = $2 AND \"address\" = $3 AND \"created_at\" > $4")
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare delete nonce statement")
	}

	return &authDB{
		db:          sdb,
		log:         conf.GetLogger(),
		conf:        conf,
		insertNonce: insertNonce,
		deleteNonce: deleteNonce,
	}, nil
}

func (adb *authDB) GenerateNonce(ctx context.Context, address, ip string) (uuid.UUID, error) {
	nonce := uuid.New()
	err := adb.insertNonce.GetContext(ctx, &nonce, address, ip, nonce.String(), time.Now().UTC().Add(-adb.conf.NonceExpire))
	if err != nil {
		return uuid.Nil, errors.Wrap(err, "failed to insert nonce")
	}
	return nonce, nil
}

func (adb *authDB) CheckAndConsumeNonce(ctx context.Context, address, ip string, nonce uuid.UUID) (bool, error) {
	result, err := adb.deleteNonce.ExecContext(ctx, nonce, ip, address, time.Now().UTC().Add(-adb.conf.NonceExpire))
	if err != nil {
		return false, errors.Wrap(err, "failed to delete nonce")
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return false, errors.Wrap(err, "failed to get rows affected")
	}
	adb.log.WithFields(logrus.Fields{
		"nonce":   nonce,
		"address": address,
		"ip":      ip,
		"rows":    rows}).Debug("nonce rows affected")
	return rows == 1, nil
}
