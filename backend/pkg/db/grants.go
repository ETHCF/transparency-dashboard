package db

import (
	"context"
	"fmt"
	"strings"

	"github.com/numbergroup/errors"
	"github.com/google/uuid"
	"github.com/innodv/psql"
	"github.com/jmoiron/sqlx"
	"github.com/sirupsen/logrus"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/config"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/types"
)

type GrantDB interface {
	// Grant management methods
	GetGrants(ctx context.Context) ([]types.Grant, error)
	CreateGrant(ctx context.Context, grant types.CreateGrant) (uuid.UUID, error)
	GetGrantByID(ctx context.Context, id uuid.UUID) (*types.Grant, error)
	UpdateGrant(ctx context.Context, id uuid.UUID, updates types.UpdateGrantRequest) error
	GrantExists(ctx context.Context, id uuid.UUID) (bool, error)

	// Milestone management methods
	GetMilestonesByGrantID(ctx context.Context, grantID uuid.UUID) ([]types.Milestone, error)
	UpdateGrantMilestones(ctx context.Context, grantID uuid.UUID, milestones []types.Milestone) error

	// Disbursement management methods
	GetDisbursementsByGrantID(ctx context.Context, grantID uuid.UUID) ([]types.Disbursement, error)
	InsertDisbursement(ctx context.Context, grantID uuid.UUID, disbursement types.CreateDisbursement) error
	UpdateDisbursement(ctx context.Context, disbursementID uuid.UUID, updates types.Disbursement) error

	// Funds usage management methods
	GetFundsUsageByGrantID(ctx context.Context, grantID uuid.UUID) ([]types.FundsUsage, error)
	CreateFundsUsage(ctx context.Context, usage types.CreateFundsUsage) error
	UpdateFundsUsage(ctx context.Context, usageID uuid.UUID, updates types.UpdateFundsUsage) error
	DeleteFundsUsage(ctx context.Context, usageID uuid.UUID) error
}

type grant struct {
	log                       logrus.Ext1FieldLogger
	dbConn                    *sqlx.DB
	getGrants                 *sqlx.Stmt
	createGrant               *sqlx.NamedStmt
	getGrantByID              *sqlx.Stmt
	grantExists               *sqlx.Stmt
	getMilestonesByGrantID    *sqlx.Stmt
	getDisbursementsByGrantID *sqlx.Stmt
	insertDisbursement        *sqlx.NamedStmt
	updateDisbursement        *sqlx.NamedStmt
	getFundsUsageByGrantID    *sqlx.Stmt
	createFundsUsage          *sqlx.NamedStmt
	updateFundsUsage          *sqlx.NamedStmt
	deleteFundsUsage          *sqlx.Stmt
}

