import React, { createContext, useContext, useState, useCallback } from 'react';
import fr from '../locales/fr';
import en from '../locales/en';
import ar from '../locales/ar';

const LOCALES = { fr, en, ar };

const LIGHT_THEME = {
  primary: '#f97316',
  primaryDark: '#ea580c',
  secondary: '#0f172a',
  bgPage: '#f8fafc',
  bgCard: '#ffffff',
  bgHeader: '#0f172a',
  textMain: '#0f172a',
  textMuted: '#64748b',
  textLight: '#f8fafc',
  borderColor: '#e2e8f0',
  inputBg: '#f1f5f9',
  chipActive: '#f97316',
  chipInactive: '#ffffff',
  chipTextActive: '#ffffff',
  chipTextInactive: '#64748b',
  modalBg: '#ffffff',
  loaderBg: '#f8fafc',
  isDark: false,
  shadowSm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  shadowMd: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
};

const DARK_THEME = {
  primary: '#f97316',
  primaryDark: '#ea580c',
  secondary: '#0f172a',
  bgPage: '#0f172a',
  bgCard: '#1e293b',
  bgHeader: '#020617',
  textMain: '#f1f5f9',
  textMuted: '#94a3b8',
  textLight: '#f8fafc',
  borderColor: '#334155',
  inputBg: '#1e293b',
  chipActive: '#f97316',
  chipInactive: '#1e293b',
  chipTextActive: '#ffffff',
  chipTextInactive: '#94a3b8',
  modalBg: '#1e293b',
  loaderBg: '#0f172a',
  isDark: true,
  shadowSm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 2 },
  shadowMd: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 5 },
};

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [lang, setLang] = useState('fr');
  const [isDark, setIsDark] = useState(false);

  const t = LOCALES[lang] || LOCALES.fr;
  const theme = isDark ? DARK_THEME : LIGHT_THEME;
  const isRTL = lang === 'ar';

  const toggleTheme = useCallback(() => setIsDark(d => !d), []);
  const changeLang = useCallback((l) => setLang(l), []);

  return (
    <AppContext.Provider value={{ t, theme, lang, changeLang, isDark, toggleTheme, isRTL }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
