package claude

import (
	"bytes"
	"context"
	"errors"
	"io"
	"os"
	"strings"
	"sync"
	"testing"
)

// mockCmd implements the Cmd interface for testing.
type mockCmd struct {
	mu          sync.Mutex
	dir         string
	env         []string
	stdout      io.ReadCloser
	pipeErr     error
	startErr    error
	waitErr     error
	signalCalls []os.Signal
	started     bool
}

func (m *mockCmd) StdoutPipe() (io.ReadCloser, error) {
	if m.pipeErr != nil {
		return nil, m.pipeErr
	}
	return m.stdout, nil
}

func (m *mockCmd) Start() error {
	if m.startErr != nil {
		return m.startErr
	}
	m.started = true
	return nil
}

func (m *mockCmd) Wait() error {
	return m.waitErr
}

func (m *mockCmd) SetDir(dir string) {
	m.dir = dir
}

func (m *mockCmd) SetEnv(env []string) {
	m.env = env
}

func (m *mockCmd) Signal(sig os.Signal) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.signalCalls = append(m.signalCalls, sig)
	return nil
}

func newMockFactory(cmd *mockCmd) CmdFactory {
	return func(ctx context.Context, name string, args ...string) Cmd {
		return cmd
	}
}

func TestNewSpawner_DefaultClaudePath(t *testing.T) {
	s := NewSpawner(SpawnerConfig{})
	if s.config.ClaudePath != "claude" {
		t.Errorf("expected ClaudePath=claude, got %q", s.config.ClaudePath)
	}
	if s.cmdFactory == nil {
		t.Error("expected cmdFactory to be set")
	}
}

func TestNewSpawner_CustomClaudePath(t *testing.T) {
	s := NewSpawner(SpawnerConfig{ClaudePath: "/usr/local/bin/claude"})
	if s.config.ClaudePath != "/usr/local/bin/claude" {
		t.Errorf("expected ClaudePath=/usr/local/bin/claude, got %q", s.config.ClaudePath)
	}
}

func TestSendPrompt_Success(t *testing.T) {
	ndjson := `{"type":"system","subtype":"init","session_id":"s1"}` + "\n" +
		`{"type":"assistant","message":{"content":[{"type":"text","text":"hi"}]}}` + "\n" +
		`{"type":"result","result":"done","session_id":"s1"}` + "\n"

	mock := &mockCmd{
		stdout: io.NopCloser(bytes.NewBufferString(ndjson)),
	}

	s := &Spawner{
		config:     SpawnerConfig{ClaudePath: "claude"},
		cmdFactory: newMockFactory(mock),
	}

	var events []StreamEvent
	handler := func(ev StreamEvent) {
		events = append(events, ev)
	}

	err := s.SendPrompt(context.Background(), "hello", handler)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(events) != 3 {
		t.Fatalf("expected 3 events, got %d", len(events))
	}
	if events[0].Type != "system" {
		t.Errorf("expected first event type=system, got %q", events[0].Type)
	}
	if events[1].Type != "assistant" {
		t.Errorf("expected second event type=assistant, got %q", events[1].Type)
	}
	if events[2].Type != "result" {
		t.Errorf("expected third event type=result, got %q", events[2].Type)
	}
}

func TestSendPrompt_WithWorkingDir(t *testing.T) {
	mock := &mockCmd{
		stdout: io.NopCloser(bytes.NewBufferString("")),
	}

	s := &Spawner{
		config:     SpawnerConfig{ClaudePath: "claude", WorkingDir: "/tmp/work"},
		cmdFactory: newMockFactory(mock),
	}

	err := s.SendPrompt(context.Background(), "hello", func(ev StreamEvent) {})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if mock.dir != "/tmp/work" {
		t.Errorf("expected dir=/tmp/work, got %q", mock.dir)
	}
}

func TestSendPrompt_NoWorkingDir(t *testing.T) {
	mock := &mockCmd{
		stdout: io.NopCloser(bytes.NewBufferString("")),
	}

	s := &Spawner{
		config:     SpawnerConfig{ClaudePath: "claude"},
		cmdFactory: newMockFactory(mock),
	}

	err := s.SendPrompt(context.Background(), "hello", func(ev StreamEvent) {})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if mock.dir != "" {
		t.Errorf("expected empty dir, got %q", mock.dir)
	}
}

