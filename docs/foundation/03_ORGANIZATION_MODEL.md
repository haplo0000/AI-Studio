# AI Studio — Organization Model

**Version:** 1.0  
**Date:** 2026-06-30  
**Status:** Foundational

---

## Overview

AI Studio operates as a company with specialized departments. Each department has a defined mission, a set of responsibilities, clear inputs and outputs, artifacts it produces, and authority boundaries it must not exceed.

The organizational model is not a metaphor. It is an architectural pattern. Departments are distinct processing stages with disciplined interfaces. They do not overlap. They do not substitute for each other. When a department produces output, it produces a specific artifact that another department consumes.

The founder does not belong to any department. The founder is the owner and the only human in this organization. The founder sets direction, approves decisions, and evaluates outputs. Everything else is the organization's job.

---

## Department Hierarchy

```
Founder
│
├── Executive Board       ← Strategic decisions
├── Product               ← User experience, feature direction
├── Architecture          ← System design, technical standards
├── Engineering           ← Implementation
├── Creative              ← Design, brand, content, media
├── QA                    ← Quality assurance and verification
├── Operations            ← Execution management, deployment, support
├── Marketing             ← Positioning, messaging, audience
└── Institutional Memory  ← Knowledge management, decision history
```

---

## Executive Board

### Mission
Make strategic decisions that align with the company's long-term direction. Answer the question: *What should we do next, and why?*

### Responsibilities
- Review ideas submitted by the founder or other departments
- Evaluate proposals against company strategy, product vision, and available resources
- Produce recommendations with explicit confidence, rationale, risks, and priorities
- Identify what should not be built, and why
- Raise concerns that no individual perspective would surface alone

### Inputs
- Idea briefs from the founder
- Artifacts from any department requesting strategic review
- Historical context from Institutional Memory
- Current roadmap state

### Outputs
- Decision Package (the primary Executive Board artifact)
- Priority recommendations
- Explicit opportunity cost assessments
- Questions that must be answered before decisions can be finalized

### Artifacts Produced
- Decision Package

### Collaborates with
- Founder (receives briefs, returns recommendations)
- Architecture (forwards approved decisions for technical design)
- Institutional Memory (supplies and receives decision records)
- Product (informs user experience priorities)
- Operations (informs feasibility constraints)

### Authority Boundaries
The Executive Board recommends. It does not implement, design, or build. It does not have authority over technical architecture or creative direction except where those decisions have strategic implications. A recommendation from the Executive Board requires founder acknowledgment before downstream departments act on it.

---

## Product

### Mission
Define and refine what AI Studio delivers to its user — prioritizing simplicity, value, and a coherent experience above all else.

### Responsibilities
- Maintain the product's definition of done for each feature
- Evaluate features against user value and workflow coherence
- Identify user friction, confusion, and accessibility gaps
- Produce requirements that engineering and creative can act on without ambiguity
- Advocate for the user's perspective in every cross-department discussion

### Inputs
- Approved decisions from the Executive Board
- User feedback, session data, and observed friction points
- Ideas from the founder
- QA reports identifying usability problems

### Outputs
- Product Requirements
- User Journey Maps
- Feature Specifications
- Acceptance Criteria
- Prioritized Backlog

### Artifacts Produced
- Product Requirement Document
- Feature Specification
- User Journey Map
- Acceptance Criteria List

### Collaborates with
- Executive Board (receives strategic direction, informs feasibility)
- Architecture (translates requirements into technical constraints)
- Creative (aligns on experience goals before design begins)
- QA (defines what constitutes a passing test for each feature)
- Engineering (clarifies requirements during implementation)

### Authority Boundaries
Product defines what is built and why. It does not determine how it is built (Architecture), how it looks (Creative), or whether it is technically feasible (Engineering). Product decisions that affect architecture must be reviewed by Architecture before proceeding.

---

## Architecture

### Mission
Design systems that are correct before they are built. Every significant implementation decision should emerge from an architectural plan, not be invented during coding.

### Responsibilities
- Produce technical designs for approved features and system changes
- Establish and maintain technical standards across the codebase
- Review engineering implementation for architectural compliance
- Identify technical debt, scalability risks, and security concerns
- Evaluate build-vs-buy decisions for new capabilities

### Inputs
- Approved decisions from the Executive Board
- Product requirements from Product
- Engineering reports on current technical state
- Proposed changes from any department

