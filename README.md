# AI Studio

Local AI **workbench** — a creative workshop where ideas are forged before Council judges them.

## Phase 3 — Blacksmith Workspace

Opening AI Studio lands you in **The Blacksmith**: a conversational creative partner centered on one question:

> **What are we making today?**

### Blacksmith modes

| Mode | Purpose |
|------|---------|
| **Forge** | Shape raw ideas into workable concepts |
| **Discovery** | Explore the problem space before committing |
| **Constraint Forge** | Turn limits into creative fuel |
| **Infinite Improvement** | Iterate relentlessly |
| **Framework Forge** | Build scaffolds and mental models |

During conversation, a **Forge Artifacts** sidebar auto-populates:

- Key Insights · Constraints · Assumptions · Risks · Opportunities · Next Questions

Sessions are stored as structured objects in `C:\AI\AIStudio\sessions\blacksmith\` and can be packaged into **Council Briefs** at `C:\AI\AIStudio\council-briefs\` via **Send to Council**.

When Council marks a brief `needs-work`, return to the originating Blacksmith session with one click.

### Workshops (not Projects)

Independent creations — Foundry, AI Academy, Fern & Friend, etc. — are **Workshops**, not components of AI Studio. Configure in `settings.yaml` → `workshops.entries`.

### Phase 3.5 — Image Studio UX

AI Studio is the primary image interface. ComfyUI executes in the background.

- **Gallery** — watches `C:\AI\StabilityMatrix\Data\Images`, newest first, infinite scroll, auto-updates via chokidar
- **Fullscreen viewer** — zoom, pan, wheel zoom, next/prev, delete, reveal, copy image/prompt
- **Generate panel** — prompt, negative, style, aspect presets (incl. Legion Wallpaper 2560×1600), resolution, Generate / ×4 / Variations
- **Open Advanced (ComfyUI)** — power-user escape hatch
- **SQLite history** — searchable metadata at `C:\AI\AIStudio\registry\images.sqlite`
- **Quick actions** — folder, reveal, viewer, upscale, variations, reuse prompt, send to Blacksmith

### Preserved from Phase 3

- Tool launchers (Council, ComfyUI, Stability Matrix, Ollama, Cursor)
- Service health checks
- Tools & Workshops dashboard
- Dark theme · read-only external integration

### Development

```bash
cd C:\Dev\AI-Studio
npm install
npm run dev
```

Opens Electron with Vite on **http://127.0.0.1:5174**. Requires **Ollama** for Blacksmith conversation (`blacksmith.model` in settings.yaml).

### Desktop launch

Double-click the **AI Studio** desktop shortcut (create with `scripts\Create-Desktop-Shortcut.ps1`) or run `scripts\Launch-AI-Studio.bat`.

The desktop launcher opens **AI Studio only** and prepares **background services** automatically (Ollama and ComfyUI). Council OS is an on-demand application — it starts silently when you open it from the workbench, not at startup.

### Hub layout

```
C:\AI\AIStudio\
├── config\settings.yaml
├── sessions\blacksmith\     # Blacksmith sessions
├── council-briefs\          # Council handoff packages
└── logs\studio.log
```

See [docs/AI_STUDIO_ARCHITECTURE.md](./docs/AI_STUDIO_ARCHITECTURE.md).

## License

MIT
