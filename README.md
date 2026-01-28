<h1 align="center">dogma</h1>

<p align="center">
  <img src="screenshots/current-state.png" alt="dogma - current state" width="800">
</p>

<p align="center">
  <a href="https://github.com/Marcel-Bich/marcel-bich-claude-marketplace"><img src="https://img.shields.io/badge/Claude_Code_Marketplace-da6c49?style=for-the-badge" alt="Claude Code Marketplace"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-2ea44f?style=for-the-badge" alt="License"></a>
  <a href="https://github.com/Marcel-Bich/dogma/stargazers"><img src="https://img.shields.io/github/stars/Marcel-Bich/dogma?style=for-the-badge&logo=github" alt="GitHub Stars"></a>
  <a href="#"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FMarcel-Bich%2Fdogma%2Fmain%2F.github%2Fclone-stats.json&query=%24.total_clones&label=Clones/Installs&style=for-the-badge&logo=github" alt="Total Clones"></a>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/EXPERIMENTAL-ff6b35?style=for-the-badge" alt="Experimental"></a>
  <a href="https://www.paypal.me/marcelbich"><img src="https://img.shields.io/badge/Support_my_work-PayPal-fec740?style=for-the-badge&logo=paypal" alt="Support my work"></a>
</p>

<p align="center">
  <strong>EXPERIMENTAL - Native Desktop UI for Claude Code</strong>
</p>

<p align="center">
  A Wails desktop application that wraps Claude Code's headless mode (<code>claude -p</code>)<br>
  in a native Preact/Tailwind UI with real-time NDJSON streaming.
</p>

## What is this?

Dogma is an experimental desktop client for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). It spawns Claude Code as a headless child process and renders the streaming output in a native desktop window.

**This is NOT a replacement for Claude Code CLI.** It's an experiment to prove that Claude Code can be controlled headless and rendered in a custom UI.

**Looking for the Claude Code Plugin Marketplace?** See [marcel-bich-claude-marketplace](https://github.com/Marcel-Bich/marcel-bich-claude-marketplace).

## Status

EXPERIMENTAL - Active development, not ready for production use.

## Tech Stack

- **Backend:** Go + Wails v2 (propably going v3 if stable enough)
- **Frontend:** Preact + TypeScript + Vite 6 + Tailwind CSS v4
- **Streaming:** NDJSON parsing via bufio.Scanner
- **Distribution:** Cross-platform binaries (Linux, macOS, Windows)

## Development

```bash
# Prerequisites: Go 1.23+, Node 20+, Wails CLI
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# Dev mode (hot-reload)
wails dev

# Production build
wails build
```

## License

MIT - See [LICENSE](LICENSE) for full terms.

## Name, Logo, Trademarks (No endorsement)

The source code is licensed under MIT. However, the project name "dogma" and branding assets are not covered by the MIT License.

Trademark rights are not granted by the MIT License. Using the project name or branding in ways that suggest endorsement, official affiliation, or sponsorship is not permitted.

Forks and derivative works must use a different name and their own branding. A clear statement that your project is not official and not affiliated is required.

See [TRADEMARK.md](TRADEMARK.md) for the full trademark policy.

---

## Star History

<a href="https://www.star-history.com/#Marcel-Bich/dogma&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=Marcel-Bich/dogma&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=Marcel-Bich/dogma&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=Marcel-Bich/dogma&type=date&legend=top-left" />
 </picture>
</a>

---

<details>
<summary>Keywords / Tags</summary>

Claude Code, Claude Code Desktop, Claude Code UI, Claude Code Client, Wails, Wails v2, Go Desktop App, Preact, Tailwind CSS, NDJSON Streaming, Headless Claude, Claude Spawner, Native Desktop, Cross-Platform, Anthropic, AI Desktop Client, Marcel Bich, dogma

</details>
