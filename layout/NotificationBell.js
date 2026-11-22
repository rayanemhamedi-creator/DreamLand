import React, { useState, useRef, useEffect } from 'react';
import useNotifications from '../../hooks/useNotifications';
import './NotificationBell.css';

const NotificationBell = ({ userId }) => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications(userId);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="notif-container" ref={dropdownRef}>
            <button 
                className={`notif-bell-btn ${isOpen ? 'active' : ''}`} 
                onClick={() => setIsOpen(!isOpen)}
            >
                <i className="bi bi-bell-fill"></i>
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </button>

            {isOpen && (
                <div className="notif-dropdown">
                    <div className="notif-header">
                        <h6 className="mb-0 fw-800">Notifications</h6>
                        {unreadCount > 0 && (
                            <button className="btn-mark-all" onClick={markAllAsRead}>
                                Tout marquer comme lu
                            </button>
                        )}
                    </div>
                    
                    <div className="notif-list scrollbar-hidden">
                        {notifications.length > 0 ? (
                            notifications.map((notif) => (
                                <div 
                                    key={notif.id} 
                                    className={`notif-item ${!notif.estLu ? 'unread' : ''}`}
                                    onClick={() => !notif.estLu && markAsRead(notif.id)}
                                >
                                    <div className="notif-icon">
                                        <i className="bi bi-megaphone-fill"></i>
                                    </div>
                                    <div className="notif-content">
                                        <p className="notif-msg">{notif.message}</p>
                                        <span className="notif-time">{formatTime(notif.dateCreation)}</span>
                                    </div>
                                    
                                    <button 
                                        className="btn-delete-notif"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteNotification(notif.id);
                                        }}
                                        title="Supprimer"
                                    >
                                        &times;
                                    </button>

                                    {!notif.estLu && <div className="notif-dot"></div>}
                                </div>
                            ))
                        ) : (
                            <div className="notif-empty">
                                <i className="bi bi-bell-slash"></i>
                                <p>Pas de nouvelles notifications</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
