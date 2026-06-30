# AI Studio — Decision Engine Architecture

**Version:** 1.0  
**Date:** 2026-06-30  
**Status:** Foundational

---

## What the Decision Engine Is

The Decision Engine is the organizational intelligence layer of AI Studio. It is the system by which AI Studio assembles multiple expert perspectives, synthesizes them into a decision, and packages that decision as a structured artifact.

Council OS is one configuration of the Decision Engine. It is not the Decision Engine itself.

This distinction is critical. Council OS is what the user opens when they want an Executive Board review of an idea. The Decision Engine is the infrastructure that makes Council OS possible — and that will make Engineering Review, Creative Review, Sprint Planning, Investment Review, War Room, and every future review mode possible without rebuilding the infrastructure.

The Decision Engine has no opinions about who the perspectives are. It does not know about CEOs, CTOs, or Creative Directors. It knows about Perspectives, Synthesizers, Packagers, and Decision Packages. The rest is configuration.

---

## Core Concepts

### Perspective

A Perspective is a disciplined domain viewpoint. It represents a specific area of expertise — not a personality, not a persona, and not a generalist opinion. A Perspective answers only from its domain. It does not wander into the territory of other Perspectives.

A Perspective definition includes:
- What domain it represents
- What it is qualified to assess
- What it is explicitly not qualified to assess
- How it should communicate its assessment
- What its minimum deliverable is (a domain statement plus a one-sentence recommendation)

The Decision Engine holds no Perspectives itself. It receives a list of Perspective IDs from the configuration, looks them up in the Perspective Registry, and runs them.

### Perspective Registry

The Perspective Registry is the catalog of all available Perspectives. Any Perspective that has been defined can be used by any configuration. Perspectives are added to the registry — they are never hard-coded into the engine.

The registry enables two things: reuse (the CTO Perspective can be used in Executive Board review and Engineering Review) and replacement (the CTO Perspective can be updated without changing anything except its definition file).

### Synthesizer

A Synthesizer is the decision-maker in a review session. After all Perspectives have delivered their domain assessments, the Synthesizer reads the full picture and produces the leadership recommendation.

The Synthesizer's job is to decide, not to summarize. A summary records what was said. A decision commits to a direction given everything that was said. The Synthesizer must commit.

Different configurations use different Synthesizers. The Executive Board uses a CEO Synthesizer who optimizes for product leadership decisions. An Engineering Review uses an Architect Synthesizer who optimizes for technical soundness. An Investment Review uses an Investor Synthesizer who optimizes for return on investment.

The Synthesizer produces the primary content of the Decision Package — the recommendation, the decision, the confidence assessments, the opportunity cost, the success metrics, and the risk and opportunity assessments.

### Report Packager

The Report Packager receives the Synthesizer's output and converts it into a validated, structured Decision Package.

The Packager does not make decisions. It validates that a decision was made, that all required fields are present, that Perspective coverage was adequate, and that any contradictions are surfaced. It computes the overall confidence score from the three component scores. It assembles the final artifact.

The separation between Synthesizer and Packager exists for one reason: combining strategic decision-making with report formatting in a single step produces neither a good decision nor a good report. They require different cognitive frames.

### Decision Package

The Decision Package is the primary public output of the Decision Engine. It is a structured, versioned artifact that contains the complete record of a decision review session — the question, the perspectives, the recommendation, the confidence, the risks, the opportunities, the success metrics, and the institutional memory of what was decided.

Everything that consumers of the Decision Engine receive — the UI, the export functions, Institutional Memory — receives it from the Decision Package. Internal session state (raw LLM responses, call timings, retry history) is never exposed to consumers. The Decision Package is the boundary.

### Pipeline Preset

A Pipeline Preset defines the sequence of stages that the engine runs for a given configuration. The engine does not hard-code "run Historian, then Perspectives, then CEO." It runs whatever preset the configuration specifies.

Available presets:

**Standard** — `Historian → Perspectives → Synthesis → Packaging`  
The default for most configurations. Includes historical context. No cross-impact stage. Best quality-to-latency ratio for most use cases.

**Full** — `Historian → Perspectives → Cross-Impact → Synthesis → Packaging`  
Adds a Cross-Impact Review stage where each Perspective identifies how other domains affect their own area. Higher quality in complex decisions where cross-domain interactions are significant. Higher latency.

**Fast** — `Perspectives → Synthesis → Packaging`  
No historical context. No cross-impact. Optimized for speed. Used in War Room mode and time-sensitive reviews.

**Minimal** — `Perspectives → Synthesis`  
For development, prototyping, and testing new Perspective definitions. Not for production decisions.

---

## Council OS as a Configuration

Council OS is the Decision Engine running with the Executive Board configuration:

```
Configuration: Executive Board
Perspectives:
  - Head of Product
  - CTO
  - Creative Director
  - Customer Advocate
  - Business Strategist
  - Operations Lead
Synthesizer: CEO
Pipeline: Standard
Decision Vocabulary: Executive (Build Now / Prototype / Research Further / Delay / Reject)
```

