/**
 * Architect Department — Blueprint generation.
 *
 * INTERNAL — not exported from the department's public index.
 */
import type {
  Blueprint,
  BlueprintComponent,
  DecisionPackage,
  DepartmentConfig,
  IdeaBrief,
} from '../../shared/types';
import { requireJson } from '../../shared/jsonExtract';

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the AI Studio Architect. Given an approved Idea Brief and an Executive Board Decision Package, produce a Blueprint.

Your scope is architecture only:
- Describe what to build and how the pieces fit together.
- Do not write code. Do not define API endpoints. Do not write database schemas.
- Do not describe implementation tasks or steps.
- For anything requiring an implementation decision, write "TBD — Engineering decision."

Respond with this exact JSON structure and nothing else:
{
  "problem": "<clear problem statement from architectural perspective>",
  "goals": ["<architectural goal>"],
  "nonGoals": ["<explicit exclusion>"],
  "userStories": ["As a <user>, I want <action> so that <outcome>"],
  "architecture": "<high-level system overview — components and how they connect>",
  "majorComponents": [
    {
      "name": "<component name>",
      "responsibility": "<single responsibility>",
      "interfaces": ["<what it exposes or consumes>"]
    }
  ],
  "dataModel": "<key entities and their relationships — conceptual, no schema>",
  "dependencies": ["<external service, model, or library>"],
  "risks": ["<architectural risk>"],
  "successCriteria": ["<how to know the blueprint was implemented correctly>"],
  "futureExpansion": ["<what this architecture enables beyond the immediate scope>"]
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

interface LlmBlueprint {
  problem: string;
  goals: string[];
  nonGoals: string[];
  userStories: string[];
  architecture: string;
  majorComponents: BlueprintComponent[];
  dataModel: string;
  dependencies: string[];
  risks: string[];
  successCriteria: string[];
  futureExpansion: string[];
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
      `Architect: Ollama request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as OllamaGenerateResponse;
  return data.response;
}

// ─── Blueprint generation ─────────────────────────────────────────────────────

export async function generateBlueprint(
  brief: IdeaBrief,
  decisionPackage: DecisionPackage,
  config: DepartmentConfig,
): Promise<Blueprint> {
  const prompt =
    `Produce a Blueprint for the following approved Idea Brief and Decision Package.\n\n` +
    `IDEA BRIEF:\n${JSON.stringify(brief, null, 2)}\n\n` +
    `DECISION PACKAGE:\n${JSON.stringify(decisionPackage, null, 2)}`;

  const raw = await callOllamaGenerate(config, SYSTEM_PROMPT, prompt);

  const parsed = requireJson<LlmBlueprint>(raw, 'Architect blueprint');

  const ensureArray = (v: unknown): string[] =>
    Array.isArray(v) ? (v as string[]) : [];

  const ensureComponents = (v: unknown): BlueprintComponent[] => {
    if (!Array.isArray(v)) return [];
    return (v as unknown[]).map((c) => {
      const comp = c as Partial<BlueprintComponent>;
      return {
        name: comp.name ?? 'Unknown',
        responsibility: comp.responsibility ?? '',
        interfaces: Array.isArray(comp.interfaces) ? comp.interfaces : [],
      };
    });
  };

  return {
    id: crypto.randomUUID(),
    sessionId: brief.sessionId,
    ideaBriefId: brief.id,
    decisionPackageId: decisionPackage.id,
    problem: parsed.problem ?? '',
    goals: ensureArray(parsed.goals),
    nonGoals: ensureArray(parsed.nonGoals),
    userStories: ensureArray(parsed.userStories),
    architecture: parsed.architecture ?? '',
    majorComponents: ensureComponents(parsed.majorComponents),
    dataModel: parsed.dataModel ?? '',
    dependencies: ensureArray(parsed.dependencies),
    risks: ensureArray(parsed.risks),
    successCriteria: ensureArray(parsed.successCriteria),
    futureExpansion: ensureArray(parsed.futureExpansion),
    createdAt: new Date().toISOString(),
  };
}
