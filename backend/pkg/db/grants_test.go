//go:build integration
// +build integration

package db

import (
	"context"
	"testing"
	"time"

	"github.com/ETHCF/ethutils"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gopkg.in/guregu/null.v4"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/types"
)

func GetTestGrantDB(t *testing.T) GrantDB {
	gdb, err := NewGrantDB(context.Background(), conf, dbConn)
	require.NoError(t, err)
	return gdb
}

func Test_GrantDB_CreateAndGetGrants(t *testing.T) {
	var (
		db    = GetTestGrantDB(t)
		grant = types.CreateGrant{
			Name:                   "Test Grant",
			RecipientName:          "Test Recipient",
			RecipientAddress:       ethutils.GenRandEVMAddr(),
			Description:            "Testing grant creation",
			TeamURL:                null.StringFrom("https://example.com/team"),
			ProjectURL:             null.StringFrom("https://example.com/project"),
			TotalGrantAmount:       "10000",
			InitialGrantAmount:     "5000",
			StartDate:              time.Now(),
			ExpectedCompletionDate: time.Now().AddDate(1, 0, 0),
			AmountGivenSoFar:       "0",
			Status:                 types.GrantStatusActive,
		}
	)

	// Create grant
	grantID, err := db.CreateGrant(t.Context(), grant)
	require.NoError(t, err)

	// Get all grants
	grants, err := db.GetGrants(t.Context())
	require.NoError(t, err)
	require.NotEmpty(t, grants)

	// Check if our test grant is in the results
	var found bool
	for _, g := range grants {
		if g.ID == grantID {
			found = true
			require.Equal(t, grant.Name, g.Name)
			require.Equal(t, grant.RecipientName, g.RecipientName)
			break
		}
	}
	require.True(t, found, "created grant not found in retrieved grants")

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM grants WHERE id = $1", grantID)
	require.NoError(t, err)
}

func Test_GrantDB_GetGrantByID(t *testing.T) {
	var (
		db    = GetTestGrantDB(t)
		grant = types.CreateGrant{
			Name:               "Test Grant Get By ID",
			RecipientName:      "Test Recipient 2",
			RecipientAddress:   ethutils.GenRandEVMAddr(),
			Description:        "Testing get by ID",
			TotalGrantAmount:   "5000",
			InitialGrantAmount: "1000",
			AmountGivenSoFar:   "0",
			Status:             types.GrantStatusActive,
		}
	)

	// Create grant
	grantID, err := db.CreateGrant(t.Context(), grant)
	require.NoError(t, err)

	// Get grant by ID
	retrieved, err := db.GetGrantByID(t.Context(), grantID)
	require.NoError(t, err)
	require.NotNil(t, retrieved)
	require.Equal(t, grantID, retrieved.ID)
	require.Equal(t, grant.Name, retrieved.Name)
	require.Equal(t, grant.TotalGrantAmount, retrieved.TotalGrantAmount)

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM grants WHERE id = $1", grantID)
	require.NoError(t, err)
}

func Test_GrantDB_UpdateGrant(t *testing.T) {
	var (
		db    = GetTestGrantDB(t)
		grant = types.CreateGrant{
			Name:               "Test Grant Update",
			RecipientName:      "Test Recipient 3",
			RecipientAddress:   ethutils.GenRandEVMAddr(),
			Description:        "Testing update",
			TotalGrantAmount:   "8000",
			InitialGrantAmount: "0",
			AmountGivenSoFar:   "0",
			Status:             types.GrantStatusActive,
		}
	)

	// Create grant
	grantID, err := db.CreateGrant(t.Context(), grant)
	require.NoError(t, err)

	// Update grant
	updates := types.UpdateGrantRequest{
		Name:             null.StringFrom("Updated Grant Name"),
		Description:      null.StringFrom("Updated description"),
		TotalGrantAmount: null.StringFrom("12000"),
	}

	err = db.UpdateGrant(t.Context(), grantID, updates)
	require.NoError(t, err)

	// Verify updates
	retrieved, err := db.GetGrantByID(t.Context(), grantID)
	require.NoError(t, err)
	require.Equal(t, "Updated Grant Name", retrieved.Name)
	require.Equal(t, "Updated description", retrieved.Description)
	require.Equal(t, "12000", retrieved.TotalGrantAmount)

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM grants WHERE id = $1", grantID)
	require.NoError(t, err)
}

