package fix

import (
	"bufio"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"
)

const (
	SOH               = "\x01"
	HeartbeatInterval = 30 * time.Second
)

// FIXMessage represents a parsed FIX protocol message.
type FIXMessage struct {
	Tags map[int]string
}

// NewFIXMessage creates a new FIXMessage instance with the specified MsgType (35).
func NewFIXMessage(msgType string) *FIXMessage {
	return &FIXMessage{
		Tags: map[int]string{
			35: msgType,
		},
	}
}

// Set sets a tag value in the message.
func (m *FIXMessage) Set(tag int, val string) {
	m.Tags[tag] = val
}

// Get retrieves a tag value from the message.
func (m *FIXMessage) Get(tag int) string {
	return m.Tags[tag]
}

// Encode serializes the FIX message, calculating BodyLength (9) and CheckSum (10).
func (m *FIXMessage) Encode(seqNum int64, sender, target string) []byte {
	m.Tags[34] = strconv.FormatInt(seqNum, 10)
	m.Tags[49] = sender
	m.Tags[56] = target
	m.Tags[52] = time.Now().UTC().Format("20060102-15:04:05.000")

	// Frame body tags first. Tag 8, 9, and 10 are handled specifically.
	var bodyBuilder strings.Builder
	// In FIX standard, 35, 34, 49, 56, 52 are part of the header block.
	// We'll write them in standard order.
	bodyBuilder.WriteString(fmt.Sprintf("35=%s%s", m.Tags[35], SOH))
	bodyBuilder.WriteString(fmt.Sprintf("34=%s%s", m.Tags[34], SOH))
	bodyBuilder.WriteString(fmt.Sprintf("49=%s%s", m.Tags[49], SOH))
	bodyBuilder.WriteString(fmt.Sprintf("56=%s%s", m.Tags[56], SOH))
	bodyBuilder.WriteString(fmt.Sprintf("52=%s%s", m.Tags[52], SOH))

	// Write remaining body tags
	for tag, val := range m.Tags {
		if tag == 8 || tag == 9 || tag == 35 || tag == 34 || tag == 49 || tag == 56 || tag == 52 || tag == 10 {
			continue
		}
		bodyBuilder.WriteString(fmt.Sprintf("%d=%s%s", tag, val, SOH))
	}

	bodyStr := bodyBuilder.String()
	bodyLength := len(bodyStr)

	// Combine header
	headerStr := fmt.Sprintf("8=FIX.5.0%s9=%d%s", SOH, bodyLength, SOH)
	fullMsgWithoutChecksum := headerStr + bodyStr

	// Calculate 3-digit modulo 256 checksum
	var checksumSum int
	for i := 0; i < len(fullMsgWithoutChecksum); i++ {
		checksumSum += int(fullMsgWithoutChecksum[i])
	}

	checksum := checksumSum % 256
	checksumStr := fmt.Sprintf("%03d", checksum)

	return []byte(fullMsgWithoutChecksum + fmt.Sprintf("10=%s%s", checksumStr, SOH))
}

// DecodeFIX parses a raw SOH-separated FIX string into a FIXMessage.
func DecodeFIX(data []byte) (*FIXMessage, error) {
	m := &FIXMessage{Tags: make(map[int]string)}
	str := string(data)
	fields := strings.Split(str, SOH)
	
	for _, field := range fields {
		if field == "" {
			continue
		}

		parts := strings.SplitN(field, "=", 2)
		if len(parts) != 2 {
			return nil, fmt.Errorf("malformed field: %s", field)
		}

		tag, err := strconv.Atoi(parts[0])
		if err != nil {
			return nil, fmt.Errorf("invalid tag: %s", parts[0])
		}

		m.Tags[tag] = parts[1]
	}
	return m, nil
}

// ReadFIXFromStream reads a single framed FIX message from a TCP connection stream.
func ReadFIXFromStream(reader *bufio.Reader) ([]byte, error) {
	// Read until first SOH (should contain BeginString "8=FIX.5.0\x01")
	header, err := reader.ReadBytes(SOH[0])
	if err != nil {
		return nil, err
	}
	if !strings.HasPrefix(string(header), "8=FIX.5.0") {
		return nil, fmt.Errorf("invalid FIX header signature: %q", header)
	}

	// Read next field (should contain BodyLength "9=xxx\x01")
	lengthField, err := reader.ReadBytes(SOH[0])
	if err != nil {
		return nil, err
	}
	if !strings.HasPrefix(string(lengthField), "9=") {
		return nil, fmt.Errorf("invalid body length signature: %q", lengthField)
	}

	lengthStr := strings.TrimPrefix(string(lengthField), "9=")
	lengthStr = strings.TrimSuffix(lengthStr, SOH)
	bodyLength, err := strconv.Atoi(lengthStr)
	if err != nil {
		return nil, fmt.Errorf("invalid body length value: %q", lengthStr)
	}

	// Read exactly bodyLength bytes
	body := make([]byte, bodyLength)
	_, err = io.ReadFull(reader, body)
	if err != nil {
		return nil, fmt.Errorf("failed to read body of length %d: %w", bodyLength, err)
	}

	// Read checksum field (should contain "10=xxx\x01" which is always 7 bytes)
	checksumField := make([]byte, 7)
	_, err = io.ReadFull(reader, checksumField)
	if err != nil {
		return nil, fmt.Errorf("failed to read checksum field: %w", err)
	}
	if !strings.HasPrefix(string(checksumField), "10=") {
		return nil, fmt.Errorf("invalid checksum signature: %q", checksumField)
	}

	// Assemble complete message
	var fullMessage []byte
	fullMessage = append(fullMessage, header...)
	fullMessage = append(fullMessage, lengthField...)
	fullMessage = append(fullMessage, body...)
	fullMessage = append(fullMessage, checksumField...)
	return fullMessage, nil
}
