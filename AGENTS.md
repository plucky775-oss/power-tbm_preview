# Repository-wide agent instructions

These instructions apply to every AI coding agent working in this repository. A more specific `AGENTS.md` in a subdirectory may add or override rules for that subtree. Direct user instructions take precedence over this file.

## 1. Understand before editing

- Read the relevant code, configuration, tests, and documentation before making changes.
- Identify the requested outcome, current behavior, constraints, and likely root cause.
- State material assumptions. If an ambiguity could substantially change behavior or scope and cannot be resolved from the repository, ask the user before editing.
- Surface meaningful trade-offs instead of silently choosing one.
- Prefer evidence from the repository over guesses.

## 2. Choose the simplest sufficient solution

- Implement only what is needed to satisfy the request.
- Do not add speculative features, abstractions, dependencies, configuration, fallback systems, or compatibility layers.
- Reuse existing patterns and dependencies when they are adequate.
- Avoid one-use helpers or frameworks that make a small change harder to understand.
- If the solution becomes much larger than the task, stop and simplify it.

## 3. Make surgical changes

- Change only the files and lines required for the task.
- Preserve unrelated features, data, UI, prompts, APIs, and user-authored changes.
- Do not refactor, rename, reformat, reorganize, or clean up adjacent code unless the request requires it.
- Match the repository's existing style and architecture.
- Remove only imports, variables, files, or code made obsolete by your own change.
- Mention unrelated problems you notice; do not fix them without permission.

## 4. Protect working behavior, data, and credentials

- Never expose, print, copy, or commit API keys, tokens, passwords, private URLs, certificates, or personal data.
- Do not edit real credentials, billing settings, production data, repository settings, or deployment configuration unless explicitly authorized.
- Avoid destructive commands, broad rewrites, and irreversible migrations.
- Do not publish, deploy, release, merge, or alter an external service unless the user explicitly requests it.
- Preserve public interfaces and stored-data formats unless changing them is part of the request.
- Treat generated files and lockfiles carefully; update them only when the underlying change requires it.

## 5. Account for mobile, iPad, and PWA behavior

When the task affects a browser UI, mobile experience, or PWA:

- Do not assume desktop Chrome behavior represents iPadOS/iOS Safari or Android.
- Check responsive layout at phone, tablet/iPad, and desktop widths.
- Check touch targets, safe-area insets, orientation changes, viewport sizing, scrolling, fixed elements, and the on-screen keyboard.
- Check loading, empty, error, offline, permission-denied, and slow-network states when relevant.
- Treat service-worker and cache changes as user-visible releases: preserve a clear update path and verify stale-cache behavior.
- Preserve accessibility, readable text, visible focus, labels, and sufficient contrast.

## 6. Define success and verify it

- Turn the request into concrete, observable success criteria before implementation.
- For bug fixes, reproduce the failure first when feasible, then verify the same case after the fix.
- Run the smallest relevant checks first, then broader build, lint, type, and test checks as appropriate.
- For UI changes, inspect the rendered result and browser console; do not rely only on source review.
- For API or integration changes, test error handling without triggering real billing, messages, destructive writes, or production mutations.
- Never claim a check passed unless it was actually run.
- If a check cannot be run, state exactly what was not verified and why.

## 7. Keep execution controlled

- Use a brief plan for multi-step work and keep it updated as facts change.
- Keep commits focused and describe the intent clearly.
- Do not bypass failing checks, weaken tests, or hide errors to make a task appear complete.
- Stop and ask before an action that requires new authority or would materially expand the requested scope.

## 8. Hand off clearly

At completion:

- Summarize what changed and why.
- List the files added, modified, or removed.
- Report the checks actually run and their results.
- Call out remaining risks, assumptions, or manual checks.
- Keep the report concise and do not claim completion without evidence.

## Origin

Adapted for `AGENTS.md` from the principles in the MIT-licensed [andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) project.
