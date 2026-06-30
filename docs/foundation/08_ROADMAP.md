# AI Studio — Multi-Year Roadmap

**Version:** 1.0  
**Date:** 2026-06-30  
**Status:** Foundational

---

## Purpose and Scope

This roadmap defines the long-term evolution of AI Studio from its current state — a functional AI workbench with a working Council, Image Studio, and Video Studio — to its target state: a complete AI-powered operating company running on local hardware.

Each milestone is defined by the organizational capability it unlocks, not by a feature list. Features are the means. Organizational capability is the goal.

The roadmap does not have fixed dates. It has dependencies and success criteria. A milestone is complete when its success criteria are met, not when its schedule expires.

---

## Current State (Pre-Milestone 1)

AI Studio currently has:

- A working Electron shell with a Blacksmith workspace
- Council OS with three debate personas and a Chairperson synthesizer
- Image Studio powered by ComfyUI
- Video Studio (initial)
- Service management for Ollama, ComfyUI, and Council OS
- A reporting and export system for Council sessions
- Local-only architecture with Ollama for LLM inference

The organization model does not yet exist in the software. Departments are conceptual. Artifacts are not tracked. Institutional Memory is not implemented. The Decision Engine architecture is documented but not yet built.

---

## Milestone 1: The Idea Loop

**Theme:** Close the loop from idea to decision to record.

### Goals

- The founder can submit an idea, receive an Executive Board review, approve or reject the recommendation, and have the complete record archived — without leaving AI Studio.
- The Executive Board operates with specialized executive perspectives (Head of Product, CTO, Creative Director, Customer Advocate, Business Strategist, Operations Lead) rather than generic debate personas.
- Every session produces a Decision Package that is stored and retrievable.
- The CEO Synthesis and Chairperson Packaging stages are separated: CEO decides, Chairperson packages.

### Success Criteria

- An Executive Board review with six disciplined perspectives produces measurably better recommendations than the prior three-persona model.
- Decision Packages are stored locally and can be opened, exported, and referenced from AI Studio.
- The founder can mark an outcome on a prior decision ("implemented," "abandoned," "modified") from within AI Studio.
- The system completes a full Executive Board review in under 90 seconds on local 8B models.

### Dependencies

- Perspective Engine Phase 1: six executive perspective definitions
- Perspective Engine Phase 2: CEO Synthesis pipeline stage
- Perspective Engine Phase 3: Decision Package schema
- Basic file-system storage for Decision Packages

### Risks

- Local 8B models may not maintain role discipline in six-perspective sessions. Mitigation: test each perspective independently before running full sessions.
- CEO Synthesis context window may be too large at 8B. Mitigation: enforce perspective output length limits in prompts.
- Decision Package schema stability: if the schema changes after Institutional Memory integration, existing records need migration. Mitigation: version the schema from day one.

---

## Milestone 2: The Executive Board

**Theme:** A fully operational Executive Board with Institutional Memory.

### Goals

- The Executive Board learns from past decisions. The Historian provides accurate, actionable historical briefs drawn from stored Decision Packages and outcome records.
- The War Room mode is available for fast weekly stand-up reviews.
- Multiple Decision Modes are operational: Executive Board, General Council (legacy), and at least one additional configuration (Sprint Planning or Engineering Review).
- The Decision Engine is refactored to be configuration-driven: perspectives loaded from a Perspective Registry, synthesizers from a Synthesizer Registry, configurations from a Configuration Registry.

### Success Criteria

- The Historian brief in a new session accurately references a prior relevant decision and its outcome.
- The executive board's recommendations are measurably better when Institutional Memory is active vs. when it is not.
- War Room mode completes a review in under 60 seconds on local hardware.
- A new Decision Mode can be added by creating configuration files only — no engine code changes required.

### Dependencies

- Milestone 1 complete and stable
- Sufficient Decision Package history to demonstrate Institutional Memory value (estimated: 10-20 sessions minimum)
- Perspective Engine Phase 4: Engine refactor to registry-based architecture

### Risks

- Institutional Memory quality depends on the consistency of outcome recording. If the founder does not record outcomes, the system cannot learn. Mitigation: make outcome recording frictionless and visible in the UI.
- Registry architecture refactor may introduce regressions. Mitigation: the external behavior of Council does not change — only the internal loading mechanism changes.

