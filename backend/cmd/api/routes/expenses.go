package routes

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gopkg.in/guregu/null.v4"

	"github.com/ETHCF/ethutils"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/auth"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/types"
)

// Expense management routes

// GET /api/v1/breakdown/expenses - Get spending breakdown by category
func (rh *RouteHandler) GetSpendingBreakdown(c *gin.Context) {
	startDateStr := c.Query("start")
	endDateStr := c.Query("end")

	startDate, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid start date format (expected YYYY-MM-DD)"})
		return
	}

	var endDate null.Time
	if endDateStr != "" {
		parsedEndDate, err := time.Parse("2006-01-02", endDateStr)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid end date format (expected YYYY-MM-DD)"})
			return
		}
		// Set to next day to make the end date inclusive
		endDate = null.NewTime(parsedEndDate.AddDate(0, 0, 1), true)
	} else {
		endDate = null.NewTime(time.Time{}, false)
	}

	spending, err := rh.expenseDB.GetSpendingBreakdown(c, startDate, endDate)
	if err != nil {
		rh.log.WithError(err).Error("failed to get spending breakdown")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve spending breakdown"})
		return
	}

	c.JSON(http.StatusOK, spending)
}

// GET /api/v1/expenses - Get expenses with pagination
func (rh *RouteHandler) GetExpenses(c *gin.Context) {
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

	expenses, err := rh.expenseDB.GetExpenses(c, limit, offset)
	if err != nil {
		rh.log.WithError(err).Error("failed to get expenses")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve expenses"})
		return
	}

	c.JSON(http.StatusOK, expenses)
}

// GET /api/v1/expenses/{id} - Get expense by ID
func (rh *RouteHandler) GetExpenseByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid expense ID format"})
		return
	}

	expense, err := rh.expenseDB.GetExpenseByID(c, id)
	if err != nil {
		rh.log.WithError(err).Error("failed to get expense by ID")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve expense"})
		return
	}

	c.JSON(http.StatusOK, expense)
}

// POST /api/v1/expenses - Create a new expense
func (rh *RouteHandler) CreateExpense(c *gin.Context) {
	var req types.CreateExpenseRequest
	err := c.ShouldBindJSON(&req)
	if err != nil {
		rh.log.WithError(err).Warn("failed to bind create expense request")
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if len(req.TxHash.String) > 0 {
		req.TxHash.String, err = ethutils.SanitizeEthHash(req.TxHash.String)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid Ethereum transaction hash"})
			return
		}
	} else {
		req.TxHash.Valid = false
	}

	// Create expense object
	expense := types.Expense{
		ID:        uuid.New(),
		Item:      strings.TrimSpace(req.Item),
		Quantity:  req.Quantity,
		Price:     req.Price,
		Purpose:   req.Purpose,
		Category:  req.Category.String,
		Date:      req.Date,
		TxHash:    req.TxHash,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := rh.expenseDB.CreateExpense(c, expense); err != nil {
		rh.log.WithError(err).Error("failed to create expense")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to create expense"})
		return
	}

	// Get current admin for logging
	currentAdminAddr := auth.MustUserID(c)

	// Log admin action
	adminAction := types.AdminAction{
		AdminAddress: currentAdminAddr,
		Action:       "create_expense",
		ResourceType: "expense",
		ResourceID:   expense.ID.String(),
		Details: types.AdminActionDetails{
			"expense_purpose":  expense.Purpose,
			"expense_category": expense.Category,
			"expense_date":     expense.Date.Format("2006-01-02"),
			"tx_hash":          expense.TxHash,
		},
		CreatedAt: time.Now(),
	}

	err = rh.adminActionDB.RecordAdminAction(c, adminAction)
	if err != nil {
		rh.log.WithError(err).Error("failed to record admin action")
		// Don't fail the request for logging errors
	}

	c.JSON(http.StatusCreated, expense)
}

// PUT /api/v1/expenses/{id} - Update expense details
func (rh *RouteHandler) UpdateExpense(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid expense ID format"})
		return
	}

	// Check if expense exists
	exists, err := rh.expenseDB.ExpenseExists(c, id)
	if err != nil {
		rh.log.WithError(err).Error("failed to check if expense exists")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify expense exists"})
		return
	}
	if !exists {
		c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "Expense not found"})
		return
	}

	var updates types.UpdateExpenseRequest
	if err := c.ShouldBindJSON(&updates); err != nil {
		rh.log.WithError(err).Warn("failed to bind update expense request")
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := rh.expenseDB.UpdateExpense(c, id, updates); err != nil {
		rh.log.WithError(err).Error("failed to update expense")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to update expense"})
		return
	}

	// Get updated expense to return
	updatedExpense, err := rh.expenseDB.GetExpenseByID(c, id)
	if err != nil {
		rh.log.WithError(err).Error("failed to get updated expense")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve updated expense"})
		return
	}

	// Get current admin for logging
	currentAdminAddr := auth.MustUserID(c)

	// Log admin action
	adminAction := types.AdminAction{
		AdminAddress: currentAdminAddr,
		Action:       "update_expense",
		ResourceType: "expense",
		ResourceID:   id.String(),
		Details: types.AdminActionDetails{
			"expense_purpose":  updatedExpense.Purpose,
			"expense_category": updatedExpense.Category,
			"expense_date":     updatedExpense.Date.Format("2006-01-02"),
			"tx_hash":          updatedExpense.TxHash,
		},
		CreatedAt: time.Now(),
	}

	err = rh.adminActionDB.RecordAdminAction(c, adminAction)
	if err != nil {
		rh.log.WithError(err).Error("failed to record admin action")
		// Don't fail the request for logging errors
	}

	c.JSON(http.StatusOK, updatedExpense)
}

