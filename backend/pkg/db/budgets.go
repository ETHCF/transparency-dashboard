package db

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/innodv/psql"
	"github.com/jmoiron/sqlx"
	"github.com/numbergroup/errors"
	"github.com/sirupsen/logrus"
	"gopkg.in/guregu/null.v4"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/config"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/types"
)

type BudgetDB interface {
	GetMonthlyBudgets(ctx context.Context, from time.Time, to null.Time) ([]types.MonthlyBudget, error)
	GetMonthlyBudgetAllocations(ctx context.Context) ([]types.MonthlyBudgetAllocation, error)

	UpdateMonthlyBudget(ctx context.Context, id uuid.UUID, budget types.MonthlyBudget) error
	UpdateMonthlyBudgetAllocation(ctx context.Context, id uuid.UUID, allocation types.MonthlyBudgetAllocation) error

	CreateMonthlyBudget(ctx context.Context, budget types.CreateMonthlyBudget) (uuid.UUID, error)
	CreateMonthlyBudgetAllocation(ctx context.Context, allocation types.CreateMonthlyBudgetAllocation) (uuid.UUID, error)

	DeleteMonthlyBudget(ctx context.Context, id uuid.UUID) error
	DeleteMonthlyBudgetAllocation(ctx context.Context, id uuid.UUID) error
}

type budget struct {
	log                           logrus.Ext1FieldLogger
	dbConn                        *sqlx.DB
	getMonthlyBudgets             *sqlx.Stmt
	getMonthlyBudgetAllocations   *sqlx.Stmt
	updateMonthlyBudget           *sqlx.NamedStmt
	updateMonthlyBudgetAllocation *sqlx.NamedStmt
	createMonthlyBudget           *sqlx.NamedStmt
	createMonthlyBudgetAllocation *sqlx.NamedStmt
	deleteMonthlyBudget           *sqlx.Stmt
	deleteMonthlyBudgetAllocation *sqlx.Stmt
}

func NewBudgetDB(ctx context.Context, conf *config.Config, dbConn *sqlx.DB) (BudgetDB, error) {
	monthlyBudgetCols := psql.GetSQLColumnsQuoted[types.MonthlyBudget]()
	monthlyBudgetAllocationCols := psql.GetSQLColumnsQuoted[types.MonthlyBudgetAllocation]()

	// Monthly budget queries
	getMonthlyBudgets, err := dbConn.PreparexContext(ctx, fmt.Sprintf(`
		SELECT %s FROM monthly_budgets
		WHERE month >= $1 AND ($2::DATE IS NULL OR month <= $2)
		ORDER BY month DESC, category ASC`, strings.Join(monthlyBudgetCols, ", ")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare GetMonthlyBudgets statement")
	}

	getMonthlyBudgetAllocations, err := dbConn.PreparexContext(ctx, fmt.Sprintf(`
		SELECT %s FROM monthly_budget_allocations
		ORDER BY category ASC`, strings.Join(monthlyBudgetAllocationCols, ", ")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare GetMonthlyBudgetAllocations statement")
	}

	updateMonthlyBudget, err := dbConn.PrepareNamedContext(ctx, `
		UPDATE monthly_budgets
		SET category = :category, month = :month, amount = :amount, updated_at = NOW()
		WHERE id = :id`)
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare UpdateMonthlyBudget statement")
	}

	updateMonthlyBudgetAllocation, err := dbConn.PrepareNamedContext(ctx, `
		UPDATE monthly_budget_allocations
		SET manager = :manager, category = :category, amount = :amount, updated_at = NOW()
		WHERE id = :id`)
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare UpdateMonthlyBudgetAllocation statement")
	}

	createMonthlyBudget, err := dbConn.PrepareNamedContext(ctx, fmt.Sprintf(`
		INSERT INTO monthly_budgets (%s) VALUES (%s) RETURNING id`,
		strings.Join(psql.GetSQLColumnsQuoted[types.CreateMonthlyBudget](), ", "),
		":"+strings.Join(psql.GetSQLColumns[types.CreateMonthlyBudget](), ", :")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare CreateMonthlyBudget statement")
	}

	createMonthlyBudgetAllocation, err := dbConn.PrepareNamedContext(ctx, fmt.Sprintf(`
		INSERT INTO monthly_budget_allocations (%s) VALUES (%s) RETURNING id`,
		strings.Join(psql.GetSQLColumnsQuoted[types.CreateMonthlyBudgetAllocation](), ", "),
		":"+strings.Join(psql.GetSQLColumns[types.CreateMonthlyBudgetAllocation](), ", :")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare CreateMonthlyBudgetAllocation statement")
	}

	deleteMonthlyBudget, err := dbConn.PreparexContext(ctx, `DELETE FROM monthly_budgets WHERE id = $1`)
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare DeleteMonthlyBudget statement")
	}

	deleteMonthlyBudgetAllocation, err := dbConn.PreparexContext(ctx, `DELETE FROM monthly_budget_allocations WHERE id = $1`)
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare DeleteMonthlyBudgetAllocation statement")
	}

	return &budget{
		log:                           conf.GetLogger(),
		dbConn:                        dbConn,
		getMonthlyBudgets:             getMonthlyBudgets,
		getMonthlyBudgetAllocations:   getMonthlyBudgetAllocations,
		updateMonthlyBudget:           updateMonthlyBudget,
		updateMonthlyBudgetAllocation: updateMonthlyBudgetAllocation,
		createMonthlyBudget:           createMonthlyBudget,
		createMonthlyBudgetAllocation: createMonthlyBudgetAllocation,
		deleteMonthlyBudget:           deleteMonthlyBudget,
		deleteMonthlyBudgetAllocation: deleteMonthlyBudgetAllocation,
	}, nil
}

