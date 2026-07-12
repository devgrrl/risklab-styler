import { beforeEach, describe, expect, it } from 'vitest';
import { create, createTheme, createVariants, css, defineVars, globalStyleRegistry, keyframes, props } from '../src/index';
import { createServerStyleCollector } from '../src/server';

beforeEach(() => globalStyleRegistry.clear());

describe('RiskLab Styler', () => {
  it('creates deterministic atomic classes and injects CSS', () => {
    const first = css({ color: 'red', paddingInline: 12 }, 'button');
    const second = css({ color: 'red', paddingInline: 12 }, 'button');
    expect(first).toBe(second);
    expect(globalStyleRegistry.getCSS()).toContain('color:red');
    expect(globalStyleRegistry.getCSS()).toContain('padding-inline:12px');
  });

  it('renders nested selectors and conditional rules', () => {
    css({ ':hover': { color: 'cyan' }, '@media (min-width: 60rem)': { display: 'grid' }, '&[aria-selected="true"]': { fontWeight: 700 } }, 'interactive');
    const output = globalStyleRegistry.getCSS();
    expect(output).toContain(':hover{color:cyan}');
    expect(output).toContain('@media (min-width: 60rem)');
    expect(output).toContain('[aria-selected="true"]');
  });

  it('resolves atomic conflicts according to composition order', () => {
    const styles = create({ base: { color: 'red', padding: 4 }, selected: { color: 'lime' } });
    const result = props(styles.base, styles.selected);
    expect(result.className).toContain(styles.selected.split(' ')[0]!);
    expect(result.className.split(' ')).toHaveLength(2);
  });

  it('creates typed variable contracts and themes', () => {
    const vars = defineVars({ color: { accent: '' }, spacing: { md: 0 } }, 'app');
    const theme = createTheme(vars, { color: { accent: '#22d3ee' }, spacing: { md: 12 } }, 'dark');
    expect(vars.color.accent).toBe('var(--app-color-accent)');
    expect(theme).toBeTruthy();
    expect(globalStyleRegistry.getCSS()).toContain('--app-color-accent:#22d3ee');
  });

  it('builds variant recipes and compound selections', () => {
    const button = createVariants({ base: { display: 'inline-flex' }, variants: { size: { sm: { height: 28 }, lg: { height: 44 } }, tone: { normal: { color: 'white' }, danger: { color: 'red' } } }, defaults: { size: 'sm', tone: 'normal' }, compounds: [{ when: { size: 'lg', tone: 'danger' }, style: { fontWeight: 700 } }] }, 'button');
    const className = button({ size: 'lg', tone: 'danger' });
    expect(className.split(' ').length).toBe(4);
  });

  it('collects isolated CSS for server rendering', () => {
    const collector = createServerStyleCollector('server');
    const className = collector.css({ display: 'grid', gap: 8 }, 'shell');
    expect(className).toContain('server-shell');
    expect(collector.getStyleTag({ nonce: 'abc' })).toContain('nonce="abc"');
    expect(collector.getCSS()).toContain('gap:8px');
  });

  it('serializes keyframe units correctly and collects them for server output', () => {
    const name = keyframes({
      from: { opacity: 0, translate: 0 },
      to: { opacity: 1, translate: 12 },
    }, 'enter');
    const output = globalStyleRegistry.getCSS();
    expect(name).toMatch(/^enter-/);
    expect(output).toContain('opacity:1');
    expect(output).toContain('translate:12px');
    expect(output).not.toContain('opacity:1px');
  });
});
