package auth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/config"
)

const (
	UserIDKey = "userID"
)

type Middleware interface {
	Handle(c *gin.Context)
}
type middleware struct {
	verifier JWTManager
	log      logrus.Ext1FieldLogger
	conf     *config.Config
}

func NewMiddleware(conf *config.Config, verifier JWTManager) (Middleware, error) {
	out := &middleware{
		verifier: verifier,
		log:      conf.GetLogger(),
		conf:     conf,
	}

	return out, nil
}

func (m middleware) Handle(c *gin.Context) {
	token, err := m.verifier.ValidateToken(c)
	if err != nil {
		if strings.Contains(err.Error(), "has expired at") {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "token expired"})
			return
		}
		m.log.WithError(err).Warn("error verifying token")
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "invalid token"})
		return
	}

	c.Set(UserIDKey, token.User)
	c.Next()
}

func UserID(c *gin.Context) (string, bool) {
	res, ok := c.Get(UserIDKey)
	if !ok {
		return "", false
	}
	out, ok := res.(string)
	if !ok {
		return "", false
	}
	return out, true
}

func MustUserID(c *gin.Context) string {
	res, ok := c.Get(UserIDKey)
	if !ok { // Panic because this should never happen unless the auth middleware is missing, in which case, we want it to crash
		panic("gin.Context should contain userID, but does not, missing auth middleware!")
	}
	out, ok := res.(string)
	if !ok { // Panic because this should never happen unless the auth middleware is broken, in which case, we want it to crash
		panic("gin.Context contains userID, but it is not a string")
	}
	return out
}