func TestSendPrompt_StdoutPipeError(t *testing.T) {
	mock := &mockCmd{
		pipeErr: errors.New("pipe broken"),
	}

	s := &Spawner{
		config:     SpawnerConfig{ClaudePath: "claude"},
		cmdFactory: newMockFactory(mock),
	}

	err := s.SendPrompt(context.Background(), "hello", func(ev StreamEvent) {})
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "stdout pipe") {
		t.Errorf("expected error to contain 'stdout pipe', got: %v", err)
	}
}

func TestSendPrompt_StartError(t *testing.T) {
	mock := &mockCmd{
		stdout:   io.NopCloser(bytes.NewBufferString("")),
		startErr: errors.New("exec: not found"),
	}

	s := &Spawner{
		config:     SpawnerConfig{ClaudePath: "claude"},
		cmdFactory: newMockFactory(mock),
	}

	err := s.SendPrompt(context.Background(), "hello", func(ev StreamEvent) {})
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "start claude") {
		t.Errorf("expected error to contain 'start claude', got: %v", err)
	}
}

func TestSendPrompt_WaitError(t *testing.T) {
	mock := &mockCmd{
		stdout:  io.NopCloser(bytes.NewBufferString("")),
		waitErr: errors.New("exit status 1"),
	}

	s := &Spawner{
		config:     SpawnerConfig{ClaudePath: "claude"},
		cmdFactory: newMockFactory(mock),
	}

	err := s.SendPrompt(context.Background(), "hello", func(ev StreamEvent) {})
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "claude exited") {
		t.Errorf("expected error to contain 'claude exited', got: %v", err)
	}
}

func TestSendPrompt_EmptyAndInvalidLines(t *testing.T) {
	// Mix of empty lines, invalid JSON, and valid events
	ndjson := "\n" +
		"not json\n" +
		`{"type":"system","subtype":"init"}` + "\n" +
		"\n" +
		"{broken json\n" +
		`{"type":"result","result":"ok"}` + "\n"

	mock := &mockCmd{
		stdout: io.NopCloser(bytes.NewBufferString(ndjson)),
	}

	s := &Spawner{
		config:     SpawnerConfig{ClaudePath: "claude"},
		cmdFactory: newMockFactory(mock),
	}

	var events []StreamEvent
	handler := func(ev StreamEvent) {
		events = append(events, ev)
	}

	err := s.SendPrompt(context.Background(), "hello", handler)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Only the 2 valid JSON lines should produce events
	if len(events) != 2 {
		t.Fatalf("expected 2 events, got %d", len(events))
	}
	if events[0].Type != "system" {
		t.Errorf("expected first event type=system, got %q", events[0].Type)
	}
	if events[1].Type != "result" {
		t.Errorf("expected second event type=result, got %q", events[1].Type)
	}
}

func TestSendPromptWithSession_Success(t *testing.T) {
	ndjson := `{"type":"result","result":"resumed","session_id":"existing-sess"}` + "\n"

	mock := &mockCmd{
		stdout: io.NopCloser(bytes.NewBufferString(ndjson)),
	}

	s := &Spawner{
		config:     SpawnerConfig{ClaudePath: "claude"},
		cmdFactory: newMockFactory(mock),
	}

	var events []StreamEvent
	handler := func(ev StreamEvent) {
		events = append(events, ev)
	}

	err := s.SendPromptWithSession(context.Background(), "continue", "existing-sess", handler)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].Type != "result" {
		t.Errorf("expected event type=result, got %q", events[0].Type)
	}
}

func TestCancel_WithRunningCmd(t *testing.T) {
	mock := &mockCmd{}

	s := &Spawner{
		config:     SpawnerConfig{ClaudePath: "claude"},
		cmdFactory: newMockFactory(mock),
		cmd:        mock,
	}

	s.Cancel()

	mock.mu.Lock()
	defer mock.mu.Unlock()
	if len(mock.signalCalls) != 1 {
		t.Fatalf("expected 1 signal call, got %d", len(mock.signalCalls))
	}
}

