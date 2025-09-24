package routes

import (
	"net/http"
	"strings"
	"time"

	"github.com/ETHCF/ethutils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gopkg.in/guregu/null.v4"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/auth"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/types"
)

// Grant management routes

// GET /api/v1/grants - Get grants with optional filtering
func (rh *RouteHandler) GetGrants(c *gin.Context) {
	grants, err := rh.grantDB.GetGrants(c)
	if err != nil {
		rh.log.WithError(err).Error("failed to get grants")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve grants"})
		return
	}

	c.JSON(http.StatusOK, grants)
}

// GET /api/v1/grants/{id} - Get grant by ID
func (rh *RouteHandler) GetGrantByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid grant ID format"})
		return
	}

	grant, err := rh.grantDB.GetGrantByID(c, id)
	if err != nil {
		rh.log.WithError(err).Error("failed to get grant by ID")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve grant"})
		return
	}

	c.JSON(http.StatusOK, grant)
}

// POST /api/v1/grants - Create a new grant
func (rh *RouteHandler) CreateGrant(c *gin.Context) {
	var req types.CreateGrantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		rh.log.WithError(err).Warn("failed to bind create grant request")
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate and sanitize Ethereum address
	sanitizedAddr, err := ethutils.SanitizeEthAddr(req.RecipientAddress)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid recipient Ethereum address"})
		return
	}

	// Create grant object
	grant := types.CreateGrant{
		Name:                   strings.TrimSpace(req.Name),
		RecipientName:          strings.TrimSpace(req.RecipientName),
		RecipientAddress:       sanitizedAddr,
		Description:            strings.TrimSpace(req.Description),
		TeamURL:                null.StringFromPtr(stringPtrIfNotEmpty(strings.TrimSpace(req.TeamURL))),
		ProjectURL:             null.StringFromPtr(stringPtrIfNotEmpty(strings.TrimSpace(req.ProjectURL))),
		TotalGrantAmount:       req.TotalGrantAmount,
		InitialGrantAmount:     req.InitialGrantAmount,
		StartDate:              req.StartDate,
		ExpectedCompletionDate: req.ExpectedCompletionDate,
		AmountGivenSoFar:       req.InitialGrantAmount,
		Status:                 types.GrantStatus(req.Status),
	}

	grantID, err := rh.grantDB.CreateGrant(c, grant)
	if err != nil {
		rh.log.WithError(err).Error("failed to create grant")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to create grant"})
		return
	}

	// Get current admin for logging
	currentAdminAddr := auth.MustUserID(c)

	// Log admin action
	adminAction := types.AdminAction{
		AdminAddress: currentAdminAddr,
		Action:       "create_grant",
		ResourceType: "grant",
		ResourceID:   grantID.String(),
		Details: types.AdminActionDetails{
			"grant_description":         grant.Description,
			"grant_status":              grant.Status,
			"grant_start_date":          grant.StartDate.Format("2006-01-02"),
			"grant_expected_completion": grant.ExpectedCompletionDate.Format("2006-01-02"),
			"initial_grant_amount":      grant.AmountGivenSoFar,
		},
		CreatedAt: time.Now(),
	}

	err = rh.adminActionDB.RecordAdminAction(c, adminAction)
	if err != nil {
		rh.log.WithError(err).Error("failed to record admin action")
		// Don't fail the request for logging errors
	}

	c.JSON(http.StatusCreated, gin.H{"id": grantID})
}

// PUT /api/v1/grants/{id} - Update grant details
func (rh *RouteHandler) UpdateGrant(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid grant ID format"})
		return
	}

	// Check if grant exists
	exists, err := rh.grantDB.GrantExists(c, id)
	if err != nil {
		rh.log.WithError(err).Error("failed to check if grant exists")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify grant exists"})
		return
	}
	if !exists {
		c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "Grant not found"})
		return
	}

	var updates types.UpdateGrantRequest
	if err := c.ShouldBindJSON(&updates); err != nil {
		rh.log.WithError(err).Warn("failed to bind update grant request")
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Sanitize recipient address if provided
	if updates.RecipientAddress.Valid {
		sanitizedAddr, err := ethutils.SanitizeEthAddr(updates.RecipientAddress.String)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid recipient Ethereum address"})
			return
		}
		updates.RecipientAddress = null.StringFrom(sanitizedAddr)
	}

	if err := rh.grantDB.UpdateGrant(c, id, updates); err != nil {
		rh.log.WithError(err).Error("failed to update grant")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to update grant"})
		return
	}

	// Get updated grant to return
	updatedGrant, err := rh.grantDB.GetGrantByID(c, id)
	if err != nil {
		rh.log.WithError(err).Error("failed to get updated grant")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve updated grant"})
		return
	}

	// Get current admin for logging
	currentAdminAddr := auth.MustUserID(c)

	// Log admin action
	adminAction := types.AdminAction{
		AdminAddress: currentAdminAddr,
		Action:       "update_grant",
		ResourceType: "grant",
		ResourceID:   id.String(),
		Details: types.AdminActionDetails{
			"grant_description":         updatedGrant.Description,
			"grant_status":              updatedGrant.Status,
			"grant_start_date":          updatedGrant.StartDate.Format("2006-01-02"),
			"grant_expected_completion": updatedGrant.ExpectedCompletionDate.Format("2006-01-02"),
			"amount_given_so_far":       updatedGrant.AmountGivenSoFar,
		},
		CreatedAt: time.Now(),
	}

	err = rh.adminActionDB.RecordAdminAction(c, adminAction)
	if err != nil {
		rh.log.WithError(err).Error("failed to record admin action")
		// Don't fail the request for logging errors
	}

	c.JSON(http.StatusOK, updatedGrant)
}