// DELETE /api/v1/expenses/{id} - Delete expense
func (rh *RouteHandler) DeleteExpense(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid expense ID format"})
		return
	}

	// Check if expense exists
	exists, err := rh.expenseDB.ExpenseExists(c, id)
	if err != nil {
		rh.log.WithError(err).Error("failed to check if expense exists")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify expense exists"})
		return
	}
	if !exists {
		c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "Expense not found"})
		return
	}

	if err := rh.expenseDB.DeleteExpense(c, id); err != nil {
		rh.log.WithError(err).Error("failed to delete expense")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete expense"})
		return
	}

	// Get current admin for logging
	currentAdminAddr := auth.MustUserID(c)

	// Log admin action
	adminAction := types.AdminAction{
		AdminAddress: currentAdminAddr,
		Action:       "delete_expense",
		ResourceType: "expense",
		ResourceID:   id.String(),
		Details: types.AdminActionDetails{
			"expense_id": id.String(),
		},
		CreatedAt: time.Now(),
	}

	err = rh.adminActionDB.RecordAdminAction(c, adminAction)
	if err != nil {
		rh.log.WithError(err).Error("failed to record admin action")
		// Don't fail the request for logging errors
	}

	c.JSON(http.StatusOK, gin.H{"message": "Expense deleted successfully"})
}

// GET /api/v1/expenses/{id}/receipts - Get receipts for an expense
func (rh *RouteHandler) GetExpenseReceipts(c *gin.Context) {
	expenseID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid expense ID format"})
		return
	}

	receipts, err := rh.expenseDB.GetReceiptsByExpenseID(c, expenseID)
	if err != nil {
		rh.log.WithError(err).Error("failed to get expense receipts")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve expense receipts"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"receipts": receipts})
}

