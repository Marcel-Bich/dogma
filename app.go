package main

import (
	"context"

	"github.com/Marcel-Bich/dogma/internal/claude"
	"github.com/wailsapp/wails/v2/pkg/runtime"
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

// SendPrompt sends a prompt to Claude and streams events to the frontend.
func (a *App) SendPrompt(prompt string) {
	go a.streamPrompt(prompt, "")
}

// SendPromptWithSession sends a prompt to Claude resuming an existing session.
func (a *App) SendPromptWithSession(prompt string, sessionID string) {
	go a.streamPrompt(prompt, sessionID)
}

// CancelPrompt cancels the currently running Claude process.
func (a *App) CancelPrompt() {
	a.spawner.Cancel()
}

func (a *App) streamPrompt(prompt string, sessionID string) {
	handler := func(event claude.StreamEvent) {
		parsed, err := claude.ParseEvent(event.Payload)
		if err != nil || parsed.Type == "" {
			return
		}
		bridge := claude.ToBridgeEvent(parsed)
		runtime.EventsEmit(a.ctx, "claude:event", bridge)
	}

	var err error
	if sessionID == "" {
		err = a.spawner.SendPrompt(a.ctx, prompt, handler)
	} else {
		err = a.spawner.SendPromptWithSession(a.ctx, prompt, sessionID, handler)
	}

	if err != nil {
		runtime.EventsEmit(a.ctx, "claude:error", err.Error())
	} else {
		runtime.EventsEmit(a.ctx, "claude:done", nil)
	}
}
