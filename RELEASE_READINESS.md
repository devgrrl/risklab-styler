# Release readiness

- Package: `@risklab/styler`
- Version: `1.0.0`
- Build: `npm run build`
- Validation: `npm run release:check`
- Tarball consumer test: `npm run pack:check`
- Release workflow: `.github/workflows/release.yml`
- License: Apache-2.0 with `NOTICE`
- ESM: root, `/server`, and `/compiler`
- CommonJS: root, `/server`, and `/compiler`
- Browser support: modern browsers; SSR collectors are DOM-independent
- Publication order: first, before packages that consume the styling runtime

The runtime API accepts trusted application styles. The JSON compiler applies a restricted selector, at-rule, property, and token grammar and intentionally rejects arbitrary CSS.
