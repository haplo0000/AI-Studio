import type { DepartmentConfig, IdeaBrief, IntakeMessage } from '../../shared/types';
import { extractJson } from '../../shared/jsonExtract';

// ─── Response types ───────────────────────────────────────────────────────────

interface IntakeQuestionResponse {
  type: 'question';
  text: string;
}

interface IntakeCompleteResponse {
  type: 'complete';
  confidence: number;
  brief: Omit<IdeaBrief, 'id' | 'sessionId' | 'status' | 'createdAt'>;
}

type IntakeLlmResponse = IntakeQuestionResponse | IntakeCompleteResponse;

export type IntakeResponse = IntakeQuestionResponse | IntakeCompleteResponse;

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the AI Studio Intake department. Your only job is to understand a founder's idea well enough to produce a complete Idea Brief. You do not solve problems. You do not suggest architecture. You do not evaluate ideas. You only ask questions to understand.

Rules:
- Ask ONE question per turn. Make it conversational and specific.
- Do not re-ask what you already know from the conversation.
- Only ask about genuine unknowns that matter for the brief.
- When you have enough information (confidence >= 65), output a complete brief.

You must always respond with valid JSON in exactly one of these two formats:

If you need more information:
{"type":"question","text":"<your question in natural language>"}

When you have enough to write a complete brief:
{"type":"complete","confidence":<0-100>,"brief":{"projectName":"<name>","problemStatement":"<the core problem>","targetUser":"<who has this problem>","desiredOutcome":"<what the founder wants to achieve>","successCriteria":["<measurable outcome>"],"constraints":["<hard limit>"],"assumptions":["<assumed true>"],"unknowns":["<not yet known>"],"risks":["<identified risk>"],"questionsAnswered":["<question: answer>"],"questionsRemaining":["<open question>"],"founderNotes":"<founder's exact words about the idea>","summary":"<2-sentence summary>"}}

No other output format is acceptable.`;

// ─── Ollama /api/chat call ────────────────────────────────────────────────────

interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  stream: false;
  format: 'json';
}

interface OllamaChatResponse {
  message: {
    role: string;
    content: string;
  };
}

async function callOllamaChat(
  config: DepartmentConfig,
  messages: OllamaChatMessage[],
): Promise<string> {
  const body: OllamaChatRequest = {
    model: config.model,
    messages,
    stream: false,
    format: 'json',
  };

  const response = await fetch(`${config.ollamaBaseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as OllamaChatResponse;
  return data.message.content;
}

// ─── Public service function ──────────────────────────────────────────────────

/**
 * Send one intake turn to the LLM and return either a question to ask
 * the founder, or the completed Idea Brief when the LLM has enough context.
 *
 * @param history - Full conversation history including the latest user message
 * @param config  - Ollama base URL and model
 */
export async function callIntakeTurn(
  history: IntakeMessage[],
  config: DepartmentConfig,
): Promise<IntakeResponse> {
  const messages: OllamaChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  const raw = await callOllamaChat(config, messages);

  const parsed = extractJson<IntakeLlmResponse>(raw);

  if (!parsed || !parsed.type) {
    // LLM did not return valid JSON — treat as a fallback question
    return {
      type: 'question',
      text: raw.trim() || 'Can you tell me more about the problem you are trying to solve?',
    };
  }

  if (parsed.type === 'complete') {
    return parsed as IntakeCompleteResponse;
  }

  return parsed as IntakeQuestionResponse;
}

/**
 * Request that the LLM produce a brief immediately with whatever it knows.
 * Used when the founder clicks "Create Brief Now" or max questions are reached.
 */
export async function forceCompleteBrief(
  history: IntakeMessage[],
  config: DepartmentConfig,
): Promise<IntakeCompleteResponse> {
  const forceMessage: OllamaChatMessage = {
    role: 'user',
    content:
      'Please produce the Idea Brief now with the information you have. ' +
      'Mark anything still unknown in the unknowns and questionsRemaining fields.',
  };

  const messages: OllamaChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    forceMessage,
  ];

  const raw = await callOllamaChat(config, messages);
  const parsed = extractJson<IntakeLlmResponse>(raw);

  if (parsed?.type === 'complete') {
    return parsed as IntakeCompleteResponse;
  }

  // LLM returned a question instead of completing — retry with stronger instruction
  const retryMessages: OllamaChatMessage[] = [
    ...messages,
    { role: 'assistant', content: raw },
    {
      role: 'user',
      content:
        'Output the complete brief now. Use {"type":"complete",...} format. Do not ask more questions.',
    },
  ];

  const retryRaw = await callOllamaChat(config, retryMessages);
  const retryParsed = extractJson<IntakeLlmResponse>(retryRaw);

  if (retryParsed?.type === 'complete') {
    return retryParsed as IntakeCompleteResponse;
  }

  throw new Error('Intake: could not produce a brief from conversation history.');
}
