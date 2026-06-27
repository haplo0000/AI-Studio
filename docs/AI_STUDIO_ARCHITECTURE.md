# AI Studio — Architecture & Implementation Plan (v1.0)

**Status:** Planning only — no production code  
**Date:** 2026-06-27  
**Author:** Architecture review draft  
**Scope:** Unified launcher and management layer for local AI tools on Windows 11

---

## 1. Executive Summary

AI Studio is a **desktop control plane** for a local AI workstation. It does not replace Council OS, ComfyUI, Stability Matrix, Ollama, Project Foundry, or Market Climatology. It **orchestrates, monitors, and connects** them through shared configuration, health checks, outputs, and logs.

The working ComfyUI installation at `C:\AI\StabilityMatrix` is **frozen** unless a future module requires a non-breaking integration point (health URL, launch script, output folder). Image generation continues to run through Stability Matrix → ComfyUI unchanged.

AI Studio’s first shippable milestone is a **thin but reliable shell**: one window, one tray icon, service health, module launchers, and a shared config layer. Rich in-app UIs for each module come later via embedding, deep links, or iframe where safe.

---

## 2. Goals & Non-Goals

### Goals

| Goal | Description |
|------|-------------|
| **Single entry point** | One desktop app to start, stop, and monitor all AI services |
| **Modular growth** | Add Video Studio, Voice Studio, etc. without redesigning the core |
| **Shared infrastructure** | Common settings, model registry, output index, structured logs |
| **Preserve investments** | Reuse Council OS, ComfyUI workflows, Ollama models, Foundry/Climatology contexts |
| **Workstation-grade UX** | Dark UI, persistent layout, GPU/service visibility, minimal click-to-work |

### Non-Goals (Phase 2)

- Rewriting ComfyUI, Stability Matrix, or Council OS internals
- Centralizing all inference into one runtime (each tool keeps its engine)
- Cloud sync or multi-user deployment
- Replacing Cursor/IDE for Project Foundry development
- Production implementation in this phase

---

## 3. Current State Inventory

### Verified components

| Component | Location / Access | Role | Launch pattern |
|-----------|-------------------|------|----------------|
| **Council OS** | `C:\Dev\Council-OS` | Multi-model deliberation (Solo + Council) | `launcher.vbs` → `start-council-os.bat` → Ollama + Vite `:5173` |
| **Stability Matrix** | `C:\AI\StabilityMatrix` | Model/package manager for diffusion stack | `StabilityMatrix.exe` |
| **ComfyUI** | `...\Data\Packages\ComfyUI` | Image generation UI + API | SM launch or `Scripts\Launch-ComfyUI-Optimized.bat` → `:8188` |
| **Ollama** | PATH, `:11434` | Local LLM inference | `ollama serve` (Council launcher already starts it) |
| **Image outputs** | `C:\AI\StabilityMatrix\Data\Images\` | Generated images by category | ComfyUI junction → Text2Img |
| **Workflows** | `C:\AI\StabilityMatrix\Data\Workflows\` | Starter ComfyUI JSON workflows | Load in ComfyUI |

### Logical components (not yet standalone apps)

| Component | Current form | AI Studio treatment |
|-----------|--------------|---------------------|
| **Project Foundry** | Council OS project context + external Pine/TradingView workspace | **Project module** — workspace profile, deep link to repo/IDE, Council preset |
| **Market Climatology** | Council OS project context + analysis workflows | **Project module** — same pattern, different brief/templates |
| **Coding (Qwen/DeepSeek/Llama)** | Council OS Solo Mode + Cursor | **Coding module** — unified launcher; optional embed Solo UI later |
| **Video Studio** | Not installed | **Future module** — placeholder + manifest stub |
| **Voice Studio** | Not installed | **Future module** — placeholder + manifest stub |

---

## 4. Conceptual Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AI STUDIO (Desktop Shell)                        │
│  ┌─────────────┐  ┌──────────────────────────────────────────────────┐  │
│  │ Module Rail │  │              Active Module Surface                  │  │
│  │             │  │  (embed · deep link · external window · status)   │  │
│  │  Council    │  └──────────────────────────────────────────────────┘  │
│  │  Coding     │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Image      │  │ Service Dock │  │ Output Feed  │  │  Event Log   │  │
│  │  Video *    │  │ Ollama       │  │ cross-module │  │  unified     │  │
│  │  Voice *    │  │ ComfyUI      │  │  artifacts   │  │  structured  │  │
│  │  Foundry    │  │ GPU / VRAM   │  │              │  │              │  │
│  │  Climatology│  └──────────────┘  └──────────────┘  └──────────────┘  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Shared Core   │     │  Module Host    │     │  External Apps  │
│ (local only)  │     │  (plugins)      │     │  (unchanged)    │
├───────────────┤     ├─────────────────┤     ├─────────────────┤
│ settings.yaml │     │ module.manifest │     │ Council OS      │
│ models.json   │     │ health probes   │     │ ComfyUI :8188   │
│ outputs index │     │ launch recipes  │     │ Stability Matrix│
│ logs/         │     │ permissions     │     │ Ollama :11434   │
└───────────────┘     └─────────────────┘     │ Cursor / repos  │
                                              └─────────────────┘
```

