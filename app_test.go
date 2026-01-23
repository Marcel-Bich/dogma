package main

import (
	"encoding/json"
	"testing"

	"github.com/Marcel-Bich/dogma/internal/claude"
)

func TestToBridgeEvent_SystemInit(t *testing.T) {
	input := []byte(`{"type":"system","subtype":"init","session_id":"abc123","tools":["Bash","Read"],"model":"claude-opus-4-5-20251101"}`)

	parsed, err := claude.ParseEvent(input)
	if err != nil {
		t.Fatalf("ParseEvent failed: %v", err)
	}

	be := claude.ToBridgeEvent(parsed)

	if be.Type != "system" {
		t.Errorf("expected Type=system, got %q", be.Type)
	}
	if be.SessionID != "abc123" {
		t.Errorf("expected SessionID=abc123, got %q", be.SessionID)
	}
	if be.Model != "claude-opus-4-5-20251101" {
		t.Errorf("expected Model=claude-opus-4-5-20251101, got %q", be.Model)
	}
	if be.Subtype != "init" {
		t.Errorf("expected Subtype=init, got %q", be.Subtype)
	}
	if be.Text != "" {
		t.Errorf("expected empty Text, got %q", be.Text)
	}
	if be.Result != "" {
		t.Errorf("expected empty Result, got %q", be.Result)
	}
}

func TestToBridgeEvent_AssistantText(t *testing.T) {
	input := []byte(`{"type":"assistant","message":{"id":"msg_xxx","type":"message","role":"assistant","content":[{"type":"text","text":"Hello world."}],"usage":{"input_tokens":3,"output_tokens":2}}}`)

	parsed, err := claude.ParseEvent(input)
	if err != nil {
		t.Fatalf("ParseEvent failed: %v", err)
	}

	be := claude.ToBridgeEvent(parsed)

	if be.Type != "assistant" {
		t.Errorf("expected Type=assistant, got %q", be.Type)
	}
	if be.Text != "Hello world." {
		t.Errorf("expected Text='Hello world.', got %q", be.Text)
	}
	if be.Thinking != "" {
		t.Errorf("expected empty Thinking, got %q", be.Thinking)
	}
	if be.ToolName != "" {
		t.Errorf("expected empty ToolName, got %q", be.ToolName)
	}
}

func TestToBridgeEvent_AssistantThinking(t *testing.T) {
	input := []byte(`{"type":"assistant","message":{"id":"msg_xxx","type":"message","role":"assistant","content":[{"type":"thinking","thinking":"Let me consider..."}]}}`)

	parsed, err := claude.ParseEvent(input)
	if err != nil {
		t.Fatalf("ParseEvent failed: %v", err)
	}

	be := claude.ToBridgeEvent(parsed)

	if be.Type != "assistant" {
		t.Errorf("expected Type=assistant, got %q", be.Type)
	}
	if be.Thinking != "Let me consider..." {
		t.Errorf("expected Thinking='Let me consider...', got %q", be.Thinking)
	}
	if be.Text != "" {
		t.Errorf("expected empty Text, got %q", be.Text)
	}
}

func TestToBridgeEvent_AssistantToolUse(t *testing.T) {
	input := []byte(`{"type":"assistant","message":{"id":"msg_xxx","type":"message","role":"assistant","content":[{"type":"tool_use","id":"tu_xxx","name":"Bash","input":{"command":"ls"}}]}}`)

	parsed, err := claude.ParseEvent(input)
	if err != nil {
		t.Fatalf("ParseEvent failed: %v", err)
	}

	be := claude.ToBridgeEvent(parsed)

	if be.Type != "assistant" {
		t.Errorf("expected Type=assistant, got %q", be.Type)
	}
	if be.ToolName != "Bash" {
		t.Errorf("expected ToolName=Bash, got %q", be.ToolName)
	}
	if be.ToolInput == nil {
		t.Fatal("expected ToolInput to be non-nil")
	}
	var toolInput map[string]interface{}
	if err := json.Unmarshal(be.ToolInput, &toolInput); err != nil {
		t.Fatalf("failed to unmarshal ToolInput: %v", err)
	}
	if toolInput["command"] != "ls" {
		t.Errorf("expected command=ls, got %v", toolInput["command"])
	}
}

func TestToBridgeEvent_ResultSuccess(t *testing.T) {
	input := []byte(`{"type":"result","subtype":"success","is_error":false,"duration_ms":3178,"num_turns":1,"result":"Hello world.","session_id":"abc123","total_cost_usd":0.19}`)

	parsed, err := claude.ParseEvent(input)
	if err != nil {
		t.Fatalf("ParseEvent failed: %v", err)
	}

	be := claude.ToBridgeEvent(parsed)

	if be.Type != "result" {
		t.Errorf("expected Type=result, got %q", be.Type)
	}
	if be.IsError {
		t.Error("expected IsError=false")
	}
	if be.Result != "Hello world." {
		t.Errorf("expected Result='Hello world.', got %q", be.Result)
	}
	if be.SessionID != "abc123" {
		t.Errorf("expected SessionID=abc123, got %q", be.SessionID)
	}
	if be.Subtype != "success" {
		t.Errorf("expected Subtype=success, got %q", be.Subtype)
	}
}

func TestToBridgeEvent_ResultError(t *testing.T) {
	input := []byte(`{"type":"result","subtype":"error","is_error":true,"result":"Error: something failed","session_id":"abc123"}`)

	parsed, err := claude.ParseEvent(input)
	if err != nil {
		t.Fatalf("ParseEvent failed: %v", err)
	}

	be := claude.ToBridgeEvent(parsed)

	if be.Type != "result" {
		t.Errorf("expected Type=result, got %q", be.Type)
	}
	if !be.IsError {
		t.Error("expected IsError=true")
	}
	if be.Result != "Error: something failed" {
		t.Errorf("expected Result='Error: something failed', got %q", be.Result)
	}
	if be.Subtype != "error" {
		t.Errorf("expected Subtype=error, got %q", be.Subtype)
	}
}
