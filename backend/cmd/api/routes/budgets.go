package routes

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/auth"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/types"
)

// Monthly Budget Allocation routes

// GET /api/v1/budgets/allocations - Get all monthly budget allocations
func (rh *RouteHandler) GetMonthlyBudgetAllocations(c *gin.Context) {
	allocations, err := rh.budgetDB.GetMonthlyBudgetAllocations(c)
	if err != nil {
		rh.log.WithError(err).Error("failed to get monthly budget allocations")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve monthly budget allocations"})
		return
	}

	c.JSON(http.StatusOK, allocations)
}

// POST /api/v1/budgets/allocations - Create a new monthly budget allocation
func (rh *RouteHandler) CreateMonthlyBudgetAllocation(c *gin.Context) {
	var req types.CreateMonthlyBudgetAllocation
	err := c.ShouldBindJSON(&req)
	if err != nil {
		rh.log.WithError(err).Warn("failed to bind create monthly budget allocation request")
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	allocationID, err := rh.budgetDB.CreateMonthlyBudgetAllocation(c, req)
	if err != nil {
		rh.log.WithError(err).Error("failed to create monthly budget allocation")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to create monthly budget allocation"})
		return
	}

	// Get current admin for logging
	currentAdminAddr := auth.MustUserID(c)

	// Log admin action
	adminAction := types.AdminAction{
		AdminAddress: currentAdminAddr,
		Action:       "create_monthly_budget_allocation",
		ResourceType: "monthly_budget_allocation",
		ResourceID:   allocationID.String(),
		Details: types.AdminActionDetails{
			"manager":  req.Manager.String,
			"category": req.Category,
			"amount":   req.Amount,
		},
		CreatedAt: time.Now(),
	}

	err = rh.adminActionDB.RecordAdminAction(c, adminAction)
	if err != nil {
		rh.log.WithError(err).Error("failed to record admin action")
		// Don't fail the request for logging errors
	}

	c.JSON(http.StatusCreated, gin.H{"id": allocationID})
}

// PUT /api/v1/budgets/allocations/{id} - Update a monthly budget allocation
func (rh *RouteHandler) UpdateMonthlyBudgetAllocation(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid allocation ID format"})
		return
	}

	var req types.MonthlyBudgetAllocation
	if err := c.ShouldBindJSON(&req); err != nil {
		rh.log.WithError(err).Warn("failed to bind update monthly budget allocation request")
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := rh.budgetDB.UpdateMonthlyBudgetAllocation(c, id, req); err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "Monthly budget allocation not found"})
			return
		}
		rh.log.WithError(err).Error("failed to update monthly budget allocation")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to update monthly budget allocation"})
		return
	}

	// Get current admin for logging
	currentAdminAddr := auth.MustUserID(c)

	// Log admin action
	adminAction := types.AdminAction{
		AdminAddress: currentAdminAddr,
		Action:       "update_monthly_budget_allocation",
		ResourceType: "monthly_budget_allocation",
		ResourceID:   id.String(),
		Details: types.AdminActionDetails{
			"manager":  req.Manager,
			"category": req.Category,
			"amount":   req.Amount,
		},
		CreatedAt: time.Now(),
	}

	err = rh.adminActionDB.RecordAdminAction(c, adminAction)
	if err != nil {
		rh.log.WithError(err).Error("failed to record admin action")
		// Don't fail the request for logging errors
	}

	c.JSON(http.StatusOK, req)
}

// DELETE /api/v1/budgets/allocations/{id} - Delete a monthly budget allocation
func (rh *RouteHandler) DeleteMonthlyBudgetAllocation(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid allocation ID format"})
		return
	}

	if err := rh.budgetDB.DeleteMonthlyBudgetAllocation(c, id); err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "Monthly budget allocation not found"})
			return
		}
		rh.log.WithError(err).Error("failed to delete monthly budget allocation")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete monthly budget allocation"})
		return
	}

	// Get current admin for logging
	currentAdminAddr := auth.MustUserID(c)

	// Log admin action
	adminAction := types.AdminAction{
		AdminAddress: currentAdminAddr,
		Action:       "delete_monthly_budget_allocation",
		ResourceType: "monthly_budget_allocation",
		ResourceID:   id.String(),
		Details: types.AdminActionDetails{
			"allocation_id": id.String(),
		},
		CreatedAt: time.Now(),
	}

	err = rh.adminActionDB.RecordAdminAction(c, adminAction)
	if err != nil {
		rh.log.WithError(err).Error("failed to record admin action")
		// Don't fail the request for logging errors
	}

	c.JSON(http.StatusOK, gin.H{"message": "Monthly budget allocation deleted successfully"})
}
