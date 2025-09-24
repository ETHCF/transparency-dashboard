package config

import (
	"errors"
	"time"

	"github.com/numbergroup/cleanenv"
)

// Auth contains the authentication configuration
type Auth struct {
	Domain          string        `env:"DOMAIN" env-default:"localhost"`
	ChallengeExpire time.Duration `env:"CHALLENGE_EXPIRE" env-default:"12h"`
	NonceExpire     time.Duration `env:"NONCE_EXPIRE" env-default:"12h"`
}

func NewAuth() (Auth, error) {
	conf := Auth{}
	err := cleanenv.ReadEnv(&conf)
	if err != nil {
		return Auth{}, err
	}
	if conf.ChallengeExpire <= 0 {
		return Auth{}, errors.New("challenge expire is not positive")
	}
	return conf, err
}