func NewGrantDB(ctx context.Context, conf *config.Config, dbConn *sqlx.DB) (GrantDB, error) {

	grantCols := psql.GetSQLColumnsQuoted[types.Grant]()
	milestoneCols := psql.GetSQLColumnsQuoted[types.Milestone]()
	disbursementCols := psql.GetSQLColumnsQuoted[types.Disbursement]()
	fundsUsageCols := psql.GetSQLColumnsQuoted[types.FundsUsage]()

	// Grant queries
	getGrants, err := dbConn.PreparexContext(ctx, fmt.Sprintf(`
		SELECT %s FROM grants ORDER BY created_at DESC`, strings.Join(grantCols, ", ")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare GetGrants statement")
	}

	createGrant, err := dbConn.PrepareNamedContext(ctx, fmt.Sprintf(`
		INSERT INTO grants (%s) VALUES (%s) RETURNING id`,
		strings.Join(psql.GetSQLColumnsQuoted[types.CreateGrant](), ", "), ":"+strings.Join(psql.GetSQLColumns[types.CreateGrant](), ", :")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare CreateGrant statement")
	}

	getGrantByID, err := dbConn.PreparexContext(ctx, fmt.Sprintf(`
		SELECT %s FROM grants WHERE id = $1`, strings.Join(grantCols, ", ")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare GetGrantByID statement")
	}

	grantExists, err := dbConn.PreparexContext(ctx, `SELECT EXISTS(SELECT 1 FROM grants WHERE id = $1)`)
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare GrantExists statement")
	}

	// Milestone queries
	getMilestonesByGrantID, err := dbConn.PreparexContext(ctx, fmt.Sprintf(`
		SELECT %s FROM milestones WHERE grant_id = $1 ORDER BY order_index ASC`, strings.Join(milestoneCols, ", ")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare GetMilestonesByGrantID statement")
	}

	// Disbursement queries
	getDisbursementsByGrantID, err := dbConn.PreparexContext(ctx, fmt.Sprintf(`
		SELECT %s FROM disbursements WHERE grant_id = $1`, strings.Join(disbursementCols, ", ")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare GetDisbursementsByGrantID statement")
	}

	insertDisbursement, err := dbConn.PrepareNamedContext(ctx, fmt.Sprintf(`
		INSERT INTO disbursements (%s) VALUES (%s) RETURNING id`,
		strings.Join(psql.GetSQLColumnsQuoted[types.CreateDisbursement](), ", "),
		":"+strings.Join(psql.GetSQLColumns[types.CreateDisbursement](), ", :")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare InsertDisbursement statement")
	}

	updateDisbursement, err := dbConn.PrepareNamedContext(ctx, `
		UPDATE disbursements
		SET grant_id = :grant_id, amount = :amount, tx_hash = :tx_hash,
			block_number = :block_number, block_timestamp = :block_timestamp
		WHERE id = :id`)
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare UpdateDisbursement statement")
	}

	// Funds usage queries
	getFundsUsageByGrantIDQuery := fmt.Sprintf(`
		SELECT %s FROM grant_funds_usage WHERE grant_id = $1`, strings.Join(fundsUsageCols, ", "))
	getFundsUsageByGrantID, err := dbConn.PreparexContext(ctx, getFundsUsageByGrantIDQuery)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to prepare GetFundsUsageByGrantID statement: %s", getFundsUsageByGrantIDQuery)
	}

	createFundsUsage, err := dbConn.PrepareNamedContext(ctx, fmt.Sprintf(`
		INSERT INTO grant_funds_usage (%s) VALUES (%s)`,
		strings.Join(psql.GetSQLColumnsQuoted[types.CreateFundsUsage](), ", "),
		":"+strings.Join(psql.GetSQLColumns[types.CreateFundsUsage](), ", :")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare CreateFundsUsage statement")
	}

	updateFundsUsage, err := dbConn.PrepareNamedContext(ctx, `
		UPDATE grant_funds_usage
		SET grant_id = :grant_id, item = :item, quantity = :quantity, price = :price,
			purpose = :purpose, category = :category, date = :date, tx_hash = :tx_hash
		WHERE id = :id`)
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare UpdateFundsUsage statement")
	}

	deleteFundsUsage, err := dbConn.PreparexContext(ctx, `DELETE FROM grant_funds_usage WHERE id = $1`)
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare DeleteFundsUsage statement")
	}

	return &grant{
		log:                       conf.GetLogger(),
		dbConn:                    dbConn,
		getGrants:                 getGrants,
		createGrant:               createGrant,
		getGrantByID:              getGrantByID,
		grantExists:               grantExists,
		getMilestonesByGrantID:    getMilestonesByGrantID,
		getDisbursementsByGrantID: getDisbursementsByGrantID,
		insertDisbursement:        insertDisbursement,
		updateDisbursement:        updateDisbursement,
		getFundsUsageByGrantID:    getFundsUsageByGrantID,
		createFundsUsage:          createFundsUsage,
		updateFundsUsage:          updateFundsUsage,
		deleteFundsUsage:          deleteFundsUsage,
	}, nil
}

// Grant methods
func (g *grant) GetGrants(ctx context.Context) ([]types.Grant, error) {
	var grants []types.Grant
	err := g.getGrants.SelectContext(ctx, &grants)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get grants")
	}
	if len(grants) == 0 {
		return []types.Grant{}, nil
	}
	for i := range grants {
		grants[i].AmountGivenSoFar = TrimZeros(grants[i].AmountGivenSoFar)
		grants[i].InitialGrantAmount = TrimZeros(grants[i].InitialGrantAmount)
		grants[i].TotalGrantAmount = TrimZeros(grants[i].TotalGrantAmount)
	}
	return grants, nil
}

func (g *grant) CreateGrant(ctx context.Context, grant types.CreateGrant) (uuid.UUID, error) {
	var id uuid.UUID
	err := g.createGrant.QueryRowxContext(ctx, grant).Scan(&id)
	if err != nil {
		return uuid.Nil, errors.Wrap(err, "failed to create grant")
	}
	return id, nil
}

func (g *grant) GetGrantByID(ctx context.Context, id uuid.UUID) (*types.Grant, error) {
	var grant types.Grant
	err := g.getGrantByID.GetContext(ctx, &grant, id)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get grant by ID")
	}
	grant.AmountGivenSoFar = TrimZeros(grant.AmountGivenSoFar)
	grant.InitialGrantAmount = TrimZeros(grant.InitialGrantAmount)
	grant.TotalGrantAmount = TrimZeros(grant.TotalGrantAmount)
	return &grant, nil
}

