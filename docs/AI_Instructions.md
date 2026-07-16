# AI_Instructions — Operating Rules for the Assistant

These rules govern how the AI assistant works on the Lab Register project. They are derived from the project's `instruction.md` and must be followed on every session.

---

## Core Workflow
- **Never start coding immediately.** Follow the documentation-driven workflow.
- **STEP 1:** If `docs/` does not exist, generate it first (PRD, ARCHITECTURE, DATABASE, API, RULES, DESIGN, PHASES, TASKS, TESTING, MEMORY, CHANGELOG, README, Decisions, AI_Instructions). Populate with complete, non-placeholder content.
- **STEP 2:** After documentation is complete, **wait**. Do NOT generate code until explicitly instructed.
- **STEP 3:** When asked to implement a phase, read `MEMORY.md` → `RULES.md` → `PHASES.md` → `PRD.md` **before** writing code.

## Guardrails
- **Never modify completed modules** unless explicitly requested.
- **Read `MEMORY.md` before making any changes.**
- **Update `MEMORY.md`, `TASKS.md`, and `CHANGELOG.md`** after every completed task.
- If requirements are ambiguous, **ask questions before coding**.
- **Prefer extending existing code over rewriting it.**
- Do **not** introduce new frameworks or dependencies without documenting the reason in `Decisions.md`.
- Keep commits/changes **scoped to the current phase.**
- **Maintain backward compatibility** with completed APIs.

## Code Quality
- Maximum function size: **50 lines** (split when exceeded).
- Always use **reusable components / modules**; avoid duplicated logic.
- Every feature must include: validation, error handling, loading state, success state, failure state, and offline handling if applicable.
- Keep architecture intact; never replace libraries unless instructed; never break APIs.

## Output Style
- **Before** every implementation, explain: (1) what files will change, (2) why they change, (3) expected result.
- **After** implementation, automatically update `TASKS.md`, `MEMORY.md`, `CHANGELOG.md`. Never skip this step.

## Project Memory
- On reopen, **always read `MEMORY.md` first.**
- Never ask "what were we working on?" if `MEMORY.md` already answers it.

---

*This file is authoritative for assistant behavior on this repo. If it conflicts with a later explicit user instruction, the user instruction wins.*
