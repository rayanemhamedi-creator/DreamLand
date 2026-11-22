import React, { useState, useContext } from 'react';
import api from '../../services/api';
import { ThemeContext } from '../../context/ThemeContext';

/**
 * OfflineCancelModal - Modal de confirmation d'annulation d'une réservation offline
 * Affiche le montant remboursé selon la logique :
 *  - > 48h : 100% remboursé
 *  - 24h-48h : 50% client / 50% prestataire
 *  - < 24h : 0%
 */
const OfflineCancelModal = ({ reservation, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);

    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';

    const cardBg = isDark ? '#1e293b' : '#ffffff';
    const boxBg = isDark ? '#0f172a' : '#f8fafc';
    const recapBg = isDark ? '#182235' : '#fafafa';
    const textColor = isDark ? '#ffffff' : '#0f172a';
    const subTextColor = isDark ? '#e2e8f0' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';

    if (!reservation) return null;

    // Calcul du remboursement attendu
    const now = new Date();
    const dateDebut = reservation.dateDebut ? new Date(reservation.dateDebut) : null;
    const hoursBefore = dateDebut ? Math.floor((dateDebut - now) / (1000 * 60 * 60)) : 999;
    const total = reservation.prixTotal || 0;

    let refundAmount = 0;
    let providerAmount = 0;
    let refundLabel = '';
    let refundColor = '';

    if (hoursBefore >= 48) {
        refundAmount = total;
        providerAmount = 0;
        refundLabel = '100% remboursé au client';
        refundColor = 'success';
    } else if (hoursBefore >= 24) {
        refundAmount = total * 0.5;
        providerAmount = total * 0.5;
        refundLabel = '50% remboursé au client / 50% pour vous';
        refundColor = 'warning';
    } else {
        refundAmount = 0;
        providerAmount = total;
        refundLabel = 'Aucun remboursement (délai < 24h)';
        refundColor = 'danger';
    }

    const handleCancel = async () => {
        setLoading(true);
        try {
            await api.post(`/reservations/${reservation.id}/annuler-offline`);
            onSuccess();
            onClose();
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data || err.message;
            alert('❌ Erreur : ' + msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" style={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(8px)', position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden" style={{ maxWidth: 480, width: '100%', margin: '0 1rem', background: cardBg }}>
                {/* Header */}
                <div style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', padding: '24px 32px', color: 'white' }} className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-800"><i className="bi bi-x-circle-fill me-2"></i>Annuler la réservation</h5>
                    <button className="btn-close btn-close-white" onClick={onClose}></button>
                </div>

                <div className="p-4" style={{ background: cardBg }}>
                    {/* Info réservation */}
                    <div className="rounded-3 p-3 mb-4" style={{ background: boxBg, border: `1px solid ${borderColor}` }}>
                        <div className="fw-700 mb-1" style={{ color: textColor }}>
                            {reservation.clientNom} {reservation.clientPrenom}
                        </div>
                        <div style={{ color: mutedColor, fontSize: '13px' }}>
                            {reservation.serviceReserve || 'Service non précisé'}
                        </div>
                        {dateDebut && (
                            <div className="small mt-1" style={{ color: mutedColor }}>
                                <i className="bi bi-calendar3 me-1"></i>
                                {dateDebut.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                {' à '}
                                {dateDebut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        )}
                        <div className="fw-800 mt-2" style={{ color: '#f97316' }}>{total.toFixed(2)} DT</div>
                    </div>

                    {/* Timing */}
                    <div className={`alert alert-${refundColor} d-flex align-items-center gap-3 rounded-3 mb-4`}>
                        <i className={`bi bi-${refundColor === 'success' ? 'check-circle-fill' : refundColor === 'warning' ? 'exclamation-triangle-fill' : 'x-circle-fill'} fs-4`}></i>
                        <div>
                            <div className="fw-700">{refundLabel}</div>
                            <div className="small">
                                {hoursBefore >= 48
                                    ? `Plus de 48h avant le service (${hoursBefore}h)`
                                    : hoursBefore >= 24
                                    ? `Entre 24h et 48h avant (${hoursBefore}h)`
                                    : `Moins de 24h avant (${hoursBefore < 0 ? 'passé' : hoursBefore + 'h'})`
                                }
                            </div>
                        </div>
                    </div>

                    {/* Récapitulatif financier */}
                    <div className="rounded-3 p-3 mb-4" style={{ background: recapBg, border: `1px dashed ${borderColor}` }}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="small" style={{ color: mutedColor }}>Montant total</span>
                            <span className="fw-700" style={{ color: textColor }}>{total.toFixed(2)} DT</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="small" style={{ color: mutedColor }}>Remboursé au client</span>
                            <span className={`fw-700 text-${refundColor}`}>{refundAmount.toFixed(2)} DT</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center border-top pt-2 mt-2" style={{ borderColor: borderColor }}>
                            <span className="fw-700 small" style={{ color: textColor }}>Votre gain</span>
                            <span className="fw-800" style={{ color: textColor }}>{providerAmount.toFixed(2)} DT</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="d-flex gap-2">
                        <button className={`btn ${isDark ? 'btn-outline-light' : 'btn-light'} rounded-pill px-4 flex-grow-1 fw-700`} onClick={onClose} disabled={loading}>
                            Garder la réservation
                        </button>
                        <button className="btn btn-danger rounded-pill px-4 flex-grow-1 fw-700 shadow-sm" onClick={handleCancel} disabled={loading}>
                            {loading
                                ? <><span className="spinner-border spinner-border-sm me-2"></span>Annulation...</>
                                : <><i className="bi bi-x-circle-fill me-1"></i>Confirmer l'annulation</>
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OfflineCancelModal;