### Design principle: **Integration over assimilation**

Each tool remains independently runnable. AI Studio adds:

1. **Discovery** — what’s installed, what’s running  
2. **Orchestration** — ordered startup (Ollama before Council, ComfyUI before Image Studio)  
3. **Observability** — one log stream, one output browser  
4. **Profiles** — project-specific defaults without forking apps  

---

## 5. Shared Infrastructure Layer

All modules read/write through a single hub directory (recommended):

```
C:\AI\AIStudio\                    # or %LOCALAPPDATA%\AIStudio
├── config\
│   ├── settings.yaml              # global preferences
│   ├── services.yaml              # URLs, paths, launch commands
│   └── modules.enabled.json       # enabled module IDs + order
├── registry\
│   ├── models.json                # unified model index (LLM + diffusion)
│   └── modules\                   # discovered module manifests (cached)
├── outputs\
│   ├── index.sqlite               # searchable artifact index
│   └── links\                     # optional junctions/symlinks to canonical paths
├── logs\
│   ├── studio.log                 # AI Studio host log
│   ├── services\                  # ollama.log, comfyui.log, council.log
│   └── modules\                   # per-module structured logs
└── cache\
    └── health\                    # last probe results, timestamps
```

### 5.1 Shared settings (`settings.yaml`)

```yaml
version: 1
theme: dark
startup:
  auto_start_ollama: true
  auto_start_comfyui: false        # user opt-in; respects working install
  minimize_to_tray: true
gpu:
  warn_vram_threshold_mb: 7000      # RTX 5060 8GB — warn before heavy jobs
paths:
  council_os: C:\Dev\Council-OS
  stability_matrix: C:\AI\StabilityMatrix
  comfyui: C:\AI\StabilityMatrix\Data\Packages\ComfyUI
  project_foundry: null            # set when repo path known
  market_climatology: null
services:
  ollama: http://127.0.0.1:11434
  council_os: http://127.0.0.1:5173
  comfyui: http://127.0.0.1:8188
```

**Rule:** Modules never hardcode paths; they resolve via `settings.yaml` with local overrides in `config/modules/<id>.yaml`.

### 5.2 Shared model registry (`models.json`)

Lightweight index rebuilt by scanners — not a duplicate of Stability Matrix DB:

| Field | Example |
|-------|---------|
| `id` | `ollama:qwen3:8b` |
| `family` | `llm` \| `diffusion` \| `vae` \| `lora` \| `voice` \| `video` |
| `name` | `qwen3:8b` |
| `source` | `ollama` \| `stability-matrix` \| `manual` |
| `path` | optional filesystem path |
| `vram_estimate_mb` | 5000 |
| `tags` | `coding`, `council`, `sdxl` |

Scanners (future implementation):

