package claude

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"sync"
	"syscall"
)

// EventHandler is the callback type invoked for each streaming event.
type EventHandler func(event StreamEvent)

// SpawnerConfig holds configuration for the Claude CLI spawner.
type SpawnerConfig struct {
	ClaudePath string // Path to claude binary (default: "claude")
	WorkingDir string // Working directory for the child process
}

// Spawner manages a claude CLI child process.
type Spawner struct {
	config SpawnerConfig
	mu     sync.Mutex
	cmd    *exec.Cmd
}

// NewSpawner creates a Spawner with the given config.
func NewSpawner(config SpawnerConfig) *Spawner {
	if config.ClaudePath == "" {
		config.ClaudePath = "claude"
	}
	return &Spawner{config: config}
}

// SendPrompt starts a claude -p process with streaming output and calls
// the handler for each NDJSON event line received on stdout.
func (s *Spawner) SendPrompt(ctx context.Context, prompt string, handler EventHandler) error {
	args := []string{"-p", "--output-format", "stream-json", "--verbose", prompt}
	return s.run(ctx, args, handler)
}

// SendPromptWithSession is like SendPrompt but resumes an existing session.
func (s *Spawner) SendPromptWithSession(ctx context.Context, prompt string, sessionID string, handler EventHandler) error {
	args := []string{"-p", "--output-format", "stream-json", "--verbose", "--session-id", sessionID, prompt}
	return s.run(ctx, args, handler)
}

// Cancel sends SIGTERM to the running claude process, if any.
func (s *Spawner) Cancel() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.cmd != nil && s.cmd.Process != nil {
		_ = s.cmd.Process.Signal(syscall.SIGTERM)
	}
}

func (s *Spawner) run(ctx context.Context, args []string, handler EventHandler) error {
	cmd := exec.CommandContext(ctx, s.config.ClaudePath, args...)
	if s.config.WorkingDir != "" {
		cmd.Dir = s.config.WorkingDir
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("stdout pipe: %w", err)
	}

	s.mu.Lock()
	s.cmd = cmd
	s.mu.Unlock()

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start claude: %w", err)
	}

	scanner := bufio.NewScanner(stdout)
	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}
		var event StreamEvent
		if err := json.Unmarshal(line, &event); err != nil {
			continue
		}
		handler(event)
	}

	if err := cmd.Wait(); err != nil {
		return fmt.Errorf("claude exited: %w", err)
	}

	s.mu.Lock()
	s.cmd = nil
	s.mu.Unlock()

	return nil
}
