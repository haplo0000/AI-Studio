# AI Studio Changelog

## Unreleased

### Milestone 1.5 — Projects + Artifacts (2026-06-30)

**AI Studio now feels like an operating system for ideas, not a chat application.**

Projects are the primary workspace object. Every pipeline output is a permanent document,
browsable and readable as company documents. The founder no longer thinks "I had a conversation"
— they think "my company produced three documents."

#### New module: `src/projects/`

**`src/projects/types.ts`**
Project, Artifact, TimelineEntry, ProjectStatus, ProjectStage, ArtifactType,
PIPELINE_STAGES, and `deriveNextAction()`. Contains the full stage → pipeline
mapping and all Next Action derivation logic.

**`src/projects/storage.ts`**
CRUD for Projects, Artifacts, and Timeline entries in localStorage.
`syncSessionsToProjects()` — idempotent derivation of Project + Artifact + Timeline
records from `IdeaLoopSession` objects. Runs on every ArtifactBrowser mount.

**`src/projects/hooks/useProjects.ts`**
Loads all projects on mount, triggers sync. Returns `{ projects, loading, refresh }`.

**`src/projects/hooks/useProject.ts`**
Loads a single project, its artifacts, and its timeline on `projectId` change.

**`src/projects/components/DocumentHeader.tsx`**
Standardised metadata header rendered at the top of every document:
Produced By, Created, Version, Status. Artifact-type agnostic.

**`src/projects/components/ProjectTimeline.tsx`**
Chronological activity log derived from artifact timestamps. Shows project-started,
artifact-produced, decision-made, pipeline-complete, and pipeline-stopped events.
Foundation for Institutional Memory (Milestone 6).

**`src/projects/components/CompanyHealth.tsx`**
Visual department health indicator. Completed stages (green), active stage (pulsing),
pending stages (grey), future stages (dimmed with milestone number). Uses `PIPELINE_STAGES`
from types.ts — all nine stages displayed, future ones visibly locked.

**`src/projects/components/NextActionBanner.tsx`**
Single-sentence next action derived from pipeline phase and board decision.
Business vocabulary only — no internal phase names or department labels.

**`src/projects/contentRenderers/IdeaBriefContent.tsx`**
Document-mode content renderer for Idea Brief. Sections: project name, confidence bar,
problem statement, target user, desired outcome, success criteria, constraints,
assumptions, unknowns, risks, questions, founder notes.

**`src/projects/contentRenderers/DecisionPackageContent.tsx`**
Document-mode content renderer for Decision Package. Sections: decision verdict with
colour-coded icon, executive recommendation, reasoning, opportunity cost, risks,
opportunities, open questions.

**`src/projects/contentRenderers/BlueprintContent.tsx`**
Document-mode content renderer for Blueprint. Sections: problem, goals, non-goals,
user stories, architecture, major components (cards), data model, dependencies,
architectural risks, success criteria, future expansion.

**`src/projects/contentRenderers/index.ts`**
Generic content renderer registry. `renderDocumentContent(artifact)` dispatches to the
correct renderer by `artifactType`. DocumentViewer does not contain artifact-type logic.
New document types register a renderer here — the viewer is never modified.

**`src/projects/components/DocumentViewer.tsx`**
Generic document reader. Shell is artifact-type agnostic. Renders `DocumentHeader`
then delegates content to the renderer registry. Document layout — not chat bubbles.

**`src/projects/components/ArtifactListItem.tsx`**
Single document row. Shows type icon, title, department label, date, and summary preview.

**`src/projects/components/ProjectList.tsx`**
Left sidebar project list. Shows name, status badge, current stage, and relative
last-updated timestamp. Sorted by updatedAt descending.

**`src/projects/components/ProjectHome.tsx`**
Executive dashboard for a single project. Sections:
  - Project name + status + stage chips
  - Next Action banner (full width)
  - Stat cards: Current Stage, Documents (N of 3), Latest Activity
  - Purpose + Executive Summary (side by side)
  - Documents list (left 60%) + Timeline (right 40%)
  - Company Health (full width)

**`src/projects/ArtifactBrowser.tsx`**
Top-level container for the `'projects'` view. Two-panel layout: 240px project list
(left) + project home or document viewer (right). Syncs sessions → projects on mount
and on window focus (picks up pipeline completions from the 'idea' view).

#### Modified files

**`src/departments/pipeline/hooks/useIdeaPipeline.ts`**
Added `initialSessionId?: string` parameter. When provided, loads the existing session
from storage instead of creating a fresh one. Enables "Continue" from Project Home.

**`src/departments/pipeline/IdeaPipelineWorkspace.tsx`**
Added `initialSessionId?: string` prop. Passed through to `useIdeaPipeline`.

**`src/types/studio.ts`**
Added `'projects'` to `WorkbenchView` union type.

**`src/App.tsx`**
- Added `ideaSessionId` state.
- Added "My Projects" nav button.
- Added "← Blacksmith" back nav for `'projects'` view.
- Added `ArtifactBrowser` render block with `onNewIdea` callback.
- Updated `IdeaPipelineWorkspace` render to pass `initialSessionId`.

#### Architecture decisions (Milestone 1.5)

