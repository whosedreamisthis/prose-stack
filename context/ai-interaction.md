# AI Interaction Guidelines

## Communication

- Be concise and direct
- Explain non-obvious decisions briefly
- Ask before large refactors or architectural changes
- Don't add features not in the project spec
- Never delete files without clarification

## Workflow

This is the common workflow that we will use for every single feature/fix:

1. **Document** - Document the feature in @context/current-feature.md.
2. **Branch** - Create new branch for feature, fix, etc
3. **Implement** - Implement the feature/fix that I create in @context/current-feature.md. implement one feature goal at a time, show me which goal is being implemented when you are asking permission to make changes.
4. **Test** - Write Vitest unit tests for new or changed server actions and utilities (not components), where there is logic worth testing. Run `npm test` and `npm run build` and fix any failures. I verify the feature in the browser
5. **Iterate** - Iterate and change things if needed
6. **Commit** - Only after build passes and everything works. create a verbose commit message, don't include that claude co authored feature.
7. **Merge** - Merge to main
8. **Delete Branch** - Delete branch after merge
9. **Review** - Review AI-generated code periodically and on demand.
10. Mark as completed in @context/current-feature.md (with a one-line entry in its Completed Features list) and add the full summary to `context/feature-history.md`

Do NOT commit without permission and until the tests and build pass. If either fails, fix the issues first.

## Branching

We will create a new branch for every feature/fix. Name branch **feature/[feature]** or **fix[fix]**, etc. Ask to delete the branch once merged.

## Commits

- Ask before committing (don't auto-commit)
- Use conventional commit messages (feat:, fix:, chore:, etc.)
- Keep commits focused (one feature/fix per commit)
- Never put "Generated With Claude" or similar notion in the commit messages

## When Stuck

- If something isn't working after 2-3 attempts, stop and explain the issue
- Don't keep trying random fixes
- Ask for clarification if requirements are unclear

## Code Changes

- Make minimal changes to accomplish the task
- Don't refactor unrelated code unless asked
- Don't add "nice to have" features
- Preserve existing patterns in the codebase
- When updating current-feature.md status to completed, clear its feature description, Goals and Notes, add a one-line entry to the end of its Completed Features list, and append the full summary to the end of `context/feature-history.md`

## Code Review

Review AI-generated code periodically, especially for:

- Security (auth checks, input validation)
- Performance (unnecessary re-renders, N+1 queries)
- Logic errors (edge cases)
- Patterns (matches existing codebase?)
