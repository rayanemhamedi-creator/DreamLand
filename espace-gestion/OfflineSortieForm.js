import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import evenementService from '../../services/evenementService';
import PhoneInput from '../common/PhoneInput';

const OfflineSortieForm = ({ providerData, onCancel, onSuccess }) => {
    const [step, setStep] = useState(0);
    const [sorties, setSorties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [resForm, setResForm] = useState({
        sortieId: '',
        dateSortie: '',
        nombreTickets: 1,
        clientNom: '',
        clientPrenom: '',
        clientEmail: '',
        clientTelephone: '',
        prixTotal: 0
    });

    useEffect(() => {
        const loadSorties = async () => {
            try {
                const allSorties = await evenementService.getTousLesSorties();
                const now = new Date();
                const guideSorties = allSorties.filter(s => s.guide?.id === providerData.id && new Date(s.dateSortie) > now);
                setSorties(guideSorties);
            } catch (err) {
                console.error("Erreur chargement sorties:", err);
            } finally {
                setLoading(false);
            }
        };
        loadSorties();
    }, [providerData.id]);

    const selectedSortie = sorties.find(s => s.id.toString() === resForm.sortieId.toString());

    const handleNext = (e) => {
        e.preventDefault();
        if (!resForm.sortieId) return alert("Veuillez choisir une sortie.");
        setStep(1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                ...resForm,
                nombrePersonnes: resForm.nombreTickets,
                dateSortie: selectedSortie?.dateSortie,
                prixTotal: (selectedSortie?.prix || 0) * resForm.nombreTickets,
                serviceReserve: `Excursion: ${selectedSortie?.titre}`,
                type: 'GUIDE'
            };
            await api.post('/reservations/offline', payload);
            onSuccess();
        } catch (err) {
            alert("Erreur: " + (err.response?.data?.message || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

    return (
        <div className="offline-sortie-form animate-in-y">
            {step === 0 && (
                <form onSubmit={handleNext}>
                    <div className="mb-4">
                        <label className="smaller fw-800 mb-2 d-block text-primary uppercase" style={{ color: '#f97316' }}>Choisir la sortie</label>
                        <select 
                            className="form-select premium-input-dark" 
                            value={resForm.sortieId} 
                            onChange={e => setResForm({...resForm, sortieId: e.target.value})}
                            required
                        >
                            <option value="">Sélectionner une excursion...</option>
                            {sorties.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.titre} - {new Date(s.dateSortie).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} ({s.prix} DT)
                                </option>
                            ))}
                        </select>
                        {sorties.length === 0 && <div className="text-warning small mt-2 fw-600">Aucune sortie programmée.</div>}
                    </div>

                    <div className="mb-4">
                        <label className="smaller fw-800 mb-2 d-block text-primary uppercase" style={{ color: '#f97316' }}>
                            Nombre de passagers {selectedSortie && <span className="text-muted text-lowercase" style={{fontSize: '0.65rem'}}>(Max {selectedSortie.placesDisponibles})</span>}
                        </label>
                        <div className="input-group premium-input-dark rounded overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                            <button type="button" className="btn border-0 px-3 text-white" style={{ background: 'rgba(255,255,255,0.05)' }} onClick={() => setResForm({...resForm, nombreTickets: Math.max(1, resForm.nombreTickets - 1)})} disabled={resForm.nombreTickets <= 1}>
                                <i className="bi bi-dash-lg"></i>
                            </button>
                            <input type="text" className="form-control premium-input-dark text-center border-0 bg-transparent text-white" value={resForm.nombreTickets} readOnly />
                            <button type="button" className="btn border-0 px-3 text-white" style={{ background: 'rgba(255,255,255,0.05)' }} onClick={() => setResForm({...resForm, nombreTickets: resForm.nombreTickets + 1})} disabled={selectedSortie && resForm.nombreTickets >= selectedSortie.placesDisponibles}>
                                <i className="bi bi-plus-lg"></i>
                            </button>
                        </div>
                    </div>

                    {selectedSortie && (
                        <div className="p-4 rounded-5 border mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}>
                            <div className="d-flex justify-content-between align-items-center">
                                <span className="text-muted small fw-700">Total à payer :</span>
                                <span className="fw-900 fs-3 text-primary" style={{ color: '#f97316' }}>
                                    {(selectedSortie.prix * resForm.nombreTickets).toFixed(2)} DT
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="d-flex gap-3">
                        <button type="button" className="btn rounded-pill px-4 fw-800" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }} onClick={onCancel}>Annuler</button>
                        <button type="submit" className="btn btn-primary rounded-pill px-4 fw-800 py-3 flex-grow-1" style={{ background: '#f97316', border: 'none' }}>Suivant</button>
                    </div>
                </form>
            )}

            {step === 1 && (
                <form onSubmit={handleSubmit}>
                    <div className="p-4 rounded-5 border mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}>
                        <div className="d-flex align-items-center gap-3 mb-4">
                            <div className="p-2 rounded-4 text-white shadow-sm" style={{ backgroundColor: '#f97316' }}><i className="bi bi-person-vcard fs-5"></i></div>
                            <span className="fw-900 text-white fs-5">Coordonnées Client</span>
                        </div>
                        <div className="row g-3">
                            <div className="col-6"><label className="smaller fw-800 mb-1 d-block" style={{ color: '#f97316' }}>Prénom *</label><input type="text" className="form-control premium-input-dark" required value={resForm.clientPrenom} onChange={e => setResForm({...resForm, clientPrenom: e.target.value})} /></div>
                            <div className="col-6"><label className="smaller fw-800 mb-1 d-block" style={{ color: '#f97316' }}>Nom *</label><input type="text" className="form-control premium-input-dark" required value={resForm.clientNom} onChange={e => setResForm({...resForm, clientNom: e.target.value})} /></div>
                            <div className="col-12"><label className="smaller fw-800 mb-1 d-block" style={{ color: '#f97316' }}>Email *</label><input type="email" className="form-control premium-input-dark" required value={resForm.clientEmail} onChange={e => setResForm({...resForm, clientEmail: e.target.value})} /></div>
                            <div className="col-12">
                                <label className="smaller fw-800 mb-1 d-block" style={{ color: '#f97316' }}>Téléphone *</label>
                                <PhoneInput
                                    className="premium-input-dark"
                                    value={resForm.clientTelephone}
                                    onChange={val => setResForm({...resForm, clientTelephone: val})}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                    <div className="p-4 rounded-5 border mb-4 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}>
                        <span className="text-muted small d-block mb-1 fw-700">Total à payer</span>
                        <span className="fw-900 fs-3 text-primary" style={{ color: '#f97316' }}>
                            {(selectedSortie?.prix * resForm.nombreTickets).toFixed(2)} DT
                        </span>
                    </div>

                    <div className="d-flex gap-3">
                        <button type="button" className="btn rounded-pill px-4 fw-800" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }} onClick={() => setStep(0)}>Retour</button>
                        <button type="submit" className="btn btn-primary rounded-pill px-4 fw-800 py-3 flex-grow-1" style={{ background: '#f97316', border: 'none' }} disabled={submitting}>
                            {submitting ? <span className="spinner-border spinner-border-sm"></span> : "Confirmer la réservation"}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default OfflineSortieForm;
