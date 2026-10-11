# Complete Action

1. Make sure `npm test` and `npm run build` pass, then stage all changes and commit with a descriptive message
2. Switch to main and merge the feature branch (no push yet)
3. Delete the local feature branch
4. Reset current-feature.md and record the feature:
   - Change H1 back to `# Current Feature`
   - Set Status to `Completed`, and clear the feature description, Goals and Notes (keep placeholder comments); keep the Completed Features list
   - Append a one-line entry (`- **Feature Name:** ...`, what it adds and its key files, about 15–25 words) at the END of the Completed Features list in current-feature.md
   - Append the full feature summary as a new `- **Feature Name:** ...` entry at the END of `context/feature-history.md`
5. Commit both files together: `chore: reset current-feature.md after completing [feature]`
6. Push main to origin ONCE (single push with all changes)
7. If feature branch was previously pushed, delete it from origin