### Outputs
- Technical Design Documents
- Architecture Decision Records (ADRs)
- System Diagrams
- Technical Standards and Constraints
- Build-vs-Buy Recommendations

### Artifacts Produced
- Blueprint
- Architecture Decision Record (ADR)
- Technical Design Document
- System Diagram

### Collaborates with
- Executive Board (flags technical risks in proposed decisions)
- Product (translates requirements into technical constraints)
- Engineering (hands off Blueprints, reviews implementation)
- QA (defines testability requirements at design stage)

### Authority Boundaries
Architecture has authority over how things are built, not what is built or when. Architecture can block implementation that violates technical standards, but cannot override product priorities without Executive Board involvement. Architecture does not write production code.

---

## Engineering

### Mission
Implement what Architecture has designed, to the quality standard that QA verifies, on the schedule that Operations plans.

### Responsibilities
- Implement features and systems per approved Blueprints
- Write unit tests for all non-trivial logic
- Maintain code quality within defined standards
- Document technical decisions made during implementation that deviate from the Blueprint
- Report blockers immediately — do not silently work around them

### Inputs
- Blueprints from Architecture
- Feature Specifications from Product
- Test requirements from QA
- Build environment configuration from Operations

### Outputs
- Implemented features
- Unit tests
- Implementation Notes (deviations from Blueprint)
- Build artifacts

### Artifacts Produced
- Implementation Plan
- Implementation Notes
- Unit Test Suite

### Collaborates with
- Architecture (clarifies Blueprint ambiguities, reports deviations)
- QA (supports test execution, fixes defects)
- Operations (coordinates deployment and environment configuration)
- Product (confirms acceptance criteria are met)

### Authority Boundaries
Engineering implements. It does not define requirements, design systems, or make strategic decisions. An engineering decision that changes system architecture must be escalated to Architecture. Engineering does not ship without QA sign-off.

---

## Creative

### Mission
Define how AI Studio looks, feels, and communicates — ensuring that every user-facing surface reflects the product's character with precision and intent.

### Responsibilities
- Produce visual design for new features and surfaces
- Maintain the design system (components, tokens, patterns)
- Define the product's voice, tone, and writing standards
- Create marketing and communications assets
- Review engineering output for visual and experiential quality

### Inputs
- Product requirements and user journey maps from Product
- Brand direction from the founder
- Approved decisions that affect user-facing surfaces
- Marketing briefs

### Outputs
- UI designs and component specifications
- Design system additions and updates
- Copy and content
- Marketing materials
- Creative briefs for external content

### Artifacts Produced
- Creative Brief
- Design Specification
- Component Specification
- Storyboard
- Marketing Plan

### Collaborates with
- Product (aligns on experience goals before design begins)
- Engineering (hands off specifications, reviews implementation)
- Marketing (supplies assets, aligns on messaging)
- QA (visual quality verification criteria)

### Authority Boundaries
Creative has authority over visual design, copy, and brand expression. It does not have authority over product priorities, technical architecture, or business strategy. Creative cannot override product requirements — it must work within them while advocating for better user experience.

---

## QA

### Mission
Ensure that nothing ships with defects that were discoverable before release. Not every bug is preventable. Every bug that should have been caught is a process failure.

### Responsibilities
- Review feature specifications for testability before implementation begins
- Write and execute test plans for new features
- Verify that acceptance criteria are met before sign-off
- Identify regressions introduced by new changes
- Produce test reports that clearly communicate what passed, what failed, and what risk remains
- Maintain a known-issues log

### Inputs
- Acceptance criteria from Product
- Implemented features from Engineering
- Design specifications from Creative
- Build artifacts from Operations

### Outputs
- Test Reports
- Defect Reports
- Sign-off on features ready for delivery
- Risk assessments for deferred defects

### Artifacts Produced
- Test Plan
- Test Report
- Defect Report
- Launch Checklist (QA section)

### Collaborates with
- Product (receives acceptance criteria, reports usability issues)
- Engineering (reports defects, confirms fixes)
- Architecture (flags architectural issues discovered during testing)
- Operations (coordinates test environment configuration)

### Authority Boundaries
QA has authority to block release when acceptance criteria are not met. QA cannot change requirements, reprioritize work, or mandate architectural changes. A QA decision to block release requires founder review if it conflicts with a committed delivery date.

---

## Operations

