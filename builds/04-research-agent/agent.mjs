// Research agent: search a fake corpus, read pages, write a note. The LLM picks one tool per step.
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const corpus = {
  'https://docs.example/pricing': 'Pricing. Starter $20 per seat per month. Team $45 per seat per month. Enterprise: call us.',
  'https://docs.example/limits': 'Limits. Starter 5 projects. Team 50 projects. Enterprise unlimited.',
  'https://blog.example/2026-pricing-change': 'We raised Team from $40 to $45 per seat on Sep 1 2026.',
  'https://docs.example/security': 'SOC 2 type II. SSO on Team and Enterprise.',
};
const tools = {
  search: ({ query }) => Object.keys(corpus).filter((u) => corpus[u].toLowerCase().split(/\W+/).some((w) => query.toLowerCase().includes(w) && w.length > 3)).slice(0, 3),
  fetch: ({ url }) => corpus[url] ?? 'not found',
  write_note: ({ path, text }) => { mkdirSync('notes', { recursive: true }); writeFileSync(path, text); return { ok: true }; },
  done: ({ summary }) => ({ ok: true, summary }),
};

// Memorable: recall before planning, record after the goal is met. A missing CLI never breaks a run.
function memorable(args, input) {
  try { return execFileSync('memorable', args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }); } catch (e) { return (e.stdout ?? '') + (e.stderr ?? ''); }
}
function recall(goal) {
  const hit = memorable(['recall', goal]).match(/procedures\/[\w-]+/);
  return hit ? memorable(['show', hit[0]]) : '';
}
// "  3. [execute] write_note: write_note path=notes/team-price.md"  ->  { name: 'write_note', input: { path: ... } }
function stepsOf(reference) {
  return reference.split('\n').map((l) => l.match(/^\s*\d+\.\s+\[\w+\]\s+([\w.-]+):\s*(.*)$/)).filter(Boolean).map((m) => {
    const [name, ...rest] = m[2].trim().split(/\s+(?=\w+=)/);
    const input = {};
    for (const kv of rest) { const [k, ...v] = kv.split('='); input[k] = v.join('='); }
    return { name, input };
  });
}

// write_note's text is LLM prose: long and different every run, so it's never in the command (memorable show
// truncates long lines, and identical commands are required for recall to hit). Replay rebuilds the note body
// from the fetch results already replayed in this same run, which are deterministic given the fixed corpus.
function noteTextFrom(history) {
  const facts = history.filter((h) => h.name === 'fetch').map((h) => `${h.input.url}\n${h.result}`).join('\n\n');
  return `# Research notes\n\n${facts}\n`;
}

// Replay stored steps without the planner. Stops at the first step that is not ok; the planner takes over from there.
function replay(steps, history) {
  for (const step of steps) {
    if (step.name === 'done') return true;
    const input = step.name === 'write_note' ? { ...step.input, text: noteTextFrom(history) } : step.input;
    const result = tools[step.name] ? tools[step.name](input) : { error: `unknown tool ${step.name}` };
    history.push({ name: step.name, input, result });
    console.log(`replay ${step.name} ${JSON.stringify(input).slice(0, 80)} -> ${JSON.stringify(result).slice(0, 80)}`);
    if (result.error) return false;
  }
  return true;
}

function record(goal, history) {
  if (history.at(-1)?.name !== 'done') return; // only record runs that met the goal
  const tool_calls = history.map((h) => {
    const input = h.name === 'write_note' ? { path: h.input.path } : h.input; // drop the LLM-written text: volatile, breaks command matching
    return {
      name: h.name,
      input: { command: h.name === 'done' ? 'done' : `${h.name} ${Object.entries(input).map(([k, v]) => `${k}=${v}`).join(' ')}`.trim() },
      result: { ok: !h.result?.error },
    };
  });
  const trace = { session_id: randomUUID(), task_description: goal, harness: 'research-agent', tool_calls };
  console.log(memorable(['ingest', '-'], JSON.stringify(trace)).trim());
}

function plan(goal, history, reference) {
  const prompt = `You are a research agent. Goal: ${goal}
tools: search({query}) -> urls, fetch({url}) -> text, write_note({path, text}), done({summary}) once the note is written.
${reference ? `A past run of a similar task did this. Trust these steps and replay them in the same order, then call done.\n${reference}\n` : ''}History (JSON lines):
${history.map((h) => JSON.stringify(h)).join('\n') || '(none)'}
Reply with exactly one JSON object {"name": ..., "input": {...}}. No prose.`;
  const out = execFileSync('claude', ['-p', prompt, '--output-format', 'json', '--max-turns', '1', '--model', 'haiku', '--tools', ''], { encoding: 'utf8', cwd: '/tmp' });
  return JSON.parse(JSON.parse(out).result.trim().replace(/^```json\s*|```$/g, ''));
}

const goal = process.argv.slice(2).join(' ') || 'what does the Team plan cost per seat and when did it last change; write notes/team-price.md';
const reference = recall(goal);
console.log(reference ? 'recall: hit' : 'recall: miss');
const history = [];
let planned = 0;
const replayed = reference ? replay(stepsOf(reference), history) : false;
if (replayed) { history.push({ name: 'done', input: { summary: 'replayed from memory' }, result: { ok: true } }); console.log('done (replayed, planner not called)'); }
for (let i = 0; !replayed && i < 10; i++) {
  planned++;
  const call = plan(goal, history, reference);
  const result = tools[call.name] ? tools[call.name](call.input ?? {}) : { error: `unknown tool ${call.name}` };
  history.push({ name: call.name, input: call.input ?? {}, result });
  console.log(`${i + 1}. ${call.name} ${JSON.stringify(call.input ?? {})} -> ${JSON.stringify(result).slice(0, 80)}`);
  if (call.name === 'done') break;
}
console.log(`planner calls: ${planned} · recall: ${reference ? 'hit' : 'miss'}`);
record(goal, history);
