# memorable-hackathon-kit

What a hacker gets when they add Memorable to an agent, measured. Three agents, each run cold and then warm.

| Build | Agent | Cold | Warm | How the warm run got there |
|---|---|---|---|---|
| 01-coding | Claude Code headless on a repo with one failing test | 10 turns, 8 tool calls | 7 turns, 6 tool calls | `memorable hook user-prompt` injects the stored procedure on the prompt |
| 02-home-agent | Planner loop over fake smart-home tools | 7 planner calls | 0 planner calls | recall hit, steps replayed, planner never called |
| 03-browser-agent | Planner loop over a fake booking site | 8 planner calls | 0 planner calls | same |
| 04-research-agent | Planner loop over a fake corpus, writes a note | 5 planner calls | 0 planner calls | same, integrated by a headless agent from PROMPT v2 |

Planner calls are `claude -p` invocations with the haiku model. Turns and tool calls for 01 come from Claude Code's stream-json output.

## Pick your route

| You are building | Start here | Then |
|---|---|---|
| A coding agent on a repo (Claude Code, Codex, Cursor, Devin, Antigravity) | `npx memorable-cli` in the repo | pick the agent, say yes to a page for this project, press Approve in the tab. Hooks and consent are written for you. Do a task twice. |
| Your own agent loop (browser, voice, home, research, ops) | memorable.sh/dash, Environments, pick the card, Save, Copy prompt | paste the prompt into the agent that builds your project. It adds recall, replay, record. `PROMPT.md` here is the same prompt with the shape rules. Run the task twice. |
| No terminal (claude.ai, Cowork, Claude desktop) | memorable.sh/dash, Connect, Create a connector | add the link in Claude under Connectors. Claude searches and records on its own. |
| A hosted service with no Node | memorable.sh/dash, Account, New key for an agent | `POST /v1/extract` with the key. Store the draft yourself. |
| A team on several laptops | one person makes the environment | Connect, More, invite by email. Everyone pastes the same prompt or runs `npx memorable-cli` and picks the same name. |

Bare `memorable login` inside an agent never finishes and is refused. Agents get a key from one of the rows above.

## Files

- `PROMPT.md` is the one prompt a hacker pastes into their agent. Build 02 was integrated by a headless Claude Code agent given only that prompt (25 turns, $0.69, 6 minutes). Build 03 was integrated by hand following the same prompt. Build 04 was integrated by a headless agent given PROMPT v2 (30 turns, $1.02, 9 minutes); it found the line-truncation problem below on its own and worked around it.
- `eval/run.mjs <app-dir> "<task>"` runs a Claude Code task headless, turns its tool calls into a Memorable trace, ingests it, and prints turns, tool calls, cost and whether the hook recalled. Run it twice for a before and after.
- `builds/*/agent.mjs` are the reference integrations. The pattern in each: `recall(goal)`, `stepsOf(reference)`, `replay(steps)`, `record(goal, history)`, about 40 lines.

## Run it

```sh
npm i -g memorable-cli
export MEMORABLE_HOME=$PWD/.memorable-home    # optional: keep the kit's store apart from your own
echo 'mk_...' | memorable login --paste       # key from memorable.sh/dash, Environments, Connect
memorable enable && memorable doctor

cd builds/02-home-agent && node agent.mjs "good night: lights off everywhere, thermostat to 68, lock the front door"   # run twice
cd ../03-browser-agent && node agent.mjs "book a table for two at 7pm at Nopa"                                         # run twice
cd ../.. && node eval/run.mjs builds/01-coding/app "fix the failing test in the session module"                        # run, git checkout the app, run again
```

## What building this taught us about the product

Each of these cost a `not stored` or a wasted run, in the order they were hit.

1. Traces without a final command step are refused (`no_postcondition`). Every non-shell agent hits this first. The prompt now says to put every step in `input.command` and mark the last one ok.
2. Structured tool inputs are dropped. Only `input.command` reaches the extractor, so the `tool key=value` string format is the whole integration contract.
3. `memorable show` prints prose. Replay needs the step lines parsed back with a regex. A `show --json` would make replay a two-line loop.
4. Titles come from the first command, not the task: "Execute set_lights room=kitchen state=off". `memorable list` is unreadable after five runs.
5. Two runs with a summary string in the last step store two procedures. Volatile args have to stay out of commands.
6. `memorable login` inside an agent's shell tool cannot finish: the tool times out before a person approves the browser page. `echo 'mk_…' | memorable login --paste` on the published CLI signs in with no browser. The prompt now uses that line and the dashboard's Connect step mints the key into it.
7. The headless agent ran `memorable forget --yes` to get a clean store and wiped consent for the machine. The prompt now bans it.
8. The Claude Code hook names the verify command but not the files edited, so the warm coding run still reads two files. Read and Edit steps are classed `other` and dropped from the injected text.
9. `memorable show` truncates long step lines with `… (line truncated)`. A step whose command carries a note body or file text cannot be replayed. Commands have to carry identifiers only.
