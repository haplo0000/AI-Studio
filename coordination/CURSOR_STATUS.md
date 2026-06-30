# Cursor Implementation Status

## Current milestone: Milestone 1.5 — Projects + Artifacts

**Status: COMPLETE — awaiting validation**

---

## Last completed task

Implemented Milestone 1.5: Projects + Artifacts.

AI Studio now functions as an operating system for ideas. Projects are the primary
workspace object. Pipeline outputs are permanent documents, browsable in an
executive dashboard. Zero linter errors. No existing pipeline behaviour modified.

---

## What was implemented (Milestone 1.5)

### New module: `src/projects/`

```
src/projects/
  types.ts                          ← Project, Artifact, TimelineEntry, ProjectStage, deriveNextAction()
  storage.ts                        ← CRUD + syncSessionsToProjects() (idempotent)
  hooks/useProjects.ts              ← all projects, auto-sync on mount
  hooks/useProject.ts               ← single project + artifacts + timeline
  components/DocumentHeader.tsx     ← Produced By, Created, Version, Status
  components/ProjectTimeline.tsx    ← chronological activity log (seed of Inst. Memory)
  components/CompanyHealth.tsx      ← all 9 stages: complete/active/pending/future
  components/NextActionBanner.tsx   ← one sentence, business vocabulary only
  components/ArtifactListItem.tsx   ← single document row
  components/ProjectList.tsx        ← left sidebar
  components/ProjectHome.tsx        ← executive dashboard
  components/DocumentViewer.tsx     ← generic document reader (type-agnostic shell)
  contentRenderers/IdeaBriefContent.tsx
  contentRenderers/DecisionPackageContent.tsx
  contentRenderers/BlueprintContent.tsx
  contentRenderers/index.ts         ← renderer registry (DocumentViewer never changes for new types)
  ArtifactBrowser.tsx               ← top-level 'projects' view
```

Modified: `src/departments/pipeline/hooks/useIdeaPipeline.ts` (initialSessionId),
`src/departments/pipeline/IdeaPipelineWorkspace.tsx` (initialSessionId prop),
`src/types/studio.ts` ('projects' view), `src/App.tsx` (My Projects nav + render block).

---

## Previous implementation (Milestone 1)

### Module: `src/departments/`

```
src/departments/
  shared/
    types.ts              ← IdeaBrief, DecisionPackage, Blueprint, IdeaLoopSession
    storage.ts            ← localStorage adapter
    jsonExtract.ts        ← JSON extraction from LLM responses
  intake/
    services/conversation.ts   ← Ollama multi-turn interview
    index.ts                   ← public: conductIntakeTurn(), completeIntakeNow()
  executive-board/
    services/milestone1Review.ts   ← INTERNAL Milestone 1 single-call impl
    index.ts                       ← public: reviewIdeaBrief() ONLY
  architect/
    services/blueprint.ts     ← INTERNAL Blueprint generation
    index.ts                  ← public: createBlueprint() ONLY
  pipeline/
    hooks/useIdeaPipeline.ts          ← state machine + orchestration
    components/IntakeChat.tsx         ← adaptive interview UI
    components/PipelineProgress.tsx   ← subtle 3-step indicator
    components/ArtifactPanel.tsx      ← IdeaBriefCard, DecisionPackageCard, BlueprintCard
    IdeaPipelineWorkspace.tsx         ← main container
```

### Modified files

- `src/types/studio.ts` — added `'idea'` to `WorkbenchView`
- `src/App.tsx` — "💡 New Idea" button + `IdeaPipelineWorkspace` render block

---

## Architecture decisions locked in

1. `src/departments/` (not `src/modules/`) — department-oriented structure
2. `reviewIdeaBrief()` is the only public surface of the Executive Board
3. "Decision Package" terminology used throughout — not "decision"
4. Milestone 1 uses single-call board review — Milestone 2 upgrades to 6-perspective pipeline
   behind the same `reviewIdeaBrief()` interface

---

## Pending validation

Before declaring Milestone 1.5 validated, the founder should run:

1. Click "My Projects" — confirm project list loads and syncs from existing sessions
2. Select a project — confirm executive dashboard shows Purpose, Summary, Stage, Next Action
3. Click a document — confirm DocumentViewer opens with metadata header (Produced By, Created, Version, Status)
4. Confirm document reads as a company document, not a chat bubble
5. Confirm Company Health shows completed stages active, future stages locked
6. Confirm Timeline shows chronological events
7. Click "Continue" on a project — confirm pipeline loads the existing session
8. Confirm "New Idea" from projects view opens a fresh pipeline

### Previous validation (Milestone 1)

Before declaring Milestone 1 validated, the founder should run the full flow:

1. Click "💡 New Idea" in the header
2. Type an idea ("I have an idea for...")
3. Answer the adaptive interview questions
4. Observe the Idea Brief appear
5. Observe the Decision Package appear automatically
6. If decision is "Build Now" or "Prototype", observe the Blueprint appear
7. Confirm all three artifacts are visible and coherent

---

## Blockers

None. Ready for validation.

---

## Next task

After Milestone 1.5 validation:

- **Milestone 2**: Upgrade Executive Board to the full 6-perspective pipeline
  (Head of Product, CTO, Creative Director, Customer Advocate, Business Strategist,
  Operations Lead + CEO Synthesis). Public API `reviewIdeaBrief()` does not change.
- **Institutional Memory stub**: track produced artifacts in a session history.
- **Session history browser**: let founder revisit prior sessions.
