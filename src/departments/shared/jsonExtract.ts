/**
 * Extract a JSON object from an LLM response that may contain prose,
 * markdown code fences, or raw JSON.
 */
export function extractJson<T>(text: string): T | null {
  const trimmed = text.trim();

  // Try parsing as-is first (ideal case — LLM returned pure JSON)
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // Not pure JSON — continue
  }

  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]+?)```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim()) as T;
    } catch {
      // Not valid JSON inside fence
    }
  }

  // Find the outermost JSON object in the text
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    } catch {
      // Not valid JSON
    }
  }

  return null;
}

/**
 * Extract JSON and throw a descriptive error if extraction fails.
 */
export function requireJson<T>(text: string, context: string): T {
  const result = extractJson<T>(text);
  if (result === null) {
    throw new Error(
      `${context}: could not extract JSON from response. ` +
        `Response started with: ${text.slice(0, 120)}`,
    );
  }
  return result;
}
