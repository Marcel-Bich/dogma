# Developer Setup

Instructions for developers working on this project.

## Running the Project

```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..

# Start development server (Go + Vite)
wails dev
```

## Development Modes

The frontend automatically detects which backend to use:

| URL | Backend | Use Case |
|-----|---------|----------|
| `http://localhost:5173` | MockBackend | Pure frontend development |
| `http://localhost:34115` | Go Backend | Full integration testing |
| Native Wails window | Go Backend | Production-like environment |

### Why MockBackend?

The mock exists for faster frontend iteration:

- **Faster HMR** - Vite hot-reload without Go recompilation
- **No API key needed** - UI work without Claude credentials
- **Isolated tests** - Frontend tests run without Go environment
- **CI-friendly** - Frontend pipeline needs no Go setup

For integration testing or real Claude interaction, use port 34115 or the native window.

## Activate Git Hooks

**Automatic:** Hooks are activated automatically when running `npm install`.

**Manual:** If not using npm, run once after cloning:

```bash
git config core.hooksPath .githooks
```

### Available Hooks

| Hook | Function |
|------|----------|
| `pre-commit` | Checks version mismatches between `plugin.yaml` and `.claude-plugin/plugin.json` |

### Deactivate Hooks

```bash
git config --unset core.hooksPath
```

## Git Configuration

Run once after cloning to suppress warnings about ignored files (prevents accidental `-f` adds):

```bash
git config advice.addIgnoredFile false
```

## Workflow

1. **Make changes**
2. **Bump version** - Update both files:
   - `plugins/<name>/plugin.yaml`
   - `plugins/<name>/.claude-plugin/plugin.json`
3. **Commit** - Hook automatically checks for mismatches

On mismatch: Run `/dogma:versioning` to fix.
