package config

import (
	"context"
	"strings"
	"time"

	"github.com/innodv/psql"
	"github.com/jmoiron/sqlx"
	"github.com/numbergroup/cleanenv"
	"github.com/numbergroup/config"
	"github.com/numbergroup/server"
)

type Config struct {
	InitialAdminAddress string        `env:"INITIAL_ADMIN_ADDRESS" env-default:""`
	AlchemyAPIKey       string        `env:"ALCHEMY_API_KEY" env-default:""`
	AlchemyAPITimeout   time.Duration `env:"ALCHEMY_API_TIMEOUT" env-default:"10s"`
	RPCURL              string        `env:"RPC_URL" env-default:""`
	RPCAPITimeout       time.Duration `env:"RPC_API_TIMEOUT" env-default:"10s"`
	BlockDelay          uint64        `env:"BLOCK_DELAY" env-default:"8"`
	TrackerPollInterval time.Duration `env:"TRACKER_POLL_INTERVAL" env-default:"1m"`
	config.BaseConfig
	ServerConfig server.Config
	Auth

	PSQL psql.Config
}

func (c Config) ConnectPSQL(ctx context.Context) (*sqlx.DB, error) {
	dbConn, err := psql.OpenConnectionPool(c.PSQL, c.GetLogger())
	if err != nil {
		return nil, err
	}
	err = dbConn.PingContext(ctx)
	if err != nil {
		return nil, err
	}
	return dbConn, nil
}

func NewConfig(ctx context.Context) (*Config, error) {

	conf := &Config{}
	err := cleanenv.ReadEnv(conf)
	if err != nil {
		return nil, err
	}

	conf.ServerConfig, err = server.LoadServerConfigFromEnv()
	if err != nil {
		return nil, err
	}

	conf.PSQL, err = psql.NewConfig()
	if err != nil {
		return nil, err
	}

	conf.Auth, err = NewAuth()
	if err != nil {
		return nil, err
	}

	conf.InitialAdminAddress = strings.ToLower(conf.InitialAdminAddress)

	if conf.RPCURL == "" && conf.AlchemyAPIKey != "" {
		conf.RPCURL = "https://eth-mainnet.g.alchemy.com/v2/" + conf.AlchemyAPIKey
	}

	// MinIO config is loaded from environment via cleanenv.ReadEnv above

	return conf, nil
}
