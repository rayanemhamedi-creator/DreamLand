import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import PhoneInput from '../common/PhoneInput';

const OfflineEvenementForm = ({ providerData, onCancel, onSuccess }) => {
    const [step, setStep] = useState(0);
    const [evenements, setEvenements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [resForm, setResForm] = useState({
        idEvenement: '',
        nombreTickets: 1,
        clientNom: '',
        clientPrenom: '',
        clientEmail: '',
        clientTelephone: ''
    });

    useEffect(() => {
        const loadEvents = async () => {
            try {
                const res = await api.get('/evenements');
                const now = new Date();
                const futureEvents = res.data.filter(e => !e.dateDebut || new Date(e.dateDebut) >= now);
                setEvenements(futureEvents);
            } catch (err) {
                console.error("Erreur chargement événements:", err);
            } finally {
                setLoading(false);
            }
        };
        loadEvents();
    }, [providerData?.id]);

    const selectedEvent = evenements.find(e => e.id.toString() === resForm.idEvenement.toString());

    const handleNext = (e) => {
        e.preventDefault();
        if (!resForm.idEvenement) return alert("Veuillez choisir un événement.");
        setStep(1);
    };

    const handleStep1Submit = (e) => {
        e.preventDefault();
        setStep(2);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                ...resForm,
                evenementId: resForm.idEvenement,
                nombrePersonnes: resForm.nombreTickets,
                prixTotal: (selectedEvent?.prix || 0) * resForm.nombreTickets,
                serviceReserve: `Événement: ${selectedEvent?.titre}`,
                type: 'EVENEMENT',
                isOffline: true
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
        <div className="offline-evenement-form animate-in-y">
            {/* Header Steps Similaire au Online */}
            <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom border-secondary border-opacity-10">
                <h5 className="fw-800 mb-0 text-white d-flex align-items-center gap-2">
                    {step === 0 && <><i className="bi bi-ticket-perforated-fill text-warning"></i> Vos billets</>}
                    {step === 1 && <><i className="bi bi-person-fill text-primary"></i> Vos informations</>}
                    {step === 2 && <><i className="bi bi-check-circle-fill text-success"></i> Récapitulatif</>}
                </h5>
                <span className="badge rounded-pill bg-secondary bg-opacity-25 text-white-50 px-3">Étape {step + 1}/3</span>
            </div>

            {step === 0 && (
                <form onSubmit={handleNext}>
                    <div className="mb-4">
                        <label className="smaller fw-800 mb-2 d-block text-primary uppercase" style={{ color: '#f97316' }}>Choisir l'événement</label>
                        <select 
                            className="form-select premium-input-dark" 
                            value={resForm.idEvenement} 
                            onChange={e => setResForm({...resForm, idEvenement: e.target.value})}
                            required
                        >
                            <option value="">Sélectionner un événement...</option>
                            {evenements.map(e => (
                                <option key={e.id} value={e.id}>
                                    {e.titre} - {new Date(e.dateDebut).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} ({e.prix} DT)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="mb-4">
                        <label className="smaller fw-800 mb-2 d-block text-primary uppercase" style={{ color: '#f97316' }}>
                            Nombre de tickets {selectedEvent && <span className="text-muted text-lowercase" style={{fontSize: '0.65rem'}}>(Max {selectedEvent.placesDisponibles})</span>}
                        </label>
                        <div className="input-group premium-input-dark rounded overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                            <button type="button" className="btn border-0 px-3 text-white" style={{ background: 'rgba(255,255,255,0.05)' }} onClick={() => setResForm({...resForm, nombreTickets: Math.max(1, resForm.nombreTickets - 1)})} disabled={resForm.nombreTickets <= 1}>
                                <i className="bi bi-dash-lg"></i>
                            </button>
                            <input type="text" className="form-control premium-input-dark text-center border-0 bg-transparent text-white" value={resForm.nombreTickets} readOnly />
                            <button type="button" className="btn border-0 px-3 text-white" style={{ background: 'rgba(255,255,255,0.05)' }} onClick={() => setResForm({...resForm, nombreTickets: resForm.nombreTickets + 1})} disabled={selectedEvent && resForm.nombreTickets >= selectedEvent.placesDisponibles}>
                                <i className="bi bi-plus-lg"></i>
                            </button>
                        </div>
                    </div>

                    {selectedEvent && (
                        <div className="p-4 rounded-5 border border-dashed mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="small fw-700 text-muted">Tickets :</span>
                                <span className="fw-800 small badge bg-dark rounded-pill px-2">{resForm.nombreTickets}</span>
                            </div>
                            <div className="d-flex justify-content-between align-items-baseline pt-2 border-top border-secondary border-opacity-25 mt-2">
                                <span className="fw-800 text-white">Total</span>
                                <div className="d-flex align-items-baseline gap-1">
                                    <span className="fw-800 fs-3 text-primary" style={{ color: '#f97316' }}>{(selectedEvent.prix * resForm.nombreTickets).toFixed(2)}</span>
                                    <span className="text-muted fw-700 small">DT</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="d-flex gap-3">
                        <button type="button" className="btn rounded-pill px-4 fw-800" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }} onClick={onCancel}>Annuler</button>
                        <button type="submit" className="btn btn-primary rounded-pill px-4 fw-800 py-3 flex-grow-1 d-flex align-items-center justify-content-center gap-2" style={{ background: '#f97316', border: 'none' }}>
                            CONTINUER <i className="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </form>
            )}

            {step === 1 && (
                <form onSubmit={handleStep1Submit}>
                    <div className="row g-3 mb-4">
                        <div className="col-6">
                            <label className="smaller fw-800 mb-1 d-block" style={{ color: '#f97316' }}>Prénom *</label>
                            <input type="text" className="form-control premium-input-dark" required value={resForm.clientPrenom} onChange={e => setResForm({...resForm, clientPrenom: e.target.value})} />
                        </div>
                        <div className="col-6">
                            <label className="smaller fw-800 mb-1 d-block" style={{ color: '#f97316' }}>Nom *</label>
                            <input type="text" className="form-control premium-input-dark" required value={resForm.clientNom} onChange={e => setResForm({...resForm, clientNom: e.target.value})} />
                        </div>
                        <div className="col-12">
                            <label className="smaller fw-800 mb-1 d-block" style={{ color: '#f97316' }}>Email *</label>
                            <input type="email" className="form-control premium-input-dark" required value={resForm.clientEmail} onChange={e => setResForm({...resForm, clientEmail: e.target.value})} />
                        </div>
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

                    <div className="d-flex gap-3">
                        <button type="button" className="btn rounded-pill px-4 fw-800" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }} onClick={() => setStep(0)}>Retour</button>
                        <button type="submit" className="btn btn-primary rounded-pill px-4 fw-800 py-3 flex-grow-1 d-flex align-items-center justify-content-center gap-2" style={{ background: '#f97316', border: 'none' }}>
                            VOIR LE RÉCAPITULATIF <i className="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </form>
            )}

            {step === 2 && (
                <div className="animate-in-y">
                    <div className="p-4 rounded-5 border border-dashed mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <div className="mb-3 border-bottom border-secondary border-opacity-10 pb-2">
                            <label className="text-muted smaller fw-800 uppercase letter-spacing-1 d-block mb-1">Évènement</label>
                            <div className="fw-700 text-white">{selectedEvent?.titre}</div>
                        </div>
                        <div className="mb-3 border-bottom border-secondary border-opacity-10 pb-2">
                            <label className="text-muted smaller fw-800 uppercase letter-spacing-1 d-block mb-1">Nombre de tickets</label>
                            <div className="fw-700 text-white">{resForm.nombreTickets} place(s)</div>
                        </div>
                        <div className="mb-3 border-bottom border-secondary border-opacity-10 pb-2">
                            <label className="text-muted smaller fw-800 uppercase letter-spacing-1 d-block mb-1">Client</label>
                            <div className="fw-700 text-white">{resForm.clientPrenom} {resForm.clientNom}</div>
                        </div>
                        <div className="d-flex justify-content-between align-items-baseline pt-2">
                            <span className="fw-800 text-muted">Total à payer :</span>
                            <div className="d-flex align-items-baseline gap-1">
                                <span className="fw-800 fs-3 text-primary" style={{ color: '#f97316' }}>{(selectedEvent?.prix * resForm.nombreTickets).toFixed(2)}</span>
                                <span className="text-muted fw-700 small">DT</span>
                            </div>
                        </div>
                    </div>

                    <div className="d-flex gap-3">
                        <button type="button" className="btn rounded-pill px-4 fw-800" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }} onClick={() => setStep(1)}>Retour</button>
                        <button type="button" onClick={handleSubmit} disabled={submitting} className="btn btn-primary rounded-pill px-4 fw-800 py-3 flex-grow-1 d-flex align-items-center justify-content-center gap-2" style={{ background: '#f97316', border: 'none' }}>
                            {submitting ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-check-circle-fill"></i> CONFIRMER LA RÉSERVATION</>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OfflineEvenementForm;
