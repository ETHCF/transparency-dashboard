package db

import (
	"context"
	"fmt"
	"strings"

	"github.com/cockroachdb/errors"
	"github.com/google/uuid"
	"github.com/innodv/psql"
	"github.com/jmoiron/sqlx"
	"github.com/sirupsen/logrus"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/config"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/types"
)

type ExpenseDB interface {
	// Expense management methods
	GetExpenses(ctx context.Context, limit, offset int) ([]types.Expense, error)
	CreateExpense(ctx context.Context, expense types.Expense) error
	GetExpenseByID(ctx context.Context, id uuid.UUID) (*types.Expense, error)
	UpdateExpense(ctx context.Context, id uuid.UUID, updates types.UpdateExpenseRequest) error
	DeleteExpense(ctx context.Context, id uuid.UUID) error
	ExpenseExists(ctx context.Context, id uuid.UUID) (bool, error)

	// Receipt management methods
	CreateReceipt(ctx context.Context, receipt types.Receipt) error
	GetReceiptsByExpenseID(ctx context.Context, expenseID uuid.UUID) ([]types.Receipt, error)
	GetReceiptByID(ctx context.Context, receiptID uuid.UUID) (*types.Receipt, error)
	DeleteReceipt(ctx context.Context, receiptID uuid.UUID) error
	ReceiptExists(ctx context.Context, receiptID uuid.UUID) (bool, error)
}

type expense struct {
	log                    logrus.Ext1FieldLogger
	dbConn                 *sqlx.DB
	getExpenses            *sqlx.Stmt
	createExpense          *sqlx.NamedStmt
	getExpenseByID         *sqlx.Stmt
	deleteExpense          *sqlx.Stmt
	expenseExists          *sqlx.Stmt
	createReceipt          *sqlx.NamedStmt
	getReceiptsByExpenseID *sqlx.Stmt
	getReceiptByID         *sqlx.Stmt
	deleteReceipt          *sqlx.Stmt
	receiptExists          *sqlx.Stmt
}

func NewExpenseDB(ctx context.Context, conf *config.Config, dbConn *sqlx.DB) (ExpenseDB, error) {

	expenseCols := psql.GetSQLColumnsQuoted[types.Expense]()
	expenseColsNoQuote := psql.GetSQLColumns[types.Expense]()
	receiptCols := psql.GetSQLColumnsQuoted[types.Receipt]()
	receiptColsNoQuote := psql.GetSQLColumns[types.Receipt]()

	// Expense queries
	getExpenses, err := dbConn.PreparexContext(ctx, fmt.Sprintf(`
		SELECT %s FROM expenses
		ORDER BY date DESC
		LIMIT $1 OFFSET $2`, strings.Join(expenseCols, ", ")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare GetExpenses statement")
	}

	createExpense, err := dbConn.PrepareNamedContext(ctx, fmt.Sprintf(`
		INSERT INTO expenses (%s) VALUES (%s)`,
		strings.Join(expenseCols, ", "), ":"+strings.Join(expenseColsNoQuote, ", :")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare CreateExpense statement")
	}

	getExpenseByID, err := dbConn.PreparexContext(ctx, fmt.Sprintf(`
		SELECT %s FROM expenses WHERE id = $1`, strings.Join(expenseCols, ", ")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare GetExpenseByID statement")
	}

	deleteExpense, err := dbConn.PreparexContext(ctx, `DELETE FROM expenses WHERE id = $1`)
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare DeleteExpense statement")
	}

	expenseExists, err := dbConn.PreparexContext(ctx, `SELECT EXISTS(SELECT 1 FROM expenses WHERE id = $1)`)
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare ExpenseExists statement")
	}

	// Receipt queries
	createReceipt, err := dbConn.PrepareNamedContext(ctx, fmt.Sprintf(`
		INSERT INTO receipts (%s) VALUES (%s)`,
		strings.Join(receiptCols, ", "), ":"+strings.Join(receiptColsNoQuote, ", :")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare CreateReceipt statement")
	}

	getReceiptsByExpenseID, err := dbConn.PreparexContext(ctx, fmt.Sprintf(`
		SELECT %s FROM receipts WHERE expense_id = $1 ORDER BY created_at`, strings.Join(receiptCols, ", ")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare GetReceiptsByExpenseID statement")
	}

	getReceiptByID, err := dbConn.PreparexContext(ctx, fmt.Sprintf(`
		SELECT %s FROM receipts WHERE id = $1`, strings.Join(receiptCols, ", ")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare GetReceiptByID statement")
	}

	deleteReceipt, err := dbConn.PreparexContext(ctx, `DELETE FROM receipts WHERE id = $1`)
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare DeleteReceipt statement")
	}

	receiptExists, err := dbConn.PreparexContext(ctx, `SELECT EXISTS(SELECT 1 FROM receipts WHERE id = $1)`)
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare ReceiptExists statement")
	}

	return &expense{
		log:                    conf.GetLogger(),
		dbConn:                 dbConn,
		getExpenses:            getExpenses,
		createExpense:          createExpense,
		getExpenseByID:         getExpenseByID,
		deleteExpense:          deleteExpense,
		expenseExists:          expenseExists,
		createReceipt:          createReceipt,
		getReceiptsByExpenseID: getReceiptsByExpenseID,
		getReceiptByID:         getReceiptByID,
		deleteReceipt:          deleteReceipt,
		receiptExists:          receiptExists,
	}, nil
}

// Expense methods
func (e *expense) GetExpenses(ctx context.Context, limit, offset int) ([]types.Expense, error) {
	var expenses []types.Expense
	err := e.getExpenses.SelectContext(ctx, &expenses, limit, offset)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get expenses")
	}
	if len(expenses) == 0 {
		return []types.Expense{}, nil
	}
	return expenses, nil
}

func (e *expense) CreateExpense(ctx context.Context, expense types.Expense) error {
	_, err := e.createExpense.ExecContext(ctx, expense)
	if err != nil {
		return errors.Wrap(err, "failed to create expense")
	}
	return nil
}

func (e *expense) GetExpenseByID(ctx context.Context, id uuid.UUID) (*types.Expense, error) {
	var expense types.Expense
	err := e.getExpenseByID.GetContext(ctx, &expense, id)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get expense by ID")
	}
	return &expense, nil
}