// Monthly budget methods
func (b *budget) GetMonthlyBudgets(ctx context.Context, from time.Time, to null.Time) ([]types.MonthlyBudget, error) {
	var budgets []types.MonthlyBudget
	err := b.getMonthlyBudgets.SelectContext(ctx, &budgets, from, to)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get monthly budgets")
	}
	if len(budgets) == 0 {
		return []types.MonthlyBudget{}, nil
	}
	return budgets, nil
}

func (b *budget) GetMonthlyBudgetAllocations(ctx context.Context) ([]types.MonthlyBudgetAllocation, error) {
	var allocations []types.MonthlyBudgetAllocation
	err := b.getMonthlyBudgetAllocations.SelectContext(ctx, &allocations)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get monthly budget allocations")
	}
	if len(allocations) == 0 {
		return []types.MonthlyBudgetAllocation{}, nil
	}
	return allocations, nil
}

func (b *budget) UpdateMonthlyBudget(ctx context.Context, id uuid.UUID, budget types.MonthlyBudget) error {
	budget.ID = id
	result, err := b.updateMonthlyBudget.ExecContext(ctx, budget)
	if err != nil {
		return errors.Wrap(err, "failed to update monthly budget")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return errors.Wrap(err, "failed to get rows affected")
	}

	if rowsAffected == 0 {
		return errors.New("monthly budget not found")
	}

	return nil
}

func (b *budget) UpdateMonthlyBudgetAllocation(ctx context.Context, id uuid.UUID, allocation types.MonthlyBudgetAllocation) error {
	allocation.ID = id
	result, err := b.updateMonthlyBudgetAllocation.ExecContext(ctx, allocation)
	if err != nil {
		return errors.Wrap(err, "failed to update monthly budget allocation")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return errors.Wrap(err, "failed to get rows affected")
	}

	if rowsAffected == 0 {
		return errors.New("monthly budget allocation not found")
	}

	return nil
}

func (b *budget) CreateMonthlyBudget(ctx context.Context, budget types.CreateMonthlyBudget) (uuid.UUID, error) {
	var id uuid.UUID
	err := b.createMonthlyBudget.QueryRowxContext(ctx, budget).Scan(&id)
	if err != nil {
		return uuid.Nil, errors.Wrap(err, "failed to create monthly budget")
	}
	return id, nil
}

func (b *budget) CreateMonthlyBudgetAllocation(ctx context.Context, allocation types.CreateMonthlyBudgetAllocation) (uuid.UUID, error) {
	var id uuid.UUID
	err := b.createMonthlyBudgetAllocation.QueryRowxContext(ctx, allocation).Scan(&id)
	if err != nil {
		return uuid.Nil, errors.Wrap(err, "failed to create monthly budget allocation")
	}
	return id, nil
}

func (b *budget) DeleteMonthlyBudget(ctx context.Context, id uuid.UUID) error {
	result, err := b.deleteMonthlyBudget.ExecContext(ctx, id)
	if err != nil {
		return errors.Wrapf(err, "failed to delete monthly budget (%s)", id)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return errors.Wrap(err, "failed to get rows affected")
	}

	if rowsAffected == 0 {
		return errors.Errorf("monthly budget %s not found", id)
	}

	return nil
}

func (b *budget) DeleteMonthlyBudgetAllocation(ctx context.Context, id uuid.UUID) error {
	result, err := b.deleteMonthlyBudgetAllocation.ExecContext(ctx, id)
	if err != nil {
		return errors.Wrapf(err, "failed to delete monthly budget allocation (%s)", id)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return errors.Wrap(err, "failed to get rows affected")
	}

	if rowsAffected == 0 {
		return errors.Errorf("monthly budget allocation %s not found", id)
	}

	return nil
}
