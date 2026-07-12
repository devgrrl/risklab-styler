export type CSSPrimitive = string | number;
export type CSSValue = CSSPrimitive | null | undefined;

export interface StyleObject {
  [propertyOrSelector: string]: CSSValue | StyleObject;
}

export type StyleInput = string | false | null | undefined | StyleInput[] | { className?: string | undefined };

export interface CompiledProps {
  className: string;
}

export interface AtomicRule {
  className: string;
  cssText: string;
  conflictKey: string;
}

export interface StylerConfiguration {
  prefix?: string;
  autoInject?: boolean;
  nonce?: string;
  target?: Document | ShadowRoot;
}

export type StyleMap<T extends string = string> = Record<T, string>;
export type VariableContract<T extends Record<string, unknown>> = { [K in keyof T]: T[K] extends Record<string, unknown> ? VariableContract<T[K]> : string };

export interface VariantRecipe<Variants extends Record<string, Record<string, StyleObject>>> {
  base?: StyleObject;
  variants: Variants;
  defaults?: Partial<{ [K in keyof Variants]: keyof Variants[K] }>;
  compounds?: Array<{ when: Partial<{ [K in keyof Variants]: keyof Variants[K] }>; style: StyleObject }>;
}

export type VariantSelection<Variants extends Record<string, Record<string, StyleObject>>> = Partial<{ [K in keyof Variants]: keyof Variants[K] }>;
