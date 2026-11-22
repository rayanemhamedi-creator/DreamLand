import React, { useState, useEffect, useContext } from 'react';
import './Sidebar.css';
import MessageCenter from '../messagerie/CentreMessagerie';
import messagerieService from '../../services/messagerieService';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';

const Sidebar = ({ title, subtitle, iconClass, navItems, activeSection, onSectionChange, onLogout, initialInterlocutor }) => {
    const { user } = useContext(AuthContext);
    const { theme, toggleTheme } = useContext(ThemeContext);
    const [open, setOpen] = useState(false);
    const [showMessages, setShowMessages] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // L'interlocuteur initial peut être un objet utilisateur simple ou { user, timestamp } pour forcer l'ouverture
    const targetUser = initialInterlocutor?.user || (initialInterlocutor?.id ? initialInterlocutor : null);

    useEffect(() => {
        if (targetUser) {
            setShowMessages(true);
        }
    }, [initialInterlocutor]); // Déclenché à chaque changement d'objet (même si c'est le même utilisateur mais avec un nouveau timestamp)

    useEffect(() => {
        if (user) {
            loadUnreadCount();
            const interval = setInterval(loadUnreadCount, 30000); // Poll every 30s as fallback
            return () => clearInterval(interval);
        }
    }, [user]);

    const loadUnreadCount = async () => {
        try {
            const count = await messagerieService.getNombreNonLus();
            setUnreadCount(count);
        } catch (err) {
            console.error("Unread count error", err);
        }
    };

    const handleNav = (id) => {
        onSectionChange(id);
        setOpen(false);
    };

    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    return (
        <>
            <button className="dj-sidebar-toggle" onClick={() => setOpen(!open)}>
                <i className={open ? 'bi bi-x-lg' : 'bi bi-list'} />
            </button>

            <div className={`dj-sidebar-overlay ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />

            <aside className={`dj-sidebar ${open ? 'open' : ''}`}>
                <div className="dj-sidebar__brand">
                    <div className="dj-sidebar__icon"><i className={`bi ${iconClass}`} /></div>
                    <div className="dj-sidebar__info">
                        <div className="dj-sidebar__title" style={{ color: 'var(--primary)' }}>
                            {typeof title === 'string' && title.includes('DreamLand') ? (
                                <span className="d-flex align-items-center fw-800" style={{ fontSize: '1.1rem' }}>
                                    <img src="/logodreamland.png" alt="Logo" style={{ height: '80px', width: 'auto', objectFit: 'contain', marginRight: '-20px', marginLeft: '-30px', position: 'relative', top: '5px' }} />
                                    <span style={{ color: 'var(--primary)' }}>DreamLand</span>
                                </span>
                            ) : title}
                        </div>
                        <span className="dj-sidebar__sub">{subtitle}</span>
                    </div>
                </div>

                <nav className="dj-sidebar__nav">
                    {navItems.map(item => (
                        <button key={item.id} className={`dj-nav-item ${activeSection === item.id ? 'active' : ''}`} onClick={() => handleNav(item.id)}>
                            <i className={`bi ${item.icon}`} />
                            <span className="flex-grow-1">{item.label}</span>
                            {item.badge > 0 && <span className="dj-nav-badge">{item.badge}</span>}
                        </button>
                    ))}
                    
                    <div className="dj-sidebar__divider my-3 opacity-25"></div>

                    <button className="dj-nav-item" onClick={() => setShowMessages(true)}>
                        <i className="bi bi-chat-dots" />
                        <span className="flex-grow-1">Messages</span>
                        {unreadCount > 0 && <span className="dj-nav-badge bg-danger">{unreadCount}</span>}
                    </button>
                </nav>

                <div className="dj-sidebar__footer">
                    <button className="dj-nav-item mb-2" onClick={toggleTheme}>
                        <i className={`bi ${theme === 'dark' ? 'bi-sun-fill text-warning' : 'bi-moon-fill'}`} />
                        <span className="flex-grow-1">Mode {theme === 'dark' ? 'Clair' : 'Sombre'}</span>
                    </button>
                    <button className="dj-logout-btn" onClick={onLogout}>
                        <i className="bi bi-box-arrow-left" />
                        <span>Déconnexion</span>
                    </button>
                </div>
            </aside>

            {showMessages && (
                <MessageCenter 
                    initialInterlocutor={initialInterlocutor} 
                    onClose={() => { 
                        setShowMessages(false); 
                        loadUnreadCount(); 
                    }} 
                />
            )}
        </>
    );
};

export default Sidebar;
