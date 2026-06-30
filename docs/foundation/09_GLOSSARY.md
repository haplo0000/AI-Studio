# AI Studio — Glossary

**Version:** 1.0  
**Date:** 2026-06-30  
**Status:** Canonical vocabulary — use these terms consistently across all documents, discussions, and code

---

## Purpose

Language precision is organizational precision. When the same word means different things to different people, miscommunication is guaranteed. When terms are used consistently, documents, code, conversations, and AI prompts can all refer to the same concept without ambiguity.

This glossary defines the canonical vocabulary of AI Studio. When these terms appear in documentation, code identifiers, system prompts, or conversation, they carry the meaning defined here. If a term needs to be used in a different sense, it must be qualified.

---

## Terms

---

### Architect

**What it is:**  
The AI department responsible for technical system design. The Architect produces Blueprints and Architecture Decision Records before implementation begins. The Architect does not write production code — it designs the systems that Engineering implements.

**What it is not:**  
Not an individual (there is no human named "the architect" in AI Studio). Not a role within the Engineering department. Not the same as a senior engineer.

**See also:** Architecture (Department), Blueprint, ADR

---

### Architecture Decision Record (ADR)

**What it is:**  
A compact, permanent record of a specific technical decision — what was decided, why, what alternatives were rejected, and what the consequences are. ADRs are numbered sequentially and never modified; when a decision changes, a new ADR supersedes the prior one.

**What it is not:**  
Not a design document. Not a blueprint. Not a commit message. An ADR records why, not how.

**Storage:** `docs/decisions/ADR-NNN-description.md`

---

### Artifact

**What it is:**  
A structured, persistent output produced by a department. Artifacts are the deliverables of organizational work. They outlast the context in which they were created. They are actionable by their consumers.

**What it is not:**  
Not a conversation. Not a draft. Not an intermediate calculation. An artifact is complete enough to be reviewed and acted on by another department.

**See also:** Artifact System (document `05_ARTIFACT_SYSTEM.md`)

---

### Blueprint

**What it is:**  
A complete technical design produced by the Architecture department before implementation begins. A Blueprint specifies what will be built and how, in enough detail that two engineers would implement the same solution from it. Engineering implements the Blueprint.

**What it is not:**  
Not a high-level sketch. Not an implementation note. Not a feature specification. A Blueprint is the technical contract between Architecture and Engineering.

**Storage:** `docs/blueprints/`

---

### Company

**What it is:**  
In AI Studio's context: the organization that AI Studio operates as on behalf of its founder. This organization has departments, artifacts, memory, and purpose. It is not a legal entity — it is an organizational model that AI Studio implements.

**What it is not:**  
Not a corporate structure. Not a registered business. Not a team of human employees.

---

### Council

**What it is:**  
The user-facing name for AI Studio's Executive Board review capability. When the founder opens Council and submits a question, they are running an Executive Board review session powered by the Decision Engine. The word "Council" appears in the user interface. Internally, Council is one configuration of the Decision Engine.

**What it is not:**  
Not the Decision Engine itself. Not a standalone product. Not the same as the Executive Board department (which is an organizational concept — Council is its implementation).

**See also:** Decision Engine, Executive Board, Decision Mode

---

### Creative Director

**What it is:**  
One of the six Executive Perspectives in the Executive Board configuration. The Creative Director's domain covers design quality, emotional impact, visual polish, product feel, and brand coherence. The Creative Director does not assess architecture, business strategy, or technical feasibility.

**What it is not:**  
Not a personality. Not a creative generalist. Not the same as the Creative department (which is an organizational department — the Creative Director is a Perspective within an Executive Board session).

---

### Decision Mode

**What it is:**  
A named configuration of the Decision Engine exposed to the user in the Council interface. Decision Modes include Executive Board, General Council, Engineering Review, Creative Review, Sprint Planning, and War Room. Each mode uses a different set of Perspectives, a different Synthesizer, and potentially a different Pipeline Preset.

