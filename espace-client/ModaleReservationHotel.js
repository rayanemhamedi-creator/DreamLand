import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import reservationService from '../../services/reservationService';
import api from '../../services/api';
import PhoneInput from '../common/PhoneInput';


// --- UTILITAIRES DE CALCUL EN CENTIMES ---
const toCents = (dt) => Math.round(Number(dt) * 100);
const toDT = (cents) => (cents / 100).toFixed(2);

const ROOM_TYPE_LABELS = {
    'SINGLE': 'Chambre Single (Individuelle)',
    'DOUBLE': 'Chambre Double',
    'TWIN': 'Chambre Twin',
    'TRIPLE': 'Chambre Triple',
    'QUADRUPLE': 'Chambre Quadruple',
    'FAMILIALE': 'Chambre Familiale',
    'SUITE': 'Suite'
};

const HotelReservationModal = ({ isOpen, onClose, hotelId, rooms, formules, user, initialRoomType, initialBedConfig }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    // -- ETAT DU WIDGET --
    const [step, setStep] = useState(1);
    const [currentRoomIndex, setCurrentRoomIndex] = useState(0); // Pour naviguer entre la config des chambres
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [checkingAvail, setCheckingAvail] = useState(false);

    // -- DISPONIBILITE EN TEMPS REEL --
    const [availabilityStatus, setAvailabilityStatus] = useState(null); // null | 'checking' | 'ok' | 'unavailable'
    const [availabilityMessage, setAvailabilityMessage] = useState('');

    // -- ETAT DU FORMULAIRE --
    const [formData, setFormData] = useState({
        dateDebut: '',
        dateFin: '',
        nombreChambres: 1,
        roomsConfig: [
            {
                typeChambre: '',
                typeLogement: '',
                modeReservation: null, // null = pas encore choisi, 'AVEC_VOYAGEURS' ou 'PRIX_LIBRE'
                adultes: 1,
                enfantsAges: [],
                nbLitsSimples: 0,
                nbLitsDoubles: 0,
                companions: []
            }
        ],
        clientNom: user?.nom || '',
        clientPrenom: user?.prenom || '',
        clientEmail: user?.email || '',
        clientTelephone: user?.telephone || ''
    });

    // Securisation des données (Si l'hôtel n'a pas de formule, on en met une par défaut gratuite)
    const safeFormules = useMemo(() => {
        return (formules && formules.length > 0) ? formules : [{ id: 'default-f', type: 'Logement Simple', prix: 0 }];
    }, [formules]);

    // Initialisation
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setCurrentRoomIndex(0);
            setSubmitError(null);
            setAvailabilityStatus(null);
            setAvailabilityMessage('');

            const initialRoom = initialRoomType || (rooms && rooms.length > 0 ? rooms[0].type : 'SINGLE');
            const initialFormule = (safeFormules && safeFormules.length > 0) ? safeFormules[0].type : '';

            setFormData({
                dateDebut: '',
                dateFin: '',
                nombreChambres: 1,
                roomsConfig: [
                    {
                        typeChambre: initialRoom,
                        typeLogement: initialFormule,
                        modeReservation: null,
                        adultes: 1,
                        enfantsAges: [],
                        nbLitsSimples: initialBedConfig ? initialBedConfig.nbLitsSimples : 0,
                        nbLitsDoubles: initialBedConfig ? initialBedConfig.nbLitsDoubles : 0,
                        companions: []
                    }
                ],
                clientNom: user?.nom || '',
                clientPrenom: user?.prenom || '',
                clientEmail: user?.email || '',
                clientTelephone: user?.telephone || ''
            });
        }
    }, [isOpen, rooms, safeFormules, initialRoomType, initialBedConfig, user]);

    const roomsConfigStr = JSON.stringify(formData.roomsConfig);

    // -- VERIFICATION DE DISPONIBILITE AUTO (dès que les dates sont valides) --
    useEffect(() => {
        if (!formData.dateDebut || !formData.dateFin || !hotelId) {
            setAvailabilityStatus(null);
            return;
        }

        // Debounce : attendre 600ms après la dernière modification
        const timer = setTimeout(async () => {
            setAvailabilityStatus('checking');
            setAvailabilityMessage('');
            try {
                const currentRoom = formData.roomsConfig[currentRoomIndex] || formData.roomsConfig[0] || {};
                const payload = {
                    hotelId: hotelId,
                    dateDebut: formData.dateDebut + 'T14:00:00',
                    dateFin: formData.dateFin + 'T10:00:00',
                    typeChambre: currentRoom.typeChambre || (rooms && rooms.length > 0 ? rooms[0].type : 'SINGLE'),
                    typeLogement: currentRoom.typeLogement || '',
                    nombreChambres: currentRoomIndex + 1,
                    nbLitsSimples: currentRoom.nbLitsSimples || 0,
                    nbLitsDoubles: currentRoom.nbLitsDoubles || 0,
                    listeProduitsChoisis: JSON.stringify(formData.roomsConfig.slice(0, currentRoomIndex + 1).map((r, i) => ({
                        chambre: i + 1,
                        type: r.typeChambre,
                        label: ROOM_TYPE_LABELS[r.typeChambre] || r.typeChambre,
                        logement: r.typeLogement,
                        modeReservation: r.modeReservation || 'AVEC_VOYAGEURS',
                        adultes: r.modeReservation === 'PRIX_LIBRE' ? 0 : r.adultes,
                        enfants: r.modeReservation === 'PRIX_LIBRE' ? [] : r.enfantsAges,
                        litsSimples: r.nbLitsSimples,
                        litsDoubles: r.nbLitsDoubles,
                        passagers: r.modeReservation === 'PRIX_LIBRE' ? [] : (r.companions || [])
                    })))
                };
                //On envoie une requête au backend pour vérifier un aperçu de réservation d’hôtel avant de confirmer.
                const res = await reservationService.apercuHotel(payload);
                if (res.data && res.data.success) {
                    setAvailabilityStatus('ok');
                    setAvailabilityMessage('');
                } else {
                    setAvailabilityStatus('unavailable');
                    setAvailabilityMessage(res.data?.message || 'Chambre non disponible pour ces dates.');
                }
            } catch (err) {
                const msg = err.response?.data?.message || err.message || '';
                setAvailabilityStatus('unavailable');
                setAvailabilityMessage(msg || 'Chambre non disponible pour ces dates.');
            }
        }, 600);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.dateDebut, formData.dateFin, formData.nombreChambres, roomsConfigStr, currentRoomIndex, hotelId]);


    // -- LOGIQUE METIER -- (calcul du prix par chambre selon son mode)
    const pricingDetails = useMemo(() => {
        if (!formData.dateDebut || !formData.dateFin || formData.roomsConfig.length === 0) return null;

        const start = new Date(formData.dateDebut);
        const end = new Date(formData.dateFin);
        start.setHours(0, 0, 0, 0); end.setHours(0, 0, 0, 0);

        const diffTime = end - start;
        const nights = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        if (nights <= 0) return null;

        let globalTotalCents = 0;
        const roomDetails = [];

        formData.roomsConfig.forEach((roomConfig, idx) => {
            const selectedRoom = (rooms || []).find(r => r.type === roomConfig.typeChambre);
            const selectedFormule = safeFormules.find(f => f.type === roomConfig.typeLogement);
            const formuleCents = selectedFormule ? toCents(selectedFormule.prix) : 0;

            let roomTotalGlobalCents = 0;

            if (roomConfig.modeReservation === 'PRIX_LIBRE') {
                // Mode prix libre : tarif fixe de la chambre + formule
                const prixLibreCents = selectedRoom && selectedRoom.prixLibre ? toCents(selectedRoom.prixLibre) : 0;
                roomTotalGlobalCents = (prixLibreCents + formuleCents) * nights;
                roomDetails.push({
                    index: idx + 1,
                    type: roomConfig.typeChambre,
                    modeReservation: 'PRIX_LIBRE',
                    prixLibreCents,
                    formuleName: roomConfig.typeLogement,
                    totalFormuleCents: formuleCents,
                    totalCents: roomTotalGlobalCents
                });
            } else {
                // Mode avec voyageurs (ou mode non encore choisi → calcul standard)
                const baseRoomCents = selectedRoom ? toCents(selectedRoom.prix) : 0;
                const adultCents = selectedRoom && selectedRoom.prixParAdulte ? toCents(selectedRoom.prixParAdulte) : 0;
                // 1er adulte = prixBase. Adultes supplémentaires = prixParAdulte chacun
                const adultSuppsCents = Math.max(0, roomConfig.adultes - 1) * adultCents;

                let totalChildrenCents = 0;
                let childrenDetails = [];
                roomConfig.enfantsAges.forEach(ageBracket => {
                    let cost = 0;
                    if (ageBracket === '1-3') {
                        cost = 0; // Gratuit
                    } else if (ageBracket === '4-10') {
                        cost = Math.round(adultCents * 0.5); // 50% adulte suppl.
                    } else if (ageBracket === '11-17') {
                        cost = adultCents; // 100% adulte suppl. (traité comme adulte)
                    }
                    totalChildrenCents += cost;
                    childrenDetails.push({ ageBracket, cost });
                });

                const roomTotalPerNightCents = baseRoomCents + adultSuppsCents + totalChildrenCents + formuleCents;
                roomTotalGlobalCents = roomTotalPerNightCents * nights;

                roomDetails.push({
                    index: idx + 1,
                    type: roomConfig.typeChambre,
                    modeReservation: roomConfig.modeReservation || 'AVEC_VOYAGEURS',
                    baseRoomCents,
                    adultCents,
                    adultes: roomConfig.adultes,
                    adultSuppsCents,
                    childrenDetails,
                    totalChildrenCents,
                    formuleName: roomConfig.typeLogement,
                    totalFormuleCents: formuleCents,
                    roomTotalPerNightCents,
                    totalCents: roomTotalGlobalCents
                });
            }

            globalTotalCents += roomTotalGlobalCents;
        });

        return {
            isValid: true,
            nights,
            globalTotalCents,
            roomDetails
        };
    }, [formData, rooms, safeFormules]);

    const handleConfirmAPI = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setSubmitError(null);

        try {
            // Intégration supprimée
            const firstRoomConfig = formData.roomsConfig[0];
            const firstRoomId = (rooms || []).find(r => r.type === firstRoomConfig.typeChambre)?.id;

            //données envoyées à l’API ( backend) (Généralement en JSON Utilisé surtout dans POST / PUT / PATCH)
            const payload = {
                hotelId: hotelId,
                dateDebut: formData.dateDebut + "T14:00:00",
                dateFin: formData.dateFin + "T10:00:00",
                typeChambre: firstRoomConfig.typeChambre,
                typeLogement: firstRoomConfig.typeLogement,
                nombreChambres: formData.nombreChambres,
                nombreAdultes: formData.roomsConfig.reduce((acc, r) => acc + (r.modeReservation === 'PRIX_LIBRE' ? 0 : r.adultes), 0),
                nombreEnfants: formData.roomsConfig.reduce((acc, r) => acc + (r.modeReservation === 'PRIX_LIBRE' ? 0 : r.enfantsAges.length), 0),
                clientNom: formData.clientNom,
                clientPrenom: formData.clientPrenom,
                clientTelephone: formData.clientTelephone,
                clientEmail: formData.clientEmail,
                nbLitsSimples: firstRoomConfig.nbLitsSimples,
                nbLitsDoubles: firstRoomConfig.nbLitsDoubles,
                prixCalcule: parseFloat(toDT(pricingDetails.globalTotalCents)),
                chambreId: firstRoomId,
                // Mode global : AVEC_VOYAGEURS / PRIX_LIBRE / MIXTE
                modeReservation: (() => {
                    const modes = formData.roomsConfig.map(r => r.modeReservation || 'AVEC_VOYAGEURS');
                    const unique = [...new Set(modes)];
                    return unique.length === 1 ? unique[0] : 'MIXTE';
                })(),
                // Compagnons (uniquement en mode AVEC_VOYAGEURS)
                listeCompagnons: JSON.stringify(
                    formData.roomsConfig.flatMap((r, rIdx) =>
                        (r.companions || [])
                            .filter(c => c && (c.prenom || c.nom))
                            .map(c => ({ chambre: rIdx + 1, prenom: c.prenom, nom: c.nom }))
                    )
                ),
                // Détail complet par chambre (mode + occupants + prix)
                listeProduitsChoisis: JSON.stringify(formData.roomsConfig.map((r, i) => ({
                    chambre: i + 1,
                    type: r.typeChambre,
                    label: ROOM_TYPE_LABELS[r.typeChambre] || r.typeChambre,
                    logement: r.typeLogement,
                    modeReservation: r.modeReservation || 'AVEC_VOYAGEURS',
                    adultes: r.modeReservation === 'PRIX_LIBRE' ? 0 : r.adultes,
                    enfants: r.modeReservation === 'PRIX_LIBRE' ? [] : r.enfantsAges,
                    litsSimples: r.nbLitsSimples,
                    litsDoubles: r.nbLitsDoubles,
                    passagers: r.modeReservation === 'PRIX_LIBRE' ? [] : (r.companions || [])
                })))
            };

            const res = await reservationService.reserverHotel(payload);       // APPEL API RÉSERVATION
            const reservationId = res.data.id || res.data.reservationId;      // récupération de l'ID réservation


            if (reservationId) {
                // 2. Création de la session Stripe
                const paymentRes = await api.post(`/payments/create-session/${reservationId}`);
                const { url } = paymentRes.data;

                if (url) {
                    window.location.href = url;
                } else {
                    setSubmitError("Impossible de générer le lien de paiement.");
                }
            } else {
                setSubmitError(res.data?.message || "Erreur lors de la réservation");
            }
        } catch (err) {
            setSubmitError("Erreur réseau : " + (err.response?.data?.message || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDateDebutChange = (val) => {
        setFormData(prev => {
            const updates = { ...prev, dateDebut: val };
            if (prev.dateFin || true) { // Always ensure consistency
                const start = new Date(val);
                const end = prev.dateFin ? new Date(prev.dateFin) : null;
                if (!end || end <= start) {
                    const nextDay = new Date(start);
                    nextDay.setDate(nextDay.getDate() + 1);
                    updates.dateFin = nextDay.toISOString().split('T')[0];
                }
            }
            return updates;
        });
    };

    if (!isOpen) return null;

    // -- RENDERERS d'ETAPES --
    const renderStep1 = () => (
        <div className="reservation-step animate-fade-in">
            <div className="bg-light rounded-4 p-4 mb-4 shadow-sm border border-light-subtle">
                <label className="fw-800 text-muted small text-uppercase letter-spacing-1 mb-3 d-block">
                    <i className="bi bi-calendar3 me-2"></i>Dates du Séjour
                </label>
                <div className="row g-3">
                    <div className="col-sm-6">
                        <div className="form-floating">
                            <input
                                type="date"
                                className="form-control fw-700 bg-white border-0 shadow-sm rounded-4"
                                id="dateArrivee"
                                min={new Date().toISOString().split('T')[0]}
                                value={formData.dateDebut}
                                onChange={e => handleDateDebutChange(e.target.value)}
                            />
                            <label htmlFor="dateArrivee" className="fw-600">Arrivée</label>
                        </div>
                    </div>
                    <div className="col-sm-6">
                        <div className="form-floating">
                            <input
                                type="date"
                                className="form-control fw-700 bg-white border-0 shadow-sm rounded-4"
                                id="dateDepart"
                                min={(() => {
                                    if (!formData.dateDebut) return new Date().toISOString().split('T')[0];
                                    const d = new Date(formData.dateDebut);
                                    d.setDate(d.getDate() + 1);
                                    return d.toISOString().split('T')[0];
                                })()}
                                value={formData.dateFin}
                                onChange={e => setFormData({ ...formData, dateFin: e.target.value })}
                            />
                            <label htmlFor="dateDepart" className="fw-600">Départ</label>
                        </div>
                    </div>
                </div>

            </div>

            {!initialBedConfig && (
                <div className="bg-white border rounded-4 p-4 mb-4 shadow-sm">
                    <div className="d-flex align-items-center justify-content-between">
                        <div>
                            <h6 className="fw-800 text-dark mb-1">Combien de chambres ?</h6>
                            <p className="text-muted small mb-0 fw-600">
                                Hôtel : {(rooms && rooms.length > 0) ? rooms.length : 0} chambres au total
                            </p>
                        </div>
                        <div className="d-flex align-items-center gap-4 bg-light rounded-pill p-2 border">
                            <button
                                type="button"
                                onClick={() => {
                                    if (formData.nombreChambres > 1) {
                                        setFormData(prev => ({
                                            ...prev,
                                            nombreChambres: prev.nombreChambres - 1,
                                            roomsConfig: prev.roomsConfig.slice(0, -1)
                                        }));
                                    }
                                }}
                                className="btn btn-white rounded-circle shadow-sm p-0 fs-5 d-flex align-items-center justify-content-center"
                                style={{ width: '40px', height: '40px' }}
                            >
                                <i className="bi bi-dash-lg"></i>
                            </button>
                            <span className="fw-900 fs-4" style={{ minWidth: '30px', textAlign: 'center' }}>{formData.nombreChambres}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    const maxTotal = (rooms && rooms.length > 0) ? rooms.length : 1;
                                    if (formData.nombreChambres < maxTotal) {
                                        setFormData(prev => {
                                            const initialRoom = rooms && rooms.length > 0 ? rooms[0].type : 'SINGLE';
                                            const initialFormule = (safeFormules && safeFormules.length > 0) ? safeFormules[0].type : '';
                                            return {
                                                ...prev,
                                                nombreChambres: prev.nombreChambres + 1,
                                                roomsConfig: [
                                                    ...prev.roomsConfig,
                                                    {
                                                        typeChambre: initialRoom,
                                                        typeLogement: initialFormule,
                                                        adultes: 1,
                                                        enfantsAges: [],
                                                        nbLitsSimples: 1,
                                                        nbLitsDoubles: 0,
                                                        companions: []
                                                    }
                                                ]
                                            };
                                        });
                                    }
                                }}
                                className="btn btn-white rounded-circle shadow-sm p-0 fs-5 d-flex align-items-center justify-content-center text-primary"
                                style={{ width: '40px', height: '40px' }}
                            >
                                <i className="bi bi-plus-lg"></i>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-5">
                <button
                    disabled={!formData.dateDebut || !formData.dateFin}
                    onClick={() => {
                        if (!formData.dateDebut || !formData.dateFin) {
                            setSubmitError("Veuillez sélectionner vos dates.");
                            return;
                        }
                        setSubmitError(null);
                        setStep(2);
                        setCurrentRoomIndex(0);
                    }}
                    className="btn btn-lg w-100 rounded-pill py-3 shadow-lg fw-800 transition-all d-flex align-items-center justify-content-center gap-3"
                    style={{
                        background: '#f97316',
                        border: 'none',
                        color: 'white',
                        cursor: (!formData.dateDebut || !formData.dateFin) ? 'not-allowed' : 'pointer',
                        opacity: (!formData.dateDebut || !formData.dateFin) ? 0.7 : 1
                    }}
                >
                    <>Configurer les chambres <i className="bi bi-arrow-right"></i></>
                </button>
            </div>
        </div>
    );

    const renderStep2 = () => {
        const currentRoom = formData.roomsConfig[currentRoomIndex];
        const selectedRoomType = (rooms || []).find(r => r.type === currentRoom.typeChambre);
        const maxCapacity = selectedRoomType ? selectedRoomType.capacite : 4;

        const updateCurrentRoom = (updates) => {
            setFormData(prev => {
                const newConfigs = [...prev.roomsConfig];
                const updatedRoom = { ...newConfigs[currentRoomIndex], ...updates };

                // Ajuster automatiquement les lits selon le type de chambre
                if (updatedRoom.typeChambre === 'SINGLE') {
                    updatedRoom.nbLitsSimples = 1;
                    updatedRoom.nbLitsDoubles = 0;
                } else if (updatedRoom.typeChambre === 'DOUBLE' || updatedRoom.typeChambre === 'TWIN') {
                    const isTwoSimples = (updatedRoom.nbLitsSimples === 2 && updatedRoom.nbLitsDoubles === 0);
                    const isOneDouble = (updatedRoom.nbLitsSimples === 0 && updatedRoom.nbLitsDoubles === 1);
                    if (!isTwoSimples && !isOneDouble) {
                        // Par défaut: 1 lit double
                        updatedRoom.nbLitsSimples = 0;
                        updatedRoom.nbLitsDoubles = 1;
                    }
                } else if (updatedRoom.typeChambre === 'TRIPLE') {
                    const isThreeSimples = (updatedRoom.nbLitsSimples === 3 && updatedRoom.nbLitsDoubles === 0);
                    const isOneDoubleOneSimple = (updatedRoom.nbLitsSimples === 1 && updatedRoom.nbLitsDoubles === 1);
                    if (!isThreeSimples && !isOneDoubleOneSimple) {
                        // Par défaut: 1 lit double + 1 lit simple
                        updatedRoom.nbLitsSimples = 1;
                        updatedRoom.nbLitsDoubles = 1;
                    }
                }

                newConfigs[currentRoomIndex] = updatedRoom;
                return { ...prev, roomsConfig: newConfigs };
            });
        };

        // Bébés 1-3 ans : gratuits ET ne comptent PAS dans la capacité
        const countBabies = currentRoom.enfantsAges.filter(a => a === '1-3').length;
        const countPayingChildren = currentRoom.enfantsAges.filter(a => a !== '1-3').length;
        const totalOccupants = currentRoom.adultes + countPayingChildren;
        const totalBedPlaces = (currentRoom.nbLitsSimples || 0) + ((currentRoom.nbLitsDoubles || 0) * 2);

        // Limite bébés gratuits (1-3 ans) selon le type de chambre
        const maxBabies = (() => {
            switch (currentRoom.typeChambre) {
                case 'SINGLE':                          return 1;
                case 'DOUBLE': case 'TWIN':             return 2;
                case 'TRIPLE':                          return 2;
                case 'QUADRUPLE': case 'FAMILIALE':
                case 'SUITE':                           return 4;
                default:                                return 2;
            }
        })();
        const babyLimitReached = countBabies >= maxBabies;

        return (
            <div className="reservation-step animate-fade-in-right">
                <div className="d-flex align-items-center justify-content-between mb-4">
                    <h5 className="fw-900 text-dark mb-0">Configuration Chambre {currentRoomIndex + 1} / {formData.nombreChambres}</h5>
                    <span className="badge bg-primary-subtle text-primary rounded-pill px-3 py-2 fw-800">
                        Capacité max: {maxCapacity} pers.
                    </span>
                </div>

                {/* 1. Type de Chambre */}
                <div className="mb-4">
                    <label className="form-label fw-800 text-secondary small text-uppercase mb-2">Type de chambre</label>
                    {initialRoomType ? (
                        <div className="form-control form-control-lg rounded-4 border-0 bg-light fw-800 py-3 shadow-sm text-primary">
                            {ROOM_TYPE_LABELS[currentRoom.typeChambre] || currentRoom.typeChambre}
                        </div>
                    ) : (
                        <select
                            className="form-select form-select-lg rounded-4 border-0 bg-light fw-700 py-3 shadow-sm"
                            value={currentRoom.typeChambre}
                            onChange={e => {
                                const newType = e.target.value;
                                const defaultRoom = (rooms || []).find(r => r.type === newType);
                                // QUADRUPLE, FAMILIALE, SUITE → forcer PRIX_LIBRE
                                const forcedMode = ['QUADRUPLE', 'FAMILIALE', 'SUITE'].includes(newType) ? 'PRIX_LIBRE' : null;
                                updateCurrentRoom({
                                    typeChambre: newType,
                                    modeReservation: forcedMode,
                                    nbLitsSimples: defaultRoom ? defaultRoom.nbLitsSimples : 0,
                                    nbLitsDoubles: defaultRoom ? defaultRoom.nbLitsDoubles : 0
                                });
                            }}
                        >
                            {Array.from(new Set((rooms || []).map(r => r.type))).map(type => (
                                <option key={type} value={type}>{ROOM_TYPE_LABELS[type] || type}</option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Indicateur de disponibilité — s'affiche immédiatement après le choix de chambre */}
                {availabilityStatus === 'checking' && (
                    <div className="d-flex align-items-center gap-2 p-3 rounded-3 mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <span className="spinner-border spinner-border-sm text-warning" style={{ width: '16px', height: '16px' }}></span>
                        <span className="small fw-700 text-white-50">Vérification de la disponibilité...</span>
                    </div>
                )}
                {availabilityStatus === 'ok' && (
                    <div className="d-flex align-items-center gap-2 p-3 rounded-3 mb-4 animate-fade-in" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                        <i className="bi bi-check-circle-fill text-success fs-5"></i>
                        <span className="small fw-700" style={{ color: '#4ade80' }}>Disponible pour ces dates !</span>
                    </div>
                )}
                {availabilityStatus === 'unavailable' && (
                    <div className="d-flex align-items-center gap-2 p-3 rounded-3 mb-4 animate-fade-in" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.35)' }}>
                        <i className="bi bi-x-circle-fill fs-5" style={{ color: '#f87171' }}></i>
                        <div>
                            <div className="small fw-800" style={{ color: '#f87171' }}>Chambre non disponible pour ces dates</div>
                            {availabilityMessage && <div className="small fw-600 text-white-50 mt-1">{availabilityMessage}</div>}
                        </div>
                    </div>
                )}

                {/* 2. Mode de tarification (par chambre) */}
                <div className="mb-4">
                    <label className="form-label fw-800 text-secondary small text-uppercase mb-2">
                        <i className="bi bi-sliders me-1"></i>Mode de tarification
                    </label>
                    {['QUADRUPLE', 'FAMILIALE', 'SUITE'].includes(currentRoom.typeChambre) ? (
                        <div className="alert alert-info rounded-4 border-0 py-2 px-3 small fw-700 mb-0" style={{ backgroundColor: 'rgba(249,115,22,0.08)', color: '#f97316' }}>
                            <i className="bi bi-lock-fill me-2"></i>Ce type de chambre fonctionne uniquement en <strong>Prix libre</strong>.
                        </div>
                    ) : (
                        <div className="row g-2">
                            <div className="col-6">
                                <div
                                    className="p-3 rounded-4 border cursor-pointer transition-all"
                                    style={{
                                        background: currentRoom.modeReservation === 'AVEC_VOYAGEURS' ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                        borderColor: currentRoom.modeReservation === 'AVEC_VOYAGEURS' ? '#f97316' : 'rgba(255, 255, 255, 0.1)',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => updateCurrentRoom({ modeReservation: 'AVEC_VOYAGEURS' })}
                                >
                                    <div className="d-flex align-items-center gap-2 mb-1">
                                        <div className="rounded-circle border-2 d-flex align-items-center justify-content-center"
                                            style={{
                                                width: 18,
                                                height: 18,
                                                borderColor: currentRoom.modeReservation === 'AVEC_VOYAGEURS' ? '#f97316' : 'rgba(255, 255, 255, 0.4)'
                                            }}>
                                            {currentRoom.modeReservation === 'AVEC_VOYAGEURS' && <div className="rounded-circle" style={{ width: 8, height: 8, backgroundColor: '#f97316' }}></div>}
                                        </div>
                                        <span className="fw-800 small text-white">Avec voyageurs</span>
                                    </div>
                                    <small className="fw-600 text-white-50" style={{ fontSize: '0.7rem' }}>Adultes + enfants détaillés</small>
                                </div>
                            </div>
                            <div className="col-6">
                                <div
                                    className="p-3 rounded-4 border cursor-pointer transition-all"
                                    style={{
                                        background: currentRoom.modeReservation === 'PRIX_LIBRE' ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                        borderColor: currentRoom.modeReservation === 'PRIX_LIBRE' ? '#f97316' : 'rgba(255, 255, 255, 0.1)',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => updateCurrentRoom({ modeReservation: 'PRIX_LIBRE' })}
                                >
                                    <div className="d-flex align-items-center gap-2 mb-1">
                                        <div className="rounded-circle border-2 d-flex align-items-center justify-content-center"
                                            style={{
                                                width: 18,
                                                height: 18,
                                                borderColor: currentRoom.modeReservation === 'PRIX_LIBRE' ? '#f97316' : 'rgba(255, 255, 255, 0.4)'
                                            }}>
                                            {currentRoom.modeReservation === 'PRIX_LIBRE' && <div className="rounded-circle" style={{ width: 8, height: 8, backgroundColor: '#f97316' }}></div>}
                                        </div>
                                        <span className="fw-800 small text-white">Prix libre</span>
                                    </div>
                                    <small className="fw-600 text-white-50" style={{ fontSize: '0.7rem' }}>
                                        Tarif fixe
                                        {selectedRoomType?.prixLibre ? ` : ${selectedRoomType.prixLibre} DT` : ''}
                                    </small>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                {/* 3. Occupants — uniquement en mode AVEC_VOYAGEURS */}
                {currentRoom.modeReservation === 'AVEC_VOYAGEURS' && (
                    <div className="bg-light rounded-4 p-4 mb-4 border border-light-subtle">

                        {/* Adultes + Enfants 4-17 ans (comptent dans la capacité) */}
                        <div className="row g-3 mb-3">
                            <div className="col-6">
                                <label className="form-label fw-800 text-dark small mb-2">Adultes</label>
                                <div className="d-flex align-items-center gap-3 bg-white rounded-pill p-1 border shadow-sm">
                                    <button type="button" onClick={() => updateCurrentRoom({ adultes: Math.max(1, currentRoom.adultes - 1) })} className="btn btn-white rounded-circle p-0" style={{ width: 32, height: 32 }}><i className="bi bi-dash"></i></button>
                                    <span className="fw-800 flex-grow-1 text-center">{currentRoom.adultes}</span>
                                    <button
                                        type="button"
                                        disabled={totalOccupants >= maxCapacity}
                                        onClick={() => updateCurrentRoom({ adultes: currentRoom.adultes + 1 })}
                                        className="btn btn-white rounded-circle p-0" style={{ width: 32, height: 32 }}
                                    ><i className="bi bi-plus text-primary"></i></button>
                                </div>
                            </div>
                            <div className="col-6">
                                <label className="form-label fw-800 text-dark small mb-2">Enfants <span className="text-muted fw-600" style={{ fontSize: '0.7rem' }}>(4-17 ans)</span></label>
                                <div className="d-flex align-items-center gap-3 bg-white rounded-pill p-1 border shadow-sm">
                                    <button type="button" onClick={() => {
                                        // Supprimer le dernier enfant payant (non bébé)
                                        const lastIdx = currentRoom.enfantsAges.reduce((acc, a, i) => a !== '1-3' ? i : acc, -1);
                                        if (lastIdx !== -1) {
                                            const newAges = currentRoom.enfantsAges.filter((_, i) => i !== lastIdx);
                                            updateCurrentRoom({ enfantsAges: newAges });
                                        }
                                    }} className="btn btn-white rounded-circle p-0" style={{ width: 32, height: 32 }}><i className="bi bi-dash"></i></button>
                                    <span className="fw-800 flex-grow-1 text-center">{countPayingChildren}</span>
                                    <button
                                        type="button"
                                        disabled={totalOccupants >= maxCapacity}
                                        onClick={() => updateCurrentRoom({ enfantsAges: [...currentRoom.enfantsAges, '4-10'] })}
                                        className="btn btn-white rounded-circle p-0" style={{ width: 32, height: 32 }}
                                    ><i className="bi bi-plus text-primary"></i></button>
                                </div>
                            </div>
                        </div>

                        {/* Bébés 1-3 ans : gratuits, ne comptent PAS dans la capacité */}
                        <div className={`d-flex align-items-center justify-content-between rounded-4 px-3 py-2 border shadow-sm mb-1 ${babyLimitReached ? 'bg-warning-subtle border-warning' : 'bg-white'}`}>
                            <div>
                                <span className="fw-800 text-dark d-block" style={{ fontSize: '0.85rem' }}>
                                    Bébés <span className="text-muted fw-600" style={{ fontSize: '0.7rem' }}>(1-3 ans)</span>
                                </span>
                                <span className="text-success" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                                    <i className="bi bi-gift-fill me-1"></i>Gratuit · ne compte pas dans la capacité
                                </span>
                                <span className="d-block text-muted" style={{ fontSize: '0.68rem', fontWeight: 600 }}>
                                    Max autorisé : {maxBabies} bébé{maxBabies > 1 ? 's' : ''} pour ce type de chambre
                                </span>
                            </div>
                            <div className="d-flex align-items-center gap-2 bg-light rounded-pill p-1 border shadow-sm">
                                {/* Bouton MOINS bébé */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        const lastBabyIdx = currentRoom.enfantsAges.reduce((acc, a, i) => a === '1-3' ? i : acc, -1);
                                        if (lastBabyIdx !== -1) {
                                            const newAges = currentRoom.enfantsAges.filter((_, i) => i !== lastBabyIdx);
                                            updateCurrentRoom({ enfantsAges: newAges });
                                        }
                                    }}
                                    style={{
                                        width: 32, height: 32,
                                        borderRadius: '50%',
                                        border: countBabies === 0 ? '1px solid #e2e8f0' : '1px solid #475569',
                                        background: countBabies === 0 ? '#f1f5f9' : '#ffffff',
                                        color: countBabies === 0 ? '#94a3b8' : '#0f172a',
                                        cursor: countBabies === 0 ? 'not-allowed' : 'pointer',
                                        opacity: countBabies === 0 ? 0.5 : 1,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        pointerEvents: countBabies === 0 ? 'none' : 'auto',
                                        boxShadow: countBabies === 0 ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
                                        fontWeight: 'bold'
                                    }}
                                    disabled={countBabies === 0}
                                >
                                    <i className="bi bi-dash-lg" style={{ fontSize: '0.9rem' }}></i>
                                </button>

                                <span
                                    className="fw-900 px-1"
                                    style={{
                                        minWidth: '28px', textAlign: 'center',
                                        color: babyLimitReached ? '#d97706' : '#000000',
                                        fontSize: '1rem',
                                        fontWeight: 900
                                    }}
                                >
                                    {countBabies}
                                </span>

                                {/* Bouton PLUS bébé — triple protection contre le dépassement */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        // GUARD : bloquer si limite atteinte, peu importe l'état disabled
                                        if (countBabies >= maxBabies) return;
                                        updateCurrentRoom({ enfantsAges: [...currentRoom.enfantsAges, '1-3'] });
                                    }}
                                    style={{
                                        width: 32, height: 32,
                                        borderRadius: '50%',
                                        border: babyLimitReached ? '1px solid #e2e8f0' : '1px solid #16a34a',
                                        background: babyLimitReached ? '#f1f5f9' : '#ffffff',
                                        color: babyLimitReached ? '#94a3b8' : '#15803d',
                                        cursor: babyLimitReached ? 'not-allowed' : 'pointer',
                                        opacity: babyLimitReached ? 0.5 : 1,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        pointerEvents: babyLimitReached ? 'none' : 'auto',
                                        boxShadow: babyLimitReached ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
                                        fontWeight: 'bold'
                                    }}
                                    disabled={babyLimitReached}
                                    aria-disabled={babyLimitReached}
                                    title={babyLimitReached ? `Maximum ${maxBabies} bébé(s) pour une chambre ${currentRoom.typeChambre.toLowerCase()}` : 'Ajouter un bébé'}
                                >
                                    <i className="bi bi-plus-lg" style={{ fontSize: '0.9rem' }}></i>
                                </button>
                            </div>
                        </div>
                        {babyLimitReached && (
                            <div className="d-flex align-items-center gap-2 px-2 pb-3 animate-fade-in">
                                <i className="bi bi-exclamation-triangle-fill" style={{ color: '#d97706', fontSize: '0.8rem' }}></i>
                                <span style={{ color: '#b45309', fontSize: '0.72rem', fontWeight: 700 }}>
                                    Limite atteinte — max {maxBabies} bébé{maxBabies > 1 ? 's' : ''} gratuit{maxBabies > 1 ? 's' : ''} pour une chambre {currentRoom.typeChambre.toLowerCase()}.
                                </span>
                            </div>
                        )}

                        {/* Dropdowns pour les enfants 4-17 uniquement */}
                        {countPayingChildren > 0 && (
                            <div className="mt-2 p-3 bg-white rounded-4 border shadow-sm animate-in-y">
                                {currentRoom.enfantsAges.map((age, idx) => age === '1-3' ? null : (
                                    <div key={idx} className="mb-2 last-child-mb-0 d-flex align-items-center gap-2">
                                        <span className="small fw-700 text-muted" style={{ minWidth: '65px' }}>Enfant {idx + 1}</span>
                                        <select
                                            className="form-select form-select-sm rounded-3 border-0 bg-light fw-600"
                                            value={age}
                                            onChange={e => {
                                                const newAges = [...currentRoom.enfantsAges];
                                                newAges[idx] = e.target.value;
                                                updateCurrentRoom({ enfantsAges: newAges });
                                            }}
                                        >
                                            <option value="4-10">4-10 ans (50% adulte)</option>
                                            <option value="11-17">11-17 ans (100% adulte)</option>
                                        </select>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                {/* 4. Lits — en mode AVEC_VOYAGEURS pour tous les types,
                        et en mode PRIX_LIBRE pour DOUBLE, TWIN, TRIPLE (choix toujours nécessaire) */}
                {(currentRoom.modeReservation === 'AVEC_VOYAGEURS' ||
                  (currentRoom.modeReservation === 'PRIX_LIBRE' &&
                   ['DOUBLE', 'TWIN', 'TRIPLE'].includes(currentRoom.typeChambre))
                ) && (
                    <div className="mb-4">
                        <label className="form-label fw-800 text-secondary small text-uppercase mb-2">
                            Configuration des lits
                            {currentRoom.modeReservation === 'PRIX_LIBRE' && (
                                <span className="ms-2 text-warning fw-600 small text-lowercase">
                                    — choisissez votre préférence
                                </span>
                            )}
                        </label>
                        {currentRoom.typeChambre === 'SINGLE' && (
                            <div className="p-3 rounded-4 border text-white fw-800 d-flex align-items-center gap-2" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                                <i className="bi bi-info-circle text-primary fs-5"></i>
                                <span>1 Lit Simple (Configuration fixe)</span>
                            </div>
                        )}

                        {(currentRoom.typeChambre === 'DOUBLE' || currentRoom.typeChambre === 'TWIN') && (
                            <div className="d-flex flex-column gap-2">
                                <div
                                    className="p-3 rounded-4 border cursor-pointer d-flex align-items-center gap-3 transition-all hover-scale"
                                    style={{
                                        background: (currentRoom.nbLitsSimples === 2 && currentRoom.nbLitsDoubles === 0) ? 'rgba(249, 115, 22, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                                        borderColor: (currentRoom.nbLitsSimples === 2 && currentRoom.nbLitsDoubles === 0) ? '#f97316' : 'rgba(255, 255, 255, 0.1)',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => updateCurrentRoom({ nbLitsSimples: 2, nbLitsDoubles: 0 })}
                                >
                                    <input
                                        type="radio"
                                        name={`beds-${currentRoomIndex}`}
                                        checked={currentRoom.nbLitsSimples === 2 && currentRoom.nbLitsDoubles === 0}
                                        onChange={() => updateCurrentRoom({ nbLitsSimples: 2, nbLitsDoubles: 0 })}
                                        style={{ accentColor: '#f97316', width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <div className="fw-800 text-white">2 Lits Simples</div>
                                </div>

                                <div
                                    className="p-3 rounded-4 border cursor-pointer d-flex align-items-center gap-3 transition-all hover-scale"
                                    style={{
                                        background: (currentRoom.nbLitsSimples === 0 && currentRoom.nbLitsDoubles === 1) ? 'rgba(249, 115, 22, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                                        borderColor: (currentRoom.nbLitsSimples === 0 && currentRoom.nbLitsDoubles === 1) ? '#f97316' : 'rgba(255, 255, 255, 0.1)',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => updateCurrentRoom({ nbLitsSimples: 0, nbLitsDoubles: 1 })}
                                >
                                    <input
                                        type="radio"
                                        name={`beds-${currentRoomIndex}`}
                                        checked={currentRoom.nbLitsSimples === 0 && currentRoom.nbLitsDoubles === 1}
                                        onChange={() => updateCurrentRoom({ nbLitsSimples: 0, nbLitsDoubles: 1 })}
                                        style={{ accentColor: '#f97316', width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <div className="fw-800 text-white">1 Grand Lit Double</div>
                                </div>
                            </div>
                        )}

                        {currentRoom.typeChambre === 'TRIPLE' && (
                            <div className="d-flex flex-column gap-2">
                                <div
                                    className="p-3 rounded-4 border cursor-pointer d-flex align-items-center gap-3 transition-all hover-scale"
                                    style={{
                                        background: (currentRoom.nbLitsSimples === 3 && currentRoom.nbLitsDoubles === 0) ? 'rgba(249, 115, 22, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                                        borderColor: (currentRoom.nbLitsSimples === 3 && currentRoom.nbLitsDoubles === 0) ? '#f97316' : 'rgba(255, 255, 255, 0.1)',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => updateCurrentRoom({ nbLitsSimples: 3, nbLitsDoubles: 0 })}
                                >
                                    <input
                                        type="radio"
                                        name={`beds-${currentRoomIndex}`}
                                        checked={currentRoom.nbLitsSimples === 3 && currentRoom.nbLitsDoubles === 0}
                                        onChange={() => updateCurrentRoom({ nbLitsSimples: 3, nbLitsDoubles: 0 })}
                                        style={{ accentColor: '#f97316', width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <div className="fw-800 text-white"> 3 Lits Simples</div>
                                </div>

                                <div
                                    className="p-3 rounded-4 border cursor-pointer d-flex align-items-center gap-3 transition-all hover-scale"
                                    style={{
                                        background: (currentRoom.nbLitsSimples === 1 && currentRoom.nbLitsDoubles === 1) ? 'rgba(249, 115, 22, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                                        borderColor: (currentRoom.nbLitsSimples === 1 && currentRoom.nbLitsDoubles === 1) ? '#f97316' : 'rgba(255, 255, 255, 0.1)',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => updateCurrentRoom({ nbLitsSimples: 1, nbLitsDoubles: 1 })}
                                >
                                    <input
                                        type="radio"
                                        name={`beds-${currentRoomIndex}`}
                                        checked={currentRoom.nbLitsSimples === 1 && currentRoom.nbLitsDoubles === 1}
                                        onChange={() => updateCurrentRoom({ nbLitsSimples: 1, nbLitsDoubles: 1 })}
                                        style={{ accentColor: '#f97316', width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <div className="fw-800 text-white">1 Lit Double + 1 Lit Simple</div>
                                </div>
                            </div>
                        )}
                    </div>
                )} {/* fin lits */}

                {/* 5. Formule */}
                <div className="mb-4">
                    <label className="form-label fw-800 text-secondary small text-uppercase mb-2">Formule de logement</label>
                    <select
                        className="form-select form-select-lg rounded-4 border-0 bg-light fw-700 py-3 shadow-sm"
                        value={currentRoom.typeLogement}
                        onChange={e => updateCurrentRoom({ typeLogement: e.target.value })}
                    >
                        {safeFormules.map(f => (
                            <option key={f.id} value={f.type}>{f.type} {f.prix > 0 ? `(+${f.prix} DT)` : '(Inclus)'}</option>
                        ))}
                    </select>
                </div>

                {/* Affichage dynamique du prix de la chambre courante */}
                {currentRoom.modeReservation && pricingDetails && pricingDetails.roomDetails[currentRoomIndex] && (
                    <div className="p-3 mb-4 rounded-4 border animate-fade-in-right" style={{ backgroundColor: 'rgba(249,115,22,0.06)', borderColor: 'rgba(249,115,22,0.15)' }}>
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <span className="small fw-700 text-secondary d-block">Prix estimé pour cette chambre ({pricingDetails.nights} Nuit{pricingDetails.nights > 1 ? 's' : ''})</span>
                                <small className="text-muted fw-600">
                                    {currentRoom.modeReservation === 'PRIX_LIBRE' ? (
                                        <>Tarif fixe par nuit : {toDT(pricingDetails.roomDetails[currentRoomIndex].prixLibreCents)} DT</>
                                    ) : (
                                        <>Tarif par nuit : {toDT(pricingDetails.roomDetails[currentRoomIndex].roomTotalPerNightCents)} DT (voyageurs + formule)</>
                                    )}
                                </small>
                            </div>
                            <div className="text-end">
                                <span className="fs-3 fw-900 text-primary" style={{ color: '#f97316' }}>{toDT(pricingDetails.roomDetails[currentRoomIndex].totalCents)} DT</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="d-flex gap-3 mt-5">
                    <button
                        type="button"
                        onClick={() => {
                            if (currentRoomIndex === 0) setStep(1);
                            else setCurrentRoomIndex(idx => idx - 1);
                        }}
                        className="btn btn-lg btn-light rounded-pill px-4 fw-800 border"
                    >Retour</button>

                    <button
                        type="button"
                        disabled={availabilityStatus === 'unavailable' || availabilityStatus === 'checking'}
                        onClick={() => {
                            if (availabilityStatus === 'unavailable') return;
                            if (!currentRoom.modeReservation) {
                                setSubmitError("Veuillez choisir un mode de tarification pour cette chambre.");
                                return;
                            }
                            if (currentRoom.modeReservation === 'AVEC_VOYAGEURS') {
                                if (totalOccupants === 0) {
                                    setSubmitError("La chambre ne peut pas être vide.");
                                    return;
                                }
                                if (totalBedPlaces < totalOccupants) {
                                    setSubmitError(`Capacité insuffisante : ${totalOccupants} personnes mais ${totalBedPlaces} places de lit.`);
                                    return;
                                }
                                // --- Validation DOUBLE : exactement 2 voyageurs payants ---
                                if (currentRoom.typeChambre === 'DOUBLE') {
                                    if (countBabies > 2) {
                                        setSubmitError("Maximum 2 bébés gratuits (1-3 ans) pour une chambre Double.");
                                        return;
                                    }
                                    if (totalOccupants !== 2) {
                                        setSubmitError(
                                            `Chambre Double : vous devez sélectionner exactement 2 voyageurs payants.\n` +
                                            `Combinaisons valides : 2 adultes, ou 1 adulte + 1 enfant (3-17 ans).\n` +
                                            `Actuellement : ${totalOccupants} voyageur(s) payant(s).`
                                        );
                                        return;
                                    }
                                }
                                // --- Validation TRIPLE : exactement 3 voyageurs payants ---
                                if (currentRoom.typeChambre === 'TRIPLE') {
                                    if (countBabies > 2) {
                                        setSubmitError("Maximum 2 bébés gratuits (1-3 ans) pour une chambre Triple.");
                                        return;
                                    }
                                    if (totalOccupants !== 3) {
                                        setSubmitError(
                                            `Chambre Triple : vous devez sélectionner exactement 3 voyageurs payants.\n` +
                                            `Combinaisons valides : 3 adultes, 2 adultes + 1 enfant (3-17 ans), ou 1 adulte + 2 enfants (3-17 ans).\n` +
                                            `Actuellement : ${totalOccupants} voyageur(s) payant(s).`
                                        );
                                        return;
                                    }
                                }
                            }
                            setSubmitError(null);
                            if (currentRoomIndex < formData.nombreChambres - 1) {
                                setCurrentRoomIndex(idx => idx + 1);
                            } else {
                                setStep(3);
                            }
                        }}
                        className="btn btn-lg flex-grow-1 rounded-pill fw-800 shadow-lg"
                        style={{
                            background: availabilityStatus === 'unavailable' ? 'rgba(239,68,68,0.3)' : availabilityStatus === 'checking' ? 'rgba(255,255,255,0.15)' : '#f97316',
                            border: availabilityStatus === 'unavailable' ? '1px solid rgba(239,68,68,0.5)' : 'none',
                            color: 'white',
                            opacity: availabilityStatus === 'unavailable' || availabilityStatus === 'checking' ? 0.75 : 1
                        }}
                    >
                        {availabilityStatus === 'checking' ? (
                            <><span className="spinner-border spinner-border-sm me-2"></span>Vérification...</>
                        ) : availabilityStatus === 'unavailable' ? (
                            <><i className="bi bi-x-circle me-2"></i>Non disponible</>
                        ) : (
                            currentRoomIndex < formData.nombreChambres - 1 ? 'Chambre Suivante' : 'Suivant'
                        )}
                    </button>
                </div>
            </div>
        );
    };

    const renderStep3 = () => (
        <div className="reservation-step animate-fade-in-right">
            <form onSubmit={(e) => { e.preventDefault(); setStep(4); }}>
                {/* Contact Principal */}
                <div className="bg-light rounded-4 p-4 mb-4 shadow-sm border border-light-subtle position-relative overflow-hidden">
                    <div className="position-absolute top-0 start-0 w-100 bg-primary opacity-25" style={{ height: '4px' }}></div>
                    <h5 className="fw-800 text-primary mb-3"><i className="bi bi-person-badge-fill me-2"></i>Coordonnées du Contact</h5>
                    <div className="row g-3">
                        <div className="col-sm-6">
                            <label className="form-label fw-800 text-primary small mb-2">Prénom <span className="text-danger">*</span></label>
                            <input type="text" autoComplete="new-password" className="form-control rounded-4 border-0 shadow-sm py-3" required placeholder="Ex: Jean" value={formData.clientPrenom} onChange={e => setFormData({ ...formData, clientPrenom: e.target.value })} />
                        </div>
                        <div className="col-sm-6">
                            <label className="form-label fw-800 text-primary small mb-2">Nom <span className="text-danger">*</span></label>
                            <input type="text" autoComplete="new-password" className="form-control rounded-4 border-0 shadow-sm py-3" required placeholder="Ex: Dupont" value={formData.clientNom} onChange={e => setFormData({ ...formData, clientNom: e.target.value })} />
                        </div>
                        <div className="col-12">
                            <label className="form-label fw-800 text-primary small mb-2">Email <span className="text-danger">*</span></label>
                            <input type="email" autoComplete="new-password" className="form-control rounded-4 border-0 shadow-sm py-3" required placeholder="Ex: email@exemple.com" value={formData.clientEmail} onChange={e => setFormData({ ...formData, clientEmail: e.target.value })} />
                        </div>
                        <div className="col-12">
                            <label className="form-label fw-800 text-primary small mb-2">Téléphone <span className="text-danger">*</span></label>
                            <PhoneInput
                                className="border-0 shadow-sm"
                                value={formData.clientTelephone}
                                onChange={val => setFormData({ ...formData, clientTelephone: val })}
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Détails Passagers par Chambre */}
                {formData.roomsConfig.map((room, rIdx) => (
                    room.adultes > 1 && (
                        <div key={rIdx} className="bg-white border rounded-4 p-4 mb-4 shadow-sm position-relative overflow-hidden">
                            <div className="position-absolute top-0 start-0 w-100 bg-secondary opacity-25" style={{ height: '4px' }}></div>
                            <h6 className="fw-800 text-secondary mb-4"><i className="bi bi-people-fill me-2"></i>Passagers Additionnels - Chambre {rIdx + 1}</h6>

                            {Array.from({ length: room.adultes - 1 }).map((_, aIdx) => {
                                const companionIdx = aIdx;
                                if (!room.companions) room.companions = [];
                                if (!room.companions[companionIdx]) room.companions[companionIdx] = { nom: '', prenom: '' };

                                return (
                                    <div key={aIdx} className="row g-3 mb-3 pb-3 border-bottom last-child-border-0 last-child-mb-0">
                                        <div className="col-sm-6">
                                            <label className="form-label fw-700 text-muted small mb-1">Prénom Adulte {aIdx + 2}</label>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm rounded-3 bg-light border-0"
                                                required
                                                placeholder="Prénom"
                                                value={room.companions[companionIdx]?.prenom || ''}
                                                onChange={e => {
                                                    const newConfigs = [...formData.roomsConfig];
                                                    if (!newConfigs[rIdx].companions) newConfigs[rIdx].companions = [];
                                                    newConfigs[rIdx].companions[companionIdx] = { ...newConfigs[rIdx].companions[companionIdx], prenom: e.target.value };
                                                    setFormData({ ...formData, roomsConfig: newConfigs });
                                                }}
                                            />
                                        </div>
                                        <div className="col-sm-6">
                                            <label className="form-label fw-700 text-muted small mb-1">Nom Adulte {aIdx + 2}</label>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm rounded-3 bg-light border-0"
                                                required
                                                placeholder="Nom"
                                                value={room.companions[companionIdx]?.nom || ''}
                                                onChange={e => {
                                                    const newConfigs = [...formData.roomsConfig];
                                                    if (!newConfigs[rIdx].companions) newConfigs[rIdx].companions = [];
                                                    newConfigs[rIdx].companions[companionIdx] = { ...newConfigs[rIdx].companions[companionIdx], nom: e.target.value };
                                                    setFormData({ ...formData, roomsConfig: newConfigs });
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                ))}

                <div className="d-flex gap-2">
                    <button type="button" onClick={() => setStep(2)} className="btn btn-lg btn-light rounded-pill px-4 fw-800 border shadow-sm">Retour</button>
                    <button type="submit" className="btn btn-lg btn-primary flex-grow-1 rounded-pill py-3 fw-800 shadow-lg" style={{ background: '#f97316', border: 'none' }}>
                        Voir le résumé <i className="bi bi-arrow-right ms-2"></i>
                    </button>
                </div>
            </form>
        </div>
    );

    const renderStep4 = () => {
        if (!pricingDetails) return null;
        return (
            <div className="reservation-step animate-fade-in-right">
                <div className="card shadow-lg border-0 rounded-5 overflow-hidden mb-4">
                    <div className="card-header bg-dark text-white border-0 py-4 px-4 d-flex justify-content-between align-items-center">
                        <h5 className="mb-0 fw-900 letter-spacing-1">Résumé de votre séjour</h5>
                        <span className="badge bg-primary rounded-pill px-3 py-2 fw-800">{pricingDetails.nights} Nuits</span>
                    </div>
                    <div className="card-body p-0">
                        <div className="p-4 bg-light border-bottom">
                            <div className="d-flex align-items-center gap-3 mb-2">
                                <i className="bi bi-calendar-check text-primary fs-5"></i>
                                <span className="fw-800 text-dark">Du {formData.dateDebut} au {formData.dateFin}</span>
                            </div>
                        </div>

                        {formData.roomsConfig.map((room, idx) => {
                            const details = pricingDetails.roomDetails[idx];
                            return (
                                <div key={idx} className="p-4 border-bottom last-child-border-0">
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <div>
                                            <h6 className="fw-900 text-dark mb-1">Chambre {idx + 1} : {ROOM_TYPE_LABELS[room.typeChambre] || room.typeChambre}</h6>
                                            <div className="text-muted small fw-600">
                                                <i className="bi bi-people-fill me-2"></i>{room.adultes} Adultes, {room.enfantsAges.length} Enfants
                                            </div>
                                        </div>
                                        <div className="text-end">
                                            <span className="fw-800 text-dark d-block">{toDT(details.totalCents)} DT</span>
                                            <small className="text-muted">Total séjour</small>
                                        </div>
                                    </div>

                                    {room.modeReservation === 'PRIX_LIBRE' ? (
                                        <div className="bg-light rounded-3 p-3 small fw-600 text-secondary mb-3">
                                            <div className="d-flex justify-content-between mb-2">
                                                <span>Tarif fixe de la chambre (par nuit)</span>
                                                <span className="text-dark">{toDT(details.prixLibreCents)} DT</span>
                                            </div>
                                            <div className="d-flex justify-content-between mb-2">
                                                <span>Logement : {details.formuleName} (par nuit)</span>
                                                <span className="text-dark">{toDT(details.totalFormuleCents)} DT</span>
                                            </div>
                                            <hr className="my-2" />
                                            <div className="d-flex justify-content-between fw-800 text-primary">
                                                <span>Total par nuit</span>
                                                <span>{toDT(details.prixLibreCents + details.totalFormuleCents)} DT</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-light rounded-3 p-3 small fw-600 text-secondary mb-3">
                                            <div className="d-flex justify-content-between mb-2">
                                                <span>Prix de adulte 1</span>
                                                <span className="text-dark">{toDT(details.baseRoomCents)} DT</span>
                                            </div>
                                            {Array.from({ length: Math.max(0, room.adultes - 1) }).map((_, i) => (
                                                <div key={`adult-${i}`} className="d-flex justify-content-between mb-2">
                                                    <span>Prix de adulte {i + 2}</span>
                                                    <span className="text-dark">{toDT(details.adultCents)} DT</span>
                                                </div>
                                            ))}
                                            {details.childrenDetails && details.childrenDetails.map((child, i) => (
                                                <div key={`child-${i}`} className="d-flex justify-content-between mb-2">
                                                    <span>Prix de enfant ({child.ageBracket === '1-3' ? '- moins de 3' : child.ageBracket} ans)</span>
                                                    <span className="text-dark">{toDT(child.cost)} DT</span>
                                                </div>
                                            ))}
                                            <div className="d-flex justify-content-between mb-2">
                                                <span>Logement : {details.formuleName}</span>
                                                <span className="text-dark">{toDT(details.totalFormuleCents)} DT</span>
                                            </div>
                                            <hr className="my-2" />
                                            <div className="d-flex justify-content-between fw-800 text-primary">
                                                <span>Total par nuit</span>
                                                <span>{toDT(details.roomTotalPerNightCents)} DT</span>
                                            </div>
                                        </div>
                                    )}

                                    {room.modeReservation === 'AVEC_VOYAGEURS' && (
                                        <div className="bg-light rounded-3 p-2 small fw-600 text-secondary">
                                            <i className="bi bi-bed me-2"></i>
                                            {room.nbLitsSimples || 0} Lit(s) simple(s), {room.nbLitsDoubles || 0} Lit(s) double(s)
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                        <div className="p-4 bg-primary bg-opacity-10 border-top border-primary border-opacity-25">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="fw-700 text-secondary">Sous-total taxes incluses</span>
                                <span className="fw-800 text-dark fs-5">{toDT(pricingDetails.globalTotalCents)} DT</span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-primary border-opacity-25">
                                <h4 className="fw-900 text-dark mb-0">Total à payer</h4>
                                <h2 className="fw-900 text-primary mb-0">{toDT(pricingDetails.globalTotalCents)} <small className="fs-6">DT</small></h2>
                            </div>
                        </div>
                    </div>
                </div>

                {submitError && (
                    <div className="alert alert-danger border-0 rounded-4 shadow-sm animate-fade-in mb-4 d-flex align-items-center gap-3">
                        <i className="bi bi-exclamation-octagon-fill fs-4"></i>
                        <span className="fw-700 small">{submitError}</span>
                    </div>
                )}

                <div className="d-flex gap-3 mt-4">
                    <button type="button" onClick={() => setStep(3)} disabled={submitting} className="btn btn-lg btn-light rounded-pill px-4 fw-800 border shadow-sm">Retour</button>
                    <button onClick={handleConfirmAPI} disabled={submitting} className="btn btn-lg btn-primary flex-grow-1 rounded-pill py-3 fw-900 shadow-lg fs-5 hover-scale" style={{ background: '#f97316', border: 'none' }}>
                        {submitting ? (
                            <><span className="spinner-border spinner-border-sm me-2"></span> Traitement...</>
                        ) : (
                            <><i className="bi bi-lock-fill me-2"></i> Payer maintenant</>
                        )}
                    </button>
                </div>
            </div>
        );
    };

    const renderStep5Success = () => (
        <div className="reservation-step text-center py-5 animate-bounce-in">
            <div className="display-1 text-success mb-4 rounded-circle bg-success-subtle d-inline-flex p-4 shadow-sm"><i className="bi bi-check-lg"></i></div>
            <h2 className="fw-900 text-dark mb-3">{t('booking.success_title')}</h2>
            <p className="text-secondary mb-4 fs-5">{t('booking.success_msg', { name: formData.clientPrenom })} <br />{t('booking.total_to_pay')}: <strong>{toDT(pricingDetails.globalTotalCents)} DT</strong></p>
            <button onClick={() => { onClose(); navigate('/touriste/mes-reservations'); }} className="btn btn-dark btn-lg rounded-pill px-5 fw-800 shadow-sm hover-scale">
                {t('reservations.title')}
            </button>
        </div>
    );

    return (
        <div className="modal-overlay animate-fade-in" style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
            <div className="hotel-reservation-widget bg-white rounded-5 shadow-lg overflow-hidden position-relative border-0 shadow-lg"
                style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

                {/* Header du Modal fixe */}
                <div className="widget-header bg-dark text-white p-4 position-relative flex-shrink-0">
                    {step !== 5 && (
                        <button onClick={onClose} className="btn btn-outline-light position-absolute top-0 end-0 m-3 rounded-circle d-flex align-items-center justify-content-center p-0 hover-scale" style={{ width: '36px', height: '36px' }}>
                            <i className="bi bi-x-lg"></i>
                        </button>
                    )}
                    <h3 className="fw-900 mb-1 pe-4">{t('booking.title', "Réservation d'Hôtel")}</h3>

                    <div className="step-indicator d-flex gap-1 mt-3">
                        <span className={`dot rounded-circle ${step >= 1 ? 'bg-primary' : 'bg-secondary'}`} style={{ width: step === 1 ? '32px' : '8px', height: '8px' }}></span>
                        <span className={`dot rounded-circle ${step >= 2 ? 'bg-primary' : 'bg-secondary'}`} style={{ width: step === 2 ? '32px' : '8px', height: '8px' }}></span>
                        <span className={`dot rounded-circle ${step >= 3 ? 'bg-primary' : 'bg-secondary'}`} style={{ width: step === 3 ? '32px' : '8px', height: '8px' }}></span>
                        <span className={`dot rounded-circle ${step >= 4 ? 'bg-primary' : 'bg-secondary'}`} style={{ width: step === 4 ? '32px' : '8px', height: '8px' }}></span>
                    </div>
                </div>

                {/* Corps Scrollable */}
                <div className="widget-body p-4 bg-white overflow-auto" style={{ flex: '1 1 auto', scrollBehavior: 'smooth' }}>

                    {submitError && (
                        <div className="alert alert-danger border-0 rounded-4 shadow-sm animate-fade-in mb-4 d-flex align-items-center gap-3">
                            <div className="bg-danger text-white rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                                <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                            </div>
                            <div className="flex-grow-1">
                                <h6 className="fw-800 mb-1">Attention</h6>
                                <p className="small mb-0 fw-700">{submitError}</p>
                            </div>
                            <button onClick={() => setSubmitError(null)} className="btn-close shadow-none small"></button>
                        </div>
                    )}

                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                    {step === 4 && renderStep4()}
                    {step === 5 && renderStep5Success()}
                </div>
            </div>

            <style>{`
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
                .animate-fade-in-right { animation: fadeInRight 0.3s ease-out forwards; }
                .animate-bounce-in { animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
                @keyframes fadeInRight { 0% { opacity: 0; transform: translateX(20px); } 100% { opacity: 1; transform: translateX(0); } }
                @keyframes bounceIn { 0% { opacity: 0; transform: scale(0.6); } 50% { opacity: 1; transform: scale(1.05); } 100% { transform: scale(1); } }
                .hover-scale { transition: transform 0.2s; cursor: pointer; }
                .hover-scale:hover { transform: scale(1.03); }
                .hover-translate-y { transition: transform 0.2s, box-shadow 0.2s; }
                .hover-translate-y:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.15) !important; }
                .dot { display: inline-block; transition: all 0.3s; }
                .letter-spacing-1 { letter-spacing: 1px; }
            `}</style>
        </div>
    );
};

export default HotelReservationModal;
