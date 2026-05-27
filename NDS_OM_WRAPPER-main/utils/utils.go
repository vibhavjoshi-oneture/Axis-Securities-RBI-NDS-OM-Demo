package utils

import (
	"crypto/rand"
	"encoding/hex"
)

// RandomHex generates a random hexadecimal string of the given length.
func RandomHex(size int) string {
	b := make([]byte, size/2)
	_, err := rand.Read(b)
	if err != nil {
		return "DEADBEEF"
	}
	return hex.EncodeToString(b)
}
