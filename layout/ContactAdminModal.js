import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import './ContactAdminModal.css';

const ContactAdminModal = () => {
    const { user } = useContext(AuthContext);
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState('idle'); // idle, sending, success, error

    useEffect(() => {
        const handleOpen = () => {
            setIsOpen(true);
            if (user) {
                setEmail(user.email);
            }
        };
        window.addEventListener('openContactAdmin', handleOpen);
        return () => window.removeEventListener('openContactAdmin', handleOpen);
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('sending');
        try {
            const token = localStorage.getItem('token');
            if (user && token) {
                // Si l'utilisateur est connecté, on lui envoie un vrai message dans la messagerie avec l'admin
                const adminRes = await axios.get('http://localhost:8080/api/messages/utilisateur-admin', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const adminId = adminRes.data.id;
                
                await axios.post('http://localhost:8080/api/messages/envoyer', {
                    receiverId: adminId,
                    content: message
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                // Si non connecté (guest), on envoie une notification de contact guest
                await axios.post('http://localhost:8080/api/notifications/guest-contact', {
                    email: email,
                    message: message
                });
            }
            setStatus('success');
            setMessage('');
            setTimeout(() => {
                setIsOpen(false);
                setStatus('idle');
            }, 3000);
        } catch (err) {
            console.error(err);
            setStatus('error');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="contact-admin-overlay">
            <div className="contact-admin-card animate-in-y">
                <div className="contact-header">
                    <div className="d-flex align-items-center gap-3">
                        <div className="admin-avatar">
                            <i className="bi bi-person-badge-fill"></i>
                        </div>
                        <div>
                            <h5 className="mb-0 fw-800">Contact Support</h5>
                            <small className="text-success fw-600">
                                <span className="online-dot"></span> Admin en ligne
                            </small>
                        </div>
                    </div>
                    <button className="btn-close-modal" onClick={() => setIsOpen(false)}>
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="contact-body">
                    {status === 'success' ? (
                        <div className="text-center py-5">
                            <div className="success-icon mb-3">
                                <i className="bi bi-check-circle-fill"></i>
                            </div>
                            <h4 className="fw-800 text-white">Message Envoyé !</h4>
                            <p className="text-muted">L'administrateur vous répondra très prochainement.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <p className="small text-white-50 mb-4 lh-lg">
                                Vous avez une question ? Envoyez-nous un message et notre équipe d'administration vous répondra directement.
                            </p>
                            
                            {!user && (
                                <div className="mb-3">
                                    <label className="form-label small fw-700 text-white-50 ms-1 mb-2">VOTRE EMAIL</label>
                                    <input 
                                        type="email" 
                                        className="form-control premium-input"
                                        placeholder="exemple@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            )}

                            <div className="mb-4">
                                <label className="form-label small fw-700 text-white-50 ms-1 mb-2">MESSAGE</label>
                                <textarea 
                                    className="form-control premium-input"
                                    rows="4"
                                    placeholder="Comment pouvons-nous vous aider ?"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    required
                                ></textarea>
                            </div>

                            {status === 'error' && (
                                <div className="alert alert-danger border-0 rounded-4 small py-3 mb-4 bg-danger-subtle text-danger fw-600">
                                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                    Une erreur est survenue. Veuillez réessayer.
                                </div>
                            )}

                            <button 
                                type="submit" 
                                className="btn btn-primary w-100 rounded-pill py-3 fw-800 shadow-md transition-all hover-translate-y"
                                disabled={status === 'sending'}
                            >
                                {status === 'sending' ? (
                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                ) : (
                                    <i className="bi bi-send-fill me-2"></i>
                                )}
                                Envoyer le message
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContactAdminModal;
