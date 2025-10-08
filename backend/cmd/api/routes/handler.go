package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/auth"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/config"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/db"
)

type RouteHandler struct {
	log  logrus.Ext1FieldLogger
	conf *config.Config
	// Databases
	adminActionDB db.AdminActionDB
	adminDB       db.AdminDB
	authDB        db.AuthDB
	expenseDB     db.ExpenseDB
	grantDB       db.GrantDB
	settingsDB    db.SettingsDB
	treasuryDB    db.TreasuryDB
	budgetDB      db.BudgetDB

	// Auth
	authMiddleware auth.Middleware
	tokenVerifier  auth.TokenVerifier
	tokenIssuer    auth.JWTManager
}

type AuthPacket struct {
	AuthMiddleware auth.Middleware
	TokenVerifier  auth.TokenVerifier
	TokenIssuer    auth.JWTManager
}

func NewRouteHandler(conf *config.Config, dbPacket db.DatabasePacket, authPacket AuthPacket) *RouteHandler {
	return &RouteHandler{
		log:  conf.GetLogger(),
		conf: conf,

		adminActionDB: dbPacket.AdminActionDB,
		adminDB:       dbPacket.AdminDB,
		authDB:        dbPacket.AuthDB,
		expenseDB:     dbPacket.ExpenseDB,
		grantDB:       dbPacket.GrantDB,
		settingsDB:    dbPacket.SettingsDB,
		treasuryDB:    dbPacket.TreasuryDB,
		budgetDB:      dbPacket.BudgetDB,

		authMiddleware: authPacket.AuthMiddleware,
		tokenVerifier:  authPacket.TokenVerifier,
		tokenIssuer:    authPacket.TokenIssuer,
	}
}

func (rh *RouteHandler) ApplyRoutes(r *gin.Engine) {
	api := r.Group("/api/v1")

	// Auth routes (no auth middleware needed)
	api.GET("/auth/challenge/:address", rh.GenerateChallenge)
	api.POST("/auth/verify", rh.VerifyChallenge)
	api.POST("/auth/login", rh.VerifyChallenge)
	api.GET("/auth/check", rh.authMiddleware.Handle, rh.CheckAuth)
	api.GET("/health", func(c *gin.Context) { c.Status(200) })

	// Public routes (no auth middleware needed)
	api.GET("/grants", rh.GetGrants)
	api.GET("/grants/:id", rh.GetGrantByID)
	api.GET("/grants/:id/milestones", rh.GetGrantMilestones)
	api.GET("/grants/:id/disbursements", rh.GetGrantDisbursements)
	api.GET("/grants/:id/funds-usage", rh.GetGrantFundsUsage)
	api.GET("/treasury", rh.GetTreasury)
	api.GET("/treasury/assets", rh.GetTreasuryAssets)
	api.GET("/treasury/wallets", rh.GetTreasuryWallets)
	api.GET("/transfers", rh.GetTransfers)
	api.GET("/transfer-parties", rh.GetTransferParties)
	api.GET("/transfer-parties/:address", rh.GetTransferPartyByAddress)
	api.GET("/expenses", rh.GetExpenses)
	api.GET("/expenses/:id", rh.GetExpenseByID)
	api.GET("/expenses/:id/receipts", rh.GetExpenseReceipts)
	api.GET("/receipts/:id", rh.GetReceiptByID)
	api.GET("/budgets/allocations", rh.GetMonthlyBudgetAllocations)
	api.GET("/settings/organization-name", rh.GetOrganizationName)
	api.GET("/settings/total-funds-raised", rh.GetTotalFundsRaised)

	// Admin routes (require auth middleware)
	api.GET("/admins", rh.authMiddleware.Handle, rh.GetAdmins)
	api.POST("/admins", rh.authMiddleware.Handle, rh.AddAdmin)
	api.DELETE("/admins/:address", rh.authMiddleware.Handle, rh.RemoveAdmin)
	api.GET("/admin-actions", rh.authMiddleware.Handle, rh.GetAdminActions)

	// Admin-only content management routes (require auth middleware)
	api.POST("/grants", rh.authMiddleware.Handle, rh.CreateGrant)
	api.PUT("/grants/:id", rh.authMiddleware.Handle, rh.UpdateGrant)
	api.PUT("/grants/:id/milestones", rh.authMiddleware.Handle, rh.UpdateGrantMilestones)
	api.POST("/expenses", rh.authMiddleware.Handle, rh.CreateExpense)
	api.PUT("/expenses/:id", rh.authMiddleware.Handle, rh.UpdateExpense)
	api.DELETE("/expenses/:id", rh.authMiddleware.Handle, rh.DeleteExpense)
	api.POST("/expenses/:id/receipts", rh.authMiddleware.Handle, rh.UploadExpenseReceipt)
	api.DELETE("/receipts/:id", rh.authMiddleware.Handle, rh.DeleteReceipt)
	api.POST("/treasury/wallets", rh.authMiddleware.Handle, rh.AddWallet)
	api.DELETE("/treasury/wallets/:address", rh.authMiddleware.Handle, rh.DeleteWallet)
	api.POST("/transfers", rh.authMiddleware.Handle, rh.CreateTransfer)
	api.POST("/treasury/assets", rh.authMiddleware.Handle, rh.AddAsset)
	api.PUT("/transfer-parties/:address", rh.authMiddleware.Handle, rh.UpdateTransferPartyName)
	api.POST("/transfer-parties", rh.authMiddleware.Handle, rh.UpsertTransferParty)
	api.PUT("/settings/organization-name", rh.authMiddleware.Handle, rh.UpdateOrganizationName)
	api.POST("/settings/name", rh.authMiddleware.Handle, rh.UpdateOrganizationName)
	api.POST("/settings/total-funds-raised", rh.authMiddleware.Handle, rh.UpdateTotalFundsRaised)
	api.POST("/grants/:id/disbursements", rh.authMiddleware.Handle, rh.CreateDisbursement)
	api.PUT("/grants/:id/disbursements/:disbursementId", rh.authMiddleware.Handle, rh.UpdateDisbursement)
	api.POST("/grants/:id/funds-usage", rh.authMiddleware.Handle, rh.CreateGrantFundsUsage)
	api.PUT("/grants/:id/funds-usage/:usageId", rh.authMiddleware.Handle, rh.UpdateGrantFundsUsage)
	api.POST("/budgets/allocations", rh.authMiddleware.Handle, rh.CreateMonthlyBudgetAllocation)
	api.PUT("/budgets/allocations/:id", rh.authMiddleware.Handle, rh.UpdateMonthlyBudgetAllocation)
	api.DELETE("/budgets/allocations/:id", rh.authMiddleware.Handle, rh.DeleteMonthlyBudgetAllocation)
}
