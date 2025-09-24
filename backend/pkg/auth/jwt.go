package auth

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/sirupsen/logrus"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/config"
)

type JWTManager interface {
	IssueToken(ctx context.Context, authn Authentication, claims map[string]any) (string, error)
	ValidateToken(c *gin.Context) (jwt.MapClaims, error)
}

type jwtManager struct {
	conf       *config.Config
	log        logrus.Ext1FieldLogger
	privateKey *ecdsa.PrivateKey
	publicKey  *ecdsa.PublicKey
}

func NewJWTManager(conf *config.Config, privateKey *ecdsa.PrivateKey) (JWTManager, error) {
	return &jwtManager{
		conf:       conf,
		log:        conf.GetLogger(),
		privateKey: privateKey,
		publicKey:  &privateKey.PublicKey,
	}, nil
}

func (m *jwtManager) IssueToken(ctx context.Context, authn Authentication, meta map[string]any) (string, error) {
	m.log.WithField("user", authn.UserAddress).Debug("Issuing token")
	token := jwt.NewWithClaims(jwt.SigningMethodES384, &jwt.MapClaims{
		"user": authn.UserAddress,
		"meta": meta,
	})
	return token.SignedString(m.privateKey)

}

func (m *jwtManager) ValidateToken(c *gin.Context) (jwt.MapClaims, error) {
	authVal := c.Request.Header.Get("Authorization")
	if !strings.Contains(authVal, "Bearer ") {
		return jwt.MapClaims{}, fmt.Errorf("invalid token")
	}

	tokenStr := strings.Replace(authVal, "Bearer ", "", 1)
	var claims jwt.MapClaims
	token, err := jwt.ParseWithClaims(tokenStr, &claims, func(token *jwt.Token) (interface{}, error) {
		_, ok := token.Method.(*jwt.SigningMethodECDSA)
		if !ok {
			m.log.WithField("header", token.Header).Error("Invalid signing method")
			return nil, jwt.ErrInvalidKey
		}
		return m.publicKey, nil
	})
	if err != nil {
		return jwt.MapClaims{}, err
	}

	if !token.Valid {
		return jwt.MapClaims{}, fmt.Errorf("invalid token")
	}
	return claims, nil
}
