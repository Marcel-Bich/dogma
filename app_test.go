package main

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/Marcel-Bich/dogma/internal/claude"
	"github.com/Marcel-Bich/dogma/internal/updater"
)

// --- Test doubles ---

type mockSpawner struct {
	mu             sync.Mutex
	sendPromptFn   func(ctx context.Context, prompt string, handler claude.EventHandler) error
	sendWithSessFn func(ctx context.Context, prompt string, sessionID string, handler claude.EventHandler) error
	cancelCalled   bool
}

func (m *mockSpawner) SendPrompt(ctx context.Context, prompt string, handler claude.EventHandler) error {
	if m.sendPromptFn != nil {
		return m.sendPromptFn(ctx, prompt, handler)
	}
	return nil
}

func (m *mockSpawner) SendPromptWithSession(ctx context.Context, prompt string, sessionID string, handler claude.EventHandler) error {
	if m.sendWithSessFn != nil {
		return m.sendWithSessFn(ctx, prompt, sessionID, handler)
	}
	return nil
}

func (m *mockSpawner) Cancel() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.cancelCalled = true
}

type emittedEvent struct {
	name string
	data []interface{}
}

type mockEmitter struct {
	mu     sync.Mutex
	events []emittedEvent
}

func (m *mockEmitter) Emit(eventName string, data ...interface{}) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.events = append(m.events, emittedEvent{name: eventName, data: data})
}

func (m *mockEmitter) getEvents() []emittedEvent {
	m.mu.Lock()
	defer m.mu.Unlock()
	cp := make([]emittedEvent, len(m.events))
	copy(cp, m.events)
	return cp
}

// --- streamPrompt tests ---

func TestStreamPrompt_NewSession_Success(t *testing.T) {
	emitter := &mockEmitter{}
	spawner := &mockSpawner{
		sendPromptFn: func(ctx context.Context, prompt string, handler claude.EventHandler) error {
			if prompt != "hello" {
				t.Errorf("expected prompt 'hello', got %q", prompt)
			}
			// Simulate a system init event
			payload := []byte(`{"type":"system","subtype":"init","session_id":"s1","model":"opus"}`)
			handler(claude.StreamEvent{Type: "system", Payload: json.RawMessage(payload)})
			return nil
		},
	}

	app := &App{
		ctx:     context.Background(),
		spawner: spawner,
		emitter: emitter,
	}

	app.streamPrompt("hello", "", "")

	events := emitter.getEvents()
	if len(events) != 2 {
		t.Fatalf("expected 2 events, got %d: %+v", len(events), events)
	}

	if events[0].name != "claude:event" {
		t.Errorf("expected first event name 'claude:event', got %q", events[0].name)
	}
	bridge, ok := events[0].data[0].(claude.BridgeEvent)
	if !ok {
		t.Fatalf("expected BridgeEvent, got %T", events[0].data[0])
	}
	if bridge.Type != "system" {
		t.Errorf("expected bridge type 'system', got %q", bridge.Type)
	}
	if bridge.SessionID != "s1" {
		t.Errorf("expected session_id 's1', got %q", bridge.SessionID)
	}

	if events[1].name != "claude:done" {
		t.Errorf("expected second event 'claude:done', got %q", events[1].name)
	}
}

func TestStreamPrompt_WithSession_Success(t *testing.T) {
	emitter := &mockEmitter{}
	spawner := &mockSpawner{
		sendWithSessFn: func(ctx context.Context, prompt string, sessionID string, handler claude.EventHandler) error {
			if prompt != "continue" {
				t.Errorf("expected prompt 'continue', got %q", prompt)
			}
			if sessionID != "sess-42" {
				t.Errorf("expected sessionID 'sess-42', got %q", sessionID)
			}
			return nil
		},
	}

	app := &App{
		ctx:     context.Background(),
		spawner: spawner,
		emitter: emitter,
	}

	app.streamPrompt("continue", "sess-42", "")

	events := emitter.getEvents()
	if len(events) != 1 {
		t.Fatalf("expected 1 event (claude:done), got %d: %+v", len(events), events)
	}
	if events[0].name != "claude:done" {
		t.Errorf("expected 'claude:done', got %q", events[0].name)
	}
}

