# AI Studio — Idea Pipeline

**Version:** 1.0  
**Date:** 2026-06-30  
**Status:** Foundational

---

## Overview

Every product that AI Studio builds begins with a thought and ends with something in use. The stages between those two points are the Idea Pipeline — a disciplined sequence that ensures ideas are understood before they are evaluated, evaluated before they are designed, designed before they are built, and built before they are shipped.

The pipeline is not a bureaucratic checklist. It exists because skipping stages is how organizations build the wrong things well. The cost of moving quickly through early stages is paid with exponential waste in later stages.

Not every idea completes the full pipeline. Many ideas are rejected at review. Some are deferred. Some become something entirely different by the time they reach implementation. The pipeline's job is to produce the best possible outcome for the ideas that deserve to proceed, and to stop the ideas that do not.

---

## The Pipeline at a Glance

```
IDEA
  │
  ▼
UNDERSTANDING
  │
  ▼
CLARIFICATION
  │
  ▼
EXECUTIVE REVIEW ──── Rejected → Archived to Institutional Memory
  │
  ▼
ARCHITECTURE
  │
  ▼
PLANNING
  │
  ▼
IMPLEMENTATION
  │
  ▼
CREATIVE
  │
  ▼
QA
  │
  ▼
DELIVERY
  │
  ▼
LEARNING
  │
  ▼
INSTITUTIONAL MEMORY
```

---

## Stage 1: Idea

### Purpose
Capture the raw thought before it is refined, improved, or second-guessed. Ideas are fragile at inception. The purpose of this stage is to record them faithfully, not evaluate them.

### Owner
Founder

### Inputs
A thought. An observation. A frustration. An opportunity noticed. A feature seen in another product. A pattern discovered in prior work.

### Outputs
Idea Brief — a raw, unedited statement of the idea including: what it is, what problem it solves, what inspired it, and any immediate concerns or constraints the founder already sees.

### Approval Gate
None. Every idea progresses to Understanding. Evaluation comes later.

### Expected Artifacts
- Idea Brief (informal)

### Notes
The Idea stage should take minutes, not hours. The goal is to capture the idea before it evaporates or before the founder's internal critic suppresses it. Refinement happens in Understanding.

---

## Stage 2: Understanding

### Purpose
Develop the idea enough to make it reviewable. An idea in the founder's head is not the same as an idea on paper. Writing forces precision. Understanding surfaces the assumptions already embedded in the idea before anyone else reviews it.

### Owner
Founder (with Blacksmith support)

### Inputs
- Idea Brief from Stage 1
- Prior related sessions from Institutional Memory
- Any relevant artifacts from prior work

### Outputs
An Idea Document that answers:
- What exactly is the idea?
- What problem does it solve, and for whom?
- What does success look like?
- What do we not yet know?
- What assumptions is this idea making?
- Why now?

### Approval Gate
The founder must be satisfied that the idea is clearly stated before advancing to Clarification. If the idea cannot be stated clearly, it is not ready.

### Expected Artifacts
- Idea Document
- Initial Assumptions List
- Open Questions List

### Notes
This stage is where Blacksmith is most valuable. Blacksmith asks the questions the founder did not think to ask and surfaces the implications the founder did not see. The goal is not a polished document — it is a clear statement of what the idea actually is.

---

## Stage 3: Clarification

### Purpose
Resolve the most important open questions before committing to a review. Some questions can be answered with five minutes of research. Others require a day of investigation. Neither should block the pipeline indefinitely — but both should be answered before the Executive Board reviews the idea.

### Owner
Founder (with Research support where available)

### Inputs
- Idea Document from Stage 2
- Open Questions List
- External research, user feedback, competitive analysis

### Outputs
A Clarified Brief that updates the Idea Document with:
- Answers to open questions (or explicit acknowledgment that they remain open)
- Updated assumptions based on research
- Any material changes to the idea that research revealed

### Approval Gate
The founder must decide: is the brief clear enough for the Executive Board to review? If significant questions remain unanswered, either answer them or explicitly acknowledge them in the brief with a rationale for proceeding anyway.

### Expected Artifacts
- Clarified Brief
- Research Notes (if applicable)

### Notes
This stage prevents the Executive Board from spending review time on questions that should have been resolved earlier. A well-prepared brief produces a better recommendation faster.

---

## Stage 4: Executive Review

### Purpose
Have the full organization evaluate the idea and produce a structured recommendation. The Executive Board brings six disciplined perspectives — product, technical, creative, customer, strategic, and operational — to produce a Decision Package the founder can act on.

### Owner
Executive Board

### Inputs
- Clarified Brief from Stage 3
- Historical context from Institutional Memory
- Current roadmap and competing priorities

