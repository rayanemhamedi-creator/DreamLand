// Importation des hooks React nécessaires : gestion d'état, effets et contexte
import React, { useState, useEffect, useContext } from 'react';
// Importation des utilitaires de navigation et de récupération des paramètres d'URL
import { useLocation, useNavigate, useParams } from 'react-router-dom';
// Service HTTP générique pour communiquer avec le backend
import api from '../../services/api';
// Service spécialisé pour les opérations liées aux réservations
import reservationService from '../../services/reservationService';
// Contexte d'authentification pour accéder aux informations de l'utilisateur connecté
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
// Composant de barre de navigation supérieure
import Topbar from '../../components/layout/Topbar';
// Composant de messagerie entre touriste et prestataire
import MessageCenter from '../../components/messagerie/CentreMessagerie';
// Composant d'affichage de la carte géographique du prestataire
import ProviderMapDisplay from '../../components/espace-client/AffichageCarte';
// Composants d'affichage et de soumission des avis clients
import AvisStats from '../../components/reviews/AvisStats';
import AvisForm from '../../components/reviews/AvisForm';
import '../../components/reviews/Avis.css';
// Composant de saisie du numéro de téléphone avec sélection du pays
import PhoneInput from '../../components/common/PhoneInput';

const RestaurantDetails = () => {
    // Récupération de l'identifiant du restaurant depuis l'URL
    const { id } = useParams();
    // Hook de navigation pour rediriger l'utilisateur
    const navigate = useNavigate();
    // Accès à l'objet location pour récupérer les données transmises via la navigation
    const location = useLocation();
    // Données du restaurant passées depuis la page précédente
    const item = location.state?.item;
    // Informations de l'utilisateur connecté et fonction de déconnexion
    const { user, logout } = useContext(AuthContext);
    
    // Contrôle l'affichage du modal de réservation
    const [showResModal, setShowResModal] = useState(false);
    // Liste des tables disponibles récupérées depuis le backend
    const [availableTables, setAvailableTables] = useState([]);
    // Identifiants des tables sélectionnées par le client
    const [selectedTableIds, setSelectedTableIds] = useState([]);
    // Liste complète des menus du restaurant
    const [menus, setMenus] = useState([]);
    // Quantités choisies pour chaque menu (clé = id du menu, valeur = quantité)
    const [selectedMenus, setSelectedMenus] = useState({});
    // Indicateur de chargement lors de la récupération des tables disponibles
    const [loadingTables, setLoadingTables] = useState(false);
    // Formulaire de réservation avec les informations du client et les paramètres choisis
    const [resForm, setResForm] = useState({
        date: '',
        time: '',
        nombrePersonnes: 2,
        dureeHeures: 1,
        clientNom: user?.nom || '',
        clientPrenom: user?.prenom || '',
        clientEmail: user?.email || '',
        clientTelephone: user?.telephone || '',
        typeReservation: 'SUR_PLACE', // 'SUR_PLACE' ou 'A_EMPORTER'
    });
    // Message d'erreur à afficher dans le formulaire
    const [errorMsg, setErrorMsg] = useState('');
    // Indique si une soumission est en cours (pour désactiver le bouton)
    const [submitting, setSubmitting] = useState(false);
    // Données complètes du restaurant chargées depuis le backend
    const [restaurant, setRestaurant] = useState(item);
    // Catégorie de menu actuellement active dans l'onglet
    const [activeCategory, setActiveCategory] = useState(null);

    // Initialise la catégorie active dès que les menus sont chargés
    useEffect(() => {
        if (menus.length > 0 && !activeCategory) {
            setActiveCategory(menus[0].category?.nom || "Autres");
        }
    }, [menus]);
    // Destinataire de la messagerie (déclenche l'ouverture du centre de messages)
    const [contactTarget, setContactTarget] = useState(null);
    // Statistiques des avis : moyenne en pourcentage et nombre total
    const [avisStats, setAvisStats] = useState({ pourcentageMoyenne: 0, nombreTotalAvis: 0 });
    // Mois affiché dans le calendrier de sélection de date
    const [currentMonth, setCurrentMonth] = useState(new Date());
    // Indique si le client a accepté la condition de "dernière session"
    const [lastSessionAccepted, setLastSessionAccepted] = useState(false);
    // Étape actuelle du formulaire multi-étapes de réservation
    const [formStep, setFormStep] = useState(0);

    // Récupère les statistiques d'avis (note moyenne et nombre d'avis) pour ce restaurant
    const fetchAvisStats = async () => {
        try {
            const type = (restaurant?.type || restaurant?.typeRestaurant || item?.type || item?.typeRestaurant) === 'CAFE' ? 'CAFE' : 'RESTAURANT';
            const res = await api.get(`/avis/moyenne/${type}/${id}`);
            setAvisStats(res.data);
        } catch (err) {
            console.error("Erreur stats avis:", err);
        }
    };

    // Au montage du composant, charge les détails du restaurant et ses menus depuis l'API
    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const resp = await api.get(`/restaurants/${id}`);
                setRestaurant(resp.data);
                const respMenus = await api.get(`/menus/restaurant/${id}`);
                setMenus(respMenus.data || []);
            } catch (err) {
                console.error("Erreur chargement détails restaurant:", err);
            }
        };
        fetchDetails();
        fetchAvisStats();
    }, [id]);

    // Modifie la quantité d'un menu sélectionné (delta = +1 ou -1), dans les limites disponibles
    const handleMenuQuantityChange = (menu, delta) => {
        const currentQty = selectedMenus[menu.id] || 0;
        let newQty = currentQty + delta;
        if (newQty < 0) newQty = 0;
        if (newQty > menu.quantiteDisponible) newQty = menu.quantiteDisponible;
        
        setSelectedMenus(prev => ({
            ...prev,
            [menu.id]: newQty
        }));
    };

    // Dès que la date ou l'heure change, récupère les tables disponibles pour ce créneau
    useEffect(() => {
        if (resForm.date && resForm.time) {
            const fetchTables = async () => {
                setLoadingTables(true);
                try {
                    const fullDateTime = `${resForm.date}T${resForm.time}:00`;
                    const resp = await reservationService.getTablesDisponibles(id, fullDateTime);
                    setAvailableTables(resp.data || []);
                    setSelectedTableIds([]); 
                } catch (err) {
                    console.error("Erreur chargement tables:", err);
                } finally {
                    setLoadingTables(false);
                }
            };
            fetchTables();
        }
    }, [resForm.date, resForm.time, id]);

    // Ajoute ou retire une table de la sélection courante (toggle)
    const toggleTable = (tableId) => {
        if (selectedTableIds.includes(tableId)) {
            setSelectedTableIds(selectedTableIds.filter(tid => tid !== tableId));
        } else {
            setSelectedTableIds([...selectedTableIds, tableId]);
        }
    };

    // Calcule le coût total des tables sélectionnées selon la durée de séjour
    const calculateTablesPrice = () => {
        return availableTables
            .filter(t => selectedTableIds.includes(t.id))
            .reduce((sum, t) => sum + ((t.prix || 0) / (t.uniteHeures || 1)) * resForm.dureeHeures, 0);
    };

    // Calcule le budget minimal de consommation imposé par les tables sélectionnées
    const calculateMinBudgetTotal = () => {
        return availableTables
            .filter(t => selectedTableIds.includes(t.id))
            .reduce((sum, t) => sum + ((t.budgetMinimal || 0) / (t.uniteHeures || 1)) * resForm.dureeHeures, 0);
    };

    // Calcule le montant total des menus sélectionnés par le client
    const calculateMenusTotal = () => {
        let total = 0;
        menus.forEach(m => {
            if (selectedMenus[m.id]) {
                total += (m.prix || 0) * selectedMenus[m.id];
            }
        });
        return total;
    };

    // Calcule le montant total de la réservation selon le mode (Sur Place ou À Emporter)
    const calculateTotal = () => {
        if (resForm.typeReservation === 'A_EMPORTER') {
            return calculateMenusTotal();
        }
        const tablePrice = calculateTablesPrice();
        const minBudget = calculateMinBudgetTotal();
        const menusTotal = calculateMenusTotal();
        
        // On paye le prix des tables + le maximum entre les menus choisis et le budget minimal imposé
        return tablePrice + Math.max(menusTotal, minBudget);
    };

    // Retourne les libellés des étapes selon le mode de réservation choisi
    const getStepLabels = () => {
        if (resForm.typeReservation === 'SUR_PLACE') {
            return ['Planif.', 'Tables', 'Menus', 'Infos', 'Paiement'];
        }
        return ['Menus', 'Planif.', 'Infos', 'Paiement'];
    };

    // Retourne le nombre total d'étapes du formulaire
    const getTotalSteps = () => getStepLabels().length;

    // Détermine l'étape active dans le formulaire selon le type de réservation
    const isStepPlanif = (resForm.typeReservation === 'SUR_PLACE' && formStep === 1) || (resForm.typeReservation === 'A_EMPORTER' && formStep === 2);
    const isStepTables = (resForm.typeReservation === 'SUR_PLACE' && formStep === 2);
    const isStepMenus = (resForm.typeReservation === 'SUR_PLACE' && formStep === 3) || (resForm.typeReservation === 'A_EMPORTER' && formStep === 1);
    const isStepInfos = (resForm.typeReservation === 'SUR_PLACE' && formStep === 4) || (resForm.typeReservation === 'A_EMPORTER' && formStep === 3);
    const isStepRecap = (resForm.typeReservation === 'SUR_PLACE' && formStep === 5) || (resForm.typeReservation === 'A_EMPORTER' && formStep === 4);

    // Calcule la capacité maximale totale des tables sélectionnées
    const calculateMaxCapacity = () => {
        return availableTables
            .filter(t => selectedTableIds.includes(t.id))
            .reduce((sum, t) => sum + (t.capacite || 0), 0);
    };

    // Ajuste automatiquement le nombre de personnes si la capacité des tables sélectionnées est dépassée
    React.useEffect(() => {
        const maxCap = calculateMaxCapacity();
        if (maxCap > 0 && resForm.nombrePersonnes > maxCap) {
            setResForm(prev => ({ ...prev, nombrePersonnes: maxCap }));
        }
    }, [selectedTableIds, availableTables]);

    // Source de données du restaurant : priorité aux données fraîches, sinon celles passées via navigation
    const restaurantData = restaurant || item;
    // Découpe l'URL des images en tableau (les images sont stockées séparées par des virgules)
    const images = restaurantData?.urlImage ? restaurantData.urlImage.split(',').filter(Boolean) : [];
    // Index de l'image actuellement affichée dans le diaporama
    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

    // Lance un diaporama automatique (toutes les 5 secondes) s'il y a plusieurs images
    React.useEffect(() => {
        if (images.length > 1) {
            const interval = setInterval(() => {
                setCurrentImageIndex((prev) => (prev + 1) % images.length);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [images.length]);

    // Formate un objet Date en chaîne "YYYY-MM-DD" pour l'envoi au backend
    const formatLocalDate = (date) => {
        if (!date) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Convertit une chaîne "YYYY-MM-DD" en objet Date local (sans décalage UTC)
    const parseLocalDate = (dateStr) => {
        if (!dateStr) return null;
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    // Vérifie si le restaurant est fermé pour un jour donné (en comparant avec ses jours d'ouverture)
    const isDayClosed = (date) => {
        if (!date || !restaurantData.joursOuverture) return false;
        let day = date.getDay(); // 0 (Sun) to 6 (Sat)
        const dayMap = [7, 1, 2, 3, 4, 5, 6];
        const formattedDay = dayMap[day].toString();
        const openDays = restaurantData.joursOuverture.split(',');
        return !openDays.includes(formattedDay);
    };

    // Retourne vrai si la date est dans le passé (avant aujourd'hui à minuit)
    const isPastDate = (date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    };

    // Génère le tableau des jours du mois affiché dans le calendrier (avec des cases vides pour l'alignement lundi-dimanche)
    const getDaysInMonth = (month) => {
        const year = month.getFullYear();
        const m = month.getMonth();
        const firstDay = new Date(year, m, 1);
        const lastDay = new Date(year, m + 1, 0);
        
        const days = [];
        // Ajouter des cases vides en début de semaine (alignement sur lundi)
        let startDay = firstDay.getDay(); // 0 (Sun) to 6 (Sat)
        startDay = startDay === 0 ? 6 : startDay - 1; // 0 (Mon) to 6 (Sun)
        
        for (let i = 0; i < startDay; i++) {
            days.push(null);
        }
        
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, m, i));
        }
        
        return days;
    };

    // Calcule les durées de séjour disponibles selon l'heure choisie et l'heure de fermeture
    const getAvailableDurations = () => {
        if (!restaurantData.heureFermeture || !resForm.time) return [1, 2, 3, 4, 5];
        
        const [hF, mF] = restaurantData.heureFermeture.split(':').map(Number);
        const [hS, mS] = resForm.time.split(':').map(Number);
        
        const closingTime = new Date();
        closingTime.setHours(hF, mF, 0, 0);
        
        const startTime = new Date();
        startTime.setHours(hS, mS, 0, 0);
        
        const diffMs = closingTime - startTime;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        
        if (diffMinutes >= 30 && diffMinutes < 60) {
            // C'est une "Last Session"
            return [1]; // Forcé à 1h (payé 1h)
        }

        const maxDuration = Math.min(5, Math.max(1, diffHours));
        return Array.from({ length: maxDuration }, (_, i) => i + 1);
    };

    // Si l'heure change et que la durée choisie n'est plus valide, la réajuste automatiquement
    useEffect(() => {
        if (resForm.time) {
            const allowed = getAvailableDurations();
            if (!allowed.includes(resForm.dureeHeures)) {
                setResForm(prev => ({ ...prev, dureeHeures: allowed[allowed.length - 1] }));
            }
        }
    }, [resForm.time]);



    // Retourne la liste des heures valides (entre ouverture et fermeture)
    const getAvailableHours = () => {
        if (!restaurantData.heureOuverture || !restaurantData.heureFermeture) return [];
        const [hO] = restaurantData.heureOuverture.split(':').map(Number);
        const [hF] = restaurantData.heureFermeture.split(':').map(Number);
        
        const hours = [];
        for (let h = hO; h <= hF; h++) {
            hours.push(h);
        }
        return hours;
    };

    // Retourne les minutes disponibles pour une heure donnée, en respectant la limite de 30 min avant fermeture
    const getAvailableMinutes = (hour) => {
        if (!restaurantData.heureOuverture || !restaurantData.heureFermeture) return [];
        const [hO, mO] = restaurantData.heureOuverture.split(':').map(Number);
        const [hF, mF] = restaurantData.heureFermeture.split(':').map(Number);
        
        let start = 0;
        if (hour === hO) start = mO;
        
        let end = 59;
        if (hour === hF) end = mF;
        
        // Appliquer la limite de 30 min avant fermeture globale
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

    // Vérifie que la sélection horaire est complète ("dernière session" acceptée si nécessaire)
    const isTimeSelectionComplete = () => {
        if (!resForm.time) return false;
        if (!restaurantData.heureFermeture) return true;
        
        const [hF, mF] = restaurantData.heureFermeture.split(':').map(Number);
        const [hS, mS] = resForm.time.split(':').map(Number);
        const diffMin = (hF * 60 + mF) - (hS * 60 + mS);
        
        if (diffMin < 60 && !lastSessionAccepted) return false;
        return true;
    };

    // Vérifie que l'heure saisie est bien dans la plage d'ouverture du restaurant
    const isTimeInWorkingHours = (time) => {
        if (!time || !restaurantData.heureOuverture || !restaurantData.heureFermeture) return true;
        const [hO, mO] = restaurantData.heureOuverture.split(':').map(Number);
        const [hF, mF] = restaurantData.heureFermeture.split(':').map(Number);
        const [hS, mS] = time.split(':').map(Number);
        const openMin = hO * 60 + mO;
        const closeMin = hF * 60 + mF;
        const selectedMin = hS * 60 + mS;
        return selectedMin >= openMin && selectedMin <= closeMin;
    };

    // Passe à l'étape suivante du formulaire après validation des données de l'étape courante
    const handleNextStep = () => {
        if (formStep === 0) {
            // Pas de validation nécessaire
        }
        
        // Validation selon le mode et l'étape
        if (resForm.typeReservation === 'SUR_PLACE') {
            if (formStep === 1) { // Planif
                if (!resForm.date || !resForm.time) { setErrorMsg("Veuillez choisir une date et une heure."); return; }
                if (!isTimeInWorkingHours(resForm.time)) { setErrorMsg(`L'heure choisie (${resForm.time}) est en dehors des horaires d'ouverture (${restaurantData.heureOuverture} – ${restaurantData.heureFermeture}).`); return; }
                if (!isTimeSelectionComplete()) { setErrorMsg("Veuillez accepter les conditions de fin de session."); return; }
            }
            if (formStep === 2) { // Tables
                if (selectedTableIds.length === 0) { setErrorMsg("Veuillez sélectionner au moins une table."); return; }
            }
            if (formStep === 3) { // Menus
                const minB = calculateMinBudgetTotal();
                const currentM = calculateMenusTotal();
                if (currentM < minB) {
                    setErrorMsg(`Le budget minimal de consommation pour ces tables est de ${minB} DT. Il vous reste ${minB - currentM} DT à consommer.`);
                    return;
                }
            }
            if (formStep === 4) { // Infos
                if (!resForm.clientNom || !resForm.clientEmail || !resForm.clientTelephone) { setErrorMsg("Veuillez remplir vos informations personnelles."); return; }
            }
        } else {
            // MODE A_EMPORTER
            if (formStep === 1) { // Menus
                if (calculateMenusTotal() === 0) { setErrorMsg("Veuillez sélectionner au moins un article."); return; }
            }
            if (formStep === 2) { // Planif
                if (!resForm.date || !resForm.time) { setErrorMsg("Veuillez choisir une date et une heure de retrait."); return; }
                if (!isTimeInWorkingHours(resForm.time)) { setErrorMsg(`L'heure choisie (${resForm.time}) est en dehors des horaires d'ouverture (${restaurantData.heureOuverture} – ${restaurantData.heureFermeture}).`); return; }
            }
            if (formStep === 3) { // Infos
                if (!resForm.clientNom || !resForm.clientEmail || !resForm.clientTelephone) { setErrorMsg("Veuillez remplir vos informations personnelles."); return; }
            }
        }
        
        setErrorMsg('');
        setFormStep(prev => prev + 1);
        window.scrollTo(0, 0);
    };

    // Revient à l'étape précédente du formulaire
    const handlePrevStep = () => {
        setFormStep(prev => prev - 1);
        window.scrollTo(0, 0);
    };

    // Valide les données finales, crée la réservation puis redirige vers Stripe pour le paiement
    const handleConfirmAndPay = async (e) => {
        if (e) e.preventDefault();
        
        if (!resForm.date || !resForm.time) {
            setErrorMsg("Veuillez choisir une date et une heure.");
            return;
        }

        if (isDayClosed(parseLocalDate(resForm.date))) {
            setErrorMsg("Désolé, l'établissement est fermé à cette date.");
            return;
        }

        if (!isTimeInWorkingHours(resForm.time)) {
            setErrorMsg(`L'heure choisie (${resForm.time}) est en dehors des horaires d'ouverture (${restaurantData.heureOuverture} – ${restaurantData.heureFermeture}).`);
            return;
        }

        const [hF, mF] = restaurantData.heureFermeture.split(':').map(Number);
        const [hS, mS] = resForm.time.split(':').map(Number);
        const diffMin = (hF * 60 + mF) - (hS * 60 + mS);

        if (diffMin < 60 && !lastSessionAccepted) {
            setErrorMsg(`Cet horaire est proche de la fermeture (${restaurantData.heureFermeture}). Veuillez accepter les conditions de fin de session.`);
            return;
        }

        if (resForm.typeReservation === 'SUR_PLACE') {
            const maxCap = calculateMaxCapacity();
            if (resForm.nombrePersonnes > maxCap) {
                setErrorMsg(`Le nombre de personnes (${resForm.nombrePersonnes}) dépasse la capacité totale des tables sélectionnées (${maxCap}).`);
                return;
            }

            if (selectedTableIds.length === 0) {
                setErrorMsg("Veuillez sélectionner au moins une table.");
                return;
            }
        }

        // Envoi de la réservation au backend puis création d'une session de paiement Stripe
        try {
            setSubmitting(true);
            setErrorMsg('');
            const totalPrice = calculateTotal();
            
            const menusChoisis = menus.filter(m => selectedMenus[m.id] > 0).map(m => ({
                menuId: m.id,
                nom: m.nom,
                quantite: selectedMenus[m.id],
                prix: m.prix
            }));

            const reservationData = {
                restaurantId: id,
                dateHeure: `${resForm.date}T${resForm.time}:00`,
                nombrePersonnes: resForm.nombrePersonnes,
                tableIds: resForm.typeReservation === 'SUR_PLACE' ? selectedTableIds : [],
                dureeHeures: resForm.dureeHeures,
                prixTotal: totalPrice,
                clientNom: resForm.clientNom,
                clientPrenom: resForm.clientPrenom,
                clientEmail: resForm.clientEmail,
                clientTelephone: resForm.clientTelephone,
                menusChoisis: menusChoisis,
                modeConsommation: resForm.typeReservation // 'SUR_PLACE' ou 'A_EMPORTER'
            };

            console.log("📤 Envoi de la réservation Restaurant:", reservationData);
            const response = await reservationService.reserverRestaurant(reservationData);
            const reservationId = response.data.id || response.data.reservationId;

            if (reservationId) {
                const paymentRes = await api.post(`/payments/create-session/${reservationId}`);
                const { url } = paymentRes.data;
                if (url) {
                    window.location.href = url;
                } else {
                    setErrorMsg("Erreur Stripe : Impossible de générer le lien de paiement.");
                }
            } else {
                setErrorMsg(response.data?.message || "Erreur lors de la création de la réservation.");
            }
        } catch (err) {
            console.error("❌ Erreur critique réservation restaurant:", err);
            const serverMsg = err.response?.data?.message || err.message;
            setErrorMsg(`Erreur : ${serverMsg}`);
        } finally {
            setSubmitting(false);
        }
    };

    // Affichage d'erreur si aucune donnée de restaurant n'est disponible (mauvaise navigation)
    // Écran de chargement : affiché si ni les données de navigation ni les données API ne sont encore disponibles
    if (!restaurant && !item) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <h3 className="fw-700 mt-3 text-secondary">Chargement de votre table...</h3>
            </div>
        );
    }

    return (
        // Conteneur principal de la page de détails du restaurant
        <div className="touriste-restaurant-details min-vh-100 bg-body">
            {/* Barre de navigation supérieure */}
            <Topbar />
            <main className="container-fluid pt-2 pb-4 px-lg-5">
                <div className="container-fluid px-lg-4 px-xl-5">
                    {/* En-tête de page : bouton retour + titre de bienvenue centré */}
                    <header className="page-header d-flex align-items-center justify-content-between mb-4">
                        <div className="d-flex align-items-center" style={{ flex: '1' }}>
                            <button 
                                onClick={() => navigate(user && (user.role === 'ROLE_TOURISTE' || user.role === 'TOURISTE') ? '/touriste' : '/')} 
                                className="btn btn-sm btn-body border-0 rounded-pill px-3 py-2 fw-700 text-muted d-flex align-items-center transition-all hover-translate-x"
                                style={{ background: 'var(--bg-card)' }}
                            >
                                <i className="bi bi-arrow-left-short fs-4 me-1"></i> Retour
                            </button>
                        </div>
                        <div className="text-center" style={{ flex: '2' }}>
                            <h1 className="fw-800 text-body mb-0 fs-1">Bienvenue à <span className="text-primary">{restaurantData.nom || restaurantData.titre}</span></h1>
                        </div>
                        <div className="d-flex justify-content-end" style={{ flex: '1' }}></div>
                    </header>

                    <div className="row g-4">
                        <div className="col-12">
                            <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
                                {/* Galerie photos avec diaporama automatique */}
                                <div className="gallery-container bg-secondary-subtle position-relative" style={{ height: '450px' }}>
                                    {images.length > 0 ? (
                                        <>
                                            {images.map((img, idx) => (
                                                <img 
                                                    key={idx}
                                                    src={img} 
                                                    alt={`${restaurantData.nom} - ${idx + 1}`} 
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
                                            <i className="bi bi-egg-fried"></i>
                                        </div>
                                    )}
                                    <div className="gallery-overlay d-flex align-items-end z-2">
                                        <div>
                                            <div className="d-flex align-items-center gap-2 mb-3 animate-up">
                                                <span className="badge bg-primary rounded-pill px-3 py-2 fw-800 shadow-sm">Restaurant Certifié</span>
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
                                            <h1 className="text-white fw-900 display-4 mb-0 animate-up" style={{ animationDelay: '0.1s' }}>{restaurantData.nom || restaurantData.titre}</h1>
                                        </div>
                                    </div>
                                </div>
                                {/* Corps de la carte : section "À propos", boutons d'action et description */}
                                <div className="card-body p-4 p-md-5 animate-up" style={{ animationDelay: '0.2s' }}>
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <h2 className="fw-800 mb-0">À propos</h2>
                                        {/* Boutons Contacter et Réserver, visibles uniquement si l'utilisateur n'est pas le propriétaire */}
                                        {user?.id !== restaurant.utilisateur?.id && (
                                            <div className="d-flex align-items-center gap-2">
                                                <button 
                                                    onClick={() => !user ? navigate('/login') : setContactTarget({ user: restaurant.utilisateur, t: Date.now() })} 
                                                    className="btn-premium btn btn-outline-primary shadow-sm"
                                                >
                                                    <i className="bi bi-chat-dots-fill me-2"></i> Contacter
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        if (!user) {
                                                            navigate('/login');
                                                        } else {
                                                            setFormStep(0);
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
                                    <p className="text-body-secondary lead mb-5 fw-500 opacity-75">{restaurantData.description || "Découvrez nos spécialités uniques et profitez d'une ambiance djerbienne authentique."}</p>
                                    
                                    {/* Ligne : carte géographique (8 colonnes) + infos pratiques (4 colonnes) */}
                                    <div className="row g-4 mb-4 mt-2">
                                        <div className="col-lg-8">
                                            <h4 className="fw-800 mb-4 d-flex align-items-center">
                                                <i className="bi bi-geo-alt-fill text-danger me-2"></i> Adresse
                                            </h4>
                                            <ProviderMapDisplay localisation={restaurantData.localisation} providerName={restaurantData.nom || restaurantData.titre} />
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
                                                        <span className="text-muted smaller fw-800 text-uppercase letter-spacing-1 d-block mb-1" style={{ fontSize: '0.65rem' }}>Localisation</span>
                                                        <span className="fw-700 text-body text-truncate d-block fs-6">{restaurantData.adresse || "Adresse non spécifiée"}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="d-flex align-items-center p-3 border-bottom border-light-subtle">
                                                    <div className="bg-info-subtle text-info rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                                                        <i className="bi bi-envelope-at fs-4"></i>
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <span className="text-muted smaller fw-800 text-uppercase letter-spacing-1 d-block mb-1" style={{ fontSize: '0.65rem' }}>Contact Direct</span>
                                                        <span className="fw-700 text-body text-truncate d-block fs-6">{item?.email || restaurantData.utilisateur?.email || "Email non spécifié"}</span>
                                                    </div>
                                                </div>

                                                <div className="d-flex align-items-center p-3">
                                                    <div className="bg-success-subtle text-success rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                                                        <i className="bi bi-telephone-plus fs-4"></i>
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <span className="text-muted smaller fw-800 text-uppercase letter-spacing-1 d-block mb-1" style={{ fontSize: '0.65rem' }}>Ligne Téléphonique</span>
                                                        <span className="fw-700 text-body text-truncate d-block fs-6">{item?.telephone || restaurantData.utilisateur?.telephone || "Téléphone non spécifié"}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section des horaires d'ouverture avec badges jours et plage horaire */}
                                    <div className="p-4 bg-body-tertiary rounded-5 border shadow-sm mb-4">
                                        <h4 className="fw-800 mb-4 d-flex align-items-center">
                                            <i className="bi bi-clock-history text-warning me-2"></i> Horaires d'ouverture
                                        </h4>
                                        {restaurantData.joursOuverture ? (
                                            <div>
                                                <div className="d-flex gap-3 mb-4 flex-wrap">
                                                    {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((label, idx) => {
                                                        const isDayOpen = restaurantData.joursOuverture.split(',').includes((idx + 1).toString());
                                                        return (
                                                            <div key={label} className={`day-badge ${isDayOpen ? 'open' : 'opacity-25'}`}>
                                                                {label}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div className="alert bg-body border-0 rounded-4 p-3 mb-0 d-flex align-items-center">
                                                    <div className="bg-primary text-white rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                                                        <i className="bi bi-door-open fs-5"></i>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted small d-block fw-700 text-uppercase letter-spacing-1">Service continu</span>
                                                        <span className="fw-800 fs-5 text-body">{restaurantData.heureOuverture || '00:00'} — {restaurantData.heureFermeture || '00:00'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="alert alert-light border border-dashed rounded-4 py-4 text-center">
                                                <i className="bi bi-info-circle me-2"></i> Horaires non communiqués par l'établissement.
                                            </div>
                                        )}
                                    </div>

                                    <h3 className="fw-800 mb-4 mt-5 d-flex align-items-center">
                                        <i className="bi bi-cup-hot-fill text-warning me-2"></i> Notre Menu & Spécialités
                                    </h3>
                                    
                                    {/* Section menu public : onglets par catégorie + grille de produits */}
                                    {menus.length > 0 ? (() => {
                                        const categories = Array.from(new Set(menus.map(m => m.category?.nom || "Autres")));
                                        const filteredItems = menus.filter(m => (m.category?.nom || "Autres") === activeCategory);

                                        return (
                                            <div className="menu-tabs-container">
                                                {/* Barre d'onglets */}
                                                <div className="d-flex overflow-x-auto gap-2 mb-4 pb-2 no-scrollbar">
                                                    {categories.map(cat => (
                                                        <button 
                                                            key={cat}
                                                            onClick={() => setActiveCategory(cat)}
                                                            className={`btn rounded-pill px-4 py-2 fw-800 transition-all border-0 ${activeCategory === cat ? 'btn-primary shadow-lg scale-105' : 'btn-light text-muted'}`}
                                                            style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                                                        >
                                                            {cat}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Grille de produits */}
                                                <div className="row g-3 animate-fade-in">
                                                    {filteredItems.map(m => (
                                                        <div key={m.id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                                                            <div className="card shadow-hover border-0 rounded-4 overflow-hidden h-100 d-flex flex-column hover-translate-y" style={{ background: 'var(--bg-card)' }}>
                                                                <div className="card-img-top bg-body-tertiary position-relative" style={{ height: '140px' }}>
                                                                    {m.image ? (
                                                                        <img src={m.image} alt={m.nom} className="w-100 h-100 object-fit-cover" />
                                                                    ) : (
                                                                        <div className="w-100 h-100 d-flex align-items-center justify-content-center text-muted fs-2">
                                                                            <i className="bi bi-egg-fried"></i>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="card-body p-3 d-flex flex-column">
                                                                    <h6 className="fw-800 text-body mb-1 text-truncate">{m.nom}</h6>
                                                                    <p className="small text-muted mb-2" style={{ height: '32px', fontSize: '0.75rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                                                        {m.description || 'Spécialité locale préparée avec passion par nos chefs.'}
                                                                    </p>
                                                                    <div className="mt-auto d-flex align-items-center justify-content-between">
                                                                        <span className="fw-800 text-primary">{m.prix} DT</span>
                                                                        {m.quantiteDisponible > 0 ? (
                                                                            <span className="badge bg-success-subtle text-success smaller px-2">En stock</span>
                                                                        ) : (
                                                                            <span className="badge bg-danger-subtle text-danger smaller px-2">Épuisé</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })() : (
                                        <div className="col-12 w-100 text-center py-4 bg-body-tertiary rounded-4 border border-dashed text-muted">
                                            La carte de cet établissement n'est pas encore disponible en ligne.
                                        </div>
                                    )}

                                    {/* Section avis clients : statistiques + formulaire de soumission d'avis */}
                                    <div className="reviews-section animate-in-y mt-5 pt-4">
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
                                                typeService={(restaurant?.type || restaurant?.typeRestaurant || item?.type || item?.typeRestaurant) === 'CAFE' ? 'CAFE' : 'RESTAURANT'} 
                                                onAvisSubmitted={fetchAvisStats} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* === MODAL DE RÉSERVATION MULTI-ÉTAPES === */}
            {/* S'affiche en superposition sur la page lorsque le client clique sur "Réserver" */}
            {showResModal && (
                <div className="modal-overlay animate-fade-in" style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
                    zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                }}>
                    <div className="bg-white rounded-4 shadow-lg overflow-hidden position-relative d-flex flex-column"
                         style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh' }}>
                        
                        {/* En-tête du modal : titre + bouton de fermeture */}
                        <div className="d-flex justify-content-between align-items-center p-4 border-bottom bg-light">
                            <h4 className="fw-800 mb-0 text-dark d-flex align-items-center gap-2">
                                <i className="bi bi-calendar-heart-fill text-danger"></i> Réserver
                            </h4>
                            <button onClick={() => { setShowResModal(false); setFormStep(0); }} className="btn btn-light rounded-circle shadow-sm border p-0 d-flex align-items-center justify-content-center hover-scale" style={{ width: '36px', height: '36px' }}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        {/* Corps scrollable du modal contenant le formulaire multi-étapes */}
                        <div className="p-4 p-md-5 overflow-auto" style={{ flex: '1 1 auto' }}>
                            {/* Affichage conditionnel du message d'erreur */}
                            {errorMsg && (
                                <div className="alert alert-warning border-0 rounded-4 shadow-sm animate-in-y mb-4 d-flex align-items-center gap-3">
                                    <div className="bg-warning text-dark rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                                        <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                                    </div>
                                    <div className="flex-grow-1">
                                        <h6 className="fw-800 mb-1">Attention</h6>
                                        <p className="small mb-0 opacity-75 fw-600">{errorMsg}</p>
                                    </div>
                                    <button onClick={() => setErrorMsg('')} className="btn-close shadow-none small"></button>
                                </div>
                            )}

                            {/* Indicateur de progression (stepper) affiché à partir de l'étape 1 */}
                            {formStep > 0 && (
                                <div className="card border-0 shadow-sm rounded-4 mb-4 bg-dark text-white overflow-hidden">
                                    <div className="card-body p-4">
                                        <div className="d-flex justify-content-between mb-3">
                                            {getStepLabels().map((label, index) => {
                                                const stepNum = index + 1;
                                                return (
                                                    <div key={stepNum} className={`step-item d-flex align-items-center gap-2 ${formStep >= stepNum ? 'text-primary' : 'text-white-50'}`}>
                                                        <div className={`step-number rounded-circle d-flex align-items-center justify-content-center fw-800 ${formStep === stepNum ? 'bg-primary text-white scale-110 shadow-lg' : formStep > stepNum ? 'bg-success text-white' : 'bg-secondary text-white-50'}`} style={{width: '26px', height: '26px', fontSize: '0.75rem'}}>
                                                            {formStep > stepNum ? <i className="bi bi-check-lg"></i> : stepNum}
                                                        </div>
                                                        <span className="small fw-700 d-none d-md-inline" style={{fontSize: '0.7rem'}}>
                                                            {label}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="progress bg-secondary-subtle" style={{height: '4px', borderRadius: '2px'}}>
                                            <div className="progress-bar bg-primary transition-all" style={{width: `${formStep === 0 ? 0 : (formStep / getTotalSteps()) * 100}%`}}></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={e => e.preventDefault()}>
                                {/* === ÉTAPE 0 : Choix du type de commande (Sur Place ou À Emporter) === */}
                                {formStep === 0 && (
                                    <div className="animate-in-y">
                                        <div className="text-center mb-5">
                                            <h4 className="fw-900 text-dark mb-2">Comment souhaitez-vous commander ?</h4>
                                            <p className="text-muted">Choisissez votre mode de service</p>
                                        </div>

                                        <div className="row g-4">
                                            <div className="col-12 col-md-6">
                                                <div 
                                                    onClick={() => { setResForm({...resForm, typeReservation: 'SUR_PLACE'}); setFormStep(1); }}
                                                    className={`card border-2 h-100 cursor-pointer transition-all hover-scale ${resForm.typeReservation === 'SUR_PLACE' ? 'border-primary bg-primary bg-opacity-10' : 'border-light bg-light opacity-hover'}`}
                                                    style={{ borderRadius: '24px' }}
                                                >
                                                    <div className="card-body p-5 text-center">
                                                        <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4 shadow-lg" style={{ width: '80px', height: '80px' }}>
                                                            <i className="bi bi-shop fs-1"></i>
                                                        </div>
                                                        <h5 className="fw-900 mb-2 text-dark">Sur Place</h5>
                                                        <p className="small text-muted mb-0 fw-600">Réservez une table et profitez de l'ambiance de l'établissement.</p>
                                                        <div className="mt-4 badge bg-primary-subtle text-primary px-3 py-2 rounded-pill fw-800">Expérience complète</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-12 col-md-6">
                                                <div 
                                                    onClick={() => { setResForm({...resForm, typeReservation: 'A_EMPORTER'}); setFormStep(1); }}
                                                    className={`card border-2 h-100 cursor-pointer transition-all hover-scale ${resForm.typeReservation === 'A_EMPORTER' ? 'border-orange bg-orange bg-opacity-10' : 'border-light bg-light opacity-hover'}`}
                                                    style={{ borderRadius: '24px', '--border-orange': '#f97316' }}
                                                >
                                                    <div className="card-body p-5 text-center">
                                                        <div className="text-white rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4 shadow-lg" style={{ width: '80px', height: '80px', background: '#f97316' }}>
                                                            <i className="bi bi-bag-check-fill fs-1"></i>
                                                        </div>
                                                        <h5 className="fw-900 mb-2 text-dark">À Emporter</h5>
                                                        <p className="small text-muted mb-0 fw-600">Commandez vos plats préférés et récupérez-les quand vous voulez.</p>
                                                        <div className="mt-4 badge bg-warning-subtle text-warning-emphasis px-3 py-2 rounded-pill fw-800">Rapide & Pratique</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* === ÉTAPE PLANIFICATION : Sélection de la date via calendrier + saisie de l'heure === */}
                                {isStepPlanif && (
                                    <div className="animate-in-y">
                                        <div className="calendar-container bg-light rounded-5 p-4 border shadow-sm mb-4">
                                            <div className="d-flex justify-content-between align-items-center mb-4">
                                                <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="btn btn-white shadow-sm rounded-circle p-0 d-flex align-items-center justify-content-center" style={{width: '36px', height: '36px'}} disabled={currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear()}>
                                                    <i className="bi bi-chevron-left"></i>
                                                </button>
                                                <h5 className="fw-800 mb-0 text-capitalize">{currentMonth.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}</h5>
                                                <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="btn btn-white shadow-sm rounded-circle p-0 d-flex align-items-center justify-content-center" style={{width: '36px', height: '36px'}}>
                                                    <i className="bi bi-chevron-right"></i>
                                                </button>
                                            </div>
                                            
                                            <div className="calendar-grid d-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
                                                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => (
                                                    <div key={d} className="text-center smaller fw-800 text-muted mb-2">{d}</div>
                                                ))}
                                                {getDaysInMonth(currentMonth).map((date, idx) => {
                                                    if (!date) return <div key={`empty-${idx}`}></div>;
                                                    const dateStr = formatLocalDate(date);
                                                    const isSelected = resForm.date === dateStr;
                                                    const closed = isDayClosed(date);
                                                    const past = isPastDate(date);
                                                    const disabled = closed || past;
                                                    return (
                                                        <div 
                                                            key={dateStr}
                                                            onClick={() => !disabled && setResForm({...resForm, date: dateStr, time: ''})}
                                                            className={`calendar-day d-flex align-items-center justify-content-center rounded-4 fw-700 transition-all cursor-pointer ${isSelected ? 'bg-primary text-white shadow-lg scale-110' : disabled ? 'text-muted opacity-25 cursor-not-allowed bg-transparent' : 'bg-white shadow-sm hover-translate-y'}`}
                                                            style={{ height: '45px', position: 'relative' }}
                                                        >
                                                            {date.getDate()}
                                                            {closed && !past && <span className="position-absolute bottom-0 start-50 translate-middle-x bg-danger rounded-circle mb-1" style={{ width: '4px', height: '4px' }}></span>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {resForm.date && (
                                            <div className="animate-in-y">
                                                <div className="alert bg-primary-subtle border-0 rounded-4 p-3 mb-4 d-flex align-items-center">
                                                    <i className="bi bi-clock-fill text-primary me-3 fs-4"></i>
                                                    <div>
                                                        <span className="text-muted small d-block fw-700 text-uppercase letter-spacing-1">Ouvert jusqu'à {restaurantData.heureFermeture}</span>
                                                        <span className="fw-800 text-primary">{resForm.typeReservation === 'SUR_PLACE' ? "Choisissez votre heure d'arrivée" : "Heure de retrait souhaitée"}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="mb-4">
                                                    <label className="text-muted small fw-700 uppercase mb-2 d-block">
                                                        {resForm.typeReservation === 'SUR_PLACE' ? "Heure d'arrivée" : "Heure de retrait"}
                                                    </label>
                                                    {(() => {
                                                        const [hF, mF] = (restaurantData.heureFermeture || '23:00').split(':').map(Number);
                                                        const totalMinClose = hF * 60 + mF - 30;
                                                        const maxH = Math.floor(totalMinClose / 60).toString().padStart(2, '0');
                                                        const maxM = (totalMinClose % 60).toString().padStart(2, '0');
                                                        return (
                                                            <input
                                                                type="time"
                                                                className="form-control rounded-4 border-0 bg-light p-3 shadow-none fw-700"
                                                                min={restaurantData.heureOuverture || '08:00'}
                                                                max={`${maxH}:${maxM}`}
                                                                value={resForm.time}
                                                                onChange={e => {
                                                                    setResForm({...resForm, time: e.target.value});
                                                                    setLastSessionAccepted(false);
                                                                }}
                                                            />
                                                        );
                                                    })()}
                                                </div>

                                                {resForm.time && resForm.typeReservation === 'SUR_PLACE' && (() => {
                                                    const [hF, mF] = restaurantData.heureFermeture.split(':').map(Number);
                                                    const [hS, mS] = resForm.time.split(':').map(Number);
                                                    const diffMin = (hF * 60 + mF) - (hS * 60 + mS);
                                                    
                                                    return (
                                                        <>
                                                            {diffMin > 0 && diffMin < 60 ? (
                                                                <div className="alert alert-warning border-0 rounded-4 p-3 mb-4 animate-in-y">
                                                                    <div className="form-check">
                                                                        <input className="form-check-input" type="checkbox" id="acceptLast" checked={lastSessionAccepted} onChange={e => setLastSessionAccepted(e.target.checked)} />
                                                                        <label className="form-check-label small fw-700" htmlFor="acceptLast">J'accepte de rester {diffMin} min au prix d'une heure.</label>
                                                                    </div>
                                                                </div>
                                                            ) : diffMin >= 60 ? (
                                                                <div className="mt-2 animate-in-y">
                                                                    <label className="text-muted small fw-700 uppercase mb-2 d-block">Durée du séjour</label>
                                                                    <select className="form-select rounded-4 border-0 bg-light p-3 shadow-none fw-700" value={resForm.dureeHeures} onChange={e => setResForm({...resForm, dureeHeures: parseInt(e.target.value)})}>
                                                                        {getAvailableDurations().map(h => (
                                                                            <option key={h} value={h}>{h} Heure{h > 1 ? 's' : ''}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            ) : null}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* === ÉTAPE TABLES : Sélection des tables disponibles + choix du nombre de personnes === */}
                                {isStepTables && (
                                    <div className="animate-in-y">
                                        <h5 className="fw-800 mb-3 text-muted text-uppercase small letter-spacing-1">Sélectionnez vos tables</h5>
                                        {loadingTables ? (
                                            <div className="text-center py-5 bg-light rounded-4">
                                                <div className="spinner-border text-primary" role="status"></div>
                                                <p className="mt-3 text-muted small fw-700">Calcul des disponibilités...</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="row g-2 mb-4">
                                                    {availableTables.length > 0 ? availableTables.map(table => (
                                                        <div key={table.id} className="col-4">
                                                            <div onClick={() => !table.reserved && toggleTable(table.id)} className={`p-3 rounded-4 border text-center transition-all cursor-pointer shadow-hover h-100 d-flex flex-column justify-content-center ${table.reserved ? 'bg-secondary bg-opacity-10 border-light-subtle text-muted' : selectedTableIds.includes(table.id) ? 'bg-primary text-white border-primary shadow-lg scale-105' : 'bg-white border-light text-muted'}`} style={{ cursor: table.reserved ? 'not-allowed' : 'pointer', opacity: table.reserved ? 0.65 : 1 }}>
                                                                <div className="fw-800 small mb-1">T{table.numero}</div>
                                                                <div className="smaller fw-700 opacity-75 mb-1"><i className="bi bi-people-fill me-1"></i>{table.capacite}</div>
                                                                <div className="smaller fw-800 mb-1">{table.prix} DT</div>
                                                                {table.reserved ? (
                                                                     <div className="bg-danger text-white rounded-pill py-1 px-2 mt-1" style={{fontSize: '0.55rem', fontWeight: '900'}}>
                                                                         RÉSERVÉE
                                                                     </div>
                                                                 ) : table.budgetMinimal > 0 ? (
                                                                    <div className="bg-warning text-dark rounded-pill py-1 px-2 mt-1" style={{fontSize: '0.55rem', fontWeight: '900'}}>
                                                                        MIN: {table.budgetMinimal}DT
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    )) : (
                                                        <div className="col-12"><div className="alert alert-danger rounded-4 border-0 text-center">Aucune table disponible pour cet établissement.</div></div>
                                                    )}
                                                </div>
                                                {selectedTableIds.length > 0 && (
                                                    <div className="animate-fade-in bg-dark text-white p-3 rounded-4 shadow-sm border border-secondary border-opacity-25 mt-3">
                                                        <label className="text-muted small fw-700 uppercase mb-2 d-block text-center" style={{ color: '#a1a1aa' }}>Nombre de personnes (Max: {calculateMaxCapacity()})</label>
                                                        <div className="d-flex align-items-center justify-content-center gap-3">
                                                            <button 
                                                                type="button" 
                                                                className="btn btn-outline-light rounded-circle p-0 d-flex align-items-center justify-content-center shadow-sm" 
                                                                style={{ width: '40px', height: '40px', borderWidth: '2px', fontWeight: 'bold' }}
                                                                onClick={() => setResForm(prev => ({ ...prev, nombrePersonnes: Math.max(1, prev.nombrePersonnes - 1) }))} 
                                                                disabled={resForm.nombrePersonnes <= 1}
                                                            >
                                                                <i className="bi bi-dash fs-4"></i>
                                                            </button>
                                                            <span className="fw-900 fs-3 text-white" style={{ minWidth: '40px', textAlign: 'center' }}>{resForm.nombrePersonnes}</span>
                                                            <button 
                                                                type="button" 
                                                                className="btn btn-outline-light rounded-circle p-0 d-flex align-items-center justify-content-center shadow-sm" 
                                                                style={{ width: '40px', height: '40px', borderWidth: '2px', fontWeight: 'bold' }}
                                                                onClick={() => setResForm(prev => ({ ...prev, nombrePersonnes: prev.nombrePersonnes + 1 }))} 
                                                                disabled={resForm.nombrePersonnes >= calculateMaxCapacity()}
                                                            >
                                                                <i className="bi bi-plus fs-4"></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* === ÉTAPE MENUS : Sélection des plats groupés par catégorie + suivi du budget minimal === */}
                                {isStepMenus && (
                                    <div className="animate-in-y">
                                        <h5 className="fw-800 mb-3 text-muted text-uppercase small letter-spacing-1">{resForm.typeReservation === 'SUR_PLACE' ? "Produits & Menus (Optionnel)" : "Sélectionnez vos plats"}</h5>
                                        {menus.length > 0 ? (
                                            <div className="d-flex flex-column gap-4 max-h-400 overflow-auto pe-2 mb-4">
                                                {(() => {
                                                    const grouped = menus.reduce((acc, m) => {
                                                        const catName = m.category?.nom || "Autres";
                                                        if (!acc[catName]) acc[catName] = [];
                                                        acc[catName].push(m);
                                                        return acc;
                                                    }, {});

                                                    return Object.entries(grouped).map(([cat, items]) => (
                                                        <div key={cat} className="category-group">
                                                            <div className="d-flex align-items-center gap-2 mb-3">
                                                                <div className="flex-grow-1 border-bottom"></div>
                                                                <span className="smaller fw-800 text-primary uppercase letter-spacing-1 px-2" style={{fontSize: '0.7rem'}}>{cat}</span>
                                                                <div className="flex-grow-1 border-bottom"></div>
                                                            </div>
                                                            <div className="d-flex flex-column gap-2">
                                                                {items.map(menu => (
                                                                    <div key={menu.id} className="d-flex align-items-center justify-content-between p-2 rounded-4 border bg-white shadow-sm transition-all hover-translate-y">
                                                                        <div className="d-flex align-items-center gap-3">
                                                                            {menu.image ? <img src={menu.image} alt={menu.nom} className="rounded-3 object-fit-cover shadow-sm" style={{width: '45px', height: '45px'}} /> : <div className="bg-light rounded-3 d-flex align-items-center justify-content-center" style={{width: '45px', height: '45px'}}><i className="bi bi-image text-muted"></i></div>}
                                                                            <div>
                                                                                <div className="fw-800 text-dark smaller mb-0" style={{fontSize: '0.85rem'}}>{menu.nom}</div>
                                                                                <div className="small text-primary fw-700">{menu.prix} DT</div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="d-flex align-items-center gap-2 bg-light rounded-pill p-1 px-2 border shadow-inner">
                                                                            <button type="button" onClick={() => handleMenuQuantityChange(menu, -1)} disabled={!selectedMenus[menu.id]} className="btn btn-sm btn-white border rounded-circle shadow-sm p-0 d-flex align-items-center justify-content-center" style={{width: '24px', height: '24px'}}><i className="bi bi-dash"></i></button>
                                                                            <span className="fw-800 small mx-1" style={{minWidth: '15px', textAlign: 'center'}}>{selectedMenus[menu.id] || 0}</span>
                                                                            <button type="button" onClick={() => handleMenuQuantityChange(menu, 1)} disabled={(selectedMenus[menu.id] || 0) >= menu.quantiteDisponible} className="btn btn-sm btn-primary rounded-circle shadow-sm p-0 d-flex align-items-center justify-content-center" style={{width: '24px', height: '24px'}}><i className="bi bi-plus"></i></button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ));
                                                })()}
                                            </div>
                                        ) : (
                                            <div className="alert alert-light border rounded-4 p-4 text-center">
                                                La carte n'est pas disponible pour le moment.
                                            </div>
                                        )}
                                        
                                        {resForm.typeReservation === 'SUR_PLACE' && (
                                            <div className="mt-5 p-4 bg-light rounded-5 border-2 border-dashed">
                                                <div className="d-flex justify-content-between align-items-center mb-3">
                                                    <div>
                                                        <h6 className="fw-800 text-dark mb-1">Votre Consommation</h6>
                                                        <p className="smaller text-muted fw-600 mb-0">Minimum requis pour vos tables</p>
                                                    </div>
                                                    <div className="text-end">
                                                        <div className="fw-900 fs-4 text-primary">{calculateMenusTotal()} / {calculateMinBudgetTotal()} DT</div>
                                                    </div>
                                                </div>
                                                
                                                {calculateMenusTotal() < calculateMinBudgetTotal() ? (
                                                    <div className="alert alert-warning border-0 rounded-4 shadow-sm mb-0 py-3 animate-in-y">
                                                        <div className="d-flex align-items-center gap-2 small fw-700">
                                                            <i className="bi bi-info-circle-fill fs-5"></i>
                                                            <span>Il vous reste {calculateMinBudgetTotal() - calculateMenusTotal()} DT à ajouter.</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="alert alert-success border-0 rounded-4 shadow-sm mb-0 py-3 animate-in-y">
                                                        <div className="d-flex align-items-center gap-2 small fw-700">
                                                            <i className="bi bi-check-circle-fill fs-5"></i>
                                                            <span>Objectif de consommation atteint !</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {resForm.typeReservation === 'A_EMPORTER' && (
                                            <div className="mt-4 p-4 rounded-5 shadow-lg border-0 animate-in-y" style={{ background: '#f97316' }}>
                                                <div className="d-flex justify-content-between align-items-center text-white">
                                                    <span className="fw-900 fs-5 text-uppercase letter-spacing-1">Total Commande</span>
                                                    <span className="fw-900 fs-2">{calculateMenusTotal()} DT</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* === ÉTAPE INFOS : Saisie des coordonnées personnelles du client === */}
                                {isStepInfos && (
                                    <div className="animate-in-y">
                                        <h5 className="fw-800 mb-3 text-muted text-uppercase small letter-spacing-1">Vos coordonnées</h5>
                                        <div className="card border-0 bg-light rounded-4 p-4 mb-4 shadow-sm">
                                            <div className="row g-3">
                                                <div className="col-6"><div className="form-floating"><input type="text" className="form-control rounded-3 border-0" id="fn" placeholder="Nom" value={resForm.clientNom} onChange={e => setResForm({...resForm, clientNom: e.target.value})} /><label htmlFor="fn">Nom</label></div></div>
                                                <div className="col-6"><div className="form-floating"><input type="text" className="form-control rounded-3 border-0" id="ln" placeholder="Prénom" value={resForm.clientPrenom} onChange={e => setResForm({...resForm, clientPrenom: e.target.value})} /><label htmlFor="ln">Prénom</label></div></div>
                                                <div className="col-12"><div className="form-floating"><input type="email" className="form-control rounded-3 border-0" id="em" placeholder="Email" value={resForm.clientEmail} onChange={e => setResForm({...resForm, clientEmail: e.target.value})} /><label htmlFor="em">Email</label></div></div>
                                                <div className="col-12">
                                                    <label className="text-muted fw-600 small mb-1">Téléphone <span className="text-danger">*</span></label>
                                                    <PhoneInput
                                                        className="border-0 shadow-none"
                                                        value={resForm.clientTelephone}
                                                        onChange={val => setResForm({...resForm, clientTelephone: val})}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-muted smaller fw-600 text-center"><i className="bi bi-info-circle me-1"></i> Ces informations sont nécessaires pour confirmer votre commande.</p>
                                    </div>
                                )}

                                {/* === ÉTAPE RÉCAPITULATIF : Synthèse de la commande + bouton de paiement Stripe === */}
                                {isStepRecap && (
                                    <div className="animate-in-y">
                                        <div className="card border-0 bg-light rounded-5 overflow-hidden shadow-sm mb-4">
                                            <div className="card-body p-4">
                                                <h5 className="fw-800 text-dark mb-4 border-bottom pb-2">Vérifiez vos informations</h5>
                                                
                                                <div className="d-flex flex-column gap-3">
                                                    {/* Bloc récapitulatif des informations personnelles du client */}
                                                    <div className="p-3 bg-white rounded-4 shadow-sm">
                                                        <div className="text-muted smaller fw-700 uppercase mb-2">Vos Coordonnées</div>
                                                        <div className="row g-2">
                                                            <div className="col-6">
                                                                <div className="smaller text-muted fw-600">Client</div>
                                                                <div className="fw-800 text-dark">{resForm.clientNom} {resForm.clientPrenom}</div>
                                                            </div>
                                                            <div className="col-6">
                                                                <div className="smaller text-muted fw-600">Téléphone</div>
                                                                <div className="fw-800 text-dark">{resForm.clientTelephone}</div>
                                                            </div>
                                                            <div className="col-12 mt-2">
                                                                <div className="smaller text-muted fw-600">Email</div>
                                                                <div className="fw-800 text-dark small">{resForm.clientEmail}</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Bloc récapitulatif de la date, l'heure et la durée du séjour */}
                                                    <div className="d-flex align-items-center justify-content-between p-3 bg-white rounded-4 shadow-sm">
                                                        <div className="d-flex align-items-center gap-3">
                                                            <div className="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px'}}>
                                                                <i className="bi bi-calendar-event-fill"></i>
                                                            </div>
                                                            <div>
                                                                <div className="text-muted smaller fw-700 uppercase">{resForm.typeReservation === 'SUR_PLACE' ? "Date & Heure" : "Date & Heure de retrait"}</div>
                                                                <div className="fw-800 text-dark">
                                                                    {new Date(resForm.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {resForm.time}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {resForm.typeReservation === 'SUR_PLACE' && (
                                                            <div className="text-end">
                                                                <div className="text-muted smaller fw-700 uppercase">Durée</div>
                                                                <div className="fw-800 text-primary">
                                                                    {resForm.dureeHeures} h
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Bloc récapitulatif des tables sélectionnées avec leur prix (uniquement mode Sur Place) */}
                                                    {resForm.typeReservation === 'SUR_PLACE' && (
                                                        <div className="p-3 bg-white rounded-4 shadow-sm">
                                                            <div className="text-muted smaller fw-700 uppercase mb-3 d-flex justify-content-between">
                                                                <span>Tables & Capacité ({resForm.nombrePersonnes} pers.)</span>
                                                                <span>Prix</span>
                                                            </div>
                                                            {availableTables.filter(t => selectedTableIds.includes(t.id)).map(t => (
                                                                <div key={t.id} className="d-flex justify-content-between align-items-center mb-2 last-mb-0">
                                                                    <div className="fw-700 text-dark small">Table N°{t.numero}</div>
                                                                    <div className="fw-800 text-dark">{((t.prix || 0) / (t.uniteHeures || 1)) * resForm.dureeHeures} DT</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Bloc récapitulatif des menus choisis avec leur prix unitaire et ajustement budget minimal */}
                                                    <div className="p-3 bg-white rounded-4 shadow-sm">
                                                        <div className="text-muted smaller fw-700 uppercase mb-3 d-flex justify-content-between">
                                                            <span>Consommation</span>
                                                            <span>Prix</span>
                                                        </div>
                                                        
                                                        {Object.keys(selectedMenus).some(id => selectedMenus[id] > 0) ? (
                                                            menus.filter(m => selectedMenus[m.id] > 0).map(m => (
                                                                <div key={m.id} className="d-flex justify-content-between align-items-center mb-1 last-mb-0">
                                                                    <div className="fw-700 text-dark small">
                                                                        {m.nom} <span className="text-muted smaller fw-600">× {selectedMenus[m.id]}</span>
                                                                    </div>
                                                                    <div className="fw-800 text-dark">{(m.prix || 0) * selectedMenus[m.id]} DT</div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="text-muted small fw-600 mb-2">Aucun menu présélectionné</div>
                                                        )}

                                                        {resForm.typeReservation === 'SUR_PLACE' && calculateMenusTotal() < calculateMinBudgetTotal() && (
                                                            <div className="mt-3 p-2 bg-warning-subtle border border-warning-subtle rounded-3 d-flex justify-content-between align-items-center animate-in-y">
                                                                <div className="small fw-700 text-warning-emphasis">Ajustement budget minimal</div>
                                                                <div className="fw-800 text-warning-emphasis">+{calculateMinBudgetTotal() - calculateMenusTotal()} DT</div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Bloc du montant total final à payer (tables + max(menus, budget minimal)) */}
                                                    <div className="p-4 bg-dark text-white rounded-5 mt-2 shadow-lg d-flex justify-content-between align-items-center">
                                                        <div>
                                                            <div className="text-white-50 smaller fw-700 uppercase letter-spacing-1">Montant Total</div>
                                                            <div className="fw-400 small">Toutes taxes comprises</div>
                                                        </div>
                                                        <div className="text-end">
                                                            <div className="display-6 fw-900 text-primary">{calculateTotal()} <span className="fs-4">DT</span></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <button onClick={handleConfirmAndPay} disabled={submitting} className="btn btn-primary btn-lg rounded-pill w-100 py-3 fw-900 shadow-lg border-0 transition-all hover-translate-y" style={{ background: '#f97316' }}>
                                            {submitting ? <><span className="spinner-border spinner-border-sm me-2" role="status"></span> Redirection...</> : <><i className="bi bi-credit-card-fill me-2"></i> Confirmer & Payer</>}
                                        </button>
                                        <p className="text-center text-muted smaller mt-3 fw-600 mb-0"><i className="bi bi-shield-lock-fill me-1"></i> Paiement sécurisé via Stripe</p>
                                    </div>
                                )}

                                {/* === NAVIGATION : Boutons Précédent / Suivant selon l'étape courante === */}
                                <div className="d-flex gap-2 mt-5">
                                    {formStep > 0 && (
                                        <button type="button" onClick={handlePrevStep} className="btn btn-light rounded-pill px-4 fw-700 text-muted shadow-sm border flex-grow-1">
                                            <i className="bi bi-arrow-left me-1"></i> Précédent
                                        </button>
                                    )}
                                    {formStep < getTotalSteps() && (
                                        <button type="button" onClick={handleNextStep} className="btn btn-primary rounded-pill px-5 fw-800 shadow-lg flex-grow-1 transition-all hover-scale">
                                            Suivant <i className="bi bi-arrow-right ms-1"></i>
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}


            {/* === STYLES INLINE : Typographie, animations et classes utilitaires spécifiques à cette page === */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
                
                :root {
                    --premium-orange: #f97316;
                    --premium-blue: #0ea5e9;
                }

                .touriste-restaurant-details {
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
                    border-color: var(--premium-orange);
                    box-shadow: 0 10px 30px -5px rgba(0,0,0,0.3);
                }

                .day-badge {
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 16px;
                    font-size: 0.85rem;
                    font-weight: 800;
                    background: var(--bg-glass);
                    border: 1px solid var(--border-glass);
                    transition: all 0.3s ease;
                }

                .day-badge.open {
                    background: rgba(249, 115, 22, 0.1);
                    color: var(--premium-orange);
                    border-color: rgba(249, 115, 22, 0.3);
                    transform: translateY(-3px);
                }

                .btn-premium {
                    border-radius: 100px;
                    padding: 0.75rem 2rem;
                    font-weight: 800;
                    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                .btn-premium:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 15px 30px -5px rgba(249, 115, 22, 0.4);
                }

                .glass-pill {
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(5px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 100px;
                    padding: 0.5rem 1.25rem;
                    font-weight: 700;
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
            `}</style>
        {/* Composant de messagerie instantanée, ouvert lorsqu'un utilisateur clique sur "Contacter" */}
        {contactTarget && (
            <MessageCenter 
                onClose={() => setContactTarget(null)} 
                initialInterlocutor={contactTarget} 
            />
        )}
    </div>
);
};

export default RestaurantDetails;