func TestStreamPrompt_NewSession_Error(t *testing.T) {
	emitter := &mockEmitter{}
	spawner := &mockSpawner{
		sendPromptFn: func(ctx context.Context, prompt string, handler claude.EventHandler) error {
			return errors.New("spawn failed")
		},
	}

	app := &App{
		ctx:     context.Background(),
		spawner: spawner,
		emitter: emitter,
	}

	app.streamPrompt("hello", "", "")

	events := emitter.getEvents()
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d: %+v", len(events), events)
	}
	if events[0].name != "claude:error" {
		t.Errorf("expected 'claude:error', got %q", events[0].name)
	}
	if events[0].data[0] != "spawn failed" {
		t.Errorf("expected error message 'spawn failed', got %v", events[0].data[0])
	}
}

func TestStreamPrompt_WithSession_Error(t *testing.T) {
	emitter := &mockEmitter{}
	spawner := &mockSpawner{
		sendWithSessFn: func(ctx context.Context, prompt string, sessionID string, handler claude.EventHandler) error {
			return errors.New("session error")
		},
	}

	app := &App{
		ctx:     context.Background(),
		spawner: spawner,
		emitter: emitter,
	}

	app.streamPrompt("test", "sess-99", "")

	events := emitter.getEvents()
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].name != "claude:error" {
		t.Errorf("expected 'claude:error', got %q", events[0].name)
	}
	if events[0].data[0] != "session error" {
		t.Errorf("expected 'session error', got %v", events[0].data[0])
	}
}

func TestStreamPrompt_Handler_ParseError(t *testing.T) {
	emitter := &mockEmitter{}
	spawner := &mockSpawner{
		sendPromptFn: func(ctx context.Context, prompt string, handler claude.EventHandler) error {
			// Send invalid JSON payload
			handler(claude.StreamEvent{Type: "system", Payload: json.RawMessage(`{invalid`)})
			return nil
		},
	}

	app := &App{
		ctx:     context.Background(),
		spawner: spawner,
		emitter: emitter,
	}

	app.streamPrompt("hello", "", "")

	events := emitter.getEvents()
	// Only claude:done should be emitted (parse error is silently skipped)
	if len(events) != 1 {
		t.Fatalf("expected 1 event (claude:done), got %d: %+v", len(events), events)
	}
	if events[0].name != "claude:done" {
		t.Errorf("expected 'claude:done', got %q", events[0].name)
	}
}

func TestStreamPrompt_Handler_EmptyType(t *testing.T) {
	emitter := &mockEmitter{}
	spawner := &mockSpawner{
		sendPromptFn: func(ctx context.Context, prompt string, handler claude.EventHandler) error {
			// Send event with no type field (empty after parse)
			handler(claude.StreamEvent{Type: "", Payload: json.RawMessage(`{"foo":"bar"}`)})
			return nil
		},
	}

	app := &App{
		ctx:     context.Background(),
		spawner: spawner,
		emitter: emitter,
	}

	app.streamPrompt("hello", "", "")

	events := emitter.getEvents()
	// Only claude:done should be emitted (empty type is skipped)
	if len(events) != 1 {
		t.Fatalf("expected 1 event (claude:done), got %d: %+v", len(events), events)
	}
	if events[0].name != "claude:done" {
		t.Errorf("expected 'claude:done', got %q", events[0].name)
	}
}

func TestStreamPrompt_Handler_MultipleEvents(t *testing.T) {
	emitter := &mockEmitter{}
	spawner := &mockSpawner{
		sendPromptFn: func(ctx context.Context, prompt string, handler claude.EventHandler) error {
			// System init
			handler(claude.StreamEvent{
				Type:    "system",
				Payload: json.RawMessage(`{"type":"system","subtype":"init","session_id":"s1","model":"opus"}`),
			})
			// Assistant text
			handler(claude.StreamEvent{
				Type:    "assistant",
				Payload: json.RawMessage(`{"type":"assistant","message":{"content":[{"type":"text","text":"hi"}]}}`),
			})
			// Result
			handler(claude.StreamEvent{
				Type:    "result",
				Payload: json.RawMessage(`{"type":"result","subtype":"success","result":"done","session_id":"s1"}`),
			})
			return nil
		},
	}

	app := &App{
		ctx:     context.Background(),
		spawner: spawner,
		emitter: emitter,
	}

	app.streamPrompt("multi", "", "")

	events := emitter.getEvents()
	// 3 claude:event + 1 claude:done
	if len(events) != 4 {
		t.Fatalf("expected 4 events, got %d: %+v", len(events), events)
	}
	for i := 0; i < 3; i++ {
		if events[i].name != "claude:event" {
			t.Errorf("event[%d]: expected 'claude:event', got %q", i, events[i].name)
		}
	}
	if events[3].name != "claude:done" {
		t.Errorf("expected last event 'claude:done', got %q", events[3].name)
	}
}

