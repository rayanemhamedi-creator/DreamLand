// Importation des dépendances React fondamentales
import React, { useState, useEffect, useContext } from 'react';
// Hooks de navigation et paramètres d'URL
import { useLocation, useNavigate, useParams } from 'react-router-dom';
// Services API REST de l'application
import api from '../../services/api';
import reservationService from '../../services/reservationService';
import evenementService from '../../services/evenementService';
// Contexte d'authentification utilisateur
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
// Composants de l'UI
import Topbar from '../../components/layout/Topbar';
import MessageCenter from '../../components/messagerie/CentreMessagerie';
import ProviderMapDisplay from '../../components/espace-client/AffichageCarte';
import AvisStats from '../../components/reviews/AvisStats';
import AvisForm from '../../components/reviews/AvisForm';
import '../../components/reviews/Avis.css';
import PhoneInput from '../../components/common/PhoneInput';

const SortieDetails = () => {
    // Récupération de l'ID du guide depuis l'URL
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    // Objet guide passé via le state de navigation
    const item = location.state?.item;
    // Récupération de l'utilisateur connecté
    const { user, logout } = useContext(AuthContext);
    
    // États pour le processus d'achat de tickets (étape, visibilité, chargements)
    const [step, setStep] = useState(0); // 0 = Choix tickets, 1 = Coordonnées, 2 = Résumé de paiement, 3 = Succès
    const [showResModal, setShowResModal] = useState(false); // Modal de réservation
    const [sorties, setSorties] = useState([]); // Liste des excursions/sorties du guide
    const [loading, setLoading] = useState(true); // Indicateur de chargement initial
    const [submitting, setSubmitting] = useState(false); // Indicateur de chargement lors du paiement Stripe
    const [isDirectRes, setIsDirectRes] = useState(false); // Réservation lancée depuis la liste ou en global
    
    // Formulaire de réservation pré-rempli avec les infos du touriste
    const [resForm, setResForm] = useState({
        sortieId: '',
        dateSortie: '',
        nombreTickets: 1,
        clientNom: user?.nom || '',
        clientPrenom: user?.prenom || '',
        clientEmail: user?.email || '',
        clientTelephone: user?.telephone || '',
    });
    const [guide, setGuide] = useState(item); // Données du guide
    const [contactTarget, setContactTarget] = useState(null); // Prestataire à contacter via la messagerie
    const [avisStats, setAvisStats] = useState({ pourcentageMoyenne: 0, nombreTotalAvis: 0 }); // Avis du guide

    // Récupération des notes et avis clients sur le guide
    const fetchAvisStats = async () => {
        try {
            const res = await api.get(`/avis/moyenne/GUIDE/${id}`);
            setAvisStats(res.data);
        } catch (err) {
            console.error("Erreur stats avis:", err);
        }
    };

    // Chargement initial des informations complètes du profil de ce guide
    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const resp = await api.get(`/guides/${id}`);
                setGuide(resp.data);
            } catch (err) {
                console.error("Erreur chargement détails guide:", err);
            }
        };
        fetchDetails();
        fetchAvisStats();
    }, [id]);

    // Chargement de l'ensemble des excursions (sorties) futures reliées à ce guide spécifique
    useEffect(() => {
        const load = async () => {
            try {
                const allSorties = await evenementService.getTousLesSorties();
                const guideId = id || item?.id;
                const now = new Date();
                const guideSorties = allSorties
                    .filter(s => s.guide?.id === parseInt(guideId))
                    .filter(s => {
                        if (!s.dateSortie) return false;
                        let parsedDate = Array.isArray(s.dateSortie)
                            ? new Date(s.dateSortie[0], s.dateSortie[1] - 1, s.dateSortie[2], s.dateSortie[3] || 0, s.dateSortie[4] || 0)
                            : new Date(s.dateSortie);
                        return parsedDate >= now; // Uniquement les excursions à venir
                    });
                setSorties(guideSorties);
                if (guideSorties.length > 0) {
                    const preselectedId = location.state?.sortieId;
                    const defaultSortie = guideSorties.find(s => s.id === preselectedId) || guideSorties[0];
                    setResForm(prev => ({
                        ...prev,
                        sortieId: defaultSortie.id,
                        dateSortie: defaultSortie.dateSortie
                    }));
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, item]);

    const guideData = guide || item;
    const guideName = guideData?.utilisateur
        ? `${guideData.utilisateur.prenom} ${guideData.utilisateur.nom}`
        : (guideData?.nom && guideData.nom !== 'undefined undefined' ? guideData.nom : (guideData?.prenom && guideData.nom ? `${guideData.prenom} ${guideData.nom}` : "Guide Professionnel"));
    const selectedSortie = (sorties || []).find(s => s.id === parseInt(resForm.sortieId));
    const images = guideData?.urlImage ? guideData.urlImage.split(',').filter(Boolean) : [];
    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

    // Diaporama d'images : rotation toutes les 5 secondes
    React.useEffect(() => {
        if (images.length > 1) {
            const interval = setInterval(() => {
                setCurrentImageIndex((prev) => (prev + 1) % images.length);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [images.length]);

    if (!item && !guide && !loading) {
        return (
            <div className="container py-5 mt-5 text-center">
                <div className="alert alert-warning shadow-sm border-0 rounded-4 p-5">
                    <i className="bi bi-search display-1 mb-4"></i>
                    <h2 className="fw-800 mb-3">Guide introuvable</h2>
                    <button onClick={() => navigate(user && (user.role === 'ROLE_TOURISTE' || user.role === 'TOURISTE') ? '/touriste' : '/')} className="btn btn-primary rounded-pill px-4 fw-700">Retour au Dashboard</button>
                </div>
            </div>
        );
    }

    // Validation des critères de l'étape 0 avant d'accéder au formulaire de contact
    const handleNextStep = (e) => {
        e.preventDefault();
        if (!resForm.sortieId) {
            alert("Aucune sortie sélectionnée.");
            return;
        }

        if (selectedSortie && new Date(selectedSortie.dateSortie) < new Date()) {
            alert("❌ Vous ne pouvez pas réserver pour une date/heure déjà passée. Veuillez choisir une sortie à venir.");
            return;
        }
        
        setStep(1);
    };

    // Communication avec le serveur backend pour insérer la réservation de l'excursion puis redirection Stripe
    const handleConfirmAndPay = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const req = {
                sortieId: resForm.sortieId,
                dateSortie: resForm.dateSortie,
                nombreTickets: resForm.nombreTickets,
                clientNom: resForm.clientNom,
                clientPrenom: resForm.clientPrenom,
                clientEmail: resForm.clientEmail,
                clientTelephone: resForm.clientTelephone,
                prixTotal: (selectedSortie?.prix || 0) * resForm.nombreTickets
            };

            // 1. Création de l'enregistrement de réservation dans la BD
            const response = await reservationService.reserverSortie(req);
            const reservationId = response.data.id || response.data.reservationId;

            if (reservationId) {
                // 2. Initialisation de la transaction Stripe en créant un ID de session sécurisé
                const paymentRes = await api.post(`/payments/create-session/${reservationId}`);
                const { url } = paymentRes.data;

                if (url) {
                    window.location.href = url; // Redirection directe vers Stripe Checkout
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

    // Soumission du formulaire de coordonnées touristes pour passer à l'étape récapitulative (Step 2)
    const handleStep1Submit = (e) => {
        e.preventDefault();
        setStep(2);
    };

    if (!guide && !item) {
        return (
            <div className="loading-screen text-center">
                <div className="loading-spinner"></div>
                <h3 className="fw-700 mt-4 text-secondary">🗺️ Préparation de votre sortie...</h3>
                <p className="text-muted small">Recherche des meilleurs guides de Djerba</p>
            </div>
        );
    }

    return (
        <div className="touriste-sortie-details min-vh-100 bg-light">
            <Topbar />
            
            <main className="container-fluid pt-2 pb-4 px-lg-5">
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
                            <h1 className="fw-800 text-dark mb-0 fs-1">Bienvenue à <span className="text-primary">{guideName}</span></h1>
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
                                                    alt={`${guideName} - ${idx + 1}`} 
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
                                        <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-light text-muted fs-1 border">
                                            <i className="bi bi-compass"></i>
                                        </div>
                                    )}
                                    <div className="gallery-overlay d-flex align-items-end z-2">
                                        <div>
                                            <div className="d-flex align-items-center gap-2 mb-3 animate-up">
                                                <span className="badge bg-success rounded-pill px-3 py-2 fw-800 shadow-sm">Guide Professionnel</span>
                                                <div className="text-warning d-flex align-items-center gap-1">
                                                    {[...Array(5)].map((_, i) => {
                                                        const rating = avisStats.nombreTotalAvis > 0 ? Math.round((avisStats.pourcentageMoyenne / 100) * 5) : 0;
                                                        return <i key={i} className={`bi ${i < rating ? 'bi-star-fill' : 'bi-star'}`}></i>;
                                                    })}
                                                    <span className="text-white small fw-700 ms-2 opacity-75">
                                                        {avisStats.nombreTotalAvis > 0 ? `(${avisStats.nombreTotalAvis} avis)` : '(Nouveau)'}
                                                    </span>
                                                </div>
                                            </div>
                                            <h1 className="text-white fw-900 display-4 mb-0 animate-up" style={{ animationDelay: '0.1s' }}>{guideName}</h1>
                                        </div>
                                    </div>
                                </div>
                                <div className="card-body p-4 p-md-5 animate-up" style={{ animationDelay: '0.2s' }}>
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <h2 className="fw-800 mb-0">À propos de votre guide</h2>
                                        {user?.id !== guideData.utilisateur?.id && (
                                            <div className="d-flex align-items-center gap-2">
                                                <button 
                                                    onClick={() => !user ? navigate('/login') : setContactTarget({ user: guideData.utilisateur, t: Date.now() })} 
                                                    className="btn-premium btn btn-outline-primary shadow-sm"
                                                >
                                                    <i className="bi bi-chat-dots-fill me-2"></i> Contacter
                                                </button>
                                                <button 
                                                    onClick={() => !user ? navigate('/login') : (setShowResModal(true), setStep(0), setIsDirectRes(false))} 
                                                    className="btn-premium btn btn-primary shadow-lg"
                                                    style={{ background: 'var(--premium-orange)', border: 'none' }}
                                                >
                                                    <i className="bi bi-calendar-check-fill me-2"></i> Réserver
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-secondary lead mb-5 fw-500 opacity-75">{guideData.description || "Votre guide idéal pour découvrir Djerba. Passionné par l'histoire et les paysages de l'île, je vous accompagne pour des moments inoubliables."}</p>
                                    
                                    <div className="row g-4 mb-4 mt-2">
                                        <div className="col-lg-8">
                                            <h4 className="fw-800 mb-4 d-flex align-items-center">
                                                <i className="bi bi-geo-alt-fill text-danger me-2"></i> Adresse du Guide
                                            </h4>
                                            <ProviderMapDisplay localisation={guideData.localisation} providerName={guideName} />
                                        </div>
                                        <div className="col-lg-4">
                                            <h4 className="fw-800 mb-4 d-flex align-items-center">
                                                <i className="bi bi-info-circle-fill text-primary me-2"></i> Infos Pratiques
                                            </h4>
                                            <div className="info-glass-card p-0 overflow-hidden">
                                                <div className="d-flex align-items-center p-3 border-bottom border-light-subtle">
                                                    <div className="bg-primary-subtle text-primary rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                                                        <i className="bi bi-compass fs-4"></i>
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <span className="text-muted smaller fw-800 text-uppercase letter-spacing-1 d-block mb-1" style={{ fontSize: '0.65rem' }}>Zone d'activité</span>
                                                        <span className="fw-700 text-body text-truncate d-block fs-6">{guideData.adresse || "Djerba, Tunisie"}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="d-flex align-items-center p-3 border-bottom border-light-subtle">
                                                    <div className="bg-info-subtle text-info rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                                                        <i className="bi bi-envelope-at fs-4"></i>
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <span className="text-muted smaller fw-800 text-uppercase letter-spacing-1 d-block mb-1" style={{ fontSize: '0.65rem' }}>Contact Email</span>
                                                        <span className="fw-700 text-body text-truncate d-block fs-6">{guideData?.utilisateur?.email || item?.email || "Email non spécifié"}</span>
                                                    </div>
                                                </div>

                                                <div className="d-flex align-items-center p-3 border-bottom border-light-subtle">
                                                    <div className="bg-success-subtle text-success rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                                                        <i className="bi bi-telephone-plus fs-4"></i>
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <span className="text-muted smaller fw-800 text-uppercase letter-spacing-1 d-block mb-1" style={{ fontSize: '0.65rem' }}>Téléphone</span>
                                                        <span className="fw-700 text-body text-truncate d-block fs-6">{guideData?.utilisateur?.telephone || item?.telephone || "Téléphone non spécifié"}</span>
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
                                                                const joursStr = guideData?.joursOuverture;
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
                                                            {guideData?.heureOuverture && guideData?.heureFermeture 
                                                                ? `${guideData.heureOuverture} - ${guideData.heureFermeture}` 
                                                                : "Non spécifié"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <h3 className="fw-800 mb-4 mt-5 d-flex align-items-center">
                                        <i className="bi bi-map text-primary me-2"></i> Sorties Proposées
                                    </h3>
                                    <div className="table-responsive rounded-4 border overflow-hidden mt-3">
                                        <table className="table table-hover align-middle mb-0">
                                            <thead className="bg-light">
                                                <tr>
                                                    <th className="px-4 py-3 border-0 small fw-800 text-muted text-uppercase">Affiche</th>
                                                    <th className="py-3 border-0 small fw-800 text-muted text-uppercase">Sortie</th>
                                                    <th className="py-3 border-0 small fw-800 text-muted text-uppercase">Lieu</th>
                                                    <th className="py-3 border-0 small fw-800 text-muted text-uppercase">Date</th>
                                                    <th className="py-3 border-0 small fw-800 text-muted text-uppercase">Prix</th>
                                                    <th className="py-3 border-0 text-end pe-4 small fw-800 text-muted text-uppercase">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loading ? (
                                                    <tr>
                                                        <td colSpan="6" className="text-center py-5">
                                                            <div className="spinner-border text-primary" role="status"></div>
                                                            <p className="mt-2 fw-700 text-muted">Exploration des sorties...</p>
                                                        </td>
                                                    </tr>
                                                ) : sorties.length > 0 ? sorties.map(s => (
                                                    <tr key={s.id} className="film-row">
                                                        <td className="px-4 py-4 border-light">
                                                            {s.urlImage ? (
                                                                <img src={s.urlImage} alt={s.titre} className="rounded-3 shadow-sm" style={{ width: '55px', height: '80px', objectFit: 'cover' }} />
                                                            ) : (
                                                                <div className="bg-light rounded-3 d-flex align-items-center justify-content-center text-muted" style={{ width: '55px', height: '80px' }}>
                                                                    <i className="bi bi-map fs-3 opacity-25"></i>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-4 border-light">
                                                            <div className="fw-800 text-body mb-1">{s.titre}</div>
                                                            <div className="text-muted small d-flex align-items-center gap-1">
                                                                <i className="bi bi-person-fill text-primary"></i> {s.placesDisponibles !== undefined ? (
                                                                    s.placesDisponibles > 0 ? `${s.placesDisponibles} places max` : <span className="text-danger fw-800">Sold out</span>
                                                                ) : 'Places non limitées'}
                                                            </div>
                                                        </td>
                                                        <td className="py-4 border-light">
                                                            <div className="fw-700 text-body mb-0">
                                                                <i className="bi bi-geo-alt-fill text-danger me-1"></i>{s.lieu}
                                                            </div>
                                                        </td>
                                                        <td className="py-4 border-light">
                                                            {s.dateSortie ? (
                                                                <>
                                                                    <div className="fw-700 text-body mb-0">
                                                                        {new Date(s.dateSortie).toLocaleString('fr-FR', {
                                                                            day: '2-digit', month: 'short'
                                                                        })}
                                                                    </div>
                                                                    <div className="fw-900 text-primary small">
                                                                        {new Date(s.dateSortie).toLocaleString('fr-FR', {
                                                                            hour: '2-digit', minute: '2-digit'
                                                                        })}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <span className="text-muted small fw-600">Non planifiée</span>
                                                            )}
                                                        </td>
                                                        <td className="py-4 border-light">
                                                            <div className="d-flex align-items-baseline gap-1">
                                                                <span className="fw-900 fs-5 text-body">{s.prix}</span>
                                                                <span className="text-muted smaller fw-700">DT</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 border-light text-end pe-4">
                                                            {!user || (user.role !== 'ROLE_TOURISTE' && user.role !== 'TOURISTE') ? (
                                                                <button 
                                                                    onClick={() => navigate('/login')}
                                                                    className="btn btn-outline-primary btn-sm rounded-pill px-4 py-2 fw-800 shadow-sm transition-all"
                                                                >
                                                                    Connexion
                                                                </button>
                                                            ) : (
                                                                <button 
                                                                    onClick={() => {
                                                                        if (s.placesDisponibles !== undefined && s.placesDisponibles <= 0) {
                                                                             alert("⚠️ Désolé, cette sortie est complète (Sold out).");
                                                                             return;
                                                                         }
                                                                         setResForm({...resForm, sortieId: s.id, dateSortie: s.dateSortie || ''});
                                                                        setShowResModal(true);
                                                                        setStep(0);
                                                                        setIsDirectRes(true);
                                                                    }}
                                                                    className="btn btn-primary btn-sm rounded-pill px-4 py-2 fw-800 shadow-sm border-0 transition-all hover-scale"
                                                                    style={{ background: 'var(--premium-orange)' }}
                                                                >
                                                                    Réserver
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan="6" className="text-center py-5">
                                                            <div className="alert alert-light border border-dashed rounded-4 py-4 text-center mb-0">
                                                                <i className="bi bi-info-circle me-2"></i> Ce guide ne propose aucune sortie pour le moment.
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Section Avis */}
                                    <div className="reviews-section mt-5 animate-in-y">
                                        <h3 className="fw-800 mb-4 d-flex align-items-center">
                                            <i className="bi bi-star-fill text-warning me-2"></i> Avis des clients
                                        </h3>
                                        <div className="reviews-header">
                                            <AvisStats 
                                                percentage={avisStats.pourcentageMoyenne} 
                                                totalAvis={avisStats.nombreTotalAvis} 
                                            />
                                            <AvisForm 
                                                idService={id} 
                                                typeService="GUIDE" 
                                                onAvisSubmitted={fetchAvisStats} 
                                            />
                                        </div>
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
                                    <i className="bi bi-calendar-heart-fill text-warning"></i> Réserver une sortie
                                </h4>
                                <button onClick={() => setShowResModal(false)} className="btn btn-light rounded-circle shadow-sm border p-0 d-flex align-items-center justify-content-center hover-scale" style={{ width: '36px', height: '36px' }}>
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            </div>

                            <div className="p-4 p-md-5 overflow-auto" style={{ flex: '1 1 auto' }}>
                                {step === 0 && (
                                    <div className="animate-in-y">
                                        <form onSubmit={handleNextStep}>
                                            {isDirectRes ? (
                                                <div className="p-3 mb-3 rounded-3 bg-light border border-light-subtle">
                                                    <span className="text-muted smaller fw-800 text-uppercase letter-spacing-1 d-block mb-1" style={{ fontSize: '0.65rem' }}>Sortie Sélectionnée</span>
                                                    <span className="fw-800 fs-5 text-dark">
                                                        {selectedSortie?.titre} — <span className="text-warning">{selectedSortie?.prix} DT</span>
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="form-floating mb-3">
                                                    <select className="form-select rounded-3 border-0 bg-light shadow-none" id="sortieSelect" required value={resForm.sortieId} onChange={e => {
                                                        const sId = e.target.value;
                                                        const s = sorties.find(x => x.id === parseInt(sId));
                                                        setResForm({...resForm, sortieId: sId, dateSortie: s?.dateSortie || ''});
                                                    }}>
                                                        <option value="">-- Sélectionner une sortie --</option>
                                                        {sorties.map(s => <option key={s.id} value={s.id}>{s.titre} — {s.prix} DT</option>)}
                                                    </select>
                                                    <label htmlFor="sortieSelect">Choisissez la sortie <span className="text-danger">*</span></label>
                                                </div>
                                            )}

                                            <div className="premium-counter mb-4" style={{ opacity: !resForm.sortieId ? 0.6 : 1 }}>
                                                <button type="button" className="btn btn-link text-decoration-none px-3" onClick={() => setResForm({ ...resForm, nombreTickets: Math.max(1, resForm.nombreTickets - 1) })} disabled={!resForm.sortieId || resForm.nombreTickets <= 1}>
                                                    <i className="bi bi-dash-lg"></i>
                                                </button>
                                                <div className="flex-grow-1 text-center">
                                                    <span className="d-block counter-label" style={{ fontSize: '0.65rem', marginTop: '2px' }}>Nombre de tickets {selectedSortie?.placesDisponibles !== undefined && `(Max ${selectedSortie.placesDisponibles})`}</span>
                                                    <span className="fw-800 fs-5 counter-value">{resForm.nombreTickets}</span>
                                                </div>
                                                <button type="button" className="btn btn-link text-decoration-none px-3" onClick={() => setResForm({ ...resForm, nombreTickets: resForm.nombreTickets + 1 })} disabled={!resForm.sortieId || (selectedSortie?.placesDisponibles !== undefined && resForm.nombreTickets >= selectedSortie.placesDisponibles)}>
                                                    <i className="bi bi-plus-lg"></i>
                                                </button>
                                            </div>

                                            <div className="p-4 bg-light rounded-5 border border-dashed mb-4">
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span className="small fw-700 text-muted">Montant total :</span>
                                                    <div className="d-flex align-items-baseline gap-1">
                                                        <span className="fw-800 fs-3 text-dark">{(selectedSortie?.prix || 0) * resForm.nombreTickets}</span>
                                                        <span className="text-muted fw-700 small">DT</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {!user || (user.role !== 'ROLE_TOURISTE' && user.role !== 'TOURISTE') ? (
                                                <button type="button" onClick={() => navigate('/login')} className="btn btn-primary w-100 py-3 rounded-4 fw-800 shadow-lg text-uppercase letter-spacing-1 border-0 transition-all hover-translate-y" style={{ background: '#f97316' }}>
                                                    Connectez-vous pour continuer
                                                </button>
                                            ) : (
                                                <button type="submit" disabled={!resForm.sortieId} className="btn btn-primary w-100 py-3 rounded-4 fw-800 shadow-lg text-uppercase letter-spacing-1 border-0 transition-all hover-translate-y" style={{ background: '#f97316' }}>
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
                                            <h4 className="fw-800 mb-0">Contact</h4>
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
                                                <label className="text-secondary smaller fw-800 uppercase letter-spacing-1 d-block mb-1">Sortie</label>
                                                <div className="fw-700 text-dark">{selectedSortie?.titre}</div>
                                            </div>
                                            <div className="mb-3 border-bottom pb-2">
                                                <label className="text-secondary smaller fw-800 uppercase letter-spacing-1 d-block mb-1">Passagers</label>
                                                <div className="fw-700 text-dark">{resForm.nombreTickets} personne(s)</div>
                                            </div>
                                            <div className="d-flex justify-content-between align-items-baseline pt-2">
                                                <span className="fw-800 text-muted">Total à payer :</span>
                                                <div className="d-flex align-items-baseline gap-1">
                                                    <span className="fw-800 fs-3 text-dark">{(selectedSortie?.prix || 0) * resForm.nombreTickets}</span>
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
                                        <h2 className="fw-800 text-dark mb-3">Réservation réussie !</h2>
                                        <p className="text-secondary mb-5 lh-lg">
                                            Vous êtes inscrit avec notre guide pour la sortie <strong>{selectedSortie?.titre}</strong>. Préparez votre sac !
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
                        --premium-green: #10b981;
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
                        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
                    }

                    [data-bs-theme="dark"] .info-glass-card {
                        box-shadow: none;
                    }

                    .info-glass-card:hover {
                        background: var(--bg-glass-hover);
                        transform: translateX(10px) scale(1.02);
                        border-color: var(--premium-green);
                        box-shadow: 0 10px 30px -5px rgba(0,0,0,0.3);
                    }

                    .excursion-card-premium {
                        background: var(--bg-glass);
                        border: 1px solid var(--border-glass);
                        border-radius: 1.5rem;
                        overflow: hidden;
                        transition: all 0.4s ease;
                    }

                    .excursion-card-premium:hover {
                        transform: translateY(-8px);
                        background: var(--bg-glass-hover);
                        border-color: var(--premium-orange);
                        box-shadow: 0 15px 30px -5px rgba(0,0,0,0.25);
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

export default SortieDetails;
