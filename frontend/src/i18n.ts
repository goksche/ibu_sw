import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import de from './locales/de.json';
import en from './locales/en.json';
import tr from './locales/tr.json';
import it from './locales/it.json';
import fr from './locales/fr.json';

/** Promise nach init — App erst mounten, wenn react-i18next die Instanz gesetzt hat. */
export const i18nInitPromise = i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: de },
      en: { translation: en },
      tr: { translation: tr },
      it: { translation: it },
      fr: { translation: fr },
    },
    ns: ['translation'],
    defaultNS: 'translation',
    fallbackLng: 'de',
    supportedLngs: ['de', 'en', 'tr', 'it', 'fr'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    // Locale-JSON nutzt flache Keys mit Punkt im Namen ("login.appName"), keine Verschachtelung.
    keySeparator: false,
    interpolation: {
      escapeValue: false,
    },
    react: {
      // Kein <Suspense> um die App — sonst wirft react-i18next bei !ready u.U. eine Promise ohne Boundary.
      useSuspense: false,
    },
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  });

export default i18n;