func (g *grant) UpdateGrant(ctx context.Context, id uuid.UUID, updates types.UpdateGrantRequest) error {
	setParts, args := updates.GetSQLUpdates(2)

	// If no fields to update, return early
	if len(setParts) == 0 {
		return nil
	}

	// Always update updated_at
	setParts = append(setParts, "updated_at = NOW()")

	// Add WHERE clause
	args = append([]any{id}, args...)
	query := fmt.Sprintf("UPDATE grants SET %s WHERE id = $1", strings.Join(setParts, ", "))

	result, err := g.dbConn.ExecContext(ctx, query, args...)
	if err != nil {
		return errors.Wrap(err, "failed to update grant")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return errors.Wrap(err, "failed to get rows affected")
	}

	if rowsAffected == 0 {
		return errors.New("grant not found")
	}

	return nil
}

func (g *grant) GrantExists(ctx context.Context, id uuid.UUID) (bool, error) {
	var exists bool
	err := g.grantExists.GetContext(ctx, &exists, id)
	if err != nil {
		return false, errors.Wrap(err, "failed to check if grant exists")
	}
	return exists, nil
}

// Milestone methods
func (g *grant) GetMilestonesByGrantID(ctx context.Context, grantID uuid.UUID) ([]types.Milestone, error) {
	var milestones []types.Milestone
	err := g.getMilestonesByGrantID.SelectContext(ctx, &milestones, grantID)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get milestones by grant ID")
	}
	if len(milestones) == 0 {
		return []types.Milestone{}, nil
	}
	return milestones, nil
}

func (g *grant) UpdateGrantMilestones(ctx context.Context, grantID uuid.UUID, milestones []types.Milestone) error {
	// Start transaction
	tx, err := g.dbConn.BeginTxx(ctx, nil)
	if err != nil {
		return errors.Wrap(err, "failed to begin transaction")
	}
	defer tx.Rollback()

	// Delete existing milestones
	_, err = tx.ExecContext(ctx, "DELETE FROM milestones WHERE grant_id = $1", grantID)
	if err != nil {
		return errors.Wrap(err, "failed to delete existing milestones")
	}

	// Insert new milestones
	milestoneCols := psql.GetSQLColumnsQuoted[types.Milestone]()
	milestoneColsNoQuote := psql.GetSQLColumns[types.Milestone]()
	for i, milestone := range milestones {
		milestone.GrantID = grantID
		milestone.OrderIndex = i
		_, err = tx.NamedExecContext(ctx, fmt.Sprintf(`
			INSERT INTO milestones (%s) VALUES (%s)`,
			strings.Join(milestoneCols, ", "),
			":"+strings.Join(milestoneColsNoQuote, ", :")), milestone)
		if err != nil {
			return errors.Wrap(err, "failed to insert milestone")
		}
	}

	// Commit transaction
	err = tx.Commit()
	if err != nil {
		return errors.Wrap(err, "failed to commit transaction")
	}

	return nil
}

