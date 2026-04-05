/**
 * i18n module for the iTeam extension.
 *
 * Usage:
 *   import { t } from '../i18n';
 *   t('sidebar.connect')           // "Connect" or "连接"
 *   t('cmd.roleSetTo', 'backend')  // "iTeam: Role set to backend"
 */
import * as vscode from 'vscode';
import { en, type LocaleKey } from './locales/en';
import { zhCN } from './locales/zh-CN';

export type Locale = 'en' | 'zh-CN';

const locales: Record<Locale, Record<string, string>> = {
  en,
  'zh-CN': zhCN,
};

let currentLocale: Locale = 'en';

/**
 * Initialise the locale from the user's configuration.
 * Call this once at extension activation.
 */
export function initLocale(): void {
  const config = vscode.workspace.getConfiguration('iteam');
  currentLocale = (config.get<string>('language') as Locale) || 'en';
}

/**
 * Set the active locale at runtime (e.g. when the config changes).
 */
export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

/**
 * Return the active locale.
 */
export function getCurrentLocale(): Locale {
  return currentLocale;
}

/**
 * Translate a key, optionally interpolating positional {0}, {1}, … placeholders.
 */
export function t(key: LocaleKey, ...args: (string | number)[]): string {
  const dict = locales[currentLocale] ?? locales.en;
  let text = dict[key] ?? locales.en[key] ?? key;

  for (let i = 0; i < args.length; i++) {
    text = text.replace(`{${i}}`, String(args[i]));
  }

  return text;
}

export type { LocaleKey };
