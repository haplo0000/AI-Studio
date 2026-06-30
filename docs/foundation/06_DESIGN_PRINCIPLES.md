# AI Studio — Design Principles

**Version:** 1.0  
**Date:** 2026-06-30  
**Status:** Foundational — these are permanent engineering rules

---

## Status of This Document

These principles are not guidelines. They are rules.

A guideline is a suggestion that can be overridden with good reason. A rule requires explicit justification to override — and that justification must be documented. If a design decision violates one of these principles, that violation must be named, reasoned, and recorded in an Architecture Decision Record before implementation proceeds.

The cost of exceptions is real. Unprincipled exceptions become precedents. Precedents become architecture.

---

## Principle 1: Configuration over Specialization

An engine should be general. Configuration should make it specific.

Hard-coding a behavior that could instead be driven by a configuration value is a design failure. It means the next variation of the same behavior requires a code change instead of a data change.

**What this means in practice:**  
- Perspective roles are configuration. The Perspective Engine has no knowledge of CEO, CTO, or Operations Lead.  
- Decision vocabularies are configuration. "Build Now" vs "Implement" vs "Invest" are vocabulary choices, not engine logic.  
- Pipeline stages are configuration presets. "Run Historian, then Perspectives, then CEO" is a named preset, not a code path.

**When it does not apply:**  
Not everything should be configurable. The things that will never change — the contract between Synthesizer and Decision Package, the structure of the export pipeline — may be appropriately hard-coded. Configuration has overhead. Apply this principle where variation is expected, not everywhere.

---

## Principle 2: One Responsibility per Component

A component does exactly one thing. A function solves exactly one problem. A module owns exactly one domain.

When a component does two things, it must be changed for two different reasons. When it must be changed for two different reasons, the changes conflict. When changes conflict, bugs happen.

**What this means in practice:**  
- The Synthesizer makes the recommendation. The Packager formats and validates it. These are not combined.  
- `reportBuilder.ts` builds the report structure. `reportExporter.ts` formats it for output. These are not combined.  
- The CEO system prompt makes a decision. The Chairperson system prompt validates and packages it. These are not combined.

**The test:**  
Can you describe what this component does in one sentence without using the word "and"? If not, it has more than one responsibility.

---

## Principle 3: Simple Before Clever

A simple solution that works is better than a clever solution that also works.

Clever solutions are impressive. They are also difficult to read, difficult to debug, difficult to modify, and difficult to explain. Simple solutions age better.

**What this means in practice:**  
- Prefer a registry that is a plain object map over a dependency injection container.  
- Prefer sequential function calls over reactive pipelines where sequential calls are sufficient.  
- Prefer named constants over computed values where the computation adds no value.  
- Prefer explicit code over implicit conventions.

**The test:**  
Can a developer who did not write this code understand what it does in five minutes without reading the documentation? If not, it may be too clever.

---

## Principle 4: Architecture Before Implementation

Significant implementations must be preceded by architectural design. Code written without a design is not implementation — it is exploration. Exploration is valuable. It should be recognized as exploration and not committed to production as if it were design.

**What this means in practice:**  
- A Blueprint exists before Engineering begins on any non-trivial feature.  
- Architecture is reviewed by the architect (or founder-as-architect) before work starts.  
- Significant deviations from the Blueprint during implementation require Architecture notification and an ADR.

**The exception:**  
Prototypes and spikes are explicitly exploratory. They are not subject to this rule — but they are not promoted to production without first producing a Blueprint based on what the exploration revealed.

---

## Principle 5: Backward Compatibility is a First-Class Constraint

Users and systems that depend on AI Studio's behavior must not find it broken after an update. If a schema changes, old data must still load. If an API changes, prior callers must still work. If a component moves, its consumers must still find it.

**What this means in practice:**  
- `normalizeSession` handles all schema migrations. Old sessions are never orphaned.  
- New fields are optional. Required fields are never added to existing schemas without migration.  
- API surface changes are versioned or additive.  
- Export formats (plain text, markdown, JSON) never remove fields without a deprecation cycle.

**The principle in tension:**  
Backward compatibility has limits. Carrying forward every prior design decision indefinitely produces incoherent systems. When backward compatibility must be broken, it is broken deliberately, documented explicitly, and migrated cleanly — not silently.

---

## Principle 6: Internal Complexity Never Reaches the User

The internal architecture of AI Studio can be as sophisticated as the problem requires. The user experience must be as simple as the user needs.

Abstractions, registries, pipelines, configuration layers, and synthesizer hierarchies are internal engineering decisions. The user should never need to know they exist in order to benefit from the system.

**What this means in practice:**  
- The Perspective Engine is never mentioned in the UI. The UI says "Council."  
- A user submitting an idea does not choose a pipeline preset. They choose a mode.  
- Confidence scores are explained in plain language, not as "evidenceConfidence / alignmentConfidence / feasibilityConfidence."  
- Errors are communicated in terms of what the user can do, not in terms of what the system failed to do.

**The test:**  
If a user sees this, do they need to know anything about how it works to act on it?

---

## Principle 7: Interrupt the Founder as Little as Possible

