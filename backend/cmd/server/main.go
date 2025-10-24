package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sync"

	"github.com/tazgreenwood/data-warden/internal/protocol"
	"github.com/tazgreenwood/data-warden/internal/server"
)

var writeMutex sync.Mutex

func main() {
	// Setup logging to stderr (stdout is used for JSON-RPC)
	log.SetOutput(os.Stderr)
	log.SetPrefix("[DataWarden Backend] ")
	log.Println("Starting Data Warden backend server...")

	// Create server instance
	srv := server.NewServer()
	defer srv.Shutdown()

	// Setup stdin/stdout for JSON-RPC communication
	scanner := bufio.NewScanner(os.Stdin)
	writer := bufio.NewWriter(os.Stdout)

	log.Println("Backend ready, waiting for requests...")

	// Main request loop - handle requests concurrently
	for scanner.Scan() {
		line := scanner.Bytes()
		lineCopy := make([]byte, len(line))
		copy(lineCopy, line)

		// Parse JSON-RPC request
		var request protocol.Request
		if err := json.Unmarshal(lineCopy, &request); err != nil {
			log.Printf("Error parsing request: %v", err)
			sendError(writer, "", protocol.ParseError, "Failed to parse request")
			continue
		}

		// Handle request in a goroutine so we can continue reading
		go func(req protocol.Request) {
			// Handle request
			response := srv.HandleRequest(&req)

			// Send response (synchronize writes)
			if err := sendResponse(writer, response); err != nil {
				log.Printf("Error sending response: %v", err)
			}
		}(request)
	}

	if err := scanner.Err(); err != nil {
		log.Fatalf("Error reading from stdin: %v", err)
	}
}

func sendResponse(writer *bufio.Writer, response *protocol.Response) error {
	// Lock to prevent concurrent writes
	writeMutex.Lock()
	defer writeMutex.Unlock()

	data, err := json.Marshal(response)
	if err != nil {
		return fmt.Errorf("failed to marshal response: %w", err)
	}

	if _, err := writer.Write(data); err != nil {
		return fmt.Errorf("failed to write response: %w", err)
	}

	if err := writer.WriteByte('\n'); err != nil {
		return fmt.Errorf("failed to write newline: %w", err)
	}

	return writer.Flush()
}

func sendError(writer *bufio.Writer, id string, code int, message string) {
	response := &protocol.Response{
		JSONRPC: "2.0",
		ID:      id,
		Error: &protocol.Error{
			Code:    code,
			Message: message,
		},
	}
	_ = sendResponse(writer, response)
}
