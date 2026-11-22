import React from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageSelector.css';

const languages = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' }
];

const LanguageSelector = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const currentLanguage = languages.find(l => l.code === i18n.language) || languages[0];

  return (
    <div className="dropdown language-selector">
      <button 
        className="btn btn-link dropdown-toggle text-decoration-none d-flex align-items-center gap-2 px-2" 
        type="button" 
        data-bs-toggle="dropdown" 
        aria-expanded="false"
        style={{ color: 'inherit' }}
      >
        <span className="fs-5">{currentLanguage.flag}</span>
        <span className="d-none d-md-inline small fw-600">{currentLanguage.name}</span>
      </button>
      <ul className="dropdown-menu dropdown-menu-end shadow border-0 py-2">
        {languages.map((lang) => (
          <li key={lang.code}>
            <button 
              className={`dropdown-item d-flex align-items-center gap-3 py-2 ${i18n.language === lang.code ? 'active' : ''}`}
              onClick={() => changeLanguage(lang.code)}
            >
              <span className="fs-5">{lang.flag}</span>
              <span className="fw-500">{lang.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LanguageSelector;
