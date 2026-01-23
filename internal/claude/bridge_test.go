package claude

import (
	"encoding/json"
	"testing"
)

func TestToBridgeEvent_SystemEvent(t *testing.T) {
	ev := ParsedEvent{
		Type: "system",
		System: &SystemEvent{
			Type:      "system",
			Subtype:   "init",
			SessionID: "sess-123",
			Model:     "claude-opus-4-5-20251101",
		},
	}

	be := ToBridgeEvent(ev)

	if be.Type != "system" {
		t.Errorf("expected Type=system, got %q", be.Type)
	}
	if be.SessionID != "sess-123" {
		t.Errorf("expected SessionID=sess-123, got %q", be.SessionID)
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
	if be.Thinking != "" {
		t.Errorf("expected empty Thinking, got %q", be.Thinking)
	}
	if be.ToolName != "" {
		t.Errorf("expected empty ToolName, got %q", be.ToolName)
	}
}

func TestToBridgeEvent_AssistantText(t *testing.T) {
	ev := ParsedEvent{
		Type: "assistant",
		Assistant: &AssistantEvent{
			Type: "assistant",
			Message: AssistantMessage{
				Content: []ContentBlock{
					{Type: "text", Text: "Hello world"},
				},
			},
		},
	}

	be := ToBridgeEvent(ev)

	if be.Type != "assistant" {
		t.Errorf("expected Type=assistant, got %q", be.Type)
	}
	if be.Text != "Hello world" {
		t.Errorf("expected Text='Hello world', got %q", be.Text)
	}
	if be.Thinking != "" {
		t.Errorf("expected empty Thinking, got %q", be.Thinking)
	}
	if be.ToolName != "" {
		t.Errorf("expected empty ToolName, got %q", be.ToolName)
	}
}

func TestToBridgeEvent_AssistantThinking(t *testing.T) {
	ev := ParsedEvent{
		Type: "assistant",
		Assistant: &AssistantEvent{
			Type: "assistant",
			Message: AssistantMessage{
				Content: []ContentBlock{
					{Type: "thinking", Thinking: "Let me think about this..."},
				},
			},
		},
	}

	be := ToBridgeEvent(ev)

	if be.Type != "assistant" {
		t.Errorf("expected Type=assistant, got %q", be.Type)
	}
	if be.Thinking != "Let me think about this..." {
		t.Errorf("expected Thinking='Let me think about this...', got %q", be.Thinking)
	}
	if be.Text != "" {
		t.Errorf("expected empty Text, got %q", be.Text)
	}
}

func TestToBridgeEvent_AssistantToolUse(t *testing.T) {
	input := json.RawMessage(`{"command":"ls -la"}`)
	ev := ParsedEvent{
		Type: "assistant",
		Assistant: &AssistantEvent{
			Type: "assistant",
			Message: AssistantMessage{
				Content: []ContentBlock{
					{Type: "tool_use", Name: "Bash", Input: input},
				},
			},
		},
	}

	be := ToBridgeEvent(ev)

	if be.Type != "assistant" {
		t.Errorf("expected Type=assistant, got %q", be.Type)
	}
	if be.ToolName != "Bash" {
		t.Errorf("expected ToolName=Bash, got %q", be.ToolName)
	}
	if string(be.ToolInput) != `{"command":"ls -la"}` {
		t.Errorf("expected ToolInput={\"command\":\"ls -la\"}, got %q", string(be.ToolInput))
	}
	if be.Text != "" {
		t.Errorf("expected empty Text, got %q", be.Text)
	}
}

func TestToBridgeEvent_AssistantMultipleBlocks(t *testing.T) {
	input := json.RawMessage(`{"path":"/tmp"}`)
	ev := ParsedEvent{
		Type: "assistant",
		Assistant: &AssistantEvent{
			Type: "assistant",
			Message: AssistantMessage{
				Content: []ContentBlock{
					{Type: "thinking", Thinking: "Planning..."},
					{Type: "text", Text: "Here is the result"},
					{Type: "tool_use", Name: "Read", Input: input},
				},
			},
		},
	}

	be := ToBridgeEvent(ev)

	// Last block of each type wins for text/thinking/tool
	if be.Thinking != "Planning..." {
		t.Errorf("expected Thinking='Planning...', got %q", be.Thinking)
	}
	if be.Text != "Here is the result" {
		t.Errorf("expected Text='Here is the result', got %q", be.Text)
	}
	if be.ToolName != "Read" {
		t.Errorf("expected ToolName=Read, got %q", be.ToolName)
	}
}

func TestToBridgeEvent_AssistantUnknownBlockType(t *testing.T) {
	ev := ParsedEvent{
		Type: "assistant",
		Assistant: &AssistantEvent{
			Type: "assistant",
			Message: AssistantMessage{
				Content: []ContentBlock{
					{Type: "unknown_block_type", Text: "ignored"},
				},
			},
		},
	}

	be := ToBridgeEvent(ev)

	if be.Type != "assistant" {
		t.Errorf("expected Type=assistant, got %q", be.Type)
	}
	// Unknown block types should not populate any fields
	if be.Text != "" {
		t.Errorf("expected empty Text, got %q", be.Text)
	}
	if be.Thinking != "" {
		t.Errorf("expected empty Thinking, got %q", be.Thinking)
	}
	if be.ToolName != "" {
		t.Errorf("expected empty ToolName, got %q", be.ToolName)
	}
}

func TestToBridgeEvent_AssistantEmptyContent(t *testing.T) {
	ev := ParsedEvent{
		Type: "assistant",
		Assistant: &AssistantEvent{
			Type: "assistant",
			Message: AssistantMessage{
				Content: []ContentBlock{},
			},
		},
	}

	be := ToBridgeEvent(ev)

	if be.Type != "assistant" {
		t.Errorf("expected Type=assistant, got %q", be.Type)
	}
	if be.Text != "" {
		t.Errorf("expected empty Text, got %q", be.Text)
	}
}

func TestToBridgeEvent_ResultSuccess(t *testing.T) {
	ev := ParsedEvent{
		Type: "result",
		Result: &ResultEvent{
			Type:      "result",
			Subtype:   "success",
			IsError:   false,
			Result:    "Done.",
			SessionID: "sess-456",
		},
	}

	be := ToBridgeEvent(ev)

	if be.Type != "result" {
		t.Errorf("expected Type=result, got %q", be.Type)
	}
	if be.IsError {
		t.Error("expected IsError=false")
	}
	if be.Result != "Done." {
		t.Errorf("expected Result='Done.', got %q", be.Result)
	}
	if be.SessionID != "sess-456" {
		t.Errorf("expected SessionID=sess-456, got %q", be.SessionID)
	}
	if be.Subtype != "success" {
		t.Errorf("expected Subtype=success, got %q", be.Subtype)
	}
}

func TestToBridgeEvent_ResultError(t *testing.T) {
	ev := ParsedEvent{
		Type: "result",
		Result: &ResultEvent{
			Type:      "result",
			Subtype:   "error",
			IsError:   true,
			Result:    "Something went wrong",
			SessionID: "sess-789",
		},
	}

	be := ToBridgeEvent(ev)

	if be.Type != "result" {
		t.Errorf("expected Type=result, got %q", be.Type)
	}
	if !be.IsError {
		t.Error("expected IsError=true")
	}
	if be.Result != "Something went wrong" {
		t.Errorf("expected Result='Something went wrong', got %q", be.Result)
	}
	if be.SessionID != "sess-789" {
		t.Errorf("expected SessionID=sess-789, got %q", be.SessionID)
	}
}

func TestToBridgeEvent_NoSpecificEvent(t *testing.T) {
	// A ParsedEvent with no System/Assistant/Result set (e.g., unknown type)
	ev := ParsedEvent{
		Type: "future_type",
	}

	be := ToBridgeEvent(ev)

	if be.Type != "future_type" {
		t.Errorf("expected Type=future_type, got %q", be.Type)
	}
	if be.SessionID != "" {
		t.Errorf("expected empty SessionID, got %q", be.SessionID)
	}
	if be.Text != "" {
		t.Errorf("expected empty Text, got %q", be.Text)
	}
	if be.Result != "" {
		t.Errorf("expected empty Result, got %q", be.Result)
	}
}