func TestCancel_WithNoCmd(t *testing.T) {
	s := &Spawner{
		config:     SpawnerConfig{ClaudePath: "claude"},
		cmdFactory: defaultCmdFactory,
	}

	// Should not panic
	s.Cancel()
}

func TestSendPrompt_ClearsCmd(t *testing.T) {
	mock := &mockCmd{
		stdout: io.NopCloser(bytes.NewBufferString("")),
	}

	s := &Spawner{
		config:     SpawnerConfig{ClaudePath: "claude"},
		cmdFactory: newMockFactory(mock),
	}

	err := s.SendPrompt(context.Background(), "hello", func(ev StreamEvent) {})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// After successful run, cmd should be cleared
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.cmd != nil {
		t.Error("expected cmd to be nil after successful run")
	}
}

func TestExecCmd_Integration(t *testing.T) {
	// Test the real execCmd wrapper with a lightweight command.
	// This covers the execCmd methods and defaultCmdFactory.
	cmd := defaultCmdFactory(context.Background(), "printf", `{"type":"system"}\n`)

	cmd.SetDir("/tmp")

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		t.Fatalf("StdoutPipe error: %v", err)
	}

	if err := cmd.Start(); err != nil {
		t.Fatalf("Start error: %v", err)
	}

	buf := make([]byte, 1024)
	n, _ := stdout.Read(buf)
	if n == 0 {
		t.Error("expected output from printf")
	}

	if err := cmd.Wait(); err != nil {
		t.Fatalf("Wait error: %v", err)
	}
}

func TestExecCmd_SetEnv_Integration(t *testing.T) {
	// Test that SetEnv correctly passes environment to the child process.
	// Use sh -c 'echo $VAR' to verify the environment variable is set.
	cmd := defaultCmdFactory(context.Background(), "sh", "-c", "echo $TEST_VAR")

	cmd.SetEnv([]string{"TEST_VAR=hello_from_test"})

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		t.Fatalf("StdoutPipe error: %v", err)
	}

	if err := cmd.Start(); err != nil {
		t.Fatalf("Start error: %v", err)
	}

	buf := make([]byte, 1024)
	n, _ := stdout.Read(buf)
	if n == 0 {
		t.Error("expected output from sh")
	}

	output := strings.TrimSpace(string(buf[:n]))
	if output != "hello_from_test" {
		t.Errorf("expected 'hello_from_test', got %q", output)
	}

	if err := cmd.Wait(); err != nil {
		t.Fatalf("Wait error: %v", err)
	}
}

func TestExecCmd_Signal_NoProcess(t *testing.T) {
	// Test Signal on an execCmd that has not been started (Process is nil)
	cmd := defaultCmdFactory(context.Background(), "true")
	err := cmd.Signal(os.Kill)
	if err != nil {
		t.Errorf("expected nil error for Signal on unstarted cmd, got: %v", err)
	}
}

func TestExecCmd_Signal_WithProcess(t *testing.T) {
	// Start a process that waits, then signal it
	cmd := defaultCmdFactory(context.Background(), "sleep", "10")
	_, err := cmd.StdoutPipe()
	if err != nil {
		t.Fatalf("StdoutPipe error: %v", err)
	}
	if err := cmd.Start(); err != nil {
		t.Fatalf("Start error: %v", err)
	}

	// Signal the running process
	if err := cmd.Signal(os.Kill); err != nil {
		t.Errorf("Signal error: %v", err)
	}

	// Wait will return error since we killed it
	_ = cmd.Wait()
}

