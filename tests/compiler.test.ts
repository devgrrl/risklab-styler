import { describe, expect, it } from 'vitest';
import { compileStyleDocument, compileStyleDocumentJSON } from '../src/compiler';

describe('static style document compiler', () => {
  const document = {
    version: 'risklab.styles/v1' as const,
    styles: {
      shell: { display: 'grid', gap: 12, '@media (min-width: 60rem)': { gap: 20 } },
      quiet: { opacity: 0.7 },
    },
    animations: {
      pulse: { from: { opacity: 0.4 }, to: { opacity: 1 } },
    },
    themes: {
      dark: { selector: '[data-theme="dark"]', variables: { '--surface': '#020617' } },
    },
  };

  it('emits deterministic CSS and a consumable class manifest', () => {
    const result = compileStyleDocument(document, 'app');
    expect(result.classes.shell.split(' ')).toHaveLength(3);
    expect(result.animations.pulse).toMatch(/^pulse-/);
    expect(result.css).toContain('@media (min-width: 60rem)');
    expect(result.css).toContain('@keyframes pulse-');
    expect(result.css).toContain('[data-theme="dark"]{--surface:#020617}');
    expect(result.manifest.atomicRuleCount).toBe(4);
  });

  it('accepts JSON and rejects unsafe theme selectors', () => {
    expect(compileStyleDocumentJSON(JSON.stringify(document)).css).toContain('display:grid');
    expect(() => compileStyleDocument({
      version: 'risklab.styles/v1',
      styles: {},
      themes: { bad: { selector: 'body script', variables: {} } },
    })).toThrow(/selector is invalid/);
  });

  it('rejects CSS and HTML breakout tokens in configuration documents', () => {
    expect(() => compileStyleDocument({ version: 'risklab.styles/v1', styles: { bad: { color: '</style><script>' } } })).toThrow(/unsafe CSS token/);
    expect(() => compileStyleDocument({ version: 'risklab.styles/v1', styles: { bad: { 'color};body{display': 'none' } } })).toThrow(/valid property/);
    expect(() => compileStyleDocument({ version: 'risklab.styles/v1', styles: { bad: { '@import url(evil)': { color: 'red' } } } })).toThrow(/allowed selector or condition/);
    expect(() => compileStyleDocument({ version: 'risklab.styles/v1', styles: {}, animations: { pulse: { '0%;body': { opacity: 1 } } } })).toThrow(/is invalid/);
  });
});
