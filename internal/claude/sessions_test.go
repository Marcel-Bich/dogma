package claude

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestEncodeProjectPath(t *testing.T) {
	tests := []struct {
		name string
		path string
		want string
	}{
		{
			name: "absolute linux path",
			path: "/home/marcel/workspace/dogma",
			want: "-home-marcel-workspace-dogma",
		},
		{
			name: "root path",
			path: "/",
			want: "-",
		},
		{
			name: "nested path",
			path: "/home/user/projects/my-app",
			want: "-home-user-projects-my-app",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := encodeProjectPath(tt.path)
			if got != tt.want {
				t.Errorf("encodeProjectPath(%q) = %q, want %q", tt.path, got, tt.want)
			}
		})
	}
}

func TestParseSessionFile(t *testing.T) {
	t.Run("extracts all metadata fields", func(t *testing.T) {
		tmpDir := t.TempDir()
		sessionID := "abc123-def456-789"
		filePath := filepath.Join(tmpDir, sessionID+".jsonl")

		lines := []map[string]interface{}{
			{
				"type":      "user",
				"timestamp": "2026-01-20T10:00:00Z",
				"message":   map[string]interface{}{"role": "user", "content": "Hello world"},
			},
			{
				"type":      "assistant",
				"timestamp": "2026-01-20T10:00:01Z",
				"message":   map[string]interface{}{"role": "assistant", "content": []interface{}{map[string]interface{}{"type": "text", "text": "Hi"}}, "model": "claude-sonnet-4-20250514"},
			},
			{
				"type":    "summary",
				"summary": "A greeting conversation",
			},
		}

		writeJSONLFile(t, filePath, lines)

		info, err := parseSessionFile(filePath)
		if err != nil {
			t.Fatalf("parseSessionFile() error = %v", err)
		}

		if info.ID != sessionID {
			t.Errorf("ID = %q, want %q", info.ID, sessionID)
		}
		if info.Summary != "A greeting conversation" {
			t.Errorf("Summary = %q, want %q", info.Summary, "A greeting conversation")
		}
		if info.FirstMessage != "Hello world" {
			t.Errorf("FirstMessage = %q, want %q", info.FirstMessage, "Hello world")
		}
		if info.Model != "claude-sonnet-4-20250514" {
			t.Errorf("Model = %q, want %q", info.Model, "claude-sonnet-4-20250514")
		}
		expectedTime, _ := time.Parse(time.RFC3339, "2026-01-20T10:00:00Z")
		if !info.Timestamp.Equal(expectedTime) {
			t.Errorf("Timestamp = %v, want %v", info.Timestamp, expectedTime)
		}
	})

	t.Run("handles missing summary", func(t *testing.T) {
		tmpDir := t.TempDir()
		filePath := filepath.Join(tmpDir, "session1.jsonl")

		lines := []map[string]interface{}{
			{
				"type":      "user",
				"timestamp": "2026-01-20T10:00:00Z",
				"message":   map[string]interface{}{"role": "user", "content": "Test message"},
			},
			{
				"type":      "assistant",
				"timestamp": "2026-01-20T10:00:01Z",
				"message":   map[string]interface{}{"role": "assistant", "content": []interface{}{}, "model": "claude-sonnet-4-20250514"},
			},
		}

		writeJSONLFile(t, filePath, lines)

		info, err := parseSessionFile(filePath)
		if err != nil {
			t.Fatalf("parseSessionFile() error = %v", err)
		}

		if info.Summary != "" {
			t.Errorf("Summary = %q, want empty string", info.Summary)
		}
	})

	t.Run("truncates long first messages to 100 chars", func(t *testing.T) {
		tmpDir := t.TempDir()
		filePath := filepath.Join(tmpDir, "session2.jsonl")

		longMessage := "This is a very long message that exceeds one hundred characters and should be truncated by the parsing logic to exactly 100 characters"
		lines := []map[string]interface{}{
			{
				"type":      "user",
				"timestamp": "2026-01-20T10:00:00Z",
				"message":   map[string]interface{}{"role": "user", "content": longMessage},
			},
		}

		writeJSONLFile(t, filePath, lines)

		info, err := parseSessionFile(filePath)
		if err != nil {
			t.Fatalf("parseSessionFile() error = %v", err)
		}

		if len(info.FirstMessage) != 100 {
			t.Errorf("FirstMessage length = %d, want 100", len(info.FirstMessage))
		}
		if info.FirstMessage != longMessage[:100] {
			t.Errorf("FirstMessage = %q, want %q", info.FirstMessage, longMessage[:100])
		}
	})

	t.Run("returns error for non-existent file", func(t *testing.T) {
		_, err := parseSessionFile("/nonexistent/path/session.jsonl")
		if err == nil {
			t.Error("parseSessionFile() expected error for non-existent file, got nil")
		}
	})
}

