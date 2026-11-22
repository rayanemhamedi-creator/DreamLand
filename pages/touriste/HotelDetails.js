// Importation des dépendances React nécessaires (gestion des états, des effets et du contexte)
import React, { useState, useEffect, useContext } from 'react';
// Hook pour la traduction internationale (i18n)
import { useTranslation } from 'react-i18next';
// Hooks de navigation et récupération des paramètres de l'URL
import { useParams, useNavigate } from 'react-router-dom';
// Services API pour communiquer avec le backend (Hôtels et Chambres)
import hotelService from '../../services/hotelService';
import chambreService from '../../services/chambreService';
// Contexte d'authentification utilisateur
import { AuthContext } from '../../context/AuthContext';
// Composants de l'interface utilisateur (barre de navigation, messagerie, carte, modales, avis)
import Topbar from '../../components/layout/Topbar';
import MessageCenter from '../../components/messagerie/CentreMessagerie';
import api from '../../services/api';
import axios from 'axios';
import HotelReservationModal from '../../components/espace-client/ModaleReservationHotel';
import RoomDetailsModal from '../../components/espace-client/ModaleChambre';
import ProviderMapDisplay from '../../components/espace-client/AffichageCarte';
import AvisStats from '../../components/reviews/AvisStats';
import AvisForm from '../../components/reviews/AvisForm';
// Styles CSS liés aux avis
import '../../components/reviews/Avis.css';

