import { useCallback, useEffect, useMemo, useState } from 'react';
import { supportedLanguages, translations } from '@/lib/translations';

const STORAGE_KEY = 'readynest-language';
const LANGUAGE_CHANGE_EVENT = 'readynest-language-change';

const normalizeLanguage = (value) => {
  const code = value?.toLowerCase().split('-')[0];
  return supportedLanguages.includes(code) ? code : null;
};

const getSavedLanguage = () => {
  try {
    return normalizeLanguage(window.localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    console.warn('Unable to read saved language preference:', error);
    return null;
  }
};

const saveLanguage = (language) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch (error) {
    console.warn('Unable to save language preference:', error);
  }
};

const detectInitialLanguage = () => {
  if (typeof window === 'undefined') return 'en';

  const savedLanguage = getSavedLanguage();
  if (savedLanguage) return savedLanguage;

  const browserLanguage = normalizeLanguage(
    window.navigator?.userLanguage || window.navigator?.language
  );

  return browserLanguage || 'en';
};

const getValueByPath = (source, path) =>
  path.split('.').reduce((value, key) => value?.[key], source);

export const useLanguage = ({ applyDocument = true } = {}) => {
  const [language, setLanguageState] = useState(detectInitialLanguage);

  const setLanguage = useCallback((nextLanguage) => {
    const normalizedLanguage = normalizeLanguage(nextLanguage) || 'en';
    setLanguageState(normalizedLanguage);

    if (typeof window !== 'undefined') {
      saveLanguage(normalizedLanguage);
      let event;
      if (typeof CustomEvent === 'function') {
        event = new CustomEvent(LANGUAGE_CHANGE_EVENT, { detail: normalizedLanguage });
      } else {
        event = new Event(LANGUAGE_CHANGE_EVENT);
        Object.defineProperty(event, 'detail', { value: normalizedLanguage });
      }
      window.dispatchEvent(event);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleLanguageChange = (event) => {
      setLanguageState(normalizeLanguage(event.detail) || 'en');
    };

    window.addEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
    return () => window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
  }, []);

  useEffect(() => {
    if (!applyDocument || typeof document === 'undefined') return;

    document.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = document.dir;
    document.lang = language;
    document.documentElement.lang = language;

    return () => {
      document.dir = 'ltr';
      document.documentElement.dir = 'ltr';
      document.lang = 'en';
      document.documentElement.lang = 'en';
    };
  }, [applyDocument, language]);

  const t = useCallback(
    (path, params) => {
      const value =
        getValueByPath(translations[language], path) ??
        getValueByPath(translations.en, path) ??
        path;

      return typeof value === 'function' ? value(params || {}) : value;
    },
    [language]
  );

  return useMemo(
    () => ({
      language,
      isRtl: language === 'ar',
      setLanguage,
      t,
    }),
    [language, setLanguage, t]
  );
};
