package claude

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"sync"
	"syscall"
)

// EventHandler is the callback type invoked for each streaming event.
type EventHandler func(event StreamEvent)

// Cmd abstracts the subset of exec.Cmd used by Spawner.
type Cmd interface {
	StdoutPipe() (io.ReadCloser, error)
	Start() error
	Wait() error
	SetDir(dir string)
	Signal(sig os.Signal) error
}

// execCmd wraps a real exec.Cmd to satisfy the Cmd interface.
type execCmd struct {
	cmd *exec.Cmd
}

func (c *execCmd) StdoutPipe() (io.ReadCloser, error) { return c.cmd.StdoutPipe() }
func (c *execCmd) Start() error                       { return c.cmd.Start() }
func (c *execCmd) Wait() error                        { return c.cmd.Wait() }
func (c *execCmd) SetDir(dir string)                  { c.cmd.Dir = dir }

func (c *execCmd) Signal(sig os.Signal) error {
	if c.cmd.Process == nil {
		return nil
	}
	return c.cmd.Process.Signal(sig)
}

// CmdFactory creates Cmd instances. Used for dependency injection in tests.
type CmdFactory func(ctx context.Context, name string, args ...string) Cmd

func defaultCmdFactory(ctx context.Context, name string, args ...string) Cmd {
	return &execCmd{cmd: exec.CommandContext(ctx, name, args...)}
}

// SpawnerConfig holds configuration for the Claude CLI spawner.
type SpawnerConfig struct {
	ClaudePath string // Path to claude binary (default: "claude")
	WorkingDir string // Working directory for the child process
}

// Spawner manages a claude CLI child process.
type Spawner struct {
	config     SpawnerConfig
	cmdFactory CmdFactory
	mu         sync.Mutex
	cmd        Cmd
}

// NewSpawner creates a Spawner with the given config.
func NewSpawner(config SpawnerConfig) *Spawner {
	if config.ClaudePath == "" {
		config.ClaudePath = "claude"
	}
	return &Spawner{config: config, cmdFactory: defaultCmdFactory}
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

// SendPromptContinue resumes the most recent session in the configured working directory.
func (s *Spawner) SendPromptContinue(ctx context.Context, prompt string, handler EventHandler) error {
	args := []string{"-p", "--output-format", "stream-json", "--verbose", "--continue", prompt}
	return s.run(ctx, args, handler)
}

// Cancel sends SIGTERM to the running claude process, if any.
func (s *Spawner) Cancel() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.cmd != nil {
		_ = s.cmd.Signal(syscall.SIGTERM)
	}
}

func (s *Spawner) run(ctx context.Context, args []string, handler EventHandler) error {
	cmd := s.cmdFactory(ctx, s.config.ClaudePath, args...)
	if s.config.WorkingDir != "" {
		cmd.SetDir(s.config.WorkingDir)
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
