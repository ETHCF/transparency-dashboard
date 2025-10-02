package routes

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/auth"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/types"
)

// Settings management routes

type UpdateOrganizationNameRequest struct {
	Name string `json:"name" binding:"required"`
}

type OrganizationNameResponse struct {
	Name string `json:"name"`
}

type UpdateTotalFundsRaisedRequest struct {
	Amount float64 `json:"amount" binding:"required,min=0"`
}

type TotalFundsRaisedResponse struct {
	Amount float64 `json:"amount"`
}

// GET /api/v1/settings/name - Get organization name
func (rh *RouteHandler) GetOrganizationName(c *gin.Context) {
	name, err := rh.settingsDB.GetOrganizationName(c)
	if err != nil {
		rh.log.WithError(err).Error("failed to get organization name")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve organization name"})
		return
	}

	c.JSON(http.StatusOK, OrganizationNameResponse{Name: name})
}

// POST /api/v1/settings/name - Update organization name
func (rh *RouteHandler) UpdateOrganizationName(c *gin.Context) {
	var req UpdateOrganizationNameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		rh.log.WithError(err).Warn("failed to bind organization name update request")
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate name
	name := strings.TrimSpace(req.Name)
	if len(name) == 0 {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Organization name cannot be empty"})
		return
	}

	if len(name) > 255 {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Organization name cannot exceed 255 characters"})
		return
	}

	// Update organization name in database
	if err := rh.settingsDB.SetOrganizationName(c, name); err != nil {
		rh.log.WithError(err).Error("failed to update organization name")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to update organization name"})
		return
	}

	// Get current admin for logging
	currentAdminAddr := auth.MustUserID(c)

	// Log admin action
	adminAction := types.AdminAction{
		AdminAddress: currentAdminAddr,
		Action:       "update_organization_name",
		ResourceType: "setting",
		ResourceID:   "organization_name",
		Details: types.AdminActionDetails{
			"new_organization_name": name,
		},
		CreatedAt: time.Now(),
	}

	err := rh.adminActionDB.RecordAdminAction(c, adminAction)
	if err != nil {
		rh.log.WithError(err).Error("failed to record admin action")
		// Don't fail the request for logging errors
	}

	c.JSON(http.StatusOK, OrganizationNameResponse{Name: name})
}

// GET /api/v1/settings/total-funds-raised - Get total funds raised
func (rh *RouteHandler) GetTotalFundsRaised(c *gin.Context) {
	amount, err := rh.settingsDB.GetTotalFundsRaised(c)
	if err != nil {
		rh.log.WithError(err).Error("failed to get total funds raised")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve total funds raised"})
		return
	}

	c.JSON(http.StatusOK, TotalFundsRaisedResponse{Amount: amount})
}

// POST /api/v1/settings/total-funds-raised - Update total funds raised
func (rh *RouteHandler) UpdateTotalFundsRaised(c *gin.Context) {
	var req UpdateTotalFundsRaisedRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		rh.log.WithError(err).Warn("failed to bind total funds raised update request")
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Amount < 0 {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Total funds raised cannot be negative"})
		return
	}

	if err := rh.settingsDB.SetTotalFundsRaised(c, req.Amount); err != nil {
		rh.log.WithError(err).Error("failed to update total funds raised")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to update total funds raised"})
		return
	}

	currentAdminAddr := auth.MustUserID(c)

	adminAction := types.AdminAction{
		AdminAddress: currentAdminAddr,
		Action:       "update_total_funds_raised",
		ResourceType: "setting",
		ResourceID:   "total_funds_raised",
		Details: types.AdminActionDetails{
			"new_amount": req.Amount,
		},
		CreatedAt: time.Now(),
	}

	err := rh.adminActionDB.RecordAdminAction(c, adminAction)
	if err != nil {
		rh.log.WithError(err).Error("failed to record admin action")
	}

	c.JSON(http.StatusOK, TotalFundsRaisedResponse{Amount: req.Amount})
}
