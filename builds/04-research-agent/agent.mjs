// Research agent: search a fake corpus, read pages, write a note. The LLM picks one tool per step.
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

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

function plan(goal, history) {
  const prompt = `You are a research agent. Goal: ${goal}
tools: search({query}) -> urls, fetch({url}) -> text, write_note({path, text}), done({summary}) once the note is written.
History (JSON lines):
${history.map((h) => JSON.stringify(h)).join('\n') || '(none)'}
Reply with exactly one JSON object {"name": ..., "input": {...}}. No prose.`;
  const out = execFileSync('claude', ['-p', prompt, '--output-format', 'json', '--max-turns', '1', '--model', 'haiku', '--tools', ''], { encoding: 'utf8', cwd: '/tmp' });
  return JSON.parse(JSON.parse(out).result.trim().replace(/^```json\s*|```$/g, ''));
}

const goal = process.argv.slice(2).join(' ') || 'what does the Team plan cost per seat and when did it last change; write notes/team-price.md';
const history = [];
for (let i = 0; i < 10; i++) {
  const call = plan(goal, history);
  const result = tools[call.name] ? tools[call.name](call.input ?? {}) : { error: `unknown tool ${call.name}` };
  history.push({ name: call.name, input: call.input ?? {}, result });
  console.log(`${i + 1}. ${call.name} ${JSON.stringify(call.input ?? {})} -> ${JSON.stringify(result).slice(0, 80)}`);
  if (call.name === 'done') break;
}
console.log(`planner calls: ${history.length}`);
