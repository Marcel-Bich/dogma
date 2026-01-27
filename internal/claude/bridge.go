package claude

import "encoding/json"

// BridgeEvent is the frontend-friendly event struct emitted to JS via Wails EventsEmit.
// It flattens ParsedEvent into a simple structure suitable for JSON serialization.
type BridgeEvent struct {
	Type      string          `json:"type"`
	SessionID string          `json:"session_id,omitempty"`
	RequestID string          `json:"request_id,omitempty"`
	Text      string          `json:"text,omitempty"`
	Thinking  string          `json:"thinking,omitempty"`
	ToolName  string          `json:"tool_name,omitempty"`
	ToolInput json.RawMessage `json:"tool_input,omitempty"`
	IsError   bool            `json:"is_error,omitempty"`
	Result    string          `json:"result,omitempty"`
	Model     string          `json:"model,omitempty"`
	Subtype   string          `json:"subtype,omitempty"`
}

// ToBridgeEvent converts a ParsedEvent into a BridgeEvent for the frontend.
func ToBridgeEvent(ev ParsedEvent) BridgeEvent {
	be := BridgeEvent{
		Type: ev.Type,
	}

	switch {
	case ev.System != nil:
		be.SessionID = ev.System.SessionID
		be.Model = ev.System.Model
		be.Subtype = ev.System.Subtype

	case ev.Assistant != nil:
		for _, block := range ev.Assistant.Message.Content {
			switch block.Type {
			case "text":
				be.Text = block.Text
			case "thinking":
				be.Thinking = block.Thinking
			case "tool_use":
				be.ToolName = block.Name
				be.ToolInput = block.Input
			}
		}

	case ev.Result != nil:
		be.IsError = ev.Result.IsError
		be.Result = ev.Result.Result
		be.SessionID = ev.Result.SessionID
		be.Subtype = ev.Result.Subtype
	}

	return be
}
