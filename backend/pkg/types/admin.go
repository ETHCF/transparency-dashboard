package types

type Admin struct {
	Name    string `json:"name" db:"name"`
	Address string `json:"address" db:"address"`
}
