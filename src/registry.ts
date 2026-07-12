import { flattenStyle, renderAtomicRule } from './css';
import { stableHash } from './hash';
import type { AtomicRule, StyleObject, StylerConfiguration } from './types';

export class StyleRegistry {
  private rules = new Map<string, AtomicRule>();
  private metadata = new Map<string, string>();
  private signatures = new Map<string, string>();
  private globalRules = new Map<string, string>();
  private styleElement: HTMLStyleElement | null = null;
  private configuration: Required<Pick<StylerConfiguration, 'prefix' | 'autoInject'>> & StylerConfiguration = { prefix: 'rs', autoInject: true };

  configure(configuration: StylerConfiguration): void {
    this.configuration = { ...this.configuration, ...configuration };
    if (this.styleElement && configuration.nonce) this.styleElement.nonce = configuration.nonce;
  }

  compile(style: StyleObject, label = 'style'): string {
    const classes: string[] = [];
    for (const leaf of flattenStyle(style)) {
      const signature = JSON.stringify([leaf.property, leaf.value, leaf.conditions, leaf.selectors]);
      const baseName = `${this.configuration.prefix}-${label.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 18)}-${stableHash(signature)}`;
      let className = baseName;
      let collision = 0;
      while (this.signatures.has(className) && this.signatures.get(className) !== signature) {
        collision += 1;
        className = `${baseName}-${collision}`;
      }
      const rendered = renderAtomicRule(className, leaf);
      if (!this.rules.has(className)) {
        const rule = { className, ...rendered };
        this.rules.set(className, rule);
        this.signatures.set(className, signature);
        this.metadata.set(className, rendered.conflictKey);
        if (this.configuration.autoInject) this.inject(rule.cssText);
      }
      classes.push(className);
    }
    return classes.join(' ');
  }

  conflictKey(className: string): string | undefined { return this.metadata.get(className); }
  has(className: string): boolean { return this.rules.has(className); }
  getCSS(): string { return [...Array.from(this.rules.values(), (rule) => rule.cssText), ...this.globalRules.values()].join('\n'); }
  getRules(): readonly AtomicRule[] { return Array.from(this.rules.values()); }
  clear(): void { this.rules.clear(); this.metadata.clear(); this.signatures.clear(); this.globalRules.clear(); this.styleElement?.remove(); this.styleElement = null; }

  registerGlobal(id: string, cssText: string): void {
    const existing = this.globalRules.get(id);
    if (existing === cssText) return;
    if (existing !== undefined) throw new Error(`Global style id collision: ${id}`);
    this.globalRules.set(id, cssText);
    if (this.configuration.autoInject) this.inject(cssText);
  }

  hydrate(cssText: string, classNames: string[] = []): void {
    if (typeof document === 'undefined') return;
    const style = this.ensureStyleElement();
    style.textContent = cssText;
    for (const className of classNames) if (!this.metadata.has(className)) this.metadata.set(className, `hydrated|${className}`);
  }

  private inject(cssText: string): void {
    if (typeof document === 'undefined') return;
    this.ensureStyleElement().append(document.createTextNode(`${cssText}\n`));
  }

  private ensureStyleElement(): HTMLStyleElement {
    if (this.styleElement?.isConnected) return this.styleElement;
    const documentTarget = this.configuration.target instanceof Document ? this.configuration.target : document;
    const style = documentTarget.createElement('style');
    style.dataset.risklabStyler = 'runtime';
    if (this.configuration.nonce) style.nonce = this.configuration.nonce;
    const target = this.configuration.target ?? documentTarget.head;
    target.appendChild(style);
    this.styleElement = style;
    return style;
  }
}

export const globalStyleRegistry = new StyleRegistry();
