# RiskLab Styler

RiskLab Styler is a typed, zero-runtime-dependency atomic styling engine for production application interfaces.

It provides deterministic atomic classes, nested selectors, conditional rules, theme-variable contracts, variant recipes, conflict-safe composition, runtime injection, isolated registries, hydration, and server-side collection.

```ts
import { create, createVariants, defineVars, createTheme, props } from '@risklab/styler';

const vars = defineVars({ color: { accent: '' }, space: { md: 0 } }, 'app');
const darkTheme = createTheme(vars, { color: { accent: '#22d3ee' }, space: { md: 12 } });

const styles = create({
  root: {
    display: 'grid',
    gap: vars.space.md,
    color: vars.color.accent,
    ':hover': { opacity: 0.92 },
    '@media (min-width: 60rem)': { gridTemplateColumns: '18rem 1fr' },
  },
});

const button = createVariants({
  base: { display: 'inline-flex', alignItems: 'center' },
  variants: {
    size: { sm: { height: 28 }, lg: { height: 44 } },
    tone: { normal: { color: 'white' }, critical: { color: '#ef4444' } },
  },
  defaults: { size: 'sm', tone: 'normal' },
});

const className = props(darkTheme, styles.root, button({ size: 'lg' })).className;
```

Server rendering uses `createServerStyleCollector` from `@risklab/styler/server`.

Build-time and configuration-driven applications can compile a strict JSON
style document with `compileStyleDocument` from `@risklab/styler/compiler`.
The compiler returns deterministic CSS plus class and animation manifests, so
an application can ship extracted CSS without enabling runtime injection.

Licensed under Apache-2.0.
