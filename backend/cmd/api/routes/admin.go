package routes

import (
	"net/http"
	"strings"
	"time"

	"github.com/ETHCF/ethutils"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/auth"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/types"
	"github.com/gin-gonic/gin"
)

// Admin management routes

// GET /api/v1/admins - List all administrators
func (rh *RouteHandler) GetAdmins(c *gin.Context) {
	admins, err := rh.adminDB.GetAdmins(c)
	if err != nil {
		rh.log.WithError(err).Error("failed to get admins")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve admins"})
		return
	}

	c.JSON(http.StatusOK, admins)
}

// POST /api/v1/admins - Add a new administrator
func (rh *RouteHandler) AddAdmin(c *gin.Context) {
	var admin types.Admin
	err := c.ShouldBindJSON(&admin)
	if err != nil {
		rh.log.WithError(err).Warn("failed to bind add admin request")
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate and sanitize Ethereum address
	admin.Address, err = ethutils.SanitizeEthAddr(admin.Address)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid Ethereum address"})
		return
	}
	admin.Name = strings.TrimSpace(admin.Name)

	// Validate name is not empty
	if admin.Name == "" {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Admin name cannot be empty"})
		return
	}

	// Check if admin already exists
	exists, err := rh.adminDB.AdminExists(c, admin.Address)
	if err != nil {
		rh.log.WithError(err).Error("failed to check if admin exists")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to check admin existence"})
		return
	}
	if exists {
		c.AbortWithStatusJSON(http.StatusConflict, gin.H{"error": "Admin already exists"})
		return
	}

	// Add admin to database
	err = rh.adminDB.AddAdmin(c, admin)
	if err != nil {
		rh.log.WithError(err).Error("failed to add admin")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to add admin"})
		return
	}

	// Get current admin for logging
	currentAdminAddr := auth.MustUserID(c)

	// Log admin action
	adminAction := types.AdminAction{
		AdminAddress: currentAdminAddr,
		Action:       "add_admin",
		ResourceType: "admin",
		ResourceID:   admin.Address,
		Details: types.AdminActionDetails{
			"admin_name":    admin.Name,
			"admin_address": admin.Address,
		},
		CreatedAt: time.Now(),
	}

	err = rh.adminActionDB.RecordAdminAction(c, adminAction)
	if err != nil {
		rh.log.WithError(err).Error("failed to record admin action")
		// Don't fail the request for logging errors
	}

	c.JSON(http.StatusCreated, admin)
}

// DELETE /api/v1/admins/{address} - Remove an administrator
func (rh *RouteHandler) RemoveAdmin(c *gin.Context) {
	address := c.Param("address")
	if address == "" {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Address parameter is required"})
		return
	}

	// Validate and sanitize Ethereum address
	sanitizedAddr, err := ethutils.SanitizeEthAddr(address)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid Ethereum address"})
		return
	}

	// Get current admin for logging and self-removal check
	currentAdminAddr := auth.MustUserID(c)

	// Prevent self-removal
	if strings.EqualFold(currentAdminAddr, sanitizedAddr) {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Cannot remove yourself as admin"})
		return
	}

	// Check if admin exists
	exists, err := rh.adminDB.AdminExists(c, sanitizedAddr)
	if err != nil {
		rh.log.WithError(err).Error("failed to check if admin exists")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to check admin existence"})
		return
	}
	if !exists {
		c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "Admin not found"})
		return
	}

	// Remove admin from database
	err = rh.adminDB.RemoveAdmin(c, sanitizedAddr)
	if err != nil {
		rh.log.WithError(err).Error("failed to remove admin")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove admin"})
		return
	}

	// Log admin action
	adminAction := types.AdminAction{
		AdminAddress: currentAdminAddr,
		Action:       "remove_admin",
		ResourceType: "admin",
		ResourceID:   sanitizedAddr,
		Details: types.AdminActionDetails{
			"removed_admin_address": sanitizedAddr,
		},
		CreatedAt: time.Now(),
	}

	err = rh.adminActionDB.RecordAdminAction(c, adminAction)
	if err != nil {
		rh.log.WithError(err).Error("failed to record admin action")
		// Don't fail the request for logging errors
	}

	c.Status(http.StatusNoContent)
}

// Audit log routes

// GET /api/v1/admin-actions - Get admin actions (audit log)
func (rh *RouteHandler) GetAdminActions(c *gin.Context) {
	// Use the existing ListAdminActions method with empty resource filters to get all actions
	actions, err := rh.adminActionDB.ListAdminActions(c, "", "")
	if err != nil {
		rh.log.WithError(err).Error("failed to get admin actions")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve admin actions"})
		return
	}

	c.JSON(http.StatusOK, actions)
}
