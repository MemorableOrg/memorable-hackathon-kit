// Browser agent: the LLM sees the page text and picks one action; the harness runs it against the fake site.
import { execFileSync } from 'node:child_process';
import { makeSite } from './site.mjs';

const { api, state } = makeSite();
const goal = process.argv.slice(2).join(' ') || 'book a table for two at 7pm at Nopa';

function plan(page, history) {
  const prompt = `You drive a web browser. Goal: ${goal}
Current page ${page.url}:
${page.text}
Actions: goto({url}), fill({selector, text}), click({selector}), done({summary}) once the goal is met.
History (JSON lines):
${history.map((h) => JSON.stringify(h)).join('\n') || '(none)'}
Reply with exactly one JSON object {"name": ..., "input": {...}}. No prose.`;
  const out = execFileSync('claude', ['-p', prompt, '--output-format', 'json', '--max-turns', '1', '--model', 'haiku', '--tools', ''], { encoding: 'utf8', cwd: '/tmp' });
  return JSON.parse(JSON.parse(out).result.trim().replace(/^```json\s*|```$/g, ''));
}

let page = api.goto({ url: '/' });
const history = [];
for (let i = 0; i < 12; i++) {
  const call = plan(page, history);
  const result = api[call.name] ? api[call.name](call.input ?? {}) : { error: `unknown action ${call.name}` };
  history.push({ name: call.name, input: call.input ?? {}, result: result.url ? { url: result.url } : result });
  console.log(`${i + 1}. ${call.name} ${JSON.stringify(call.input ?? {})} -> ${result.url ?? JSON.stringify(result)}`);
  if (call.name === 'done') break;
  page = result;
}
console.log(`confirmed: ${state.confirmed} · planner calls: ${history.length}`);
