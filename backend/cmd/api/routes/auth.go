package routes

import (
	"net/http"

	"github.com/ETHCF/ethutils"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/auth"
)

func (rh *RouteHandler) originIP(c *gin.Context) string {
	ip := c.GetHeader("CF-Connecting-IP")
	if len(ip) != 0 {
		return ip
	}
	return c.ClientIP()
}

func (rh *RouteHandler) GenerateChallenge(c *gin.Context) {

	address, err := ethutils.SanitizeEthAddr(c.Param("address"))
	if err != nil {
		rh.log.WithError(err).Warn("invalid address")
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid address"})
		return
	}

	ip := rh.originIP(c)

	nonce, err := rh.authDB.GenerateNonce(c, address, ip)
	if err != nil {
		rh.log.WithError(err).Error("failed to generate nonce")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "failed to generate nonce"})
		return
	}
	msg, err := auth.NewMessageToSign(rh.conf, address, nonce)
	if err != nil {
		rh.log.WithError(err).Error("failed to create message")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "failed to create message"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": msg.String()})
}

func (rh *RouteHandler) VerifyChallenge(c *gin.Context) {
	var req auth.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		rh.log.WithError(err).Warn("failed to bind request")
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	authnReq, err := auth.NewAuthenticationRequest(req, rh.originIP(c))
	if err != nil {
		rh.log.WithError(err).Warn("failed to create auth request")
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	authnReq.UserAddress, err = ethutils.SanitizeEthAddr(authnReq.UserAddress)
	if err != nil {
		rh.log.WithError(err).Warn("invalid address")
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid address"})
		return
	}

	valid, err := rh.tokenVerifier.Verify(c, authnReq)
	if err != nil {
		rh.log.WithFields(logrus.Fields{
			"address": authnReq.UserAddress,
		}).WithError(err).Warn("failed to verify signature")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "failed to verify signature"})
		return
	}

	if !valid {
		rh.log.WithField("addr", authnReq.UserAddress).Info("invalid signature")
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid signature"})
		return
	}

	token, err := rh.tokenIssuer.IssueToken(c, authnReq, map[string]any{})
	if err != nil {
		rh.log.WithError(err).Error("failed to issue token")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "failed to issue token"})
		return
	}

	rh.log.WithFields(logrus.Fields{
		"address": authnReq.UserAddress,
		"ip":      authnReq.IPAddr,
	}).Info("login successful")
	c.JSON(http.StatusOK, gin.H{"token": token})
}

// GET /api/v1/auth/check

func (rh *RouteHandler) CheckAuth(c *gin.Context) {
	user, ok := auth.UserID(c)
	if !ok {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"address": user})
}