// --- CancelPrompt tests ---

func TestCancelPrompt(t *testing.T) {
	spawner := &mockSpawner{}
	app := &App{
		spawner: spawner,
	}

	app.CancelPrompt()

	spawner.mu.Lock()
	defer spawner.mu.Unlock()
	if !spawner.cancelCalled {
		t.Error("expected Cancel() to be called on spawner")
	}
}

// --- SendPrompt / SendPromptWithSession tests (goroutine launchers) ---

func TestSendPrompt_LaunchesGoroutine(t *testing.T) {
	emitter := &mockEmitter{}
	spawner := &mockSpawner{
		sendPromptFn: func(ctx context.Context, prompt string, handler claude.EventHandler) error {
			return nil
		},
	}

	app := &App{
		ctx:     context.Background(),
		spawner: spawner,
		emitter: emitter,
	}

	app.SendPrompt("test")

	// Wait for goroutine to complete
	time.Sleep(50 * time.Millisecond)

	events := emitter.getEvents()
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].name != "claude:done" {
		t.Errorf("expected 'claude:done', got %q", events[0].name)
	}
}

func TestSendPromptWithSession_LaunchesGoroutine(t *testing.T) {
	emitter := &mockEmitter{}
	spawner := &mockSpawner{
		sendWithSessFn: func(ctx context.Context, prompt string, sessionID string, handler claude.EventHandler) error {
			return nil
		},
	}

	app := &App{
		ctx:     context.Background(),
		spawner: spawner,
		emitter: emitter,
	}

	app.SendPromptWithSession("test", "s1")

	// Wait for goroutine to complete
	time.Sleep(50 * time.Millisecond)

	events := emitter.getEvents()
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].name != "claude:done" {
		t.Errorf("expected 'claude:done', got %q", events[0].name)
	}
}

// --- ApplyUpdate tests ---

func TestApplyUpdate_NoUpdateInfo(t *testing.T) {
	emitter := &mockEmitter{}
	app := &App{
		ctx:        context.Background(),
		emitter:    emitter,
		updateInfo: nil,
	}

	app.ApplyUpdate()

	events := emitter.getEvents()
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].name != "app:update-error" {
		t.Errorf("expected 'app:update-error', got %q", events[0].name)
	}
	if events[0].data[0] != "no update available" {
		t.Errorf("expected 'no update available', got %v", events[0].data[0])
	}
}

func TestApplyUpdate_Success(t *testing.T) {
	emitter := &mockEmitter{}
	info := &updater.UpdateInfo{Version: "1.2.3"}
	app := &App{
		ctx:        context.Background(),
		emitter:    emitter,
		updateInfo: info,
		applyUpdate: func(ctx context.Context, i *updater.UpdateInfo) error {
			if i.Version != "1.2.3" {
				t.Errorf("expected version '1.2.3', got %q", i.Version)
			}
			return nil
		},
	}

	app.ApplyUpdate()

	// Wait for goroutine
	time.Sleep(50 * time.Millisecond)

	events := emitter.getEvents()
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d: %+v", len(events), events)
	}
	if events[0].name != "app:update-applied" {
		t.Errorf("expected 'app:update-applied', got %q", events[0].name)
	}
	gotInfo, ok := events[0].data[0].(*updater.UpdateInfo)
	if !ok {
		t.Fatalf("expected *updater.UpdateInfo, got %T", events[0].data[0])
	}
	if gotInfo.Version != "1.2.3" {
		t.Errorf("expected version '1.2.3', got %q", gotInfo.Version)
	}
}

