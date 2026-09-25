# Add Memorable to this agent

You are integrating Memorable, procedural memory for agents, into the agent in this directory. Memorable stores how a task was done and hands the steps back the next time the same task comes up. Then the agent replays the steps instead of planning them again. Do all of this yourself. Ask the human only for the API key if it is missing.

## 1. Install and connect (once per machine)

```sh
npm i -g memorable-cli            # no npm? curl -fsSL https://memorable.sh/install.sh | sh
export MEMORABLE_API_URL=https://memorable-extraction-api.memorable.workers.dev
export MEMORABLE_API_KEY=mk_...   # the key you were given. No key? run `memorable login`, the human approves in the browser
memorable enable                  # write consent; nothing is stored before this
memorable doctor                  # every line must read ✓
```

Put the two exports where the agent process inherits them (.env, shell profile, or the launcher). Never run `memorable forget` or `memorable disable`: both turn capture off for the whole machine. To test a cold run, use a goal string you have not used before.

## 2. If the agent is Claude Code, Codex, Antigravity or Devin

```sh
memorable install-hooks            # add codex, antigravity or devin for those
```

Done. Recall runs on every prompt and finished work is recorded. Skip to step 5.

## 3. Any other agent: recall, replay, record

Three functions in the file that runs the agent loop. Shell out to the CLI. A missing CLI must never break a run, so wrap every call in try/catch and treat an error as no memory.

**Recall** before planning:

```sh
memorable recall "<the task in the user's words>"      # prints: 0.86  procedures/<slug>  [lexical,semantic]
memorable show procedures/<slug>                       # prints the steps, one per line: "  3. [execute] set_lights: set_lights room=kitchen state=off"
```

**Replay** on a hit. Parse the numbered step lines back into tool calls and run them without calling the planner. If a step fails or the goal is not met at the end, hand the history to the planner and continue from there. Do not paste the steps into the planner prompt and hope; run them.

**Record** after the goal is met. Pipe one JSON object into `memorable ingest -`:

```json
{
  "session_id": "<unique per run>",
  "task_description": "<the task in the user's words, the same string you recall with>",
  "harness": "<your agent's name>",
  "tool_calls": [
    {"name": "set_lights", "input": {"command": "set_lights room=kitchen state=off"}, "result": {"ok": true}},
    {"name": "lock_door",  "input": {"command": "lock_door door=front"},             "result": {"ok": true}}
  ]
}
```

Shape rules. Each one was found by getting `not stored` back:

- Every step goes in `input.command` as one string in the form `tool key=value key=value`. The extractor only reads `command`; structured inputs are dropped. Use the same format you parse in replay.
- Leave volatile values out of the command: summaries, timestamps, ids, LLM-written text. Two identical runs must produce identical commands, or every run stores a new copy.
- Keep commands short. `memorable show` truncates long lines, and a truncated line cannot be replayed. Store what identifies the action (path, url, selector, key), not payloads (file bodies, note text). Rebuild payloads at replay time from earlier results in the same run.
- Put `"result": {"ok": true}` on every step whose outcome you know, and always on the last step. A trace whose last step has no result is refused (`no_postcondition`).
- A run that only read things (get_state, search, fetch) is refused (`read_only`). Record runs that changed something.
- Record only runs that met the goal. Do not record a run that gave up.

`memorable ingest -` prints `stored procedures/<slug>` or `not stored: <reason>`. Treat `not stored` as a bug in your trace and fix the shape.

## 4. Prove it

Run the same task twice and print the planner call count for each. The second run must print a recall hit and 0 planner calls (or the number left after the failed step, if one failed). Reference numbers from this kit: home agent 7 planner calls then 0, browser agent 8 then 0, research agent 5 then 0, Claude Code 10 turns then 7.

## 5. Finish

Paste into your final message: both run outputs with their counts, and `memorable list`.