// POST /api/v1/expenses/{id}/receipts - Upload receipt for an expense
func (rh *RouteHandler) UploadExpenseReceipt(c *gin.Context) {
	expenseID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid expense ID format"})
		return
	}

	// Check if expense exists
	exists, err := rh.expenseDB.ExpenseExists(c, expenseID)
	if err != nil {
		rh.log.WithError(err).Error("failed to check if expense exists")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify expense exists"})
		return
	}
	if !exists {
		c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "Expense not found"})
		return
	}

	var req types.UploadReceiptRequest
	if err := c.ShouldBind(&req); err != nil {
		rh.log.WithError(err).Warn("failed to bind upload receipt request")
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get the uploaded file
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "No file uploaded or file upload error"})
		return
	}
	defer file.Close()

	// TODO: Implement file storage logic here
	// For now, create a receipt record without actual file storage
	receipt := types.Receipt{
		ID:        uuid.New(),
		ExpenseID: expenseID,
		Name:      strings.TrimSpace(req.Name),
		FileName:  null.StringFrom(header.Filename),
		FileSize:  header.Size,
		MimeType:  null.StringFrom(header.Header.Get("Content-Type")),
		StorageID: uuid.New().String(), // Placeholder storage ID
		CreatedAt: time.Now(),
	}

	if err := rh.expenseDB.CreateReceipt(c, receipt); err != nil {
		rh.log.WithError(err).Error("failed to create receipt record")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload receipt"})
		return
	}

	// Get current admin for logging
	currentAdminAddr := auth.MustUserID(c)

	// Log admin action
	adminAction := types.AdminAction{
		AdminAddress: currentAdminAddr,
		Action:       "upload_receipt",
		ResourceType: "receipt",
		ResourceID:   receipt.ID.String(),
		Details: types.AdminActionDetails{
			"expense_id":   expenseID.String(),
			"receipt_name": receipt.Name,
			"storage_id":   receipt.StorageID,
		},
		CreatedAt: time.Now(),
	}

	err = rh.adminActionDB.RecordAdminAction(c, adminAction)
	if err != nil {
		rh.log.WithError(err).Error("failed to record admin action")
		// Don't fail the request for logging errors
	}

	c.JSON(http.StatusCreated, receipt)
}

// GET /api/v1/receipts/{id} - Get receipt by ID
func (rh *RouteHandler) GetReceiptByID(c *gin.Context) {
	idStr := c.Param("id")
	receiptID, err := uuid.Parse(idStr)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid receipt ID format"})
		return
	}

	receipt, err := rh.expenseDB.GetReceiptByID(c, receiptID)
	if err != nil {
		rh.log.WithError(err).Error("failed to get receipt by ID")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve receipt"})
		return
	}

	c.JSON(http.StatusOK, receipt)
}

// DELETE /api/v1/receipts/{id} - Delete receipt
func (rh *RouteHandler) DeleteReceipt(c *gin.Context) {
	idStr := c.Param("id")
	receiptID, err := uuid.Parse(idStr)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid receipt ID format"})
		return
	}

	// Check if receipt exists
	exists, err := rh.expenseDB.ReceiptExists(c, receiptID)
	if err != nil {
		rh.log.WithError(err).Error("failed to check if receipt exists")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify receipt exists"})
		return
	}
	if !exists {
		c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "Receipt not found"})
		return
	}

	// TODO: Remove file from storage before deleting database record

	if err := rh.expenseDB.DeleteReceipt(c, receiptID); err != nil {
		rh.log.WithError(err).Error("failed to delete receipt")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete receipt"})
		return
	}

	// Get current admin for logging
	currentAdminAddr := auth.MustUserID(c)

	// Log admin action
	adminAction := types.AdminAction{
		AdminAddress: currentAdminAddr,
		Action:       "delete_receipt",
		ResourceType: "receipt",
		ResourceID:   receiptID.String(),
		Details: types.AdminActionDetails{
			"receipt_id": receiptID.String(),
		},
		CreatedAt: time.Now(),
	}

	err = rh.adminActionDB.RecordAdminAction(c, adminAction)
	if err != nil {
		rh.log.WithError(err).Error("failed to record admin action")
		// Don't fail the request for logging errors
	}

	c.JSON(http.StatusOK, gin.H{"message": "Receipt deleted successfully"})
}
