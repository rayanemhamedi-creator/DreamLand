// Importation des hooks React nécessaires
import React, { useState, useEffect, useContext } from 'react';
// Hooks de navigation et lecture des paramètres d'URL
import { useLocation, useNavigate, useParams } from 'react-router-dom';
// Services REST pour les appels API
import api from '../../services/api';
import reservationService from '../../services/reservationService';
// Contexte d'authentification
import { AuthContext } from '../../context/AuthContext';
// Composants de mise en page et utilitaires UI
import Topbar from '../../components/layout/Topbar';
import MessageCenter from '../../components/messagerie/CentreMessagerie';
import ProviderMapDisplay from '../../components/espace-client/AffichageCarte';
import PhoneInput from '../../components/common/PhoneInput';



const EvenementDetails = () => {
    // Identifiant de l'événement ou du film récupéré depuis l'URL
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    // Données de l'événement transmises via la navigation React Router
    const item = location.state?.item;
    const { user, logout } = useContext(AuthContext);

    // États locaux du composant
    const [event, setEvent] = useState(item || null); // Données complètes de l'événement ou du film
    const [loading, setLoading] = useState(!item); // Chargement initial (évité si item déjà disponible)
    const [fetchError, setFetchError] = useState(null); // Message d'erreur éventuel
    const [step, setStep] = useState(0); // Étape de la modale : 0=Tickets, 1=Infos, 2=Récap
    const [showResModal, setShowResModal] = useState(false); // Visibilité de la modale
    // Formulaire de réservation pré-rempli avec les infos du touriste connecté
    const [resForm, setResForm] = useState({
        nombreTickets: 1,
        clientNom: user?.nom || '',
        clientPrenom: user?.prenom || '',
        clientEmail: user?.email || '',
        clientTelephone: user?.telephone || ''
    });
    const [submitting, setSubmitting] = useState(false); // Verrou pendant la transaction Stripe
    const [contactTarget, setContactTarget] = useState(null); // Cible de messagerie


    // Effet : chargement des détails de l'événement depuis l'API
    // Stratégie de fallback : si ce n'est pas un événement, on essaie de le charger comme film
    useEffect(() => {
        const fetchDetails = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const resp = await api.get(`/evenements/${id}`);
                // Vérification que la réponse contient bien un objet valide avec un id
                if (resp.data && resp.data.id) {
                    setEvent(resp.data);
                    setFetchError(null);
                } else {
                    // Réponse vide : ce n'est pas un événement, on essaie comme film
                    throw new Error('Not an event');
                }
            } catch (err) {
                console.log("Not an event, checking if it is a film...", err);
                try {
                    // Fallback : tentative de récupération de l'entité en tant que film de cinéma
                    const filmResp = await api.get(`/films/${id}`);
                    if (filmResp.data && filmResp.data.id) {
                        setEvent({
                            ...filmResp.data,
                            category: 'Cinéma',
                            type: 'FILM',
                            nom: filmResp.data.titre,
                            organisateur: filmResp.data.cinema?.utilisateur?.nom || filmResp.data.cinema?.nom || 'Cinéma'
                        });
                        setFetchError(null);
                    } else {
                        setFetchError("Film introuvable.");
                    }
                } catch (filmErr) {
                    console.error("Erreur chargement évènement/film:", filmErr);
                    setFetchError("Impossible de charger les détails.");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id]);

    // Fusion des données reçues via navigation et celles chargées depuis l'API
    const eventData = event || item;
    const [organizerEtab, setOrganizerEtab] = useState(null);

    // Effet : récupération de l'établissement lié à l'organisateur de l'événement
    useEffect(() => {
        const fetchOrganizerEtab = async () => {
            const userId = eventData?.utilisateur?.id || item?.utilisateur?.id;
            if (!userId) return;
            try {
                const resp = await api.get(`/utilisateurs/${userId}/etablissement`);
                setOrganizerEtab(resp.data);
            } catch (err) {
                console.error("Erreur chargement établissement organisateur:", err);
            }
        };
        if (eventData || item) {
            fetchOrganizerEtab();
        }
    }, [eventData, item]);

    // Galerie d'images extraite depuis une chaîne de caractères CSV
    const images = eventData?.urlImage ? eventData.urlImage.split(',').filter(Boolean) : [];
    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

    // Rotation automatique des photos : changement toutes les 5 secondes
    React.useEffect(() => {
        if (images.length > 1) {
            const interval = setInterval(() => {
                setCurrentImageIndex((prev) => (prev + 1) % images.length);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [images.length]);

    if (loading) {
        return (
            <div className="loading-screen text-center">
                <div className="loading-spinner"></div>
                <h3 className="fw-700 mt-4 text-secondary">🎭 Préparation du spectacle...</h3>
                <p className="text-muted small">Mise à jour des dernières places disponibles</p>
            </div>
        );
    }

    if (fetchError || (!event && !item)) {
        return (
            <div className="container py-5 mt-5 text-center">
                <div className="alert alert-danger shadow-sm border-0 rounded-4 p-5">
                    <i className="bi bi-exclamation-triangle-fill display-1 mb-4"></i>
                    <h2 className="fw-800 mb-3">{fetchError || "Évènement introuvable"}</h2>
                    <button onClick={() => navigate(user && (user.role === 'ROLE_TOURISTE' || user.role === 'TOURISTE') ? '/touriste' : '/')} className="btn btn-primary rounded-pill px-4 fw-700">Retour au Dashboard</button>
                </div>
            </div>
        );
    }

    // Validation de la date et passage à l'étape 1 (coordonnées)
    const handleNextStep = (e) => {
        e.preventDefault();
        // Récupère la date de l'événement selon son type (projection, spectacle, etc.)
        const eventDateStr = eventData.dateProjection || eventData.dateSpectacle || eventData.dateDebut;
        if (eventDateStr && new Date(eventDateStr) < new Date()) {
            alert("❌ Vous ne pouvez pas réserver pour une date/heure déjà passée. Veuillez choisir un évènement à venir.");
            return;
        }
        setStep(1);
    };

    // Soumission finale : insertion de la réservation + initiation Stripe
    // Branchement conditionnel : cinéma (reserverCinema) vs événement générique (reserverEvenement)
    const handleConfirmAndPay = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const req = { 
                idEvenement: id, 
                nombreTickets: resForm.nombreTickets,
                clientNom: resForm.clientNom,
                clientPrenom: resForm.clientPrenom,
                clientEmail: resForm.clientEmail,
                clientTelephone: resForm.clientTelephone,
                prixTotal: (eventData.prix || 0) * resForm.nombreTickets
            };
            
            let response;
            // Sélection du service de réservation selon la catégorie de l'événement
            if (eventData.category === 'Cinéma') {
                response = await reservationService.reserverCinema(req);
            } else {
                response = await reservationService.reserverEvenement(req);
            }

            const reservationId = response.data.id || response.data.reservationId;

            if (reservationId) {
                // Création de la session de paiement Stripe sécurisée
                const paymentRes = await api.post(`/payments/create-session/${reservationId}`);
                const { url } = paymentRes.data;

                if (url) {
                    window.location.href = url; // Redirection vers Stripe Checkout
                } else {
                    alert("Impossible de générer le lien de paiement.");
                }
            } else {
                alert(response.data?.message || "Erreur lors de la création de la réservation.");
            }
        } catch (err) {
            alert("Erreur réseau ou places indisponibles: " + (err.response?.data?.message || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    // Passage à l'étape récapitulative (step 2)
    const handleStep1Submit = (e) => {
        e.preventDefault();
        setStep(2);
    };

    // Date unifiée selon le type d'entité (film, spectacle, événement)
    const eventDate = eventData.dateProjection || eventData.dateSpectacle || eventData.dateDebut;
    // Détection du type pour adapter les libellés ("film" vs "événement")
    const isFilm = eventData.cinema || eventData.category === 'Cinéma';

    return (
        <div className="touriste-event-details min-vh-100 bg-light">
            <Topbar />
            <main className="container-fluid pt-2 pb-4 px-lg-5">
                <div className="container-fluid px-lg-4 px-xl-5">
                    <header className="page-header d-flex align-items-center justify-content-between mb-4">
                        <div className="d-flex align-items-center" style={{ flex: '1' }}>
                            <button 
                                onClick={() => navigate(user && (user.role === 'ROLE_TOURISTE' || user.role === 'TOURISTE') ? '/touriste' : '/')} 
                                className="btn btn-sm btn-light border-0 rounded-pill px-3 py-2 fw-700 text-muted d-flex align-items-center transition-all hover-translate-x"
                                style={{ background: '#f1f5f9' }}
                            >
                                <i className="bi bi-arrow-left-short fs-4 me-1"></i> Retour
                            </button>
                        </div>
                        <div className="text-center" style={{ flex: '2' }}>
                            <h1 className="fw-800 text-dark mb-0 fs-1">Bienvenue à <span className="text-primary">{eventData.titre || eventData.nom}</span></h1>
                        </div>
                        <div className="d-flex justify-content-end" style={{ flex: '1' }}></div>
                    </header>

                    <div className="row g-4">
                        <div className="col-12">
                            <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
                                <div className="gallery-container bg-secondary-subtle position-relative" style={{ height: '450px' }}>
                                    {images.length > 0 ? (
                                        <>
                                            {images.map((img, idx) => (
                                                <img 
                                                    key={idx}
                                                    src={img} 
                                                    alt={`${eventData.titre} - ${idx + 1}`} 
                                                    className={`w-100 h-100 object-fit-cover position-absolute top-0 start-0 transition-opacity duration-1000 ${idx === currentImageIndex ? 'opacity-100' : 'opacity-0'}`} 
                                                    style={{ transition: 'opacity 1.5s ease-in-out' }}
                                                />
                                            ))}
                                            {images.length > 1 && (
                                                <div className="slideshow-indicators position-absolute bottom-0 start-50 translate-middle-x mb-4 d-flex gap-2 z-3">
                                                    {images.map((_, idx) => (
                                                        <div 
                                                            key={idx} 
                                                            className={`rounded-pill transition-all ${idx === currentImageIndex ? 'bg-white w-4' : 'bg-white opacity-50 w-2'}`}
                                                            style={{ height: '4px', width: idx === currentImageIndex ? '30px' : '10px', cursor: 'pointer' }}
                                                            onClick={() => setCurrentImageIndex(idx)}
                                                        ></div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-light text-muted fs-1">
                                            <i className="bi bi-ticket-detailed"></i>
                                        </div>
                                    )}
                                    <div className="gallery-overlay d-flex align-items-end z-2">
                                        <div>
                                            <div className="d-flex align-items-center gap-2 mb-3 animate-up">
                                                <span className="badge bg-warning text-dark rounded-pill px-3 py-2 fw-800 shadow-sm">
                                                    {eventData.category === 'Cinéma' ? (eventData.genre || 'Film') : 'Événement Exclusif'}
                                                </span>

                                            </div>
                                            <h1 className="text-white fw-900 display-4 mb-0 animate-up" style={{ animationDelay: '0.1s' }}>{eventData.titre || eventData.nom}</h1>
                                        </div>
                                    </div>
                                </div>
                                <div className="card-body p-4 p-md-5 animate-up" style={{ animationDelay: '0.2s' }}>
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <h2 className="fw-800 mb-0">À propos de ce {isFilm ? 'film' : 'événement'}</h2>
                                        {user?.id !== eventData.utilisateur?.id && (
                                            <div className="d-flex align-items-center gap-2">
                                                <button 
                                                    onClick={() => {
                                                        if (!user) return navigate('/login');
                                                        const targetUser = eventData.cinema?.utilisateur || eventData.utilisateur;
                                                        setContactTarget({ user: targetUser, t: Date.now() });
                                                    }} 
                                                    className="btn-premium btn btn-outline-primary shadow-sm"
                                                >
                                                    <i className="bi bi-chat-dots-fill me-2"></i> Contacter
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                         if (!user) {
                                                             navigate('/login');
                                                         } else if (eventData.placesDisponibles !== undefined && eventData.placesDisponibles <= 0) {
                                                             alert("⚠️ Désolé, cet événement / film est complet (Sold out).");
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
                                    <p className="text-secondary lead mb-5 fw-500 opacity-75">{eventData.description || (isFilm ? "Un film à ne pas manquer ! Vivez une expérience cinématographique unique à Djerba." : "Un évènement à ne pas manquer ! Vivez des moments culturels et festifs uniques à Djerba.")}</p>
                                    
                                    <div className="row g-4 mb-4 mt-2">
                                        <div className="col-lg-8">
                                            <h4 className="fw-800 mb-4 d-flex align-items-center">
                                                <i className="bi bi-geo-alt-fill text-danger me-2"></i> Adresse {isFilm ? 'du cinéma' : "de l'évènement"}
                                            </h4>
                                            <ProviderMapDisplay localisation={eventData.localisation || eventData.cinema?.localisation} providerName={eventData.titre || eventData.nom} />
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
                                                        <span className="fw-700 text-body text-truncate d-block fs-6">{eventData.cinema?.adresse || eventData.lieu || "Lieu non spécifié"}</span>
                                                    </div>
                                                </div>

                                                <div className="d-flex align-items-center p-3 border-bottom border-light-subtle">
                                                    <div className="bg-warning-subtle text-warning rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                                                        <i className="bi bi-ticket-perforated fs-4"></i>
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <span className="text-muted smaller fw-800 text-uppercase letter-spacing-1 d-block mb-1" style={{ fontSize: '0.65rem' }}>Places disponibles</span>
                                                        <span className="fw-700 text-body text-truncate d-block fs-6">{eventData.placesDisponibles !== undefined ? (
                                                            eventData.placesDisponibles > 0 ? (
                                                                `${eventData.placesDisponibles} places restantes`
                                                            ) : (
                                                                <span className="text-danger fw-800">Sold out</span>
                                                            )
                                                        ) : "Non spécifié"}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="d-flex align-items-center p-3 border-bottom border-light-subtle">
                                                    <div className="bg-info-subtle text-info rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                                                        <i className="bi bi-envelope-at fs-4"></i>
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <span className="text-muted smaller fw-800 text-uppercase letter-spacing-1 d-block mb-1" style={{ fontSize: '0.65rem' }}>Contact Email</span>
                                                        <span className="fw-700 text-body text-truncate d-block fs-6">{eventData.cinema?.utilisateur?.email || eventData.utilisateur?.email || "Email non spécifié"}</span>
                                                    </div>
                                                </div>

                                                <div className="d-flex align-items-center p-3">
                                                    <div className="bg-success-subtle text-success rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                                                        <i className="bi bi-telephone-plus fs-4"></i>
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <span className="text-muted smaller fw-800 text-uppercase letter-spacing-1 d-block mb-1" style={{ fontSize: '0.65rem' }}>Téléphone</span>
                                                        <span className="fw-700 text-body text-truncate d-block fs-6">{eventData.cinema?.utilisateur?.telephone || eventData.utilisateur?.telephone || "Téléphone non spécifié"}</span>
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
                                                    <span className="text-muted small d-block fw-800 text-uppercase letter-spacing-1" style={{ fontSize: '0.65rem' }}>Date {isFilm ? 'du film' : "de l'événement"}</span>
                                                    <span className="fw-800 fs-6 text-body">{eventDate ? new Date(eventDate).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'À venir'}</span>
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
                                                        <span className="fw-900 fs-4 text-body">{eventData?.prix || item?.prix || 0}</span>
                                                        <span className="text-muted fw-700 small">DT</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {(() => {
                                        const isCinemaFilm = eventData?.category === 'Cinéma' || item?.category === 'Cinéma';
                                        const cinemaName = eventData?.cinema?.nom || eventData?.cinema?.utilisateur?.nom || item?.cinema?.nom || item?.cinema?.utilisateur?.nom || eventData?.organisateur || item?.organisateur || 'Cinéma';
                                        const cinemaId = eventData?.cinema?.id || item?.cinema?.id;

                                        let profileUrl = null;
                                        if (isCinemaFilm && cinemaId) {
                                            profileUrl = `/cinema/${cinemaId}`;
                                        } else if (organizerEtab && organizerEtab.type !== 'UNKNOWN') {
                                            if (organizerEtab.type === 'HOTEL') profileUrl = `/hotel/${organizerEtab.id}`;
                                            else if (organizerEtab.type === 'RESTAURANT') profileUrl = `/reservation-resto/${organizerEtab.id}`;
                                            else if (organizerEtab.type === 'CINEMA') profileUrl = `/cinema/${organizerEtab.id}`;
                                            else if (organizerEtab.type === 'SPORT') profileUrl = `/reserver-sport/${organizerEtab.id}`;
                                            else if (organizerEtab.type === 'GUIDE') profileUrl = `/reserver-sortie/${organizerEtab.id}`;
                                        }

                                        return (
                                            <div className="mt-5 p-4 bg-light rounded-4 border-dashed d-flex align-items-center justify-content-between flex-wrap gap-3">
                                                <p className="mb-0 small text-muted fw-600">
                                                    <i className="bi bi-info-circle-fill text-primary me-2"></i>
                                                    {isCinemaFilm ? (
                                                        <>
                                                            Diffusé par le cinéma <span className="text-primary fw-800">{cinemaName}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            Organisé par <span className="text-primary fw-800">{eventData?.organisateur || item?.organisateur || 'Établissement DreamLand'}</span>
                                                        </>
                                                    )}
                                                </p>
                                                {profileUrl && (
                                                    <button 
                                                        onClick={() => navigate(profileUrl)} 
                                                        className="btn btn-outline-primary btn-sm rounded-pill px-3 py-1 fw-700 hover-scale transition-all d-flex align-items-center gap-1 shadow-sm"
                                                    >
                                                        <i className="bi bi-eye-fill"></i> Voir Profil
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })()}


                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* MODAL DE RÉSERVATION */}
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
                                    {step === 3 && <><i className="bi bi-award-fill text-warning"></i> Confirmation</>}
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
                                                    <span className="d-block counter-label" style={{ fontSize: '0.65rem', marginTop: '2px' }}>Nombre de tickets {((eventData?.placesDisponibles || item?.placesDisponibles) !== undefined) && `(Max ${eventData?.placesDisponibles || item?.placesDisponibles})`}</span>
                                                    <span className="fw-800 fs-5 counter-value">{resForm.nombreTickets}</span>
                                                </div>
                                                <button type="button" className="btn btn-link text-decoration-none px-3" onClick={() => setResForm({ ...resForm, nombreTickets: resForm.nombreTickets + 1 })} disabled={((eventData?.placesDisponibles || item?.placesDisponibles) !== undefined) && resForm.nombreTickets >= (eventData?.placesDisponibles || item?.placesDisponibles)}>
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
                                                        <span className="fw-800 fs-3 text-primary">{(eventData?.prix || item?.prix || 0) * resForm.nombreTickets}</span>
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
                                        <form onSubmit={handleStep1Submit}>
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
                                                <label className="text-secondary smaller fw-800 uppercase letter-spacing-1 d-block mb-1">{isFilm ? 'Film' : 'Évènement'}</label>
                                                <div className="fw-700 text-dark">{eventData.titre || eventData.nom}</div>
                                            </div>
                                            <div className="mb-3 border-bottom pb-2">
                                                <label className="text-secondary smaller fw-800 uppercase letter-spacing-1 d-block mb-1">Nombre de tickets</label>
                                                <div className="fw-700 text-dark">{resForm.nombreTickets} place(s)</div>
                                            </div>
                                            <div className="d-flex justify-content-between align-items-baseline pt-2">
                                                <span className="fw-800 text-muted">Total à payer :</span>
                                                <div className="d-flex align-items-baseline gap-1">
                                                    <span className="fw-800 fs-3 text-primary">{(eventData.prix || 0) * resForm.nombreTickets}</span>
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

                                {step === 3 && (
                                    <div className="text-center py-5 animate-in-y">
                                        <div className="display-1 text-success mb-4 animate-bounce"><i className="bi bi-check-circle-fill"></i></div>
                                        <h2 className="fw-800 text-dark mb-3">C'est validé !</h2>
                                        <p className="text-secondary mb-5 lh-lg">
                                            Vos <strong>{resForm.nombreTickets}</strong> billets ont bien été réservés. Ils sont disponibles dans votre espace personnel.
                                        </p>
                                        <button onClick={() => { setShowResModal(false); navigate('/touriste'); }} className="btn btn-primary w-100 py-3 rounded-pill fw-800 shadow-sm border-0 transition-all hover-scale">
                                            Retour à l'accueil
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
                    
                    :root {
                        --premium-yellow: #f59e0b;
                        --premium-orange: #f97316;
                    }

                    .touriste-evenement-details {
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
            </main>
            {contactTarget && (
                <MessageCenter 
                    onClose={() => setContactTarget(null)} 
                    initialInterlocutor={contactTarget} 
                />
            )}
        </div>
    );
};

export default EvenementDetails;