- **Ollama scanner** — `GET /api/tags`  
- **Stability Matrix scanner** — read `Data\Models\**` + optional SM API if available  
- **Manual entries** — user-added voice/video models  

Council OS and ComfyUI keep their native model pickers; AI Studio provides a **workstation-wide inventory view**.

### 5.3 Shared outputs index

Canonical output locations (read-only index, no file moves):

| Module | Canonical path |
|--------|----------------|
| Image Studio | `C:\AI\StabilityMatrix\Data\Images\` |
| Council OS | Browser localStorage + optional export folder |
| Project Foundry | repo-specific (when configured) |
| Future Voice/Video | `C:\AI\AIStudio\outputs\voice\`, `video\` |

The index stores: `path`, `module`, `type`, `created_at`, `prompt_summary`, `thumbnail_path`. Images from ComfyUI are indexed by watching `Text2Img\` (existing junction).

### 5.4 Shared logs

Structured JSON lines (one event per line):

```json
{
  "ts": "2026-06-27T10:00:00Z",
  "level": "info",
  "source": "service/comfyui",
  "module": "image-studio",
  "message": "Health check OK",
  "meta": { "latency_ms": 42, "vram_mb": 4100 }
}
```

Existing logs remain in place (`%LOCALAPPDATA%\CouncilOS\launcher.log`, ComfyUI `user\comfyui.log`). AI Studio **tails and aggregates** them into the unified Event Log panel.

---

## 6. Module System (Plugin Architecture)

### 6.1 Module manifest (`module.manifest.json`)

Every module ships a manifest — either bundled with AI Studio or dropped into `modules/`:

```json
{
  "id": "image-studio",
  "name": "Image Studio",
  "version": "1.0.0",
  "description": "ComfyUI-backed image generation",
  "category": "creative",
  "icon": "image",
  "capabilities": ["launch", "health", "outputs", "workflows"],
  "dependencies": {
    "services": ["comfyui"],
    "optional": ["stability-matrix"]
  },
  "launch": {
    "type": "script",
    "path": "C:\\AI\\StabilityMatrix\\Scripts\\Launch-AI-Image-Studio.bat",
    "cwd": "C:\\AI\\StabilityMatrix",
    "singleton": true
  },
  "health": {
    "url": "http://127.0.0.1:8188/system_stats",
    "interval_sec": 30
  },
  "outputs": {
    "watch": ["C:\\AI\\StabilityMatrix\\Data\\Images\\Text2Img"]
  },
  "ui": {
    "surface": "external-browser",
    "url": "http://127.0.0.1:8188"
  }
}
```

### 6.2 Launch types

| Type | Use case |
|------|----------|
| `executable` | `StabilityMatrix.exe` |
| `script` | `.bat` / `.ps1` (Council OS, ComfyUI optimized) |
| `url` | Open browser only (service already running) |
| `embedded` | WebView pointing at local dev server (Council OS `:5173`) |
| `placeholder` | Future module — shows requirements + install guide |

### 6.3 Module interface (conceptual API)

Each module implements these **host callbacks** (language-agnostic contract):

| Method | Purpose |
|--------|---------|
| `getManifest()` | Return manifest JSON |
| `healthCheck()` | `{ ok, message, metrics }` |
| `launch(ctx)` | Start or focus module; idempotent |
| `stop(ctx)` | Graceful shutdown if owned by Studio |
| `listOutputs(filter)` | Return indexed artifacts |
| `getQuickActions()` | Toolbar buttons (e.g. “Portrait workflow”) |

**Phase 1 modules** can be manifest-only (declarative, no code). **Phase 2+** modules add a small adapter (`adapter.ps1`, `adapter.mjs`, or Rust plugin) only when declarative launch is insufficient.

### 6.4 Adding a future module (no redesign)

1. Add `modules/<id>/module.manifest.json`  
2. Register in `modules.enabled.json`  
3. Optionally add `config/modules/<id>.yaml` overrides  
4. If new service: add entry to `services.yaml` + health probe  
5. If new output type: extend `outputs/index` schema with new `type` enum  
6. UI: module rail auto-discovers manifest `name` + `icon`  

No changes to core shell code if manifest-driven launch suffices.

---

## 7. Module Specifications

### 7.1 Council

| Aspect | Plan |
|--------|------|
| **App** | Council OS (existing) |
| **Launch** | `C:\Dev\Council-OS\launcher.vbs` |
| **Depends on** | Ollama |
| **UI surface** | Embedded WebView → `http://localhost:5173` or external browser |
| **Integration** | Read Ollama health; pass `projectId` via URL hash/query if Council adds support later |
| **Do not** | Merge Council codebase into AI Studio repo initially |

