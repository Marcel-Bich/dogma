package claude

import (
	"encoding/json"
	"testing"
)

func TestParseEvent_EmptyLine(t *testing.T) {
	tests := []struct {
		name  string
		input []byte
	}{
		{"nil input", nil},
		{"empty bytes", []byte{}},
		{"whitespace only", []byte("   \t  ")},
		{"newline only", []byte("\n")},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ev, err := ParseEvent(tt.input)
			if err != nil {
				t.Fatalf("expected nil error, got: %v", err)
			}
			if ev.Type != "" {
				t.Fatalf("expected empty Type, got: %q", ev.Type)
			}
		})
	}
}

func TestParseEvent_InvalidJSON(t *testing.T) {
	tests := []struct {
		name  string
		input []byte
	}{
		{"garbage text", []byte("not json at all")},
		{"incomplete object", []byte(`{"type":"system"`)},
		{"invalid syntax", []byte(`{type: system}`)},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := ParseEvent(tt.input)
			if err == nil {
				t.Fatal("expected error for invalid JSON, got nil")
			}
		})
	}
}

func TestParseEvent_SystemInit(t *testing.T) {
	input := []byte(`{"type":"system","subtype":"init","session_id":"abc123","tools":["Bash","Read"],"model":"claude-opus-4-5-20251101"}`)

	ev, err := ParseEvent(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ev.Type != "system" {
		t.Fatalf("expected Type=system, got %q", ev.Type)
	}
	if ev.System == nil {
		t.Fatal("expected System to be non-nil")
	}
	if ev.System.Subtype != "init" {
		t.Errorf("expected Subtype=init, got %q", ev.System.Subtype)
	}
	if ev.System.SessionID != "abc123" {
		t.Errorf("expected SessionID=abc123, got %q", ev.System.SessionID)
	}
	if ev.System.Model != "claude-opus-4-5-20251101" {
		t.Errorf("expected Model=claude-opus-4-5-20251101, got %q", ev.System.Model)
	}
	if len(ev.System.Tools) != 2 || ev.System.Tools[0] != "Bash" || ev.System.Tools[1] != "Read" {
		t.Errorf("expected Tools=[Bash,Read], got %v", ev.System.Tools)
	}
	if ev.Raw == nil {
		t.Error("expected Raw to be set")
	}
	if ev.Assistant != nil {
		t.Error("expected Assistant to be nil for system event")
	}
	if ev.Result != nil {
		t.Error("expected Result to be nil for system event")
	}
}

func TestParseEvent_SystemHook(t *testing.T) {
	input := []byte(`{"type":"system","subtype":"hook_started","hook_id":"xxx","hook_name":"SessionStart:startup","hook_event":"SessionStart"}`)

	ev, err := ParseEvent(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ev.Type != "system" {
		t.Fatalf("expected Type=system, got %q", ev.Type)
	}
	if ev.System == nil {
		t.Fatal("expected System to be non-nil")
	}
	if ev.System.Subtype != "hook_started" {
		t.Errorf("expected Subtype=hook_started, got %q", ev.System.Subtype)
	}
}

func TestParseEvent_AssistantText(t *testing.T) {
	input := []byte(`{"type":"assistant","message":{"id":"msg_xxx","type":"message","role":"assistant","content":[{"type":"text","text":"Hello world."}],"usage":{"input_tokens":3,"output_tokens":2}}}`)

	ev, err := ParseEvent(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ev.Type != "assistant" {
		t.Fatalf("expected Type=assistant, got %q", ev.Type)
	}
	if ev.Assistant == nil {
		t.Fatal("expected Assistant to be non-nil")
	}
	if len(ev.Assistant.Message.Content) != 1 {
		t.Fatalf("expected 1 content block, got %d", len(ev.Assistant.Message.Content))
	}
	block := ev.Assistant.Message.Content[0]
	if block.Type != "text" {
		t.Errorf("expected block type=text, got %q", block.Type)
	}
	if block.Text != "Hello world." {
		t.Errorf("expected text='Hello world.', got %q", block.Text)
	}
	if ev.Assistant.Message.Usage == nil {
		t.Fatal("expected Usage to be non-nil")
	}
	if ev.Assistant.Message.Usage.InputTokens != 3 {
		t.Errorf("expected InputTokens=3, got %d", ev.Assistant.Message.Usage.InputTokens)
	}
	if ev.Assistant.Message.Usage.OutputTokens != 2 {
		t.Errorf("expected OutputTokens=2, got %d", ev.Assistant.Message.Usage.OutputTokens)
	}
	if ev.Raw == nil {
		t.Error("expected Raw to be set")
	}
	if ev.System != nil {
		t.Error("expected System to be nil for assistant event")
	}
	if ev.Result != nil {
		t.Error("expected Result to be nil for assistant event")
	}
}

func TestParseEvent_AssistantToolUse(t *testing.T) {
	input := []byte(`{"type":"assistant","message":{"id":"msg_xxx","type":"message","role":"assistant","content":[{"type":"tool_use","id":"tu_xxx","name":"Bash","input":{"command":"ls"}}]}}`)

	ev, err := ParseEvent(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ev.Type != "assistant" {
		t.Fatalf("expected Type=assistant, got %q", ev.Type)
	}
	if ev.Assistant == nil {
		t.Fatal("expected Assistant to be non-nil")
	}
	if len(ev.Assistant.Message.Content) != 1 {
		t.Fatalf("expected 1 content block, got %d", len(ev.Assistant.Message.Content))
	}
	block := ev.Assistant.Message.Content[0]
	if block.Type != "tool_use" {
		t.Errorf("expected block type=tool_use, got %q", block.Type)
	}
	if block.Name != "Bash" {
		t.Errorf("expected Name=Bash, got %q", block.Name)
	}
}

func TestParseEvent_ResultSuccess(t *testing.T) {
	input := []byte(`{"type":"result","subtype":"success","is_error":false,"duration_ms":3178,"num_turns":1,"result":"Hello world.","session_id":"abc123","total_cost_usd":0.19}`)

	ev, err := ParseEvent(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ev.Type != "result" {
		t.Fatalf("expected Type=result, got %q", ev.Type)
	}
	if ev.Result == nil {
		t.Fatal("expected Result to be non-nil")
	}
	if ev.Result.Subtype != "success" {
		t.Errorf("expected Subtype=success, got %q", ev.Result.Subtype)
	}
	if ev.Result.IsError {
		t.Error("expected IsError=false")
	}
	if ev.Result.DurationMs != 3178 {
		t.Errorf("expected DurationMs=3178, got %f", ev.Result.DurationMs)
	}
	if ev.Result.NumTurns != 1 {
		t.Errorf("expected NumTurns=1, got %d", ev.Result.NumTurns)
	}
	if ev.Result.Result != "Hello world." {
		t.Errorf("expected Result='Hello world.', got %q", ev.Result.Result)
	}
	if ev.Result.SessionID != "abc123" {
		t.Errorf("expected SessionID=abc123, got %q", ev.Result.SessionID)
	}
	if ev.Result.TotalCostUSD != 0.19 {
		t.Errorf("expected TotalCostUSD=0.19, got %f", ev.Result.TotalCostUSD)
	}
	if ev.Raw == nil {
		t.Error("expected Raw to be set")
	}
	if ev.System != nil {
		t.Error("expected System to be nil for result event")
	}
	if ev.Assistant != nil {
		t.Error("expected Assistant to be nil for result event")
	}
}

func TestParseEvent_ResultError(t *testing.T) {
	input := []byte(`{"type":"result","subtype":"error","is_error":true,"result":"Error: something failed","session_id":"abc123"}`)

	ev, err := ParseEvent(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ev.Type != "result" {
		t.Fatalf("expected Type=result, got %q", ev.Type)
	}
	if ev.Result == nil {
		t.Fatal("expected Result to be non-nil")
	}
	if ev.Result.Subtype != "error" {
		t.Errorf("expected Subtype=error, got %q", ev.Result.Subtype)
	}
	if !ev.Result.IsError {
		t.Error("expected IsError=true")
	}
	if ev.Result.Result != "Error: something failed" {
		t.Errorf("expected Result='Error: something failed', got %q", ev.Result.Result)
	}
}

func TestParseEvent_UnknownType(t *testing.T) {
	input := []byte(`{"type":"future_type","data":"something"}`)

	ev, err := ParseEvent(input)
	if err != nil {
		t.Fatalf("expected nil error for unknown type, got: %v", err)
	}
	if ev.Type != "future_type" {
		t.Fatalf("expected Type=future_type, got %q", ev.Type)
	}
	if ev.Raw == nil {
		t.Error("expected Raw to be set")
	}
	if ev.System != nil {
		t.Error("expected System to be nil for unknown type")
	}
	if ev.Assistant != nil {
		t.Error("expected Assistant to be nil for unknown type")
	}
	if ev.Result != nil {
		t.Error("expected Result to be nil for unknown type")
	}
	// Verify raw preserves original JSON
	var raw map[string]interface{}
	if err := json.Unmarshal(ev.Raw, &raw); err != nil {
		t.Fatalf("failed to unmarshal Raw: %v", err)
	}
	if raw["type"] != "future_type" {
		t.Errorf("expected raw type=future_type, got %v", raw["type"])
	}
}
