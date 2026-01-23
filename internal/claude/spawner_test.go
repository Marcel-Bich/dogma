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
	mu         sync.Mutex
	dir        string
	stdout     io.ReadCloser
	pipeErr    error
	startErr   error
	waitErr    error
	signalCalls []os.Signal
	started    bool
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
