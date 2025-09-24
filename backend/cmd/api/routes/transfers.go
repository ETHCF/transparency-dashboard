package routes

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/ETHCF/ethutils"
	"github.com/gin-gonic/gin"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/types"
)

// Transfer management routes

// GET /api/v1/transfers - Get transfers with pagination
func (rh *RouteHandler) GetTransfers(c *gin.Context) {
	// Parse pagination parameters
	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 1000 {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid limit parameter (1-1000)"})
		return
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid offset parameter"})
		return
	}

	transfers, err := rh.treasuryDB.GetTransfers(c, limit, offset)
	if err != nil {
		rh.log.WithError(err).Error("failed to get transfers")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve transfers"})
		return
	}

	c.JSON(http.StatusOK, transfers)
}

// GET /api/v1/transfer-parties - Get transfer parties with pagination
func (rh *RouteHandler) GetTransferParties(c *gin.Context) {
	// Parse pagination parameters
	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 1000 {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid limit parameter (1-1000)"})
		return
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid offset parameter"})
		return
	}

	parties, err := rh.treasuryDB.GetTransferParties(c, limit, offset)
	if err != nil {
		rh.log.WithError(err).Error("failed to get transfer parties")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve transfer parties"})
		return
	}

	c.JSON(http.StatusOK, parties)
}

// POST /api/v1/transfers - Create a new transfer
func (rh *RouteHandler) CreateTransfer(c *gin.Context) {
	var req types.CreateTransfer
	err := c.ShouldBindJSON(&req)
	if err != nil {
		rh.log.WithError(err).Warn("failed to bind create transfer request")
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Sanitize the from and to addresses
	req.FromAddress, err = ethutils.SanitizeEthAddr(req.FromAddress)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid from Ethereum address"})
		return
	}
	req.ToAddress, err = ethutils.SanitizeEthAddr(req.ToAddress)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid to Ethereum address"})
		return
	}

	req.Asset, err = ethutils.SanitizeEthAddr(req.Asset)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid asset Ethereum address"})
		return
	}

	req.TxHash, err = ethutils.SanitizeEthHash(req.TxHash)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction hash"})
		return
	}

	if err := rh.treasuryDB.CreateTransfer(c, req); err != nil {
		if strings.Contains(err.Error(), "duplicate key value") {
			c.AbortWithStatusJSON(http.StatusConflict, gin.H{"error": "Transfer already exists"})
			return
		}
		rh.log.WithError(err).Error("failed to create transfer")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to create transfer"})
		return
	}
	c.JSON(http.StatusCreated, req)
}

// GET /api/v1/transfer-parties/{address} - Get transfer party by address
func (rh *RouteHandler) GetTransferPartyByAddress(c *gin.Context) {
	// Sanitize the address
	address, err := ethutils.SanitizeEthAddr(c.Param("address"))
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid Ethereum address"})
		return
	}

	party, err := rh.treasuryDB.GetTransferPartyByAddress(c, address)
	if err != nil {
		rh.log.WithError(err).Error("failed to get transfer party by address")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve transfer party"})
		return
	}

	c.JSON(http.StatusOK, party)
}

// PATCH /api/v1/transfer-parties/{address} - Update transfer party name
func (rh *RouteHandler) UpdateTransferPartyName(c *gin.Context) {

	// Sanitize the address
	address, err := ethutils.SanitizeEthAddr(c.Param("address"))
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid Ethereum address"})
		return
	}

	var req types.UpdateTransferPartyNameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		rh.log.WithError(err).Warn("failed to bind update transfer party name request")
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := rh.treasuryDB.UpdateTransferPartyName(c, address, req.Name); err != nil {
		rh.log.WithError(err).Error("failed to update transfer party name")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to update transfer party name"})
		return
	}

	// Get the updated party to return
	updatedParty, err := rh.treasuryDB.GetTransferPartyByAddress(c, address)
	if err != nil {
		rh.log.WithError(err).Error("failed to get updated transfer party")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve updated transfer party"})
		return
	}

	c.JSON(http.StatusOK, updatedParty)
}

// POST /api/v1/transfer-parties - Create or update transfer party
func (rh *RouteHandler) UpsertTransferParty(c *gin.Context) {
	var party types.TransferParty
	if err := c.ShouldBindJSON(&party); err != nil {
		rh.log.WithError(err).Warn("failed to bind transfer party request")
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Sanitize the address
	sanitizedAddr, err := ethutils.SanitizeEthAddr(party.Address)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid Ethereum address"})
		return
	}
	party.Address = sanitizedAddr

	if err := rh.treasuryDB.UpsertTransferParty(c, party); err != nil {
		rh.log.WithError(err).Error("failed to upsert transfer party")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to create or update transfer party"})
		return
	}

	c.JSON(http.StatusCreated, party)
}
