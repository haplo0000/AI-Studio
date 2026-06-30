/**
 * Intake Department — Public API
 *
 * Responsible for understanding the founder's idea and producing an Idea Brief.
 * All internal implementation details are hidden behind these exports.
 */
import type { DepartmentConfig, IdeaBrief, IntakeMessage } from '../shared/types';
import { DEFAULT_CONFIG } from '../shared/types';
import {
  callIntakeTurn,
  forceCompleteBrief,
  type IntakeResponse,
} from './services/conversation';

export type { IntakeResponse };

/**
 * Process one turn of the intake interview.
 *
 * @param history - Full conversation history including the latest user message.
 *                  Messages must be in chronological order.
 * @param config  - Optional department config (Ollama URL + model).
 * @returns       - Either a question to show the founder, or a completed Idea Brief.
 */
export async function conductIntakeTurn(
  history: IntakeMessage[],
  config: DepartmentConfig = DEFAULT_CONFIG,
): Promise<IntakeResponse> {
  return callIntakeTurn(history, config);
}

/**
 * Force the intake to produce a brief immediately with whatever it knows.
 * Called when the founder clicks "Create Brief Now" or max questions are reached.
 */
export async function completeIntakeNow(
  history: IntakeMessage[],
  sessionId: string,
  config: DepartmentConfig = DEFAULT_CONFIG,
): Promise<IdeaBrief> {
  const response = await forceCompleteBrief(history, config);

  return buildBrief(response.brief, sessionId, response.confidence);
}

/**
 * Build a complete IdeaBrief from the LLM's partial response object.
 * Called by the pipeline orchestrator — not a service concern.
 */
export function buildBrief(
  partial: Omit<IdeaBrief, 'id' | 'sessionId' | 'status' | 'createdAt'>,
  sessionId: string,
  confidence: number,
): IdeaBrief {
  return {
    ...partial,
    id: crypto.randomUUID(),
    sessionId,
    confidence,
    status: confidence >= 65 ? 'ready-for-review' : 'draft',
    createdAt: new Date().toISOString(),
  };
}