// PUT /api/v1/grants/{id}/milestones - Update grant milestones
func (rh *RouteHandler) UpdateGrantMilestones(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid grant ID format"})
		return
	}

	// Check if grant exists
	exists, err := rh.grantDB.GrantExists(c, id)
	if err != nil {
		rh.log.WithError(err).Error("failed to check if grant exists")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify grant exists"})
		return
	}
	if !exists {
		c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "Grant not found"})
		return
	}

	var req types.UpdateMilestonesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		rh.log.WithError(err).Warn("failed to bind update milestones request")
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert request milestones to types.Milestone
	milestones := make([]types.Milestone, len(req.Milestones))
	for i, m := range req.Milestones {
		milestoneID := uuid.New()
		if m.ID != "" {
			if parsedID, err := uuid.Parse(m.ID); err == nil {
				milestoneID = parsedID
			}
		}

		milestones[i] = types.Milestone{
			ID:          milestoneID,
			GrantID:     id,
			Name:        strings.TrimSpace(m.Title),
			Description: strings.TrimSpace(m.Description),
			GrantAmount: m.Amount,
			Status:      types.MilestoneStatus(m.Status),
			Completed:   m.Completed,
			SignedOff:   m.SignedOff,
			OrderIndex:  i,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}
	}

	if err := rh.grantDB.UpdateGrantMilestones(c, id, milestones); err != nil {
		rh.log.WithError(err).Error("failed to update grant milestones")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to update grant milestones"})
		return
	}

	// Get updated grant with milestones to return
	updatedGrant, err := rh.grantDB.GetGrantByID(c, id)
	if err != nil {
		rh.log.WithError(err).Error("failed to get updated grant")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve updated grant"})
		return
	}

	// Get milestones for the grant
	milestones, err = rh.grantDB.GetMilestonesByGrantID(c, id)
	if err != nil {
		rh.log.WithError(err).Error("failed to get updated milestones")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve updated milestones"})
		return
	}

	updatedGrant.Milestones = milestones

	// Get current admin for logging
	currentAdminAddr := auth.MustUserID(c)

	// Log admin action
	adminAction := types.AdminAction{
		AdminAddress: currentAdminAddr,
		Action:       "update_grant_milestones",
		ResourceType: "grant",
		ResourceID:   id.String(),
		CreatedAt:    time.Now(),
	}

	err = rh.adminActionDB.RecordAdminAction(c, adminAction)
	if err != nil {
		rh.log.WithError(err).Error("failed to record admin action")
		// Don't fail the request for logging errors
	}

	c.JSON(http.StatusOK, updatedGrant)
}

// GET /api/v1/grants/{id}/milestones - Get grant milestones
func (rh *RouteHandler) GetGrantMilestones(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid grant ID format"})
		return
	}

	milestones, err := rh.grantDB.GetMilestonesByGrantID(c, id)
	if err != nil {
		rh.log.WithError(err).Error("failed to get grant milestones")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve grant milestones"})
		return
	}

	c.JSON(http.StatusOK, milestones)
}

// GET /api/v1/grants/{id}/disbursements - Get grant disbursements
func (rh *RouteHandler) GetGrantDisbursements(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid grant ID format"})
		return
	}

	disbursements, err := rh.grantDB.GetDisbursementsByGrantID(c, id)
	if err != nil {
		rh.log.WithError(err).Error("failed to get grant disbursements")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve grant disbursements"})
		return
	}

	c.JSON(http.StatusOK, disbursements)
}

// POST /api/v1/grants/{id}/disbursements - Create a new disbursement for a grant
func (rh *RouteHandler) CreateDisbursement(c *gin.Context) {
	grantID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid grant ID format"})
		return
	}

	var req types.CreateDisbursementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		rh.log.WithError(err).Warn("failed to bind create disbursement request")
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	req.TxHash, err = ethutils.SanitizeEthHash(req.TxHash)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction hash"})
		return
	}

	// Create disbursement object
	disbursement := types.CreateDisbursement{
		Amount:         req.Amount,
		TxHash:         strings.ToLower(req.TxHash),
		BlockNumber:    req.BlockNumber,
		BlockTimestamp: req.BlockTimestamp,
	}

	if err := rh.grantDB.InsertDisbursement(c, grantID, disbursement); err != nil {
		rh.log.WithError(err).Error("failed to create disbursement")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to create disbursement"})
		return
	}

	// Get current admin for logging
	currentAdminAddr := auth.MustUserID(c)

	// Log admin action
	adminAction := types.AdminAction{
		AdminAddress: currentAdminAddr,
		Action:       "create_disbursement",
		ResourceType: "disbursement",
		ResourceID:   grantID.String(),
		Details: types.AdminActionDetails{
			"grant_id":            grantID.String(),
			"disbursement_amount": disbursement.Amount,
			"tx_hash":             disbursement.TxHash,
			"block_number":        disbursement.BlockNumber,
		},
		CreatedAt: time.Now(),
	}

	err = rh.adminActionDB.RecordAdminAction(c, adminAction)
	if err != nil {
		rh.log.WithError(err).Error("failed to record admin action")
		// Don't fail the request for logging errors
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Disbursement created successfully"})
}

