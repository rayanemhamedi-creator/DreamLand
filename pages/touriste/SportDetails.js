// Importation des hooks React de base
import React, { useState, useEffect, useContext } from 'react';
// Hook de traduction internationale
import { useTranslation } from 'react-i18next';
// Hooks de navigation et d'analyse d'URL
import { useLocation, useNavigate, useParams } from 'react-router-dom';
// Instance d'API Axios configurée pour l'application
import api from '../../services/api';
// Service de gestion des requêtes de réservation d'activités sportives
import reservationService from '../../services/reservationService';
// Contexte d'authentification utilisateur global
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
// Composants globaux de l'interface (Barre supérieure, Messagerie, Carte, Évaluations)
import Topbar from '../../components/layout/Topbar';
import MessageCenter from '../../components/messagerie/CentreMessagerie';
import ProviderMapDisplay from '../../components/espace-client/AffichageCarte';
import AvisStats from '../../components/reviews/AvisStats';
import AvisForm from '../../components/reviews/AvisForm';
import '../../components/reviews/Avis.css';
// Composant personnalisé de saisie du numéro de téléphone
import PhoneInput from '../../components/common/PhoneInput';

const SportDetails = () => {
    const { t } = useTranslation();
    // Récupération de l'identifiant du club de sport depuis les paramètres de l'URL
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    // Possibilité de récupérer l'objet sport directement depuis l'état de l'historique de navigation
    const item = location.state?.item;
    // Récupération de l'utilisateur connecté depuis le contexte Auth
    const { user, logout } = useContext(AuthContext);

    // États de contrôle du tunnel de réservation multi-étapes
    const [step, setStep] = useState(0); // Étape active : 0 = Configuration, 1 = Coordonnées, 2 = Récapitulatif, 3 = Confirmation
    const [showModal, setShowModal] = useState(false); // Contrôle l'ouverture/fermeture du modal
    const [isEquipmentDisabled, setIsEquipmentDisabled] = useState(false); // Verrouillage de la sélection de l'équipement
    
    // États pour les données de l'activité, équipements et avis
    const [materiels, setMateriels] = useState([]); // Liste des matériels disponibles au club
    const [companions, setCompanions] = useState([]); // Liste des accompagnateurs (si réservation pour plusieurs personnes)
    const [errorMsg, setErrorMsg] = useState(''); // Message d'erreur éventuel lors de la réservation
    const [checkingAvail, setCheckingAvail] = useState(false); // Indicateur de chargement pour la vérification de dispo
    const [pricing, setPricing] = useState(null); // Informations tarifaires calculées par le serveur
    const [submitting, setSubmitting] = useState(false); // Indicateur de chargement de la transaction de paiement
    
    // Formulaire de réservation initialisé avec les coordonnées du touriste connecté
    const [resForm, setResForm] = useState({
        dateSession: '',
        materielId: '',
        nombreMateriel: 1, // Quantité finale calculée
        nombreMinutes: 60, // Durée par défaut de 1 heure
        nombrePersonnes: 1, // Nombre total de participants
        personnesParEq: 1, // Nombre de personnes partageant un même équipement (ex: kayak double = 2)
        clientNom: user?.nom || '',
        clientPrenom: user?.prenom || '',
        clientTelephone: user?.telephone || '',
        clientEmail: user?.email || '',
    });
    
    const [sport, setSport] = useState(item); // Données principales du club/sport
    const [contactTarget, setContactTarget] = useState(null); // Interlocuteur sélectionné pour envoyer un message
    const [avisStats, setAvisStats] = useState({ pourcentageMoyenne: 0, nombreTotalAvis: 0 }); // Statistiques d'avis clients
    const [availableQty, setAvailableQty] = useState(null); // Quantité d'équipements disponibles pour le créneau choisi

    // Récupération de la moyenne et du nombre total d'avis pour le sport concerné
    const fetchAvisStats = async () => {
        try {
            const res = await api.get(`/avis/moyenne/SPORT/${id}`);
            setAvisStats(res.data);
        } catch (err) {
            console.error("Erreur stats avis:", err);
        }
    };

    // Effet initial : chargement des données principales de l'activité sportive
    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const resp = await api.get(`/sports/${id}`);
                setSport(resp.data);
            } catch (err) {
                console.error("Erreur chargement détails sport:", err);
            }
        };
        fetchDetails();
        fetchAvisStats();
    }, [id]);

    // Effet : récupération des équipements (matériels) disponibles pour ce sport
    useEffect(() => {
        if (id) {
            api.get(`/sports/${id}/materiels`).then(res => {
                const available = res.data.filter(m => m.disponible);
                setMateriels(available);
                if (available.length > 0 && !resForm.materielId) {
                    setResForm(prev => ({ ...prev, materielId: available[0].id }));
                }
            }).catch(console.error);
        }
    }, [id, resForm.materielId]);

    // Effet : vérification dynamique de la quantité d'équipements libres en temps réel
    useEffect(() => {
        const fetchAvail = async () => {
            if (resForm.dateSession && resForm.materielId && resForm.nombreMinutes) {
                try {
                    const response = await api.get(`/sports/materiel/${resForm.materielId}/disponibilite`, {
                        params: {
                            start: resForm.dateSession,
                            durationMinutes: resForm.nombreMinutes
                        }
                    });
                    setAvailableQty(response.data);
                } catch (err) {
                    console.error("Error fetching material availability:", err);
                }
            } else {
                setAvailableQty(null);
            }
        };
        fetchAvail();
    }, [resForm.dateSession, resForm.materielId, resForm.nombreMinutes]);

    const selectedMat = materiels.find(m => m.id.toString() === resForm.materielId.toString());
    const persEq = parseInt(resForm.personnesParEq) || 1;
    // Nombre maximal de personnes autorisées en fonction des équipements libres
    const maxPersonnes = (availableQty !== null && availableQty !== undefined) 
        ? (availableQty * persEq) 
        : (selectedMat?.quantite ? (selectedMat.quantite * persEq) : undefined);

    // Ajustement automatique du nombre de personnes si cela dépasse le maximum d'équipements disponibles
    useEffect(() => {
        if (maxPersonnes && resForm.nombrePersonnes > maxPersonnes) {
            setResForm(prev => ({ ...prev, nombrePersonnes: Math.max(1, maxPersonnes) }));
        }
    }, [maxPersonnes, resForm.nombrePersonnes]);

    const sportData = sport || item;
    const images = sportData?.urlImage ? sportData.urlImage.split(',').filter(Boolean) : [];
    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

    // Effet gérant la rotation automatique des photos de la galerie (toutes les 5 secondes)
    React.useEffect(() => {
        if (images.length > 1) {
            const interval = setInterval(() => {
                setCurrentImageIndex((prev) => (prev + 1) % images.length);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [images.length]);

    if (!sport && !item) {
        return (
            <div className="loading-screen text-center">
                <div className="loading-spinner"></div>
                <h3 className="fw-700 mt-4 text-secondary">🏋️‍♂️ Préparation du matériel...</h3>
                <p className="text-muted small">Mise à jour des disponibilités en temps réel</p>
            </div>
        );
    }

    // Confirmation finale de la réservation et redirection vers l'interface sécurisée de Stripe
    const handleConfirmAndPay = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg('');

        try {
            const dateStr = resForm.dateSession;
            const personnesTotales = parseInt(resForm.nombrePersonnes) || 1;
            const persEq = parseInt(resForm.personnesParEq) || 1;
            const materielRequis = Math.ceil(personnesTotales / persEq);

            // Regroupement des noms des accompagnateurs dans les champs Nom et Prénom du client principal
            let finalNom = resForm.clientNom;
            let finalPrenom = resForm.clientPrenom;
            if (companions && companions.length > 0) {
                finalNom += " (P1), " + companions.map((c, i) => `${c.nom} (P${i + 2})`).join(', ');
                finalPrenom += " (P1), " + companions.map((c, i) => `${c.prenom} (P${i + 2})`).join(', ');
            }

            const req = {
                sportId: id,
                materielId: resForm.materielId,
                dateSession: dateStr + ':00',
                nombreMateriel: materielRequis,
                nombreMinutes: resForm.nombreMinutes,
                nombrePersonnes: personnesTotales,
                clientNom: finalNom,
                clientPrenom: finalPrenom,
                clientTelephone: resForm.clientTelephone,
                clientEmail: resForm.clientEmail,
                prixTotal: pricing?.prixTotal || 0
            };
            
            // 1. Appel du backend pour insérer la réservation
            const response = await reservationService.reserverSport(req);
            const reservationId = response.data.id || response.data.reservationId;

            if (reservationId) {
                // 2. Génération de la session de paiement Stripe
                const paymentRes = await api.post(`/payments/create-session/${reservationId}`);
                const { url } = paymentRes.data;

                if (url) {
                    window.location.href = url;
                } else {
                    setErrorMsg("Impossible de générer le lien de paiement.");
                }
            } else {
                setErrorMsg(response.data?.message || "Erreur lors de la création de la réservation.");
            }
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Erreur lors de la réservation. Veuillez réessayer.");
        } finally {
            setSubmitting(false);
        }
    };

    // Soumission de l'étape 1 du formulaire
    const handleStep1Submit = (e) => {
        e.preventDefault();
        setStep(2);
    };

    // Validation de l'étape 0 et vérification préventive de la disponibilité côté serveur
    const handleNextStep = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        const selectedDate = new Date(resForm.dateSession);
        if (selectedDate < new Date()) {
            setErrorMsg("❌ Vous ne pouvez pas réserver pour une date passée.");
            return;
        }

        if (!resForm.materielId) {
            setErrorMsg("Veuillez sélectionner un équipement.");
            return;
        }

        setCheckingAvail(true);
        try {
            const personnesTotales = parseInt(resForm.nombrePersonnes) || 1;
            const persEq = parseInt(resForm.personnesParEq) || 1;
            const materielRequis = Math.ceil(personnesTotales / persEq);

            const previewReq = {
                sportId: id,
                materielId: resForm.materielId,
                dateSession: resForm.dateSession + ':00',
                nombreMateriel: materielRequis,
                nombreMinutes: resForm.nombreMinutes,
                nombrePersonnes: personnesTotales
            };
            
            // Appel de l'API d'aperçu de réservation pour estimer le coût et vérifier la faisabilité
            const response = await reservationService.apercuSport(previewReq);
            if (response.data?.success) {
                setPricing(response.data);
                // Initialisation de la liste des accompagnateurs en fonction de la taille du groupe
                setCompanions(Array.from({ length: Math.max(0, personnesTotales - 1) }, () => ({ nom: '', prenom: '' })));
                setStep(1);
            } else {
                setErrorMsg(response.data?.message || "Équipement non disponible pour ce créneau.");
            }
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Erreur de disponibilité. Vérifiez les horaires.");
        } finally {
            setCheckingAvail(false);
        }
    };

    const handleCompanionChange = (index, field, value) => {
        const newCompanions = [...companions];
        newCompanions[index][field] = value;
        setCompanions(newCompanions);
    };



    const matchedPrix = selectedMat ? selectedMat.prixParHeure : (sportData.prix || 0);

    const qtyPersonnes = parseInt(resForm.nombrePersonnes) || 0;
    const materielCalcule = Math.ceil(qtyPersonnes / persEq);

    let calculatedTotal = matchedPrix * (resForm.nombreMinutes / 60) * materielCalcule;
    const isInvalidForm = isNaN(calculatedTotal) || qtyPersonnes < 1;
    const currentTotal = isInvalidForm ? '...' : calculatedTotal.toFixed(2).replace(/\.00$/, '');

    return (
        <div className="touriste-sport-details min-vh-100 bg-light">
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
                                <i className="bi bi-arrow-left-short fs-4 me-1"></i> {t('common.back', 'Retour')}
                            </button>
                        </div>
                        <div className="text-center" style={{ flex: '2' }}>
                            <h1 className="fw-800 text-dark mb-0 fs-1">{t('sport_details.welcome', 'Bienvenue à')} <span className="text-primary">{sportData.nomActivite || sportData.nom || sportData.titre}</span></h1>
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
                                                    alt={`${sportData.nomActivite} - ${idx + 1}`} 
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
                                        <div className="w-100 h-100 d-flex align-items-center justify-content-center display-1 text-white" style={{ background: item?.color || '#c2410c' }}>
                                            <i className={`bi ${item?.icon || 'bi-trophy'}`}></i>
                                        </div>
                                    )}
                                    <div className="gallery-overlay d-flex align-items-end z-2">
                                        <div>
                                            <div className="d-flex align-items-center gap-2 mb-3 animate-up">
                                                <span className="badge bg-danger rounded-pill px-3 py-2 fw-800 shadow-sm">{t('sport_details.certified_club', 'Club de Sport Agréé')}</span>
                                                <div className="text-warning d-flex align-items-center gap-1">
                                                    {[...Array(5)].map((_, i) => {
                                                        const rating = avisStats.nombreTotalAvis > 0 ? Math.round((avisStats.pourcentageMoyenne / 100) * 5) : 0;
                                                        return <i key={i} className={`bi ${i < rating ? 'bi-star-fill' : 'bi-star'}`}></i>;
                                                    })}
                                                    <span className="text-white small fw-700 ms-2 opacity-75">
                                                        {avisStats.nombreTotalAvis > 0 ? `(${avisStats.nombreTotalAvis} ${t('sport_details.reviews_label', 'avis')})` : `(${t('sport_details.new', 'Nouveau')})`}
                                                    </span>
                                                </div>
                                            </div>
                                            <h1 className="text-white fw-900 display-4 mb-0 animate-up" style={{ animationDelay: '0.1s' }}>{sportData.nomActivite || sportData.nom || sportData.titre}</h1>
                                        </div>
                                    </div>
                                </div>
                                <div className="card-body p-4 p-md-5 animate-up" style={{ animationDelay: '0.2s' }}>
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <h2 className="fw-800 mb-0">{t('sport_details.about', 'À propos')}</h2>
                                        {user?.id !== sportData.utilisateur?.id && (
                                            <div className="d-flex align-items-center gap-2">
                                                <button 
                                                    onClick={() => !user ? navigate('/login') : setContactTarget({ user: sportData.utilisateur, t: Date.now() })} 
                                                    className="btn-premium btn btn-outline-primary shadow-sm"
                                                >
                                                    <i className="bi bi-chat-dots-fill me-2"></i> {t('sport_details.contact', 'Contacter')}
                                                </button>
                                                <button 
                                                    onClick={() => !user ? navigate('/login') : (setIsEquipmentDisabled(false), setShowModal(true), setStep(0))} 
                                                    className="btn-premium btn btn-primary shadow-lg"
                                                    style={{ background: 'var(--premium-orange)', border: 'none' }}
                                                >
                                                    <i className="bi bi-calendar-check-fill me-2"></i> {t('sport_details.reserve', 'Réserver')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-secondary lead mb-5 fw-500 opacity-75">{item?.description || sportData?.description || t('sport_details.default_description', "De l'adrénaline et du fun au rendez-vous ! Profitez d'une expérience sportive unique.")}</p>
 
                                    <div className="row g-4 mb-4 mt-2">
                                        <div className="col-lg-8">
                                            <h4 className="fw-800 mb-4 d-flex align-items-center">
                                                <i className="bi bi-geo-alt-fill text-danger me-2"></i> {t('sport_details.address', 'Adresse')}
                                            </h4>
                                            <ProviderMapDisplay localisation={sportData.localisation} providerName={sportData.nomActivite || sportData.nom || sportData.titre} />
                                        </div>
                                        <div className="col-lg-4">
                                            <h4 className="fw-800 mb-4 d-flex align-items-center">
                                                <i className="bi bi-info-circle-fill text-primary me-2"></i> {t('sport_details.practical_info', 'Infos Pratiques')}
                                            </h4>
                                            <div className="info-glass-card p-0 overflow-hidden">
                                                <div className="d-flex align-items-center p-3 border-bottom border-light-subtle">
                                                    <div className="bg-primary-subtle text-primary rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                                                        <i className="bi bi-geo-alt fs-4"></i>
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <span className="text-muted smaller fw-800 text-uppercase letter-spacing-1 d-block mb-1" style={{ fontSize: '0.65rem' }}>{t('sport_details.club_address', 'Adresse du Club')}</span>
                                                        <span className="fw-700 text-body text-truncate d-block fs-6">{sportData.adresse || "Adresse non spécifiée"}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="d-flex align-items-center p-3 border-bottom border-light-subtle">
                                                    <div className="bg-info-subtle text-info rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                                                        <i className="bi bi-envelope-at fs-4"></i>
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <span className="text-muted smaller fw-800 text-uppercase letter-spacing-1 d-block mb-1" style={{ fontSize: '0.65rem' }}>{t('sport_details.contact_email', 'Contact Email')}</span>
                                                        <span className="fw-700 text-body text-truncate d-block fs-6">{item?.utilisateur?.email || sportData?.utilisateur?.email || "Email non spécifié"}</span>
                                                    </div>
                                                </div>
 
                                                <div className="d-flex align-items-center p-3">
                                                    <div className="bg-success-subtle text-success rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                                                        <i className="bi bi-telephone-plus fs-4"></i>
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <span className="text-muted smaller fw-800 text-uppercase letter-spacing-1 d-block mb-1" style={{ fontSize: '0.65rem' }}>{t('sport_details.phone', 'Téléphone')}</span>
                                                        <span className="fw-700 text-body text-truncate d-block fs-6">{item?.utilisateur?.telephone || sportData?.utilisateur?.telephone || "Téléphone non spécifié"}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 info-glass-card mb-5 border-0 shadow-none" style={{ background: 'rgba(0,0,0,0.02)' }}>
                                        <h4 className="fw-800 mb-4 d-flex align-items-center">
                                            <i className="bi bi-clock-history text-warning me-2"></i> {t('sport_details.opening_hours', "Horaires d'ouverture")}
                                        </h4>
                                        {item?.joursOuverture || sportData?.joursOuverture ? (
                                            <div>
                                                <div className="d-flex gap-2 mb-4 flex-wrap">
                                                    {[t('days.lun', 'Lun'), t('days.mar', 'Mar'), t('days.mer', 'Mer'), t('days.jeu', 'Jeu'), t('days.ven', 'Ven'), t('days.sam', 'Sam'), t('days.dim', 'Dim')].map((label, idx) => {
                                                        const jours = item?.joursOuverture || sportData?.joursOuverture || "";
                                                        const isDayOpen = jours.split(',').includes((idx + 1).toString());
                                                        return (
                                                            <div key={idx} className={`day-badge ${isDayOpen ? 'bg-primary text-white shadow-sm' : 'bg-light text-muted opacity-50'}`}>
                                                                {label}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div className="alert bg-white border-0 rounded-4 p-4 mb-0 d-flex align-items-center shadow-sm">
                                                    <div className="bg-primary-subtle text-primary rounded-circle p-3 me-3 d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px' }}>
                                                        <i className="bi bi-alarm fs-4"></i>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted smaller fw-800 text-uppercase letter-spacing-1 d-block mb-1">{t('sport_details.available_slots', 'Créneaux Disponibles')}</span>
                                                        <span className="fw-900 fs-5 text-body">{item?.heureOuverture || sportData?.heureOuverture || '08:00'} — {item?.heureFermeture || sportData?.heureFermeture || '19:00'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="alert alert-light border border-dashed rounded-4 py-4 text-center">
                                                <i className="bi bi-info-circle me-2"></i> {t('sport_details.no_hours', "Horaires non communiqués par l'organisateur.")}
                                            </div>
                                        )}
                                    </div>

                                    <h3 className="fw-800 mb-4 mt-5 d-flex align-items-center">
                                        <i className="bi bi-box-seam text-danger me-2"></i> {t('sport_details.available_equipments', 'Équipements disponibles')}
                                    </h3>
                                    <div className="table-responsive rounded-4 border overflow-hidden mt-3">
                                        <table className="table table-hover align-middle mb-0">
                                            <thead className="bg-light">
                                                <tr>
                                                    <th className="px-4 py-3 border-0 small fw-800 text-muted text-uppercase">{t('sport_details.photo', 'Photo')}</th>
                                                    <th className="py-3 border-0 small fw-800 text-muted text-uppercase">{t('sport_details.equipment', 'Équipement')}</th>
                                                    <th className="py-3 border-0 small fw-800 text-muted text-uppercase">{t('sport_details.price', 'Prix')}</th>
                                                    <th className="py-3 border-0 text-end pe-4 small fw-800 text-muted text-uppercase">{t('sport_details.action', 'Action')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {materiels.length > 0 ? materiels.map(m => (
                                                    <tr key={m.id} className="film-row">
                                                        <td className="px-4 py-4 border-light">
                                                            {m.urlImage ? (
                                                                <img src={m.urlImage} alt={m.nom} className="rounded-3 shadow-sm" style={{ width: '55px', height: '55px', objectFit: 'cover' }} />
                                                            ) : (
                                                                <div className="bg-light rounded-3 d-flex align-items-center justify-content-center text-muted" style={{ width: '55px', height: '55px' }}>
                                                                    <i className="bi bi-box-seam fs-3 opacity-25"></i>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-4 border-light">
                                                            <div className="fw-800 text-body mb-1">{m.nom}</div>
                                                        </td>
                                                        <td className="py-4 border-light">
                                                            <div className="d-flex align-items-baseline gap-1">
                                                                <span className="fw-900 fs-5 text-primary">{m.prixParHeure}</span>
                                                                <span className="text-muted smaller fw-700">DT / h</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 border-light text-end pe-4">
                                                            {!user || (user.role !== 'ROLE_TOURISTE' && user.role !== 'TOURISTE') ? (
                                                                <button 
                                                                    onClick={() => navigate('/login')}
                                                                    className="btn btn-outline-primary btn-sm rounded-pill px-4 py-2 fw-800 shadow-sm transition-all"
                                                                >
                                                                    {t('sport_details.login_required', 'Connexion')}
                                                                </button>
                                                            ) : (
                                                                <button 
                                                                    onClick={() => {
                                                                        setResForm({...resForm, materielId: m.id.toString()});
                                                                        setIsEquipmentDisabled(true);
                                                                        setShowModal(true);
                                                                    }}
                                                                    className="btn btn-primary btn-sm rounded-pill px-4 py-2 fw-800 shadow-sm border-0 transition-all hover-scale"
                                                                    style={{ background: 'var(--premium-orange)' }}
                                                                >
                                                                    {t('sport_details.reserve', 'Réserver')}
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan="4" className="text-center py-5">
                                                            <div className="alert alert-light border border-dashed rounded-4 py-4 text-center mb-0">
                                                                <i className="bi bi-info-circle me-2"></i> {t('sport_details.no_equipment', 'Aucun équipement disponible pour le moment.')}
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
                                            <i className="bi bi-star-fill text-warning me-2"></i> {t('sport_details.reviews', 'Avis des clients')}
                                        </h3>
                                        <div className="reviews-header">
                                            <AvisStats 
                                                percentage={avisStats.pourcentageMoyenne} 
                                                totalAvis={avisStats.nombreTotalAvis} 
                                            />
                                            <AvisForm 
                                                idService={id} 
                                                typeService="SPORT" 
                                                onAvisSubmitted={fetchAvisStats} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>


                    </div>
                </div>

                {/* MODAL GLOBAL DE RÉSERVATION */}
                {showModal && (
                    <div className="modal-overlay animate-fade-in" style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
                        zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                    }}>
                        <div className="rounded-4 shadow-lg overflow-hidden position-relative d-flex flex-column"
                            style={{ backgroundColor: 'var(--bg-card)', width: '100%', maxWidth: '600px', maxHeight: '90vh' }}>

                            <div className="d-flex justify-content-between align-items-center p-4 border-bottom" style={{ backgroundColor: 'var(--bs-light-bg-subtle)' }}>
                                <h4 className="fw-800 mb-0 d-flex align-items-center gap-2">
                                    {step === 0 && <><i className="bi bi-activity text-primary"></i> {t('sport_details.booking_modal.title_session', 'Réserver une session')}</>}
                                    {step === 1 && <><button onClick={() => setStep(0)} className="btn btn-link p-0 me-2" style={{ color: 'inherit' }}><i className="bi bi-chevron-left"></i></button> {t('sport_details.booking_modal.title_info', 'Vos informations')}</>}
                                    {step === 2 && <><i className="bi bi-check-circle-fill text-success"></i> {t('sport_details.booking_modal.title_validated', 'Réservation validée')}</>}
                                </h4>
                                {(step === 0 || step === 1) && (
                                    <button onClick={() => setShowModal(false)} className="btn btn-light rounded-circle shadow-sm border p-0 d-flex align-items-center justify-content-center hover-scale" style={{ width: '36px', height: '36px' }}>
                                        <i className="bi bi-x-lg"></i>
                                    </button>
                                )}
                            </div>

                            <div className="p-4 p-md-5 overflow-auto" style={{ flex: '1 1 auto' }}>
                                
                                {errorMsg && (
                                    <div className="alert alert-danger border-0 rounded-4 shadow-sm animate-in-y mb-4 d-flex align-items-center gap-3">
                                        <div className="bg-danger text-white rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                                            <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                                        </div>
                                        <div className="flex-grow-1">
                                            <h6 className="fw-800 mb-1">{t('sport_details.booking_modal.error_title', 'Oups ! Problème de disponibilité')}</h6>
                                            <p className="small mb-0 opacity-75 fw-600">{errorMsg}</p>
                                        </div>
                                        <button onClick={() => setErrorMsg('')} className="btn-close shadow-none small"></button>
                                    </div>
                                )}

                                {step === 0 && (
                                    <div className="animate-in-y">
                                        <form onSubmit={handleNextStep}>
                                            <div className="form-floating mb-2">
                                                <input
                                                    type="datetime-local"
                                                    min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                                                    className="form-control rounded-3 border-0 shadow-none"
                                                    style={{ backgroundColor: 'var(--bs-light-bg-subtle)' }}
                                                    id="resDate"
                                                    required
                                                    value={resForm.dateSession}
                                                    onChange={e => setResForm({ ...resForm, dateSession: e.target.value })}
                                                />
                                                <label htmlFor="resDate">{t('sport_details.booking_modal.start_date', 'Date et heure de début')} <span className="text-danger">*</span></label>
                                            </div>

                                            {/* Indicateur de disponibilité en temps réel dès la sélection du créneau */}
                                            {resForm.dateSession && resForm.materielId && (
                                                <div className="mb-3">
                                                    {availableQty === null && (
                                                        <div className="d-flex align-items-center gap-2 p-2 rounded-3" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}>
                                                            <span className="spinner-border spinner-border-sm text-warning" style={{ width: '14px', height: '14px' }}></span>
                                                            <span className="small fw-700 text-muted">{t('sport_details.booking_modal.checking', 'Vérification du créneau...')}</span>
                                                        </div>
                                                    )}
                                                    {availableQty !== null && availableQty > 0 && (
                                                        <div className="d-flex align-items-center gap-2 p-2 rounded-3" style={{ backgroundColor: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)' }}>
                                                            <i className="bi bi-check-circle-fill" style={{ color: '#22c55e', fontSize: '14px' }}></i>
                                                            <span className="small fw-700" style={{ color: '#16a34a' }}>{t('sport_details.booking_modal.slot_available', 'Créneau disponible')} — {availableQty} {t('sport_details.booking_modal.units_free', 'équipement(s) libre(s)')}</span>
                                                        </div>
                                                    )}
                                                    {availableQty !== null && availableQty <= 0 && (
                                                        <div className="d-flex align-items-center gap-2 p-2 rounded-3" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                                            <i className="bi bi-x-circle-fill" style={{ color: '#ef4444', fontSize: '14px' }}></i>
                                                            <span className="small fw-700" style={{ color: '#dc2626' }}>{t('sport_details.booking_modal.slot_full', 'Créneau complet — aucun équipement disponible pour ce créneau')}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="form-floating mb-3">
                                                <select className="form-select rounded-3 border-0 shadow-none" style={{ backgroundColor: 'var(--bs-light-bg-subtle)' }} id="matSelect" required value={resForm.materielId} onChange={e => setResForm({ ...resForm, materielId: e.target.value })} disabled={isEquipmentDisabled}>
                                                    {materiels.map(m => (
                                                        <option key={m.id} value={m.id}>{m.nom} ({m.prixParHeure} DT/h)</option>
                                                    ))}
                                                </select>
                                                <label htmlFor="matSelect">{t('sport_details.booking_modal.equipment_desired', 'Équipement souhaité')} <span className="text-danger">*</span></label>
                                                {materiels.length === 0 && <div className="text-danger small mt-1 fw-600"><i className="bi bi-exclamation-triangle-fill"></i> {t('sport_details.no_equipment', 'Aucun équipement disponible')}</div>}
                                            </div>

                                            <div className="row g-2 mb-4">
                                                <div className="col-12">
                                                    <div className="form-floating mb-3">
                                                        <select className="form-select rounded-3 border-0 shadow-none" style={{ backgroundColor: 'var(--bs-light-bg-subtle)' }} id="resPersEq" required value={resForm.personnesParEq} onChange={e => setResForm({ ...resForm, personnesParEq: parseInt(e.target.value) })}>
                                                            <option value={1}>{t('sport_details.booking_modal.one_per_eq', '1 personne par équipement')}</option>
                                                            <option value={2}>{t('sport_details.booking_modal.two_per_eq', '2 personnes par équipement')}</option>
                                                        </select>
                                                        <label htmlFor="resPersEq">{t('sport_details.booking_modal.configuration', 'Configuration')}</label>
                                                    </div>
                                                </div>
                                                <div className="col-6">
                                                    <div className="premium-counter mb-4">
                                                        <button type="button" className="btn btn-link text-decoration-none px-3" onClick={() => setResForm({ ...resForm, nombrePersonnes: Math.max(1, resForm.nombrePersonnes - 1) })} disabled={resForm.nombrePersonnes <= 1}>
                                                            <i className="bi bi-dash-lg"></i>
                                                        </button>
                                                        <div className="flex-grow-1 text-center">
                                                            <span className="d-block counter-label" style={{ fontSize: '0.65rem', marginTop: '2px' }}>{t('sport_details.booking_modal.persons', 'Personnes')} {maxPersonnes && `(Max ${maxPersonnes})`}</span>
                                                            <span className="fw-800 fs-5 counter-value">{resForm.nombrePersonnes}</span>
                                                        </div>
                                                        <button type="button" className="btn btn-link text-decoration-none px-3" onClick={() => setResForm({ ...resForm, nombrePersonnes: resForm.nombrePersonnes + 1 })} disabled={maxPersonnes && resForm.nombrePersonnes >= maxPersonnes}>
                                                            <i className="bi bi-plus-lg"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="col-6">
                                                    <div className="form-floating">
                                                        <select className="form-select rounded-3 border-0 shadow-none" style={{ backgroundColor: 'var(--bs-light-bg-subtle)' }} id="resDur" required value={resForm.nombreMinutes} onChange={e => setResForm({ ...resForm, nombreMinutes: parseInt(e.target.value) })}>
                                                            <option value={15}>15 min</option>
                                                            <option value={30}>30 min</option>
                                                            <option value={60}>1 h</option>
                                                            <option value={90}>1 h 30</option>
                                                            <option value={120}>2 h</option>
                                                        </select>
                                                        <label htmlFor="resDur">Durée <span className="text-danger">*</span></label>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="rounded-4 p-3 mb-4 border" style={{ backgroundColor: 'var(--bs-light-bg-subtle)' }}>
                                                <div className="d-flex justify-content-between mb-2 pb-2 border-bottom border-secondary border-opacity-10">
                                                    <span className="text-secondary fw-600">{t('sport_details.booking_modal.required_eq', 'Équipements requis')} :</span>
                                                    <span className="text-dark fw-800">{materielCalcule} {selectedMat?.nom || t('sport_details.booking_modal.units', 'unité(s)')}</span>
                                                </div>
                                                <div className="d-flex justify-content-between align-items-center mt-2">
                                                    <span className="text-secondary fw-600">{t('sport_details.booking_modal.estimated_total', 'Total estimé')} :</span>
                                                    <span className="fw-900 fs-3 text-primary">
                                                        {currentTotal} <span className="fs-6 ms-1" style={{ color: 'inherit' }}>DT</span>
                                                    </span>
                                                </div>
                                            </div>

                                            <button type="submit" disabled={materiels.length === 0 || isInvalidForm || checkingAvail} className="btn btn-primary w-100 py-3 rounded-pill fw-800 shadow-sm text-uppercase letter-spacing-1 d-flex align-items-center justify-content-center gap-2 border-0 transition-all hover-translate-y" style={{ background: '#f97316' }}>
                                                {checkingAvail ? (
                                                    <><span className="spinner-border spinner-border-sm me-2"></span> {t('sport_details.booking_modal.checking_btn', 'Vérification...')}</>
                                                ) : (
                                                    <>{step === 0 ? t('sport_details.booking_modal.continue', 'Continuer') : t('sport_details.booking_modal.confirm', 'Confirmer ma réservation')} <i className="bi bi-arrow-right ms-2"></i></>
                                                )}
                                            </button>
                                        </form>
                                    </div>
                                )}

                                {step === 1 && (
                                    <div className="animate-in-y">
                                        <form onSubmit={handleConfirmAndPay}>
                                            <div className="row g-2 mb-3">
                                                <div className="col-6">
                                                    <div className="form-floating">
                                                        <input type="text" className="form-control rounded-3 border-0 shadow-none" style={{ backgroundColor: 'var(--bs-light-bg-subtle)' }} id="cliNom" required value={resForm.clientNom} onChange={e => setResForm({ ...resForm, clientNom: e.target.value })} />
                                                        <label htmlFor="cliNom">{t('booking.last_name', 'Nom')} <span className="text-danger">*</span></label>
                                                    </div>
                                                </div>
                                                <div className="col-6">
                                                    <div className="form-floating">
                                                        <input type="text" className="form-control rounded-3 border-0 shadow-none" style={{ backgroundColor: 'var(--bs-light-bg-subtle)' }} id="cliPre" required value={resForm.clientPrenom} onChange={e => setResForm({ ...resForm, clientPrenom: e.target.value })} />
                                                        <label htmlFor="cliPre">{t('booking.first_name', 'Prénom')} <span className="text-danger">*</span></label>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="form-floating mb-3">
                                                <input type="email" className="form-control rounded-3 border-0 shadow-none" style={{ backgroundColor: 'var(--bs-light-bg-subtle)' }} id="cliMail" required value={resForm.clientEmail} onChange={e => setResForm({ ...resForm, clientEmail: e.target.value })} />
                                                <label htmlFor="cliMail">{t('booking.email', 'Email')} <span className="text-danger">*</span></label>
                                            </div>
                                            <div className="mb-4">
                                                <label className="text-muted fw-600 small mb-1">{t('booking.phone', 'Téléphone')} <span className="text-danger">*</span></label>
                                                <PhoneInput
                                                    className="border-0 shadow-none"
                                                    value={resForm.clientTelephone}
                                                    onChange={val => setResForm({ ...resForm, clientTelephone: val })}
                                                    required
                                                />
                                            </div>

                                            {companions.map((comp, index) => (
                                                <div key={index} className="mb-4 pt-3 border-top border-light">
                                                    <h6 className="fw-800 text-secondary mb-3"><i className="bi bi-person-fill"></i> {t('booking.person', 'Personne')} {index + 2}</h6>
                                                    <div className="row g-2">
                                                        <div className="col-6">
                                                            <div className="form-floating">
                                                                <input type="text" className="form-control rounded-3 border-0 shadow-none" style={{ backgroundColor: 'var(--bs-light-bg-subtle)' }} id={`compNom_${index}`} required value={comp.nom} onChange={e => handleCompanionChange(index, 'nom', e.target.value)} />
                                                                <label htmlFor={`compNom_${index}`}>{t('booking.last_name', 'Nom')} <span className="text-danger">*</span></label>
                                                            </div>
                                                        </div>
                                                        <div className="col-6">
                                                            <div className="form-floating">
                                                                <input type="text" className="form-control rounded-3 border-0 shadow-none" style={{ backgroundColor: 'var(--bs-light-bg-subtle)' }} id={`compPre_${index}`} required value={comp.prenom} onChange={e => handleCompanionChange(index, 'prenom', e.target.value)} />
                                                                <label htmlFor={`compPre_${index}`}>{t('booking.first_name', 'Prénom')} <span className="text-danger">*</span></label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            <div className="alert alert-success border-0 rounded-4 small fw-600 mb-4 mt-4">
                                                <i className="bi bi-shield-lock-fill me-2"></i> {t('booking.stripe_notice', 'Paiement sécurisé obligatoire via Stripe pour valider votre réservation.')}
                                            </div>

                                            <button type="submit" className="btn btn-primary w-100 py-3 rounded-4 fw-800 shadow-lg text-uppercase letter-spacing-1 border-0 transition-all hover-translate-y" style={{ background: '#f97316' }}>
                                                {t('sport_details.booking_modal.see_summary', 'Voir le récapitulatif')}
                                            </button>
                                        </form>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="animate-in-y">
                                        <div className="d-flex align-items-center mb-4">
                                            <button type="button" onClick={() => setStep(1)} className="btn btn-link text-decoration-none p-0 fw-700 text-secondary me-3">
                                                <i className="bi bi-chevron-left"></i> {t('common.back', 'Retour')}
                                            </button>
                                            <h4 className="fw-800 mb-0">{t('sport_details.booking_modal.summary_title', 'Résumé de réservation')}</h4>
                                        </div>

                                        <div className="p-4 rounded-5 border border-dashed mb-4" style={{ backgroundColor: 'var(--bs-light-bg-subtle)' }}>
                                            <div className="mb-3 border-bottom pb-2">
                                                <label className="text-secondary smaller fw-800 uppercase letter-spacing-1 d-block mb-1">{t('sport_details.booking_modal.activity', 'Activité')}</label>
                                                <div className="fw-700">{sportData.nomActivite || sportData.titre}</div>
                                            </div>
                                            <div className="mb-3 border-bottom pb-2">
                                                <label className="text-secondary smaller fw-800 uppercase letter-spacing-1 d-block mb-1">{t('booking.date_label', 'Date & Heure')}</label>
                                                <div className="fw-700">{resForm.dateSession.replace('T', ' à ')}</div>
                                            </div>
                                            <div className="mb-3 border-bottom pb-2">
                                                <label className="text-secondary smaller fw-800 uppercase letter-spacing-1 d-block mb-1">{t('sport_details.booking_modal.equipment_label', 'Équipement')}</label>
                                                <div className="fw-700">{materiels.find(m => m.id === parseInt(resForm.materielId))?.nom || t('sport_details.equipment', 'Équipement')}</div>
                                            </div>
                                            <div className="d-flex justify-content-between align-items-baseline pt-2">
                                                <span className="fw-800 text-muted">{t('booking.amount_to_pay', 'Montant à payer')} :</span>
                                                <div className="d-flex align-items-baseline gap-1">
                                                    <span className="fw-800 fs-3">{pricing?.prixTotal || 0}</span>
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
                                                <><span className="spinner-border spinner-border-sm me-2" role="status"></span> {t('booking.redirecting', 'Redirection...')}</>
                                            ) : (
                                                <><i className="bi bi-credit-card-fill me-2"></i> {t('sport_details.booking_modal.pay_btn', 'Payer et Confirmer')}</>
                                            )}
                                        </button>
                                        <p className="text-center text-muted small mt-3 fw-600"><i className="bi bi-shield-lock-fill me-1"></i> {t('booking.stripe_secured', 'Paiement sécurisé par Stripe')}</p>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="text-center py-5 animate-in-y">
                                        <div className="display-1 text-success mb-4 animate-bounce"><i className="bi bi-award-fill"></i></div>
                                        <h2 className="fw-800 mb-3">{t('sport_details.booking_modal.success_title', "C'est validé !")}</h2>
                                        <p className="text-secondary mb-5 lh-lg">
                                            {t('sport_details.booking_modal.success_msg', 'Votre session sportive est réservée pour le')} <strong>{resForm.dateSession.replace('T', ' à ')}</strong>. {t('sport_details.booking_modal.enjoy', 'Amusez-vous bien !')}
                                        </p>
                                        <button onClick={() => { setShowModal(false); navigate('/touriste'); }} className="btn btn-primary w-100 py-3 rounded-pill fw-800 shadow-sm border-0 transition-all hover-scale">
                                            {t('common.back_home', "Retour à l'accueil")}
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
                        --premium-red: #ef4444;
                        --premium-orange: #f97316;
                    }

                    .touriste-sport-details {
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
                        border-color: var(--premium-red);
                        box-shadow: 0 10px 30px -5px rgba(0,0,0,0.3);
                    }

                    .equipment-card-premium {
                        background: var(--bg-glass);
                        border: 1px solid var(--border-glass);
                        border-radius: 1.5rem;
                        overflow: hidden;
                        transition: all 0.4s ease;
                    }

                    .equipment-card-premium:hover {
                        transform: translateY(-8px);
                        background: var(--bg-glass-hover);
                        border-color: var(--premium-orange);
                    }

                    .day-badge {
                        width: 42px;
                        height: 42px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 12px;
                        font-weight: 800;
                        font-size: 0.8rem;
                        transition: all 0.3s ease;
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

export default SportDetails;
