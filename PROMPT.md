# Add Memorable to this agent

You are integrating Memorable, procedural memory for agents, into the agent in this directory. Memorable stores how a task was done and hands the steps back the next time a similar task comes up. Do all of this yourself. Ask the human only for the API key if it is missing.

## 1. Install and connect (once per machine)

```sh
npm i -g memorable-cli            # or: curl -fsSL https://memorable.sh/install.sh | sh
export MEMORABLE_API_URL=https://memorable-extraction-api.memorable.workers.dev
export MEMORABLE_API_KEY=mk_...   # the key you were given; no key? run `memorable login` and let the human approve in the browser
memorable enable                  # write consent; nothing is stored before this
memorable doctor                  # every line must read ✓
```

Put the two exports somewhere the agent process inherits them (.env, shell profile, or the harness launcher).

## 2. Recall before the task

Before the agent plans anything, run:

```sh
memorable recall "<the task in the user's words>"
```

If it prints a line like `0.86  procedures/<slug>  [lexical]`, run `memorable show procedures/<slug>` and put the output into the planner's context as reference data. If it prints `no matching procedures.` plan from scratch.

## 3. Record after the task

When the task finishes, pipe one JSON object into `memorable ingest -`:

```json
{
  "session_id": "<unique per run>",
  "task_description": "<the task in the user's words>",
  "harness": "<your agent's name>",
  "tool_calls": [
    {"name": "<tool>", "input": {"command": "<tool> <arguments as one line>"}},
    {"name": "<tool>", "input": {"command": "<tool> <arguments as one line>"}, "result": {"ok": true}}
  ]
}
```

Rules that decide whether it gets stored:

- Every step goes in `input.command` as one string, whatever the tool was: `set_lights room=bedroom state=off`, `click #confirm`, `fetch https://...`. Structured inputs without `command` are ignored by the extractor.
- The last step must be the action that proved the task worked, and it must carry `"result": {"ok": true}`. Include `result` only when you actually know the outcome.
- A run that only read things (ls, get_state, fetch) is not stored. Send runs that changed something.

`memorable ingest -` prints `stored procedures/<slug>` or `not stored: <reason>`. Treat `not stored` as a bug in your trace shape and fix it.

## 4. Prove it

Run the same task twice. The second run must start with a recall hit and use fewer planner calls or tool calls than the first. Print both counts. If the second run does not recall, run `memorable recall "<task>"` by hand and fix the wording of `task_description` so the two match.

Then run `memorable list` and paste its output into your final message.
