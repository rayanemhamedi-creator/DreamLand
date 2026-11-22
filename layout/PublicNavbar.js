import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ThemeContext } from '../../context/ThemeContext';
import LanguageSelector from './LanguageSelector';

const PublicNavbar = ({ transparent }) => {
    const { theme, toggleTheme } = useContext(ThemeContext);
    const { t } = useTranslation();

    const textColor = transparent ? '#ffffff' : 'var(--text-main)';
    const borderColor = transparent ? 'rgba(255,255,255,0.3)' : 'var(--border-color)';

    return (
        <nav className="landing-nav" style={{ position: transparent ? 'absolute' : 'relative', width: '100%', top: 0, zIndex: 10 }}>
            <Link to="/" className="landing-brand text-decoration-none d-inline-flex align-items-center fw-800" style={{ fontSize: '1.1rem' }}>
                <img src="/logodreamland.png" alt="Logo" style={{ height: '80px', width: 'auto', objectFit: 'contain', marginRight: '-20px', marginLeft: '-30px', position: 'relative', top: '5px' }} />
                <span style={{ color: 'var(--primary)' }}>DreamLand</span>
            </Link>
            <div className="landing-nav-actions d-flex align-items-center gap-3">
                <div style={{ color: textColor }}>
                    <LanguageSelector />
                </div>

                <button
                    onClick={toggleTheme}
                    className={`btn btn-sm rounded-circle p-2 d-flex align-items-center justify-content-center ${transparent ? 'btn-outline-light' : 'btn-outline-secondary'}`}
                    style={{ width: '36px', height: '36px', borderColor: borderColor }}
                    title={theme === 'dark' ? t('navbar.theme_light') : t('navbar.theme_dark')}
                >
                    <i className={`bi ${theme === 'dark' ? 'bi-sun-fill text-warning' : 'bi-moon-fill'}`} style={{ color: theme === 'dark' ? '' : textColor }}></i>
                </button>
            </div>
        </nav>
    );
};

export default PublicNavbar;
