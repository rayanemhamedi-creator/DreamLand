import React, { useState, useEffect, useRef, useContext } from 'react';
import messagerieService from '../../services/messagerieService';
import { AuthContext } from '../../context/AuthContext';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const MessageCenter = ({ onClose, initialInterlocutor }) => {
    const { user } = useContext(AuthContext);
    const [interlocutors, setInterlocutors] = useState([]);
    const actualInitialUser = initialInterlocutor?.user || (initialInterlocutor?.id ? initialInterlocutor : null);
    const [selectedUser, setSelectedUser] = useState(actualInitialUser || null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const stompClient = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        loadInterlocutors();
        connectWebSocket();
        if (actualInitialUser) {
            setSelectedUser(actualInitialUser);
        }
        return () => {
            if (stompClient.current) stompClient.current.deactivate();
        };
    }, [initialInterlocutor]); // On surveille initialInterlocutor car c'est lui qui change d'objet (timestamp)

    useEffect(() => {
        if (selectedUser) {
            loadConversation(selectedUser.id);
        }
    }, [selectedUser]);

    useEffect(scrollToBottom, [messages]);

    const connectWebSocket = () => {
        const socket = new SockJS('http://localhost:8080/ws');
        stompClient.current = new Client({
            SocketFactory: () => socket,
            onConnect: () => {
                stompClient.current.subscribe(`/topic/messages/user/${user.id}`, (msg) => {
                    const receivedMsg = JSON.parse(msg.body);
                    if (selectedUser && (receivedMsg.expediteur.id === selectedUser.id || receivedMsg.destinataire.id === selectedUser.id)) {
                        setMessages(prev => [...prev, receivedMsg]);
                        messagerieService.marquerCommeLu(receivedMsg.expediteur.id);
                    } else {
                        loadInterlocutors(); // Refresh list to show new message/notification
                    }
                });
            }
        });
        stompClient.current.activate();
    };

    const loadInterlocutors = async () => {
        try {
            let data = await messagerieService.getInterlocuteurs();
            
            // 1. S'assurer que l'admin est présent (si on n'est pas admin)
            const isAdmin = user?.role === 'ROLE_ADMIN' || user?.role === 'ADMIN';
            if (!isAdmin) {
                const admin = await messagerieService.getAdministrateur();
                if (admin && !data.find(u => u.id === admin.id)) {
                    data = [admin, ...data];
                } else if (admin) {
                    // Si l'admin est déjà là, le backend l'a mis en haut, mais on double-check
                    const adminIdx = data.findIndex(u => u.id === admin.id);
                    if (adminIdx > 0) {
                        const adminObj = data.splice(adminIdx, 1)[0];
                        data.unshift(adminObj);
                    }
                }
            }

            // 2. Ajouter l'interlocuteur initial s'il n'est pas déjà présent
            if (actualInitialUser && !data.find(u => u.id === actualInitialUser.id)) {
                // On l'ajoute juste après l'admin si possible, sinon au début
                const isAdminPresent = data.length > 0 && (data[0].role === 'ROLE_ADMIN' || data[0].role === 'ADMIN');
                const insertIdx = isAdminPresent ? 1 : 0;
                data.splice(insertIdx, 0, actualInitialUser);
            }
            
            // 3. Filtrer pour ne jamais s'afficher soi-même
            data = data.filter(u => u.id !== user.id);
            
            setInterlocutors(data);
        } catch (err) {
            console.error("Failed to load interlocutors", err);
        }
    };

    const loadConversation = async (id) => {
        setLoading(true);
        try {
            const data = await messagerieService.getConversation(id);
            setMessages(data);
            await messagerieService.marquerCommeLu(id);
        } catch (err) {
            console.error("Failed to load conversation", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteConversation = async () => {
        if (!selectedUser) return;
        if (window.confirm(`Voulez-vous vraiment supprimer toute la discussion avec ${selectedUser.nom} ?`)) {
            try {
                await messagerieService.supprimerConversation(selectedUser.id);
                setMessages([]);
                loadInterlocutors();
            } catch (err) {
                console.error("Failed to delete conversation", err);
            }
        }
    };

    const handleDeleteMessage = async (msgId) => {
        try {
            await messagerieService.supprimerMessage(msgId);
            setMessages(prev => prev.filter(m => m.id !== msgId));
        } catch (err) {
            console.error("Failed to delete message", err);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedUser) return;

        try {
            const sent = await messagerieService.envoyerMessage(selectedUser.id, newMessage);
            setMessages(prev => [...prev, sent]);
            setNewMessage('');
        } catch (err) {
            console.error("Failed to send message", err);
        }
    };

    return (
        <div className="message-center-overlay">
            <div className="message-center-card border-0 shadow-lg rounded-5 overflow-hidden">
                <div className="row g-0 h-100">
                    {/* Interlocutors List */}
                    <div className="col-4 border-end bg-light d-flex flex-column" style={{ background: '#f8fafc' }}>
                        <div className="p-4 border-bottom bg-white d-flex align-items-center justify-content-between">
                            <h5 className="fw-800 mb-0 text-dark">Messagerie</h5>
                            <div className="bg-primary-subtle text-primary rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '35px', height: '35px' }}>
                                <i className="bi bi-chat-fill"></i>
                            </div>
                        </div>
                        <div className="flex-grow-1 overflow-auto py-2">
                            {interlocutors.length === 0 ? (
                                <div className="p-5 text-center text-muted opacity-50">
                                    <i className="bi bi-chat-dots fs-1 d-block mb-3"></i>
                                    <small className="fw-600">Aucune conversation active</small>
                                </div>
                            ) : (
                                interlocutors.map(u => (
                                    <div 
                                        key={u.id} 
                                        onClick={() => setSelectedUser(u)}
                                        className={`px-4 py-3 cursor-pointer transition-all mx-2 my-1 rounded-4 ${selectedUser?.id === u.id ? 'bg-primary text-white shadow-md' : 'hover-bg-white text-dark'}`}
                                    >
                                        <div className="d-flex align-items-center">
                                            <div className="position-relative">
                                                {u.urlImage && u.urlImage.split(',')[0] ? (
                                                    <img src={u.urlImage.split(',')[0]} alt={u.nom} className="avatar-md rounded-circle border border-2 border-white shadow-sm" />
                                                ) : (
                                                    <div className={`avatar-md ${selectedUser?.id === u.id ? 'bg-white text-primary' : 'bg-primary text-white'} rounded-circle d-flex align-items-center justify-content-center fw-800 shadow-sm`}>
                                                        {u.nom?.[0]}{u.prenom?.[0]}
                                                    </div>
                                                )}
                                                <span className="position-absolute bottom-0 end-0 p-1 bg-success border border-white border-2 rounded-circle"></span>
                                            </div>
                                            <div className="flex-grow-1 overflow-hidden ms-3">
                                                <div className={`fw-800 text-truncate ${selectedUser?.id === u.id ? 'text-white' : 'text-dark'}`}>{u.nom} {u.prenom}</div>
                                                <div className={`small opacity-75 fw-600 ${selectedUser?.id === u.id ? 'text-white' : 'text-primary'}`}>
                                                    {u.role === 'ROLE_ADMIN' || u.role === 'ADMIN' ? 'Support Client' : u.role?.replace('ROLE_', '')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="col-8 d-flex flex-column bg-white">
                        {selectedUser ? (
                            <>
                                <div className="p-4 border-bottom d-flex justify-content-between align-items-center shadow-sm z-index-1 bg-white">
                                    <div className="d-flex align-items-center">
                                        <div className="position-relative me-3">
                                            {selectedUser.urlImage && selectedUser.urlImage.split(',')[0] ? (
                                                <img src={selectedUser.urlImage.split(',')[0]} alt={selectedUser.nom} className="avatar-md rounded-circle shadow-sm" />
                                            ) : (
                                                <div className="avatar-md bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-800 shadow-sm">
                                                    {selectedUser.nom?.[0]}{selectedUser.prenom?.[0]}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h6 className="mb-0 fw-800 text-dark">{selectedUser.nom} {selectedUser.prenom}</h6>
                                            <div className="d-flex align-items-center gap-1">
                                                <span className="bg-success rounded-circle" style={{ width: '8px', height: '8px' }}></span>
                                                <small className="text-muted fw-600">En ligne</small>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-center gap-2">
                                        <button 
                                            onClick={handleDeleteConversation} 
                                            className="btn btn-outline-danger border-0 rounded-circle p-2 d-flex align-items-center justify-content-center transition-all hover-scale" 
                                            title="Supprimer la conversation"
                                            style={{ width: '40px', height: '40px' }}
                                        >
                                            <i className="bi bi-trash3"></i>
                                        </button>
                                        <button onClick={onClose} className="btn btn-light rounded-circle shadow-sm p-2 d-flex align-items-center justify-content-center transition-all hover-scale" style={{ width: '40px', height: '40px' }}>
                                            <i className="bi bi-x-lg fs-5"></i>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-grow-1 p-4 overflow-auto bg-chat-premium">
                                    {loading ? (
                                        <div className="h-100 d-flex align-items-center justify-content-center">
                                            <div className="spinner-border text-primary border-3" style={{ width: '3rem', height: '3rem' }}></div>
                                        </div>
                                    ) : (
                                        messages.map((m, i) => (
                                            <div key={m.id || i} className={`d-flex mb-4 animate-in-y ${m.expediteur.id === user.id ? 'justify-content-end' : 'justify-content-start'}`}>
                                                {m.expediteur.id !== user.id && (
                                                    <div className="me-2 mt-auto">
                                                        {selectedUser.urlImage && selectedUser.urlImage.split(',')[0] ? (
                                                            <img src={selectedUser.urlImage.split(',')[0]} alt="" className="avatar-xs rounded-circle" />
                                                        ) : (
                                                            <div className="avatar-xs bg-light text-primary rounded-circle d-flex align-items-center justify-content-center fw-800 smallest">
                                                                {selectedUser.nom?.[0]}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <div className={`message-bubble p-3 rounded-4 shadow-sm max-w-75 position-relative group ${m.expediteur.id === user.id ? 'bg-primary text-white' : 'bg-white text-dark border'}`}
                                                     style={{ borderTopRightRadius: m.expediteur.id === user.id ? '4px' : '20px', borderTopLeftRadius: m.expediteur.id !== user.id ? '4px' : '20px' }}>
                                                    <div className="message-content fw-500">{m.contenu}</div>
                                                    <div className={`message-time smallest mt-2 fw-700 opacity-50 text-end d-flex align-items-center justify-content-end gap-2`}>
                                                        {new Date(m.dateEnvoi).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    
                                                    {/* Bouton de suppression amélioré */}
                                                    <button 
                                                        className="btn-delete-msg opacity-0 group-hover-opacity-100 transition-all border-0 rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteMessage(m.id); }}
                                                        title="Supprimer ce message"
                                                        style={{ 
                                                            position: 'absolute', 
                                                            top: '-10px', 
                                                            [m.expediteur.id === user.id ? 'left' : 'right']: '-10px',
                                                            width: '26px', 
                                                            height: '26px', 
                                                            backgroundColor: '#fee2e2', 
                                                            color: '#ef4444',
                                                            fontSize: '12px'
                                                        }}
                                                    >
                                                        <i className="bi bi-trash3-fill"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                <div className="p-4 border-top bg-light-subtle">
                                    <form onSubmit={handleSend} className="d-flex gap-2">
                                        <div className="flex-grow-1 position-relative">
                                            <input 
                                                type="text" 
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                placeholder="Écrivez votre message..." 
                                                className="form-control rounded-pill border-0 bg-white px-4 py-3 shadow-sm focus-ring"
                                                style={{ border: '1px solid #e2e8f0 !important' }}
                                            />
                                        </div>
                                        <button type="submit" disabled={!newMessage.trim()} className="btn btn-primary rounded-pill px-4 py-3 d-flex align-items-center justify-content-center shadow-lg transition-all hover-translate-y">
                                            <i className="bi bi-send-fill me-2"></i> Envoyer
                                        </button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="h-100 d-flex flex-column align-items-center justify-content-center text-center p-5 bg-chat-premium">
                                <div className="bg-white p-5 rounded-5 shadow-lg max-w-400 animate-in-y">
                                    <div className="bg-primary-subtle text-primary rounded-circle p-4 d-inline-flex mb-4">
                                        <i className="bi bi-chat-quote-fill display-4"></i>
                                    </div>
                                    <h3 className="fw-800 text-dark mb-3">Vos conversations</h3>
                                    <p className="text-secondary mb-4 lh-lg">Sélectionnez un contact pour démarrer une discussion ou contactez l'assistance.</p>
                                    <button onClick={onClose} className="btn btn-primary rounded-pill px-5 py-3 fw-800 shadow-md">
                                        Fermer la messagerie
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
                .message-center-overlay {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(15, 23, 42, 0.6); z-index: 9999;
                    backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center;
                    font-family: 'Outfit', sans-serif;
                }
                .message-center-card { width: 1000px; height: 700px; background: white; border: 1px solid rgba(255,255,255,0.2); }
                .cursor-pointer { cursor: pointer; }
                .hover-bg-white:hover { background: white !important; transform: translateX(5px); box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
                .bg-chat-premium { 
                    background-color: #f8fafc;
                    background-image: radial-gradient(#cbd5e1 0.5px, transparent 0.5px);
                    background-size: 24px 24px;
                }
                .avatar-md { width: 48px; height: 48px; object-fit: cover; }
                .avatar-sm { width: 40px; height: 40px; object-fit: cover; }
                .avatar-xs { width: 30px; height: 30px; object-fit: cover; }
                .smallest { font-size: 10px; }
                .fw-800 { font-weight: 800; }
                .fw-700 { font-weight: 700; }
                .fw-600 { font-weight: 600; }
                .fw-500 { font-weight: 500; }
                .shadow-md { box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2); }
                .animate-in-y { animation: anim-in-y 0.4s ease-out forwards; }
                @keyframes anim-in-y { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
                .max-w-400 { max-width: 400px; }
                .focus-ring:focus { box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1) !important; outline: none; }
                .hover-scale:hover { transform: scale(1.1); }
                .hover-translate-y:hover { transform: translateY(-3px); }
                .z-index-1 { z-index: 1; }
                .group:hover .group-hover-opacity-100 { opacity: 1 !important; }
                .transition-all { transition: all 0.3s ease; }
                .btn-delete-msg:hover { background-color: #ef4444 !important; color: white !important; transform: scale(1.2); }
            `}</style>
        </div>
    );
};

export default MessageCenter;
