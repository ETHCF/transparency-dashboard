package auth

import (
	"context"
	"strings"

	"github.com/cockroachdb/errors"
	"github.com/google/uuid"
	"github.com/numbergroup/siwe-go"
	"github.com/sirupsen/logrus"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/config"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/db"
)

type TokenVerifier interface {
	VerifyMessage(ctx context.Context, message *siwe.Message, ip string) (bool, error)
	Verify(ctx context.Context, req Authentication) (bool, error)
}

type tokenVerifier struct {
	conf    *config.Config
	log     logrus.Ext1FieldLogger
	authDB  db.AuthDB
	adminDB db.AdminDB
}

func NewTokenVerifier(conf *config.Config, authDB db.AuthDB, adminDB db.AdminDB) (TokenVerifier, error) {

	out := &tokenVerifier{
		conf:    conf,
		log:     conf.GetLogger(),
		authDB:  authDB,
		adminDB: adminDB,
	}

	return out, nil
}

func (tv tokenVerifier) Verify(ctx context.Context, req Authentication) (bool, error) {

	var valid bool
	var err error
	valid, err = VerifySignature(tv.log, req.SIWEMessage, req.Signature, req.UserAddress)
	if err != nil {
		tv.log.WithError(err).WithFields(logrus.Fields{
			"address": req.UserAddress,
			"sigLen":  len(req.Signature) - 2,
		}).Info("signature verification failed")
		return false, errors.Wrap(err, "failed to verify signature")
	}

	if !valid {
		tv.log.WithError(err).WithFields(logrus.Fields{
			"address": req.UserAddress,
			"sigLen":  len(req.Signature) - 2,
		}).Info("invalid signature")
		return false, errors.Wrap(err, "invalid signature")
	}

	validMsg, err := tv.VerifyMessage(ctx, req.Msg, req.IPAddr)
	if err != nil {
		return false, errors.Wrap(err, "failed to verify message")
	}
	if !validMsg {
		return false, errors.New("invalid siwe message")
	}

	return true, nil
}

func (tv tokenVerifier) VerifyMessage(ctx context.Context, message *siwe.Message, ip string) (bool, error) {
	ok, err := message.ValidNow()
	if err != nil {
		tv.log.WithError(err).Error("failed to check if the message is valid now")
		return false, err
	}
	if !ok {
		tv.log.WithField("message", message).Error("message is not valid now")
		return false, nil
	}
	nonce, err := uuid.Parse(message.GetNonce())
	if err != nil {
		tv.log.WithError(err).WithField("nonce", message.GetNonce()).Error("failed to parse nonce")
		return false, err
	}

	exists, err := tv.adminDB.AdminExists(ctx, strings.ToLower(message.GetAddress().Hex()))
	if err != nil {
		tv.log.WithError(err).Error("failed to check if admin exists")
		return false, err
	}
	if !exists {
		tv.log.WithField("address", strings.ToLower(message.GetAddress().Hex())).Error("admin does not exist")
		return false, nil
	}

	return tv.authDB.CheckAndConsumeNonce(ctx, strings.ToLower(message.GetAddress().Hex()), ip, nonce)
}
