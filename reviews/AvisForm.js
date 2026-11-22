import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import './Avis.css';

const AvisForm = ({ idService, typeService, onAvisSubmitted }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    // States for Star System
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [hasVotedBefore, setHasVotedBefore] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    const user = JSON.parse(localStorage.getItem('user'));
    const isTouriste = user?.role === 'TOURISTE' || user?.role === 'ROLE_TOURISTE';

    // Fetch existing review on component load
    useEffect(() => {
        const fetchExistingAvis = async () => {
            if (!user?.id || !isTouriste) return;
            try {
                const res = await api.get(`/avis/user/${user.id}/service/${typeService}/${idService}`);
                if (res.data && res.data.score !== undefined) {
                    const existingScore = res.data.score;
                    // Normalize if old format (25, 50, 75, 100)
                    const normalized = existingScore > 5 ? Math.round(existingScore / 20) : existingScore;
                    setRating(normalized);
                    setHasVotedBefore(true);
                }
            } catch (err) {
                console.error("Erreur chargement avis existant:", err);
            }
        };
        fetchExistingAvis();
    }, [idService, typeService, user?.id, isTouriste]);

    const handleRating = async (score) => {
        if (!isTouriste) return;
        
        setLoading(true);
        setError(null);
        try {
            await api.post('/avis', {
                idUtilisateur: user.id,
                idService,
                typeService,
                score
            });
            setRating(score);
            setSuccess(true);
            
            if (hasVotedBefore) {
                setAlertMessage("Votre avis a été mis à jour");
            } else {
                setAlertMessage(t('reviews.success') || "Merci pour votre avis !");
            }
            
            setHasVotedBefore(true);
            setIsEditing(false);
            if (onAvisSubmitted) onAvisSubmitted();
        } catch (err) {
            let errorMsg = t('reviews.submit_error') || "Erreur lors de l'enregistrement de l'avis";
            if (err.response?.data) {
                if (typeof err.response.data === 'string') {
                    errorMsg = err.response.data;
                } else if (err.response.data.message) {
                    errorMsg = err.response.data.message;
                } else if (err.response.data.error) {
                    errorMsg = err.response.data.error;
                }
            }
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    if (!isTouriste) return null;

    return (
        <div className="avis-form-container">
            <h4 className="fw-700 h6 text-secondary mb-2">
                {hasVotedBefore ? "Votre avis sur ce service" : (t('reviews.form_title') || "Donner votre note")}
            </h4>

            {success && alertMessage && (
                <div className={hasVotedBefore ? "avis-modified-alert animate-fade-in" : "avis-success animate-fade-in"}>
                    <i className="bi bi-check-circle-fill me-2"></i>
                    {alertMessage}
                </div>
            )}

            {hasVotedBefore && !isEditing ? (
                <div className="rating-stars-container animate-fade-in">
                    <div className="rating-stars">
                        {[...Array(5)].map((_, index) => {
                            const starValue = index + 1;
                            return (
                                <span 
                                    key={starValue} 
                                    className={`star-btn static-star ${starValue <= rating ? 'active' : ''}`}
                                >
                                    <i className={`bi ${starValue <= rating ? 'bi-star-fill' : 'bi-star'}`}></i>
                                </span>
                            );
                        })}
                        <span className="ms-2 fw-800 text-warning" style={{ fontSize: '1.2rem' }}>
                            {rating} / 5
                        </span>
                    </div>
                    <button 
                        onClick={() => {
                            setIsEditing(true);
                            setSuccess(false);
                            setAlertMessage('');
                        }} 
                        className="btn btn-sm btn-outline-primary fw-700 px-3 py-1.5 rounded-pill mt-2 transition-all"
                        style={{ width: 'fit-content' }}
                    >
                        <i className="bi bi-pencil-square me-1"></i> Modifier mon avis
                    </button>
                </div>
            ) : (
                <div className="rating-stars-container">
                    <div className="rating-stars">
                        {[...Array(5)].map((_, index) => {
                            const starValue = index + 1;
                            const isActive = starValue <= (hover || rating);
                            const isHovered = starValue <= hover;

                            return (
                                <button
                                    type="button"
                                    key={starValue}
                                    className={`star-btn ${isActive ? 'active' : ''} ${isHovered ? 'hovered' : ''}`}
                                    onClick={() => handleRating(starValue)}
                                    onMouseEnter={() => setHover(starValue)}
                                    onMouseLeave={() => setHover(0)}
                                    disabled={loading}
                                >
                                    <i className={`bi ${isActive ? 'bi-star-fill' : 'bi-star'}`}></i>
                                </button>
                            );
                        })}
                        { (hover || rating) > 0 && (
                            <span className="ms-2 fw-800 text-warning transition-all" style={{ fontSize: '1.2rem' }}>
                                {hover || rating} / 5
                            </span>
                        )}
                    </div>
                    
                    {isEditing && (
                        <button 
                            onClick={() => {
                                setIsEditing(false);
                                setSuccess(false);
                                setAlertMessage('');
                            }}
                            className="btn btn-sm btn-light border-0 text-muted fw-700 px-3 py-1.5 rounded-pill mt-2 transition-all"
                            style={{ width: 'fit-content', background: '#f1f5f9' }}
                        >
                            Annuler
                        </button>
                    )}
                </div>
            )}

            {error && <div className="text-danger small mt-2 fw-700">{error}</div>}
        </div>
    );
};

export default AvisForm;
