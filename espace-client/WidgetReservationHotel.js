import { useNavigate } from 'react-router-dom';
import reservationService from '../../services/reservationService';
import api from '../../services/api';
import PhoneInput from '../common/PhoneInput';

// --- UTILITAIRES DE CALCUL EN CENTIMES ---
// Permet d'éviter les bugs de précision JavaScript (ex: 0.1 + 0.2 = 0.30000000000000004)
const toCents = (dt) => Math.round(Number(dt) * 100);
const toDT = (cents) => (cents / 100).toFixed(2);

const HotelReservationWidget = ({ hotelId, rooms, formules, user }) => {
    const navigate = useNavigate();

    // -- ETAT DU WIDGET --
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    // -- ETAT DU FORMULAIRE --
    const [formData, setFormData] = useState({
        dateDebut: '',
        dateFin: '',
        typeChambre: '',
        typeLogement: '',
        nombreChambres: 1,
        adultes: 2,
        enfantsAges: [], // Tableau des âges des enfants, ex: [2, 10]
        clientNom: user?.nom || '',
        clientPrenom: user?.prenom || '',
        clientEmail: user?.email || '',
        clientTelephone: user?.telephone || ''
    });

    // Securisation des données (Si l'hôtel n'a pas de formule, on en met une par défaut gratuite)
    const safeFormules = useMemo(() => {
        return (formules && formules.length > 0) ? formules : [{ id: 'default-f', type: 'Logement Simple', prix: 0 }];
    }, [formules]);

    useEffect(() => {
        if (rooms && rooms.length > 0 && !formData.typeChambre) {
            setFormData(prev => ({ ...prev, typeChambre: rooms[0].type }));
        }
        if (!formData.typeLogement) {
            setFormData(prev => ({ ...prev, typeLogement: safeFormules[0].type }));
        }
    }, [rooms, safeFormules]);

    // -- LOGIQUE METIER (MOCK LOCAL BOOKING) --
    const pricingDetails = useMemo(() => {
        if (!formData.dateDebut || !formData.dateFin || !formData.typeChambre || !formData.typeLogement) {
            return null;
        }

        const start = new Date(formData.dateDebut);
        const end = new Date(formData.dateFin);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        const diffTime = end - start;
        const nights = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        if (nights <= 0) return null;

        // Récupération des prix de base en centimes
        const selectedRoom = (rooms || []).find(r => r.type === formData.typeChambre);
        const selectedFormule = safeFormules.find(f => f.type === formData.typeLogement);

        const baseRoomCents = selectedRoom ? toCents(selectedRoom.prix) : 0;
        const formuleCents = selectedFormule ? toCents(selectedFormule.prix) : 0;

        // Règles métiers Booking Mock
        // Normalement 2 adultes inclus par chambre. 
        const inclusAdultes = 2 * formData.nombreChambres;
        const adultesSupplementaires = Math.max(0, formData.adultes - inclusAdultes);

        const ADULT_SUPP_NIGHT_CENTS = toCents(30); // 30 DT par adulte supp

        let totalEnfantsCents = 0;
        let nbEnfantsPayants = 0;

        formData.enfantsAges.forEach(ageBracket => {
            if (ageBracket === '4-10') {
                totalEnfantsCents += (ADULT_SUPP_NIGHT_CENTS * 0.5);
                nbEnfantsPayants++;
            } else if (ageBracket === '11-17') {
                totalEnfantsCents += (ADULT_SUPP_NIGHT_CENTS * 0.7);
                nbEnfantsPayants++;
            }
        });

        // Facture par nuit
        const nightBaseCents = (baseRoomCents + formuleCents) * formData.nombreChambres;
        const nightSuppAdultesCents = adultesSupplementaires * ADULT_SUPP_NIGHT_CENTS;
        const nightSuppEnfantsCents = totalEnfantsCents;

        const totalPerNightCents = nightBaseCents + nightSuppAdultesCents + nightSuppEnfantsCents;
        const globalTotalCents = totalPerNightCents * nights;

        return {
            isValid: true,
            nights,
            baseRoomCents,
            formuleCents,
            adultesSupplementaires,
            adultSuppLigneCents: nightSuppAdultesCents * nights,
            nbEnfantsPayants,
            enfantSuppLigneCents: nightSuppEnfantsCents * nights,
            nightBaseCents,
            globalTotalCents,
        };
    }, [formData, rooms, safeFormules]);

    const handleDateDebutChange = (val) => {
        setFormData(prev => {
            const updates = { ...prev, dateDebut: val };
            if (prev.dateFin || true) {
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

    // -- HANDLERS FONCTIONNELS --
    const handleAddEnfant = () => {
        setFormData(prev => ({ ...prev, enfantsAges: [...prev.enfantsAges, ''] })); // Défaut vide
    };

    const handleUpdateEnfantAge = (index, ageBracket) => {
        const updated = [...formData.enfantsAges];
        updated[index] = ageBracket;
        setFormData(prev => ({ ...prev, enfantsAges: updated }));
    };

    const handleRemoveEnfant = (index) => {
        const updated = formData.enfantsAges.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, enfantsAges: updated }));
    };

    const handleConfirmAndPay = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setSubmitError(null);

        try {
            const payload = {
                hotelId: hotelId,
                dateDebut: formData.dateDebut + "T14:00:00",
                dateFin: formData.dateFin + "T10:00:00",
                typeChambre: formData.typeChambre,
                typeLogement: formData.typeLogement,
                nombreChambres: formData.nombreChambres,
                nombreAdultes: formData.adultes,
                nombreEnfants: formData.enfantsAges.length,
                clientNom: formData.clientNom,
                clientPrenom: formData.clientPrenom,
                clientTelephone: formData.clientTelephone,
                clientEmail: formData.clientEmail,
                prixCalcule: parseFloat(toDT(pricingDetails.globalTotalCents))
            };

            // 1. Création de la réservation (Statut PENDING par défaut)
            const res = await reservationService.reserverHotel(payload);
            const reservationId = res.data.id || res.data.reservationId;

            if (reservationId) {
                // 2. Création de la session Stripe
                const paymentRes = await api.post(`/payments/create-session/${reservationId}`);
                const { url } = paymentRes.data;

                if (url) {
                    // 3. Redirection vers Stripe Checkout
                    window.location.href = url;
                } else {
                    setSubmitError("Impossible de générer le lien de paiement.");
                }
            } else {
                setSubmitError(res.data?.message || "Erreur lors de la création de la réservation");
            }
        } catch (err) {
            setSubmitError("Erreur : " + (err.response?.data?.message || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    // -- VALIDATION VOYAGEURS --
    // Enfants payants : 4-10 ans et 11-17 ans
    // Enfants gratuits : 1-3 ans (max 2)
    const enfantsGratuits = formData.enfantsAges.filter(a => a === '1-3').length;
    const enfantsPayants  = formData.enfantsAges.filter(a => a === '4-10' || a === '11-17').length;
    // Total des voyageurs qui comptent pour la capacité de la chambre
    const totalPayants = formData.adultes + enfantsPayants;

    // Règle par type de chambre
    const voyageursValidation = (() => {
        const type = formData.typeChambre;
        if (type === 'DOUBLE') {
            if (enfantsGratuits > 2) return { ok: false, msg: 'Maximum 2 enfants gratuits (1-3 ans) autorisés.' };
            if (totalPayants !== 2) return {
                ok: false,
                msg: `Chambre Double : sélectionnez exactement 2 voyageurs payants. Combinaisons valides : 2 adultes, ou 1 adulte + 1 enfant (3-17 ans). Actuellement : ${totalPayants} voyageur(s) payant(s).`
            };
            return { ok: true, msg: null };
        }
        if (type === 'TRIPLE') {
            if (enfantsGratuits > 2) return { ok: false, msg: 'Maximum 2 enfants gratuits (1-3 ans) autorisés.' };
            if (totalPayants !== 3) return {
                ok: false,
                msg: `Chambre Triple : sélectionnez exactement 3 voyageurs payants. Combinaisons valides : 3 adultes, 2 adultes + 1 enfant (3-17 ans), ou 1 adulte + 2 enfants (3-17 ans). Actuellement : ${totalPayants} voyageur(s) payant(s).`
            };
            return { ok: true, msg: null };
        }
        // Autres types : pas de contrainte stricte
        return { ok: true, msg: null };
    })();

    // -- RENDERERS d'ETAPES --
    const renderStep1 = () => (
        <div className="reservation-step animate-fade-in">
            <div className="d-flex align-items-center justify-content-between mb-4">
                <h4 className="fw-800 text-dark mb-0">Vos Dates & Options</h4>
                <div className="step-indicator d-flex gap-1">
                    <span className="dot active bg-primary rounded-circle" style={{ width: '24px', height: '8px' }}></span>
                    <span className="dot bg-light rounded-circle" style={{ width: '8px', height: '8px' }}></span>
                    <span className="dot bg-light rounded-circle" style={{ width: '8px', height: '8px' }}></span>
                </div>
            </div>

            <div className="bg-light rounded-4 p-3 mb-4 shadow-sm border border-light-subtle">
                <label className="fw-800 text-muted small text-uppercase letter-spacing-1 mb-2">Séjour</label>
                <div className="row g-2">
                    <div className="col-sm-6">
                        <div className="form-floating">
                            <input
                                type="date"
                                className="form-control fw-600 bg-white border-0 shadow-sm rounded-3"
                                id="dateArrivee"
                                min={new Date().toISOString().split('T')[0]}
                                value={formData.dateDebut}
                                onChange={e => handleDateDebutChange(e.target.value)}
                            />
                            <label htmlFor="dateArrivee">Arrivée <span className="text-danger">*</span></label>
                        </div>
                    </div>
                    <div className="col-sm-6">
                        <div className="form-floating">
                            <input
                                type="date"
                                className="form-control fw-600 bg-white border-0 shadow-sm rounded-3"
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
                            <label htmlFor="dateDepart">Départ <span className="text-danger">*</span></label>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-3 mb-4">
                <div className="col-sm-6">
                    <div className="form-floating">
                        <select className="form-select fw-600 border shadow-sm rounded-3" value={formData.typeChambre} onChange={e => setFormData({ ...formData, typeChambre: e.target.value })}>
                            {(rooms || []).map(r => <option key={r.id} value={r.type}>{r.type} (à partir de {r.prix} DT)</option>)}
                        </select>
                        <label>Type de chambre <span className="text-danger">*</span></label>
                    </div>
                </div>
                <div className="col-sm-6">
                    <div className="form-floating">
                        <select className="form-select fw-600 border shadow-sm rounded-3" value={formData.typeLogement} onChange={e => setFormData({ ...formData, typeLogement: e.target.value })}>
                            {safeFormules.map(f => (
                                <option key={f.id} value={f.type}>
                                    {f.type} {f.prix > 0 && `(+${f.prix} DT)`}
                                </option>
                            ))}
                        </select>
                        <label>Formule <span className="text-danger">*</span></label>
                    </div>
                </div>
            </div>

            <div className="bg-light border shadow-sm rounded-4 p-3 mb-4">
                <h6 className="fw-800 text-dark mb-3"><i className="bi bi-people-fill me-2"></i>Occupation</h6>

                {/* Contrôle Chambres */}
                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-3">
                    <span className="fw-700">Chambres</span>
                    <div className="d-flex align-items-center gap-3">
                        <button onClick={() => setFormData({ ...formData, nombreChambres: Math.max(1, formData.nombreChambres - 1) })} className="btn btn-outline-secondary rounded-circle p-0 fs-5 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}><i className="bi bi-dash"></i></button>
                        <span className="fw-800 fs-5">{formData.nombreChambres}</span>
                        <button onClick={() => setFormData({ ...formData, nombreChambres: formData.nombreChambres + 1 })} className="btn btn-outline-primary rounded-circle p-0 fs-5 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}><i className="bi bi-plus"></i></button>
                    </div>
                </div>

                {/* Contrôle Adultes */}
                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-3">
                    <div>
                        <span className="fw-700 d-block">Adultes</span>
                        <small className="text-muted">18 ans et plus</small>
                    </div>
                    <div className="d-flex align-items-center gap-3">
                        <button onClick={() => setFormData({ ...formData, adultes: Math.max(1, formData.adultes - 1) })} className="btn btn-outline-secondary rounded-circle p-0 fs-5 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}><i className="bi bi-dash"></i></button>
                        <span className="fw-800 fs-5">{formData.adultes}</span>
                        <button onClick={() => setFormData({ ...formData, adultes: formData.adultes + 1 })} className="btn btn-outline-primary rounded-circle p-0 fs-5 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}><i className="bi bi-plus"></i></button>
                    </div>
                </div>

                {/* Contrôle Enfants */}
                <div>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                        <div>
                            <span className="fw-700 d-block">Enfants</span>
                            <small className="text-muted">0 - 17 ans</small>
                        </div>
                        <button onClick={handleAddEnfant} className="btn btn-sm btn-primary rounded-pill fw-700 px-3">
                            <i className="bi bi-plus-lg me-1"></i> Ajouter
                        </button>
                    </div>

                    {formData.enfantsAges.length > 0 && (
                        <div className="d-flex flex-column gap-2 mt-3 p-3 bg-white border rounded-3">
                            {formData.enfantsAges.map((age, index) => (
                                <div key={index} className="d-flex align-items-center gap-2">
                                    <label className="text-muted small fw-600 mb-0 flex-shrink-0" style={{ width: "70px" }}>Enfant {index + 1}</label>
                                    <select className="form-select form-select-sm shadow-none" value={age} onChange={(e) => handleUpdateEnfantAge(index, e.target.value)}>
                                        <option value="" disabled>Intervalle d'âge ?</option>
                                        <option value="1-3">Entre 1 et 3 ans (Gratuit)</option>
                                        <option value="4-10">Entre 4 et 10 ans (50% adulte)</option>
                                        <option value="11-17">Entre 11 et 17 ans (70% adulte)</option>
                                    </select>
                                    <button onClick={() => handleRemoveEnfant(index)} className="btn btn-sm btn-light text-danger p-1"><i className="bi bi-trash-fill"></i></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Message de validation voyageurs */}
            {!voyageursValidation.ok && voyageursValidation.msg && (
                <div className="alert border-0 rounded-3 py-2 px-3 mb-3 d-flex align-items-start gap-2" style={{ backgroundColor: '#fff7ed', borderLeft: '4px solid #f97316 !important', boxShadow: '0 2px 8px rgba(249,115,22,0.12)' }}>
                    <i className="bi bi-exclamation-triangle-fill mt-1 flex-shrink-0" style={{ color: '#f97316' }}></i>
                    <span className="fw-700 small" style={{ color: '#9a3412' }}>{voyageursValidation.msg}</span>
                </div>
            )}

            {/* Sticky Pricing Preview */}
            <div className="bg-dark rounded-4 p-4 text-white shadow-lg overflow-hidden position-relative mb-3 transition-all" style={{ boxShadow: '0 15px 30px rgba(0,0,0,0.2)' }}>
                {pricingDetails && pricingDetails.nights > 0 ? (
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <span className="d-block text-white-50 fw-600 mb-1">{pricingDetails.nights} nuit(s)</span>
                            <h2 className="fw-800 mb-0 d-flex align-items-baseline gap-1">
                                {toDT(pricingDetails.globalTotalCents)}
                                <span className="fs-5 text-white-50">DT</span>
                            </h2>
                        </div>
                        {user ? (
                            <button
                                onClick={() => setStep(2)}
                                disabled={!voyageursValidation.ok}
                                className="btn btn-lg btn-primary rounded-pill px-4 shadow-lg fw-800 transition-all hover-scale"
                                style={!voyageursValidation.ok ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                                title={!voyageursValidation.ok ? voyageursValidation.msg : ''}
                            >
                                Suivant <i className="bi bi-arrow-right ms-1"></i>
                            </button>
                        ) : (
                            <button onClick={() => navigate('/login')} className="btn btn-light rounded-pill px-4 text-dark fw-800 hover-scale">
                                Connectez-vous
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="text-center opacity-75">
                        <p className="mb-0 fw-600"><i className="bi bi-calendar-event me-2"></i>Sélectionnez vos dates pour un tarif</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="reservation-step animate-fade-in-right">
            <div className="d-flex align-items-center justify-content-between mb-4">
                <button onClick={() => setStep(1)} className="btn btn-light rounded-circle shadow-sm p-2 d-flex align-items-center justify-content-center hover-translate-x" style={{ width: '40px', height: '40px' }}>
                    <i className="bi bi-arrow-left"></i>
                </button>
                <h4 className="fw-800 text-dark mb-0">Vos Informations</h4>
                <div className="step-indicator d-flex gap-1">
                    <span className="dot bg-success rounded-circle" style={{ width: '8px', height: '8px' }}></span>
                    <span className="dot active bg-primary rounded-circle" style={{ width: '24px', height: '8px' }}></span>
                    <span className="dot bg-light rounded-circle" style={{ width: '8px', height: '8px' }}></span>
                </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setStep(3); }}>
                <div className="bg-light rounded-4 p-4 mb-4 shadow-sm border border-light-subtle">
                    <div className="row g-3">
                        <div className="col-sm-6">
                            <label className="form-label fw-800 text-primary small mb-2">Prénom <span className="text-danger">*</span></label>
                            <input type="text" className="form-control rounded-3 border-0 shadow-sm py-2" name="unique_prenom_field" autoComplete="new-password" required placeholder="Ex: Jean" value={formData.clientPrenom} onChange={e => setFormData({ ...formData, clientPrenom: e.target.value })} />
                        </div>
                        <div className="col-sm-6">
                            <label className="form-label fw-800 text-primary small mb-2">Nom <span className="text-danger">*</span></label>
                            <input type="text" className="form-control rounded-3 border-0 shadow-sm py-2" name="unique_nom_field" autoComplete="new-password" required placeholder="Ex: Dupont" value={formData.clientNom} onChange={e => setFormData({ ...formData, clientNom: e.target.value })} />
                        </div>
                        <div className="col-12">
                            <label className="form-label fw-800 text-primary small mb-2">Email <span className="text-danger">*</span></label>
                            <input type="email" className="form-control rounded-3 border-0 shadow-sm py-2" name="unique_email_field" autoComplete="new-password" required placeholder="Ex: email@exemple.com" value={formData.clientEmail} onChange={e => setFormData({ ...formData, clientEmail: e.target.value })} />
                        </div>
                        <div className="col-12">
                            <label className="form-label fw-800 text-primary small mb-2">Téléphone De Réservation <span className="text-danger">*</span></label>
                            <PhoneInput
                                className="border-0 shadow-sm py-2"
                                value={formData.clientTelephone}
                                onChange={val => setFormData({ ...formData, clientTelephone: val })}
                                required
                            />
                        </div>
                    </div>
                </div>

                <button type="submit" className="btn btn-lg btn-primary w-100 rounded-pill py-3 fw-800 shadow-lg hover-translate-y">
                    Étape Finale <i className="bi bi-check2-circle ms-2"></i>
                </button>
            </form>
        </div>
    );

    const renderStep3 = () => {
        if (!pricingDetails) return null;

        return (
            <div className="reservation-step animate-fade-in-right">
                <div className="d-flex align-items-center justify-content-between mb-4">
                    <button onClick={() => setStep(2)} disabled={submitting} className="btn btn-light rounded-circle shadow-sm p-2 d-flex align-items-center justify-content-center hover-translate-x" style={{ width: '40px', height: '40px' }}>
                        <i className="bi bi-arrow-left"></i>
                    </button>
                    <h4 className="fw-800 text-dark mb-0">Confirmation</h4>
                    <div className="step-indicator d-flex gap-1">
                        <span className="dot bg-success rounded-circle" style={{ width: '8px', height: '8px' }}></span>
                        <span className="dot bg-success rounded-circle" style={{ width: '8px', height: '8px' }}></span>
                        <span className="dot active bg-primary rounded-circle" style={{ width: '24px', height: '8px' }}></span>
                    </div>
                </div>

                <div className="card shadow-sm border-0 rounded-4 overflow-hidden mb-4">
                    <div className="card-header bg-dark text-white border-0 py-3">
                        <h5 className="mb-0 fw-800">Résumé du tarif</h5>
                    </div>
                    <div className="card-body p-0">
                        <ul className="list-group list-group-flush fw-600">
                            <li className="list-group-item d-flex justify-content-between align-items-center py-3">
                                <div>
                                    <span className="d-block text-dark">Chambre {formData.typeChambre} x {formData.nombreChambres}</span>
                                    <small className="text-muted">{formData.typeLogement}</small>
                                </div>
                                <span>{toDT((pricingDetails.baseRoomCents + pricingDetails.formuleCents) * formData.nombreChambres)} DT / nuit</span>
                            </li>

                            {pricingDetails.adultesSupplementaires > 0 && (
                                <li className="list-group-item d-flex justify-content-between align-items-center py-3 text-warning">
                                    <div>
                                        <span className="d-block"><i className="bi bi-plus-circle-fill me-2"></i>Supp. {pricingDetails.adultesSupplementaires} Adulte(s)</span>
                                    </div>
                                    <span>{toDT(pricingDetails.adultSuppLigneCents / pricingDetails.nights)} DT / nuit</span>
                                </li>
                            )}

                            {pricingDetails.nbEnfantsPayants > 0 && (
                                <li className="list-group-item d-flex justify-content-between align-items-center py-3 text-info">
                                    <div>
                                        <span className="d-block"><i className="bi bi-plus-circle-fill me-2"></i>Supp. {pricingDetails.nbEnfantsPayants} Enfant(s) (4-17)</span>
                                    </div>
                                    <span>{toDT(pricingDetails.enfantSuppLigneCents / pricingDetails.nights)} DT / nuit</span>
                                </li>
                            )}

                            <li className="list-group-item d-flex justify-content-between align-items-center py-3 bg-light">
                                <span className="fw-700">Total par nuit</span>
                                <span className="fw-800">{toDT(pricingDetails.nightBaseCents + (pricingDetails.adultSuppLigneCents / pricingDetails.nights) + (pricingDetails.enfantSuppLigneCents / pricingDetails.nights))} DT</span>
                            </li>

                            <li className="list-group-item d-flex justify-content-between align-items-center py-4 bg-primary-subtle border-0">
                                <div>
                                    <span className="d-block fw-800 fs-5 text-dark">Total à payer</span>
                                    <small className="text-dark fw-600">{pricingDetails.nights} nuit(s) • Taxes incluses</small>
                                </div>
                                <span className="fw-800 fs-2 text-primary">{toDT(pricingDetails.globalTotalCents)} DT</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {submitError && (
                    <div className="alert alert-danger rounded-3 py-2 px-3 fw-600 small mb-4 animate-fade-in">
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>{submitError}
                    </div>
                )}

                <button onClick={handleConfirmAndPay} disabled={submitting} className="btn btn-success w-100 py-3 rounded-pill fw-800 shadow-lg fs-5 hover-scale">
                    {submitting ? (
                        <><span className="spinner-border spinner-border-sm me-2" role="status"></span> Traitement...</>
                    ) : (
                        <><i className="bi bi-credit-card-fill me-2"></i> Payer et Confirmer (Stripe)</>
                    )}
                </button>
                <p className="text-center text-muted small mt-3 fw-600"><i className="bi bi-shield-check me-1"></i> Réservation sûre et sécurisée</p>
            </div>
        )
    }

    const renderStep4Success = () => (
        <div className="reservation-step text-center py-5 animate-bounce-in">
            <div className="display-1 text-success mb-4 rounded-circle bg-success-subtle d-inline-flex p-4 shadow-sm">
                <i className="bi bi-check-lg"></i>
            </div>
            <h2 className="fw-900 text-dark mb-3">Réservation Confirmée !</h2>
            <p className="text-secondary mb-4 fs-5">Merci <strong>{formData.clientPrenom}</strong>. <br />Votre réservation au tarif de <strong>{toDT(pricingDetails.globalTotalCents)} DT</strong> a été transmise à l'hôtel.</p>
            <button onClick={() => navigate('/touriste/mes-reservations')} className="btn btn-dark btn-lg rounded-pill px-5 fw-800 shadow-sm hover-scale">
                Voir Mes Réservations
            </button>
        </div>
    );

    return (
        <div className="hotel-reservation-widget bg-white rounded-5 shadow-sm overflow-hidden position-relative border-0" style={{ maxWidth: '500px', margin: '0 auto', border: '1px solid #eaeaea' }}>
            <div className="widget-header bg-dark text-white p-4 pb-5 position-relative">
                <div className="position-absolute top-0 end-0 p-3 opacity-25">
                    <i className="bi bi-building-check display-4"></i>
                </div>
                <h3 className="fw-900 mb-1 position-relative z-1">Réservez votre séjour</h3>
                <p className="mb-0 fw-600 text-white-50 position-relative z-1 small text-uppercase letter-spacing-1">Meilleur prix garanti</p>
            </div>

            <div className="widget-body p-4 bg-white" style={{ marginTop: '-20px', borderRadius: '24px 24px 0 0', position: 'relative', zIndex: 5 }}>
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4Success()}
            </div>

            <style>{`
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
                .animate-fade-in-right { animation: fadeInRight 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                .animate-bounce-in { animation: bounceIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes fadeInRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
                @keyframes bounceIn { 0% { opacity: 0; transform: scale(0.3); } 50% { opacity: 1; transform: scale(1.05); } 100% { transform: scale(1); } }
                
                .hover-scale { transition: transform 0.2s; }
                .hover-scale:hover { transform: scale(1.03); }
                .hover-translate-y { transition: transform 0.2s, box-shadow 0.2s; }
                .hover-translate-y:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.15) !important; }
                .hover-translate-x { transition: transform 0.2s; }
                .hover-translate-x:hover { transform: translateX(-3px); }
                
                .dot { display: inline-block; transition: all 0.3s; }
                .letter-spacing-1 { letter-spacing: 1px; }
                .fw-900 { font-weight: 900; }
            `}</style>
        </div>
    );
};

export default HotelReservationWidget;
