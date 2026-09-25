// Home agent: an LLM plans one tool call at a time, the harness executes it against a fake house.
// Brain: `claude -p` (Claude Code headless). No SDK key needed.
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const house = { lights: { 'living room': 'on', bedroom: 'on', kitchen: 'on' }, thermostat: 72, doors: { front: 'unlocked', back: 'locked' } };

const tools = {
  get_state: () => ({ ...house }),
  set_lights: ({ room, state }) => { house.lights[room] = state; return { ok: true }; },
  set_thermostat: ({ temperature }) => { house.thermostat = temperature; return { ok: true }; },
  lock_door: ({ door }) => { house.doors[door] = 'locked'; return { ok: true }; },
  done: ({ summary }) => ({ ok: true, summary }),
};

const toolDoc = `tools:
  get_state() -> the whole house
  set_lights({room, state: "on"|"off"})
  set_thermostat({temperature})
  lock_door({door})
  done({summary})  call this when the goal is met`;

function memorable(args, input) {
  try { return execFileSync('memorable', args, { encoding: 'utf8', input }); } catch { return ''; }
}

// Best-effort: a missing or failing memorable CLI must never break the agent.
function recall(goal) {
  const hit = memorable(['recall', goal]).split('\n').find((l) => l.includes('procedures/'));
  const slug = hit?.trim().split(/\s+/)[1];
  return slug ? memorable(['show', slug]) : '';
}

function record(goal, history) {
  if (history.at(-1)?.name !== 'done') return; // only record runs that finished the goal
  const tool_calls = history.map((h) => ({
    name: h.name,
    input: { command: `${h.name} ${Object.entries(h.input).map(([k, v]) => `${k}=${v}`).join(' ')}`.trim() },
    ...(h.result ? { result: h.result } : {}),
  }));
  const trace = { session_id: randomUUID(), task_description: goal, harness: 'home-agent', tool_calls };
  console.log(memorable(['ingest', '-'], JSON.stringify(trace)).trim());
}

function plan(goal, history, reference) {
  const prompt = `You control a smart home. Goal: ${goal}
${toolDoc}
${reference ? `A past run of a similar task did this. The house resets to the same starting state every run, so trust these steps and skip get_state: replay the non-get_state steps in the same order, then call done.\n${reference}\n` : ''}History so far (JSON lines):
${history.map((h) => JSON.stringify(h)).join('\n') || '(none)'}
Reply with exactly one JSON object {"name": ..., "input": {...}} for the next tool call. No prose.`;
  const out = execFileSync('claude', ['-p', prompt, '--output-format', 'json', '--max-turns', '1', '--model', 'haiku', '--tools', ''], { encoding: 'utf8', cwd: '/tmp' });
  const text = JSON.parse(out).result.trim().replace(/^```json\s*|```$/g, '');
  return JSON.parse(text);
}

const goal = process.argv.slice(2).join(' ') || 'good night: lights off everywhere, thermostat to 68, lock the front door';
const reference = recall(goal);
const history = [];
for (let i = 0; i < 8; i++) {
  const call = plan(goal, history, reference);
  const result = tools[call.name] ? tools[call.name](call.input ?? {}) : { error: `unknown tool ${call.name}` };
  history.push({ name: call.name, input: call.input ?? {}, result });
  console.log(`${i + 1}. ${call.name} ${JSON.stringify(call.input ?? {})} -> ${JSON.stringify(result)}`);
  if (call.name === 'done') break;
}
console.log('final state', JSON.stringify(house));
console.log(`planner calls: ${history.length}`);
record(goal, history);
