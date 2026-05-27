package gateway

import (
	"strconv"
	"testing"
)

func TestParseLoginFreq(t *testing.T) {
	tests := []struct {
		input    string
		expected int64
	}{
		{"1", 1},
		{"12", 12},
		{"Login frequency: 3", 3},
		{"", 1},
		{"abc", 1},
		{"foo-5-bar", 5},
		{"0", 1},
		{"-2", 2}, // extracts digits "2", parses to 2
	}

	for _, tc := range tests {
		got := parseLoginFreq(tc.input)
		if got != tc.expected {
			t.Errorf("parseLoginFreq(%q) = %d; want %d", tc.input, got, tc.expected)
		}
	}
}

func TestGenerateClOrdID(t *testing.T) {
	c := &NDSOmClient{
		userNum:   12345,
		loginFreq: 2,
		orderSeq:  0,
	}

	clOrdIDStr := c.generateClOrdID()
	clOrdID, err := strconv.ParseInt(clOrdIDStr, 10, 64)
	if err != nil {
		t.Fatalf("failed to parse generated ClOrdID string: %v", err)
	}

	// Verify bit layout:
	// bits 0-31: sequence
	seq := clOrdID & 0xFFFFFFFF
	if seq != 1 {
		t.Errorf("expected sequence 1, got %d", seq)
	}

	// bits 32-55: userNum
	userNum := (clOrdID >> 32) & 0xFFFFFF
	if userNum != 12345 {
		t.Errorf("expected userNum 12345, got %d", userNum)
	}

	// bits 56-62: loginFreq
	loginFreq := (clOrdID >> 56) & 0x7F
	if loginFreq != 2 {
		t.Errorf("expected loginFreq 2, got %d", loginFreq)
	}

	// bit 63: 0
	bit63 := (clOrdID >> 63) & 1
	if bit63 != 0 {
		t.Errorf("expected bit 63 to be 0, got %d", bit63)
	}

	// Generate again and verify sequence increments
	clOrdIDStr2 := c.generateClOrdID()
	clOrdID2, _ := strconv.ParseInt(clOrdIDStr2, 10, 64)
	seq2 := clOrdID2 & 0xFFFFFFFF
	if seq2 != 2 {
		t.Errorf("expected sequence 2, got %d", seq2)
	}
}
