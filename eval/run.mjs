// Before/after eval for a Claude Code task: run headless, turn the tool calls into a Memorable trace, ingest it, report counts.
// usage: node eval/run.mjs <app-dir> "<task>" [--no-record]
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const [appDir, task, ...flags] = process.argv.slice(2);
const record = !flags.includes('--no-record');
const sessionId = `eval-${Date.now()}`;

const run = spawnSync('claude', ['-p', task, '--output-format', 'stream-json', '--verbose', '--dangerously-skip-permissions', '--model', 'sonnet'], { cwd: appDir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const events = run.stdout.split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

const calls = [];
const pending = new Map();
let recalled = false;
for (const e of events) {
  if (e.type === 'system' && JSON.stringify(e).includes('retrieved brain context')) recalled = true;
  if (e.type === 'assistant') for (const c of e.message?.content ?? []) if (c.type === 'tool_use') pending.set(c.id, { name: c.name, input: c.input });
  if (e.type === 'user') for (const c of e.message?.content ?? []) if (c.type === 'tool_result' && pending.has(c.tool_use_id)) {
    const p = pending.get(c.tool_use_id);
    const input = {};
    for (const k of ['command', 'file_path', 'path', 'pattern', 'url', 'query']) if (typeof p.input?.[k] === 'string') input[k] = p.input[k];
    const step = { name: p.name, input };
    if (p.name === 'Bash') step.result = { ok: !c.is_error };
    calls.push(step);
  }
  if (e.type === 'user' && JSON.stringify(e).includes('retrieved brain context')) recalled = true;
}
const result = events.find((e) => e.type === 'result') ?? {};
const trace = { session_id: sessionId, task_description: task, harness: 'claude-code-eval', tool_calls: calls };
writeFileSync(`${process.cwd()}/eval/last-trace.json`, JSON.stringify(trace, null, 2));

let stored = 'not recorded';
if (record) {
  const ing = spawnSync('memorable', ['ingest', '-'], { input: JSON.stringify(trace), encoding: 'utf8' });
  stored = (ing.stdout + ing.stderr).trim();
}
const byTool = calls.reduce((m, c) => ((m[c.name] = (m[c.name] ?? 0) + 1), m), {});
console.log(JSON.stringify({ task, recalled, turns: result.num_turns, tool_calls: calls.length, by_tool: byTool, cost_usd: result.total_cost_usd, duration_s: Math.round((result.duration_ms ?? 0) / 1000), stored, final: String(result.result ?? '').slice(0, 200) }, null, 2));
