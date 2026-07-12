import { StyleRegistry } from './registry';
import type { StyleObject } from './types';

export interface ServerStyleCollector {
  registry: StyleRegistry;
  css(style: StyleObject, label?: string): string;
  getStyleTag(attributes?: Record<string, string>): string;
  getCSS(): string;
}

export function createServerStyleCollector(prefix = 'rs'): ServerStyleCollector {
  const registry = new StyleRegistry();
  registry.configure({ prefix, autoInject: false });
  return {
    registry,
    css: (style, label) => registry.compile(style, label),
    getCSS: () => registry.getCSS(),
    getStyleTag(attributes = {}) {
      const attrs = Object.entries({ 'data-risklab-styler': 'server', ...attributes }).map(([key, value]) => ` ${key}="${value.replaceAll('"', '&quot;')}"`).join('');
      return `<style${attrs}>${registry.getCSS()}</style>`;
    },
  };
}
