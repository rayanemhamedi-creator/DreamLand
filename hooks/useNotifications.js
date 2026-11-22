import { useState, useEffect, useCallback, useContext } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const useNotifications = (userId) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const { user } = useContext(AuthContext);

    const [isConnected, setIsConnected] = useState(false);
    
    const fetchNotifications = useCallback(async () => {
        if (!userId) return;
        try {
            const res = await api.get(`/notifications/user/${userId}`);
            let data = res.data;

            // Filtre pour les touristes : seulement films, sorties et évènements
            if (user && (user.role === 'ROLE_TOURISTE' || user.role === 'TOURISTE')) {
                data = data.filter(n => {
                    const msg = n.message.toLowerCase();
                    return msg.includes('film') || msg.includes('sortie') || msg.includes('évènement') || msg.includes('evenement');
                });
            }

            setNotifications(data);
            const unread = data.filter(n => !n.estLu).length;
            setUnreadCount(unread);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        }
    }, [userId, user]);

    const handleNewMessage = useCallback((body) => {
        console.log('📩 New notification received:', body);
        if (body) {
            // Filtre pour les notifications en temps réel (Toasts)
            if (user && (user.role === 'ROLE_TOURISTE' || user.role === 'TOURISTE')) {
                const msg = body.toLowerCase();
                if (!msg.includes('film') && !msg.includes('sortie') && !msg.includes('évènement') && !msg.includes('evenement')) {
                    return; // Ne pas afficher le toast si ce n'est pas un film/sortie/évent
                }
            }

            toast.success(body, {
                duration: 5000,
                position: 'top-right',
                style: {
                    background: '#0f172a',
                    color: '#fff',
                    borderRadius: '12px',
                    fontWeight: '600',
                    border: '1px solid #f97316'
                },
                icon: '🔔'
            });
            
            // Refresh count and list
            fetchNotifications();
        }
    }, [fetchNotifications, user]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!userId || !token) return;

        fetchNotifications();

        const socket = new SockJS('http://localhost:8080/ws');
        const stompClient = new Client({
            webSocketFactory: () => socket,
            connectHeaders: {
                Authorization: `Bearer ${token}`
            },
            reconnectDelay: 5000,
            debug: (str) => {
                // Mute debug in production gracefully
                // console.log('STOMP Debug:', str);
            }
        });

        stompClient.onConnect = (frame) => {
            console.log('✅ Connected to WebSocket');
            setIsConnected(true);

            // Subscribe to global notifications
            stompClient.subscribe('/topic/notifications', (message) => {
                handleNewMessage(message.body);
            });

            // Subscribe to private notifications
            stompClient.subscribe(`/topic/notifications/user/${userId}`, (message) => {
                handleNewMessage(message.body);
            });
        };

        stompClient.onWebSocketClose = () => {
            console.warn('❌ WebSocket connection closed');
            setIsConnected(false);
        };

        stompClient.onStompError = (frame) => {
            console.error('❌ STOMP error:', frame.headers['message']);
            setIsConnected(false);
        };

        stompClient.activate();

        return () => {
            if (stompClient.active) {
                stompClient.deactivate();
                console.log('🔌 WebSocket forcefully disconnected on user logout/unmount');
            }
        };
    }, [userId, fetchNotifications]);

    const markAsRead = async (id) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            fetchNotifications();
        } catch (err) {
            console.error('Error marking as read:', err);
        }
    };

    const markAllAsRead = async () => {
        if (!userId) return;
        try {
            await api.patch(`/notifications/user/${userId}/read-all`);
            fetchNotifications();
        } catch (err) {
            console.error('Error marking all as read:', err);
        }
    };

    const deleteNotification = async (id) => {
        try {
            await api.delete(`/notifications/${id}`);
            fetchNotifications();
        } catch (err) {
            console.error('Error deleting notification:', err);
        }
    };

    return { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, refresh: fetchNotifications };
};

export default useNotifications;
