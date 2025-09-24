package db

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"database/sql"
	"encoding/pem"

	"github.com/numbergroup/errors"
	"github.com/jmoiron/sqlx"
	"github.com/sirupsen/logrus"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/config"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/constants"
)

type SettingsDB interface {
	GetOrganizationName(ctx context.Context) (string, error)
	SetOrganizationName(ctx context.Context, name string) error
	LoadJWTKey(ctx context.Context) (*ecdsa.PrivateKey, error)
}

type settingsDB struct {
	conf   *config.Config
	log    logrus.Ext1FieldLogger
	dbConn *sqlx.DB
}

func NewSettingsDB(conf *config.Config, dbConn *sqlx.DB) (SettingsDB, error) {
	return &settingsDB{
		conf:   conf,
		log:    conf.GetLogger(),
		dbConn: dbConn,
	}, nil
}

func (sb *settingsDB) GetOrganizationName(ctx context.Context) (string, error) {
	orgName, err := sb.Get(ctx, constants.SettingOrgName)
	if errors.Is(err, sql.ErrNoRows) {
		return "My Organization", nil // default name
	}
	return orgName, err
}

func (sb *settingsDB) SetOrganizationName(ctx context.Context, name string) error {
	return sb.Set(ctx, constants.SettingOrgName, name)
}

func (sb *settingsDB) Get(ctx context.Context, key string) (string, error) {
	var value string
	err := sb.dbConn.GetContext(ctx, &value, "SELECT value FROM settings WHERE key = $1", key)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", sql.ErrNoRows
		}
		return "", errors.Wrapf(err, "failed to get setting for key (%s)", key)
	}
	return value, nil
}

func (sb *settingsDB) Set(ctx context.Context, key, value string) error {
	_, err := sb.dbConn.ExecContext(ctx, "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", key, value)
	return err
}

/**
* In order to minimize setup friction, we auto-generate a JWT key if none exists, and store it in the settings table.
* This is not the most secure approach, and we may want to provide an alternative. However, it should be acceptable,
* since this application is not intended or designed to handle high-security data.
**/
func (sb *settingsDB) generateJWTKey(ctx context.Context) (*ecdsa.PrivateKey, error) {
	sb.log.Info("Generating new JWT key since none exists")
	key, err := ecdsa.GenerateKey(elliptic.P384(), rand.Reader)
	if err != nil {
		return nil, errors.Wrap(err, "failed to generate ECDSA key")
	}

	x509Encoded, _ := x509.MarshalECPrivateKey(key)
	pemEncoded := pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: x509Encoded})

	result, err := sb.dbConn.ExecContext(ctx, "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT DO NOTHING", "jwt_private_key", string(pemEncoded))
	if err != nil {
		return nil, errors.Wrap(err, "failed to insert JWT key into settings table")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return nil, errors.Wrap(err, "failed to get rows affected after inserting JWT key")
	}
	if rowsAffected == 0 {
		sb.log.Warn("JWT key already exists, not overwriting")
		return sb.loadJWTKey(ctx) // Attempt to load the existing key
	}
	return key, nil
}

func (sb *settingsDB) loadJWTKey(ctx context.Context) (*ecdsa.PrivateKey, error) {
	data, err := sb.Get(ctx, "jwt_private_key")
	if err != nil {
		return nil, errors.Wrap(err, "failed to get JWT key from settings")
	}
	block, _ := pem.Decode([]byte(data))
	if block == nil {
		return nil, errors.New("failed to parse PEM block")
	}
	return x509.ParseECPrivateKey(block.Bytes)
}

func (sb *settingsDB) LoadJWTKey(ctx context.Context) (*ecdsa.PrivateKey, error) {
	key, err := sb.loadJWTKey(ctx)
	if err != nil {
		return sb.generateJWTKey(ctx)
	}
	return key, nil
}