### 7.2 Coding

| Aspect | Plan |
|--------|------|
| **App** | Council OS Solo Mode + Cursor + Ollama |
| **Launch** | Council OS with `?mode=solo` (future query param) or dedicated shortcut |
| **Models** | qwen3:8b, deepseek-r1:8b, llama3.1:8b via Ollama registry |
| **UI surface** | Solo workspace embed OR “open Council Solo + open Cursor” dual launch |
| **Shared** | Model registry, coding presets from `config/modules/coding.yaml` |

### 7.3 Image Studio

| Aspect | Plan |
|--------|------|
| **App** | ComfyUI via existing optimized launcher |
| **Launch** | `Launch-AI-Image-Studio.bat` (unchanged) |
| **Depends on** | ComfyUI `:8188`; Stability Matrix optional for model management |
| **UI surface** | External browser / WebView — **do not reimplement ComfyUI canvas** |
| **Quick actions** | Launch preset workflows by API queue (read-only list from `Data\Workflows\`) |
| **Do not** | Modify ComfyUI install, venv, or custom nodes unless bugfix |

### 7.4 Video Studio (future)

| Aspect | Plan |
|--------|------|
| **Status** | Placeholder module |
| **Candidates** | ComfyUI video nodes (Wan, LTX), FFmpeg pipeline, separate tool |
| **VRAM note** | 8GB RTX 5060 — document limits; likely 512p/short clips only |
| **Manifest** | `capabilities: ["placeholder"]` until engine chosen |

### 7.5 Voice Studio (future)

| Aspect | Plan |
|--------|------|
| **Status** | Placeholder module |
| **Candidates** | Whisper (STT), Piper/Coqui (TTS), Ollama multimodal when ready |
| **Outputs** | `C:\AI\AIStudio\outputs\voice\` |
| **Shared** | Ollama service dependency |

### 7.6 Project Foundry

| Aspect | Plan |
|--------|------|
| **Type** | **Project workspace module** (not a separate inference engine) |
| **Includes** | Path to Pine repo, Council preset (`project-foundry`), Trading Council mode |
| **Launch** | Open repo in Cursor + optional Council OS with context preselected |
| **Artifacts** | Link to spec files, CHANGELOG, coordination docs |
| **Config** | `paths.project_foundry` in settings |

### 7.7 Market Climatology

| Aspect | Plan |
|--------|------|
| **Type** | Project workspace module |
| **Includes** | Research folder, Council preset, Research/Trading council modes |
| **Launch** | Same pattern as Foundry |
| **Future** | Data connectors (CSV, market APIs) as sub-plugins |

---

## 8. Recommended Technology Stack

### 8.1 Primary recommendation: **Tauri 2 + React + TypeScript**

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Shell** | Tauri 2.x | Native Windows app, small footprint, system tray, process spawn, file watch |
| **UI** | React 19 + TypeScript | Matches Council OS skills; component reuse possible |
| **Styling** | Tailwind CSS v4 | Consistent with Council OS dark theme |
| **State** | Zustand or Jotai | Simple module/service state |
| **Config** | YAML on disk + Zod validation | Human-editable, git-friendly |
| **Process mgmt** | Rust (Tauri commands) | Reliable `spawn`, `kill`, PID tracking on Windows |
| **Log aggregation** | Rust file tail + JSON parse | Low overhead vs Node polling |
| **Output index** | SQLite (bundled) | Fast search across artifacts |
| **Health checks** | Rust reqwest | Parallel probes for Ollama/ComfyUI/Council |

**Why not Electron:** Higher RAM use; acceptable but worse fit for always-on workstation with Ollama + ComfyUI already memory-heavy.

**Why not pure PowerShell tray app:** Fast MVP possible, but weak embedded UI and harder long-term module UX.

**Why not Stability Matrix fork:** SM is diffusion-specific; AI Studio scope is broader.

### 8.2 Alternative: **Electron + Node orchestrator**

Choose if Tauri Rust learning curve blocks delivery. Trade ~200–400MB extra RAM for faster initial development.

### 8.3 What stays in existing stacks

| Tool | Stack | AI Studio relationship |
|------|-------|------------------------|
| Council OS | Vite + React + Ollama | Embedded or launched |
| ComfyUI | Python + PyTorch | Health + launch only |
| Stability Matrix | .NET Avalonia | Sidecar executable |
| Ollama | Go binary | Service dependency |

### 8.4 Repository layout (proposed)

```
C:\Dev\AI-Studio\
├── docs\
│   └── AI_STUDIO_ARCHITECTURE.md      # this document
├── apps\
│   └── studio-shell\                  # Tauri + React host
│       ├── src-tauri\                 # Rust: spawn, health, logs
│       └── src\                       # React UI
├── packages\
│   ├── module-sdk\                    # manifest types, validators
│   ├── shared-ui\                     # theme tokens shared w/ Council OS
│   └── config-schema\                 # Zod schemas for YAML
├── modules\
│   ├── council\module.manifest.json
│   ├── coding\module.manifest.json
│   ├── image-studio\module.manifest.json
│   ├── video-studio\module.manifest.json   # placeholder
│   ├── voice-studio\module.manifest.json   # placeholder
│   ├── project-foundry\module.manifest.json
│   └── market-climatology\module.manifest.json
└── scripts\
    ├── install-shortcuts.ps1
    └── scan-models.ps1
```

---

## 9. UI Layout — Workstation Design

### 9.1 Layout wireframe (persistent chrome)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  AI Studio          [Ollama ●] [ComfyUI ○] [GPU 4.1/8 GB]    [_ □ ×]   │
├────────┬─────────────────────────────────────────────────┬───────────────┤
│        │                                                 │               │
│  NAV   │           MAIN SURFACE                          │   SIDEBAR     │
│  72px  │                                                 │   320px       │
│        │   ┌─────────────────────────────────────────┐   │               │
│  🏛️    │   │  Module header + quick actions          │   │  Activity     │
│  💻    │   ├─────────────────────────────────────────┤   │  Log          │
│  🎨    │   │                                         │   │               │
│  🎬    │   │  Content:                               │   │  ─────────    │
│  🎙️    │   │  • WebView (Council)                    │   │               │
│  ──    │   │  • Browser launch pad (Image)           │   │  Recent       │
│  ⚒️    │   │  • Project dashboard (Foundry)          │   │  Outputs      │
│  📈    │   │  • Placeholder (Video/Voice)            │   │               │
│        │   │                                         │   │  ─────────    │
│  ⚙️    │   └─────────────────────────────────────────┘   │  System       │
│        │                                                 │  Services     │
├────────┴─────────────────────────────────────────────────┴───────────────┤
│  Ready │ Module: Image Studio │ Last gen: setup_test_00001_.png │ 10:42  │
└──────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Navigation rail (top → bottom)

| Icon | Module | Default surface |
|------|--------|-----------------|
| 🏛️ | Council | Embed Council OS WebView |
| 💻 | Coding | Solo launcher + model picker + “Open Cursor” |
| 🎨 | Image Studio | ComfyUI status + “Open Studio” + workflow shortcuts |
| 🎬 | Video Studio | Placeholder card + requirements |
| 🎙️ | Voice Studio | Placeholder card + requirements |
| ⚒️ | Project Foundry | Project dashboard |
| 📈 | Market Climatology | Project dashboard |
| ⚙️ | Settings | Global paths, services, modules, theme |

### 9.3 Service dock (header chips)

- **Ollama** — green/red; click → restart, view models  
- **ComfyUI** — green/red/idle; click → launch optimized script  
- **GPU** — VRAM bar; warn >7GB on RTX 5060  
- **Stability Matrix** — optional; shows if exe running  

### 9.4 Main surface modes

| Mode | When |
|------|------|
| **Embed** | Council OS (same origin or localhost dev server) |
| **Launch pad** | Image/Video/Voice — big action buttons, don’t clone complex UIs |
| **Dashboard** | Foundry/Climatology — files, links, Council preset buttons |
| **Placeholder** | Future modules — install guide + manifest requirements |

### 9.5 Right sidebar (collapsible)

1. **Activity log** — unified tail, filter by module/service  
2. **Recent outputs** — thumbnails from index (images first)  
3. **Quick service controls** — start/stop owned processes  

### 9.6 Design tokens

Reuse Council OS palette (dark surfaces, accent indigo) for a **family resemblance** without merging codebases. Extract tokens to `@ai-studio/shared-ui` package later.

---

## 10. Service Orchestration

### 10.1 Startup order (recommended)

```
1. AI Studio shell
2. Ollama (if auto_start && not healthy)
3. [User action] ComfyUI (Image Studio) — not auto by default
4. [User action] Council OS (spawns own Ollama check + Vite)
5. Stability Matrix — manual via Image Studio “Manage models” link
```

### 10.2 Singleton rules (match existing behavior)

| Service | Singleton | Lock file / detection |
|---------|-----------|------------------------|
| Ollama | Yes | `:11434/api/tags` |
| ComfyUI | Yes | `:8188/system_stats` |
| Council Vite | Yes | `:5173` + Council OS lock |
| Stability Matrix | Yes | User discipline + optional process check |

AI Studio **never starts duplicate ComfyUI** — reuses existing `Launch-AI-Image-Studio.bat` logic.

### 10.3 Shutdown

- Closing AI Studio: **does not kill** Ollama/ComfyUI by default (user opt-in “Stop all services on exit”)  
- Tray icon persists for background monitoring  

---

## 11. Security & Local-Only Posture

- All services bind `127.0.0.1` only  
- No telemetry by default  
- Manifest `launch.path` validated against allowlist roots: `C:\Dev\`, `C:\AI\`  
- WebView embed: restrict navigation to localhost allowlist  
- Secrets (API keys for future Climatology data): `%LOCALAPPDATA%\AIStudio\secrets\` excluded from git  

---

## 12. Implementation Plan (Phased)

### Phase 2A — Foundation (2–3 weeks)

**Deliverable:** Empty shell app + config + module discovery

- [ ] Create `C:\Dev\AI-Studio` repo structure  
- [ ] Tauri 2 scaffold with dark layout (nav + header + sidebar)  
- [ ] Implement `settings.yaml` load/save + path validation  
- [ ] Module manifest loader (JSON Schema)  
- [ ] Health probes: Ollama, ComfyUI, Council (HTTP GET)  
- [ ] Unified log viewer (tail existing log files)  
- [ ] Desktop shortcut: **AI Studio**  
- [ ] **No changes** to ComfyUI installation  

**Exit criteria:** App opens, shows service status, loads manifests, opens Council/Image via existing scripts.

### Phase 2B — Module launchers (1–2 weeks)

- [ ] Declarative launch for all current modules  
- [ ] Project Foundry + Market Climatology dashboards (paths + Council deep link)  
- [ ] Video/Voice placeholder screens  
- [ ] System tray + minimize on close  
- [ ] GPU VRAM polling (nvidia-smi or equivalent)  

**Exit criteria:** Every nav item does something meaningful; Image Studio opens ComfyUI without regression.

### Phase 2C — Shared outputs & models (2 weeks)

- [ ] Model registry scanners (Ollama + SM folder walk)  
- [ ] Output indexer + thumbnail cache for ComfyUI images  
- [ ] Recent outputs sidebar  
- [ ] Quick-action: queue ComfyUI workflow by name (uses existing `api_test` pattern)  

**Exit criteria:** Generated images appear in AI Studio within seconds of ComfyUI save.

### Phase 2D — Coding & Council embed (2 weeks)

- [ ] Optional WebView embed for Council OS  
- [ ] Coding module: model picker from registry, launch Solo preset  
- [ ] “Send to Council” bridge (future: URL protocol or local API)  

**Exit criteria:** Council usable inside AI Studio window.

### Phase 2E — Hardening (1 week)

- [ ] Installer script + shortcut refresh  
- [ ] Documentation + troubleshooting page  
- [ ] Crash recovery for owned processes  
- [ ] User acceptance on Legion 7i / RTX 5060  

### Phase 2F — Future modules (when ready)

- [ ] Video Studio manifest → real adapter when engine chosen  
- [ ] Voice Studio manifest → Whisper/Piper integration  
- [ ] Optional: Stability Matrix CLI integration if API exposed  

---

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| ComfyUI breakage from integration | High | Launch-only integration; no install modifications |
| RAM pressure (Ollama + ComfyUI + Studio) | Medium | Lazy service start; VRAM warnings; don’t auto-start all |
| WebView embed conflicts with Vite HMR | Low | Allow external browser fallback |
| Project Foundry path unknown | Low | Settings UI to configure; works without until set |
| Module sprawl | Medium | Strict manifest contract; placeholder pattern |
| Duplicate launchers (SM, Studio, desktop) | Low | Document hierarchy: AI Studio supersedes shortcuts eventually |

---

## 14. Open Decisions (for review)

1. **Hub directory:** `C:\AI\AIStudio\` vs `%LOCALAPPDATA%\AIStudio\` — recommend `C:\AI\AIStudio\` for parity with Stability Matrix.  
2. **Council embed vs always external browser** — recommend embed with external fallback.  
3. **Auto-start ComfyUI on AI Studio launch** — recommend **off** by default (heavy GPU).  
4. **Project Foundry repo path** — user must configure in Phase 2B settings.  
5. **Monorepo vs separate repo** — recommend separate `AI-Studio` repo; Council OS stays independent.  
6. **Video engine selection** — defer until Phase 2F; ComfyUI video nodes vs standalone tool TBD.  

---

## 15. Success Criteria (Phase 2 complete)

- [ ] One **AI Studio** desktop app replaces scattered shortcuts for daily use  
- [ ] Council, Image Studio, Coding, Foundry, Climatology reachable in ≤2 clicks  
- [ ] Ollama + ComfyUI health visible at a glance  
- [ ] Recent ComfyUI outputs visible in AI Studio without opening folders  
- [ ] ComfyUI installation still passes existing smoke test (`setup_test_00001_.png` workflow)  
- [ ] New module can be added via manifest only (demonstrated with a dummy test module)  

---

## 16. Appendix — Mapping to existing assets

| AI Studio module | Existing asset | Integration point |
|------------------|----------------|-------------------|
| Council | `C:\Dev\Council-OS\` | `launcher.vbs`, `:5173`, Ollama proxy |
| Coding | Council Solo + Ollama | Same + model registry |
| Image Studio | `Launch-AI-Image-Studio.bat`, ComfyUI `:8188` | Health URL, workflow dir |
| Models | SM `Data\Models\`, Ollama tags | Scanners → `models.json` |
| Outputs | SM `Data\Images\` | Folder watch → index |
| Logs | Council `%LOCALAPPDATA%\CouncilOS\`, ComfyUI `user\comfyui.log` | Tail aggregation |
| Foundry | Council project context `project-foundry` | Preset + repo path |
| Climatology | Council project context `market-climatology` | Preset + repo path |

---

*End of document — v1.0 planning draft for review before implementation.*
