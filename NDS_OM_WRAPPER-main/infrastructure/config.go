package infrastructure

import (
	"encoding/json"
	"os"
)

// ConnConfig maps directly to a connection configuration block in config.json.
type ConnConfig struct {
	ConnectionID             string `json:"connection_id"`
	Host                     string `json:"host"`
	Port                     int    `json:"port"`
	UseTLS                   bool   `json:"use_tls"`
	HeartbeatIntervalSeconds int    `json:"heartbeat_interval_seconds"`
	SenderCompID             string `json:"sender_comp_id"`
	SenderSubID              string `json:"sender_sub_id"`
	TargetCompID             string `json:"target_comp_id"`
	Username                 string `json:"username"`
	Password                 string `json:"password"`
}

// Config maps directly to the global config.json root.
type Config struct {
	HTTPHost       string       `json:"http_host"`
	HTTPPort       int          `json:"http_port"`
	AllowedOrigins []string     `json:"allowed_origins"`
	Connections    []ConnConfig `json:"connections"`
}

// LoadConfig reads and decodes the JSON configuration file.
func LoadConfig(path string) (*Config, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var cfg Config
	decoder := json.NewDecoder(file)
	if err := decoder.Decode(&cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}

// // GetConnection looks up a connection by its ID.
// func (c *Config) GetConnection(connID string) (ConnConfig, bool) {
// 	for _, conn := range c.Connections {
// 		if conn.ConnectionID == connID {
// 			return conn, true
// 		}
// 	}
// 	return ConnConfig{}, false
// }