---

## Milestone 3: The Architect

**Theme:** Architecture becomes a working department, not just a concept.

### Goals

- The Engineering Review mode is operational: a technical configuration of the Decision Engine with perspectives covering architecture, security, performance, QA, and DevOps.
- Blueprints are first-class artifacts in AI Studio — created, stored, versioned, and linked to the Decision Packages that produced them.
- Architecture Decision Records are created and maintained from within AI Studio.
- The founder can send a question from the Blacksmith workspace to an Engineering Review session with one action.

### Success Criteria

- An Engineering Review produces a Blueprint that an engineer can implement from without a preliminary design meeting.
- Blueprints are stored in `docs/blueprints/` and linked to the Decision Package that initiated them.
- ADRs are automatically created when an Engineering Review produces a significant technical decision.
- The Blacksmith → Engineering Review pipeline produces a usable artifact from a raw idea within 10 minutes.

### Dependencies

- Milestone 2 complete and stable
- Engineering Review Perspective definitions (Principal Engineer, Security, Performance, Architecture, QA, DevOps)
- Architect Synthesizer definition
- Blueprint and ADR artifact templates and storage

### Risks

- Engineering Review perspectives may not produce sufficiently specific technical guidance at 8B. Mitigation: test and iterate. Consider higher-capability models for the Architecture department if local models are insufficient.
- Blueprint format may not be detailed enough to be actionable without additional context. Mitigation: define Blueprint schema carefully and validate against real implementation attempts.

---

## Milestone 4: The Engineering Company

**Theme:** Engineering becomes a working department. Ideas flow through the full pipeline from Idea to Delivery.

### Goals

- The complete Idea Pipeline is operational within AI Studio: Idea → Understanding → Clarification → Executive Review → Architecture → Planning → Implementation → QA → Delivery → Learning → Institutional Memory.
- Artifact management: all pipeline artifacts are stored, versioned, and accessible within AI Studio.
- Implementation tracking is integrated: the founder can see where any idea is in the pipeline at any time.
- The full Launch Checklist is implemented: every department signs off before delivery.

### Success Criteria

- An idea can move from submission to a QA-reviewed delivered feature entirely within the AI Studio pipeline.
- All artifacts from the pipeline are stored and cross-referenced.
- The Institutional Memory for a completed pipeline run includes the Decision Package, Blueprint, Test Report, Deployment Record, and Outcome Assessment.
- The pipeline produces genuinely higher-quality output than an unstructured approach for the same effort.

### Dependencies

- Milestone 3 complete and stable
- Implementation tracking UI
- Artifact storage and versioning system
- QA module with test plan and defect tracking

### Risks

- Pipeline complexity may outpace the founder's ability to maintain process discipline. Mitigation: make each stage as automated and guided as possible. The pipeline should feel like a series of natural next steps, not a bureaucratic maze.
- Artifact storage may become unwieldy without good navigation. Mitigation: invest in indexing and cross-reference infrastructure before the artifact count grows large.

---

## Milestone 5: The Creative Company

**Theme:** Creative becomes a working department. AI Studio can guide, generate, and evaluate creative work.

### Goals

- The Creative Review mode is operational: a creative configuration of the Decision Engine for evaluating design, brand, and content decisions.
- Image Studio, Video Studio, and Voice Studio are fully integrated into the idea pipeline — creative outputs are tracked as first-class artifacts.
- Creative Briefs and Design Specifications are produced by the Creative department and stored in the artifact system.
- The founder can move from an approved creative decision to a generated visual or video asset within AI Studio.

### Success Criteria

- A Creative Review produces a Creative Brief that the Creative department can execute from.
- Generated assets (images, videos) are linked to the Creative Brief that commissioned them.
- The full creative pipeline — Brief → Design → Generate → Review → Approve — is traceable within AI Studio.

### Dependencies

- Milestone 4 complete and stable
- Creative Review Perspective definitions
- Creative Synthesizer definition
- Deep integration between the Decision Engine and Image/Video generation

### Risks

