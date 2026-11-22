import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import reservationService from '../../services/reservationService';
import PhoneInput from '../common/PhoneInput';

const formatLocalDate = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
};

const OfflineRestaurantForm = ({ providerData, onCancel, onSuccess }) => {
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [availableTables, setAvailableTables] = useState([]);
    const [menus, setMenus] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedMenus, setSelectedMenus] = useState({});

    const [formData, setFormData] = useState({
        clientNom: '',
        clientPrenom: '',
        clientEmail: '',
        clientTelephone: '',
        dateDebut: formatLocalDate(new Date()),
        time: '20:00',
        dureeHeures: 1,
        tableIds: [],
        nombrePersonnes: 2,
        modeConsommation: 'SUR_PLACE',
        lastSessionAccepted: false
    });

    const [pricing, setPricing] = useState({ total: 0 });

    const [lastSessionAccepted, setLastSessionAccepted] = useState(false);

    const heureOuverture = providerData?.heureOuverture || '08:00';
    const heureFermeture = providerData?.heureFermeture || '23:00';

    const isDayClosed = (date) => {
        if (!date || !providerData?.joursOuverture) return false;
        let day = date.getDay(); // 0 (Sun) to 6 (Sat)
        const dayMap = [7, 1, 2, 3, 4, 5, 6];
        const formattedDay = dayMap[day].toString();
        const openDays = providerData.joursOuverture.split(',');
        return !openDays.includes(formattedDay);
    };

    const getAvailableDurations = () => {
        if (!heureFermeture || !formData.time) return [1, 2, 3, 4, 5];
        
        const [hF, mF] = heureFermeture.split(':').map(Number);
        const [hS, mS] = formData.time.split(':').map(Number);
        
        const closingTime = new Date();
        closingTime.setHours(hF, mF, 0, 0);
        
        const startTime = new Date();
        startTime.setHours(hS, mS, 0, 0);
        
        const diffMs = closingTime - startTime;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        
        if (diffMinutes >= 30 && diffMinutes < 60) {
            return [1]; // Last Session
        }

        const maxDuration = Math.min(5, Math.max(1, diffHours));
        return Array.from({ length: maxDuration }, (_, i) => i + 1);
    };

    useEffect(() => {
        if (formData.time) {
            const allowed = getAvailableDurations();
            if (!allowed.includes(formData.dureeHeures)) {
                setFormData(prev => ({ ...prev, dureeHeures: allowed[allowed.length - 1] }));
            }
        }
    }, [formData.time]);

    const getAvailableHours = () => {
        const [hO] = heureOuverture.split(':').map(Number);
        const [hF] = heureFermeture.split(':').map(Number);
        
        const hours = [];
        for (let h = hO; h <= hF; h++) {
            hours.push(h);
        }
        return hours;
    };

    const getAvailableMinutes = (hour) => {
        const [hO, mO] = heureOuverture.split(':').map(Number);
        const [hF, mF] = heureFermeture.split(':').map(Number);
        
        let start = 0;
        if (hour === hO) start = mO;
        
        let end = 59;
        if (hour === hF) end = mF;
        
        const closingTotal = hF * 60 + mF;
        const limitTotal = closingTotal - 30;
        
        const minutes = [];
        for (let m = start; m <= end; m++) {
            if (hour * 60 + m <= limitTotal) {
                minutes.push(m);
            }
        }
        return minutes;
    };

    const isTimeSelectionComplete = () => {
        if (!formData.time) return false;
        if (formData.modeConsommation !== 'SUR_PLACE') return true;
        
        const [hF, mF] = heureFermeture.split(':').map(Number);
        const [hS, mS] = formData.time.split(':').map(Number);
        const diffMin = (hF * 60 + mF) - (hS * 60 + mS);
        
        if (diffMin < 60 && !lastSessionAccepted) return false;
        return true;
    };

    const fetchMenus = useCallback(async () => {
        try {
            const [mRes, cRes] = await Promise.all([
                api.get('/menus/mes-menus'),
                api.get('/menus/categories')
            ]);
            setMenus(mRes.data || []);
            setCategories(cRes.data || []);
        } catch (err) {
            console.error("Erreur menus:", err);
        }
    }, []);

    useEffect(() => {
        fetchMenus();
    }, [fetchMenus]);

    useEffect(() => {
        if (formData.modeConsommation === 'SUR_PLACE' && formData.dateDebut && formData.time) {
            const fetchTables = async () => {
                setLoading(true);
                try {
                    const fullDateTime = `${formData.dateDebut}T${formData.time}:00`;
                    const resp = await reservationService.getTablesDisponibles(providerData.id, fullDateTime);
                    setAvailableTables(resp.data || []);
                    setFormData(prev => ({...prev, tableIds: []}));
                } catch (err) {
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            };
            fetchTables();
        }
    }, [formData.dateDebut, formData.time, formData.modeConsommation, providerData.id]);

    useEffect(() => {
        let total = 0;
        if (formData.modeConsommation === 'SUR_PLACE') {
            const tablesCost = availableTables
                .filter(t => formData.tableIds.includes(t.id))
                .reduce((sum, t) => sum + (t.prix * (formData.dureeHeures / (t.uniteHeures || 1))), 0);
            total += tablesCost;
        }
        const menusCost = Object.entries(selectedMenus).reduce((sum, [id, qty]) => {
            const menu = menus.find(m => m.id.toString() === id.toString());
            return sum + (menu ? menu.prix * qty : 0);
        }, 0);
        total += menusCost;
        setPricing({ total });
    }, [formData, availableTables, menus, selectedMenus]);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const menusArray = menus
                .filter(m => selectedMenus[m.id] > 0)
                .map(m => ({
                    menuId: m.id,
                    nom: m.nom,
                    quantite: selectedMenus[m.id],
                    prix: m.prix
                }));

            const payload = {
                clientNom: formData.clientNom,
                clientPrenom: formData.clientPrenom,
                clientEmail: formData.clientEmail,
                clientTelephone: formData.clientTelephone,
                serviceReserve: providerData?.nomRestaurant || providerData?.nom || "Restaurant",
                dateDebut: `${formData.dateDebut}T${formData.time}:00`,
                dateFin: `${formData.dateDebut}T${formData.time}:00`,
                nombrePersonnes: formData.nombrePersonnes,
                nombreHeures: formData.dureeHeures,
                menusChoisis: menusArray,
                tableIds: formData.modeConsommation === 'SUR_PLACE' ? formData.tableIds : null,
                restaurantId: providerData.id,
                modeConsommation: formData.modeConsommation,
                prixTotal: pricing.total,
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

    const Counter = ({ value, onIncrease, onDecrease, label, sublabel, min = 0, max = 10 }) => (
        <div className="d-flex align-items-center justify-content-between p-3 rounded-4 border mb-2" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
            <div>
                <div className="fw-800 text-white small uppercase" style={{ fontSize: '0.75rem' }}>{label}</div>
                {sublabel && <div className="text-muted smaller" style={{ fontSize: '0.7rem' }}>{sublabel}</div>}
            </div>
            <div className="d-flex align-items-center gap-3 bg-dark bg-opacity-50 rounded-pill p-1 border border-secondary">
                <button type="button" className="btn btn-sm text-white rounded-circle border-0" onClick={onDecrease} disabled={value <= min} style={{ width: '30px', height: '30px', background: 'rgba(255,255,255,0.1)' }}>-</button>
                <span className="fw-900 text-white" style={{ minWidth: '20px', textAlign: 'center' }}>{value}</span>
                <button type="button" className="btn btn-sm text-white rounded-circle border-0" onClick={onIncrease} disabled={value >= max} style={{ width: '30px', height: '30px', background: 'rgba(255,255,255,0.1)' }}>+</button>
            </div>
        </div>
    );

    const minBudget = availableTables.filter(t => formData.tableIds.includes(t.id)).reduce((sum, t) => sum + ((t.budgetMinimal || 0) / (t.uniteHeures || 1)) * formData.dureeHeures, 0);
    const currentMenusCost = Object.entries(selectedMenus).reduce((sum, [id, qty]) => {
        const menu = menus.find(m => m.id.toString() === id.toString());
        return sum + (menu ? menu.prix * qty : 0);
    }, 0);

    return (
        <div className="offline-restaurant-form animate-in-y">
            <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom border-secondary border-opacity-10">
                <h5 className="fw-800 mb-0 text-white">
                    {step === 0 && "Type de Commande"}
                    {step === 1 && "Planification"}
                    {step === 2 && "Tables"}
                    {step === 3 && "Menus"}
                    {step === 4 && "Client"}
                    {step === 5 && "Récapitulatif"}
                </h5>
                <span className="badge rounded-pill bg-secondary bg-opacity-25 px-3">
                    Étape {formData.modeConsommation === 'SUR_PLACE' 
                        ? step + 1 
                        : (step === 0 ? 1 : step === 1 ? 2 : step === 3 ? 3 : step === 4 ? 4 : step === 5 ? 5 : 1)
                    }/{formData.modeConsommation === 'SUR_PLACE' ? 6 : 5}
                </span>
            </div>

            {step === 0 && (
                <div className="animate-in-y">
                    <div className="p-4 rounded-5 border mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}>
                        <label className="smaller fw-800 mb-2 d-block uppercase text-primary" style={{ color: '#f97316' }}>Mode de consommation</label>
                        <select className="form-select premium-input-dark" value={formData.modeConsommation} onChange={e => setFormData({...formData, modeConsommation: e.target.value})}>
                            <option value="SUR_PLACE">Sur Place</option>
                            <option value="A_EMPORTER">À Emporter</option>
                        </select>
                    </div>
                    <button className="btn btn-primary w-100 py-3 rounded-pill fw-800" style={{ background: '#f97316', border: 'none' }} onClick={() => setStep(1)}>SUIVANT</button>
                </div>
            )}

            {step === 1 && (
                <div className="animate-in-y">
                    <div className="p-4 rounded-5 border mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}>
                        <div className="mb-4">
                            <label className="smaller fw-800 mb-2 d-block text-primary" style={{ color: '#f97316' }}>Date de réservation</label>
                            <input type="date" className="form-control premium-input-dark" min={formatLocalDate(new Date())} value={formData.dateDebut} onChange={e => setFormData({...formData, dateDebut: e.target.value})} />
                        </div>

                        <div className="alert bg-primary bg-opacity-10 border-0 rounded-4 p-3 mb-4 d-flex align-items-center" style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)' }}>
                            <div className="text-primary me-3 fs-3 d-flex align-items-center justify-content-center bg-primary bg-opacity-25 rounded-circle" style={{ width: '40px', height: '40px', backgroundColor: 'rgba(249,115,22,0.1)' }}>
                                <i className="bi bi-clock-fill" style={{ color: '#f97316' }}></i>
                            </div>
                            <div>
                                <span className="text-muted small d-block fw-700 text-uppercase letter-spacing-1">Ouvert jusqu'à {heureFermeture}</span>
                                <span className="fw-800 text-white">{formData.modeConsommation === 'SUR_PLACE' ? "Choisissez votre heure d'arrivée" : "Heure de retrait souhaitée"}</span>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="smaller fw-800 mb-2 d-block" style={{ color: '#f97316' }}>
                                Heure de réservation
                            </label>
                            {(() => {
                                const [hF, mF] = heureFermeture.split(':').map(Number);
                                const totalMinClose = hF * 60 + mF - 30;
                                const maxH = Math.floor(totalMinClose / 60).toString().padStart(2, '0');
                                const maxM = (totalMinClose % 60).toString().padStart(2, '0');
                                return (
                                    <input
                                        type="time"
                                        className="form-control premium-input-dark"
                                        min={heureOuverture}
                                        max={`${maxH}:${maxM}`}
                                        value={formData.time}
                                        onChange={e => {
                                            setFormData(prev => ({ ...prev, time: e.target.value }));
                                            setLastSessionAccepted(false);
                                        }}
                                    />
                                );
                            })()}
                        </div>

                        {formData.time && formData.modeConsommation === 'SUR_PLACE' && (() => {
                            const [hF, mF] = heureFermeture.split(':').map(Number);
                            const [hS, mS] = formData.time.split(':').map(Number);
                            const diffMin = (hF * 60 + mF) - (hS * 60 + mS);
                            
                            return (
                                <>
                                    {diffMin < 60 ? (
                                        <div className="alert border-0 rounded-4 p-3 mb-0 animate-in-y" style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.2)' }}>
                                            <div className="form-check d-flex align-items-center gap-2">
                                                <input className="form-check-input mt-0" type="checkbox" id="acceptLastOffline" checked={lastSessionAccepted} onChange={e => setLastSessionAccepted(e.target.checked)} style={{ width: '20px', height: '20px', backgroundColor: lastSessionAccepted ? '#f97316' : 'transparent', borderColor: '#f97316' }} />
                                                <label className="form-check-label small fw-700 text-white" htmlFor="acceptLastOffline">J'accepte de rester {diffMin} min au prix d'une heure.</label>
                                            </div>
                                        </div>
                                    ) : null}
                                </>
                            );
                        })()}
                    </div>
                    {formData.modeConsommation === 'SUR_PLACE' && (() => {
                        const allowedList = getAvailableDurations();
                        const maxDur = allowedList[allowedList.length - 1] || 1;
                        return (
                            <Counter 
                                label="Durée (heures)" 
                                value={formData.dureeHeures} 
                                onIncrease={() => setFormData(prev => ({ ...prev, dureeHeures: Math.min(maxDur, prev.dureeHeures + 1) }))} 
                                onDecrease={() => setFormData(prev => ({ ...prev, dureeHeures: Math.max(1, prev.dureeHeures - 1) }))} 
                                max={maxDur} 
                                min={1} 
                            />
                        );
                    })()}
                    <div className="d-flex gap-3 mt-4">
                        <button className="btn btn-outline-light rounded-pill px-4" onClick={() => setStep(0)}>Retour</button>
                        <button 
                            className="btn btn-primary flex-grow-1 py-3 rounded-pill fw-800" 
                            style={{ background: '#f97316', border: 'none' }} 
                            onClick={() => {
                                if (!formData.dateDebut || !formData.time) {
                                    alert("Veuillez choisir une date et une heure.");
                                    return;
                                }
                                if (isDayClosed(parseLocalDate(formData.dateDebut))) {
                                    alert("Désolé, l'établissement est fermé à cette date.");
                                    return;
                                }
                                {
                                    const [hO, mO] = heureOuverture.split(':').map(Number);
                                    const [hF, mF] = heureFermeture.split(':').map(Number);
                                    const [hS, mS] = formData.time.split(':').map(Number);
                                    const openMin = hO * 60 + mO;
                                    const closeMin = hF * 60 + mF;
                                    const selectedMin = hS * 60 + mS;
                                    if (selectedMin < openMin || selectedMin > closeMin) {
                                        alert(`L'heure choisie (${formData.time}) est en dehors des horaires d'ouverture (${heureOuverture} – ${heureFermeture}).`);
                                        return;
                                    }
                                }
                                if (!isTimeSelectionComplete()) {
                                    alert(`Cet horaire est proche de la fermeture (${heureFermeture}). Veuillez accepter les conditions de fin de session.`);
                                    return;
                                }
                                setStep(formData.modeConsommation === 'SUR_PLACE' ? 2 : 3);
                            }}
                        >
                            SUIVANT
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="animate-in-y">
                    <div className="row g-3 mb-4">
                        {loading ? <div className="text-center py-4"><div className="spinner-border text-primary"></div></div> : availableTables.map(t => (
                            <div key={t.id} className="col-6">
                                <div className={`card border-0 rounded-4 h-100 ${formData.tableIds.includes(t.id) ? 'bg-primary shadow-lg' : 'bg-dark border-secondary'}`} style={{ cursor: 'pointer', opacity: formData.tableIds.includes(t.id) ? 1 : 0.7 }} onClick={() => {
                                    const next = formData.tableIds.includes(t.id) ? formData.tableIds.filter(id => id !== t.id) : [...formData.tableIds, t.id];
                                    setFormData({...formData, tableIds: next});
                                }}>
                                    <div className="card-body p-3 text-center">
                                        <h6 className="fw-bold mb-1 text-white">Table {t.numero}</h6>
                                        <div className="small text-white opacity-75">{t.capacite} places • {t.prix} DT</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="d-flex gap-3">
                        <button className="btn btn-outline-light rounded-pill px-4" onClick={() => setStep(1)}>Retour</button>
                        <button className="btn btn-primary flex-grow-1 py-3 rounded-pill fw-800" style={{ background: '#f97316', border: 'none' }} onClick={() => {
                            if (formData.tableIds.length === 0) return alert("Choisissez au moins une table.");
                            setStep(3);
                        }}>SUIVANT</button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="animate-in-y">
                    {minBudget > 0 && (
                        <div className={`p-3 rounded-4 border mb-4 ${currentMenusCost >= minBudget ? 'bg-success bg-opacity-10 border-success' : 'bg-warning bg-opacity-10 border-warning'}`}>
                            <div className="fw-bold text-white small">Budget minimal : {minBudget} DT</div>
                            <div className="small text-white-50">{currentMenusCost >= minBudget ? "Budget atteint !" : `Encore ${minBudget - currentMenusCost} DT à consommer.`}</div>
                        </div>
                    )}
                    {categories.map(cat => (
                        <div key={cat.id} className="mb-4">
                            <h6 className="fw-800 text-primary mb-2" style={{ color: '#f97316' }}>{cat.nom}</h6>
                            {menus.filter(m => m.category?.id === cat.id).map(menu => (
                                <div key={menu.id} className="d-flex align-items-center justify-content-between p-3 rounded-4 mb-2 border" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)' }}>
                                    <div className="text-white small fw-700">{menu.nom} <span className="text-muted fw-normal">({menu.prix} DT)</span></div>
                                    <div className="d-flex align-items-center gap-2">
                                        <button className="btn btn-sm btn-dark rounded-circle" onClick={() => setSelectedMenus({...selectedMenus, [menu.id]: Math.max(0, (selectedMenus[menu.id] || 0) - 1)})}>-</button>
                                        <span className="text-white fw-900">{selectedMenus[menu.id] || 0}</span>
                                        <button className="btn btn-sm btn-dark rounded-circle" onClick={() => setSelectedMenus({...selectedMenus, [menu.id]: (selectedMenus[menu.id] || 0) + 1})}>+</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                    <div className="d-flex gap-3">
                        <button className="btn btn-outline-light rounded-pill px-4" onClick={() => setStep(formData.modeConsommation === 'SUR_PLACE' ? 2 : 1)}>Retour</button>
                        <button className="btn btn-primary flex-grow-1 py-3 rounded-pill fw-800" style={{ background: '#f97316', border: 'none' }} onClick={() => {
                            const totalItems = Object.values(selectedMenus).reduce((sum, qty) => sum + qty, 0);
                            if (totalItems === 0) return alert("Veuillez sélectionner au moins un produit.");
                            if (currentMenusCost < minBudget) return alert(`Minimum de consommation non atteint (${minBudget} DT).`);
                            setStep(4);
                        }}>SUIVANT</button>
                    </div>
                </div>
            )}

            {step === 4 && (
                <div className="animate-in-y">
                    <div className="row g-3 mb-4">
                        <div className="col-6">
                            <label className="smaller fw-800 mb-1 d-block text-primary">Prénom *</label>
                            <input type="text" className="form-control premium-input-dark" value={formData.clientPrenom} onChange={e => setFormData({...formData, clientPrenom: e.target.value})} />
                        </div>
                        <div className="col-6">
                            <label className="smaller fw-800 mb-1 d-block text-primary">Nom *</label>
                            <input type="text" className="form-control premium-input-dark" value={formData.clientNom} onChange={e => setFormData({...formData, clientNom: e.target.value})} />
                        </div>
                        <div className="col-12">
                            <label className="smaller fw-800 mb-1 d-block text-primary">Téléphone *</label>
                            <PhoneInput
                                className="premium-input-dark"
                                value={formData.clientTelephone}
                                onChange={val => setFormData({...formData, clientTelephone: val})}
                                required
                            />
                        </div>
                    </div>
                    <div className="d-flex gap-3">
                        <button className="btn btn-outline-light rounded-pill px-4" onClick={() => setStep(3)}>Retour</button>
                        <button className="btn btn-primary flex-grow-1 py-3 rounded-pill fw-800" style={{ background: '#f97316', border: 'none' }} onClick={() => {
                            if (!formData.clientNom || !formData.clientPrenom || !formData.clientTelephone) return alert("Remplissez les champs obligatoires.");
                            setStep(5);
                        }}>RÉCAPITULATIF</button>
                    </div>
                </div>
            )}

            {step === 5 && (
                <div className="animate-in-y">
                    <div className="p-4 rounded-5 border border-dashed mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <div className="mb-2 d-flex justify-content-between"><span className="text-muted small">Client:</span><span className="text-white small fw-700">{formData.clientPrenom} {formData.clientNom}</span></div>
                        <div className="mb-2 d-flex justify-content-between"><span className="text-muted small">Horaire:</span><span className="text-white small fw-700">{formData.dateDebut} à {formData.time}</span></div>
                        <div className="mb-2 d-flex justify-content-between"><span className="text-muted small">Mode:</span><span className="text-white small fw-700">{formData.modeConsommation}</span></div>
                        <div className="mt-3 pt-3 border-top border-secondary border-opacity-20 d-flex justify-content-between align-items-center">
                            <span className="fw-900 text-white fs-5">Total:</span>
                            <span className="fw-900 fs-3 text-primary" style={{ color: '#f97316' }}>{pricing.total.toFixed(2)} DT</span>
                        </div>
                    </div>
                    <div className="d-flex gap-3">
                        <button className="btn btn-outline-light rounded-pill px-4" onClick={() => setStep(4)}>Retour</button>
                        <button className="btn btn-primary flex-grow-1 py-3 rounded-pill fw-800" style={{ background: '#f97316', border: 'none' }} onClick={handleSubmit} disabled={submitting}>
                            {submitting ? "ENVOI..." : "CONFIRMER"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OfflineRestaurantForm;
