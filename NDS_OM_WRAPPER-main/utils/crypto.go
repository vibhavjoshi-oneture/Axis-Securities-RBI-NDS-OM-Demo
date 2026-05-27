package utils

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"encoding/base64"
)

// PKCS7Padding pads the plaintext to block size.
func PKCS7Padding(ciphertext []byte, blockSize int) []byte {
	padding := blockSize - (len(ciphertext) % blockSize)
	padtext := bytes.Repeat([]byte{byte(padding)}, padding)
	return append(ciphertext, padtext...)
}

// EncryptAESCBC encrypts plainText using AES-CBC mode with PKCS7 padding.
// key must be 32 bytes (for AES-256) and iv must be 16 bytes.
func EncryptAESCBC(plainText string, key string, iv string) (string, error) {
	block, err := aes.NewCipher([]byte(key))
	if err != nil {
		return "", err
	}

	content := PKCS7Padding([]byte(plainText), aes.BlockSize)
	encrypted := make([]byte, len(content))

	mode := cipher.NewCBCEncrypter(block, []byte(iv))
	mode.CryptBlocks(encrypted, content)

	return base64.StdEncoding.EncodeToString(encrypted), nil
}
