const { randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path');
const http = require('http');

const SESSIONS_DIR = path.join('C:\\AI\\AIStudio', 'sessions', 'blacksmith');
const BRIEFS_DIR = path.join('C:\\AI\\AIStudio', 'council-briefs');

const MODE_PROMPTS = {
  forge: 'You are The Blacksmith in Forge mode — a creative partner who helps shape raw ideas into workable concepts. Be encouraging, practical, and generative. Ask clarifying questions. Build on what the user offers.',
  discovery: 'You are The Blacksmith in Discovery mode — help explore the problem space before committing to solutions. Stay curious. Surface unknowns, stakeholders, and success criteria.',
  'constraint-forge': 'You are The Blacksmith in Constraint Forge mode — turn limits into creative fuel. Name constraints explicitly and show how to design within them.',
  'infinite-improvement': 'You are The Blacksmith in Infinite Improvement mode — iterate with the user. Each response should refine, sharpen, or expand the idea one meaningful step.',
  'framework-forge': 'You are The Blacksmith in Framework Forge mode — help build scaffolds, models, and mental frameworks. Offer structures the user can fill in and adapt.',
};

function ensureDirs() {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  fs.mkdirSync(BRIEFS_DIR, { recursive: true });
}

function sessionPath(id) {
  return path.join(SESSIONS_DIR, `${id}.json`);
}

function briefPath(id) {
  return path.join(BRIEFS_DIR, `${id}.json`);
}

function emptySidebar() {
  return {
    keyInsights: [],
    constraints: [],
    assumptions: [],
    risks: [],
    opportunities: [],
    nextQuestions: [],
  };
}

function loadSession(id) {
  const file = sessionPath(id);
  if (!fs.existsSync(file)) throw new Error(`Session not found: ${id}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function saveSession(session) {
  ensureDirs();
  session.updatedAt = new Date().toISOString();
  fs.writeFileSync(sessionPath(session.id), JSON.stringify(session, null, 2), 'utf8');
  return session;
}

function loadBrief(id) {
  const file = briefPath(id);
  if (!fs.existsSync(file)) throw new Error(`Council brief not found: ${id}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function saveBrief(brief) {
  ensureDirs();
  fs.writeFileSync(briefPath(brief.id), JSON.stringify(brief, null, 2), 'utf8');
  return brief;
}

function mergeSidebar(current, incoming) {
  const mergeList = (a, b) => {
    if (!b?.length) return a;
    const seen = new Set(a.map((s) => s.toLowerCase()));
    const next = [...a];
    for (const item of b) {
      const trimmed = String(item).trim();
      if (trimmed && !seen.has(trimmed.toLowerCase())) {
        seen.add(trimmed.toLowerCase());
        next.push(trimmed);
      }
    }
    return next.slice(-12);
  };
  return {
    keyInsights: mergeList(current.keyInsights, incoming.keyInsights),
    constraints: mergeList(current.constraints, incoming.constraints),
    assumptions: mergeList(current.assumptions, incoming.assumptions),
    risks: mergeList(current.risks, incoming.risks),
    opportunities: mergeList(current.opportunities, incoming.opportunities),
    nextQuestions: mergeList(current.nextQuestions, incoming.nextQuestions),
  };
}

function parseSidebarFromResponse(text) {
  const match = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/\{[\s\S]*"sidebar"[\s\S]*\}/);
  if (!match) return { content: text.trim(), sidebar: null };
  try {
    const raw = match[1] || match[0];
    const parsed = JSON.parse(raw);
    const sidebar = parsed.sidebar || parsed;
    const cleaned = text.replace(/```json[\s\S]*?```/i, '').replace(/\{[\s\S]*"sidebar"[\s\S]*\}/, '').trim();
    return { content: cleaned || text.trim(), sidebar };
  } catch {
    return { content: text.trim(), sidebar: null };
  }
}

function heuristicSidebar(userText, assistantText, mode) {
  const sidebar = emptySidebar();
  const combined = `${userText}\n${assistantText}`.toLowerCase();

  if (combined.includes('risk') || combined.includes('concern')) {
    sidebar.risks.push('Potential risks surfaced in conversation — review before Council.');
  }
  if (combined.includes('constraint') || combined.includes('limit') || mode === 'constraint-forge') {
    sidebar.constraints.push('Constraints mentioned — capture explicitly before building.');
  }
  if (combined.includes('assume')) {
    sidebar.assumptions.push('Assumptions detected — validate with Council.');
  }
  sidebar.nextQuestions.push('What would success look like in one sentence?');
  sidebar.keyInsights.push(assistantText.split(/[.!?]/)[0]?.trim().slice(0, 120) || 'Early insight forming.');
  return sidebar;
}

function postJson(urlString, body, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlString);
      const payload = JSON.stringify(body);
      const req = http.request(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
          timeout: timeoutMs,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
              reject(new Error(`Ollama HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
              return;
            }
            try {
              resolve(JSON.parse(data));
            } catch {
              reject(new Error('Invalid JSON from Ollama'));
            }
          });
        },
      );
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Ollama request timed out'));
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

async function chatWithOllama(settings, messages, mode) {
  const base = (settings.services?.ollama || 'http://127.0.0.1:11434').replace(/\/$/, '');
  const model = settings.blacksmith?.model || 'qwen3:8b';
  const system = `${MODE_PROMPTS[mode] || MODE_PROMPTS.forge}

You are a conversational creative partner — not a validator. Help the user forge ideas before Council judges them.

After your natural-language reply, append a fenced JSON block updating the session sidebar:
\`\`\`json
{
  "sidebar": {
    "keyInsights": ["..."],
    "constraints": ["..."],
    "assumptions": ["..."],
    "risks": ["..."],
    "opportunities": ["..."],
    "nextQuestions": ["..."]
  }
}
\`\`\`
Include only new or refined items for this turn (arrays may be empty). Keep items concise.`;

  const ollamaMessages = [
    { role: 'system', content: system },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const response = await postJson(`${base}/api/chat`, {
    model,
    messages: ollamaMessages,
    stream: false,
  });

  const text = response.message?.content || '';
  if (!text) throw new Error('Empty response from Ollama');
  return parseSidebarFromResponse(text);
}

function createSession({ workshopId, mode, goal }) {
  ensureDirs();
  const now = new Date().toISOString();
  const session = {
    id: randomUUID(),
    workshopId: workshopId || null,
    mode,
    goal: goal.trim(),
    title: goal.trim().slice(0, 80),
    createdAt: now,
    updatedAt: now,
    messages: [],
    sidebar: emptySidebar(),
    councilBriefId: null,
    councilStatus: 'none',
    councilNotes: null,
  };
  saveSession(session);
  return session;
}

function listSessions() {
  ensureDirs();
  return fs
    .readdirSync(SESSIONS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf8')))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function syncCouncilStatus(session) {
  if (!session.councilBriefId) return session;
  try {
    const brief = loadBrief(session.councilBriefId);
    if (brief.status === 'needs-work') {
      session.councilStatus = 'needs-work';
      session.councilNotes = brief.councilNotes || null;
    } else if (brief.status === 'approved') {
      session.councilStatus = 'approved';
      session.councilNotes = brief.councilNotes || null;
    } else if (brief.status === 'pending') {
      session.councilStatus = 'sent';
    }
    saveSession(session);
  } catch {
    // brief missing — leave as-is
  }
  return session;
}

async function sendMessage(settings, sessionId, userContent) {
  const session = syncCouncilStatus(loadSession(sessionId));
  const userMessage = {
    id: randomUUID(),
    role: 'user',
    content: userContent.trim(),
    ts: new Date().toISOString(),
  };
  session.messages.push(userMessage);

  let assistantContent;
  let sidebarUpdate = null;

  try {
    const result = await chatWithOllama(settings, session.messages, session.mode);
    assistantContent = result.content;
    sidebarUpdate = result.sidebar;
  } catch (err) {
    assistantContent = `The forge is cold — Ollama is unavailable (${err.message}). Your message is saved. Start Ollama and try again, or continue shaping the idea manually.`;
    sidebarUpdate = heuristicSidebar(userContent, assistantContent, session.mode);
  }

  if (sidebarUpdate) {
    session.sidebar = mergeSidebar(session.sidebar, sidebarUpdate);
  } else {
    session.sidebar = mergeSidebar(session.sidebar, heuristicSidebar(userContent, assistantContent, session.mode));
  }

  const assistantMessage = {
    id: randomUUID(),
    role: 'assistant',
    content: assistantContent,
    ts: new Date().toISOString(),
  };
  session.messages.push(assistantMessage);
  saveSession(session);
  return session;
}

function buildConversationDigest(session) {
  return session.messages
    .slice(-12)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');
}

function packageCouncilBrief(session) {
  const brief = {
    id: randomUUID(),
    sessionId: session.id,
    workshopId: session.workshopId,
    createdAt: new Date().toISOString(),
    mode: session.mode,
    goal: session.goal,
    title: session.title,
    summary: session.messages.filter((m) => m.role === 'assistant').slice(-1)[0]?.content?.slice(0, 500)
      || session.goal,
    sidebar: session.sidebar,
    conversationDigest: buildConversationDigest(session),
    messages: session.messages,
    status: 'pending',
    councilNotes: null,
  };
  saveBrief(brief);
  session.councilBriefId = brief.id;
  session.councilStatus = 'sent';
  session.councilNotes = null;
  saveSession(session);
  return { brief, session };
}

function markBriefNeedsWork(briefId, notes) {
  const brief = loadBrief(briefId);
  brief.status = 'needs-work';
  brief.councilNotes = notes || 'Council returned Needs Work — continue forging in Blacksmith.';
  saveBrief(brief);
  const session = loadSession(brief.sessionId);
  session.councilStatus = 'needs-work';
  session.councilNotes = brief.councilNotes;
  saveSession(session);
  return session;
}

module.exports = {
  createSession,
  loadSession,
  saveSession,
  listSessions,
  sendMessage,
  packageCouncilBrief,
  loadBrief,
  markBriefNeedsWork,
  syncCouncilStatus,
  SESSIONS_DIR,
  BRIEFS_DIR,
};
