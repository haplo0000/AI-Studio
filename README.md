# AI Studio

Local AI workstation control plane — Phase 2A foundation.

AI Studio launches, monitors, and logs external tools (Council OS, ComfyUI, Ollama, Stability Matrix, project folders). It does **not** modify those applications.

## Phase 2A Foundation

### What exists

- **Desktop shell** (Electron + React + TypeScript + Tailwind) with dark UI
- **Left navigation** for all modules
- **Header service chips** for Ollama, ComfyUI, Council OS (green/red)
- **Center launch/status surface** with read-only control notice
- **Right activity log** (studio.log tail)
- **Hub** at `C:\AI\AIStudio\` (config, registry, logs, outputs)
- **Module manifests** in `modules/*/module.manifest.json`
- **Launch actions** for Council OS, Image Studio, Stability Matrix, Cursor, project folders

### What is NOT implemented (Phase 2A)

- Tauri 2 (Rust toolchain not installed — Electron used instead)
- SQLite output index
- Model registry scanner
- WebView embedding
- Video / Voice generation
- Blacksmith, RAG, cloud integrations

### Tauri decision

Phase 2A targeted **Tauri 2 + React**. `rustc` / `cargo` were not available on this machine, so implementation stopped short of forcing a Rust install and used **Electron** as the desktop host. The UI and hub layout match the architecture doc; migration to Tauri remains possible later.

### Prerequisites

- Node.js 20+ and npm
- Windows 11
- Existing installs (unchanged by AI Studio):
  - Council OS: `C:\Dev\Council-OS`
  - Stability Matrix / ComfyUI: `C:\AI\StabilityMatrix`
  - Ollama on PATH (optional until Council/Coding used)

### Hub layout

```
C:\AI\AIStudio\
├── config\
│   ├── settings.yaml
│   └── modules.enabled.json
├── registry\
├── logs\
│   └── studio.log
└── outputs\
```

Edit `settings.yaml` to set `paths.project_foundry` and `paths.market_climatology` when repo paths are known.

### Development

```bash
cd C:\Dev\AI-Studio
npm install
npm run dev
```

Opens Electron with Vite dev server on **port 5174** (Council OS uses 5173).

### Production build

```bash
npm run build
npm start
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Electron + Vite dev |
| `npm run build` | Typecheck + Vite production build |
| `npm start` | Run Electron against `dist/` |
| `npm run lint` | TypeScript check |

### Module manifests

Source of truth: `C:\Dev\AI-Studio\modules\`

| Module | Status |
|--------|--------|
| Council OS | Active |
| Coding | Active |
| Image Studio | Active |
| Ollama | Active |
| Project Foundry | Active (folder path must be configured) |
| Market Climatology | Active (folder path must be configured) |
| Video Studio | Placeholder |
| Voice Studio | Placeholder |

### Architecture

See [docs/AI_STUDIO_ARCHITECTURE.md](./docs/AI_STUDIO_ARCHITECTURE.md).

## License

MIT
