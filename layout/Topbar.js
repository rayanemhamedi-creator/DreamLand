import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import NotificationBell from './NotificationBell';
import LanguageSelector from './LanguageSelector';
import messagerieService from '../../services/messagerieService';
import MessageCenter from '../messagerie/CentreMessagerie';
import './Topbar.css';

const Topbar = () => {
    const { user, logout } = useContext(AuthContext);
    const { theme, toggleTheme } = useContext(ThemeContext);
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [showMessages, setShowMessages] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState(0);

    useEffect(() => {
        if (user) {
            const fetchUnread = async () => {
                try {
                    const count = await messagerieService.getNombreNonLus();
                    setUnreadMessages(count);
                } catch (err) {
                    console.error("Unread fetch failed", err);
                }
            };
            fetchUnread();
            const interval = setInterval(fetchUnread, 10000);
            return () => clearInterval(interval);
        }
    }, [user]);

    if (!user) return null;

    const isTouriste = user.role === 'ROLE_TOURISTE' || user.role === 'TOURISTE';
    const roleLabel = isTouriste ? 'VISITEUR' : user.role?.replace('ROLE_', '');

    return (
        <>
            <header className="dj-topbar shadow-sm">
                <div className="topbar-left d-flex align-items-center">
                    <div className="topbar-logo me-lg-4 me-2 cursor-pointer" onClick={() => navigate(isTouriste ? '/touriste' : '/')}>
                        <span className="fw-800 d-inline-flex align-items-center" style={{ fontSize: '1.1rem' }}>
                            <img src="/logodreamland.png" alt="Logo" style={{ height: '80px', width: 'auto', objectFit: 'contain', marginRight: '-20px', marginLeft: '-30px', position: 'relative', top: '5px' }} />
                            <span style={{ color: 'var(--primary)' }}>DreamLand</span>
                        </span>
                    </div>

                    {isTouriste && (
                        <nav className="topbar-nav d-none d-lg-flex align-items-center gap-2">
                            {/* Explorer as a Primary CTA */}
                            <button 
                                onClick={() => navigate('/touriste')}
                                className={`btn btn-cta-explorer px-4 py-2 rounded-pill fw-800 transition-all shadow-sm ${location.pathname === '/touriste' ? 'active' : ''}`}
                            >
                                <i className="bi bi-compass me-2"></i>
                                {t('navbar.explorer')}
                            </button>

                            {/* Other links as subtle navigation */}
                            <div className="nav-links-separator mx-2"></div>
                            
                            <button 
                                onClick={() => navigate('/touriste/mes-reservations')}
                                className={`nav-link-premium ${location.pathname === '/touriste/mes-reservations' ? 'active' : ''}`}
                            >
                                <i className="bi bi-calendar-check me-2"></i>
                                {t('navbar.reservations')}
                            </button>
                        </nav>
                    )}
                </div>

                <div className="topbar-actions d-flex align-items-center gap-2">
                    <LanguageSelector />

                    <button 
                        onClick={toggleTheme}
                        className="btn topbar-action-btn-clean"
                        title={theme === 'dark' ? t('navbar.theme_light') : t('navbar.theme_dark')}
                    >
                        <i className={`bi ${theme === 'dark' ? 'bi-sun-fill text-warning' : 'bi-moon-fill text-secondary'} fs-5`}></i>
                    </button>

                    {isTouriste && (
                        <button 
                            onClick={() => setShowMessages(true)}
                            className="btn topbar-action-btn-clean position-relative"
                            title={t('navbar.messages')}
                        >
                            <i className="bi bi-chat-dots fs-5"></i>
                            {unreadMessages > 0 && (
                                <span className="notif-badge-mini">
                                    {unreadMessages}
                                </span>
                            )}
                        </button>
                    )}

                    <NotificationBell userId={user.id} />
                    
                    <div className="user-profile-mini cursor-pointer ms-2" onClick={() => isTouriste && navigate('/touriste/profile')}>
                        <div className="user-info d-none d-sm-block">
                            <p className="user-name mb-0">{user.nom || user.email?.split('@')[0]}</p>
                            <span className="user-role">{roleLabel}</span>
                        </div>
                        <div className="user-avatar ms-2">
                            {user.urlImage ? (
                                <img src={user.urlImage} alt="" className="rounded-circle w-100 h-100 object-fit-cover shadow-sm" />
                            ) : (
                                <i className="bi bi-person-circle fs-5 text-white"></i>
                            )}
                        </div>
                    </div>

                    <button 
                        onClick={logout} 
                        className="btn btn-logout-outline ms-3"
                    >
                        <i className="bi bi-box-arrow-right me-md-2"></i>
                        <span className="d-none d-md-inline">{t('navbar.logout')}</span>
                    </button>
                </div>
            </header>

            {showMessages && (
                <MessageCenter 
                    onClose={() => setShowMessages(false)} 
                    initialInterlocutor={null} 
                />
            )}
        </>
    );
};

export default Topbar;
