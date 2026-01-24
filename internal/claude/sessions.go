package claude

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// SessionInfo holds metadata extracted from a session JSONL file.
type SessionInfo struct {
	ID           string    `json:"id"`
	Summary      string    `json:"summary"`
	FirstMessage string    `json:"first_message"`
	Timestamp    time.Time `json:"timestamp"`
	Model        string    `json:"model"`
}

// SessionLister discovers and parses Claude session files.
type SessionLister struct {
	BasePath    string          // Base path for .claude directory (defaults to ~/.claude via os.UserHomeDir)
	homeDirFunc func() (string, error) // For testing; defaults to os.UserHomeDir
}

// NewSessionLister creates a SessionLister with the given base path.
// If basePath is empty, os.UserHomeDir()/.claude is used at query time.
func NewSessionLister(basePath string) *SessionLister {
	return &SessionLister{BasePath: basePath}
}

// ListSessions discovers session JSONL files for the given project path
// and returns parsed session metadata sorted by timestamp descending.
func (sl *SessionLister) ListSessions(projectPath string) ([]SessionInfo, error) {
	base, err := sl.resolveBasePath()
	if err != nil {
		return nil, err
	}

	encoded := encodeProjectPath(projectPath)
	dir := filepath.Join(base, "projects", encoded)

	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return []SessionInfo{}, nil
		}
		return nil, fmt.Errorf("read sessions dir: %w", err)
	}

	var sessions []SessionInfo
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".jsonl") {
			continue
		}
		filePath := filepath.Join(dir, entry.Name())
		info, err := parseSessionFile(filePath)
		if err != nil {
			// Skip files that fail to parse
			continue
		}
		sessions = append(sessions, info)
	}

	sort.Slice(sessions, func(i, j int) bool {
		return sessions[i].Timestamp.After(sessions[j].Timestamp)
	})

	if sessions == nil {
		sessions = []SessionInfo{}
	}

	return sessions, nil
}

func (sl *SessionLister) resolveBasePath() (string, error) {
	if sl.BasePath != "" {
		return sl.BasePath, nil
	}
	homeFn := sl.homeDirFunc
	if homeFn == nil {
		homeFn = os.UserHomeDir
	}
	home, err := homeFn()
	if err != nil {
		return "", fmt.Errorf("resolve home dir: %w", err)
	}
	return filepath.Join(home, ".claude"), nil
}

// encodeProjectPath converts an absolute path to the directory name format
// used by Claude CLI: replace all "/" with "-".
func encodeProjectPath(path string) string {
	return strings.ReplaceAll(path, "/", "-")
}

// sessionEntry represents a single line in a session JSONL file.
type sessionEntry struct {
	Type      string        `json:"type"`
	Timestamp string        `json:"timestamp"`
	Message   *entryMessage `json:"message,omitempty"`
	Summary   string        `json:"summary,omitempty"`
}

// entryMessage holds the message content from a session entry.
type entryMessage struct {
	Role    string          `json:"role"`
	Content json.RawMessage `json:"content"`
	Model   string          `json:"model,omitempty"`
}

// parseSessionFile reads a JSONL session file and extracts metadata.
func parseSessionFile(path string) (SessionInfo, error) {
	f, err := os.Open(path)
	if err != nil {
		return SessionInfo{}, err
	}
	defer f.Close()

	info := SessionInfo{
		ID: strings.TrimSuffix(filepath.Base(path), ".jsonl"),
	}

	var (
		gotTimestamp    bool
		gotFirstMsg    bool
		gotModel       bool
		lastSummary    string
	)

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}

		var entry sessionEntry
		if err := json.Unmarshal(line, &entry); err != nil {
			continue
		}

		// First entry: extract timestamp
		if !gotTimestamp && entry.Timestamp != "" {
			if ts, err := time.Parse(time.RFC3339, entry.Timestamp); err == nil {
				info.Timestamp = ts
				gotTimestamp = true
			}
		}

		switch entry.Type {
		case "user":
			if !gotFirstMsg && entry.Message != nil {
				content := extractStringContent(entry.Message.Content)
				if len(content) > 100 {
					content = content[:100]
				}
				info.FirstMessage = content
				gotFirstMsg = true
			}
		case "assistant":
			if !gotModel && entry.Message != nil && entry.Message.Model != "" {
				info.Model = entry.Message.Model
				gotModel = true
			}
		case "summary":
			lastSummary = entry.Summary
		}
	}

	info.Summary = lastSummary

	if !gotTimestamp {
		return SessionInfo{}, fmt.Errorf("no valid timestamp found in %s", path)
	}

	return info, nil
}

// extractStringContent attempts to parse content as a JSON string.
// User message content is typically a plain string.
func extractStringContent(raw json.RawMessage) string {
	if len(raw) == 0 {
		return ""
	}
	var s string
	if err := json.Unmarshal(raw, &s); err == nil {
		return s
	}
	return ""
}
