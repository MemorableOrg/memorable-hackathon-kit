# Memorable at the hackathon

Your agent forgets everything between runs. Memorable remembers how a task was done and hands the steps back next time, so the second run skips the thinking.

## Three steps, five minutes

1. Sign in at memorable.sh/dash with GitHub or Google. Click Environments, pick what your agent does, name it, Save.
2. Press Copy prompt. Paste it into your agent (Claude Code, Codex, Cursor, or the one you are building). The agent installs Memorable and signs itself in. Nothing else to approve.
3. Run a task twice. The second run starts with a recall hit. Your environment page on memorable.sh shows both runs.

Building your own agent? The prompt at github.com/MemorableOrg/memorable-hackathon-kit (PROMPT.md) tells the agent how to record and replay. Reference agents in the same repo: 7 planner calls down to 0 on the second run.

## If you start in the terminal instead

```
npx memorable-cli
```

It asks which agent you use, where memories should show up, and opens one browser tab to sign in. Then it hands the rest to your agent.

## What an environment is

One page on memorable.sh per agent or project. Memories your agent records land there. Teammates you invite see the same page and get the same prompt. If you skip it, memories still work; they just sit under your workspace with no page of their own.

## Stuck?

`memorable doctor` prints every check. Find us at the Memorable table or email nikhil@memorable.sh.