const HotelDetails = () => {
    // Récupération de l'identifiant de l'hôtel depuis l'URL
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    
    // Récupération des informations de l'utilisateur connecté via le contexte d'authentification
    const { user, loading: authLoading, logout } = useContext(AuthContext);
    
    // États locaux pour stocker les données récupérées du serveur
    const [hotel, setHotel] = useState(null); // Données de l'hôtel sélectionné
    const [rooms, setRooms] = useState([]); // Liste des chambres associées à cet hôtel
    const [fetchError, setFetchError] = useState(null); // Message d'erreur éventuel lors de la récupération
    const [loading, setLoading] = useState(true); // État de chargement global des données
    const [formules, setFormules] = useState([]); // Liste des formules de restauration disponibles (demi-pension, etc.)
    
    // États de contrôle des composants interactifs et modales
    const [isModalOpen, setIsModalOpen] = useState(false); // Contrôle l'affichage de la modale de réservation d'hôtel
    const [detailedRoom, setDetailedRoom] = useState(null); // Chambre sélectionnée pour afficher ses détails complets
    const [selectedRoomType, setSelectedRoomType] = useState(null); // Catégorie de chambre présélectionnée pour le formulaire
    const [selectedBedConfig, setSelectedBedConfig] = useState(null); // Configuration de lits sélectionnée
    const [contactTarget, setContactTarget] = useState(null); // Cible de la messagerie instantanée (prestataire de l'hôtel)
    
    // Statistiques d'évaluation (avis clients)
    const [avisStats, setAvisStats] = useState({ pourcentageMoyenne: 0, nombreTotalAvis: 0 });

    // Récupère les statistiques moyennes des avis clients pour cet hôtel
    const fetchAvisStats = async () => {
        try {
            const res = await api.get(`/avis/moyenne/HOTEL/${id}`);
            setAvisStats(res.data);
        } catch (err) {
            console.error("Erreur stats avis:", err);
        }
    };

    // Effet de chargement initial : récupère toutes les informations nécessaires à l'affichage de l'hôtel
    useEffect(() => {
        const load = async () => {
            if (!id) return;
            setLoading(true);
            setFetchError(null);
            try {
                // Étape 1 : Récupération des détails principaux de l'hôtel
                const h = await hotelService.getHotelParId(id);
                if (!h) {
                    setFetchError("Cet hôtel n'existe pas ou n'est plus disponible.");
                    setLoading(false);
                    return;
                }
                setHotel(h);

                // Étape 2 : Récupération de la liste des chambres configurées pour l'hôtel
                const r = await chambreService.getChambresParHotel(id);
                setRooms(r || []);
                
                // Étape 3 : Récupération des formules hôtelières associées
                const f = await hotelService.getFormulesHotel(id);
                setFormules(f || []);

            } catch (err) {
                console.error("Erreur chargement détails hôtel:", err);
                if (err.response?.status === 401) {
                    // L'intercepteur de api.js redirigera l'utilisateur vers la page de connexion si non authentifié
                    return;
                }
                setFetchError("Impossible de charger les informations de l'hôtel. Vérifiez votre connexion.");
            } finally {
                setLoading(false);
            }
        };
        load();
        fetchAvisStats();
    }, [id]);

    // Traitement des images de l'hôtel : découpe de la chaîne d'URLs séparées par des virgules
    const images = hotel?.urlImage ? hotel.urlImage.split(',').filter(Boolean) : [];
    // État pour suivre l'index de l'image courante dans la galerie carrousel
    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

    // Lance un défilement automatique des photos du carrousel toutes les 5 secondes
    React.useEffect(() => {
        if (images.length > 1) {
            const interval = setInterval(() => {
                setCurrentImageIndex((prev) => (prev + 1) % images.length);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [images.length]);

    // Affichage d'un écran de chargement durant l'initialisation des données
    if (loading || authLoading) return (
        <div className="loading-screen">
            <div className="loading-spinner"></div>
            <h3 className="fw-700 mt-3">{t('hotel_details.loading')}</h3>
        </div>
    );
    
    // Affichage d'un message d'erreur si la récupération des données de l'hôtel a échoué
    if (fetchError || !hotel) return (
        <div className="container py-5 mt-5 text-center">
            <div className="alert alert-danger shadow-sm border-0 rounded-4 p-5">
                <i className="bi bi-exclamation-triangle-fill display-1 mb-4"></i>
                <h2 className="fw-800 mb-3">{fetchError || "Hôtel introuvable"}</h2>
                <p className="text-secondary mb-4">{t('hotel_details.loading_error_desc') || "Impossible de charger les informations."}</p>
                <button onClick={() => navigate(user && (user.role === 'ROLE_TOURISTE' || user.role === 'TOURISTE') ? '/touriste' : '/')} className="btn btn-primary btn-lg rounded-pill px-5 fw-700 shadow-sm border-0">
                    <i className="bi bi-arrow-left me-2"></i> {t('common.back')}
                </button>
            </div>
        </div>
    );

    return (
        // Conteneur général avec classe dédiée pour l'hôtel
        <div className="touriste-hotel-details min-vh-100 bg-body">
            {/* Barre de navigation supérieure (Topbar) */}
            <Topbar />
            <main className="container-fluid pt-2 pb-4 px-lg-5">
                <div className="container-fluid px-lg-4 px-xl-5">
                    {/* Section En-tête : Bouton retour et titre d'accueil */}
                    <header className="page-header d-flex align-items-center justify-content-between mb-4">
                        <div className="d-flex align-items-center" style={{ flex: '1' }}>
                            <button 
                                onClick={() => navigate(user && (user.role === 'ROLE_TOURISTE' || user.role === 'TOURISTE') ? '/touriste' : '/')} 
                                className="btn btn-sm btn-body border-0 rounded-pill px-3 py-2 fw-700 text-muted d-flex align-items-center transition-all hover-translate-x"
                                style={{ background: 'var(--bg-card)' }}
                            >
                                <i className="bi bi-arrow-left-short fs-4 me-1"></i> {t('hotel_details.back')}
                            </button>
                        </div>
                        <div className="text-center" style={{ flex: '2' }}>
                            <h1 className="fw-800 text-body mb-0 fs-1">Bienvenue à <span className="text-primary">{hotel.nom}</span></h1>
                        </div>
                        <div className="d-flex justify-content-end" style={{ flex: '1' }}>
                            {/* Espace vide conservé pour centrer correctement le titre */}
                        </div>
                    </header>

                    <div className="row g-4">
                        {/* Section Principale : Carte avec carrousel photo et description de l'établissement */}
                        <div className="col-12">
                            <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
                                {/* Conteneur de la galerie photos */}
                                <div className="gallery-container bg-secondary-subtle position-relative" style={{ height: '450px' }}>
                                    {images.length > 0 ? (
                                        <>
                                            {/* Rendu dynamique des photos avec effet de fondu contrôlé par currentImageIndex */}
                                            {images.map((img, idx) => (
                                                <img 
                                                    key={idx}
                                                    src={img} 
                                                    alt={`${hotel.nom} - ${idx + 1}`} 
                                                    className={`w-100 h-100 object-fit-cover position-absolute top-0 start-0 transition-opacity duration-1000 ${idx === currentImageIndex ? 'opacity-100' : 'opacity-0'}`} 
                                                    style={{ transition: 'opacity 1.5s ease-in-out' }}
                                                />
                                            ))}
                                            {/* Indicateurs en bas du carrousel de photos */}
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
                                        // Image par défaut si aucune photo n'est configurée
                                        <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-light text-muted fs-1">
                                            <i className="bi bi-building"></i>
                                        </div>
                                    )}
                                    {/* Overlay d'assombrissement avec nom et note d'évaluation globale */}
                                    <div className="gallery-overlay d-flex align-items-end z-2">
                                        <div>
                                            <div className="d-flex align-items-center gap-2 mb-3 animate-up">
                                                <span className="badge bg-primary rounded-pill px-3 py-2 fw-800 shadow-sm">Établissement Vérifié</span>
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
                                            <h1 className="text-white fw-900 display-4 mb-0 animate-up" style={{ animationDelay: '0.1s' }}>{hotel.nom}</h1>
                                        </div>
                                    </div>
                                </div>
                                <div className="card-body p-4 p-md-5">
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <h2 className="fw-800 mb-0">{t('hotel_details.about')} {hotel.nom}</h2>
                                        {user?.id !== hotel.utilisateur?.id && (
                                            <div className="d-flex align-items-center gap-2">
                                                <button 
                                                    onClick={() => !user ? navigate('/login') : setContactTarget({ user: hotel.utilisateur, t: Date.now() })} 
                                                    className="btn-premium btn btn-outline-primary shadow-sm"
                                                >
                                                    <i className="bi bi-chat-dots-fill me-2"></i> {t('hotel_details.contact_btn')}
                                                </button>
                                                <button 
                                                     onClick={() => {
                                                         if (!user) return navigate('/login');
                                                         setSelectedRoomType(null); // Reset pour permettre le choix de toutes les catégories
                                                         setIsModalOpen(true);
                                                     }} 
                                                     className="btn-premium btn btn-primary shadow-lg"
                                                     style={{ background: 'var(--premium-orange)', border: 'none' }}
                                                 >
                                                     <i className="bi bi-calendar-check-fill me-2"></i> {t('hotel_details.reserve_btn')}
                                                 </button>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-body-secondary lead mb-5 fw-500 opacity-75">{hotel.description}</p>
                                    
                                    <div className="row g-4 mb-4 mt-2">
                                        <div className="col-lg-8">
                                            <h4 className="fw-800 mb-4 d-flex align-items-center">
                                                <i className="bi bi-geo-alt-fill text-danger me-2"></i> {t('hotel_details.address_title')}
                                            </h4>
                                            <ProviderMapDisplay localisation={hotel.localisation} providerName={hotel.nom} />
                                        </div>
                                        <div className="col-lg-4">
                                            <h4 className="fw-800 mb-4 d-flex align-items-center">
                                                <i className="bi bi-info-circle-fill text-primary me-2"></i> {t('hotel_details.practical_info')}
                                            </h4>
                                            <div className="info-glass-card p-0 overflow-hidden">
                                                <div className="d-flex align-items-center p-3 border-bottom border-light-subtle">
                                                    <div className="bg-primary-subtle text-primary rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                                                        <i className="bi bi-geo-alt fs-4"></i>
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <span className="text-muted smaller fw-800 text-uppercase letter-spacing-1 d-block mb-1" style={{ fontSize: '0.65rem' }}>{t('hotel_details.address_title')}</span>
                                                        <span className="fw-700 text-body text-truncate d-block fs-6">{hotel.adresse || "Adresse non spécifiée"}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="d-flex align-items-center p-3 border-bottom border-light-subtle">
                                                    <div className="bg-info-subtle text-info rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                                                        <i className="bi bi-envelope-at fs-4"></i>
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <span className="text-muted smaller fw-800 text-uppercase letter-spacing-1 d-block mb-1" style={{ fontSize: '0.65rem' }}>{t('hotel_details.email_label')}</span>
                                                        <span className="fw-700 text-body text-truncate d-block fs-6">{hotel.email || hotel.utilisateur?.email || "Email non spécifié"}</span>
                                                    </div>
                                                </div>

                                                <div className="d-flex align-items-center p-3">
                                                    <div className="bg-success-subtle text-success rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                                                        <i className="bi bi-telephone-plus fs-4"></i>
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <span className="text-muted smaller fw-800 text-uppercase letter-spacing-1 d-block mb-1" style={{ fontSize: '0.65rem' }}>{t('hotel_details.phone_label')}</span>
                                                        <span className="fw-700 text-body text-truncate d-block fs-6">{hotel.telephone || hotel.utilisateur?.telephone || "Téléphone non spécifié"}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Grille des services et points forts de l'établissement (ex: Wifi, Piscine, Parking...) */}
                                    <h3 className="fw-800 mb-4 mt-5 d-flex align-items-center">
                                        <i className="bi bi-patch-check-fill text-success me-2"></i> {t('hotel_details.highlights')}
                                    </h3>
                                    <div className="row g-3 mb-5">
                                        {[
                                            { key: 'aReception24h', label: t('hotel_details.amenities.reception24h'), icon: 'bi-person-badge' },
                                            { key: 'aSecurite24h', label: t('hotel_details.amenities.security24h'), icon: 'bi-shield-check' },
                                            { key: 'aWifiGenerale', label: t('hotel_details.amenities.wifi'), icon: 'bi-wifi' },
                                            { key: 'aParking', label: t('hotel_details.amenities.parking'), icon: 'bi-p-square' },
                                            { key: 'aAscenseur', label: t('hotel_details.amenities.elevator'), icon: 'bi-arrows-expand' },
                                            { key: 'aPiscine', label: t('hotel_details.amenities.pool'), icon: 'bi-water' },
                                            { key: 'aServiceReception', label: t('hotel_details.amenities.reception_hall'), icon: 'bi-cup-hot' }
                                        ].map(item => (hotel[item.key] && (
                                            <div key={item.key} className="col-sm-6 col-md-4">
                                                <div className="amenity-pill d-flex align-items-center gap-2">
                                                    <i className={`bi ${item.icon}`}></i> {item.label}
                                                </div>
                                            </div>
                                        )))}
                                        { (!hotel.aReception24h && !hotel.aSecurite24h && !hotel.aWifiGenerale && !hotel.aParking && !hotel.aAscenseur && !hotel.aPiscine && !hotel.aServiceReception) && (
                                            <div className="col-12 text-muted small fst-italic">Consultez la description pour plus de détails sur les services.</div>
                                        )}
                                    </div>

                                    <h3 className="fw-800 mb-4 d-flex align-items-center">
                                        <i className="bi bi-door-open-fill text-primary me-2"></i> {t('hotel_details.room_types')}
                                    </h3>
                                    <div className="d-flex overflow-x-auto gap-3 pb-4 rooms-slider" style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                                        {rooms.length > 0 ? (() => {
                                            // Grouper par type pour n'afficher qu'une carte par catégorie
                                            const groupedRooms = rooms.reduce((acc, r) => {
                                                if (!acc[r.type]) acc[r.type] = { ...r, count: 0 };
                                                acc[r.type].count += 1;
                                                return acc;
                                            }, {});

                                            return Object.values(groupedRooms).map(r => (
                                                <div key={r.type} className="flex-shrink-0" style={{ width: '280px', scrollSnapAlign: 'start' }}>
                                                    <div 
                                                        className="room-card-premium overflow-hidden h-100 d-flex flex-column position-relative" 
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => setDetailedRoom(r)}
                                                    >
                                                        {r.count > 1 && (
                                                            <span className="position-absolute top-0 end-0 m-3 glass-pill text-white fw-800 shadow-sm" style={{ zIndex: 2, fontSize: '0.75rem' }}>
                                                                {r.count} {r.count > 1 ? 'Unités' : 'Unité'}
                                                            </span>
                                                        )}
                                                        <div className="card-img-top bg-body-tertiary position-relative" style={{ height: '160px' }}>
                                                            {r.urlImage ? (
                                                                 <img src={r.urlImage.split(',')[0]} alt={r.type} className="w-100 h-100 object-fit-cover" />
                                                            ) : (
                                                                <div className="w-100 h-100 d-flex align-items-center justify-content-center text-muted fs-1">
                                                                     <i className="bi bi-door-closed"></i>
                                                                 </div>
                                                            )}
                                                        </div>
                                                        <div className="card-body p-4 d-flex flex-column">
                                                            <h5 className="fw-800 text-body mb-2">{r.type}</h5>
                                                            <div className="d-flex align-items-center gap-3 mb-3">
                                                                <span className="small text-muted fw-600"><i className="bi bi-people me-1"></i> {r.capacite} pers.</span>
                                                                {r.aWifi !== false && <span className="small text-success fw-600"><i className="bi bi-wifi me-1"></i> Wifi</span>}
                                                            </div>
                                                            {/* Affichage des prix détaillé selon le type */}
                                                            <div className="mt-auto">
                                                                {['QUADRUPLE','FAMILIALE','SUITE'].includes(r.type) ? (
                                                                    <div className="d-flex align-items-baseline gap-2">
                                                                        <span className="fw-900 fs-3 text-primary">{r.prixLibre || '—'} {r.prixLibre ? 'DT' : ''}</span>
                                                                        <span className="text-muted small fw-700">prix libre</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="d-flex flex-column gap-1">
                                                                        <div className="d-flex align-items-center gap-2">
                                                                            <span className="badge bg-primary-subtle text-primary fw-700 rounded-pill" style={{fontSize:'0.65rem'}}>Adulte</span>
                                                                            <span className="fw-900 fs-5 text-primary">{r.prix} DT</span>
                                                                        </div>
                                                                        <div className="d-flex align-items-center gap-2">
                                                                            <span className="badge bg-secondary-subtle text-secondary fw-700 rounded-pill" style={{fontSize:'0.65rem'}}>Suppl.</span>
                                                                            <span className="fw-700 text-muted">{r.prixParAdulte || '—'} {r.prixParAdulte ? 'DT' : ''}</span>
                                                                        </div>
                                                                        {r.prixLibre > 0 && (
                                                                            <div className="d-flex align-items-center gap-2">
                                                                                <span className="badge bg-warning-subtle text-warning fw-700 rounded-pill" style={{fontSize:'0.65rem'}}>Libre</span>
                                                                                <span className="fw-700 text-muted">{r.prixLibre} DT</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ));
                                        })() : (
                                            <div className="col-12 w-100 text-center py-5 bg-body-tertiary rounded-4 border border-dashed text-muted">
                                                {t('hotel_details.no_rooms')}
                                            </div>
                                        )}
                                    </div>

                                    {/* Section des évaluations et des commentaires formulés par les clients */}
                                    <div className="reviews-section mt-5 animate-in-y">
                                        <h3 className="fw-800 mb-4 d-flex align-items-center">
                                            <i className="bi bi-star-fill text-warning me-2"></i> Avis des clients
                                        </h3>
                                        <div className="reviews-header">
                                            {/* Rendu des statistiques globales d'avis */}
                                            <AvisStats 
                                                percentage={avisStats.pourcentageMoyenne} 
                                                totalAvis={avisStats.nombreTotalAvis} 
                                            />
                                            {/* Formulaire pour rédiger et soumettre un nouvel avis */}
                                            <AvisForm 
                                                idService={id} 
                                                typeService="HOTEL" 
                                                onAvisSubmitted={fetchAvisStats} 
                                            />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* === STYLES CSS SPÉCIFIQUES À L'INTERFACE HÔTEL === */}
            <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
                    
                    :root {
                        --premium-blue: #0ea5e9;
                        --premium-orange: #f97316;
                    }

                    .touriste-hotel-details {
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
                        background: var(--bg-card, rgba(255, 255, 255, 0.05));
                        border: 1px solid rgba(0, 0, 0, 0.1);
                        border-radius: 1.5rem;
                        padding: 1.25rem;
                        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
                    }

                    [data-bs-theme="dark"] .info-glass-card {
                        background: rgba(255, 255, 255, 0.03);
                        border-color: rgba(255, 255, 255, 0.1);
                        box-shadow: none;
                    }

                    .info-glass-card:hover {
                        background: rgba(255, 255, 255, 0.07);
                        transform: translateX(10px) scale(1.02);
                        border-color: var(--premium-blue);
                        box-shadow: 0 10px 30px -5px rgba(0,0,0,0.3);
                    }

                    .room-card-premium {
                        background: var(--bg-glass);
                        border: 1px solid var(--border-glass);
                        border-radius: 2rem;
                        transition: all 0.4s ease;
                    }

                    .room-card-premium:hover {
                        transform: translateY(-12px);
                        background: var(--bg-glass-hover);
                        border-color: var(--premium-blue);
                    }

                    .amenity-pill {
                        background: rgba(14, 165, 233, 0.1);
                        color: var(--premium-blue);
                        padding: 0.6rem 1.2rem;
                        border-radius: 100px;
                        font-weight: 700;
                        font-size: 0.9rem;
                        border: 1px solid rgba(14, 165, 233, 0.2);
                        transition: all 0.3s ease;
                    }

                    .amenity-pill:hover {
                        background: var(--premium-blue);
                        color: white;
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
                        box-shadow: 0 15px 30px -5px rgba(14, 165, 233, 0.4);
                    }

                    .animate-up {
                        animation: fadeInUp 0.8s ease-out forwards;
                    }

                    @keyframes fadeInUp {
                        from { opacity: 0; transform: translateY(40px); }
                        to { opacity: 1; transform: translateY(0); }
                    }

                    .rooms-slider::-webkit-scrollbar { display: none; }
                `}</style>
                {/* Modale présentant les détails approfondis d'une chambre sélectionnée */}
                <RoomDetailsModal 
                    isOpen={!!detailedRoom} 
                    onClose={() => setDetailedRoom(null)} 
                    room={detailedRoom} 
                    hotel={hotel} 
                    allRooms={rooms} 
                    onReserveClick={(roomType, bedConfig) => {
                        setSelectedRoomType(roomType);
                        setSelectedBedConfig(bedConfig || null);
                        setIsModalOpen(true);
                    }} 
                />
                {/* Modale centrale pour finaliser les étapes de réservation d'hôtel */}
                <HotelReservationModal 
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedBedConfig(null); // Réinitialisation de la config après fermeture
                    }}
                    initialRoomType={selectedRoomType}
                    initialBedConfig={selectedBedConfig}
                    hotelId={id}
                    rooms={rooms}
                    formules={formules}
                    user={user}
                />
            </main>
            {/* Centre de messagerie connecté pour contacter le gérant de l'hôtel */}
            {contactTarget && (
                <MessageCenter 
                    onClose={() => setContactTarget(null)} 
                    initialInterlocutor={contactTarget} 
                />
            )}
        </div>
    );
};

export default HotelDetails;
