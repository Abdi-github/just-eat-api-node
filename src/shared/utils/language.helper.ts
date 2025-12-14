import { Request } from 'express';

import config, { SupportedLanguage } from '../../config/index.js';

/**
 * Resolve the language from the request
 * Priority: query param > x-language header > cookie > session > accept-language header > default (de)
 */
export const resolveLanguage = (req: Request): SupportedLanguage => {
  const supportedLanguages = config.i18n.supportedLanguages;
  const defaultLanguage = config.i18n.defaultLanguage;

  // 1. Query parameter (?lang=de)
  const queryLang = req.query.lang as string;
  if (queryLang && supportedLanguages.includes(queryLang as SupportedLanguage)) {
    return queryLang as SupportedLanguage;
  }

  // 2. x-language header
  const xLangHeader = req.headers['x-language'] as string;
  if (xLangHeader && supportedLanguages.includes(xLangHeader as SupportedLanguage)) {
    return xLangHeader as SupportedLanguage;
  }

  // 3. Cookie (preferred_language)
  const cookieLang = req.cookies?.preferred_language as string;
  if (cookieLang && supportedLanguages.includes(cookieLang as SupportedLanguage)) {
    return cookieLang as SupportedLanguage;
  }

  // 4. Session (if available)
  const sessionLang = (req as any).session?.lang as string;
  if (sessionLang && supportedLanguages.includes(sessionLang as SupportedLanguage)) {
    return sessionLang as SupportedLanguage;
  }

  // 5. Accept-Language header
  const acceptLanguage = req.headers['accept-language'];
  if (acceptLanguage) {
    const languages = acceptLanguage
      .split(',')
      .map((lang) => {
        const [code, priority] = lang.trim().split(';q=');
        return {
          code: code.split('-')[0].toLowerCase(),
          priority: priority ? parseFloat(priority) : 1,
        };
      })
      .sort((a, b) => b.priority - a.priority);

    for (const lang of languages) {
      if (supportedLanguages.includes(lang.code as SupportedLanguage)) {
        return lang.code as SupportedLanguage;
      }
    }
  }

  // 6. Default language (de for just-eat.ch — German-speaking Switzerland)
  return defaultLanguage;
};

/**
 * Get localized field from an object with translations
 * Used for inline translation pattern: { en: "Pizza", fr: "Pizza", de: "Pizza", it: "Pizza" }
 */
export const getLocalizedField = <T extends Record<SupportedLanguage, string>>(
  translations: T | undefined,
  language: SupportedLanguage,
  fallbackLanguage: SupportedLanguage = 'de'
): string => {
  if (!translations) {
    return '';
  }

  return translations[language] || translations[fallbackLanguage] || '';
};

/**
 * Validate if a language is supported
 */
export const isValidLanguage = (lang: string): lang is SupportedLanguage => {
  return config.i18n.supportedLanguages.includes(lang as SupportedLanguage);
};

export default { resolveLanguage, getLocalizedField, isValidLanguage };
