// Home agent: an LLM plans one tool call at a time, the harness executes it against a fake house.
// Brain: `claude -p` (Claude Code headless). No SDK key needed.
import { execFileSync } from 'node:child_process';

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

function plan(goal, history) {
  const prompt = `You control a smart home. Goal: ${goal}
${toolDoc}
History so far (JSON lines):
${history.map((h) => JSON.stringify(h)).join('\n') || '(none)'}
Reply with exactly one JSON object {"name": ..., "input": {...}} for the next tool call. No prose.`;
  const out = execFileSync('claude', ['-p', prompt, '--output-format', 'json', '--max-turns', '1', '--model', 'haiku', '--tools', ''], { encoding: 'utf8', cwd: '/tmp' });
  const text = JSON.parse(out).result.trim().replace(/^```json\s*|```$/g, '');
  return JSON.parse(text);
}

const goal = process.argv.slice(2).join(' ') || 'good night: lights off everywhere, thermostat to 68, lock the front door';
const history = [];
for (let i = 0; i < 8; i++) {
  const call = plan(goal, history);
  const result = tools[call.name] ? tools[call.name](call.input ?? {}) : { error: `unknown tool ${call.name}` };
  history.push({ name: call.name, input: call.input ?? {}, result });
  console.log(`${i + 1}. ${call.name} ${JSON.stringify(call.input ?? {})} -> ${JSON.stringify(result)}`);
  if (call.name === 'done') break;
}
console.log('final state', JSON.stringify(house));
console.log(`planner calls: ${history.length}`);