func TestListSessions(t *testing.T) {
	t.Run("returns empty slice for non-existent directory", func(t *testing.T) {
		sl := NewSessionLister("/nonexistent/base/path")
		sessions, err := sl.ListSessions("/some/project")
		if err != nil {
			t.Fatalf("ListSessions() error = %v", err)
		}
		if sessions == nil {
			t.Error("ListSessions() returned nil, want empty slice")
		}
		if len(sessions) != 0 {
			t.Errorf("ListSessions() returned %d sessions, want 0", len(sessions))
		}
	})

	t.Run("sorts by timestamp descending", func(t *testing.T) {
		tmpDir := t.TempDir()
		projectDir := filepath.Join(tmpDir, "projects", "-home-user-project")
		if err := os.MkdirAll(projectDir, 0755); err != nil {
			t.Fatal(err)
		}

		// Create two session files with different timestamps
		writeJSONLFile(t, filepath.Join(projectDir, "older-session.jsonl"), []map[string]interface{}{
			{"type": "user", "timestamp": "2026-01-18T10:00:00Z", "message": map[string]interface{}{"role": "user", "content": "Older"}},
			{"type": "assistant", "timestamp": "2026-01-18T10:00:01Z", "message": map[string]interface{}{"role": "assistant", "content": []interface{}{}, "model": "claude-sonnet-4-20250514"}},
		})
		writeJSONLFile(t, filepath.Join(projectDir, "newer-session.jsonl"), []map[string]interface{}{
			{"type": "user", "timestamp": "2026-01-20T10:00:00Z", "message": map[string]interface{}{"role": "user", "content": "Newer"}},
			{"type": "assistant", "timestamp": "2026-01-20T10:00:01Z", "message": map[string]interface{}{"role": "assistant", "content": []interface{}{}, "model": "claude-sonnet-4-20250514"}},
		})

		sl := NewSessionLister(tmpDir)
		sessions, err := sl.ListSessions("/home/user/project")
		if err != nil {
			t.Fatalf("ListSessions() error = %v", err)
		}

		if len(sessions) != 2 {
			t.Fatalf("ListSessions() returned %d sessions, want 2", len(sessions))
		}
		if sessions[0].ID != "newer-session" {
			t.Errorf("sessions[0].ID = %q, want %q", sessions[0].ID, "newer-session")
		}
		if sessions[1].ID != "older-session" {
			t.Errorf("sessions[1].ID = %q, want %q", sessions[1].ID, "older-session")
		}
	})

	t.Run("skips unparseable files without error", func(t *testing.T) {
		tmpDir := t.TempDir()
		projectDir := filepath.Join(tmpDir, "projects", "-home-user-project")
		if err := os.MkdirAll(projectDir, 0755); err != nil {
			t.Fatal(err)
		}

		// Create one valid and one invalid file
		writeJSONLFile(t, filepath.Join(projectDir, "valid.jsonl"), []map[string]interface{}{
			{"type": "user", "timestamp": "2026-01-20T10:00:00Z", "message": map[string]interface{}{"role": "user", "content": "Valid"}},
			{"type": "assistant", "timestamp": "2026-01-20T10:00:01Z", "message": map[string]interface{}{"role": "assistant", "content": []interface{}{}, "model": "claude-sonnet-4-20250514"}},
		})
		// Write garbage to invalid file
		if err := os.WriteFile(filepath.Join(projectDir, "invalid.jsonl"), []byte("not json\n"), 0644); err != nil {
			t.Fatal(err)
		}

		sl := NewSessionLister(tmpDir)
		sessions, err := sl.ListSessions("/home/user/project")
		if err != nil {
			t.Fatalf("ListSessions() error = %v", err)
		}

		if len(sessions) != 1 {
			t.Fatalf("ListSessions() returned %d sessions, want 1", len(sessions))
		}
		if sessions[0].ID != "valid" {
			t.Errorf("sessions[0].ID = %q, want %q", sessions[0].ID, "valid")
		}
	})

	t.Run("reads multiple session files correctly", func(t *testing.T) {
		tmpDir := t.TempDir()
		projectDir := filepath.Join(tmpDir, "projects", "-home-user-project")
		if err := os.MkdirAll(projectDir, 0755); err != nil {
			t.Fatal(err)
		}

		writeJSONLFile(t, filepath.Join(projectDir, "session-a.jsonl"), []map[string]interface{}{
			{"type": "user", "timestamp": "2026-01-20T10:00:00Z", "message": map[string]interface{}{"role": "user", "content": "Session A"}},
			{"type": "assistant", "timestamp": "2026-01-20T10:00:01Z", "message": map[string]interface{}{"role": "assistant", "content": []interface{}{}, "model": "model-a"}},
			{"type": "summary", "summary": "Summary A"},
		})
		writeJSONLFile(t, filepath.Join(projectDir, "session-b.jsonl"), []map[string]interface{}{
			{"type": "user", "timestamp": "2026-01-21T10:00:00Z", "message": map[string]interface{}{"role": "user", "content": "Session B"}},
			{"type": "assistant", "timestamp": "2026-01-21T10:00:01Z", "message": map[string]interface{}{"role": "assistant", "content": []interface{}{}, "model": "model-b"}},
			{"type": "summary", "summary": "Summary B"},
		})
		writeJSONLFile(t, filepath.Join(projectDir, "session-c.jsonl"), []map[string]interface{}{
			{"type": "user", "timestamp": "2026-01-22T10:00:00Z", "message": map[string]interface{}{"role": "user", "content": "Session C"}},
			{"type": "assistant", "timestamp": "2026-01-22T10:00:01Z", "message": map[string]interface{}{"role": "assistant", "content": []interface{}{}, "model": "model-c"}},
		})

		sl := NewSessionLister(tmpDir)
		sessions, err := sl.ListSessions("/home/user/project")
		if err != nil {
			t.Fatalf("ListSessions() error = %v", err)
		}

		if len(sessions) != 3 {
			t.Fatalf("ListSessions() returned %d sessions, want 3", len(sessions))
		}

		// Verify sorted newest first
		if sessions[0].ID != "session-c" {
			t.Errorf("sessions[0].ID = %q, want %q", sessions[0].ID, "session-c")
		}
		if sessions[1].ID != "session-b" {
			t.Errorf("sessions[1].ID = %q, want %q", sessions[1].ID, "session-b")
		}
		if sessions[2].ID != "session-a" {
			t.Errorf("sessions[2].ID = %q, want %q", sessions[2].ID, "session-a")
		}

		// Verify metadata extracted
		if sessions[0].FirstMessage != "Session C" {
			t.Errorf("sessions[0].FirstMessage = %q, want %q", sessions[0].FirstMessage, "Session C")
		}
		if sessions[1].Summary != "Summary B" {
			t.Errorf("sessions[1].Summary = %q, want %q", sessions[1].Summary, "Summary B")
		}
		if sessions[2].Model != "model-a" {
			t.Errorf("sessions[2].Model = %q, want %q", sessions[2].Model, "model-a")
		}
		// session-c has no summary
		if sessions[0].Summary != "" {
			t.Errorf("sessions[0].Summary = %q, want empty", sessions[0].Summary)
		}
	})
}

// writeJSONLFile writes a slice of maps as JSONL lines to the given file.
func writeJSONLFile(t *testing.T, path string, lines []map[string]interface{}) {
	t.Helper()
	f, err := os.Create(path)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()

	for _, line := range lines {
		data, err := json.Marshal(line)
		if err != nil {
			t.Fatal(err)
		}
		f.Write(data)
		f.Write([]byte("\n"))
	}
}