- Creative quality assessment is subjective. LLM perspectives on design quality may be unreliable. Mitigation: Creative Review outputs are recommendations, not verdicts. The founder retains final creative authority.

---

## Milestone 6: Institutional Memory

**Theme:** AI Studio becomes an organization that genuinely learns from its history.

### Goals

- Institutional Memory is a fully operational department: every Decision Package is stored, every outcome is linked, every accuracy assessment is computed.
- The Historian brief in new sessions draws on a rich, accurate history of decisions, outcomes, recurring risks, and recurring opportunities.
- The Executive Board's confidence calibration is demonstrably accurate: when the board says it is 80% confident, it is correct roughly 80% of the time.
- The founder can query AI Studio's decision history: "What have we decided about user onboarding?", "What has the Council recommended and how often was it right?"

### Success Criteria

- Decision accuracy is tracked and demonstrably improving over time.
- The Historian brief identifies at least one relevant historical precedent in 80% of Executive Board sessions.
- The founder reports that knowing the organization's decision history makes current decisions feel more grounded.

### Dependencies

- Milestones 1–5 complete (enough history to make Institutional Memory meaningful)
- Decision accuracy tracking infrastructure
- Natural language query interface for the decision history

### Risks

- Institutional Memory is only as good as the outcomes recorded. A founder who never records outcomes gets a Historian with nothing to say. Mitigation: outcome recording must be a minimal, frictionless action — not a detailed retrospective required for every decision.

---

## Milestone 7: Autonomous Project Companies

**Theme:** AI Studio operates as infrastructure for multiple independent project companies.

### Goals

- Each project (Project Foundry, AI Academy, Fern & Friend, etc.) has its own Decision Engine configuration, Institutional Memory, and pipeline state within AI Studio.
- Projects can have different Perspective definitions, Synthesizer choices, and Decision Mode configurations.
- AI Studio serves as the operating platform across all projects without the founder manually context-switching between different tool configurations.
- The founder operates at the level of strategic oversight — approving recommendations and recording outcomes — while the organization handles the rest autonomously.

### Success Criteria

- Three or more distinct project configurations run simultaneously in AI Studio without interfering with each other.
- The founder can context-switch between projects and immediately have the full organizational context of that project available.
- At least one project has a complete Institutional Memory history that meaningfully informs its current Executive Board recommendations.

### Dependencies

- All prior milestones complete
- Multi-project isolation in the Decision Engine and Institutional Memory
- Cross-project learning infrastructure (optional: learnings from one project may be relevant to another)

### Risks

- Complexity of managing multiple project configurations may make AI Studio feel unwieldy. Mitigation: each project's configuration is isolated and the UI presents one project at a time.
- Autonomous operation risks: if the organization operates with too little founder oversight, decisions may drift from the founder's actual intent. Mitigation: all decisions still require founder approval. Autonomy means reduced friction, not reduced authority.

---

## Cross-Milestone Dependencies

```
Milestone 1 (Idea Loop)
  └── Milestone 2 (Executive Board + Institutional Memory)
        └── Milestone 3 (The Architect)
              └── Milestone 4 (Engineering Company)
                    ├── Milestone 5 (Creative Company)
                    └── Milestone 6 (Institutional Memory — full)
                          └── Milestone 7 (Autonomous Project Companies)
```

Each milestone builds on the one before it. No milestone should be started until the prior one meets its success criteria. This is not a schedule — it is a dependency graph.

---

## What This Roadmap Does Not Cover

- **External distribution** — AI Studio is a personal operating system. If it ever becomes a product distributed to others, a separate roadmap is required.
- **Cloud integration** — This roadmap assumes local-only operation. Cloud integration, if desired, is a separate architectural decision.
- **Multi-user operation** — The current architecture is designed for one founder. Team features would require a substantial architectural review.
- **Commercial features** — No commercial features are planned. This roadmap is about building an operating company, not a revenue stream.

---

*See also: `02_PRODUCT_VISION.md` for the strategic vision this roadmap serves. `04_IDEA_PIPELINE.md` for the pipeline that Milestone 4 operationalizes. `07_DECISION_ENGINE.md` for the architecture that Milestones 1 and 2 build.*
