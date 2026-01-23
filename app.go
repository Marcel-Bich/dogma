package main

import (
	"context"
	"encoding/json"

	"github.com/Marcel-Bich/dogma/internal/claude"
)

// App struct
type App struct {
	ctx     context.Context
	spawner *claude.Spawner
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.spawner = claude.NewSpawner(claude.SpawnerConfig{
		ClaudePath: "claude",
	})
}

// SendPrompt sends a prompt to Claude and returns the final result text.
func (a *App) SendPrompt(prompt string) string {
	var result string

	err := a.spawner.SendPrompt(a.ctx, prompt, func(event claude.StreamEvent) {
		if event.Type == "result" {
			var re claude.ResultEvent
			if err := json.Unmarshal(event.Payload, &re); err == nil {
				result = re.Result
			}
		}
	})

	if err != nil {
		return "error: " + err.Error()
	}
	return result
}
