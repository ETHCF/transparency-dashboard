package routes

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gopkg.in/guregu/null.v4"

	"github.com/ETHCF/ethutils"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/auth"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/types"
)

// Monthly Budget routes

// GET /api/v1/budgets/monthly - Get monthly budgets with optional date range
func (rh *RouteHandler) GetMonthlyBudgets(c *gin.Context) {
	// Parse query parameters
	fromStr := c.Query("from")
	toStr := c.Query("to")

	// Default to beginning of current year if no from date provided
	from := time.Date(time.Now().Year(), 1, 1, 0, 0, 0, 0, time.UTC)
	if fromStr != "" {
		parsedFrom, err := time.Parse("2006-01-02", fromStr)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid 'from' date format (use YYYY-MM-DD)"})
			return
		}
		from = parsedFrom
	}

	var to null.Time
	if toStr != "" {
		parsedTo, err := time.Parse("2006-01-02", toStr)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid 'to' date format (use YYYY-MM-DD)"})
			return
		}
		to = null.TimeFrom(parsedTo)
	}

	budgets, err := rh.budgetDB.GetMonthlyBudgets(c, from, to)
	if err != nil {
		rh.log.WithError(err).Error("failed to get monthly budgets")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve monthly budgets"})
		return
	}

	c.JSON(http.StatusOK, budgets)
}

// POST /api/v1/budgets/monthly - Create a new monthly budget
func (rh *RouteHandler) CreateMonthlyBudget(c *gin.Context) {
	var req types.CreateMonthlyBudget
	err := c.ShouldBindJSON(&req)
	if err != nil {
		rh.log.WithError(err).Warn("failed to bind create monthly budget request")
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse month date
	req.Month, err = time.Parse("2006-01-02", req.Month.Format("2006-01-02"))
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid month format (use YYYY-MM-DD)"})
		return
	}

	budgetID, err := rh.budgetDB.CreateMonthlyBudget(c, req)
	if err != nil {
		rh.log.WithError(err).Error("failed to create monthly budget")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to create monthly budget"})
		return
	}

	// Get current admin for logging
	currentAdminAddr := auth.MustUserID(c)

	// Log admin action
	adminAction := types.AdminAction{
		AdminAddress: currentAdminAddr,
		Action:       "create_monthly_budget",
		ResourceType: "monthly_budget",
		ResourceID:   budgetID.String(),
		Details:      types.AdminActionDetails{},
		CreatedAt:    time.Now(),
	}

	err = rh.adminActionDB.RecordAdminAction(c, adminAction)
	if err != nil {
		rh.log.WithError(err).Error("failed to record admin action")
		// Don't fail the request for logging errors
	}

	c.JSON(http.StatusCreated, gin.H{"id": budgetID})
}

// PUT /api/v1/budgets/monthly/{id} - Update a monthly budget
func (rh *RouteHandler) UpdateMonthlyBudget(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid budget ID format"})
		return
	}

	var req struct {
		Month    string `json:"month" binding:"required"`
		Amount   string `json:"amount" binding:"required"`
		Category string `json:"category" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		rh.log.WithError(err).Warn("failed to bind update monthly budget request")
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse month date
	month, err := time.Parse("2006-01-02", req.Month)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid month format (use YYYY-MM-DD)"})
		return
	}

	// Create budget object
	budget := types.MonthlyBudget{
		ID:        id,
		Month:     month,
		Amount:    strings.TrimSpace(req.Amount),
		Category:  strings.TrimSpace(req.Category),
		UpdatedAt: time.Now(),
	}

	if err := rh.budgetDB.UpdateMonthlyBudget(c, id, budget); err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "Monthly budget not found"})
			return
		}
		rh.log.WithError(err).Error("failed to update monthly budget")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to update monthly budget"})
		return
	}

	// Get current admin for logging
	currentAdminAddr := auth.MustUserID(c)

	// Log admin action
	adminAction := types.AdminAction{
		AdminAddress: currentAdminAddr,
		Action:       "update_monthly_budget",
		ResourceType: "monthly_budget",
		ResourceID:   id.String(),
		Details: types.AdminActionDetails{
			"month":    budget.Month.Format("2006-01-02"),
			"amount":   budget.Amount,
			"category": budget.Category,
		},
		CreatedAt: time.Now(),
	}

	err = rh.adminActionDB.RecordAdminAction(c, adminAction)
	if err != nil {
		rh.log.WithError(err).Error("failed to record admin action")
		// Don't fail the request for logging errors
	}

	c.JSON(http.StatusOK, budget)
}

// DELETE /api/v1/budgets/monthly/{id} - Delete a monthly budget
func (rh *RouteHandler) DeleteMonthlyBudget(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid budget ID format"})
		return
	}

	if err := rh.budgetDB.DeleteMonthlyBudget(c, id); err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "Monthly budget not found"})
			return
		}
		rh.log.WithError(err).Error("failed to delete monthly budget")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete monthly budget"})
		return
	}

	// Get current admin for logging
	currentAdminAddr := auth.MustUserID(c)

	// Log admin action
	adminAction := types.AdminAction{
		AdminAddress: currentAdminAddr,
		Action:       "delete_monthly_budget",
		ResourceType: "monthly_budget",
		ResourceID:   id.String(),
		Details: types.AdminActionDetails{
			"budget_id": id.String(),
		},
		CreatedAt: time.Now(),
	}

	err = rh.adminActionDB.RecordAdminAction(c, adminAction)
	if err != nil {
		rh.log.WithError(err).Error("failed to record admin action")
		// Don't fail the request for logging errors
	}

	c.JSON(http.StatusOK, gin.H{"message": "Monthly budget deleted successfully"})
}

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

	if req.Manager.Valid {
		req.Manager.String, err = ethutils.SanitizeEthAddr(req.Manager.String)
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

	if req.Manager.Valid {
		req.Manager.String, err = ethutils.SanitizeEthAddr(req.Manager.String)
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
