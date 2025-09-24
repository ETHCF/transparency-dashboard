package db

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestTrimZeros(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "trailing zeros with decimal",
			input:    "10.000",
			expected: "10",
		},
		{
			name:     "trailing zeros keeping significant decimal",
			input:    "10.500",
			expected: "10.5",
		},
		{
			name:     "single trailing zero",
			input:    "10.0",
			expected: "10",
		},
		{
			name:     "no trailing zeros",
			input:    "10",
			expected: "10",
		},
		{
			name:     "no trailing zeros with decimal",
			input:    "10.5",
			expected: "10.5",
		},
		{
			name:     "decimal with intermediary zeros",
			input:    "10.0005",
			expected: "10.0005",
		},
		{
			name:     "zero with trailing zeros",
			input:    "0.000",
			expected: "0",
		},
		{
			name:     "zero point zero",
			input:    "0.0",
			expected: "0",
		},
		{
			name:     "just zero",
			input:    "0",
			expected: "0",
		},
		{
			name:     "multiple decimal places",
			input:    "123.45000",
			expected: "123.45",
		},
		{
			name:     "large number with trailing zeros",
			input:    "1000000.000",
			expected: "1000000",
		},
		{
			name:     "small decimal",
			input:    "0.100",
			expected: "0.1",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := TrimZeros(tt.input)
			require.Equal(t, tt.expected, result)
		})
	}
}
