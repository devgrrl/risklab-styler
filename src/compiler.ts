import { formatValue, toKebab } from './css';
import { stableHash } from './hash';
import { StyleRegistry } from './registry';
import type { CSSPrimitive, StyleObject } from './types';

export interface StyleDocumentTheme {
  selector: string;
  variables: Record<`--${string}`, CSSPrimitive>;
}

export interface StyleDocument {
  version: 'risklab.styles/v1';
  styles: Record<string, StyleObject>;
  animations?: Record<string, Record<string, StyleObject>>;
  themes?: Record<string, StyleDocumentTheme>;
}

export interface CompiledStyleDocument {
  version: 'risklab.styles.compiled/v1';
  classes: Record<string, string>;
  animations: Record<string, string>;
  css: string;
  manifest: {
    atomicRuleCount: number;
    sourceHash: string;
  };
}

const SAFE_SELECTOR = /^(?::root|\[[a-zA-Z0-9_-]+(?:=["'][a-zA-Z0-9 _-]+["'])?\]|\.[a-zA-Z_][a-zA-Z0-9_-]*)$/;
const BLOCKED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function assertStyleObject(value: unknown, path: string): asserts value is StyleObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${path} must be a style object`);
  }
  for (const [key, child] of Object.entries(value)) {
    if (BLOCKED_KEYS.has(key)) throw new TypeError(`${path}.${key} is not allowed`);
    if (child == null || typeof child === 'string' || typeof child === 'number') continue;
    assertStyleObject(child, `${path}.${key}`);
  }
}

export function validateStyleDocument(value: unknown): asserts value is StyleDocument {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Style document must be an object');
  const document = value as Partial<StyleDocument>;
  if (document.version !== 'risklab.styles/v1') throw new TypeError('Unsupported style document version');
  if (!document.styles || typeof document.styles !== 'object' || Array.isArray(document.styles)) {
    throw new TypeError('styles must be an object');
  }
  for (const [name, style] of Object.entries(document.styles)) assertStyleObject(style, `styles.${name}`);
  for (const [name, frames] of Object.entries(document.animations ?? {})) {
    if (!frames || typeof frames !== 'object' || Array.isArray(frames)) throw new TypeError(`animations.${name} must be an object`);
    for (const [step, style] of Object.entries(frames)) assertStyleObject(style, `animations.${name}.${step}`);
  }
  for (const [name, theme] of Object.entries(document.themes ?? {})) {
    if (!theme || typeof theme !== 'object' || !SAFE_SELECTOR.test(theme.selector)) throw new TypeError(`themes.${name}.selector is invalid`);
    for (const [variable, token] of Object.entries(theme.variables ?? {})) {
      if (!variable.startsWith('--') || (typeof token !== 'string' && typeof token !== 'number')) {
        throw new TypeError(`themes.${name}.variables contains an invalid declaration`);
      }
    }
  }
}

function compileFrames(
  registry: StyleRegistry,
  frames: Record<string, StyleObject>,
  label: string,
): string {
  const name = `${label}-${stableHash(JSON.stringify(frames))}`;
  const body = Object.entries(frames).map(([step, style]) => {
    const declarations = Object.entries(style)
      .filter((entry): entry is [string, CSSPrimitive] => typeof entry[1] === 'string' || typeof entry[1] === 'number')
      .map(([property, token]) => `${toKebab(property)}:${formatValue(property, token)}`)
      .join(';');
    return `${step}{${declarations}}`;
  }).join('');
  registry.registerGlobal(`animation:${name}`, `@keyframes ${name}{${body}}`);
  return name;
}

export function compileStyleDocument(input: unknown, prefix = 'rs'): CompiledStyleDocument {
  validateStyleDocument(input);
  const registry = new StyleRegistry();
  registry.configure({ prefix, autoInject: false });
  const classes = Object.fromEntries(
    Object.entries(input.styles).map(([name, style]) => [name, registry.compile(style, name)]),
  );
  const animations = Object.fromEntries(
    Object.entries(input.animations ?? {}).map(([name, frames]) => [name, compileFrames(registry, frames, name)]),
  );
  for (const [name, theme] of Object.entries(input.themes ?? {})) {
    const declarations = Object.entries(theme.variables)
      .map(([variable, token]) => `${variable}:${String(token)}`)
      .join(';');
    registry.registerGlobal(`theme:${name}`, `${theme.selector}{${declarations}}`);
  }
  const css = registry.getCSS();
  return {
    version: 'risklab.styles.compiled/v1',
    classes,
    animations,
    css,
    manifest: {
      atomicRuleCount: registry.getRules().length,
      sourceHash: stableHash(JSON.stringify(input)),
    },
  };
}

export function compileStyleDocumentJSON(json: string, prefix = 'rs'): CompiledStyleDocument {
  return compileStyleDocument(JSON.parse(json) as unknown, prefix);
}
