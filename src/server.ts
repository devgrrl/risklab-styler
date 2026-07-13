import { StyleRegistry } from './registry.js';
import type { StyleObject } from './types.js';

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
      const attrs = Object.entries({ 'data-risklab-styler': 'server', ...attributes }).map(([key, value]) => {
        if (!/^[a-zA-Z_:][a-zA-Z0-9_.:-]*$/.test(key)) throw new TypeError(`Invalid style attribute: ${key}`);
        const escaped = value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
        return ` ${key}="${escaped}"`;
      }).join('');
      const css = registry.getCSS().replaceAll('<', '\\3C ');
      return `<style${attrs}>${css}</style>`;
    },
  };
}