func (e *expense) UpdateExpense(ctx context.Context, id uuid.UUID, updates types.UpdateExpenseRequest) error {
	// Build dynamic query based on which fields are not null

	setParts, args := updates.GetSQLUpdates(2)

	// If no fields to update, return early
	if len(setParts) == 0 {
		return nil
	}

	// Always update updated_at
	setParts = append(setParts, "updated_at = NOW()")

	// Add WHERE clause
	args = append([]any{id}, args...)
	query := fmt.Sprintf("UPDATE expenses SET %s WHERE id = $1", strings.Join(setParts, ", "))

	result, err := e.dbConn.ExecContext(ctx, query, args...)
	if err != nil {
		return errors.Wrap(err, "failed to update expense")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return errors.Wrap(err, "failed to get rows affected")
	}

	if rowsAffected == 0 {
		return errors.New("expense not found")
	}

	return nil
}

func (e *expense) DeleteExpense(ctx context.Context, id uuid.UUID) error {
	result, err := e.deleteExpense.ExecContext(ctx, id)
	if err != nil {
		return errors.Wrapf(err, "failed to delete expense (%s)", id)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return errors.Wrap(err, "failed to get rows affected")
	}

	if rowsAffected == 0 {
		return errors.Errorf("expense %s not found", id)
	}

	return nil
}

func (e *expense) ExpenseExists(ctx context.Context, id uuid.UUID) (bool, error) {
	var exists bool
	err := e.expenseExists.GetContext(ctx, &exists, id)
	if err != nil {
		return false, errors.Wrap(err, "failed to check if expense exists")
	}
	return exists, nil
}

// Receipt methods
func (e *expense) CreateReceipt(ctx context.Context, receipt types.Receipt) error {
	_, err := e.createReceipt.ExecContext(ctx, receipt)
	if err != nil {
		return errors.Wrap(err, "failed to create receipt")
	}
	return nil
}

func (e *expense) GetReceiptsByExpenseID(ctx context.Context, expenseID uuid.UUID) ([]types.Receipt, error) {
	var receipts []types.Receipt
	err := e.getReceiptsByExpenseID.SelectContext(ctx, &receipts, expenseID)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to get receipts by expense ID (%s)", expenseID)
	}
	return receipts, nil
}

func (e *expense) GetReceiptByID(ctx context.Context, receiptID uuid.UUID) (*types.Receipt, error) {
	var receipt types.Receipt
	err := e.getReceiptByID.GetContext(ctx, &receipt, receiptID)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to get receipt by ID (%s)", receiptID)
	}
	return &receipt, nil
}

func (e *expense) DeleteReceipt(ctx context.Context, receiptID uuid.UUID) error {
	result, err := e.deleteReceipt.ExecContext(ctx, receiptID)
	if err != nil {
		return errors.Wrapf(err, "failed to delete receipt (%s)", receiptID)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return errors.Wrap(err, "failed to get rows affected")
	}

	if rowsAffected == 0 {
		return errors.New("receipt not found")
	}

	return nil
}

func (e *expense) ReceiptExists(ctx context.Context, receiptID uuid.UUID) (bool, error) {
	var exists bool
	err := e.receiptExists.GetContext(ctx, &exists, receiptID)
	if err != nil {
		return false, errors.Wrap(err, "failed to check if receipt exists")
	}
	return exists, nil
}
