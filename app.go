package main

import (
	"context"
	"os"

	"github.com/Marcel-Bich/dogma/internal/claude"
	"github.com/Marcel-Bich/dogma/internal/updater"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// promptSpawner abstracts the Claude CLI spawner for testability.
type promptSpawner interface {
	SendPrompt(ctx context.Context, prompt string, handler claude.EventHandler) error
	SendPromptWithSession(ctx context.Context, prompt string, sessionID string, handler claude.EventHandler) error
	SendPromptContinue(ctx context.Context, prompt string, handler claude.EventHandler) error
	Cancel()
}

// eventEmitter abstracts Wails runtime.EventsEmit for testability.
type eventEmitter interface {
	Emit(eventName string, data ...interface{})
}

// sessionLister abstracts session listing for testability.
type sessionLister interface {
	ListSessions(projectPath string) ([]claude.SessionInfo, error)
}

// updateApplier abstracts the update apply call for testability.
type updateApplier func(ctx context.Context, info *updater.UpdateInfo) error

// wailsEmitter wraps the Wails runtime EventsEmit function.
type wailsEmitter struct {
	ctx context.Context
}

func (e *wailsEmitter) Emit(eventName string, data ...interface{}) {
	runtime.EventsEmit(e.ctx, eventName, data...)
}

// App struct
type App struct {
	ctx         context.Context
	spawner     promptSpawner
	lister      sessionLister
	emitter     eventEmitter
	applyUpdate updateApplier
	updateInfo  *updater.UpdateInfo
	workingDir  string
	getwdFunc   func() (string, error)
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
	a.lister = claude.NewSessionLister("")
	a.emitter = &wailsEmitter{ctx: ctx}
	a.applyUpdate = updater.ApplyUpdate

	go func() {
		info, err := updater.CheckForUpdate(ctx)
		if err != nil {
			runtime.LogWarning(ctx, "update check failed: "+err.Error())
			return
		}
		if info != nil {
			a.updateInfo = info
			runtime.EventsEmit(ctx, "app:update-available", info)
		}
	}()
}

// SendPrompt sends a prompt to Claude and streams events to the frontend.
func (a *App) SendPrompt(prompt string) {
	go a.streamPrompt(prompt, "")
}

// SendPromptWithSession sends a prompt to Claude resuming an existing session.
func (a *App) SendPromptWithSession(prompt string, sessionID string) {
	go a.streamPrompt(prompt, sessionID)
}

// ContinuePrompt resumes the most recent Claude session with a new prompt.
func (a *App) ContinuePrompt(prompt string) {
	go a.streamPromptContinue(prompt)
}

// CancelPrompt cancels the currently running Claude process.
func (a *App) CancelPrompt() {
	a.spawner.Cancel()
}

// ListSessions returns session metadata for the current project.
func (a *App) ListSessions() ([]claude.SessionInfo, error) {
	dir := a.workingDir
	if dir == "" {
		getwdFn := a.getwdFunc
		if getwdFn == nil {
			getwdFn = os.Getwd
		}
		cwd, err := getwdFn()
		if err != nil {
			return nil, err
		}
		dir = cwd
	}
	return a.lister.ListSessions(dir)
}

// ApplyUpdate downloads and applies the pending update.
func (a *App) ApplyUpdate() {
	if a.updateInfo == nil {
		a.emitter.Emit("app:update-error", "no update available")
		return
	}

	go func() {
		err := a.applyUpdate(a.ctx, a.updateInfo)
		if err != nil {
			a.emitter.Emit("app:update-error", err.Error())
			return
		}
		a.emitter.Emit("app:update-applied", a.updateInfo)
	}()
}

func (a *App) streamPrompt(prompt string, sessionID string) {
	handler := func(event claude.StreamEvent) {
		parsed, err := claude.ParseEvent(event.Payload)
		if err != nil || parsed.Type == "" {
			return
		}
		bridge := claude.ToBridgeEvent(parsed)
		a.emitter.Emit("claude:event", bridge)
	}

	var err error
	if sessionID == "" {
		err = a.spawner.SendPrompt(a.ctx, prompt, handler)
	} else {
		err = a.spawner.SendPromptWithSession(a.ctx, prompt, sessionID, handler)
	}

	if err != nil {
		a.emitter.Emit("claude:error", err.Error())
	} else {
		a.emitter.Emit("claude:done", nil)
	}
}

func (a *App) streamPromptContinue(prompt string) {
	handler := func(event claude.StreamEvent) {
		parsed, err := claude.ParseEvent(event.Payload)
		if err != nil || parsed.Type == "" {
			return
		}
		bridge := claude.ToBridgeEvent(parsed)
		a.emitter.Emit("claude:event", bridge)
	}

	err := a.spawner.SendPromptContinue(a.ctx, prompt, handler)
	if err != nil {
		a.emitter.Emit("claude:error", err.Error())
	} else {
		a.emitter.Emit("claude:done", nil)
	}
}