- **IdeaLoopSession unchanged** — sessions remain the pipeline working state.
  Projects are a derived layer. Zero coupling in the pipeline direction.
- **Generic DocumentViewer** — viewer shell is artifact-type agnostic.
  Content rendering is a registry concern, not a viewer concern.
- **syncSessionsToProjects() is idempotent** — safe to call on every mount.
  Projects are always derived from sessions, never the reverse.
- **projectId === sessionId** for Milestone 1.5. Future milestones may introduce
  one-to-many (a project spanning multiple pipeline runs).
- **Timeline is the seed of Institutional Memory** — the TimelineEntry type and
  storage are designed to accept entries from future departments without schema changes.

### Milestone 1 — The Idea Loop (2026-06-30)

**Implemented Milestone 1: Intake → Executive Board → Architect pipeline.**

Three new departments embedded in AI Studio, accessible via "💡 New Idea" in the header.
The founder interacts with one conversation; internal routing between departments is never exposed.

#### New files

**`src/departments/shared/types.ts`**
Canonical type definitions: `IdeaBrief`, `DecisionPackage`, `Blueprint`, `IdeaLoopSession`,
`IdeaLoopPhase`, `IntakeMessage`, `DepartmentConfig`, `DEFAULT_CONFIG`.

**`src/departments/shared/storage.ts`**
localStorage adapter. Saves and loads `IdeaLoopSession` objects (keyed `idea-loop:session:{id}`).
Session index at `idea-loop:sessions`.

**`src/departments/shared/jsonExtract.ts`**
JSON extraction utility. Handles pure JSON, markdown fences, and embedded JSON objects
extracted from prose LLM responses.

**`src/departments/intake/services/conversation.ts`**
Ollama `/api/chat` multi-turn conversation service. Returns `{type:"question"}` or
`{type:"complete", brief}` responses. Includes `forceCompleteBrief()` for forced completion.

**`src/departments/intake/index.ts`**
Intake Department public API: `conductIntakeTurn()`, `completeIntakeNow()`, `buildBrief()`.

**`src/departments/executive-board/services/milestone1Review.ts`**
Internal Milestone 1 implementation: single Ollama `/api/generate` call reviewing an
`IdeaBrief` and producing a structured `DecisionPackage`. Hidden from the rest of the system.

**`src/departments/executive-board/index.ts`**
Executive Board Department public API: `reviewIdeaBrief()` only. All internal implementation
is hidden. Milestone 2 upgrades the internal call to a 6-perspective pipeline without changing
this signature.

**`src/departments/architect/services/blueprint.ts`**
Internal Blueprint generation: single Ollama `/api/generate` call producing a structured
`Blueprint` from the `IdeaBrief` and `DecisionPackage`. Hidden from the rest of the system.

**`src/departments/architect/index.ts`**
Architect Department public API: `createBlueprint()` only.

**`src/departments/pipeline/hooks/useIdeaPipeline.ts`**
Main pipeline state machine. Orchestrates intake conversation, auto-triggers Executive Board
review, auto-triggers Architect on Proceed/Prototype decisions. Persists session to localStorage
after every state change.

**`src/departments/pipeline/components/PipelineProgress.tsx`**
Subtle 3-step progress indicator. Displays "Understanding your idea" / "Reviewing with the
team" / "Designing the architecture". No department names visible to founder.

**`src/departments/pipeline/components/IntakeChat.tsx`**
Adaptive interview conversation UI. Message bubbles, loading indicator, "Create Brief with
what you know →" escape hatch after 3+ questions.

**`src/departments/pipeline/components/ArtifactPanel.tsx`**
Displays all three permanent artifacts as they are produced. Contains `IdeaBriefCard`,
`DecisionPackageCard`, `BlueprintCard` sub-components with full field rendering.

**`src/departments/pipeline/IdeaPipelineWorkspace.tsx`**
Main container. Handles idle landing, active conversation, processing states, artifact display,
error states, and pipeline completion. Added to App.tsx as the `'idea'` view.

#### Modified files

**`src/types/studio.ts`**
Added `'idea'` to the `WorkbenchView` union type.

**`src/App.tsx`**
- Imported `IdeaPipelineWorkspace`.
- Added "💡 New Idea" nav button (visible from Blacksmith view).
- Added back-navigation for the `'idea'` view.
- Added render block: `{activeView === 'idea' && <IdeaPipelineWorkspace ... />}`.
- Passes `bootstrap.settings.blacksmith?.model` to the workspace as the Ollama model.

#### Architecture decisions

- **Department-oriented folder structure** (`src/departments/`) not feature-oriented.
- **Executive Board behind abstraction**: the system only calls `reviewIdeaBrief()`.
  The Milestone 1 single-call implementation is swappable for the full 6-perspective pipeline
  in Milestone 2 without touching any caller.
- **"Decision Package" terminology** used consistently throughout — not "decision" alone.
- **No new Electron IPC handlers**: all LLM calls go direct from renderer to Ollama
  at `localhost:11434`, matching the existing Council-OS pattern.
- **localStorage for artifact storage** (Milestone 1 MVP). Replaced with file system
  storage in Milestone 4 without schema changes (`schemaVersion: '1.0'` on DecisionPackage).
