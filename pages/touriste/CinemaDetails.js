// Importation des dépendances React de base pour les états, effets et contextes
import React, { useEffect, useState, useContext } from 'react';
// Hooks de navigation et d'analyse d'URL
import { useLocation, useNavigate, useParams } from 'react-router-dom';
// Instance personnalisée d'API (axios configuré)
import api from '../../services/api';
// Contexte d'authentification utilisateur
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
// Composants globaux de l'interface (barre supérieure, centre de messagerie, affichage de carte, avis)
import Topbar from '../../components/layout/Topbar';
import MessageCenter from '../../components/messagerie/CentreMessagerie';
import ProviderMapDisplay from '../../components/espace-client/AffichageCarte';
import AvisStats from '../../components/reviews/AvisStats';
import AvisForm from '../../components/reviews/AvisForm';
import '../../components/reviews/Avis.css';
// Services pour gérer les requêtes de réservations
import reservationService from '../../services/reservationService';
// Composant personnalisé de saisie de numéro de téléphone
import PhoneInput from '../../components/common/PhoneInput';

const CinemaDetails = () => {
    // Récupération de l'ID du cinéma depuis l'URL
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    
    // Possibilité de récupérer les données du cinéma transmises par l'historique de navigation
    const cinemaFromState = location.state?.item;
    
    // Récupération de l'utilisateur connecté via le contexte Auth
    const { user, logout } = useContext(AuthContext);
    
    // États locaux pour les données principales du cinéma
    const [cinema, setCinema] = useState(cinemaFromState || null); // Infos du cinéma
    const [films, setFilms] = useState([]); // Liste des films et projections à venir
    const [loading, setLoading] = useState(true); // État de chargement initial de la page
    const [error, setError] = useState(null); // Erreur de requête éventuelle
    const [contactTarget, setContactTarget] = useState(null); // Prestataire à contacter via messagerie
    
    // Moyenne et quantité d'avis des touristes
    const [avisStats, setAvisStats] = useState({ pourcentageMoyenne: 0, nombreTotalAvis: 0 });

    // États propres au tunnel de réservation (multi-étapes)
    const [step, setStep] = useState(0); // Étape active : 0 = Film/Tickets, 1 = Coordonnées, 2 = Récap/Paiement
    const [showResModal, setShowResModal] = useState(false); // Visibilité du modal de réservation
    const [resForm, setResForm] = useState({ // Données du formulaire de réservation
        filmId: '',
        nombreTickets: 1,
        clientNom: user?.nom || '',
        clientPrenom: user?.prenom || '',
        clientEmail: user?.email || '',
        clientTelephone: user?.telephone || ''
    });
    const [submitting, setSubmitting] = useState(false); // Indicateur de chargement lors de la confirmation
    const [isDirectRes, setIsDirectRes] = useState(false); // Indique si la réservation a été déclenchée sur un film précis

    useEffect(() => {
        if (user) {
            setResForm(prev => ({
                ...prev,
                clientNom: user.nom || '',
                clientPrenom: user.prenom || '',
                clientEmail: user.email || '',
                clientTelephone: user.telephone || ''
            }));
        }
    }, [user]);
    useEffect(() => {
        if (films.length > 0 && !resForm.filmId) {
            setResForm(prev => ({
                ...prev,
                filmId: films[0].id.toString()
            }));
        }
    }, [films]);
    const selectedFilm = films.find(f => f.id === parseInt(resForm.filmId)) || null;

    // Passage à l'étape suivante (informations personnelles) avec validations (séance complète ou passée)
    const handleNextStep = (e) => {
        e.preventDefault();
        if (!resForm.filmId) {
            alert("Veuillez choisir un film.");
            return;
        }
        if (selectedFilm?.placesDisponibles !== undefined && selectedFilm.placesDisponibles <= 0) {
            alert("⚠️ Désolé, ce film est complet (Sold out).");
            return;
        }
        const filmDateStr = selectedFilm?.dateProjection;
        if (filmDateStr && new Date(filmDateStr) < new Date()) {
            alert("❌ Vous ne pouvez pas réserver pour une séance déjà passée.");
            return;
        }
        setStep(1);
    };

    // Validation de l'étape 1 pour passer au récapitulatif (étape 2)
    const handleStep1Submit = (e) => {
        e.preventDefault();
        setStep(2);
    };

    const handleConfirmAndPay = async (e) => {
        e.preventDefault();
        if (!selectedFilm) return;
        setSubmitting(true);
        try {
            const req = { 
                idEvenement: selectedFilm.id, 
                nombreTickets: resForm.nombreTickets,
                clientNom: resForm.clientNom,
                clientPrenom: resForm.clientPrenom,
                clientEmail: resForm.clientEmail,
                clientTelephone: resForm.clientTelephone,
                prixTotal: (selectedFilm.prix || 0) * resForm.nombreTickets
            };
            
            const response = await reservationService.reserverCinema(req);
            const reservationId = response.data.id || response.data.reservationId;

            if (reservationId) {
                const paymentRes = await api.post(`/payments/create-session/${reservationId}`);
                const { url } = paymentRes.data;

                if (url) {
                    window.location.href = url;
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

    const fetchAvisStats = async () => {
        try {
            const res = await api.get(`/avis/moyenne/CINEMA/${id}`);
            setAvisStats(res.data);
        } catch (err) {
            console.error("Erreur stats avis:", err);
        }
    };

    useEffect(() => {
        const loadCinemaData = async () => {
            setLoading(true);
            try {
                let activeCinema = cinema;
                if (!activeCinema && id) {
                    const res = await api.get(`/cinemas/${id}`);
                    activeCinema = res.data;
                    setCinema(activeCinema);
                }

                if (activeCinema) {
                    const resFilms = await api.get(`/films/cinema/${activeCinema.id}`);
                    const now = new Date();
                    const futureFilms = resFilms.data.filter(f => {
                        if (!f.dateProjection) return false;
                        let parsedDate = Array.isArray(f.dateProjection)
                            ? new Date(f.dateProjection[0], f.dateProjection[1] - 1, f.dateProjection[2], f.dateProjection[3] || 0, f.dateProjection[4] || 0)
                            : new Date(f.dateProjection);
                        return parsedDate >= now;
                    });
                    setFilms(futureFilms);
                }
            } catch (err) {
                console.error("❌ Erreur chargement cinéma:", err);
                setError(err.response?.data?.message || err.message || "Impossible de charger les détails du cinéma.");
            } finally {
                setLoading(false);
            }
        };

        loadCinemaData();
        fetchAvisStats();
    }, [id, cinema]);



    const images = cinema?.urlImage ? cinema.urlImage.split(',').filter(Boolean) : [];
    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

    React.useEffect(() => {
        if (images.length > 1) {
            const interval = setInterval(() => {
                setCurrentImageIndex((prev) => (prev + 1) % images.length);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [images.length]);

    if (loading) return (
        <div className="loading-screen text-center">
            <div className="loading-spinner"></div>
            <h3 className="fw-700 mt-4 text-secondary">🎥 Ouverture des rideaux...</h3>
            <p className="text-muted small">Préparation de votre séance à Djerba</p>
        </div>
    );

    if (error || !cinema) return (
        <div className="container py-5 mt-5 text-center">
            <div className="alert alert-danger shadow-sm border-0 rounded-4 p-5">
                <i className="bi bi-camera-reels display-1 mb-4"></i>
                <h2 className="fw-800 mb-3">{error || "Cinéma introuvable"}</h2>
                <button onClick={() => navigate(user && (user.role === 'ROLE_TOURISTE' || user.role === 'TOURISTE') ? '/touriste' : '/')} className="btn btn-primary rounded-pill px-5 fw-700">Retour au catalogue</button>
            </div>
        </div>
    );

    return (
        // Conteneur principal
        <div className="touriste-cinema-details min-vh-100 bg-light">
            <Topbar onLogout={logout} />
            <main className="container-fluid pt-2 pb-4 px-lg-5">
                <div className="container-fluid px-lg-4 px-xl-5">
                    {/* Header : bouton retour et nom du cinéma */}
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
                            <h1 className="fw-800 text-dark mb-0 fs-1">Bienvenue à <span className="text-primary">{cinema.nom}</span></h1>
                        </div>
                        <div className="d-flex justify-content-end" style={{ flex: '1' }}></div>
                    </header>

                    <div className="row g-4">
                        <div className="col-12">
                            <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
                                {/* Carrousel Galerie photo du Cinéma */}
                                <div className="gallery-container bg-secondary-subtle position-relative" style={{ height: '450px' }}>
                                    {images.length > 0 ? (
                                        <>
                                            {images.map((img, idx) => (
                                                <img 
                                                    key={idx}
                                                    src={img} 
                                                    alt={`${cinema.nom} - ${idx + 1}`} 
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
                                            <i className="bi bi-film"></i>
                                        </div>
                                    )}
                                    <div className="gallery-overlay d-flex align-items-end z-2">
                                        <div>
                                            <div className="d-flex align-items-center gap-2 mb-3 animate-up">
                                                <span className="badge bg-primary rounded-pill px-3 py-2 fw-800 shadow-sm">Salle de Cinéma Vérifiée</span>
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
                                            <h1 className="text-white fw-900 display-4 mb-0 animate-up" style={{ animationDelay: '0.1s' }}>{cinema.nom}</h1>
                                        </div>
                                    </div>
                                </div>
                                <div className="card-body p-4 p-md-5 animate-up" style={{ animationDelay: '0.2s' }}>
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <h3 className="fw-800 mb-0">À propos</h3>
                                        {user?.id !== cinema.utilisateur?.id && (
                                            <div className="d-flex align-items-center gap-2">
                                                <button 
                                                    onClick={() => !user ? navigate('/login') : setContactTarget({ user: cinema.utilisateur, t: Date.now() })} 
                                                    className="btn-premium btn btn-outline-primary shadow-sm"
                                                >
                                                    <i className="bi bi-chat-dots-fill me-2"></i> Contacter
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        if (!user) {
                                                            navigate('/login');
                                                        } else {
                                                            if (films.length > 0 && !resForm.filmId) {
                                                                setResForm(prev => ({ ...prev, filmId: films[0].id.toString(), nombreTickets: 1 }));
                                                            } else {
                                                                setResForm(prev => ({ ...prev, nombreTickets: 1 }));
                                                            }
                                                            setIsDirectRes(false);
                                                            setStep(0);
                                                            setShowResModal(true);
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
                                    <p className="text-secondary lead mb-5">
                                        {cinema.description || `Découvrez les dernières sorties cinématographiques au ${cinema.nom}. Un confort exceptionnel pour vos soirées cinéma à Djerba.`}
                                    </p>

                                    <div className="row g-4 mb-4 mt-2">
                                        <div className="col-lg-8">
                                            <h4 className="fw-800 mb-4 d-flex align-items-center">
                                                <i className="bi bi-geo-alt-fill text-primary me-2"></i> Adresse
                                            </h4>
                                            <ProviderMapDisplay localisation={cinema.localisation} providerName={cinema.nom} />
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
                                                        <span className="fw-700 text-body text-truncate d-block fs-6">{cinema.adresse || "Lieu non spécifié"}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="d-flex align-items-center p-3 border-bottom border-light-subtle">
                                                    <div className="bg-info-subtle text-info rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                                                        <i className="bi bi-envelope-at fs-4"></i>
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <span className="text-muted smaller fw-800 text-uppercase letter-spacing-1 d-block mb-1" style={{ fontSize: '0.65rem' }}>Contact Email</span>
                                                        <span className="fw-700 text-body text-truncate d-block fs-6">{cinema.utilisateur?.email || "Email non spécifié"}</span>
                                                    </div>
                                                </div>

                                                <div className="d-flex align-items-center p-3">
                                                    <div className="bg-success-subtle text-success rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                                                        <i className="bi bi-telephone-plus fs-4"></i>
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <span className="text-muted smaller fw-800 text-uppercase letter-spacing-1 d-block mb-1" style={{ fontSize: '0.65rem' }}>Téléphone</span>
                                                        <span className="fw-700 text-body text-truncate d-block fs-6">{cinema.utilisateur?.telephone || "Téléphone non spécifié"}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Grille et tableau des projections programmées pour l'établissement */}
                                    <div id="films-section" className="d-flex align-items-center justify-content-between mb-4 mt-5">
                                        <h4 className="fw-800 mb-0 d-flex align-items-center">
                                            <i className="bi bi-film text-primary me-2"></i> Films à l'affiche
                                        </h4>
                                        <span className="badge bg-light text-muted border px-3 py-2 fw-700">{films.length} séance(s)</span>
                                    </div>
 
                                    <div className="table-responsive rounded-4 border overflow-hidden">
                                        <table className="table table-hover align-middle mb-0">
                                             <thead className="bg-light">
                                                 <tr>
                                                     <th className="px-4 py-3 border-0 small fw-800 text-muted text-uppercase">Affiche</th>
                                                     <th className="py-3 border-0 small fw-800 text-muted text-uppercase">Film</th>
                                                     <th className="py-3 border-0 small fw-800 text-muted text-uppercase">Catégorie</th>
                                                     <th className="py-3 border-0 small fw-800 text-muted text-uppercase">Horaire</th>
                                                     <th className="py-3 border-0 small fw-800 text-muted text-uppercase">Prix</th>
                                                     <th className="py-3 border-0 text-end pe-4 small fw-800 text-muted text-uppercase">Action</th>
                                                 </tr>
                                             </thead>
                                             <tbody>
                                                 {films.length > 0 ? films.map(film => (
                                                     <tr key={film.id} className="film-row">
                                                         <td className="px-4 py-4 border-light">
                                                             {film.urlImage ? (
                                                                 <img src={film.urlImage} alt={film.titre} className="rounded-3 shadow-sm" style={{ width: '55px', height: '80px', objectFit: 'cover' }} />
                                                             ) : (
                                                                 <div className="bg-light rounded-3 d-flex align-items-center justify-content-center text-muted" style={{ width: '55px', height: '80px' }}>
                                                                     <i className="bi bi-film fs-3 opacity-25"></i>
                                                                 </div>
                                                             )}
                                                         </td>
                                                         <td className="py-4 border-light">
                                                             <div className="fw-800 text-body mb-1">{film.titre}</div>
                                                             <div className="text-muted small d-flex align-items-center gap-1">
                                                                 <i className="bi bi-clock-fill text-primary"></i> {film.duree} min
                                                             </div>
                                                         </td>
                                                         <td className="py-4 border-light">
                                                             <span className="badge bg-purple-subtle text-purple rounded-pill px-3 py-2 small fw-800" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>{film.genre || 'Cinéma'}</span>
                                                         </td>
                                                         <td className="py-4 border-light">
                                                             <div className="fw-700 text-body mb-0">
                                                                 {new Date(film.dateProjection).toLocaleString('fr-FR', {
                                                                     day: '2-digit', month: 'short'
                                                                 })}
                                                             </div>
                                                             <div className="fw-900 text-primary small">
                                                                 {new Date(film.dateProjection).toLocaleString('fr-FR', {
                                                                     hour: '2-digit', minute: '2-digit'
                                                                 })}
                                                             </div>
                                                         </td>
                                                         <td className="py-4 border-light">
                                                             <div className="d-flex align-items-baseline gap-1">
                                                                 <span className="fw-900 fs-5 text-body">{film.prix}</span>
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
                                                                          if (film.placesDisponibles !== undefined && film.placesDisponibles <= 0) {
                                                                              alert("⚠️ Désolé, cette séance est complète (Sold out).");
                                                                              return;
                                                                          }
                                                                          setResForm(prev => ({ ...prev, filmId: film.id.toString(), nombreTickets: 1 }));
                                                                          setIsDirectRes(true);
                                                                          setStep(0);
                                                                          setShowResModal(true);
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
                                                         <td colSpan="6" className="py-5 text-center text-muted border-0">
                                                             <i className="bi bi-calendar-x fs-2 d-block mb-3 opacity-25"></i>
                                                             Aucune séance programmée pour le moment.
                                                         </td>
                                                     </tr>
                                                 )}
                                             </tbody>
                                        </table>
                                    </div>

                                    {/* Zone des avis des touristes */}
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
                                                typeService="CINEMA" 
                                                onAvisSubmitted={fetchAvisStats} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
                    
                    :root {
                        --premium-purple: #8b5cf6;
                        --premium-orange: #f97316;
                    }

                    .touriste-cinema-details {
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
                        border-color: var(--premium-purple);
                        box-shadow: 0 10px 30px -5px rgba(0,0,0,0.3);
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
                    
                    .film-row {
                        transition: all 0.3s ease;
                        cursor: pointer;
                    }

                    .film-row:hover {
                        background-color: rgba(0,0,0,0.02) !important;
                        transform: scale(1.005);
                    }

                    .animate-fade-in { animation: fade-in 0.3s ease-out; }
                    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                `}</style>
            </main>

            {/* === TUNNEL DE RÉSERVATION DU CINÉMA === */}
            {showResModal && (
                <div className="modal-overlay animate-fade-in" style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
                    zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                }}>
                    <div className="bg-white rounded-4 shadow-lg overflow-hidden position-relative d-flex flex-column"
                         style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh' }}>
                        
                        {/* En-tête du Modal avec indication de l'étape courante */}
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

                        {/* Corps du modal défilable */}
                        <div className="p-4 p-md-5 overflow-auto" style={{ flex: '1 1 auto' }}>
                            {/* === ÉTAPE 0 : Sélection du film et du nombre de billets === */}
                            {step === 0 && (
                                <div className="animate-in-y">
                                    <form onSubmit={handleNextStep}>
                                        {isDirectRes ? (
                                            // Affichage statique si on réserve à partir de la ligne d'un film spécifique
                                            <div className="p-3 mb-3 rounded-3 bg-light border border-light-subtle">
                                                <span className="text-muted smaller fw-800 text-uppercase letter-spacing-1 d-block mb-1" style={{ fontSize: '0.65rem' }}>Film Sélectionné</span>
                                                <span className="fw-800 fs-5 text-dark">
                                                    {selectedFilm?.titre} — <span className="text-warning">{selectedFilm?.prix} DT</span>
                                                </span>
                                            </div>
                                        ) : (
                                            // Sélecteur déroulant si on clique sur le bouton réserver global
                                            <div className="form-floating mb-3">
                                                <select className="form-select rounded-3 border-0 bg-light shadow-none" id="filmSelect" required value={resForm.filmId} onChange={e => {
                                                    setResForm({...resForm, filmId: e.target.value});
                                                }}>
                                                    <option value="">-- Sélectionner un film --</option>
                                                    {films.map(f => <option key={f.id} value={f.id}>{f.titre} — {f.prix} DT</option>)}
                                                </select>
                                                <label htmlFor="filmSelect">Choisissez le film <span className="text-danger">*</span></label>
                                            </div>
                                        )}

                                        {/* Compteur interactif du nombre de tickets */}
                                        <div className="premium-counter mb-4" style={{ opacity: !resForm.filmId ? 0.6 : 1 }}>
                                            <button type="button" className="btn btn-link text-decoration-none px-3" onClick={() => setResForm({ ...resForm, nombreTickets: Math.max(1, resForm.nombreTickets - 1) })} disabled={!resForm.filmId || resForm.nombreTickets <= 1}>
                                                <i className="bi bi-dash-lg"></i>
                                            </button>
                                            <div className="flex-grow-1 text-center">
                                                <span className="d-block counter-label" style={{ fontSize: '0.65rem', marginTop: '2px' }}>Nombre de tickets {selectedFilm?.placesDisponibles !== undefined && `(Max ${selectedFilm.placesDisponibles})`}</span>
                                                <span className="fw-800 fs-5 counter-value">{resForm.nombreTickets}</span>
                                            </div>
                                            <button type="button" className="btn btn-link text-decoration-none px-3" onClick={() => setResForm({ ...resForm, nombreTickets: resForm.nombreTickets + 1 })} disabled={!resForm.filmId || (selectedFilm?.placesDisponibles !== undefined && resForm.nombreTickets >= selectedFilm.placesDisponibles)}>
                                                <i className="bi bi-plus-lg"></i>
                                            </button>
                                        </div>

                                        {/* Total calculé de l'étape 0 */}
                                        <div className="p-4 bg-light rounded-5 border border-dashed mb-4">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <span className="small fw-700 text-muted">Montant total :</span>
                                                <div className="d-flex align-items-baseline gap-1">
                                                    <span className="fw-800 fs-3 text-dark">{(selectedFilm?.prix || 0) * resForm.nombreTickets}</span>
                                                    <span className="text-muted fw-700 small">DT</span>
                                                </div>
                                            </div>
                                        </div>

                                        <button type="submit" disabled={!resForm.filmId} className="btn btn-primary w-100 py-3 rounded-4 fw-800 shadow-lg text-uppercase letter-spacing-1 border-0 transition-all hover-translate-y" style={{ background: '#f97316' }}>
                                            Continuer <i className="bi bi-arrow-right ms-2"></i>
                                        </button>
                                    </form>
                                </div>
                            )}

                            {/* === ÉTAPE 1 : Coordonnées du touriste === */}
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

                            {/* === ÉTAPE 2 : Récapitulatif des billets + bouton de redirection Stripe === */}
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
                                            <label className="text-secondary smaller fw-800 uppercase letter-spacing-1 d-block mb-1">Film</label>
                                            <div className="fw-700 text-dark">{selectedFilm?.titre}</div>
                                        </div>
                                        <div className="mb-3 border-bottom pb-2">
                                            <label className="text-secondary smaller fw-800 uppercase letter-spacing-1 d-block mb-1">Date projection</label>
                                            <div className="fw-700 text-dark">
                                                {selectedFilm?.dateProjection ? new Date(selectedFilm.dateProjection).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                                            </div>
                                        </div>
                                        <div className="mb-3 border-bottom pb-2">
                                            <label className="text-secondary smaller fw-800 uppercase letter-spacing-1 d-block mb-1">Nombre de tickets</label>
                                            <div className="fw-700 text-dark">{resForm.nombreTickets} place(s)</div>
                                        </div>
                                        <div className="d-flex justify-content-between align-items-baseline pt-2">
                                            <span className="fw-800 text-muted">Total à payer :</span>
                                            <div className="d-flex align-items-baseline gap-1">
                                                <span className="fw-800 fs-3 text-primary">{(selectedFilm?.prix || 0) * resForm.nombreTickets}</span>
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

            {/* Centre de messagerie connecté pour contacter le gérant du cinéma */}
            {contactTarget && (
                <MessageCenter 
                    onClose={() => setContactTarget(null)} 
                    initialInterlocutor={contactTarget} 
                />
            )}
        </div>
    );
};

export default CinemaDetails;