The founder's attention is the scarcest resource in the system. AI Studio should work quietly, produce quality output, flag genuine problems, and present decisions cleanly — without requiring constant supervision.

**What this means in practice:**  
- Services start in the background at launch without requiring founder interaction.  
- Long-running operations (LLM calls, builds) report progress without demanding acknowledgment.  
- Errors are categorized: those that require founder action immediately, those that require attention before proceeding, and those that are informational only.  
- The system never asks for confirmation on actions that are obviously correct.  
- The system always asks for confirmation on actions that are irreversible.

---

## Principle 8: Every Subsystem Must Be Replaceable

No component of AI Studio should be so tightly coupled that replacing it requires rewriting everything around it.

LLM models will change. Local models will be replaced by better local models. The underlying compute platform will evolve. UX patterns that work today will be superseded. Designing for replacement is not pessimism — it is realism.

**What this means in practice:**  
- The LLM provider is called through an adapter, not directly. Replacing Ollama means replacing the adapter, not the pipeline.  
- The Decision Package schema is the boundary between the engine and the UI. The UI does not read raw LLM responses.  
- Perspective definitions are configuration files. Replacing a perspective means editing a file, not modifying the engine.  
- Storage layer (localStorage, file system, SQLite) is accessed through an abstraction. Replacing the storage mechanism means replacing the adapter.

---

## Principle 9: Prefer Reusable Engines

The most valuable investment is in the engine, not in a single configuration of it.

An engine that powers one configuration is infrastructure for one use case. An engine that powers ten configurations is infrastructure for the organization.

**What this means in practice:**  
- Council is one configuration of the Perspective Engine, not a standalone system.  
- The Idea Pipeline is one application of the Artifact System, not a custom workflow.  
- The Blacksmith conversation layer is one mode of the underlying session system, not a unique implementation.

**The question to ask:**  
If we wanted to do this again with different inputs, would we need to rebuild it, or would we just need a new configuration?

---

## Principle 10: No Fake Success

A completed task means it works. A shipped feature means it is stable in production. A passing test means it verifies the behavior it claims to verify.

False progress is worse than no progress. A system that reports success when it has not succeeded produces false confidence that leads to compounding failures.

**What this means in practice:**  
- Tests that pass on mock data but do not test real behavior are labeled as integration-pending, not as passing.  
- A feature is not marked complete until it has been reviewed, tested, and deployed.  
- A service is not marked healthy until it is actually healthy.  
- An LLM response is not marked successful until it has been parsed and validated against the expected schema.

---

## Principle 11: Every Decision Has a Trail

Significant decisions — architectural, strategic, or product — are documented before or immediately after they are made. The documentation does not need to be long. It must be findable.

An undocumented decision is a decision that will be made again, differently, by someone who did not know it was already made.

**What this means in practice:**  
- Architecture Decision Records exist for every significant structural choice.  
- The Decision Package exists for every significant strategic choice.  
- Deviations from Blueprints are documented in Implementation Notes.  
- Rejected ideas are archived with the rationale that rejected them.

---

## Principle 12: Determinism Over Cleverness

Given the same input, a system should produce the same output. Where determinism is not possible (LLM responses, network calls), the system should behave consistently: same error handling, same retry logic, same fallback behavior.

Clever conditional behavior that makes the system act differently in ways that are hard to predict is a reliability risk and a debugging nightmare.

**What this means in practice:**  
- JSON parsing from LLM responses uses a consistent extractor, not ad-hoc regex per call site.  
- Service health checks use consistent probe intervals and timeout logic.  
- Schema migrations are explicit and versioned, not inferred at runtime.

---

## Principle 13: Finish Before Expanding

The most dangerous moment in any project is when it almost works. The temptation to add the next capability before the current one is stable is the source of most technical debt.

A system that is 90% complete on five features is a worse system than one that is 100% complete on three features.

**What this means in practice:**  
- A feature is not considered complete until it has passed QA and been deployed.  
- New features are not started if existing features have unresolved defects of Medium severity or higher.  
- The roadmap is not expanded during active implementation unless the expansion is directly required for the current work.

---

## Applying the Principles

When a design decision is being made, run through this checklist:

1. Is this configuration-driven where it could be? (Principle 1)
2. Does this component have exactly one responsibility? (Principle 2)
3. Is this simpler than it needs to be, or is it cleverer than it should be? (Principle 3)
4. Is there a Blueprint before implementation begins? (Principle 4)
5. Does this break anything that was working before? (Principle 5)
6. Does this expose internal complexity to the user? (Principle 6)
7. Will this require the founder's attention unnecessarily? (Principle 7)
8. Could this component be replaced without rewriting its neighbors? (Principle 8)
9. Is this a specialized solution to a general problem? (Principle 9)
10. Does this report accurate success? (Principle 10)
11. Is this decision documented? (Principle 11)
12. Is this deterministic and consistent? (Principle 12)
13. Is the current layer finished before this expansion begins? (Principle 13)

A design that passes this checklist is a design that follows the principles. A design that fails any item requires explicit justification documented in an ADR.

---

*See also: `01_AI_STUDIO_CONSTITUTION.md` for the philosophical foundation behind these rules. `07_DECISION_ENGINE.md` for an example of these principles applied in a major architectural decision.*