func Test_GrantDB_GrantExists(t *testing.T) {
	var (
		db    = GetTestGrantDB(t)
		grant = types.CreateGrant{
			Name:               "Test Grant Exists",
			RecipientName:      "Test Recipient 4",
			RecipientAddress:   ethutils.GenRandEVMAddr(),
			Description:        "Testing exists",
			TotalGrantAmount:   "3000",
			InitialGrantAmount: "0",
			AmountGivenSoFar:   "0",
			Status:             types.GrantStatusActive,
		}
	)

	// Create grant
	grantID, err := db.CreateGrant(t.Context(), grant)
	require.NoError(t, err)

	// Check grant now exists
	exists, err := db.GrantExists(t.Context(), grantID)
	require.NoError(t, err)
	require.True(t, exists)

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM grants WHERE id = $1", grantID)
	require.NoError(t, err)

	// Check grant doesn't exist
	exists, err = db.GrantExists(t.Context(), grantID)
	require.NoError(t, err)
	require.False(t, exists)
}

func Test_GrantDB_MilestoneOperations(t *testing.T) {
	var (
		db    = GetTestGrantDB(t)
		grant = types.CreateGrant{
			Name:               "Test Grant Milestones",
			RecipientName:      "Test Recipient 5",
			RecipientAddress:   ethutils.GenRandEVMAddr(),
			Description:        "Testing milestones",
			TotalGrantAmount:   "6000",
			InitialGrantAmount: "0",
			AmountGivenSoFar:   "0",
			Status:             types.GrantStatusActive,
		}
	)

	// Create grant
	grantID, err := db.CreateGrant(t.Context(), grant)
	require.NoError(t, err)

	milestones := []types.Milestone{
		{
			ID:          uuid.New(),
			GrantID:     grantID,
			Name:        "First Milestone",
			Description: "Complete initial work",
			GrantAmount: "2000",
			Status:      types.MilestoneStatusPending,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          uuid.New(),
			GrantID:     grantID,
			Name:        "Second Milestone",
			Description: "Complete final work",
			GrantAmount: "4000",
			Status:      types.MilestoneStatusPending,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
	}

	// Update grant milestones
	err = db.UpdateGrantMilestones(t.Context(), grantID, milestones)
	require.NoError(t, err)

	// Get milestones
	retrievedMilestones, err := db.GetMilestonesByGrantID(t.Context(), grantID)
	require.NoError(t, err)
	require.Len(t, retrievedMilestones, 2)

	// Check if our milestones are in the results
	foundFirst := false
	foundSecond := false
	for _, m := range retrievedMilestones {
		if m.ID == milestones[0].ID {
			foundFirst = true
			require.Equal(t, "First Milestone", m.Name)
		}
		if m.ID == milestones[1].ID {
			foundSecond = true
			require.Equal(t, "Second Milestone", m.Name)
		}
	}
	require.True(t, foundFirst, "first milestone not found")
	require.True(t, foundSecond, "second milestone not found")

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM milestones WHERE grant_id = $1", grantID)
	require.NoError(t, err)
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM grants WHERE id = $1", grantID)
	require.NoError(t, err)
}

func Test_GrantDB_DisbursementOperations(t *testing.T) {
	var (
		db    = GetTestGrantDB(t)
		grant = types.CreateGrant{
			Name:               "Test Grant Disbursements",
			RecipientName:      "Test Recipient 6",
			RecipientAddress:   ethutils.GenRandEVMAddr(),
			Description:        "Testing disbursements",
			TotalGrantAmount:   "8000",
			InitialGrantAmount: "0",
			AmountGivenSoFar:   "0",
			Status:             types.GrantStatusActive,
		}
	)

	// Create grant
	grantID, err := db.CreateGrant(t.Context(), grant)
	require.NoError(t, err)

	// Test InsertDisbursement
	createDisbursement1 := types.CreateDisbursement{
		Amount:         "3000",
		TxHash:         ethutils.GenRandEVMHash(),
		BlockNumber:    18500000,
		BlockTimestamp: time.Now().Unix(),
	}

	err = db.InsertDisbursement(t.Context(), grantID, createDisbursement1)
	require.NoError(t, err)

	createDisbursement2 := types.CreateDisbursement{
		Amount:         "2500",
		TxHash:         ethutils.GenRandEVMHash(),
		BlockNumber:    18500001,
		BlockTimestamp: time.Now().Unix() + 300,
	}

	err = db.InsertDisbursement(t.Context(), grantID, createDisbursement2)
	require.NoError(t, err)

	// Get disbursements to verify they were inserted
	retrievedDisbursements, err := db.GetDisbursementsByGrantID(t.Context(), grantID)
	require.NoError(t, err)
	require.Len(t, retrievedDisbursements, 2)

	// Check if our disbursements are in the results
	foundFirst := false
	foundSecond := false
	var disbursementToUpdate types.Disbursement
	for _, d := range retrievedDisbursements {
		if d.TxHash == createDisbursement1.TxHash {
			foundFirst = true
			require.Equal(t, "3000", d.Amount)
			require.Equal(t, createDisbursement1.TxHash, d.TxHash)
			require.Equal(t, grantID, d.GrantID)
			disbursementToUpdate = d
		}
		if d.TxHash == createDisbursement2.TxHash {
			foundSecond = true
			require.Equal(t, "2500", d.Amount)
			require.Equal(t, createDisbursement2.TxHash, d.TxHash)
			require.Equal(t, grantID, d.GrantID)
		}
	}
	require.True(t, foundFirst, "first disbursement not found")
	require.True(t, foundSecond, "second disbursement not found")

	// Test UpdateDisbursement
	disbursementToUpdate.Amount = "4000"
	disbursementToUpdate.TxHash = ethutils.GenRandEVMHash()
	disbursementToUpdate.BlockNumber = 18500002

	err = db.UpdateDisbursement(t.Context(), disbursementToUpdate.ID, disbursementToUpdate)
	require.NoError(t, err)

	// Verify the disbursement was updated
	retrievedDisbursements, err = db.GetDisbursementsByGrantID(t.Context(), grantID)
	require.NoError(t, err)
	require.Len(t, retrievedDisbursements, 2)

	foundUpdated := false
	for _, d := range retrievedDisbursements {
		if d.ID == disbursementToUpdate.ID {
			foundUpdated = true
			require.Equal(t, "4000", d.Amount)
			require.Equal(t, disbursementToUpdate.TxHash, d.TxHash)
			require.Equal(t, int64(18500002), d.BlockNumber)
		}
	}
	require.True(t, foundUpdated, "updated disbursement not found")

	// Test updating non-existent disbursement
	nonExistentID := uuid.New()
	err = db.UpdateDisbursement(t.Context(), nonExistentID, disbursementToUpdate)
	require.Error(t, err)
	require.Contains(t, err.Error(), "disbursement not found")

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM disbursements WHERE grant_id = $1", grantID)
	require.NoError(t, err)
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM grants WHERE id = $1", grantID)
	require.NoError(t, err)
}

func Test_GrantDB_FundsUsageOperations(t *testing.T) {
	var (
		db    = GetTestGrantDB(t)
		grant = types.CreateGrant{
			Name:               "Test Grant Funds Usage",
			RecipientName:      "Test Recipient 7",
			RecipientAddress:   ethutils.GenRandEVMAddr(),
			Description:        "Testing funds usage",
			TotalGrantAmount:   "10000",
			InitialGrantAmount: "0",
			AmountGivenSoFar:   "0",
			Status:             types.GrantStatusActive,
		}
	)

	// Create grant
	grantID, err := db.CreateGrant(t.Context(), grant)
	require.NoError(t, err)

	// Test CreateFundsUsage
	createFundsUsage1 := types.CreateFundsUsage{
		GrantID:  grantID,
		Item:     "Laptop",
		Quantity: 1,
		Price:    "1200.00",
		Purpose:  "Development work",
		Category: "Hardware",
		Date:     time.Now().Truncate(24 * time.Hour), // Truncate to date for comparison
		TxHash:   null.StringFrom(ethutils.GenRandEVMHash()),
	}

	err = db.CreateFundsUsage(t.Context(), createFundsUsage1)
	require.NoError(t, err)

	createFundsUsage2 := types.CreateFundsUsage{
		GrantID:  grantID,
		Item:     "Software License",
		Quantity: 2,
		Price:    "500.00",
		Purpose:  "IDE licenses",
		Category: "Software",
		Date:     time.Now().AddDate(0, 0, -1).Truncate(24 * time.Hour),
		TxHash:   null.String{}, // No tx hash
	}

	err = db.CreateFundsUsage(t.Context(), createFundsUsage2)
	require.NoError(t, err)

	// Test GetFundsUsageByGrantID
	retrievedFundsUsage, err := db.GetFundsUsageByGrantID(t.Context(), grantID)
	require.NoError(t, err)
	require.Len(t, retrievedFundsUsage, 2)

	// Check if our funds usage records are in the results
	foundFirst := false
	foundSecond := false
	var fundsUsageToUpdate types.FundsUsage
	for _, fu := range retrievedFundsUsage {
		if fu.Item == "Laptop" {
			foundFirst = true
			require.Equal(t, createFundsUsage1.Item, fu.Item)
			require.Equal(t, createFundsUsage1.Quantity, fu.Quantity)
			require.Equal(t, createFundsUsage1.Price, fu.Price)
			require.Equal(t, createFundsUsage1.Purpose, fu.Purpose)
			require.Equal(t, createFundsUsage1.Category, fu.Category)
			require.Equal(t, createFundsUsage1.Date.Format("2006-01-02"), fu.Date.Format("2006-01-02"))
			require.Equal(t, createFundsUsage1.TxHash, fu.TxHash)
			require.Equal(t, grantID, fu.GrantID)
			fundsUsageToUpdate = fu
		}
		if fu.Item == "Software License" {
			foundSecond = true
			require.Equal(t, createFundsUsage2.Item, fu.Item)
			require.Equal(t, createFundsUsage2.Quantity, fu.Quantity)
			require.Equal(t, createFundsUsage2.Price, fu.Price)
			require.Equal(t, createFundsUsage2.Purpose, fu.Purpose)
			require.Equal(t, createFundsUsage2.Category, fu.Category)
			require.Equal(t, createFundsUsage2.Date.Format("2006-01-02"), fu.Date.Format("2006-01-02"))
			require.Equal(t, createFundsUsage2.TxHash, fu.TxHash)
			require.Equal(t, grantID, fu.GrantID)
		}
	}
	require.True(t, foundFirst, "first funds usage not found")
	require.True(t, foundSecond, "second funds usage not found")

	// Test UpdateFundsUsage
	updateData := types.UpdateFundsUsage{
		GrantID:  grantID,
		Item:     "Updated Laptop",
		Quantity: 1,
		Price:    "1500.00",
		Purpose:  "Updated development work",
		Category: "Hardware",
		Date:     time.Now().AddDate(0, 0, 1).Truncate(24 * time.Hour),
		TxHash:   null.StringFrom(ethutils.GenRandEVMHash()),
	}

	err = db.UpdateFundsUsage(t.Context(), fundsUsageToUpdate.ID, updateData)
	require.NoError(t, err)

	// Verify the funds usage was updated
	retrievedFundsUsage, err = db.GetFundsUsageByGrantID(t.Context(), grantID)
	require.NoError(t, err)
	require.Len(t, retrievedFundsUsage, 2)

	foundUpdated := false
	for _, fu := range retrievedFundsUsage {
		if fu.ID == fundsUsageToUpdate.ID {
			foundUpdated = true
			require.Equal(t, "Updated Laptop", fu.Item)
			require.Equal(t, "1500.00", fu.Price)
			require.Equal(t, "Updated development work", fu.Purpose)
			require.Equal(t, updateData.Date.Format("2006-01-02"), fu.Date.Format("2006-01-02"))
			require.Equal(t, updateData.TxHash, fu.TxHash)
		}
	}
	require.True(t, foundUpdated, "updated funds usage not found")

	// Test updating non-existent funds usage
	nonExistentID := uuid.New()
	err = db.UpdateFundsUsage(t.Context(), nonExistentID, updateData)
	require.Error(t, err)
	require.Contains(t, err.Error(), "funds usage not found")

	// Test DeleteFundsUsage
	err = db.DeleteFundsUsage(t.Context(), fundsUsageToUpdate.ID)
	require.NoError(t, err)

	// Verify the funds usage was deleted
	retrievedFundsUsage, err = db.GetFundsUsageByGrantID(t.Context(), grantID)
	require.NoError(t, err)
	require.Len(t, retrievedFundsUsage, 1) // Should only have one left

	// Verify the remaining record is the second one
	require.Equal(t, "Software License", retrievedFundsUsage[0].Item)

	// Test deleting non-existent funds usage
	err = db.DeleteFundsUsage(t.Context(), fundsUsageToUpdate.ID)
	require.Error(t, err)
	require.Contains(t, err.Error(), "funds usage not found")

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM grant_funds_usage WHERE grant_id = $1", grantID)
	require.NoError(t, err)
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM grants WHERE id = $1", grantID)
	require.NoError(t, err)
}