**What it is not:**  
Not a topic category. Not a filter. Not a personality mode. A Decision Mode defines the organizational structure of a review session.

---

### Decision Package

**What it is:**  
The primary structured output of the Decision Engine. A Decision Package contains the complete record of a review session: the question asked, every Perspective's assessment, the Synthesizer's recommendation, the confidence scores, the opportunity cost, the success metrics, the risks, the opportunities, and the packager's validation notes. The Decision Package is the only artifact exported from a review session. Internal session state is never exposed.

**What it is not:**  
Not a summary of the conversation. Not a raw LLM response. Not a transcript. The Decision Package is a structured, validated artifact — not a record of how the decision was made.

**Storage:** `C:\AI\AIStudio\decisions\`

---

### Department

**What it is:**  
A functional division of AI Studio's organizational model. Each department has a defined mission, a set of responsibilities, clear inputs and outputs, artifacts it produces, and authority boundaries it must not exceed. The current departments are: Executive Board, Product, Architecture, Engineering, Creative, QA, Operations, Marketing, and Institutional Memory.

**What it is not:**  
Not a team of people. Not a software module. Not a folder in the codebase. Departments are organizational concepts — their implementation is the AI systems and pipelines that carry out their responsibilities.

**See also:** Organization Model (document `03_ORGANIZATION_MODEL.md`)

---

### Executive Board

**What it is:**  
The AI Studio department responsible for strategic decisions. The Executive Board operates the Council — reviewing ideas, producing Decision Packages, and advising the founder on what to build next. Within a review session, the Executive Board consists of six disciplined Perspectives plus a CEO Synthesizer and a Report Packager.

**What it is not:**  
Not a committee that meets on a schedule. Not a governance layer. Not the founder's personal assistant. The Executive Board provides structured expert advice — the founder retains all decision authority.

---

### Founder

**What it is:**  
The human operator of AI Studio. The founder is the only human in the organizational model. All departments serve the founder. All decisions require founder acknowledgment or approval. The founder sets direction, approves artifacts, records outcomes, and maintains the organization's purpose.

**What it is not:**  
Not a user in the traditional software sense. Not a customer. The founder is the owner and operator of the organization that AI Studio powers.

---

### General Council

**What it is:**  
The legacy Decision Mode that preserves the original three-persona debate model: Engineer, Skeptic, Generalist, with a Moderator synthesizer. General Council evaluates argument quality and reasoning correctness. It is maintained as a valid configuration for questions that benefit from free-form debate.

**What it is not:**  
Not the primary or recommended mode for product decisions. Not the organizational model that the Executive Board uses. General Council is legacy behavior preserved by design, not the future direction of the Decision Engine.

---

### Historian

**What it is:**  
The first stage of the Decision Engine pipeline. The Historian reviews the archive of prior sessions in Institutional Memory and produces a historical brief that informs the current review. The Historian surfaces relevant prior decisions, their outcomes, recurring risks, and recurring opportunities. The Historian does not make recommendations — it provides context.

**What it is not:**  
Not a Perspective. Not a department. Not the Institutional Memory department itself. The Historian is a pipeline stage that reads from Institutional Memory and writes a brief.

---

### Idea

**What it is:**  
The first stage of the Idea Pipeline. An Idea is a raw, unrefined thought — a possible feature, a problem noticed, an opportunity observed. Ideas are captured before they are evaluated. No Idea is too early or too rough to record.

**What it is not:**  
Not a decision. Not a requirement. Not a plan. An Idea is an input to a process, not an output.

---

### Institutional Memory

**What it is:**  
The AI Studio department responsible for preserving and surfacing organizational knowledge. Institutional Memory archives every Decision Package, every outcome record, every retrospective note, and every accuracy assessment. It tracks what the organization decided, what happened, and whether the organization was right. It supplies the Historian with briefing material for new sessions.

**What it is not:**  
Not a database. Not a chat history. Not a file archive. Institutional Memory is a department with a mission: ensure the organization never forgets what it learned.

---

### Knowledge Entry

**What it is:**  
The artifact produced by the Institutional Memory department. A Knowledge Entry links a Decision Package to its outcome, preserving the complete record of what was decided, why, and what happened afterward. Knowledge Entries are the raw material from which the Historian constructs briefs.

---

### Perspective

**What it is:**  
A disciplined domain viewpoint used in a Decision Engine review session. Each Perspective assesses a question from a specific area of expertise. Perspectives do not wander into other domains. They are data-driven definitions — not personalities or personas. Any configuration of the Decision Engine can use any Perspective from the Perspective Registry.

**What it is not:**  
Not a character. Not an AI personality. Not a general assistant that happens to have a name. A Perspective is a constrained domain assessor.

**See also:** Perspective Registry, Decision Engine

---

### Perspective Registry

**What it is:**  
The catalog of all available Perspective definitions. The Decision Engine looks up Perspectives from the registry by ID — it never imports them directly. Adding a new Perspective means adding an entry to the registry; no engine code changes are required.

---

### Project Company

**What it is:**  
A configuration of AI Studio dedicated to a specific project — its own Decision Engine configuration, its own Institutional Memory, its own pipeline state. Examples: Project Foundry's configuration, AI Academy's configuration. A Project Company is the organizational infrastructure for one project, running within AI Studio.

**What it is not:**  
Not a separate software installation. Not a separate legal entity. A Project Company is an isolated configuration within a single AI Studio instance.

---

### Report Packager

**What it is:**  
The final stage of the Decision Engine pipeline. The Report Packager receives the Synthesizer's output, validates coverage and completeness, computes the overall confidence score, assembles the full Decision Package, and flags contradictions. The Packager does not make strategic decisions — it validates that a decision was made and packages it correctly.

**What it is not:**  
Not the Chairperson in its old form (which mixed strategy and packaging). Not an editor or content reviewer. The Packager's job is structural validation and assembly, not content creation.

---

### Synthesizer

**What it is:**  
The decision-making stage of the Decision Engine pipeline. After all Perspectives have produced their domain assessments, the Synthesizer reads the full picture and produces the leadership recommendation. The Synthesizer commits to a direction — it does not summarize or hedge. Different configurations use different Synthesizers (CEO, Architect, Creative, Product, Investor).

**What it is not:**  
Not the same as the Report Packager (which formats and validates). Not a summarizer. Not an aggregator. The Synthesizer makes the decision.

---

### War Room

**What it is:**  
A fast Decision Mode optimized for speed. War Room uses a reduced pipeline (no Historian, no Cross-Impact Review), three Perspectives, a CEO Synthesizer, and produces five outputs: Highest Priority, Biggest Risk, Biggest Opportunity, What to Stop Doing, This Week's Plan. Target completion time: under 60 seconds. Designed for morning stand-ups and weekly tactical reviews.

**What it is not:**  
Not an emergency mode. Not a shortcut for important decisions. War Room is for tactical decisions that need to be made quickly, not for strategic decisions that deserve full deliberation.

---

## Naming Conventions

Terms in this glossary appear in documentation with initial capitals when used as proper names (e.g., "The Decision Package is reviewed by the Founder"). They appear lowercase when used as general concepts (e.g., "an idea is a raw thought").

Code identifiers follow the naming conventions established in the codebase (camelCase for variables and functions, PascalCase for types and components, kebab-case for IDs and configuration keys).

Prompt text for AI systems should use these terms consistently. A system prompt that says "you are an executive" and another that says "you are a perspective" refer to different organizational concepts. Precision in prompts produces precision in outputs.

---

*This glossary is a living document. When a new term is introduced to AI Studio's vocabulary, add it here before using it in documents, code, or prompts. A term that is not in the glossary is a term that has not been agreed upon.*
