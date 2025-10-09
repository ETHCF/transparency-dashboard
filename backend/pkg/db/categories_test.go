//go:build integration
// +build integration

package db

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/types"
)

func GetTestCategoryDB(t *testing.T) CategoryDB {
	cdb, err := NewCategoryDB(t.Context(), conf, dbConn)
	require.NoError(t, err)
	return cdb
}

func Test_CategoryDB_CreateAndGetCategories(t *testing.T) {
	var (
		db       = GetTestCategoryDB(t)
		category = types.Category{
			Name:        "test-category",
			Description: "Test category description",
		}
	)

	// Create category
	err := db.CreateCategory(t.Context(), category)
	require.NoError(t, err)

	// Get categories
	categories, err := db.GetCategories(t.Context())
	require.NoError(t, err)
	require.NotEmpty(t, categories)

	// Check if our test category is in the results
	var found bool
	for _, c := range categories {
		if c.Name == category.Name {
			found = true
			require.Equal(t, category.Description, c.Description)
			break
		}
	}
	require.True(t, found, "created category not found in retrieved categories")

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM categories WHERE name = $1", category.Name)
	require.NoError(t, err)
}

func Test_CategoryDB_GetCategoryByName(t *testing.T) {
	var (
		db       = GetTestCategoryDB(t)
		category = types.Category{
			Name:        "test-specific-category",
			Description: "Specific test category",
		}
	)

	// Create category
	err := db.CreateCategory(t.Context(), category)
	require.NoError(t, err)

	// Get category by name
	retrievedCategory, err := db.GetCategoryByName(t.Context(), category.Name)
	require.NoError(t, err)
	require.NotNil(t, retrievedCategory)
	require.Equal(t, category.Name, retrievedCategory.Name)
	require.Equal(t, category.Description, retrievedCategory.Description)

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM categories WHERE name = $1", category.Name)
	require.NoError(t, err)
}

func Test_CategoryDB_GetCategoryByName_NotFound(t *testing.T) {
	var (
		db              = GetTestCategoryDB(t)
		nonExistentName = "non-existent-category"
	)

	// Try to get non-existent category
	_, err := db.GetCategoryByName(t.Context(), nonExistentName)
	require.Error(t, err)
}

func Test_CategoryDB_UpdateCategory(t *testing.T) {
	var (
		db       = GetTestCategoryDB(t)
		category = types.Category{
			Name:        "test-update-category",
			Description: "Original description",
		}
	)

	// Create category
	err := db.CreateCategory(t.Context(), category)
	require.NoError(t, err)

	// Update category
	updatedCategory := types.Category{
		Name:        category.Name,
		Description: "Updated description",
	}
	err = db.UpdateCategory(t.Context(), category.Name, updatedCategory)
	require.NoError(t, err)

	// Verify the update
	retrievedCategory, err := db.GetCategoryByName(t.Context(), category.Name)
	require.NoError(t, err)
	require.Equal(t, updatedCategory.Description, retrievedCategory.Description)

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM categories WHERE name = $1", category.Name)
	require.NoError(t, err)
}

func Test_CategoryDB_UpdateCategory_NotFound(t *testing.T) {
	var (
		db              = GetTestCategoryDB(t)
		nonExistentName = "non-existent-category"
		category        = types.Category{
			Name:        nonExistentName,
			Description: "Some description",
		}
	)

	// Try to update non-existent category
	err := db.UpdateCategory(t.Context(), nonExistentName, category)
	require.Error(t, err)
	require.Contains(t, err.Error(), "category not found")
}

func Test_CategoryDB_DeleteCategory(t *testing.T) {
	var (
		db       = GetTestCategoryDB(t)
		category = types.Category{
			Name:        "test-delete-category",
			Description: "Category to be deleted",
		}
	)

	// Create category
	err := db.CreateCategory(t.Context(), category)
	require.NoError(t, err)

	// Delete category
	err = db.DeleteCategory(t.Context(), category.Name)
	require.NoError(t, err)

	// Verify category no longer exists
	_, err = db.GetCategoryByName(t.Context(), category.Name)
	require.Error(t, err)
}

func Test_CategoryDB_DeleteCategory_NotFound(t *testing.T) {
	var (
		db              = GetTestCategoryDB(t)
		nonExistentName = "non-existent-category"
	)

	// Try to delete non-existent category
	err := db.DeleteCategory(t.Context(), nonExistentName)
	require.Error(t, err)
	require.Contains(t, err.Error(), fmt.Sprintf("category %s not found", nonExistentName))
}

func Test_CategoryDB_GetCategories_EmptyResult(t *testing.T) {
	var (
		db = GetTestCategoryDB(t)
	)

	// Clean up all categories first
	_, err := dbConn.ExecContext(t.Context(), "DELETE FROM categories")
	require.NoError(t, err)

	// Get categories - should return empty slice
	categories, err := db.GetCategories(t.Context())
	require.NoError(t, err)
	require.Empty(t, categories)
}

func Test_CategoryDB_CreateCategory_Duplicate(t *testing.T) {
	var (
		db       = GetTestCategoryDB(t)
		category = types.Category{
			Name:        "test-duplicate-category",
			Description: "First category",
		}
	)

	// Create category
	err := db.CreateCategory(t.Context(), category)
	require.NoError(t, err)

	// Try to create category with same name
	duplicateCategory := types.Category{
		Name:        category.Name,
		Description: "Duplicate attempt",
	}
	err = db.CreateCategory(t.Context(), duplicateCategory)
	require.Error(t, err)

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM categories WHERE name = $1", category.Name)
	require.NoError(t, err)
}

func Test_CategoryDB_GetCategories_OrderedByName(t *testing.T) {
	var (
		db         = GetTestCategoryDB(t)
		categories = []types.Category{
			{Name: "zebra-category", Description: "Last alphabetically"},
			{Name: "alpha-category", Description: "First alphabetically"},
			{Name: "middle-category", Description: "Middle alphabetically"},
		}
	)

	// Clean up first
	_, err := dbConn.ExecContext(t.Context(), "DELETE FROM categories")
	require.NoError(t, err)

	// Create categories in random order
	for _, cat := range categories {
		err := db.CreateCategory(t.Context(), cat)
		require.NoError(t, err)
	}

	// Get categories - should be ordered by name
	retrievedCategories, err := db.GetCategories(t.Context())
	require.NoError(t, err)
	require.Len(t, retrievedCategories, 3)

	// Verify order
	require.Equal(t, "alpha-category", retrievedCategories[0].Name)
	require.Equal(t, "middle-category", retrievedCategories[1].Name)
	require.Equal(t, "zebra-category", retrievedCategories[2].Name)

	// Clean up
	_, err = dbConn.ExecContext(t.Context(), "DELETE FROM categories")
	require.NoError(t, err)
}
