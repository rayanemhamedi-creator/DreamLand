// Importation des hooks React essentiels
import React, { useState, useEffect, useContext } from 'react';
// Hooks de navigation et récupération d'arguments dans les URLs
import { useLocation, useNavigate, useParams } from 'react-router-dom';
// Services REST de communication client-serveur
import api from '../../services/api';
import reservationService from '../../services/reservationService';
// Contexte d'authentification utilisateur
import { AuthContext } from '../../context/AuthContext';
// Composants de mise en page et utilitaires
import Topbar from '../../components/layout/Topbar';
import MessageCenter from '../../components/messagerie/CentreMessagerie';
import ProviderMapDisplay from '../../components/espace-client/AffichageCarte';
import PhoneInput from '../../components/common/PhoneInput';


const SortieDirectDetails = () => {
    // Récupération de l'identifiant unique de la sortie depuis l'URL
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    // Données de l'utilisateur couramment connecté
    const { user } = useContext(AuthContext);
    
    // États locaux
    const [sortie, setSortie] = useState(location.state?.item || null); // Données complètes de la sortie
    const [loading, setLoading] = useState(true); // Indicateur de chargement
    const [submitting, setSubmitting] = useState(false); // Blocage du bouton d'envoi Stripe
    const [showResModal, setShowResModal] = useState(false); // Visibilité du modal
    const [step, setStep] = useState(0); // Étapes : 0 = Billets, 1 = Coordonnées, 2 = Résumé de paiement
    const [contactTarget, setContactTarget] = useState(null); // Contact messagerie
    
    // Formulaire d'achat pré-renpli
    const [resForm, setResForm] = useState({
        nombreTickets: 1,
        clientNom: user?.nom || '',
        clientPrenom: user?.prenom || '',
        clientEmail: user?.email || '',
        clientTelephone: user?.telephone || '',
    });

    // Effet : récupération des détails de la sortie depuis l'API backend
    useEffect(() => {
        const fetchSortieDetails = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/sorties/${id}`);
                setSortie(res.data);
            } catch (err) {
                console.error("Erreur lors de la récupération de la sortie:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSortieDetails();
    }, [id]);

    if (loading) {
        return (
            <div className="loading-screen text-center">
                <div className="loading-spinner"></div>
                <h3 className="fw-700 mt-4 text-secondary">🗺️ Préparation de votre sortie...</h3>
                <p className="text-muted small">Recherche de l'itinéraire de la sortie</p>
            </div>
        );
    }

    if (!sortie) {
        return (
            <div className="container py-5 mt-5 text-center">
                <div className="alert alert-warning shadow-sm border-0 rounded-4 p-5">
                    <i className="bi bi-search display-1 mb-4"></i>
                    <h2 className="fw-800 mb-3">Sortie introuvable</h2>
                    <button onClick={() => navigate('/touriste')} className="btn btn-primary rounded-pill px-4 fw-700">Retour au Dashboard</button>
                </div>
            </div>
        );
    }

    // Gestion de la galerie de photos
    const images = sortie.urlImage ? sortie.urlImage.split(',').filter(Boolean) : [];
    const formattedDate = sortie.dateSortie ? new Date(sortie.dateSortie).toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    }) : 'Non planifié';

    // Passage à l'étape suivante de la modale avec contrôle de date valide
    const handleNextStep = (e) => {
        e.preventDefault();
        if (sortie.dateSortie && new Date(sortie.dateSortie) < new Date()) {
            alert("❌ Vous ne pouvez pas réserver pour une date/heure déjà passée. Veuillez choisir une sortie à venir.");
            return;
        }
        setStep(1);
    };

    // Création de la réservation côté backend et initiation de la session Stripe
    const handleConfirmAndPay = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const req = {
                sortieId: sortie.id,
                dateSortie: sortie.dateSortie,
                nombreTickets: resForm.nombreTickets,
                clientNom: resForm.clientNom,
                clientPrenom: resForm.clientPrenom,
                clientEmail: resForm.clientEmail,
                clientTelephone: resForm.clientTelephone,
                prixTotal: (sortie.prix || 0) * resForm.nombreTickets
            };

            // 1. Appel API pour insérer la réservation de tickets de sortie
            const response = await reservationService.reserverSortie(req);
            const reservationId = response.data.id || response.data.reservationId;

            if (reservationId) {
                // 2. Appel API pour générer l'adresse Stripe Checkout sécurisée
                const paymentRes = await api.post(`/payments/create-session/${reservationId}`);
                const { url } = paymentRes.data;

                if (url) {
                    window.location.href = url; // Redirection
                } else {
                    alert("Impossible de générer le lien de paiement.");
                }
            } else {
                alert(response.data?.message || "Erreur lors de la création de la réservation.");
            }
        } catch (err) {
            alert("Erreur: " + (err.response?.data?.message || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="touriste-sortie-details min-vh-100 bg-light">
            <Topbar />
            
            <main className="container-fluid pt-2 pb-4 px-lg-5">
                <div className="container-fluid px-lg-4 px-xl-5">
                    <header className="page-header d-flex align-items-center justify-content-between mb-4">
                        <div className="d-flex align-items-center" style={{ flex: '1' }}>
                            <button 
                                onClick={() => navigate('/touriste')} 
                                className="btn btn-sm btn-light border-0 rounded-pill px-3 py-2 fw-700 text-muted d-flex align-items-center transition-all hover-translate-x"
                                style={{ background: '#f1f5f9' }}
                            >
                                <i className="bi bi-arrow-left-short fs-4 me-1"></i> Retour
                            </button>
                        </div>
                        <div className="text-center" style={{ flex: '2' }}>
                            <h1 className="fw-800 text-dark mb-0 fs-1">Bienvenue à <span className="text-primary">{sortie.titre}</span></h1>
                        </div>
                        <div className="d-flex justify-content-end" style={{ flex: '1' }}></div>
                    </header>

                    <div className="row g-4">
                        <div className="col-12">
                            <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
                                <div className="gallery-container bg-secondary-subtle position-relative" style={{ height: '450px' }}>
                                    {images.length > 0 ? (
                                        <img 
                                            src={images[0]} 
                                            alt={sortie.titre} 
                                            className="w-100 h-100 object-fit-cover" 
                                        />
                                    ) : (
                                        <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-light text-muted fs-1">
                                            <i className="bi bi-compass"></i>
                                        </div>
                                    )}
                                    <div className="gallery-overlay d-flex align-items-end z-2">
                                        <div>
                                            <div className="d-flex align-items-center gap-2 mb-3 animate-up">
                                                <span className="badge bg-warning text-dark rounded-pill px-3 py-2 fw-800 shadow-sm">
                                                    Sortie
                                                </span>

                                            </div>
                                            <h1 className="text-white fw-900 display-4 mb-0 animate-up">{sortie.titre}</h1>
                                        </div>
                                    </div>
                                </div>

                                <div className="card-body p-4 p-md-5 animate-up" style={{ animationDelay: '0.2s' }}>
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <h2 className="fw-800 mb-0">À propos de cette sortie</h2>
                                        {user?.id !== sortie.guide?.utilisateur?.id && (
                                            <div className="d-flex align-items-center gap-2">
                                                
                                                <button 
                                                    onClick={() => {
                                                        if (!user) return navigate('/login');
                                                        setContactTarget({ user: sortie.guide?.utilisateur, t: Date.now() });
                                                    }} 
                                                    className="btn-premium btn btn-outline-primary shadow-sm"
                                                >
                                                    <i className="bi bi-chat-dots-fill me-2"></i> Contacter
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        if (!user) {
                                                            navigate('/login');
                                                        } else if (sortie.placesDisponibles !== undefined && sortie.placesDisponibles <= 0) {
                                                            alert("⚠️ Désolé, cette sortie est complète (Sold out).");
                                                        } else {
                                                            setShowResModal(true);
                                                            setStep(0);
                                                        }
                                                    }}
                                                    className="btn-premium btn btn-primary shadow-lg"
                                                    style={{ background: 'var(--premium-orange)', border: 'none' }}
                                                >
                                                    <i className="bi bi-calendar-check-fill me-2"></i> Réserver
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-secondary lead mb-5 fw-500 opacity-75">{sortie.description || "Une magnifique sortie à ne pas manquer ! Vivez des moments uniques et inoubliables à Djerba."}</p>
                                    
                                    <div className="row g-4 mb-4 mt-2">
                                        <div className="col-lg-8">
                                            <h4 className="fw-800 mb-4 d-flex align-items-center">
                                                <i className="bi bi-geo-alt-fill text-danger me-2"></i> Adresse de la sortie
                                            </h4>
                                            <ProviderMapDisplay localisation={sortie.localisation} providerName={sortie.titre} />
                                        </div>
                                        <div className="col-lg-4">
                                            <h4 className="fw-800 mb-4 d-flex align-items-center">
                                                <i className="bi bi-info-circle-fill text-primary me-2"></i> Infos Pratiques
                                            </h4>
                                            <div className="info-glass-card p-0 overflow-hidden">
                                                <div className="d-flex align-items-center p-3 border-bottom border-light-subtle">
                                                    <div className="bg-primary-subtle text-primary rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                                                        <i className="bi bi-geo-alt fs-4"></i>
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <span className="text-muted smaller fw-800 text-uppercase letter-spacing-1 d-block mb-1" style={{ fontSize: '0.65rem' }}>Lieu</span>
                                                        <span className="fw-700 text-body text-truncate d-block fs-6">{sortie.lieu || "Lieu non spécifié"}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="d-flex align-items-center p-3 border-bottom border-light-subtle">
                                                    <div className="bg-info-subtle text-info rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                                                        <i className="bi bi-people fs-4"></i>
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <span className="text-muted smaller fw-800 text-uppercase letter-spacing-1 d-block mb-1" style={{ fontSize: '0.65rem' }}>Places disponibles</span>
                                                        <span className="fw-700 text-body text-truncate d-block fs-6">
                                                            {sortie.placesDisponibles !== undefined && sortie.placesDisponibles > 0 ? (
                                                                `${sortie.placesDisponibles} places restantes`
                                                            ) : (
                                                                <span className="text-danger fw-800">Sold out</span>
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="d-flex align-items-center p-3 border-bottom border-light-subtle">
                                                    <div className="bg-info-subtle text-info rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                                                        <i className="bi bi-envelope-at fs-4"></i>
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <span className="text-muted smaller fw-800 text-uppercase letter-spacing-1 d-block mb-1" style={{ fontSize: '0.65rem' }}>Contact Email</span>
                                                        <span className="fw-700 text-body text-truncate d-block fs-6">{sortie.guide?.utilisateur?.email || "Email non spécifié"}</span>
                                                    </div>
                                                </div>

                                                <div className="d-flex align-items-center p-3 border-bottom border-light-subtle">
                                                    <div className="bg-success-subtle text-success rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                                                        <i className="bi bi-telephone-plus fs-4"></i>
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <span className="text-muted smaller fw-800 text-uppercase letter-spacing-1 d-block mb-1" style={{ fontSize: '0.65rem' }}>Téléphone</span>
                                                        <span className="fw-700 text-body text-truncate d-block fs-6">{sortie.guide?.utilisateur?.telephone || "Téléphone non spécifié"}</span>
                                                    </div>
                                                </div>

                                                <div className="d-flex align-items-center p-3 border-bottom border-light-subtle">
                                                    <div className="bg-warning-subtle text-warning rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                                                        <i className="bi bi-calendar-week fs-4"></i>
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <span className="text-muted smaller fw-800 text-uppercase letter-spacing-1 d-block mb-1" style={{ fontSize: '0.65rem' }}>Jours d'activité</span>
                                                        <span className="fw-700 text-body text-truncate d-block fs-6">
                                                            {(() => {
                                                                const joursStr = sortie.guide?.joursOuverture;
                                                                if (!joursStr) return "Non spécifié";
                                                                const mapping = { '1': 'Lun', '2': 'Mar', '3': 'Mer', '4': 'Jeu', '5': 'Ven', '6': 'Sam', '7': 'Dim' };
                                                                const parts = joursStr.split(',').filter(Boolean).map(day => mapping[day] || day);
                                                                if (parts.length === 7) return "Tous les jours";
                                                                if (parts.length === 5 && joursStr === "1,2,3,4,5") return "Lun - Ven";
                                                                if (parts.length === 6 && joursStr === "1,2,3,4,5,6") return "Lun - Sam";
                                                                return parts.join(', ');
                                                            })()}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="d-flex align-items-center p-3">
                                                    <div className="bg-danger-subtle text-danger rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                                                        <i className="bi bi-clock fs-4"></i>
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <span className="text-muted smaller fw-800 text-uppercase letter-spacing-1 d-block mb-1" style={{ fontSize: '0.65rem' }}>Horaires de service</span>
                                                        <span className="fw-700 text-body text-truncate d-block fs-6">
                                                            {sortie.guide?.heureOuverture && sortie.guide?.heureFermeture 
                                                                ? `${sortie.guide.heureOuverture} - ${sortie.guide.heureFermeture}` 
                                                                : "Non spécifié"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row g-3 mb-5 mt-2">
                                        <div className="col-md-6">
                                            <div className="event-info-pill d-flex align-items-center">
                                                <div className="bg-primary-subtle text-primary rounded-circle p-3 me-3 d-flex align-items-center justify-content-center" style={{ width: '55px', height: '55px' }}>
                                                    <i className="bi bi-calendar-event fs-3"></i>
                                                </div>
                                                <div>
                                                    <span className="text-muted small d-block fw-800 text-uppercase letter-spacing-1" style={{ fontSize: '0.65rem' }}>Date de la sortie</span>
                                                    <span className="fw-800 fs-6 text-body">{formattedDate}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="event-info-pill d-flex align-items-center">
                                                <div className="bg-warning-subtle text-warning rounded-circle p-3 me-3 d-flex align-items-center justify-content-center" style={{ width: '55px', height: '55px' }}>
                                                    <i className="bi bi-ticket-perforated fs-3"></i>
                                                </div>
                                                <div>
                                                    <span className="text-muted small d-block fw-800 text-uppercase letter-spacing-1" style={{ fontSize: '0.65rem' }}>Prix du Ticket</span>
                                                    <div className="d-flex align-items-baseline gap-1">
                                                        <span className="fw-900 fs-4 text-body">{sortie.prix || 0}</span>
                                                        <span className="text-muted fw-700 small">DT</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {sortie.guide && (
                                        <div className="mt-5 p-4 bg-light rounded-4 border-dashed d-flex align-items-center justify-content-between flex-wrap gap-3">
                                            <p className="mb-0 small text-muted fw-600">
                                                <i className="bi bi-info-circle-fill text-primary me-2"></i>
                                                Organisé par le Guide Professionnel <span className="text-primary fw-800">{sortie.guide.utilisateur?.prenom} {sortie.guide.utilisateur?.nom}</span>
                                            </p>
                                            <button 
                                                onClick={() => navigate(`/reserver-sortie/${sortie.guide.id}`)}
                                                className="btn btn-outline-primary btn-sm rounded-pill px-3 py-1 fw-700 hover-scale transition-all d-flex align-items-center gap-1 shadow-sm"
                                            >
                                                <i className="bi bi-eye-fill"></i> Voir Profil
                                            </button>
                                        </div>
                                    )}


                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* MODAL DE RÉSERVATION STYLE CINÉMA/FILM */}
            {showResModal && (
                <div className="modal-overlay animate-fade-in" style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
                    zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                }}>
                    <div className="bg-white rounded-4 shadow-lg overflow-hidden position-relative d-flex flex-column"
                         style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh' }}>
                        
                        <div className="d-flex justify-content-between align-items-center p-4 border-bottom bg-light">
                            <h4 className="fw-800 mb-0 text-dark d-flex align-items-center gap-2">
                                {step === 0 && <><i className="bi bi-ticket-perforated-fill text-warning"></i> Vos billets</>}
                                {step === 1 && <><i className="bi bi-person-fill text-primary"></i> Vos informations</>}
                                {step === 2 && <><i className="bi bi-check-circle-fill text-success"></i> Récapitulatif</>}
                            </h4>
                            <button onClick={() => setShowResModal(false)} className="btn btn-light rounded-circle shadow-sm border p-0 d-flex align-items-center justify-content-center hover-scale" style={{ width: '36px', height: '36px' }}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="p-4 p-md-5 overflow-auto" style={{ flex: '1 1 auto' }}>
                            {step === 0 && (
                                <div className="animate-in-y">
                                    <form onSubmit={handleNextStep}>
                                        <div className="premium-counter mb-4">
                                            <button type="button" className="btn btn-link text-decoration-none px-3" onClick={() => setResForm({ ...resForm, nombreTickets: Math.max(1, resForm.nombreTickets - 1) })} disabled={resForm.nombreTickets <= 1}>
                                                <i className="bi bi-dash-lg"></i>
                                            </button>
                                            <div className="flex-grow-1 text-center">
                                                <span className="d-block counter-label" style={{ fontSize: '0.65rem', marginTop: '2px' }}>Nombre de tickets {((sortie.placesDisponibles) !== undefined) && `(Max ${sortie.placesDisponibles})`}</span>
                                                <span className="fw-800 fs-5 counter-value">{resForm.nombreTickets}</span>
                                            </div>
                                            <button type="button" className="btn btn-link text-decoration-none px-3" onClick={() => setResForm({ ...resForm, nombreTickets: resForm.nombreTickets + 1 })} disabled={((sortie.placesDisponibles) !== undefined) && resForm.nombreTickets >= (sortie.placesDisponibles)}>
                                                <i className="bi bi-plus-lg"></i>
                                            </button>
                                        </div>

                                        <div className="p-4 bg-light rounded-5 border border-dashed mb-4">
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <span className="small fw-700 text-muted">Tickets :</span>
                                                <span className="fw-800 small badge bg-dark rounded-pill px-2">{resForm.nombreTickets}</span>
                                            </div>
                                            <div className="d-flex justify-content-between align-items-baseline pt-2 border-top mt-2">
                                                <span className="fw-800 text-dark">Total</span>
                                                <div className="d-flex align-items-baseline gap-1">
                                                    <span className="fw-800 fs-3 text-primary">{(sortie.prix || 0) * resForm.nombreTickets}</span>
                                                    <span className="text-muted fw-700 small">DT</span>
                                                </div>
                                            </div>
                                        </div>

                                        {!user || (user.role !== 'ROLE_TOURISTE' && user.role !== 'TOURISTE') ? (
                                            <button type="button" onClick={() => navigate('/login')} className="btn btn-primary w-100 py-3 rounded-4 fw-800 shadow-lg text-uppercase letter-spacing-1 border-0 transition-all hover-translate-y">
                                                Connectez-vous pour continuer
                                            </button>
                                        ) : (
                                            <button type="submit" className="btn btn-primary w-100 py-3 rounded-4 fw-800 shadow-lg text-uppercase letter-spacing-1 border-0 transition-all hover-translate-y" style={{ background: '#f97316' }}>
                                                Continuer <i className="bi bi-arrow-right ms-2"></i>
                                            </button>
                                        )}
                                    </form>
                                </div>
                            )}

                            {step === 1 && (
                                <div className="animate-in-y">
                                    <div className="d-flex align-items-center mb-4">
                                        <button type="button" onClick={() => setStep(0)} className="btn btn-link text-decoration-none p-0 fw-700 text-secondary me-3">
                                            <i className="bi bi-chevron-left"></i> Retour
                                        </button>
                                        <h4 className="fw-800 mb-0">Vos informations</h4>
                                    </div>
                                    <form onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
                                        <div className="row g-2 mb-3">
                                            <div className="col-6">
                                                <div className="form-floating">
                                                    <input type="text" className="form-control rounded-3 border-0 bg-light shadow-none" id="cliNom" required value={resForm.clientNom} onChange={e => setResForm({...resForm, clientNom: e.target.value})} />
                                                    <label htmlFor="cliNom">Nom <span className="text-danger">*</span></label>
                                                </div>
                                            </div>
                                            <div className="col-6">
                                                <div className="form-floating">
                                                    <input type="text" className="form-control rounded-3 border-0 bg-light shadow-none" id="cliPre" required value={resForm.clientPrenom} onChange={e => setResForm({...resForm, clientPrenom: e.target.value})} />
                                                    <label htmlFor="cliPre">Prénom <span className="text-danger">*</span></label>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="form-floating mb-3">
                                            <input type="email" className="form-control rounded-3 border-0 bg-light shadow-none" id="cliMail" required value={resForm.clientEmail} onChange={e => setResForm({...resForm, clientEmail: e.target.value})} />
                                            <label htmlFor="cliMail">Email <span className="text-danger">*</span></label>
                                        </div>
                                        <div className="mb-4">
                                            <label className="text-muted fw-600 small mb-1">Téléphone <span className="text-danger">*</span></label>
                                            <PhoneInput
                                                className="border-0 bg-light shadow-none"
                                                value={resForm.clientTelephone}
                                                onChange={val => setResForm({...resForm, clientTelephone: val})}
                                                required
                                            />
                                        </div>

                                        <button type="submit" className="btn btn-primary w-100 py-3 rounded-4 fw-800 shadow-lg text-uppercase letter-spacing-1 border-0 transition-all hover-translate-y" style={{ background: '#f97316' }}>
                                            Voir le récapitulatif
                                        </button>
                                    </form>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="animate-in-y">
                                    <div className="d-flex align-items-center mb-4">
                                        <button type="button" onClick={() => setStep(1)} className="btn btn-link text-decoration-none p-0 fw-700 text-secondary me-3">
                                            <i className="bi bi-chevron-left"></i> Retour
                                        </button>
                                        <h4 className="fw-800 mb-0">Résumé</h4>
                                    </div>

                                    <div className="p-4 bg-light rounded-5 border border-dashed mb-4">
                                        <div className="mb-3 border-bottom pb-2">
                                            <label className="text-secondary smaller fw-800 uppercase letter-spacing-1 d-block mb-1">Sortie</label>
                                            <div className="fw-700 text-dark">{sortie.titre}</div>
                                        </div>
                                        <div className="mb-3 border-bottom pb-2">
                                            <label className="text-secondary smaller fw-800 uppercase letter-spacing-1 d-block mb-1">Nombre de tickets</label>
                                            <div className="fw-700 text-dark">{resForm.nombreTickets} place(s)</div>
                                        </div>
                                        <div className="d-flex justify-content-between align-items-baseline pt-2">
                                            <span className="fw-800 text-muted">Total à payer :</span>
                                            <div className="d-flex align-items-baseline gap-1">
                                                <span className="fw-800 fs-3 text-primary">{(sortie.prix || 0) * resForm.nombreTickets}</span>
                                                <span className="text-muted fw-700 small">DT</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handleConfirmAndPay} 
                                        disabled={submitting} 
                                        className="btn btn-primary w-100 py-3 rounded-4 fw-800 shadow-lg text-uppercase letter-spacing-1 border-0 transition-all hover-translate-y"
                                        style={{ background: '#f97316' }}
                                    >
                                        {submitting ? (
                                            <><span className="spinner-border spinner-border-sm me-2" role="status"></span> Redirection...</>
                                        ) : (
                                            <><i className="bi bi-credit-card-fill me-2"></i> Payer et Réserver</>
                                        )}
                                    </button>
                                    <p className="text-center text-muted small mt-3 fw-600"><i className="bi bi-shield-lock-fill me-1"></i> Paiement sécurisé via Stripe</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {contactTarget && (
                <MessageCenter 
                    recipient={contactTarget.user || contactTarget} 
                    onClose={() => setContactTarget(null)} 
                />
            )}

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
                
                :root {
                    --premium-yellow: #f59e0b;
                    --premium-orange: #f97316;
                }

                .touriste-sortie-details {
                    font-family: 'Outfit', sans-serif;
                }

                .premium-card {
                    background: var(--bg-card);
                    backdrop-filter: blur(10px);
                    border: 1px solid var(--border-glass);
                    border-radius: 2.5rem !important;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                }

                .gallery-container {
                    position: relative;
                    border-radius: 2.5rem;
                    overflow: hidden;
                    box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.6);
                }

                .gallery-overlay {
                    background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 60%);
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    padding: 3rem;
                }

                .info-glass-card {
                    background: var(--bg-glass);
                    border: 1px solid var(--border-glass);
                    border-radius: 1.5rem;
                    padding: 1.25rem;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }

                .info-glass-card:hover {
                    background: var(--bg-glass-hover);
                    transform: translateX(10px) scale(1.02);
                    border-color: var(--premium-yellow);
                    box-shadow: 0 10px 30px -5px rgba(0,0,0,0.3);
                }

                .event-info-pill {
                    background: var(--bg-glass);
                    border: 1px solid var(--border-glass);
                    border-radius: 2rem;
                    padding: 1.5rem;
                    transition: all 0.3s ease;
                }

                .event-info-pill:hover {
                    background: var(--bg-glass-hover);
                    transform: translateY(-5px);
                    border-color: var(--premium-orange);
                }

                .btn-premium {
                    border-radius: 100px;
                    padding: 0.8rem 2.2rem;
                    font-weight: 800;
                    letter-spacing: 0.5px;
                    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                .btn-premium:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 15px 30px -5px rgba(249, 115, 22, 0.4);
                }

                .animate-up {
                    animation: fadeInUp 0.8s ease-out forwards;
                }

                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(40px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .no-scrollbar::-webkit-scrollbar { display: none; }
                
                .form-floating > .form-control:focus ~ label, .form-floating > .form-control:not(:placeholder-shown) ~ label {
                    transform: scale(.85) translateY(-.75rem) translateX(.15rem);
                    color: var(--premium-orange);
                }

                .animate-fade-in { animation: fade-in 0.3s ease-out; }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </div>
    );
};

export default SortieDirectDetails;
