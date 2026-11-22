import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import fr from './locales/fr.json';
import en from './locales/en.json';
import it from './locales/it.json';
import de from './locales/de.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import ar from './locales/ar.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      it: { translation: it },
      de: { translation: de },
      es: { translation: es },
      pt: { translation: pt },
      ar: { translation: ar },
    },
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    detection: {
      order: ['localStorage', 'cookie', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage'],
    }
  });

// Set HTML lang attribute and direction on language change
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
});

export default i18n;