func TestApplyUpdate_Error(t *testing.T) {
	emitter := &mockEmitter{}
	info := &updater.UpdateInfo{Version: "1.2.3"}
	app := &App{
		ctx:        context.Background(),
		emitter:    emitter,
		updateInfo: info,
		applyUpdate: func(ctx context.Context, i *updater.UpdateInfo) error {
			return errors.New("download failed")
		},
	}

	app.ApplyUpdate()

	// Wait for goroutine
	time.Sleep(50 * time.Millisecond)

	events := emitter.getEvents()
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d: %+v", len(events), events)
	}
	if events[0].name != "app:update-error" {
		t.Errorf("expected 'app:update-error', got %q", events[0].name)
	}
	if events[0].data[0] != "download failed" {
		t.Errorf("expected 'download failed', got %v", events[0].data[0])
	}
}

// --- mockSessionLister ---

type mockSessionLister struct {
	listSessionsFn func(projectPath string) ([]claude.SessionInfo, error)
}

func (m *mockSessionLister) ListSessions(projectPath string) ([]claude.SessionInfo, error) {
	if m.listSessionsFn != nil {
		return m.listSessionsFn(projectPath)
	}
	return nil, nil
}

// --- ListSessions tests ---

func TestListSessions_CallsListerWithCorrectPath(t *testing.T) {
	var calledPath string
	lister := &mockSessionLister{
		listSessionsFn: func(projectPath string) ([]claude.SessionInfo, error) {
			calledPath = projectPath
			return []claude.SessionInfo{}, nil
		},
	}

	app := &App{
		lister:     lister,
		workingDir: "/home/user/project",
	}

	_, _ = app.ListSessions()

	if calledPath != "/home/user/project" {
		t.Errorf("expected lister called with '/home/user/project', got %q", calledPath)
	}
}

func TestListSessions_ReturnsSessionList(t *testing.T) {
	expected := []claude.SessionInfo{
		{ID: "sess-1", Summary: "first session"},
		{ID: "sess-2", Summary: "second session"},
	}
	lister := &mockSessionLister{
		listSessionsFn: func(projectPath string) ([]claude.SessionInfo, error) {
			return expected, nil
		},
	}

	app := &App{
		lister:     lister,
		workingDir: "/some/path",
	}

	result, err := app.ListSessions()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 2 {
		t.Fatalf("expected 2 sessions, got %d", len(result))
	}
	if result[0].ID != "sess-1" {
		t.Errorf("expected first session ID 'sess-1', got %q", result[0].ID)
	}
	if result[1].ID != "sess-2" {
		t.Errorf("expected second session ID 'sess-2', got %q", result[1].ID)
	}
}

func TestListSessions_PropagatesErrors(t *testing.T) {
	lister := &mockSessionLister{
		listSessionsFn: func(projectPath string) ([]claude.SessionInfo, error) {
			return nil, errors.New("listing failed")
		},
	}

	app := &App{
		lister:     lister,
		workingDir: "/some/path",
	}

	result, err := app.ListSessions()
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if err.Error() != "listing failed" {
		t.Errorf("expected error 'listing failed', got %q", err.Error())
	}
	if result != nil {
		t.Errorf("expected nil result on error, got %v", result)
	}
}

func TestListSessions_UsesWorkingDirWhenSet(t *testing.T) {
	var calledPath string
	lister := &mockSessionLister{
		listSessionsFn: func(projectPath string) ([]claude.SessionInfo, error) {
			calledPath = projectPath
			return []claude.SessionInfo{}, nil
		},
	}

	app := &App{
		lister:     lister,
		workingDir: "/custom/work/dir",
	}

	_, _ = app.ListSessions()

	if calledPath != "/custom/work/dir" {
		t.Errorf("expected workingDir '/custom/work/dir', got %q", calledPath)
	}
}