### Outputs
A Decision Package containing:
- Executive Recommendation
- Decision (Build Now / Prototype / Research Further / Delay / Reject)
- Confidence scores (evidence, alignment, feasibility)
- Expected impact, estimated effort, strategic importance
- Opportunity cost — what we are not building if we build this
- Success metrics — how we would know this worked
- If we are wrong — most likely failure mode
- Top priorities, risks, opportunities
- Recommended next sprint
- What to stop working on
- Open questions remaining
- One-sentence recommendation from each perspective

### Approval Gate
Founder reviews the Decision Package and decides whether to accept the recommendation. The founder may:
- Accept and proceed to Architecture
- Accept but defer (schedule for later)
- Reject (archive with rationale)
- Request further research (return to Clarification)
- Override the recommendation with explicit rationale recorded

### Expected Artifacts
- Decision Package

### Notes
The Executive Review is not the founder thinking harder. It is the founder receiving structured expert input they could not generate alone. The Decision Package is the most important artifact in the pipeline. Everything downstream depends on the quality of this decision.

---

## Stage 5: Architecture

### Purpose
Design the technical system before anyone writes production code. Architecture is not documentation added after implementation — it is the blueprint that makes implementation possible without constant revision.

### Owner
Architecture Department

### Inputs
- Approved Decision Package from Stage 4
- Product requirements from the Product department
- Current system state and constraints from Engineering
- Technical standards from prior Architecture decisions

### Outputs
A Blueprint — a complete technical design that Engineering can implement without needing to invent the approach as they go.

### Approval Gate
The Blueprint must be reviewed by the founder (and Architecture) for:
- Completeness — does it cover all aspects of the decision?
- Correctness — does it reflect the system's current reality?
- Feasibility — can Engineering implement this with current skills and tools?

The founder approves the Blueprint before Planning begins. Architecture may require iteration.

### Expected Artifacts
- Blueprint
- Architecture Decision Record (ADR) — for any decision that might be revisited
- System Diagram — for any change to system structure
- Technical Standards update — if the work establishes a new pattern

### Notes
Architecture is where the hard technical thinking happens. The Blueprint should be specific enough that two different engineers would implement the same solution from it. Ambiguity in the Blueprint becomes implementation inconsistency.

---

## Stage 6: Planning

### Purpose
Convert an approved Blueprint into a concrete, sequenced implementation plan. Planning answers: exactly what will be built, in what order, by when, and what does each step depend on?

### Owner
Operations Department (with input from Engineering and Product)

### Inputs
- Approved Blueprint from Stage 5
- Feature Specifications from Product
- Engineering capacity assessment
- Current workload and competing priorities

### Outputs
An Implementation Plan that:
- Breaks the Blueprint into discrete implementation tasks
- Sequences tasks by dependency
- Assigns effort estimates
- Identifies risks to the plan
- Defines the milestones that trigger progress reviews

### Approval Gate
The founder reviews and approves the Implementation Plan before implementation begins. Changes to scope, sequence, or timeline after plan approval require a plan revision with documented rationale.

### Expected Artifacts
- Implementation Plan
- Capacity Assessment
- Risk Register (for the specific implementation)

### Notes
Planning is not project management theater. Its purpose is to surface sequencing problems, resource conflicts, and dependency risks before they become implementation crises. A good Implementation Plan means Engineering can proceed with clarity.

---

## Stage 7: Implementation

### Purpose
Build what was designed. Not invent — build. The creative work happened in Architecture. Implementation is execution.

### Owner
Engineering Department

### Inputs
- Approved Implementation Plan from Stage 6
- Blueprint from Architecture
- Feature Specifications from Product
- Acceptance Criteria from QA
- Design Specifications from Creative (where applicable)

### Outputs
- Working software that implements the Blueprint
- Unit tests for all non-trivial logic
- Implementation Notes documenting any deviations from the Blueprint

