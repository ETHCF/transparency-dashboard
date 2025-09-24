package routes

import (
	"net/http"
	"strings"

	"github.com/ETHCF/ethutils"
	"github.com/gin-gonic/gin"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/types"
)

// Treasury routes

// GET /api/v1/treasury - Get treasury assets and information
func (rh *RouteHandler) GetTreasury(c *gin.Context) {
	treasuryResponse, err := rh.treasuryDB.GetTreasuryResponse(c)
	if err != nil {
		rh.log.WithError(err).Error("failed to get treasury information")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve treasury information"})
		return
	}

	c.JSON(http.StatusOK, treasuryResponse)
}

// GET /api/v1/treasury/assets - Get treasury assets
func (rh *RouteHandler) GetTreasuryAssets(c *gin.Context) {
	assets, err := rh.treasuryDB.GetAssets(c)
	if err != nil {
		rh.log.WithError(err).Error("failed to get treasury assets")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve treasury assets"})
		return
	}

	c.JSON(http.StatusOK, assets)
}

// POST /api/v1/treasury/assets - Add a new treasury asset
func (rh *RouteHandler) AddAsset(c *gin.Context) {
	var asset types.Asset
	err := c.ShouldBindJSON(&asset)
	if err != nil {
		rh.log.WithError(err).Warn("failed to bind asset request")
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Sanitize the address
	asset.Address, err = ethutils.SanitizeEthAddr(asset.Address)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid Ethereum address"})
		return
	}

	if err := rh.treasuryDB.AddAsset(c, asset); err != nil {
		if strings.Contains(err.Error(), "duplicate key value") {
			c.AbortWithStatusJSON(http.StatusConflict, gin.H{"error": "Asset already exists"})
			return
		}
		rh.log.WithError(err).Error("failed to add asset")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to add asset"})
		return
	}
	c.JSON(http.StatusCreated, asset)
}

// GET /api/v1/treasury/wallets - Get treasury wallets
func (rh *RouteHandler) GetTreasuryWallets(c *gin.Context) {
	wallets, err := rh.treasuryDB.GetWallets(c)
	if err != nil {
		rh.log.WithError(err).Error("failed to get treasury wallets")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve treasury wallets"})
		return
	}

	c.JSON(http.StatusOK, wallets)
}

// POST /api/v1/treasury/wallets - Add a new treasury wallet
func (rh *RouteHandler) AddWallet(c *gin.Context) {
	var wallet types.Wallet
	err := c.ShouldBindJSON(&wallet)
	if err != nil {
		rh.log.WithError(err).Warn("failed to bind wallet request")
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Sanitize the address
	wallet.Address, err = ethutils.SanitizeEthAddr(wallet.Address)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid Ethereum address"})
		return
	}

	if err := rh.treasuryDB.AddWallet(c, wallet); err != nil {
		rh.log.WithError(err).Error("failed to add wallet")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to add wallet"})
		return
	}

	c.JSON(http.StatusCreated, wallet)
}

// DELETE /api/v1/treasury/wallets/:address - Delete a treasury wallet
func (rh *RouteHandler) DeleteWallet(c *gin.Context) {
	// Sanitize the address
	address, err := ethutils.SanitizeEthAddr(c.Param("address"))
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid Ethereum address"})
		return
	}

	if err := rh.treasuryDB.DeleteWallet(c, address); err != nil {
		rh.log.WithError(err).Error("failed to delete wallet")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete wallet"})
		return
	}

	c.Status(http.StatusNoContent)
}
