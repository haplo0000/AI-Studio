/**
 * Milestone 1 Executive Board implementation.
 *
 * INTERNAL — not exported from the department's public index.
 * In Milestone 2 this is replaced by the full 6-perspective pipeline
 * without any change to the public reviewIdeaBrief() interface.
 */
import type { DecisionOutcome, DecisionPackage, DepartmentConfig, IdeaBrief } from '../../shared/types';
import { requireJson } from '../../shared/jsonExtract';

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the AI Studio Executive Board reviewing an Idea Brief submitted by a founder.

You represent a balanced executive perspective covering product, technical, business, and customer viewpoints. Your job is to advise whether this idea should proceed — not to redesign it.

Make a definitive decision. Do not hedge. Do not ask for more information.

Decision must be exactly one of:
- "Build Now" — strong alignment, proceed immediately
- "Prototype" — promising but needs validation, build a small prototype first
- "Research Further" — interesting but key unknowns must be resolved before committing
- "Delay" — viable but not the right time
- "Reject" — not worth pursuing

Respond with this exact JSON structure and nothing else:
{
  "decision": "<one of the five options above>",
  "reasoning": "<2-3 paragraph explanation of the decision>",
  "confidence": <0-100>,
  "opportunityCost": "<what we are not building if we build this — be specific>",
  "risks": ["<top risk>", "<second risk>", "<third risk>"],
  "opportunities": ["<top opportunity>", "<second opportunity>"],
  "openQuestions": ["<question that must be answered before or during implementation>"],
  "recommendation": "<one paragraph executive summary recommendation>"
}`;

// ─── Ollama /api/generate call ────────────────────────────────────────────────

interface OllamaGenerateRequest {
  model: string;
  system: string;
  prompt: string;
  stream: false;
  format: 'json';
}

interface OllamaGenerateResponse {
  response: string;
}

interface LlmDecisionPackage {
  decision: DecisionOutcome;
  reasoning: string;
  confidence: number;
  opportunityCost: string;
  risks: string[];
  opportunities: string[];
  openQuestions: string[];
  recommendation: string;
}

async function callOllamaGenerate(
  config: DepartmentConfig,
  system: string,
  prompt: string,
): Promise<string> {
  const body: OllamaGenerateRequest = {
    model: config.model,
    system,
    prompt,
    stream: false,
    format: 'json',
  };

  const response = await fetch(`${config.ollamaBaseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `Executive Board: Ollama request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as OllamaGenerateResponse;
  return data.response;
}

// ─── Milestone 1 review ───────────────────────────────────────────────────────

export async function milestone1Review(
  brief: IdeaBrief,
  config: DepartmentConfig,
): Promise<DecisionPackage> {
  const prompt = `Review this Idea Brief and produce a Decision Package.\n\n${JSON.stringify(brief, null, 2)}`;

  const raw = await callOllamaGenerate(config, SYSTEM_PROMPT, prompt);

  const parsed = requireJson<LlmDecisionPackage>(raw, 'Executive Board review');

  const validDecisions: DecisionOutcome[] = [
    'Build Now',
    'Prototype',
    'Research Further',
    'Delay',
    'Reject',
  ];

  if (!validDecisions.includes(parsed.decision)) {
    throw new Error(
      `Executive Board: invalid decision value "${parsed.decision}". ` +
        `Must be one of: ${validDecisions.join(', ')}`,
    );
  }

  return {
    id: crypto.randomUUID(),
    sessionId: brief.sessionId,
    ideaBriefId: brief.id,
    decision: parsed.decision,
    reasoning: parsed.reasoning ?? '',
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 70,
    opportunityCost: parsed.opportunityCost ?? '',
    risks: Array.isArray(parsed.risks) ? parsed.risks : [],
    opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : [],
    openQuestions: Array.isArray(parsed.openQuestions) ? parsed.openQuestions : [],
    recommendation: parsed.recommendation ?? '',
    createdAt: new Date().toISOString(),
    schemaVersion: '1.0',
  };
}