func TestListSessions_FallsBackToGetwdWhenWorkingDirEmpty(t *testing.T) {
	var calledPath string
	lister := &mockSessionLister{
		listSessionsFn: func(projectPath string) ([]claude.SessionInfo, error) {
			calledPath = projectPath
			return []claude.SessionInfo{}, nil
		},
	}

	app := &App{
		lister:     lister,
		workingDir: "", // empty - should fall back to os.Getwd()
	}

	_, _ = app.ListSessions()

	// os.Getwd() returns the current working directory; it should not be empty
	if calledPath == "" {
		t.Error("expected non-empty project path from os.Getwd() fallback")
	}
}

func TestListSessions_GetwdError(t *testing.T) {
	lister := &mockSessionLister{
		listSessionsFn: func(projectPath string) ([]claude.SessionInfo, error) {
			t.Fatal("lister should not be called when getwd fails")
			return nil, nil
		},
	}

	app := &App{
		lister:     lister,
		workingDir: "",
		getwdFunc: func() (string, error) {
			return "", errors.New("getwd failed")
		},
	}

	result, err := app.ListSessions()
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if err.Error() != "getwd failed" {
		t.Errorf("expected 'getwd failed', got %q", err.Error())
	}
	if result != nil {
		t.Errorf("expected nil result, got %v", result)
	}
}

// --- Request ID tests ---

func TestStreamPrompt_AddsRequestIDToAllEvents(t *testing.T) {
	emitter := &mockEmitter{}
	spawner := &mockSpawner{
		sendPromptFn: func(ctx context.Context, prompt string, handler claude.EventHandler) error {
			handler(claude.StreamEvent{Payload: []byte(`{"type":"system","session_id":"s1"}`)})
			handler(claude.StreamEvent{Payload: []byte(`{"type":"assistant","message":{"content":[{"type":"text","text":"hi"}]}}`)})
			return nil
		},
	}

	app := &App{
		ctx:     context.Background(),
		spawner: spawner,
		emitter: emitter,
	}

	app.streamPrompt("hello", "", "req-123")

	events := emitter.getEvents()
	if len(events) != 3 {
		t.Fatalf("expected 3 events, got %d: %+v", len(events), events)
	}

	// Check that all claude:event events have the request ID
	for i, ev := range events {
		if ev.name == "claude:event" {
			bridge, ok := ev.data[0].(claude.BridgeEvent)
			if !ok {
				t.Fatalf("event[%d]: expected BridgeEvent, got %T", i, ev.data[0])
			}
			if bridge.RequestID != "req-123" {
				t.Errorf("event[%d]: expected RequestID 'req-123', got %q", i, bridge.RequestID)
			}
		}
	}
}

func TestSendPromptWithRequestId_LaunchesGoroutine(t *testing.T) {
	emitter := &mockEmitter{}
	spawner := &mockSpawner{
		sendPromptFn: func(ctx context.Context, prompt string, handler claude.EventHandler) error {
			if prompt != "test" {
				t.Errorf("expected prompt 'test', got %q", prompt)
			}
			return nil
		},
	}

	app := &App{
		ctx:     context.Background(),
		spawner: spawner,
		emitter: emitter,
	}

	app.SendPromptWithRequestId("test", "req-456")

	// Wait for goroutine to complete
	time.Sleep(50 * time.Millisecond)

	events := emitter.getEvents()
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].name != "claude:done" {
		t.Errorf("expected 'claude:done', got %q", events[0].name)
	}
}

func TestSendPromptWithSessionAndRequestId_LaunchesGoroutine(t *testing.T) {
	emitter := &mockEmitter{}
	spawner := &mockSpawner{
		sendWithSessFn: func(ctx context.Context, prompt string, sessionID string, handler claude.EventHandler) error {
			if prompt != "continue" {
				t.Errorf("expected prompt 'continue', got %q", prompt)
			}
			if sessionID != "sess-abc" {
				t.Errorf("expected sessionID 'sess-abc', got %q", sessionID)
			}
			return nil
		},
	}

	app := &App{
		ctx:     context.Background(),
		spawner: spawner,
		emitter: emitter,
	}

	app.SendPromptWithSessionAndRequestId("continue", "sess-abc", "req-789")

	// Wait for goroutine to complete
	time.Sleep(50 * time.Millisecond)

	events := emitter.getEvents()
	if len(events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(events))
	}
	if events[0].name != "claude:done" {
		t.Errorf("expected 'claude:done', got %q", events[0].name)
	}
}
