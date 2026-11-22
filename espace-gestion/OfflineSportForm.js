import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import reservationService from '../../services/reservationService';
import PhoneInput from '../common/PhoneInput';

const OfflineSportForm = ({ providerData, onCancel, onSuccess }) => {
    const [step, setStep] = useState(0);
    const [materiels, setMateriels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [checkingAvail, setCheckingAvail] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [pricing, setPricing] = useState(null);
    const [resForm, setResForm] = useState({
        materielId: '',
        dateSession: '',
        nombrePersonnes: 1,
        personnesParEq: 1,
        nombreMinutes: 60,
        clientNom: '',
        clientPrenom: '',
        clientEmail: '',
        clientTelephone: '',
        prixTotal: 0
    });

    useEffect(() => {
        const loadMateriels = async () => {
            try {
                const res = await api.get(`/sports/${providerData.id}/materiels`);
                setMateriels(res.data.filter(m => m.disponible));
            } catch (err) {
                console.error("Erreur chargement matériels:", err);
            } finally {
                setLoading(false);
            }
        };
        loadMateriels();
    }, [providerData.id]);

    const handleNext = async (e) => {
        e.preventDefault();
        if (!resForm.materielId || !resForm.dateSession) return alert("Veuillez remplir tous les champs.");
        
        setCheckingAvail(true);
        try {
            const persEq = parseInt(resForm.personnesParEq);
            const materielRequis = Math.ceil(resForm.nombrePersonnes / persEq);
            
            const previewReq = {
                sportId: providerData.id,
                materielId: resForm.materielId,
                dateSession: resForm.dateSession + ':00',
                nombreMateriel: materielRequis,
                nombreMinutes: resForm.nombreMinutes,
                nombrePersonnes: resForm.nombrePersonnes
            };
            
            const res = await reservationService.apercuSport(previewReq);
            if (res.data?.success) {
                setPricing(res.data);
                setStep(1);
            } else {
                alert(res.data?.message || "Équipement non disponible.");
            }
        } catch (err) {
            alert("Erreur disponibilité: " + (err.response?.data?.message || err.message));
        } finally {
            setCheckingAvail(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const persEq = parseInt(resForm.personnesParEq);
            const materielRequis = Math.ceil(resForm.nombrePersonnes / persEq);
            
            const payload = {
                ...resForm,
                materielSportId: resForm.materielId,
                sportId: providerData.id,
                dateDebut: resForm.dateSession + ':00',
                nombreMateriel: materielRequis,
                prixTotal: pricing?.prixTotal || 0,
                serviceReserve: `Sport: ${materiels.find(m => m.id.toString() === resForm.materielId.toString())?.nom}`,
                type: 'SPORT'
            };
            await api.post('/reservations/offline', payload);
            onSuccess();
        } catch (err) {
            alert("Erreur: " + (err.response?.data?.message || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    const selectedMat = materiels.find(m => m.id.toString() === resForm.materielId.toString());
    const matchedPrix = selectedMat ? selectedMat.prixParHeure : 0;
    const qtyPersonnes = parseInt(resForm.nombrePersonnes) || 0;
    const persEq = parseInt(resForm.personnesParEq) || 1;
    const materielCalcule = Math.ceil(qtyPersonnes / persEq);
    const calculatedTotal = matchedPrix * (resForm.nombreMinutes / 60) * materielCalcule;
    const maxPersonnes = selectedMat?.quantite ? (selectedMat.quantite * persEq) : undefined;

    if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

    return (
        <div className="offline-sport-form animate-in-y">
            {step === 0 && (
                <form onSubmit={handleNext}>
                    <div className="mb-4">
                        <label className="smaller fw-800 mb-1 d-block text-primary uppercase" style={{ color: '#f97316' }}>Équipement</label>
                        <select className="form-select premium-input-dark" value={resForm.materielId} onChange={e => setResForm({...resForm, materielId: e.target.value})} required>
                            <option value="">Sélectionner...</option>
                            {materiels.map(m => <option key={m.id} value={m.id}>{m.nom} ({m.prixParHeure} DT/h)</option>)}
                        </select>
                    </div>

                    <div className="mb-3">
                        <label className="smaller fw-800 mb-1 d-block text-primary uppercase" style={{ color: '#f97316' }}>Date et Heure</label>
                        <input type="datetime-local" className="form-control premium-input-dark" value={resForm.dateSession} onChange={e => setResForm({...resForm, dateSession: e.target.value})} required />
                    </div>

                    <div className="row g-2 mb-4">
                        <div className="col-6">
                            <label className="smaller fw-800 mb-1 d-block text-primary uppercase" style={{ color: '#f97316' }}>Personnes {maxPersonnes && <span className="text-muted text-lowercase" style={{fontSize: '0.65rem'}}>(Max {maxPersonnes})</span>}</label>
                            <div className="input-group premium-input-dark rounded overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                                <button type="button" className="btn border-0 px-3 text-white" style={{ background: 'rgba(255,255,255,0.05)' }} onClick={() => setResForm({...resForm, nombrePersonnes: Math.max(1, resForm.nombrePersonnes - 1)})} disabled={resForm.nombrePersonnes <= 1}>
                                    <i className="bi bi-dash-lg"></i>
                                </button>
                                <input type="text" className="form-control premium-input-dark text-center border-0 bg-transparent text-white" value={resForm.nombrePersonnes} readOnly />
                                <button type="button" className="btn border-0 px-3 text-white" style={{ background: 'rgba(255,255,255,0.05)' }} onClick={() => setResForm({...resForm, nombrePersonnes: resForm.nombrePersonnes + 1})} disabled={maxPersonnes && resForm.nombrePersonnes >= maxPersonnes}>
                                    <i className="bi bi-plus-lg"></i>
                                </button>
                            </div>
                        </div>
                        <div className="col-6">
                            <label className="smaller fw-800 mb-1 d-block text-primary uppercase" style={{ color: '#f97316' }}>Durée</label>
                            <select className="form-select premium-input-dark" value={resForm.nombreMinutes} onChange={e => setResForm({...resForm, nombreMinutes: parseInt(e.target.value)})} required>
                                <option value={30}>30 min</option>
                                <option value={60}>1 h</option>
                                <option value={90}>1 h 30</option>
                                <option value={120}>2 h</option>
                            </select>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="smaller fw-800 mb-1 d-block text-primary uppercase" style={{ color: '#f97316' }}>Config.</label>
                        <select className="form-select premium-input-dark" value={resForm.personnesParEq} onChange={e => setResForm({...resForm, personnesParEq: parseInt(e.target.value)})}>
                            <option value={1}>1 personne / équipement</option>
                            <option value={2}>2 personnes / équipement</option>
                        </select>
                    </div>

                    <div className="p-3 rounded-4 border mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(249,115,22,0.25)' }}>
                        <div className="d-flex justify-content-between mb-2">
                            <span className="text-muted small fw-700">Équipements requis :</span>
                            <span className="text-white fw-800">{materielCalcule} {selectedMat?.nom}</span>
                        </div>
                        <div className="d-flex justify-content-between border-top border-secondary border-opacity-25 pt-2 mt-2">
                            <span className="text-muted small fw-700">Total estimé :</span>
                            <span className="fw-900 text-primary">{calculatedTotal.toFixed(2)} DT</span>
                        </div>
                    </div>

                    <div className="d-flex gap-3">
                        <button type="button" className="btn rounded-pill px-4 fw-800" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }} onClick={onCancel}>Annuler</button>
                        <button type="submit" className="btn btn-primary rounded-pill px-4 fw-800 py-3 flex-grow-1" style={{ background: '#f97316', border: 'none' }} disabled={checkingAvail}>
                            {checkingAvail ? <span className="spinner-border spinner-border-sm"></span> : "Suivant"}
                        </button>
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
                        <span className="fw-900 fs-3 text-primary" style={{ color: '#f97316' }}>{pricing?.prixTotal !== undefined ? pricing.prixTotal : 0} DT</span>
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

export default OfflineSportForm;
