const PROMPT_HISTORY_KEY = 'ai-studio:image-studio:prompt-history';
const MAX_PROMPT_HISTORY = 50;

export function loadPromptHistory(): string[] {
  try {
    const raw = localStorage.getItem(PROMPT_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
  } catch {
    return [];
  }
}

export function savePromptToHistory(prompt: string): string[] {
  const trimmed = prompt.trim();
  if (!trimmed) return loadPromptHistory();
  const next = [trimmed, ...loadPromptHistory().filter((entry) => entry !== trimmed)].slice(
    0,
    MAX_PROMPT_HISTORY,
  );
  localStorage.setItem(PROMPT_HISTORY_KEY, JSON.stringify(next));
  return next;
}
