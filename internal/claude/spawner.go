package claude

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"strings"
	"sync"
	"syscall"
)

// DefaultModel sets the default model for new sessions (e.g., "haiku", "sonnet", "opus").
// Empty string means use Claude CLI default.
var DefaultModel = "haiku"

// DangerouslySkipPermissions enables --dangerously-skip-permissions flag.
// WARNING: Only use during development!
var DangerouslySkipPermissions = false

// EventHandler is the callback type invoked for each streaming event.
type EventHandler func(event StreamEvent)

// Cmd abstracts the subset of exec.Cmd used by Spawner.
type Cmd interface {
	StdoutPipe() (io.ReadCloser, error)
	Start() error
	Wait() error
	SetDir(dir string)
	SetEnv(env []string)
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
func (c *execCmd) SetEnv(env []string)                { c.cmd.Env = env }

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
	ConfigDir  string // CLAUDE_CONFIG_DIR environment variable (empty = use Claude default)
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
	args := buildArgs(prompt, "")
	return s.run(ctx, args, handler)
}

// SendPromptWithSession is like SendPrompt but resumes an existing session.
func (s *Spawner) SendPromptWithSession(ctx context.Context, prompt string, sessionID string, handler EventHandler) error {
	args := buildArgs(prompt, sessionID)
	return s.run(ctx, args, handler)
}

// buildArgs constructs the CLI arguments for claude.
func buildArgs(prompt string, sessionID string) []string {
	args := []string{"-p", "--output-format", "stream-json", "--verbose"}

	if DefaultModel != "" {
		args = append(args, "--model", DefaultModel)
	}

	if DangerouslySkipPermissions {
		args = append(args, "--dangerously-skip-permissions")
	}

	if sessionID != "" {
		args = append(args, "--resume", sessionID)
	}

	args = append(args, prompt)
	return args
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
	s.mu.Lock()
	if s.cmd != nil {
		s.mu.Unlock()
		log.Println("[SPAWNER] ERROR: a prompt is already running")
		return errors.New("a prompt is already running")
	}
	s.mu.Unlock()

	// Debug: Log the full command being executed
	log.Printf("[SPAWNER] Executing: %s %s", s.config.ClaudePath, strings.Join(args, " "))
	log.Printf("[SPAWNER] WorkingDir: %s", s.config.WorkingDir)
	log.Printf("[SPAWNER] DefaultModel: %q, DangerouslySkipPermissions: %v", DefaultModel, DangerouslySkipPermissions)

	cmd := s.cmdFactory(ctx, s.config.ClaudePath, args...)
	if s.config.WorkingDir != "" {
		cmd.SetDir(s.config.WorkingDir)
	}
	if s.config.ConfigDir != "" {
		// Inherit current environment and add CLAUDE_CONFIG_DIR
		env := append(os.Environ(), "CLAUDE_CONFIG_DIR="+s.config.ConfigDir)
		cmd.SetEnv(env)
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		log.Printf("[SPAWNER] ERROR stdout pipe: %v", err)
		return fmt.Errorf("stdout pipe: %w", err)
	}

	s.mu.Lock()
	s.cmd = cmd
	s.mu.Unlock()

	// Always clear s.cmd when done, even on error
	defer func() {
		s.mu.Lock()
		s.cmd = nil
		s.mu.Unlock()
		log.Println("[SPAWNER] Process cleanup complete")
	}()

	if err := cmd.Start(); err != nil {
		log.Printf("[SPAWNER] ERROR start claude: %v", err)
		return fmt.Errorf("start claude: %w", err)
	}
	log.Println("[SPAWNER] Process started, reading events...")

	eventCount := 0
	scanner := bufio.NewScanner(stdout)
	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}
		var event StreamEvent
		if err := json.Unmarshal(line, &event); err != nil {
			log.Printf("[SPAWNER] WARN invalid JSON line: %s", string(line))
			continue
		}
		eventCount++
		log.Printf("[SPAWNER] Event #%d: type=%s", eventCount, event.Type)
		handler(event)
	}

	log.Printf("[SPAWNER] Stream ended, received %d events", eventCount)

	if err := cmd.Wait(); err != nil {
		log.Printf("[SPAWNER] Process exited with error: %v", err)
		return fmt.Errorf("claude exited: %w", err)
	}

	log.Println("[SPAWNER] Process completed successfully")
	return nil
}
