import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const EditReservationModal = ({ show, onClose, onSuccess, reservation }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        nom: '',
        prenom: '',
        telephone: '',
        adresse: ''
    });

    useEffect(() => {
        if (reservation && show) {
            setFormData({
                nom: reservation.clientNom || reservation.utilisateur?.nom || '',
                prenom: reservation.clientPrenom || reservation.utilisateur?.prenom || '',
                telephone: reservation.clientTelephone || reservation.utilisateur?.telephone || '',
                adresse: reservation.clientAdresse || reservation.utilisateur?.adresse || ''
            });
            setError(null);
        }
    }, [reservation, show]);

    if (!show || !reservation) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await api.put(`/reservations/${reservation.id}/details`, formData);
            setLoading(false);
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error('Erreur lors de la modification', err);
            const errData = err.response?.data;
            const errMsg =
                typeof errData === 'string' ? errData :
                    errData?.message || errData?.error ||
                    'Une erreur est survenue lors de la modification.';
            setError(errMsg);
            setLoading(false);
        }
    };

    return (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                    <div className="modal-header bg-light border-0 p-4">
                        <div className="d-flex align-items-center">
                            <i className="bi bi-pencil-square text-primary fs-3 me-3"></i>
                            <div>
                                <h5 className="modal-title fw-800 text-dark mb-0">Modifier la réservation</h5>
                                <p className="text-muted small mb-0">Mettez à jour les coordonnées du titulaire</p>
                            </div>
                        </div>
                        <button type="button" className="btn-close shadow-none" onClick={onClose}></button>
                    </div>

                    <div className="modal-body p-4">
                        {error && (
                            <div className="alert alert-danger rounded-3 border-0 d-flex align-items-center small fw-600 mb-4">
                                <i className="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
                                {error}
                            </div>
                        )}

                        <div className="alert alert-info rounded-3 border-0 d-flex align-items-center small mb-4">
                            <i className="bi bi-info-circle-fill me-2 fs-4"></i>
                            <div>Le service réservé et la date ne peuvent pas être modifiés. Vous pouvez seulement modifier les informations du participant.</div>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="row g-3">
                                <div className="col-12 col-md-6">
                                    <label className="form-label text-dark fw-700 small mb-1">Nom</label>
                                    <input
                                        type="text"
                                        className="form-control bg-light border-0"
                                        required
                                        value={formData.nom}
                                        onChange={e => setFormData({ ...formData, nom: e.target.value })}
                                    />
                                </div>
                                <div className="col-12 col-md-6">
                                    <label className="form-label text-dark fw-700 small mb-1">Prénom</label>
                                    <input
                                        type="text"
                                        className="form-control bg-light border-0"
                                        required
                                        value={formData.prenom}
                                        onChange={e => setFormData({ ...formData, prenom: e.target.value })}
                                    />
                                </div>
                                <div className="col-12">
                                    <label className="form-label text-dark fw-700 small mb-1">Téléphone De Réservation (8 chiffres)</label>
                                    <input
                                        type="tel"
                                        pattern="[0-9]{8}"
                                        minLength="8"
                                        maxLength="8"
                                        className="form-control bg-light border-0"
                                        value={formData.telephone}
                                        onChange={e => setFormData({ ...formData, telephone: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                                        required
                                    />
                                </div>
                                <div className="col-12">
                                    <label className="form-label text-dark fw-700 small mb-1">Adresse</label>
                                    <input
                                        type="text"
                                        className="form-control bg-light border-0"
                                        value={formData.adresse}
                                        onChange={e => setFormData({ ...formData, adresse: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="d-flex justify-content-end gap-2 mt-4 pt-4 border-top">
                                <button type="button" className="btn btn-light rounded-pill px-4 fw-700" onClick={onClose} disabled={loading}>
                                    Fermer
                                </button>
                                <button type="submit" className="btn btn-primary rounded-pill px-4 fw-800 shadow-sm" disabled={loading}>
                                    {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-save me-2"></i>}
                                    Enregistrer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditReservationModal;
