import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import PhoneInput from '../common/PhoneInput';

const OfflineHotelForm = ({ providerData, onCancel, onSuccess }) => {
    const [step, setStep] = useState(0);
    const [currentRoomIdx, setCurrentRoomIdx] = useState(0);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [options, setOptions] = useState([]);
    const [totalRooms, setTotalRooms] = useState(0);
    const [allRooms, setAllRooms] = useState([]);

    const [formData, setFormData] = useState({
        clientNom: '',
        clientPrenom: '',
        clientEmail: '',
        clientTelephone: '',
        dateDebut: new Date().toISOString().split('T')[0],
        dateFin: new Date(new Date().getTime() + 86400000).toISOString().split('T')[0],
        nombreChambres: 1,
        roomConfigs: [
            { typeId: '', modeReservation: '', adults: 1, enfantsAges: [], singleBeds: 0, doubleBeds: 0, formula: 'RO', companions: [] }
        ]
    });

    const [pricing, setPricing] = useState({ total: 0 });

    const fetchResources = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/chambres');
            const uniqueTypes = [];
            res.data.forEach(c => {
                if (!uniqueTypes.find(t => t.label === c.type)) {
                    uniqueTypes.push({ 
                        id: c.id, 
                        label: c.type, 
                        price: c.prix, 
                        prixAdulte: c.prixParAdulte, 
                        prixLibre: c.prixLibre,
                        prixParEnfant3_10: c.prixParEnfant3_10, 
                        prixParEnfant11_17: c.prixParEnfant11_17, 
                        cap: c.capacite 
                    });
                }
            });
            setAllRooms(res.data);
            setTotalRooms(res.data.length);
            setOptions(uniqueTypes);
        } catch (err) {
            console.error("Erreur chargement chambres:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchResources();
    }, [fetchResources]);

    useEffect(() => {
        setFormData(prev => {
            const currentCount = prev.roomConfigs.length;
            if (currentCount === prev.nombreChambres) return prev;
            if (prev.nombreChambres > currentCount) {
                const extra = Array.from({ length: prev.nombreChambres - currentCount }, () => ({ 
                    typeId: '', adults: 1, enfantsAges: [], singleBeds: 0, doubleBeds: 0, formula: 'RO', companions: [] 
                }));
                return { ...prev, roomConfigs: [...prev.roomConfigs, ...extra] };
            }
            return { ...prev, roomConfigs: prev.roomConfigs.slice(0, prev.nombreChambres) };
        });
    }, [formData.nombreChambres]);

    useEffect(() => {
        let total = 0;
        const start = new Date(formData.dateDebut);
        const end = new Date(formData.dateFin);
        const nights = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

        formData.roomConfigs.forEach(room => {
            const opt = options.find(o => o.id.toString() === room.typeId.toString());
            if (opt) {
                const formuleKeys = { 'RO': 'prixRO', 'BB': 'prixBB', 'HB': 'prixHB', 'FB': 'prixFB', 'SOFT_AI': 'prixSoftAI', 'ALL_INCLUSIVE': 'prixAllInclusive' };
                const extra = providerData?.[formuleKeys[room.formula]] || 0;

                let roomTotal = 0;
                if (room.modeReservation === 'PRIX_LIBRE') {
                    // Mode prix libre : tarif fixe + formule
                    roomTotal = ((parseFloat(opt.prixLibre) || 0) + parseFloat(extra)) * nights;
                } else {
                    // Mode avec voyageurs : 1er adulte = prix de base, supp = prixParAdulte
                    const baseRoomPrice = parseFloat(opt.price) || 0;
                    const adultPrice = parseFloat(opt.prixAdulte) || 0;
                    const adultSuppsPrice = Math.max(0, room.adults - 1) * adultPrice;

                    let totalChildrenPrice = 0;
                    room.enfantsAges.forEach(age => {
                        if (age === '4-10') totalChildrenPrice += adultPrice * 0.5;
                        else if (age === '11-17') totalChildrenPrice += adultPrice; // 100%
                    });

                    roomTotal = (baseRoomPrice + adultSuppsPrice + totalChildrenPrice + parseFloat(extra)) * nights;
                }
                total += roomTotal;
            }
        });
        setPricing({ total });
    }, [formData, options, providerData]);
    const [availStatus, setAvailStatus] = useState(null); // null | 'checking' | 'ok' | 'unavailable'
    const [availMessage, setAvailMessage] = useState('');

    useEffect(() => {
        const currentRoom = formData.roomConfigs[currentRoomIdx];
        if (!currentRoom || !currentRoom.typeId || !formData.dateDebut || !formData.dateFin || !providerData?.id || options.length === 0) {
            setAvailStatus(null);
            setAvailMessage('');
            return;
        }

        // Sécurité supplémentaire : si dates invalides, on ne fait pas d'appel API
        if (new Date(formData.dateFin) <= new Date(formData.dateDebut)) {
            setAvailStatus('unavailable');
            setAvailMessage('Dates invalides (le départ doit être après l\'arrivée)');
            return;
        }

        const timer = setTimeout(async () => {
            setAvailStatus('checking');
            setAvailMessage('');
            try {
                const selectedOpt = options.find(o => o.id.toString() === currentRoom.typeId.toString());
                if (!selectedOpt) {
                    setAvailStatus(null);
                    return;
                }

                const sameTypeCount = formData.roomConfigs.reduce((count, r) => {
                    const rOpt = options.find(o => o.id.toString() === r.typeId.toString());
                    if (rOpt && rOpt.label === selectedOpt.label) return count + 1;
                    return count;
                }, 0);

                const res = await api.post('/reservations/hotel/preview', {
                    hotelId: providerData.id,
                    dateDebut: formData.dateDebut + "T14:00:00",
                    dateFin: formData.dateFin + "T12:00:00",
                    typeChambre: selectedOpt.label,
                    nombreChambres: sameTypeCount,
                    nbLitsSimples: currentRoom.singleBeds || 0,
                    nbLitsDoubles: currentRoom.doubleBeds || 0,
                    nombreAdultes: currentRoom.adults || 1,
                    nombreEnfants: currentRoom.enfantsAges?.length || 0
                });

                if (res.data && res.data.success !== false) {
                    setAvailStatus('ok');
                } else {
                    setAvailStatus('unavailable');
                    setAvailMessage(res.data?.message || `Plus de chambres "${selectedOpt.label}" disponibles pour ces dates.`);
                }
            } catch (err) {
                const msg = err.response?.data?.message || err.message || '';
                setAvailStatus('unavailable');
                setAvailMessage(msg || 'Erreur lors de la vérification de disponibilité.');
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [formData.dateDebut, formData.dateFin, formData.roomConfigs, currentRoomIdx, options, providerData?.id]);

    const updateRoom = (updates) => {
        const currentRoom = formData.roomConfigs[currentRoomIdx];
        const next = [...formData.roomConfigs];
        const updatedRoom = { ...currentRoom, ...updates };

        // Ajuster automatiquement les lits selon la catégorie de chambre
        if (updatedRoom.typeId) {
            const opt = options.find(o => o.id.toString() === updatedRoom.typeId.toString());
            const label = opt ? opt.label.toUpperCase() : '';

            if (label === 'SINGLE') {
                updatedRoom.singleBeds = 1;
                updatedRoom.doubleBeds = 0;
            } else if (label === 'DOUBLE' || label === 'TWIN') {
                const isTwoSimples = (updatedRoom.singleBeds === 2 && updatedRoom.doubleBeds === 0);
                const isOneDouble = (updatedRoom.singleBeds === 0 && updatedRoom.doubleBeds === 1);
                if (!isTwoSimples && !isOneDouble) {
                    // Par défaut : 1 lit double
                    updatedRoom.singleBeds = 0;
                    updatedRoom.doubleBeds = 1;
                }
            } else if (label === 'TRIPLE') {
                const isThreeSimples = (updatedRoom.singleBeds === 3 && updatedRoom.doubleBeds === 0);
                const isOneDoubleOneSimple = (updatedRoom.singleBeds === 1 && updatedRoom.doubleBeds === 1);
                if (!isThreeSimples && !isOneDoubleOneSimple) {
                    // Par défaut : 1 lit double + 1 lit simple
                    updatedRoom.singleBeds = 1;
                    updatedRoom.doubleBeds = 1;
                }
            }
        }

        next[currentRoomIdx] = updatedRoom;
        setFormData({ ...formData, roomConfigs: next });
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setSubmitError(null);
        try {
            const firstRoom = formData.roomConfigs[0];
            const allCompanions = formData.roomConfigs.flatMap((room, rIdx) =>
                (room.companions || [])
                    .filter(c => c && (c.prenom || c.nom))
                    .map(c => ({ chambre: rIdx + 1, prenom: c.prenom, nom: c.nom }))
            );

            const payload = {
                clientNom: formData.clientNom,
                clientPrenom: formData.clientPrenom,
                clientEmail: formData.clientEmail || null,
                clientTelephone: formData.clientTelephone,
                serviceReserve: providerData?.nomHotel || providerData?.nom || "Hôtel",
                dateDebut: `${formData.dateDebut}T14:00:00`,
                dateFin: `${formData.dateFin}T12:00:00`,
                nombrePersonnes: formData.roomConfigs.reduce((acc, r) => acc + (r.modeReservation === 'PRIX_LIBRE' ? 0 : r.adults + r.enfantsAges.length), 0),
                nombreChambres: formData.nombreChambres,
                typeLogement: firstRoom.formula,
                chambreId: parseInt(firstRoom.typeId),
                nbLitsSimples: firstRoom.singleBeds || 0,
                nbLitsDoubles: firstRoom.doubleBeds || 0,
                nombreAdultes: formData.roomConfigs.reduce((acc, r) => acc + (r.modeReservation === 'PRIX_LIBRE' ? 0 : r.adults), 0),
                nombreEnfants: formData.roomConfigs.reduce((acc, r) => acc + (r.modeReservation === 'PRIX_LIBRE' ? 0 : r.enfantsAges.length), 0),
                agesEnfants: formData.roomConfigs.flatMap(r => r.modeReservation === 'PRIX_LIBRE' ? [] : r.enfantsAges),
                listeCompagnons: allCompanions.length > 0 ? JSON.stringify(allCompanions) : null,
                listeProduitsChoisis: JSON.stringify(formData.roomConfigs.map((r, i) => {
                    const opt = options.find(o => o.id.toString() === r.typeId.toString());
                    return {
                        chambre: i + 1,
                        type: opt ? opt.label : '',
                        label: opt ? opt.label : '',
                        logement: r.formula,
                        modeReservation: r.modeReservation || 'AVEC_VOYAGEURS',
                        adultes: r.modeReservation === 'PRIX_LIBRE' ? 0 : r.adults,
                        enfants: r.modeReservation === 'PRIX_LIBRE' ? [] : r.enfantsAges,
                        litsSimples: r.singleBeds || 0,
                        litsDoubles: r.doubleBeds || 0,
                        passagers: r.modeReservation === 'PRIX_LIBRE' ? [] : (r.companions || [])
                    };
                })),
                prixTotal: pricing.total,
                hotelId: providerData?.id,
                isOffline: true,
                // Mode global (AVEC_VOYAGEURS / PRIX_LIBRE / MIXTE)
                modeReservation: (() => {
                    const modes = formData.roomConfigs.map(r => r.modeReservation || 'AVEC_VOYAGEURS');
                    const unique = [...new Set(modes)];
                    return unique.length === 1 ? unique[0] : 'MIXTE';
                })()
            };

            console.log('📤 Payload offline hotel:', payload);
            await api.post('/reservations/offline', payload);
            onSuccess();
        } catch (err) {
            console.error('❌ Erreur soumission réservation hôtel:', err.response?.data || err);
            setSubmitError(err.response?.data?.message || err.response?.data?.error || err.message || 'Une erreur inconnue est survenue.');
        } finally {
            setSubmitting(false);
        }
    };

    const Counter = ({ value, onIncrease, onDecrease, label, sublabel, min = 0, max = 10 }) => (
        <div className="d-flex align-items-center justify-content-between p-3 rounded-4 border mb-2" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
            <div>
                <div className="fw-800 text-white small uppercase" style={{ fontSize: '0.75rem', opacity: 0.9 }}>{label}</div>
                {sublabel && <div className="text-muted smaller fw-600" style={{ fontSize: '0.7rem' }}>{sublabel}</div>}
            </div>
            <div className="d-flex align-items-center gap-3 bg-dark bg-opacity-50 rounded-pill p-1 shadow-sm border border-secondary">
                <button type="button" className="btn btn-sm text-white rounded-circle border-0" onClick={onDecrease} disabled={value <= min} style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.1)' }}><i className="bi bi-dash-lg"></i></button>
                <span className="fw-900 text-white" style={{ minWidth: '25px', textAlign: 'center' }}>{value}</span>
                <button type="button" className="btn btn-sm text-white rounded-circle border-0" onClick={onIncrease} disabled={value >= max} style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.1)' }}><i className="bi bi-plus-lg"></i></button>
            </div>
        </div>
    );

    const currentRoom = formData.roomConfigs[currentRoomIdx];
    const selectedRoomOpt = options.find(o => o.id.toString() === currentRoom?.typeId.toString());
    const maxCapacity = selectedRoomOpt ? selectedRoomOpt.cap : 4;
    const countPayingChildren = currentRoom ? currentRoom.enfantsAges.filter(a => a !== '1-3').length : 0;
    const countBabies = currentRoom ? currentRoom.enfantsAges.filter(a => a === '1-3').length : 0;

    const nights = Math.max(1, Math.ceil((new Date(formData.dateFin) - new Date(formData.dateDebut)) / (1000 * 60 * 60 * 24)));

    const getRoomPricePerNight = () => {
        if (!currentRoom || !currentRoom.typeId) return 0;
        const opt = options.find(o => o.id.toString() === currentRoom.typeId.toString());
        if (!opt) return 0;

        const formuleKeys = { 'RO': 'prixRO', 'BB': 'prixBB', 'HB': 'prixHB', 'FB': 'prixFB', 'SOFT_AI': 'prixSoftAI', 'ALL_INCLUSIVE': 'prixAllInclusive' };
        const extra = providerData?.[formuleKeys[currentRoom.formula]] || 0;

        if (currentRoom.modeReservation === 'PRIX_LIBRE') {
            return (parseFloat(opt.prixLibre) || 0) + parseFloat(extra);
        } else {
            const baseRoomPrice = parseFloat(opt.price) || 0;
            const adultPrice = parseFloat(opt.prixAdulte) || 0;
            const adultSuppsPrice = Math.max(0, currentRoom.adults - 1) * adultPrice;

            let totalChildrenPrice = 0;
            currentRoom.enfantsAges.forEach(age => {
                if (age === '4-10') totalChildrenPrice += adultPrice * 0.5;
                else if (age === '11-17') totalChildrenPrice += adultPrice;
            });

            return baseRoomPrice + adultSuppsPrice + totalChildrenPrice + parseFloat(extra);
        }
    };

    const getRoomPrice = () => {
        return getRoomPricePerNight() * nights;
    };

    return (
        <div className="offline-hotel-form animate-in-y">
            <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom border-secondary border-opacity-10">
                <h5 className="fw-800 mb-0 text-white">
                    {step === 0 && "Dates & Chambres"}
                    {step === 1 && `Chambre ${currentRoomIdx + 1} / ${formData.nombreChambres}`}
                    {step === 2 && "Coordonnées Client"}
                    {step === 3 && "Récapitulatif"}
                </h5>
                <span className="badge rounded-pill bg-secondary bg-opacity-25 px-3">Étape {step + 1}/4</span>
            </div>

            {step === 0 && (
                <div className="animate-in-y">
                    <div className="p-4 rounded-5 border mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}>
                        <div className="row g-3">
                            <div className="col-6">
                                <label className="smaller fw-800 mb-1 d-block text-primary">Arrivée</label>
                                <input 
                                    type="date" 
                                    className="form-control premium-input-dark" 
                                    min={new Date().toISOString().split('T')[0]} 
                                    value={formData.dateDebut} 
                                    onChange={e => {
                                        const newDebut = e.target.value;
                                        setFormData(prev => {
                                            const nextDay = new Date(new Date(newDebut).getTime() + 86400000).toISOString().split('T')[0];
                                            const newFin = (!prev.dateFin || new Date(prev.dateFin) <= new Date(newDebut)) ? nextDay : prev.dateFin;
                                            return { ...prev, dateDebut: newDebut, dateFin: newFin };
                                        });
                                    }} 
                                />
                            </div>
                            <div className="col-6">
                                <label className="smaller fw-800 mb-1 d-block text-primary">Départ</label>
                                <input 
                                    type="date" 
                                    className="form-control premium-input-dark" 
                                    min={new Date(new Date(formData.dateDebut).getTime() + 86400000).toISOString().split('T')[0]} 
                                    value={formData.dateFin} 
                                    onChange={e => setFormData({...formData, dateFin: e.target.value})} 
                                />
                            </div>
                        </div>
                    </div>
                    <Counter 
                        label="Nombre de chambres" 
                        sublabel={`Total disponible: ${totalRooms}`} 
                        value={formData.nombreChambres} 
                        onIncrease={() => setFormData({...formData, nombreChambres: formData.nombreChambres + 1})} 
                        onDecrease={() => setFormData({...formData, nombreChambres: Math.max(1, formData.nombreChambres - 1)})} 
                        max={totalRooms || 10} 
                        min={1} 
                    />
                    <div className="d-flex gap-3 mt-4">
                        <button className="btn rounded-pill px-4 fw-800" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }} onClick={onCancel}>Annuler</button>
                        <button 
                            className="btn btn-primary rounded-pill px-4 fw-800 flex-grow-1 py-3" 
                            style={{ background: '#f97316', border: 'none' }} 
                            onClick={() => {
                                if (new Date(formData.dateFin) <= new Date(formData.dateDebut)) {
                                    alert("La date de départ doit être strictement supérieure à la date d'arrivée.");
                                    return;
                                }
                                setStep(1);
                            }}
                        >
                            SUIVANT
                        </button>
                    </div>
                </div>
            )}

            {step === 1 && (
                <div className="animate-in-y">
                    <select className="form-select premium-input-dark mb-4" value={currentRoom.typeId} onChange={e => {
                        const newTypeId = e.target.value;
                        const opt = options.find(o => o.id.toString() === newTypeId);
                        // Forcer PRIX_LIBRE pour QUADRUPLE, FAMILIALE, SUITE
                        const forcedMode = opt && ['QUADRUPLE', 'FAMILIALE', 'SUITE'].includes(opt.label) ? 'PRIX_LIBRE' : '';
                        updateRoom({ typeId: newTypeId, modeReservation: forcedMode, singleBeds: 0, doubleBeds: 0 });
                    }}>
                        <option value="">Choisir un type de chambre...</option>
                        {options.map(o => <option key={o.id} value={o.id}>{o.label} — Cap. {o.cap} pers.</option>)}
                    </select>

                    {/* Indicateur de disponibilité */}
                    {availStatus === 'checking' && (
                        <div className="d-flex align-items-center gap-2 p-3 rounded-4 mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <span className="spinner-border spinner-border-sm text-warning" style={{ width: '16px', height: '16px' }}></span>
                            <span className="small fw-700 text-white-50">Vérification de la disponibilité...</span>
                        </div>
                    )}
                    {availStatus === 'ok' && (
                        <div className="d-flex align-items-center gap-2 p-3 rounded-4 mb-4 animate-in-y" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                            <i className="bi bi-check-circle-fill text-success fs-5"></i>
                            <span className="small fw-700 text-success">Disponible pour ces dates !</span>
                        </div>
                    )}
                    {availStatus === 'unavailable' && (
                        <div className="d-flex align-items-center gap-2 p-3 rounded-4 mb-4 animate-in-y" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)' }}>
                            <i className="bi bi-x-circle-fill text-danger fs-5"></i>
                            <div>
                                <div className="small fw-800 text-danger">Chambre non disponible pour ces dates</div>
                                {availMessage && <div className="small fw-600 text-white-50 mt-1">{availMessage}</div>}
                            </div>
                        </div>
                    )}

                    {/* Sélecteur de mode — s'affiche après le choix du type */}
                    {currentRoom.typeId && (
                        <div className="mb-4">
                            <div className="smaller fw-800 text-primary mb-2" style={{textTransform:'uppercase', letterSpacing:'0.08em'}}>
                                Mode de tarification
                            </div>
                            {options.find(o => o.id.toString() === currentRoom.typeId) && 
                             ['QUADRUPLE','FAMILIALE','SUITE'].includes(options.find(o => o.id.toString() === currentRoom.typeId)?.label) ? (
                                <div className="p-2 rounded-3 fw-700" style={{background:'rgba(249,115,22,0.15)', color:'#f97316', fontSize:'0.82rem'}}>
                                    🔒 Ce type est en <strong>Prix libre</strong> uniquement.
                                </div>
                            ) : (
                                <div className="d-flex gap-3">
                                    <div 
                                        className={`flex-grow-1 p-3 rounded-4 text-center fw-800 cursor-pointer transition-all ${currentRoom.modeReservation === 'AVEC_VOYAGEURS' ? 'text-white' : 'text-white opacity-50'}`}
                                        style={{ cursor:'pointer', border: currentRoom.modeReservation === 'AVEC_VOYAGEURS' ? '2px solid #60a5fa' : '2px solid rgba(255,255,255,0.15)', background: currentRoom.modeReservation === 'AVEC_VOYAGEURS' ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.04)' }}
                                        onClick={() => updateRoom({ modeReservation: 'AVEC_VOYAGEURS' })}
                                    >
                                        <div style={{fontSize:'1.2rem'}}>&#128101;</div>
                                        <div style={{fontSize:'0.75rem'}}>Avec voyageurs</div>
                                    </div>
                                    <div 
                                        className={`flex-grow-1 p-3 rounded-4 text-center fw-800 cursor-pointer transition-all ${currentRoom.modeReservation === 'PRIX_LIBRE' ? 'text-white' : 'text-white opacity-50'}`}
                                        style={{ cursor:'pointer', border: currentRoom.modeReservation === 'PRIX_LIBRE' ? '2px solid #f59e0b' : '2px solid rgba(255,255,255,0.15)', background: currentRoom.modeReservation === 'PRIX_LIBRE' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.04)' }}
                                        onClick={() => updateRoom({ modeReservation: 'PRIX_LIBRE' })}
                                    >
                                        <div style={{fontSize:'1.2rem'}}>&#127991;</div>
                                        <div style={{fontSize:'0.75rem'}}>Prix libre</div>
                                        {options.find(o => o.id.toString() === currentRoom.typeId)?.prixLibre > 0 && (
                                            <div style={{fontSize:'0.7rem', color:'#f59e0b'}}>{options.find(o => o.id.toString() === currentRoom.typeId)?.prixLibre} DT</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Occupants + Lits — uniquement en mode AVEC_VOYAGEURS */}
                    {currentRoom.typeId && currentRoom.modeReservation === 'AVEC_VOYAGEURS' && (
                        <>
                            <Counter label="Adultes" value={currentRoom.adults} onIncrease={() => updateRoom({ adults: currentRoom.adults + 1 })} onDecrease={() => updateRoom({ adults: Math.max(1, currentRoom.adults - 1) })} max={maxCapacity - countPayingChildren} min={1} />
                            <Counter
                                label="Enfants (4-17 ans)"
                                value={countPayingChildren}
                                onIncrease={() => { const ages = [...currentRoom.enfantsAges, '4-10']; updateRoom({ enfantsAges: ages }); }}
                                onDecrease={() => {
                                    const lastIdx = currentRoom.enfantsAges.reduce((acc, a, i) => a !== '1-3' ? i : acc, -1);
                                    if (lastIdx !== -1) { const ages = currentRoom.enfantsAges.filter((_, i) => i !== lastIdx); updateRoom({ enfantsAges: ages }); }
                                }}
                                max={maxCapacity - currentRoom.adults}
                                min={0}
                            />
                            {/* Bébés 1-3 ans : gratuits, limite selon type de chambre */}
                            {(() => {
                                const typeLabel = selectedRoomOpt ? selectedRoomOpt.label.toUpperCase() : '';
                                const maxBabies = (() => {
                                    switch (typeLabel) {
                                        case 'SINGLE':                           return 1;
                                        case 'DOUBLE': case 'TWIN':             return 2;
                                        case 'TRIPLE':                           return 2;
                                        case 'QUADRUPLE': case 'FAMILIALE':
                                        case 'SUITE':                            return 4;
                                        default:                                 return 2;
                                    }
                                })();
                                const babyLimitReached = countBabies >= maxBabies;
                                return (
                                    <div
                                        className={`d-flex align-items-center justify-content-between p-3 rounded-4 border mb-2 ${babyLimitReached ? 'border-warning' : ''}`}
                                        style={{
                                            backgroundColor: babyLimitReached ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.05)',
                                            borderColor: babyLimitReached ? '#f59e0b' : 'rgba(255,255,255,0.08)'
                                        }}
                                    >
                                        <div>
                                            <div className="fw-800 text-white small" style={{ textTransform: 'uppercase', fontSize: '0.75rem', opacity: 0.9 }}>
                                                Bébés (1-3 ans) — Gratuit
                                            </div>
                                            <div className="fw-600" style={{ fontSize: '0.7rem', color: babyLimitReached ? '#f59e0b' : '#6b7280' }}>
                                                Ne compte pas dans la capacité · Max : {maxBabies} bébé{maxBabies > 1 ? 's' : ''}
                                            </div>
                                            {babyLimitReached && (
                                                <div className="fw-700" style={{ fontSize: '0.68rem', color: '#f59e0b' }}>
                                                    Limite atteinte pour ce type de chambre
                                                </div>
                                            )}
                                        </div>
                                        <div className="d-flex align-items-center gap-3 bg-dark bg-opacity-50 rounded-pill p-1 shadow-sm border border-secondary">
                                            <button
                                                type="button"
                                                className="btn btn-sm text-white rounded-circle border-0"
                                                onClick={() => {
                                                    const lastBabyIdx = currentRoom.enfantsAges.reduce((acc, a, i) => a === '1-3' ? i : acc, -1);
                                                    if (lastBabyIdx !== -1) { const ages = currentRoom.enfantsAges.filter((_, i) => i !== lastBabyIdx); updateRoom({ enfantsAges: ages }); }
                                                }}
                                                disabled={countBabies <= 0}
                                                style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.1)' }}
                                            >
                                                <i className="bi bi-dash-lg"></i>
                                            </button>
                                            <span className="fw-900 text-white" style={{ minWidth: '25px', textAlign: 'center', color: babyLimitReached ? '#f59e0b' : 'white' }}>
                                                {countBabies}
                                            </span>
                                            <button
                                                type="button"
                                                className="btn btn-sm rounded-circle border-0"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (babyLimitReached) return; // Double protection
                                                    const ages = [...currentRoom.enfantsAges, '1-3'];
                                                    updateRoom({ enfantsAges: ages });
                                                }}
                                                disabled={babyLimitReached}
                                                style={{
                                                    width: '32px', height: '32px',
                                                    background: babyLimitReached ? 'rgba(107,114,128,0.3)' : 'rgba(255,255,255,0.1)',
                                                    color: babyLimitReached ? '#6b7280' : 'white',
                                                    cursor: babyLimitReached ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                <i className="bi bi-plus-lg"></i>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}
                            {countPayingChildren > 0 && (
                                <div className="p-3 mb-3 rounded-4 border animate-in-y" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)' }}>
                                    <div className="smaller fw-800 text-muted uppercase mb-2">Âges des enfants (4-17 ans)</div>
                                    <div className="row g-2">
                                        {currentRoom.enfantsAges.map((age, idx) => age === '1-3' ? null : (
                                            <div key={idx} className="col-6">
                                                <select
                                                    className="form-select form-select-sm premium-input-dark"
                                                    value={age}
                                                    onChange={(e) => {
                                                        const nextAges = [...currentRoom.enfantsAges];
                                                        nextAges[idx] = e.target.value;
                                                        updateRoom({ enfantsAges: nextAges });
                                                    }}
                                                    style={{ fontSize: '0.75rem' }}
                                                >
                                                    <option value="4-10">4-10 ans</option>
                                                    <option value="11-17">11-17 ans</option>
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {(() => {
                                const opt = options.find(o => o.id.toString() === currentRoom.typeId.toString());
                                const label = opt ? opt.label.toUpperCase() : '';

                                return (
                                    <div className="mb-3">
                                        <label className="smaller fw-800 text-secondary uppercase mb-2 d-block">Configuration des lits</label>
                                        
                                        {label === 'SINGLE' && (
                                            <div className="p-3 bg-light bg-opacity-5 rounded-4 border text-white fw-700 d-flex align-items-center gap-2" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                                                <i className="bi bi-info-circle text-primary fs-5"></i>
                                                <span>1 Lit Simple (Configuration fixe)</span>
                                            </div>
                                        )}

                                        {(label === 'DOUBLE' || label === 'TWIN') && (
                                            <div className="d-flex flex-column gap-2">
                                                <div 
                                                    className="p-3 rounded-4 border cursor-pointer d-flex align-items-center gap-3 transition-all"
                                                    style={{
                                                        background: (currentRoom.singleBeds === 2 && currentRoom.doubleBeds === 0) ? 'rgba(249, 115, 22, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                                                        borderColor: (currentRoom.singleBeds === 2 && currentRoom.doubleBeds === 0) ? '#f97316' : 'rgba(255, 255, 255, 0.1)',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => updateRoom({ singleBeds: 2, doubleBeds: 0 })}
                                                >
                                                    <input 
                                                        type="radio" 
                                                        name={`beds-offline-${currentRoomIdx}`} 
                                                        checked={currentRoom.singleBeds === 2 && currentRoom.doubleBeds === 0}
                                                        onChange={() => updateRoom({ singleBeds: 2, doubleBeds: 0 })}
                                                        style={{ accentColor: '#f97316', width: '18px', height: '18px', cursor: 'pointer' }}
                                                    />
                                                    <div className="fw-700 text-white">2 Lits Simples</div>
                                                </div>

                                                <div 
                                                    className="p-3 rounded-4 border cursor-pointer d-flex align-items-center gap-3 transition-all"
                                                    style={{
                                                        background: (currentRoom.singleBeds === 0 && currentRoom.doubleBeds === 1) ? 'rgba(249, 115, 22, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                                                        borderColor: (currentRoom.singleBeds === 0 && currentRoom.doubleBeds === 1) ? '#f97316' : 'rgba(255, 255, 255, 0.1)',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => updateRoom({ singleBeds: 0, doubleBeds: 1 })}
                                                >
                                                    <input 
                                                        type="radio" 
                                                        name={`beds-offline-${currentRoomIdx}`} 
                                                        checked={currentRoom.singleBeds === 0 && currentRoom.doubleBeds === 1}
                                                        onChange={() => updateRoom({ singleBeds: 0, doubleBeds: 1 })}
                                                        style={{ accentColor: '#f97316', width: '18px', height: '18px', cursor: 'pointer' }}
                                                    />
                                                    <div className="fw-700 text-white">1 Lit Double</div>
                                                </div>
                                            </div>
                                        )}

                                        {label === 'TRIPLE' && (
                                            <div className="d-flex flex-column gap-2">
                                                <div 
                                                    className="p-3 rounded-4 border cursor-pointer d-flex align-items-center gap-3 transition-all"
                                                    style={{
                                                        background: (currentRoom.singleBeds === 3 && currentRoom.doubleBeds === 0) ? 'rgba(249, 115, 22, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                                                        borderColor: (currentRoom.singleBeds === 3 && currentRoom.doubleBeds === 0) ? '#f97316' : 'rgba(255, 255, 255, 0.1)',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => updateRoom({ singleBeds: 3, doubleBeds: 0 })}
                                                >
                                                    <input 
                                                        type="radio" 
                                                        name={`beds-offline-${currentRoomIdx}`} 
                                                        checked={currentRoom.singleBeds === 3 && currentRoom.doubleBeds === 0}
                                                        onChange={() => updateRoom({ singleBeds: 3, doubleBeds: 0 })}
                                                        style={{ accentColor: '#f97316', width: '18px', height: '18px', cursor: 'pointer' }}
                                                    />
                                                    <div className="fw-700 text-white">3 Lits Simples</div>
                                                </div>

                                                <div 
                                                    className="p-3 rounded-4 border cursor-pointer d-flex align-items-center gap-3 transition-all"
                                                    style={{
                                                        background: (currentRoom.singleBeds === 1 && currentRoom.doubleBeds === 1) ? 'rgba(249, 115, 22, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                                                        borderColor: (currentRoom.singleBeds === 1 && currentRoom.doubleBeds === 1) ? '#f97316' : 'rgba(255, 255, 255, 0.1)',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => updateRoom({ singleBeds: 1, doubleBeds: 1 })}
                                                >
                                                    <input 
                                                        type="radio" 
                                                        name={`beds-offline-${currentRoomIdx}`} 
                                                        checked={currentRoom.singleBeds === 1 && currentRoom.doubleBeds === 1}
                                                        onChange={() => updateRoom({ singleBeds: 1, doubleBeds: 1 })}
                                                        style={{ accentColor: '#f97316', width: '18px', height: '18px', cursor: 'pointer' }}
                                                    />
                                                    <div className="fw-700 text-white">1 Lit Double + 1 Lit Simple</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                        </>
                    )}

                    {/* Formule repas — visible dès qu'un mode est choisi */}
                    {currentRoom.typeId && currentRoom.modeReservation && (
                        <div className="mb-3">
                            <label className="smaller fw-800 mb-2 d-block text-primary">Formule Repas</label>
                            <select className="form-select premium-input-dark" value={currentRoom.formula} onChange={e => updateRoom({ formula: e.target.value })}>
                                <option value="RO">Logement Seul (RO)</option>
                                <option value="BB">Petit Déjeuner (BB)</option>
                                <option value="HB">Demi-pension (HB)</option>
                                <option value="FB">Pension Complète (FB)</option>
                                <option value="SOFT_AI">Soft All-Inclusive</option>
                                <option value="ALL_INCLUSIVE">All Inclusive</option>
                            </select>
                        </div>
                    )}

                    {/* Affichage dynamique du prix de la chambre courante */}
                    {currentRoom.typeId && currentRoom.modeReservation && (
                        <div className="p-3 mb-4 rounded-4 border animate-in-y" style={{ backgroundColor: 'rgba(249,115,22,0.06)', borderColor: 'rgba(249,115,22,0.15)' }}>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <span className="small fw-700 text-white-50 d-block">Prix estimé pour cette chambre ({nights} Nuit{nights > 1 ? 's' : ''})</span>
                                    <small className="text-muted fw-600" style={{ fontSize: '0.72rem' }}>
                                        {currentRoom.modeReservation === 'PRIX_LIBRE' ? (
                                            <>Tarif fixe par nuit : {getRoomPricePerNight().toFixed(2)} DT</>
                                        ) : (
                                            <>Tarif par nuit : {getRoomPricePerNight().toFixed(2)} DT (voyageurs + formule)</>
                                        )}
                                    </small>
                                </div>
                                <div className="text-end">
                                    <span className="fs-3 fw-900" style={{ color: '#f97316' }}>{getRoomPrice().toFixed(2)} DT</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="d-flex gap-3">
                        <button className="btn rounded-pill px-4 fw-800" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }} onClick={() => currentRoomIdx > 0 ? setCurrentRoomIdx(currentRoomIdx - 1) : setStep(0)}>Retour</button>
                        <button 
                            className="btn btn-primary rounded-pill px-4 fw-800 flex-grow-1 py-3" 
                            style={{ 
                                background: (availStatus === 'unavailable' || availStatus === 'checking') ? '#4b5563' : '#f97316', 
                                color: (availStatus === 'unavailable' || availStatus === 'checking') ? '#9ca3af' : 'white', 
                                border: 'none',
                                cursor: (availStatus === 'unavailable' || availStatus === 'checking') ? 'not-allowed' : 'pointer'
                            }} 
                            disabled={availStatus === 'unavailable' || availStatus === 'checking'}
                            onClick={() => {
                                if (!currentRoom.typeId) return alert("Choisissez un type de chambre.");
                                if (!currentRoom.modeReservation) return alert("Choisissez un mode de tarification.");
                                if (currentRoom.modeReservation === 'AVEC_VOYAGEURS') {
                                    const totalOccupants = currentRoom.adults + countPayingChildren;
                                    const totalBedPlaces = currentRoom.singleBeds + (currentRoom.doubleBeds * 2);
                                    if (totalBedPlaces < totalOccupants) return alert(`Configuration des lits (${totalBedPlaces} places) insuffisante pour ${totalOccupants} personnes.`);
                                }
                                if (currentRoomIdx < formData.nombreChambres - 1) setCurrentRoomIdx(currentRoomIdx + 1);
                                else setStep(2);
                            }}
                        >
                            {availStatus === 'checking' ? 'Vérification...' : (currentRoomIdx < formData.nombreChambres - 1 ? "CHAMBRE SUIVANTE" : "CONTINUER")}
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="animate-in-y">
                    <div className="row g-3 mb-4">
                        <div className="col-6">
                            <label className="smaller fw-800 mb-1 d-block text-primary">Prénom Contact *</label>
                            <input type="text" className="form-control premium-input-dark" value={formData.clientPrenom} onChange={e => setFormData({...formData, clientPrenom: e.target.value})} />
                        </div>
                        <div className="col-6">
                            <label className="smaller fw-800 mb-1 d-block text-primary">Nom Contact *</label>
                            <input type="text" className="form-control premium-input-dark" value={formData.clientNom} onChange={e => setFormData({...formData, clientNom: e.target.value})} />
                        </div>
                        <div className="col-12">
                            <label className="smaller fw-800 mb-1 d-block text-primary">Email</label>
                            <input type="email" className="form-control premium-input-dark" value={formData.clientEmail} onChange={e => setFormData({...formData, clientEmail: e.target.value})} />
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

                    {/* Accompagnateurs (Adultes supplémentaires) */}
                    {formData.roomConfigs.map((room, rIdx) => (
                        room.adults > 1 && (
                            <div key={rIdx} className="p-4 rounded-5 border mb-4 animate-in-y" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}>
                                <div className="fw-900 text-white mb-3 small uppercase text-primary">Chambre {rIdx + 1} — Adultes suppl.</div>
                                {Array.from({ length: room.adults - 1 }).map((_, aIdx) => {
                                    const comp = (room.companions || [])[aIdx] || { prenom: '', nom: '' };
                                    return (
                                        <div key={aIdx} className="row g-2 mb-2">
                                            <div className="col-6">
                                                <input type="text" placeholder="Prénom" className="form-control form-control-sm premium-input-dark" value={comp.prenom} onChange={e => {
                                                    const next = [...formData.roomConfigs];
                                                    const comps = [...(next[rIdx].companions || [])];
                                                    comps[aIdx] = { ...comp, prenom: e.target.value };
                                                    next[rIdx].companions = comps;
                                                    setFormData({...formData, roomConfigs: next});
                                                }} />
                                            </div>
                                            <div className="col-6">
                                                <input type="text" placeholder="Nom" className="form-control form-control-sm premium-input-dark" value={comp.nom} onChange={e => {
                                                    const next = [...formData.roomConfigs];
                                                    const comps = [...(next[rIdx].companions || [])];
                                                    comps[aIdx] = { ...comp, nom: e.target.value };
                                                    next[rIdx].companions = comps;
                                                    setFormData({...formData, roomConfigs: next});
                                                }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ))}
                    <div className="d-flex gap-3">
                        <button className="btn rounded-pill px-4 fw-800" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }} onClick={() => setStep(1)}>Retour</button>
                        <button className="btn btn-primary rounded-pill px-4 fw-800 flex-grow-1 py-3" style={{ background: '#f97316', border: 'none' }} onClick={() => {
                            if (!formData.clientNom || !formData.clientPrenom || !formData.clientTelephone) return alert("Remplissez les champs obligatoires.");
                            setStep(3);
                        }}>RÉCAPITULATIF</button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="animate-in-y">
                    <div className="p-4 rounded-5 border border-dashed mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <div className="mb-3 d-flex justify-content-between border-bottom border-secondary border-opacity-10 pb-2">
                            <span className="text-muted small">Client:</span>
                            <span className="fw-700 text-white small">{formData.clientPrenom} {formData.clientNom}</span>
                        </div>
                        <div className="mb-3 d-flex justify-content-between border-bottom border-secondary border-opacity-10 pb-2">
                            <span className="text-muted small">Dates:</span>
                            <span className="fw-700 text-white small">{formData.dateDebut} au {formData.dateFin}</span>
                        </div>
                        
                        <div className="mt-3 mb-2 small fw-800 text-primary uppercase">Détail des coûts</div>
                        {formData.roomConfigs.map((room, idx) => {
                            const opt = options.find(o => o.id.toString() === room.typeId.toString());
                            if (!opt) return null;
                            const adultPrice = parseFloat(opt.prixAdulte) || 0;
                            const formuleKeys = { 'RO': 'prixRO', 'BB': 'prixBB', 'HB': 'prixHB', 'FB': 'prixFB', 'SOFT_AI': 'prixSoftAI', 'ALL_INCLUSIVE': 'prixAllInclusive' };
                            const extra = providerData?.[formuleKeys[room.formula]] || 0;
                            const start = new Date(formData.dateDebut);
                            const end = new Date(formData.dateFin);
                            const nights = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

                            return (
                                <div key={idx} className="mb-3 p-3 rounded-4 bg-dark bg-opacity-50">
                                    <div className="fw-700 text-white small mb-2 border-bottom border-secondary border-opacity-20 pb-1">Chambre {idx + 1} ({opt.label})</div>
                                    <div className="d-flex justify-content-between smaller mb-1"><span className="text-muted">Prix chambre</span><span className="text-white">{opt.price} DT</span></div>
                                    {room.adults > 1 && <div className="d-flex justify-content-between smaller mb-1"><span className="text-muted">Supp. Adultes ({room.adults-1})</span><span className="text-white">{(room.adults-1) * adultPrice} DT</span></div>}
                                    {room.enfantsAges.length > 0 && <div className="d-flex justify-content-between smaller mb-1"><span className="text-muted">Enfants ({room.enfantsAges.length})</span><span className="text-white">{room.enfantsAges.length > 0 ? "Inclus dans total" : "0 DT"}</span></div>}
                                    <div className="d-flex justify-content-between smaller mb-1"><span className="text-muted">Formule ({room.formula})</span><span className="text-white">{extra} DT</span></div>
                                    <div className="d-flex justify-content-between smaller fw-800 mt-2 text-primary pt-1 border-top border-secondary border-opacity-10"><span>Sous-total ({nights} nuits)</span><span>{((parseFloat(opt.price) + ((room.adults-1) * adultPrice) + parseFloat(extra)) * nights).toFixed(2)} DT</span></div>
                                </div>
                            );
                        })}

                        <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-secondary">
                            <span className="fw-900 text-white fs-5">TOTAL À PAYER</span>
                            <span className="fw-900 fs-3 text-primary" style={{ color: '#f97316' }}>{pricing.total.toFixed(2)} DT</span>
                        </div>
                    </div>
                    {submitError && (
                        <div className="alert alert-danger rounded-4 p-3 mb-3 small fw-700">
                            <i className="bi bi-exclamation-triangle me-2"></i>{submitError}
                        </div>
                    )}
                    <div className="d-flex gap-3">
                        <button className="btn rounded-pill px-4 fw-800" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }} onClick={() => { setSubmitError(null); setStep(2); }}>Retour</button>
                        <button className="btn btn-primary rounded-pill px-4 fw-800 flex-grow-1 py-3" style={{ background: '#f97316', border: 'none' }} onClick={handleSubmit} disabled={submitting}>
                            {submitting ? <><span className="spinner-border spinner-border-sm me-2"></span>TRAITEMENT...</> : "CONFIRMER LA RÉSERVATION"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OfflineHotelForm;
