package constants

const (
	// Expense actions
	ActionCreateExpense = "create_expense"
	ActionUpdateExpense = "update_expense"
	ActionDeleteExpense = "delete_expense"

	// Receipt actions
	ActionUploadReceipt = "upload_receipt"
	ActionDeleteReceipt = "delete_receipt"

	// Grant actions
	ActionCreateGrant      = "create_grant"
	ActionUpdateGrant      = "update_grant"
	ActionUpdateMilestones = "update_milestones"

	// Admin actions
	ActionAddAdmin    = "add_admin"
	ActionRemoveAdmin = "remove_admin"

	// Transfer party actions
	ActionUpdateTransferParty = "update_transfer_party"
)

const (
	// Resource types
	ResourceTypeExpense       = "expense"
	ResourceTypeReceipt       = "receipt"
	ResourceTypeGrant         = "grant"
	ResourceTypeAdmin         = "admin"
	ResourceTypeTransferParty = "transfer_party"
)