When the user opens Council OS and submits a question, the Decision Engine:
1. Looks up each Perspective by ID in the Perspective Registry
2. Looks up the CEO Synthesizer in the Synthesizer Registry
3. Runs the Standard pipeline: Historian → 6 Perspectives (parallel) → CEO Synthesis → Packager
4. Returns a Decision Package

The user sees Council OS. The engine sees a configuration.

---

## Decision Modes

A Decision Mode is a named Council configuration exposed to the user. Modes are how the user accesses different configurations of the Decision Engine without knowing they exist.

### General Council

The legacy mode. Three perspectives — Engineer, Skeptic, Generalist — with a Moderator synthesizer that evaluates argument quality. The original behavior of Council OS. Preserved as a valid configuration for questions that benefit from free-form debate over disciplined domain separation.

### Executive Board

The primary mode for product strategy decisions. Six specialized executive perspectives with a CEO synthesizer. Produces actionable leadership recommendations. Answers the question: *What should we do next?*

### Engineering Review

A technical configuration. Six engineering-focused perspectives — Principal Engineer, Security, Performance, Architecture, QA, DevOps — with an Architect synthesizer. Produces technical recommendations. Answers the question: *How should we build this?*

### Creative Review

A creative configuration. Five creative perspectives — Creative Director, Art Director, Story, Brand, UX — with a Creative synthesizer. Produces creative direction. Answers the question: *What should this feel like and why?*

### Sprint Planning

A focused tactical configuration. Four perspectives — Head of Product, CTO, Operations Lead, Customer Advocate — with a Product synthesizer. Produces a prioritized sprint recommendation. Answers the question: *What do we build this week?*

### War Room

A fast executive mode. Three perspectives — Head of Product, CTO, Operations Lead — with a CEO synthesizer running the Fast pipeline (no Historian, no Cross-Impact). Produces five outputs: Highest Priority, Biggest Risk, Biggest Opportunity, What to Stop Doing, This Week's Plan. Target: under 60 seconds. Optimized for morning stand-ups.

### Ask One Executive

A focused single-perspective mode. The user selects one Perspective. That Perspective answers directly. No synthesis, no packaging, just domain expertise on demand. Useful when the user has a specific question for a specific domain.

### Blind Spot Detector

A provocative configuration. Three perspectives — Devil's Advocate, Assumption Challenger, Risk Identifier — designed to stress-test an existing plan or decision. Does not produce a positive recommendation. Produces the three most likely ways the current plan fails.

---

## Institutional Memory Integration

Every Decision Package is archived in Institutional Memory after the founder records an outcome. The Historian stage of the Decision Engine reads this archive before producing its brief for each new session.

This creates a feedback loop:

1. Decision is made → Decision Package archived
2. Founder implements (or doesn't) → Outcome recorded
3. Next session → Historian reads prior decisions and outcomes
4. CEO Synthesizer receives richer context → Better recommendations

Over time, the Decision Engine becomes calibrated to the specific history of the organization that uses it. The confidence scores become more accurate because the Historian can report: "Last time the Council was this confident and this was the decision type, the outcome was X in Y of Z cases."

This is the long-term value proposition of the Decision Engine. Not just better single decisions. Better decisions that compound.

---

## Extensibility

The Decision Engine is designed to support configurations that do not yet exist without any engine changes. Adding a new configuration requires:

1. Defining new Perspective files (if the configuration requires Perspectives not already in the registry)
2. Defining a new Synthesizer (if the configuration requires one not already in the registry)
3. Defining the CouncilConfiguration — the list of perspective IDs, the synthesizer ID, and the pipeline preset
4. Registering the configuration in the ConfigurationRegistry
5. Adding the configuration to the UI as a Decision Mode

No engine code changes. No pipeline changes. No schema changes (unless new output fields are needed, which is a schema evolution, not an engine change).

This is the correct application of Design Principle 1: Configuration over Specialization.

---

## What the Decision Engine Is Not

**It is not a chatbot.** Chatbots respond to any input with a general response. The Decision Engine routes specific questions to specific domain experts, synthesizes their responses, and produces structured artifacts.

**It is not a recommendation engine.** Recommendation engines suggest products or content based on behavioral patterns. The Decision Engine evaluates strategic decisions against specialized expertise.

**It is not an autonomous agent.** The Decision Engine does not act. It deliberates and advises. The founder acts. The distinction between analysis and authority is non-negotiable.

**It is not a debate club.** The current council debate scoring approach is the General Council mode — a legacy configuration. The primary operation of the Decision Engine is disciplined domain assessment, not argument quality evaluation.

---

*See also: `03_ORGANIZATION_MODEL.md` (Executive Board department). `06_DESIGN_PRINCIPLES.md` (Principle 1, Principle 9). `09_GLOSSARY.md` (Decision Package, Synthesizer, Perspective).*