// PUT /api/v1/grants/{id}/disbursements/{disbursementId} - Update a disbursement
func (rh *RouteHandler) UpdateDisbursement(c *gin.Context) {
	grantID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid grant ID format"})
		return
	}

	disbursementID, err := uuid.Parse(c.Param("disbursementId"))
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid disbursement ID format"})
		return
	}

	var req types.UpdateDisbursementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		rh.log.WithError(err).Warn("failed to bind update disbursement request")
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	req.TxHash, err = ethutils.SanitizeEthHash(req.TxHash)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction hash"})
		return
	}

	// Create updated disbursement object
	updatedDisbursement := types.Disbursement{
		ID: disbursementID,
		CreateDisbursement: types.CreateDisbursement{
			GrantID:        grantID,
			Amount:         req.Amount,
			TxHash:         strings.ToLower(req.TxHash),
			BlockNumber:    req.BlockNumber,
			BlockTimestamp: req.BlockTimestamp,
		},
	}

	if err := rh.grantDB.UpdateDisbursement(c, disbursementID, updatedDisbursement); err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "Disbursement not found"})
			return
		}
		rh.log.WithError(err).Error("failed to update disbursement")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to update disbursement"})
		return
	}

	// Get current admin for logging
	currentAdminAddr := auth.MustUserID(c)

	// Log admin action
	adminAction := types.AdminAction{
		AdminAddress: currentAdminAddr,
		Action:       "update_disbursement",
		ResourceType: "disbursement",
		ResourceID:   disbursementID.String(),
		Details: types.AdminActionDetails{
			"grant_id":            grantID.String(),
			"disbursement_id":     disbursementID.String(),
			"disbursement_amount": updatedDisbursement.Amount,
			"tx_hash":             updatedDisbursement.TxHash,
			"block_number":        updatedDisbursement.BlockNumber,
		},
		CreatedAt: time.Now(),
	}

	err = rh.adminActionDB.RecordAdminAction(c, adminAction)
	if err != nil {
		rh.log.WithError(err).Error("failed to record admin action")
		// Don't fail the request for logging errors
	}

	c.JSON(http.StatusOK, gin.H{"message": "Disbursement updated successfully"})
}

// GET /api/v1/grants/{id}/funds-usage - Get grant funds usage
func (rh *RouteHandler) GetGrantFundsUsage(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid grant ID format"})
		return
	}

	fundsUsage, err := rh.grantDB.GetFundsUsageByGrantID(c, id)
	if err != nil {
		rh.log.WithError(err).Error("failed to get grant funds usage")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve grant funds usage"})
		return
	}

	c.JSON(http.StatusOK, fundsUsage)
}

// POST /api/v1/grants/{id}/funds-usage - Create a new grant funds usage entry
func (rh *RouteHandler) CreateGrantFundsUsage(c *gin.Context) {
	grantID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid grant ID format"})
		return
	}
	var req types.CreateFundsUsage
	if err := c.ShouldBindJSON(&req); err != nil {
		rh.log.WithError(err).Warn("failed to bind create funds usage request")
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.TxHash.Valid {
		req.TxHash.String, err = ethutils.SanitizeEthHash(req.TxHash.String)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction hash"})
			return
		}
	}
	req.GrantID = grantID

	err = rh.grantDB.CreateFundsUsage(c, req)
	if err != nil {
		rh.log.WithError(err).Error("failed to create funds usage")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to create funds usage"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{})
}

// PUT /api/v1/grants/{id}/funds-usage/{usageId} - Update a grant funds usage entry
func (rh *RouteHandler) UpdateGrantFundsUsage(c *gin.Context) {
	grantID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid grant ID format"})
		return
	}

	usageID, err := uuid.Parse(c.Param("usageId"))
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid funds usage ID format"})
		return
	}

	var req types.UpdateFundsUsage
	if err := c.ShouldBindJSON(&req); err != nil {
		rh.log.WithError(err).Warn("failed to bind update funds usage request")
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.TxHash.Valid {
		req.TxHash.String, err = ethutils.SanitizeEthHash(req.TxHash.String)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction hash"})
			return
		}
	}

	req.GrantID = grantID

	err = rh.grantDB.UpdateFundsUsage(c, usageID, req)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "Funds usage entry not found"})
			return
		}
		rh.log.WithError(err).Error("failed to update funds usage")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to update funds usage"})
		return
	}

	c.JSON(http.StatusOK, gin.H{})
}

// Helper function to convert empty string to nil pointer
func stringPtrIfNotEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