// Disbursement methods
func (g *grant) GetDisbursementsByGrantID(ctx context.Context, grantID uuid.UUID) ([]types.Disbursement, error) {
	var disbursements []types.Disbursement
	err := g.getDisbursementsByGrantID.SelectContext(ctx, &disbursements, grantID)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get disbursements by grant ID")
	}
	for i := range disbursements {
		disbursements[i].Amount = TrimZeros(disbursements[i].Amount)
	}
	if len(disbursements) == 0 {
		return []types.Disbursement{}, nil
	}
	return disbursements, nil
}

func (g *grant) InsertDisbursement(ctx context.Context, grantID uuid.UUID, disbursement types.CreateDisbursement) error {
	disbursement.GrantID = grantID
	var id uuid.UUID
	err := g.insertDisbursement.QueryRowxContext(ctx, disbursement).Scan(&id)
	if err != nil {
		return errors.Wrap(err, "failed to insert disbursement")
	}
	result, err := g.dbConn.ExecContext(ctx, "UPDATE grants SET amount_given_so_far = (SELECT SUM(amount) FROM disbursements WHERE grant_id = $1) WHERE id = $1", grantID)
	if err != nil {
		return errors.Wrap(err, "failed to update grant amount")
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return errors.Wrap(err, "failed to get rows affected")
	}
	if rowsAffected == 0 {
		return errors.New("grant not found when updating amount")
	}
	return nil
}

func (g *grant) UpdateDisbursement(ctx context.Context, disbursementID uuid.UUID, updates types.Disbursement) error {
	updates.ID = disbursementID
	result, err := g.updateDisbursement.ExecContext(ctx, updates)
	if err != nil {
		return errors.Wrap(err, "failed to update disbursement")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return errors.Wrap(err, "failed to get rows affected")
	}

	if rowsAffected == 0 {
		return errors.New("disbursement not found")
	}

	result, err = g.dbConn.ExecContext(ctx, "UPDATE grants SET amount_given_so_far = (SELECT SUM(amount) FROM disbursements WHERE grant_id = $1) WHERE id = $1", updates.GrantID)
	if err != nil {
		return errors.Wrap(err, "failed to update grant amount")
	}
	rowsAffected, err = result.RowsAffected()
	if err != nil {
		return errors.Wrap(err, "failed to get rows affected")
	}
	if rowsAffected == 0 {
		return errors.New("grant not found when updating amount")
	}

	return nil
}

// Funds usage methods
func (g *grant) GetFundsUsageByGrantID(ctx context.Context, grantID uuid.UUID) ([]types.FundsUsage, error) {
	var fundsUsage []types.FundsUsage
	err := g.getFundsUsageByGrantID.SelectContext(ctx, &fundsUsage, grantID)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get funds usage by grant ID")
	}
	return fundsUsage, nil
}

func (g *grant) CreateFundsUsage(ctx context.Context, usage types.CreateFundsUsage) error {
	_, err := g.createFundsUsage.ExecContext(ctx, usage)
	if err != nil {
		return errors.Wrap(err, "failed to create funds usage")
	}
	return nil
}

func (g *grant) UpdateFundsUsage(ctx context.Context, usageID uuid.UUID, updates types.UpdateFundsUsage) error {
	type updateFundsUsageWithID struct {
		ID uuid.UUID `db:"id"`
		types.UpdateFundsUsage
	}

	updateData := updateFundsUsageWithID{
		ID:               usageID,
		UpdateFundsUsage: updates,
	}

	result, err := g.updateFundsUsage.ExecContext(ctx, updateData)
	if err != nil {
		return errors.Wrap(err, "failed to update funds usage")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return errors.Wrap(err, "failed to get rows affected")
	}

	if rowsAffected == 0 {
		return errors.New("funds usage not found")
	}

	return nil
}

func (g *grant) DeleteFundsUsage(ctx context.Context, usageID uuid.UUID) error {
	result, err := g.deleteFundsUsage.ExecContext(ctx, usageID)
	if err != nil {
		return errors.Wrap(err, "failed to delete funds usage")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return errors.Wrap(err, "failed to get rows affected")
	}

	if rowsAffected == 0 {
		return errors.New("funds usage not found")
	}

	return nil
}
