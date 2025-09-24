package types

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

type AdminActionDetails map[string]any

func (a AdminActionDetails) Value() (driver.Value, error) {
	if a == nil {
		return nil, nil
	}
	return json.Marshal(a)
}

func (a *AdminActionDetails) Scan(value interface{}) error {
	if value == nil {
		*a = nil
		return nil
	}

	switch v := value.(type) {
	case []byte:
		return json.Unmarshal(v, a)
	case string:
		return json.Unmarshal([]byte(v), a)
	}
	return nil
}

type AdminAction struct {
	AdminAddress string             `json:"adminAddress" db:"admin_address"`
	Action       string             `json:"action" db:"action"`
	ResourceType string             `json:"resourceType" db:"resource_type"`
	ResourceID   string             `json:"resourceId" db:"resource_id"`
	Details      AdminActionDetails `json:"details" db:"details"`
	CreatedAt    time.Time          `json:"createdAt" db:"created_at"`
}
