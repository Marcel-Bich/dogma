package claude

import (
	"bytes"
	"encoding/json"
	"fmt"
)

// ParsedEvent holds a parsed NDJSON stream event with the concrete typed struct
// accessible via the corresponding pointer field.
type ParsedEvent struct {
	Type      string
	System    *SystemEvent
	Assistant *AssistantEvent
	Result    *ResultEvent
	Raw       json.RawMessage
}

// ParseEvent parses a single NDJSON line into a typed ParsedEvent.
// Empty or whitespace-only lines return a zero ParsedEvent with nil error.
// Invalid JSON returns an error. Unknown types are preserved in Raw without error.
func ParseEvent(line []byte) (ParsedEvent, error) {
	trimmed := bytes.TrimSpace(line)
	if len(trimmed) == 0 {
		return ParsedEvent{}, nil
	}

	var env StreamEvent
	if err := json.Unmarshal(trimmed, &env); err != nil {
		return ParsedEvent{}, fmt.Errorf("parse event: %w", err)
	}

	parsed := ParsedEvent{
		Type: env.Type,
		Raw:  json.RawMessage(trimmed),
	}

	switch env.Type {
	case "system":
		var ev SystemEvent
		if err := json.Unmarshal(trimmed, &ev); err != nil {
			return ParsedEvent{}, fmt.Errorf("parse system event: %w", err)
		}
		parsed.System = &ev

	case "assistant":
		var ev AssistantEvent
		if err := json.Unmarshal(trimmed, &ev); err != nil {
			return ParsedEvent{}, fmt.Errorf("parse assistant event: %w", err)
		}
		parsed.Assistant = &ev

	case "result":
		var ev ResultEvent
		if err := json.Unmarshal(trimmed, &ev); err != nil {
			return ParsedEvent{}, fmt.Errorf("parse result event: %w", err)
		}
		parsed.Result = &ev
	}

	return parsed, nil
}