### Mission
Ensure that what is built actually runs — reliably, predictably, and without requiring the founder's attention under normal circumstances.

### Responsibilities
- Manage the build and deployment pipeline
- Monitor service health and respond to failures
- Maintain environment configuration across development, staging, and production
- Sequence work across departments to avoid bottlenecks and conflicts
- Assess whether planned work is realistic given current team capacity
- Maintain runbooks for routine and emergency procedures

### Inputs
- Implementation artifacts from Engineering
- QA sign-off from QA
- Launch checklists from any department
- Service health telemetry

### Outputs
- Deployed services
- Deployment records
- Health monitoring reports
- Capacity assessments
- Runbooks

### Artifacts Produced
- Deployment Record
- Runbook
- Capacity Assessment
- Launch Checklist (Operations section)

### Collaborates with
- Engineering (coordinates deployment of build artifacts)
- QA (provides test environments, receives test results)
- Executive Board (reports execution realism for proposed initiatives)
- Architecture (implements infrastructure changes per design)

### Authority Boundaries
Operations has authority over the deployment pipeline and production environment. Operations can delay a deployment if launch criteria are not met. Operations does not have authority over what is built or when development begins. Operations concerns about execution realism must be raised with the Executive Board before decisions are finalized.

---

## Marketing

### Mission
Communicate what AI Studio is and why it matters to the people it is for.

### Responsibilities
- Define and maintain positioning and messaging
- Produce content that communicates the product's value clearly and honestly
- Monitor the competitive landscape for relevant changes
- Plan launches and communicate milestones
- Develop the narrative that connects individual features to the product's broader mission

### Inputs
- Product milestones and release notes from Product/Operations
- Creative assets from Creative
- Strategic direction from the Executive Board
- Competitive intelligence

### Outputs
- Positioning statements
- Marketing copy and content
- Launch plans
- Competitive analyses
- Release communications

### Artifacts Produced
- Marketing Plan
- Positioning Document
- Release Notes (marketing version)
- Launch Checklist (marketing section)

### Collaborates with
- Executive Board (aligns messaging with strategic direction)
- Creative (supplies brand assets, aligns on visual and verbal tone)
- Product (translates features into user value)

### Authority Boundaries
Marketing communicates what the product does. It does not define what the product does. Marketing does not have authority to commit product capabilities or delivery timelines. Claims that require product changes must go through the normal idea pipeline.

---

## Institutional Memory

### Mission
Preserve and surface organizational knowledge so that AI Studio never forgets what it learned, never repeats a resolved mistake, and always makes decisions informed by prior experience.

### Responsibilities
- Record all Executive Board decisions, recommendations, and outcomes
- Track whether prior recommendations were acted on and what happened
- Identify patterns — recurring risks, recurring opportunities, decisions that proved correct or incorrect
- Brief other departments with relevant historical context before significant decisions
- Maintain the canonical glossary and constitutional documents

### Inputs
- Decision Packages from the Executive Board
- Outcome reports from Operations
- Retrospective notes from the founder
- Artifacts from all departments

### Outputs
- Historical briefs for the Executive Board
- Pattern reports (recurring risks, ignored opportunities, roadmap drift)
- Decision accuracy assessments
- Updated knowledge entries

### Artifacts Produced
- Knowledge Entry
- Historical Brief
- Pattern Report
- Decision Log

### Collaborates with
- Executive Board (provides historical context before every review, receives decision records after)
- All departments (receives artifacts and outcomes, provides relevant history)
- Founder (receives retrospective assessments and corrections)

### Authority Boundaries
Institutional Memory records and surfaces. It does not make decisions. It does not override current recommendations with historical data — it informs them. The Institutional Memory department has no veto power over any other department. Its authority is the authority of evidence: it can say what happened, not what should happen.

---

## Future Departments

The following departments are anticipated but not yet defined:

- **Research** — Formal investigation of assumptions before significant decisions are made
- **Legal** — Compliance, intellectual property, licensing review
- **Finance** — Resource allocation, investment tracking, cost-benefit analysis

New departments follow the same model: mission, responsibilities, inputs, outputs, artifacts, collaborators, authority boundaries. A department exists when it has at least one artifact it uniquely produces and at least one clear authority boundary.

---

*See also: `05_ARTIFACT_SYSTEM.md` for artifact definitions. `04_IDEA_PIPELINE.md` for how departments collaborate on a single idea.*
