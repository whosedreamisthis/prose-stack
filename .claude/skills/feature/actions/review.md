# Review Action


1. Read current-feature.md to understand the goals
2. Review all code changes made for this feature
3. Check for:
   - ✅ Goals met
   - ❌ Goals missing or incomplete
   - ⚠️ Code quality issues or bugs
   - 🚫 Scope creep (code beyond goals)
   - 🌱 Demo seed: if the feature adds data users create (a new model), `lib/demo-seed.ts` also seeds sample rows for it, with a test in `lib/demo-seed.test.ts`
   - 🧪 Tests: new or changed server actions and utilities with testable logic have Vitest tests, and `npm test` passes
4. Final verdict: Ready to complete or needs changes