func TestSendPrompt_ConcurrentCallsReturnsError(t *testing.T) {
	// Create a mock that blocks on Wait() to simulate a long-running command
	waitCh := make(chan struct{})
	startedCh := make(chan struct{})
	mock := &mockCmd{
		stdout:  io.NopCloser(bytes.NewBufferString("")),
		waitErr: nil,
	}

	// Override Wait to block until channel is closed
	blockingMock := &blockingMockCmd{
		mockCmd:   mock,
		waitCh:    waitCh,
		startedCh: startedCh,
	}

	callCount := 0
	s := &Spawner{
		config: SpawnerConfig{ClaudePath: "claude"},
		cmdFactory: func(ctx context.Context, name string, args ...string) Cmd {
			callCount++
			return blockingMock
		},
	}

	// Start first prompt in goroutine (will block on Wait)
	errCh := make(chan error, 1)
	go func() {
		errCh <- s.SendPrompt(context.Background(), "first", func(ev StreamEvent) {})
	}()

	// Wait until the first command has started and is blocking on Wait
	<-startedCh

	// Second concurrent call should return error immediately
	err := s.SendPrompt(context.Background(), "second", func(ev StreamEvent) {})
	if err == nil {
		t.Fatal("expected error for concurrent call, got nil")
	}
	if err.Error() != "a prompt is already running" {
		t.Errorf("expected error 'a prompt is already running', got: %v", err)
	}

	// Verify only one command was created
	if callCount != 1 {
		t.Errorf("expected cmdFactory called once, got %d", callCount)
	}

	// Unblock the first call
	close(waitCh)

	// First call should complete successfully
	if err := <-errCh; err != nil {
		t.Errorf("first call should succeed, got: %v", err)
	}

	// After first completes, a new call should work
	mock2 := &mockCmd{
		stdout: io.NopCloser(bytes.NewBufferString("")),
	}
	s.cmdFactory = newMockFactory(mock2)

	err = s.SendPrompt(context.Background(), "third", func(ev StreamEvent) {})
	if err != nil {
		t.Errorf("third call should succeed after first completes, got: %v", err)
	}
}

// blockingMockCmd wraps mockCmd but blocks on Wait until channel is closed
type blockingMockCmd struct {
	*mockCmd
	waitCh    chan struct{}
	startedCh chan struct{}
	once      sync.Once
}

func (m *blockingMockCmd) Wait() error {
	m.once.Do(func() {
		close(m.startedCh)
	})
	<-m.waitCh
	return m.mockCmd.Wait()
}

func TestBuildArgs_DefaultValues(t *testing.T) {
	// Save and restore original values
	origModel := DefaultModel
	origSkip := DangerouslySkipPermissions
	defer func() {
		DefaultModel = origModel
		DangerouslySkipPermissions = origSkip
	}()

	DefaultModel = ""
	DangerouslySkipPermissions = false

	args := buildArgs("hello", "")
	expected := []string{"-p", "--output-format", "stream-json", "--verbose", "hello"}

	if len(args) != len(expected) {
		t.Fatalf("expected %d args, got %d: %v", len(expected), len(args), args)
	}
	for i, arg := range expected {
		if args[i] != arg {
			t.Errorf("args[%d] = %q, want %q", i, args[i], arg)
		}
	}
}

func TestBuildArgs_WithModel(t *testing.T) {
	origModel := DefaultModel
	origSkip := DangerouslySkipPermissions
	defer func() {
		DefaultModel = origModel
		DangerouslySkipPermissions = origSkip
	}()

	DefaultModel = "haiku"
	DangerouslySkipPermissions = false

	args := buildArgs("hello", "")

	// Check that --model haiku is present
	hasModel := false
	for i, arg := range args {
		if arg == "--model" && i+1 < len(args) && args[i+1] == "haiku" {
			hasModel = true
			break
		}
	}
	if !hasModel {
		t.Errorf("expected --model haiku in args: %v", args)
	}
}

func TestBuildArgs_WithDangerouslySkipPermissions(t *testing.T) {
	origModel := DefaultModel
	origSkip := DangerouslySkipPermissions
	defer func() {
		DefaultModel = origModel
		DangerouslySkipPermissions = origSkip
	}()

	DefaultModel = ""
	DangerouslySkipPermissions = true

	args := buildArgs("hello", "")

	// Check that --dangerously-skip-permissions is present
	hasFlag := false
	for _, arg := range args {
		if arg == "--dangerously-skip-permissions" {
			hasFlag = true
			break
		}
	}
	if !hasFlag {
		t.Errorf("expected --dangerously-skip-permissions in args: %v", args)
	}
}

func TestBuildArgs_WithSessionID(t *testing.T) {
	origModel := DefaultModel
	origSkip := DangerouslySkipPermissions
	defer func() {
		DefaultModel = origModel
		DangerouslySkipPermissions = origSkip
	}()

	DefaultModel = ""
	DangerouslySkipPermissions = false

	args := buildArgs("hello", "sess-123")

	// Check that --resume sess-123 is present
	hasSession := false
	for i, arg := range args {
		if arg == "--resume" && i+1 < len(args) && args[i+1] == "sess-123" {
			hasSession = true
			break
		}
	}
	if !hasSession {
		t.Errorf("expected --resume sess-123 in args: %v", args)
	}
}

