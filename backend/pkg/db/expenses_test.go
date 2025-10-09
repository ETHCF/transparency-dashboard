//go:build integration
// +build integration

package db

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/ETHCF/ethutils"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gopkg.in/guregu/null.v4"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/types"
)

func GetTestExpenseDB(t *testing.T) ExpenseDB {
	edb, err := NewExpenseDB(context.Background(), conf, dbConn)
	require.NoError(t, err)
	_, err = dbConn.ExecContext(t.Context(), "INSERT INTO categories (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING", "test", "Test category")
	require.NoError(t, err)
	return edb
}

func Test_ExpenseDB_CreateAndGetExpenses(t *testing.T) {
	var (
		db      = GetTestExpenseDB(t)
		expense = types.Expense{
			ID:        uuid.New(),
			Item:      "Test Item",
			Quantity:  5,
			Price:     "100.50",
			Purpose:   null.StringFrom("Testing purposes"),
			Category:  "test",
			Date:      time.Now(),
			TxHash:    null.StringFrom(ethutils.GenRandEVMHash()),
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
	)

	// Create expense
	err := db.CreateExpense(t.Context(), expense)
	require.NoError(t, err)

	// Get all expenses
	expenses, err := db.GetExpenses(t.Context(), 10, 0)
	require.NoError(t, err)
	require.NotEmpty(t, expenses)

	// Check if our test expense is in the results
	var found bool
	for _, r := range expenses {
		if r.ID == expense.ID {
			found = true
			break
		}
	}
	require.True(t, found, "created expense not found in retrieved expenses")

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM expenses WHERE id = $1", expense.ID)
	require.NoError(t, err)
}

func Test_ExpenseDB_CreateExpenseNullTxHash(t *testing.T) {
	var (
		db      = GetTestExpenseDB(t)
		expense = types.Expense{
			ID:        uuid.New(),
			Item:      "Test Item 2",
			Quantity:  5,
			Price:     "100.50",
			Purpose:   null.StringFrom("Testing purposes"),
			Category:  "test",
			Date:      time.Now(),
			TxHash:    null.String{},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
	)

	// Create expense
	err := db.CreateExpense(t.Context(), expense)
	require.NoError(t, err)

	result, err := db.GetExpenseByID(t.Context(), expense.ID)
	require.NoError(t, err)
	require.NotNil(t, result)
	require.Equal(t, expense.ID, result.ID)

	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM expenses WHERE id = $1", expense.ID)
	require.NoError(t, err)
}

func Test_ExpenseDB_GetExpenseByID(t *testing.T) {
	var (
		db      = GetTestExpenseDB(t)
		expense = types.Expense{
			ID:        uuid.New(),
			Item:      "Test Item Get By ID",
			Quantity:  3,
			Price:     "75.25",
			Purpose:   null.StringFrom("Testing get by ID"),
			Category:  "test",
			Date:      time.Now(),
			TxHash:    null.StringFrom(ethutils.GenRandEVMHash()),
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
	)

	// Create expense
	err := db.CreateExpense(t.Context(), expense)
	require.NoError(t, err)

	// Get expense by ID
	retrieved, err := db.GetExpenseByID(t.Context(), expense.ID)
	require.NoError(t, err)
	require.NotNil(t, retrieved)
	require.Equal(t, expense.ID, retrieved.ID)
	require.Equal(t, expense.Item, retrieved.Item)

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM expenses WHERE id = $1", expense.ID)
	require.NoError(t, err)
}

func Test_ExpenseDB_UpdateExpense(t *testing.T) {
	var (
		db      = GetTestExpenseDB(t)
		expense = types.Expense{
			ID:        uuid.New(),
			Item:      "Test Item Update",
			Quantity:  2,
			Price:     "50.00",
			Purpose:   null.StringFrom("Testing update"),
			Category:  "test",
			Date:      time.Now(),
			TxHash:    null.StringFrom(ethutils.GenRandEVMHash()),
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
	)

	// Create expense
	err := db.CreateExpense(t.Context(), expense)
	require.NoError(t, err)

	// Update expense
	updates := types.UpdateExpenseRequest{
		Item:     null.StringFrom("Updated Test Item"),
		Quantity: null.IntFrom(10),
		Price:    null.StringFrom("200.00"),
	}

	err = db.UpdateExpense(t.Context(), expense.ID, updates)
	require.NoError(t, err)

	// Verify updates
	retrieved, err := db.GetExpenseByID(t.Context(), expense.ID)
	require.NoError(t, err)
	require.Equal(t, "Updated Test Item", retrieved.Item)
	require.Equal(t, 10, retrieved.Quantity)
	require.Equal(t, "200.00", retrieved.Price)

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM expenses WHERE id = $1", expense.ID)
	require.NoError(t, err)
}

func Test_ExpenseDB_ExpenseExists(t *testing.T) {
	var (
		db      = GetTestExpenseDB(t)
		expense = types.Expense{
			ID:        uuid.New(),
			Item:      "Test Item Exists",
			Quantity:  1,
			Price:     "25.00",
			Purpose:   null.StringFrom("Testing exists"),
			Category:  "test",
			Date:      time.Now(),
			TxHash:    null.StringFrom(ethutils.GenRandEVMHash()),
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
	)

	// Check expense doesn't exist yet
	exists, err := db.ExpenseExists(t.Context(), expense.ID)
	require.NoError(t, err)
	require.False(t, exists)

	// Create expense
	err = db.CreateExpense(t.Context(), expense)
	require.NoError(t, err)

	// Check expense now exists
	exists, err = db.ExpenseExists(t.Context(), expense.ID)
	require.NoError(t, err)
	require.True(t, exists)

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM expenses WHERE id = $1", expense.ID)
	require.NoError(t, err)
}

func Test_ExpenseDB_DeleteExpense(t *testing.T) {
	var (
		db      = GetTestExpenseDB(t)
		expense = types.Expense{
			ID:        uuid.New(),
			Item:      "Test Item Delete",
			Quantity:  1,
			Price:     "15.00",
			Purpose:   null.StringFrom("Testing delete"),
			Category:  "test",
			Date:      time.Now(),
			TxHash:    null.StringFrom(ethutils.GenRandEVMHash()),
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
	)

	// Create expense
	err := db.CreateExpense(t.Context(), expense)
	require.NoError(t, err)

	// Verify expense exists
	exists, err := db.ExpenseExists(t.Context(), expense.ID)
	require.NoError(t, err)
	require.True(t, exists)

	// Delete expense
	err = db.DeleteExpense(t.Context(), expense.ID)
	require.NoError(t, err)

	// Verify expense no longer exists
	exists, err = db.ExpenseExists(t.Context(), expense.ID)
	require.NoError(t, err)
	require.False(t, exists)

	// Try to delete non-existent expense
	err = db.DeleteExpense(t.Context(), expense.ID)
	require.Error(t, err)
	require.Contains(t, err.Error(), fmt.Sprintf("expense %s not found", expense.ID))
}

func Test_ExpenseDB_ReceiptOperations(t *testing.T) {
	var (
		db        = GetTestExpenseDB(t)
		expenseID = uuid.New()
		expense   = types.Expense{
			ID:        expenseID,
			Item:      "Test Item Delete",
			Quantity:  1,
			Price:     "15.00",
			Purpose:   null.StringFrom("Testing delete"),
			Category:  "test",
			Date:      time.Now(),
			TxHash:    null.StringFrom(ethutils.GenRandEVMHash()),
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		receipt = types.Receipt{
			ID:        uuid.New(),
			ExpenseID: expenseID,
			Name:      "Test Receipt",
			FileName:  null.StringFrom("test_receipt.pdf"),
			FileSize:  1024,
			MimeType:  null.StringFrom("application/pdf"),
			StorageID: "bar",
			CreatedAt: time.Now(),
		}
	)
	// Create expense
	err := db.CreateExpense(t.Context(), expense)
	require.NoError(t, err)

	// Create receipt
	err = db.CreateReceipt(t.Context(), receipt)
	require.NoError(t, err)

	// Get receipts by expense ID
	receipts, err := db.GetReceiptsByExpenseID(t.Context(), expenseID)
	require.NoError(t, err)
	var found bool
	for _, r := range receipts {
		if r.ID == receipt.ID {
			found = true
			break
		}
	}
	require.True(t, found, "created receipt not found in retrieved receipts")

	// Get receipt by ID
	retrieved, err := db.GetReceiptByID(t.Context(), receipt.ID)
	require.NoError(t, err)
	require.Equal(t, receipt.ID, retrieved.ID)
	require.Equal(t, receipt.Name, retrieved.Name)

	// Check receipt exists
	exists, err := db.ReceiptExists(t.Context(), receipt.ID)
	require.NoError(t, err)
	require.True(t, exists)

	// Delete receipt
	err = db.DeleteReceipt(t.Context(), receipt.ID)
	require.NoError(t, err)

	// Verify receipt no longer exists
	exists, err = db.ReceiptExists(t.Context(), receipt.ID)
	require.NoError(t, err)
	require.False(t, exists)

	err = db.DeleteExpense(t.Context(), expense.ID)
	require.NoError(t, err)
}
