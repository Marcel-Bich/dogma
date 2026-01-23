package claude

import "encoding/json"

// StreamEvent is the base envelope for all NDJSON stream events.
// The Type field determines which concrete event struct the Payload contains.
type StreamEvent struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"-"`
}

// UnmarshalJSON implements custom unmarshalling that captures the raw JSON
// as Payload while extracting the type field.
func (e *StreamEvent) UnmarshalJSON(data []byte) error {
	type envelope struct {
		Type string `json:"type"`
	}
	var env envelope
	if err := json.Unmarshal(data, &env); err != nil {
		return err
	}
	e.Type = env.Type
	e.Payload = json.RawMessage(data)
	return nil
}

// SystemEvent represents type="system" events (init, hooks).
type SystemEvent struct {
	Type      string   `json:"type"`
	Subtype   string   `json:"subtype,omitempty"`
	SessionID string   `json:"session_id,omitempty"`
	Tools     []string `json:"tools,omitempty"`
	Model     string   `json:"model,omitempty"`
}

// AssistantEvent represents type="assistant" events (model responses).
type AssistantEvent struct {
	Type    string           `json:"type"`
	Message AssistantMessage `json:"message"`
}

// AssistantMessage holds the content blocks and usage from an assistant event.
type AssistantMessage struct {
	Content []ContentBlock `json:"content"`
	Usage   *Usage         `json:"usage,omitempty"`
}

// ContentBlock represents a single content block in an assistant message.
// The Type field determines which optional fields are populated.
type ContentBlock struct {
	Type     string          `json:"type"`
	Text     string          `json:"text,omitempty"`
	Thinking string          `json:"thinking,omitempty"`
	Name     string          `json:"name,omitempty"`
	Input    json.RawMessage `json:"input,omitempty"`
}

// ResultEvent represents type="result" events (final completion).
type ResultEvent struct {
	Type         string  `json:"type"`
	Subtype      string  `json:"subtype,omitempty"`
	IsError      bool    `json:"is_error,omitempty"`
	Result       string  `json:"result,omitempty"`
	DurationMs   float64 `json:"duration_ms,omitempty"`
	NumTurns     int     `json:"num_turns,omitempty"`
	TotalCostUSD float64 `json:"total_cost_usd,omitempty"`
	SessionID    string  `json:"session_id,omitempty"`
	Usage        *Usage  `json:"usage,omitempty"`
}

// Usage holds token usage information.
type Usage struct {
	InputTokens              int `json:"input_tokens,omitempty"`
	OutputTokens             int `json:"output_tokens,omitempty"`
	CacheReadInputTokens     int `json:"cache_read_input_tokens,omitempty"`
	CacheCreationInputTokens int `json:"cache_creation_input_tokens,omitempty"`
}