func TestBuildArgs_AllOptions(t *testing.T) {
	origModel := DefaultModel
	origSkip := DangerouslySkipPermissions
	defer func() {
		DefaultModel = origModel
		DangerouslySkipPermissions = origSkip
	}()

	DefaultModel = "opus"
	DangerouslySkipPermissions = true

	args := buildArgs("test prompt", "sess-456")

	// Verify all expected flags are present
	checks := map[string]bool{
		"--model":                        false,
		"--dangerously-skip-permissions": false,
		"--resume":                       false,
	}

	for i, arg := range args {
		if arg == "--model" && i+1 < len(args) && args[i+1] == "opus" {
			checks["--model"] = true
		}
		if arg == "--dangerously-skip-permissions" {
			checks["--dangerously-skip-permissions"] = true
		}
		if arg == "--resume" && i+1 < len(args) && args[i+1] == "sess-456" {
			checks["--resume"] = true
		}
	}

	for flag, found := range checks {
		if !found {
			t.Errorf("expected %s in args: %v", flag, args)
		}
	}

	// Last arg should be the prompt
	if args[len(args)-1] != "test prompt" {
		t.Errorf("expected last arg to be prompt, got %q", args[len(args)-1])
	}
}

func TestSendPrompt_WithConfigDir(t *testing.T) {
	mock := &mockCmd{
		stdout: io.NopCloser(bytes.NewBufferString("")),
	}

	s := &Spawner{
		config:     SpawnerConfig{ClaudePath: "claude", ConfigDir: "/home/user/.claude-work"},
		cmdFactory: newMockFactory(mock),
	}

	err := s.SendPrompt(context.Background(), "hello", func(ev StreamEvent) {})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Check that CLAUDE_CONFIG_DIR was set in the environment
	found := false
	for _, env := range mock.env {
		if env == "CLAUDE_CONFIG_DIR=/home/user/.claude-work" {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected CLAUDE_CONFIG_DIR=/home/user/.claude-work in env, got: %v", mock.env)
	}
}

func TestSendPrompt_NoConfigDir(t *testing.T) {
	mock := &mockCmd{
		stdout: io.NopCloser(bytes.NewBufferString("")),
	}

	s := &Spawner{
		config:     SpawnerConfig{ClaudePath: "claude"},
		cmdFactory: newMockFactory(mock),
	}

	err := s.SendPrompt(context.Background(), "hello", func(ev StreamEvent) {})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Check that CLAUDE_CONFIG_DIR was NOT set
	for _, env := range mock.env {
		if strings.HasPrefix(env, "CLAUDE_CONFIG_DIR=") {
			t.Errorf("expected no CLAUDE_CONFIG_DIR in env, but found: %s", env)
		}
	}
}

func TestSendPrompt_ConfigDirInheritsEnvironment(t *testing.T) {
	mock := &mockCmd{
		stdout: io.NopCloser(bytes.NewBufferString("")),
	}

	s := &Spawner{
		config:     SpawnerConfig{ClaudePath: "claude", ConfigDir: "/custom/path"},
		cmdFactory: newMockFactory(mock),
	}

	err := s.SendPrompt(context.Background(), "hello", func(ev StreamEvent) {})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// When ConfigDir is set, env should contain both inherited env vars and CLAUDE_CONFIG_DIR
	// The mock should have env set (not nil/empty)
	if mock.env == nil {
		t.Error("expected env to be set when ConfigDir is specified")
	}

	// PATH should be inherited (exists in almost all environments)
	hasPath := false
	hasConfigDir := false
	for _, env := range mock.env {
		if strings.HasPrefix(env, "PATH=") {
			hasPath = true
		}
		if env == "CLAUDE_CONFIG_DIR=/custom/path" {
			hasConfigDir = true
		}
	}

	if !hasPath {
		t.Error("expected inherited PATH in env")
	}
	if !hasConfigDir {
		t.Error("expected CLAUDE_CONFIG_DIR=/custom/path in env")
	}
}
