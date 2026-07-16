# Coverage policy

`npm run test:coverage` enforces 80% coverage across statements, branches, functions, and lines for every executable source module. The declaration-only `types.ts` module is excluded because it emits no runtime JavaScript. Browser hydration and style-element lifecycle behavior are additionally verified in Chromium during `release:check`.
