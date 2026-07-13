import { stableHash } from './hash.js';
import { formatValue, toKebab } from './css.js';
import { globalStyleRegistry, StyleRegistry } from './registry.js';
import type { CompiledProps, StyleInput, StyleMap, StyleObject, StylerConfiguration, VariableContract, VariantRecipe, VariantSelection } from './types.js';

export type * from './types.js';
export { stableHash, StyleRegistry, globalStyleRegistry };

export function configureStyler(configuration: StylerConfiguration): void { globalStyleRegistry.configure(configuration); }

export function css(style: StyleObject, label = 'dynamic'): string { return globalStyleRegistry.compile(style, label); }

export function create<T extends Record<string, StyleObject>>(styles: T): StyleMap<Extract<keyof T, string>> {
  return Object.fromEntries(Object.entries(styles).map(([name, style]) => [name, globalStyleRegistry.compile(style, name)])) as StyleMap<Extract<keyof T, string>>;
}

function flattenInputs(inputs: StyleInput[], output: string[]): void {
  for (const input of inputs) {
    if (!input) continue;
    if (Array.isArray(input)) flattenInputs(input, output);
    else if (typeof input === 'string') output.push(...input.split(/\s+/).filter(Boolean));
    else if (input.className) output.push(...input.className.split(/\s+/).filter(Boolean));
  }
}

export function props(...inputs: StyleInput[]): CompiledProps {
  const flattened: string[] = [];
  flattenInputs(inputs, flattened);
  const byConflict = new Map<string, string>();
  const unmanaged: string[] = [];
  for (const className of flattened) {
    const conflict = globalStyleRegistry.conflictKey(className);
    if (conflict) byConflict.set(conflict, className);
    else if (!unmanaged.includes(className)) unmanaged.push(className);
  }
  return { className: [...unmanaged, ...byConflict.values()].join(' ') };
}

export function defineVars<T extends Record<string, unknown>>(contract: T, namespace = 'theme'): VariableContract<T> {
  const visit = (value: Record<string, unknown>, path: string[]): Record<string, unknown> => Object.fromEntries(Object.entries(value).map(([key, child]) => {
    const next = [...path, key];
    return [key, child && typeof child === 'object' ? visit(child as Record<string, unknown>, next) : `var(--${namespace}-${next.join('-')})`];
  }));
  return visit(contract, []) as VariableContract<T>;
}

export function createTheme<T extends Record<string, unknown>>(variables: VariableContract<T>, values: T, label = 'theme'): string {
  const declarations: StyleObject = {};
  const walk = (refs: Record<string, unknown>, source: Record<string, unknown>) => {
    for (const [key, ref] of Object.entries(refs)) {
      const value = source[key];
      if (ref && typeof ref === 'object' && value && typeof value === 'object') walk(ref as Record<string, unknown>, value as Record<string, unknown>);
      else if (typeof ref === 'string' && ref.startsWith('var(--')) declarations[ref.slice(4, -1)] = value as string | number;
    }
  };
  walk(variables as Record<string, unknown>, values);
  return globalStyleRegistry.compile(declarations, label);
}

export function keyframes(frames: Record<string, StyleObject>, label = 'animation'): string {
  const name = `${label}-${stableHash(JSON.stringify(frames))}`;
  const body = Object.entries(frames).map(([step, style]) => {
    const declarations = Object.entries(style)
      .filter((entry): entry is [string, string | number] => typeof entry[1] === 'string' || typeof entry[1] === 'number')
      .map(([property, value]) => `${toKebab(property)}:${formatValue(property, value)}`)
      .join(';');
    return `${step}{${declarations}}`;
  }).join('');
  const cssText = `@keyframes ${name}{${body}}`;
  globalStyleRegistry.registerGlobal(`keyframes:${name}`, cssText);
  return name;
}

export function createVariants<Variants extends Record<string, Record<string, StyleObject>>>(recipe: VariantRecipe<Variants>, label = 'variant') {
  const base = recipe.base ? css(recipe.base, `${label}-base`) : '';
  const compiled = Object.fromEntries(Object.entries(recipe.variants).map(([variant, options]) => [variant, Object.fromEntries(Object.entries(options).map(([option, style]) => [option, css(style, `${label}-${variant}-${option}`)]))])) as Record<string, Record<string, string>>;
  return (selection: VariantSelection<Variants> = {}): string => {
    const resolved = { ...recipe.defaults, ...selection } as Record<string, string>;
    const classes: StyleInput[] = [base];
    for (const [variant, option] of Object.entries(resolved)) classes.push(compiled[variant]?.[option]);
    for (const compound of recipe.compounds ?? []) if (Object.entries(compound.when).every(([key, value]) => resolved[key] === value)) classes.push(css(compound.style, `${label}-compound`));
    return props(...classes).className;
  };
}