### Approval Gate
Engineering marks implementation complete when:
- All acceptance criteria are implementable (not necessarily passing — that is QA's job)
- All unit tests pass
- Implementation Notes are written for any Blueprint deviations
- Engineering has performed their own review and found no obvious defects

QA takes over at this point.

### Expected Artifacts
- Implementation Notes
- Unit Test Suite

### Notes
Deviations from the Blueprint are not failures — they are information. If implementation reveals that the Blueprint was wrong, the deviation must be documented and Architecture must be notified. Silent deviations are the source of most architectural drift.

---

## Stage 8: Creative

### Purpose
Ensure that everything user-facing meets the product's design standards. Creative review is not aesthetics review — it is quality review against the product's defined experience goals.

### Owner
Creative Department

### Inputs
- Implemented features from Engineering
- Design Specifications from Creative (from pre-implementation work)
- Product's defined experience goals

### Outputs
- Verified visual and experiential quality
- Revised copy and content if needed
- Creative sign-off or list of required changes

### Approval Gate
Creative signs off on user-facing surfaces before QA begins testing. Functional features that do not meet design standards return to Engineering for correction before testing begins. Creative does not approve or reject features — it approves or requests changes to their presentation.

### Expected Artifacts
- Creative review notes (informal, tracked in Implementation Notes)
- Component Specification updates (if design patterns changed during implementation)

### Notes
Creative review is most efficient when it happens continuously during implementation rather than as a single gate at the end. Where practical, Engineering should request Creative review on individual surfaces before completing the full feature.

---

## Stage 9: QA

### Purpose
Verify that the implemented feature meets every acceptance criterion, works reliably across expected conditions, and does not introduce regressions in existing functionality.

### Owner
QA Department

### Inputs
- Implemented features (post-Creative review)
- Acceptance Criteria from Product
- Test Plan prepared during Planning
- Known issues from the prior known-issues log

### Outputs
- Test Report: what passed, what failed, what risk remains
- Defect Reports for each identified failure
- Sign-off for features that pass, or documented rationale for shipping with known issues

### Approval Gate
QA must sign off before any feature proceeds to Delivery. Defects that block acceptance criteria must be resolved. Defects that do not block acceptance criteria may be deferred with documented risk acknowledgment.

The founder reviews the Test Report before authorizing delivery.

### Expected Artifacts
- Test Plan
- Test Report
- Defect Report (for each defect found)
- Launch Checklist (QA section complete)

---

## Stage 10: Delivery

### Purpose
Ship the feature to the production environment in a controlled, documented, reversible way.

### Owner
Operations Department

### Inputs
- QA sign-off
- Complete Launch Checklist (all department sections)
- Deployment runbook
- Rollback plan

### Outputs
- Deployed feature in production
- Deployment Record
- Release Notes

### Approval Gate
The founder authorizes delivery after reviewing:
- QA sign-off
- Launch Checklist completeness
- Confirmed rollback plan

### Expected Artifacts
- Deployment Record
- Release Notes

### Notes
Every delivery should be reversible. If the deployment cannot be rolled back, the risk threshold for proceeding is significantly higher. Operations must confirm rollback capability before delivery authorization.

---

## Stage 11: Learning

### Purpose
Evaluate what actually happened after delivery. Did the feature do what the Executive Board predicted? Did confidence scores prove accurate? Were the risks that were flagged the actual risks that materialized?

### Owner
Founder

### Inputs
- Original Decision Package from Stage 4
- Usage observations
- Any feedback or issues that emerged post-delivery
- Operational metrics where applicable

### Outputs
- Outcome Assessment: what happened vs. what was predicted
- Retrospective Notes: what the organization learned
- Accuracy evaluation: was the Executive Board's recommendation correct?

### Approval Gate
None. Learning is not optional, but it is not gated. The founder records what they observed and moves on. The value of this stage is cumulative — individual assessments are small; the aggregate is what builds Institutional Memory.

### Expected Artifacts
- Outcome Assessment
- Retrospective Notes

---

## Stage 12: Institutional Memory

### Purpose
Absorb everything learned — decision, outcome, accuracy, retrospective — into the organization's permanent record so that future decisions benefit from this experience.

### Owner
Institutional Memory Department

### Inputs
- Decision Package from Stage 4
- Outcome Assessment from Stage 11
- Retrospective Notes from Stage 11
- All artifacts produced throughout the pipeline

### Outputs
- Knowledge Entry: a structured record linking the original idea, the decision, the implementation, and the outcome
- Updated confidence calibration data (for the Executive Board's use in future sessions)
- Pattern updates: new instances added to recurring risk or opportunity logs

### Expected Artifacts
- Knowledge Entry
- Decision Log update

### Notes
Institutional Memory is the organization's most valuable long-term asset. Its quality depends entirely on the consistency with which Stages 11 and 12 are completed. Organizations that skip retrospectives repeat their mistakes. Organizations that record their outcomes develop judgment.

---

## Pipeline Exceptions

**Urgent fixes.** A production defect that affects the founder's ability to work may skip from Idea directly to Planning and Implementation, with Architecture, Executive Review, and Creative handled in compressed or retrospective form. The Decision Package is still written — it may be written concurrently with the fix rather than before it. No exception eliminates QA.

**Exploratory work.** A Prototype decision from Executive Review creates a time-boxed exploration that follows a compressed pipeline: Architecture (sketch only) → Implementation (prototype scope only) → QA (basic smoke test) → Delivery (internal only) → Learning (was the prototype hypothesis confirmed?). The full pipeline applies only if the prototype is approved to become a production feature.

**Rejected ideas.** Rejected ideas are archived in Institutional Memory with the Decision Package rationale. They are not discarded — they are preserved because the reasoning that rejected an idea today may be the context that validates a different idea tomorrow.

---

*See also: `03_ORGANIZATION_MODEL.md` for department responsibilities. `05_ARTIFACT_SYSTEM.md` for artifact definitions. `07_DECISION_ENGINE.md` for Executive Review architecture.*
