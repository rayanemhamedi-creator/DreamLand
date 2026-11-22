// Importation des hooks React essentiels dont useMemo (mémorisation) et useRef (référence DOM)
import React, { useEffect, useState, useContext, useMemo, useRef } from 'react';
// Hook de traduction multilingue (i18n)
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
// Services REST pour chaque catégorie de prestataire
import hotelService from '../../services/hotelService';
import restaurantService from '../../services/restaurantService';
import evenementService from '../../services/evenementService';
import guideService from '../../services/guideService';
// Contexte Auth et composants de mise en page
import { AuthContext } from '../../context/AuthContext';
import Topbar from '../../components/layout/Topbar';
import api from '../../services/api';
const TouristeDashboard = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    // État central : données de tous les prestataires groupées par catégorie
    const [data, setData] = useState({
        hotels: [],
        restaurants: [],
        cinemas: [],
        sports: [],
        spectacles: [],
        sorties: [],
        guides: [],
        cafes: [],
        evenements: []
    });
    const [loading, setLoading] = useState(true); // Indicateur de chargement global
    const [activeTab, setActiveTab] = useState('TOUT'); // Onglet de catégorie actif
    const [searchQuery, setSearchQuery] = useState(''); // Texte saisi dans la barre de recherche globale

    // États de recherche avancée pour les hôtels (dates, voyageurs, prix, note)
    const [showHotelDropdown, setShowHotelDropdown] = useState(false);
    const [hotelSearch, setHotelSearch] = useState({
        dateDebut: '',
        dateFin: '',
        adultes: 2,
        enfants: 0,
        chambres: 1,
        prixMax: '',
        rating: 0
    });
    // États de recherche pour les restaurants (jour d'ouverture et note)
    const [restoSearch, setRestoSearch] = useState({
        date: '',
        rating: 0
    });
    // Filtres restaurants appliqués (déclenchés au clic sur le bouton Rechercher)
    const [restoSearchApplied, setRestoSearchApplied] = useState({
        date: '',
        rating: 0
    });
    // Carte des moyennes d'avis indexée par "TYPE_id" (ex: HOTEL_12, SPORT_5)
    const [moyennesAvis, setMoyennesAvis] = useState({});
    // États de recherche pour le cinéma (date, genre, prix)
    const [cinemaSearch, setCinemaSearch] = useState({
        date: '',
        genre: '',
        prixMax: ''
    });
    // États de recherche pour les événements
    const [eventSearch, setEventSearch] = useState({
        date: '',
        prixMax: ''
    });
    // Filtres événements appliqués
    const [eventSearchApplied, setEventSearchApplied] = useState({
        date: '',
        prixMax: ''
    });
    // Mode d'affichage pour les cinémas : 'CINEMA' = établissements, 'FILM' = films programmés
    const [cinemaSearchType, setCinemaSearchType] = useState('CINEMA');
    // Mode d'affichage pour les guides : 'GUIDE' = profils guides, 'SORTIE' = excursions planifiées
    const [guideSearchType, setGuideSearchType] = useState('GUIDE');
    // Filtres de recherche pour les guides / sorties
    const [guideSearchDate, setGuideSearchDate] = useState('');
    const [guideSearchDateApplied, setGuideSearchDateApplied] = useState('');
    const [guideSearchRating, setGuideSearchRating] = useState(0);
    const [guideSearchRatingApplied, setGuideSearchRatingApplied] = useState(0);
    // Filtres de recherche pour les centres sportifs
    const [sportSearchDate, setSportSearchDate] = useState('');
    const [sportSearchDateApplied, setSportSearchDateApplied] = useState('');
    const [sportSearchRating, setSportSearchRating] = useState(0);
    const [sportSearchRatingApplied, setSportSearchRatingApplied] = useState(0);
    // Filtres hôtels appliqués (note et prix maximum)
    const [hotelSearchApplied, setHotelSearchApplied] = useState({
        rating: 0,
        prixMax: ''
    });

    // Référence DOM pour faire défiler la page jusqu'aux résultats
    const mainRef = useRef(null);

    // Défilement fluide jusqu'à la section des résultats après une recherche
    const scrollToResults = () => {
        if (mainRef.current) {
            const yOffset = -180; // Compensation pour le header fixe
            const element = mainRef.current;
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    // Recherche avancée d'hôtels avec les filtres de disponibilité et appel API backend
    const handleHotelSearch = async () => {
        setLoading(true);
        setShowHotelDropdown(false);
        // Application des filtres client-side (note et prix)
        setHotelSearchApplied({ rating: hotelSearch.rating, prixMax: hotelSearch.prixMax });
        try {
            const params = {
                dateDebut: hotelSearch.dateDebut ? hotelSearch.dateDebut + "T14:00:00" : undefined,
                dateFin: hotelSearch.dateFin ? hotelSearch.dateFin + "T10:00:00" : undefined,
                adultes: hotelSearch.adultes,
                enfants: hotelSearch.enfants,
                chambres: hotelSearch.chambres,
                prixMax: hotelSearch.prixMax || undefined
            };
            const hotels = await hotelService.searchHotels(params);
            setData(prev => ({ ...prev, hotels: hotels || [] }));
            scrollToResults();
        } catch (err) {
            console.error("Erreur recherche hôtels:", err);
        } finally {
            setLoading(false);
        }
    };

    // Recherche de films de cinéma avec filtrage côté client pour ne garder que les projections futures
    const handleCinemaSearch = async (shouldScroll = true) => {
        if (shouldScroll) setLoading(true);
        try {
            const params = {
                date: cinemaSearch.date || undefined,
                genre: cinemaSearch.genre || undefined,
                prixMax: cinemaSearch.prixMax || undefined
            };
            const films = await evenementService.searchCinemas(params);
            
            const now = new Date();
            const futureFilms = (films || []).filter(f => {
                if (!f.dateProjection) return false;
                let parsedDate = Array.isArray(f.dateProjection)
                    ? new Date(f.dateProjection[0], f.dateProjection[1] - 1, f.dateProjection[2], f.dateProjection[3] || 0, f.dateProjection[4] || 0)
                    : new Date(f.dateProjection);
                return parsedDate >= now;
            });

            // On marque ces résultats comme étant des FILMS
            const taggedFilms = futureFilms.map(f => ({ 
                ...f, 
                type: 'FILM',
                category: t('home.category_cinema'),
                icon: 'bi-film',
                color: '#fb923c'
            }));
            setData(prev => ({ ...prev, cinemas: taggedFilms }));
            if (shouldScroll) {
                scrollToResults();
            }
        } catch (err) {
            console.error("Erreur recherche cinémas:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllData();
    }, []);

    // Chargement parallèle de toutes les données au montage du composant (Promise.all)
    // Chaque appel correspond à un type de prestataire ou de service
    const loadAllData = async () => {
        setLoading(true);
        try {
            const [h, r, f, s, outings, dataEvents, guides, moyennes] = await Promise.all([
                hotelService.getTousLesHotels(),
                restaurantService.getTousLesRestaurants(),
                evenementService.getTousLesCinemas(),
                evenementService.getTousLesSports(),
                evenementService.getTousLesSorties(),
                evenementService.getTousLesEvenements(),
                guideService.getTousLesGuides(),
                api.get('/avis/moyennes').then(res => res.data).catch(() => ({}))
            ]);
            
            setMoyennesAvis(moyennes || {});
            
            // Tagage explicite des cinémas pour distinguer les établissements des films
            const cinemas = (f || []).map(c => ({ ...c, type: 'CINEMA' }));
            const now = new Date();
            // Filtrage côté client pour ne conserver que les sorties futures
            const futureOutings = (outings || []).filter(o => {
                if (!o.dateSortie) return false;
                let parsedDate = Array.isArray(o.dateSortie) 
                    ? new Date(o.dateSortie[0], o.dateSortie[1] - 1, o.dateSortie[2], o.dateSortie[3] || 0, o.dateSortie[4] || 0)
                    : new Date(o.dateSortie);
                return parsedDate >= now;
            });
            // Filtrage pour ne conserver que les événements futurs
            const futureEvents = (dataEvents || []).filter(ev => {
                const eventDate = ev.dateFin || ev.dateDebut || ev.dateProjection || ev.dateSpectacle;
                if (!eventDate) return false;
                let parsedDate = Array.isArray(eventDate)
                    ? new Date(eventDate[0], eventDate[1] - 1, eventDate[2], eventDate[3] || 0, eventDate[4] || 0)
                    : new Date(eventDate);
                return parsedDate >= now;
            });

            setData({
                hotels: h || [],
                restaurants: (r || []).filter(item => item.type === 'RESTAURANT'),
                cafes: (r || []).filter(item => item.type === 'CAFE'),
                cinemas: cinemas,
                sports: s || [],
                sorties: futureOutings,
                guides: guides || [],
                evenements: futureEvents.map(ev => ({ ...ev, type: 'EVENT' }))
            });
        } catch (err) {
            console.error("Erreur chargement:", err);
        } finally {
            setLoading(false);
        }
    };

    // useMemo : calcul mémorisé de la liste filtrée selon l'onglet actif, la recherche et les filtres
    // Se recalcule uniquement si l'une des dépendances change
    const filteredItems = useMemo(() => {
        let pool = [];
        let sportsPool = data.sports || [];

        //hotel
        if (activeTab === 'TOUT' || activeTab === 'HOTEL') {
            let hotels = data.hotels;
            if (activeTab === 'HOTEL') {
                //hotel selon avis
                if (hotelSearchApplied.rating > 0) {
                    hotels = hotels.filter(h => {
                        const statsObj = moyennesAvis[`HOTEL_${h.id}`];
                        // If no reviews yet, include the hotel (unrated ≠ badly rated)
                        if (!statsObj || !statsObj.nombreTotalAvis) return true;
                        const rating = (statsObj.pourcentageMoyenne * 5 / 100);
                        return rating >= hotelSearchApplied.rating;
                    });
                }
                //hotel selon prix
                if (hotelSearchApplied.prixMax) {
                    hotels = hotels.filter(h => {
                        const p = parseFloat(h.prix);
                        if (isNaN(p)) return true;
                        return p <= parseFloat(hotelSearchApplied.prixMax);
                    });
                }
            }
            pool = [...pool, ...hotels.map(i => ({ ...i, category: t('home.category_hotel'), type: 'HOTEL', icon: 'bi-building', color: '#ea580c' }))];
        }
        
        if (activeTab === 'TOUT' || activeTab === 'RESTAURANT' || activeTab === 'CAFE') {
            let restList = [...data.restaurants, ...(data.cafes || [])];
            if (activeTab === 'RESTAURANT') restList = data.restaurants;
            if (activeTab === 'CAFE') restList = data.cafes || [];

            if (activeTab === 'RESTAURANT' || activeTab === 'CAFE') {
                //resto selon avis
                if (restoSearchApplied.rating > 0) {
                    restList = restList.filter(r => {
                        const type = r.type;
                        const statsObj = moyennesAvis[`${type}_${r.id}`];
                        // If no reviews yet, include it
                        if (!statsObj || !statsObj.nombreTotalAvis) return true;
                        const rating = (statsObj.pourcentageMoyenne * 5 / 100);
                        return rating >= restoSearchApplied.rating;
                    });
                }
                //resto selon jours ouvert
                if (restoSearchApplied.date) {
                    const [year, month, day] = restoSearchApplied.date.split('-').map(Number);
                    const dateObj = new Date(year, month - 1, day);
                    let dayOfWeek = dateObj.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
                    if (dayOfWeek === 0) dayOfWeek = 7; // Convert to 1=Monday, ..., 7=Sunday
                    const dayStr = String(dayOfWeek);
                    restList = restList.filter(r => r.joursOuverture && r.joursOuverture.split(',').map(s => s.trim()).includes(dayStr));
                }
            }
            
            pool = [...pool, ...restList.map(i => ({ 
                ...i, 
                typeRestaurant: i.type,
                category: i.type === 'CAFE' ? t('home.category_cafe') : t('home.category_restaurant'), 
                type: 'RESTO', 
                icon: i.type === 'CAFE' ? 'bi-cup-hot' : 'bi-egg-fried', 
                color: i.type === 'CAFE' ? '#f59e0b' : '#f97316' 
            }))];
        }
        if (activeTab === 'TOUT' || activeTab === 'CINEMA') {
            pool = [...pool, ...data.cinemas.map(i => {
                // Si c'est déjà un FILM (résultat de recherche), on le garde tel quel
                if (i.type === 'FILM') return i;
                // Sinon c'est un CINEMA (chargement initial)
                return { ...i, category: t('home.category_cinema'), type: 'CINEMA', icon: 'bi-film', color: '#fb923c' };
            })];
        }
        if (activeTab === 'TOUT' || activeTab === 'SPORT') {
            if (sportSearchRatingApplied > 0) {
                //sport selon avis
                sportsPool = sportsPool.filter(s => {
                    const statsObj = moyennesAvis[`SPORT_${s.id}`];
                    if (!statsObj || !statsObj.nombreTotalAvis) return true;
                    const rating = (statsObj.pourcentageMoyenne * 5 / 100);
                    return rating >= sportSearchRatingApplied;
                });
            }
            if (sportSearchDateApplied) {
                //sport selon jours ouvert
                sportsPool = sportsPool.filter(i => {
                    if (!i.joursOuverture) return false;
                    const openDays = i.joursOuverture.split(',').map(d => d.trim());
                    const [year, month, day] = sportSearchDateApplied.split('-').map(Number);
                    const dateObj = new Date(year, month - 1, day);
                    const jsDay = dateObj.getDay();
                    const dayMap = [7, 1, 2, 3, 4, 5, 6];
                    const formattedDay = dayMap[jsDay].toString();
                    return openDays.includes(formattedDay);
                });
            }
            pool = [...pool, ...sportsPool.map(i => ({ ...i, category: t('home.category_sport'), type: 'SPORT', icon: 'bi-trophy', color: '#c2410c' }))];
        }
        if (activeTab === 'TOUT' || activeTab === 'GUIDE') {
            if (activeTab === 'TOUT' || guideSearchType === 'GUIDE') {
                let guideList = data.guides;
                if (guideSearchRatingApplied > 0) {
                    //guide selon avis
                    guideList = guideList.filter(g => {
                        const statsObj = moyennesAvis[`GUIDE_${g.id}`];
                        if (!statsObj || !statsObj.nombreTotalAvis) return true;
                        const rating = (statsObj.pourcentageMoyenne * 5 / 100);
                        return rating >= guideSearchRatingApplied;
                    });
                }
                pool = [...pool, ...guideList.map(i => ({ ...i, category: t('home.category_guide'), type: 'GUIDE', icon: 'bi-person-badge', nom: i.utilisateur ? `${i.utilisateur.prenom} ${i.utilisateur.nom}` : "Guide Professionnel", color: '#f97316' }))];
            }
            if (activeTab === 'GUIDE' && guideSearchType === 'SORTIE') {
                const now = new Date();
                // Garde uniquement les sorties futures
                let sortiesPool = data.sorties.filter(i => {
                    if (!i.dateSortie) return false;
                    let parsedDate = Array.isArray(i.dateSortie)
                        ? new Date(i.dateSortie[0], i.dateSortie[1] - 1, i.dateSortie[2], i.dateSortie[3] || 0, i.dateSortie[4] || 0)
                        : new Date(i.dateSortie);
                    return parsedDate >= now;
                });
                // Filtrage par date exacte
                if (guideSearchDateApplied) {
                    sortiesPool = sortiesPool.filter(i => {
                        if (!i.dateSortie) return false;
                        let parsedDate = Array.isArray(i.dateSortie)
                            ? new Date(i.dateSortie[0], i.dateSortie[1] - 1, i.dateSortie[2])
                            : new Date(i.dateSortie);
                        const year = parsedDate.getFullYear();
                        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
                        const day = String(parsedDate.getDate()).padStart(2, '0');
                        const formattedDate = `${year}-${month}-${day}`;
                        return formattedDate === guideSearchDateApplied;
                    });
                }
                pool = [...pool, ...sortiesPool.map(i => ({ ...i, category: 'Sortie', type: 'SORTIE', icon: 'bi-compass', color: '#f97316' }))];
            }
        }
        if (activeTab === 'TOUT' || activeTab === 'EVENEMENT') {
            let eventsPool = data.evenements;
            if (activeTab === 'EVENEMENT') {
                if (eventSearchApplied.date) {
                    // Filtrage par date
                    eventsPool = eventsPool.filter(ev => {
                        if (!ev.dateDebut) return false;
                        // Date choisie
                        const [selYear, selMonth, selDay] = eventSearchApplied.date.split('-').map(Number);
                        const selectedDate = new Date(selYear, selMonth - 1, selDay);
                        selectedDate.setHours(0, 0, 0, 0);

                        const start = Array.isArray(ev.dateDebut)
                            ? new Date(ev.dateDebut[0], ev.dateDebut[1] - 1, ev.dateDebut[2])
                            : new Date(ev.dateDebut);
                        start.setHours(0, 0, 0, 0);

                        const endRef = ev.dateFin || ev.dateDebut;
                        const end = Array.isArray(endRef)
                            ? new Date(endRef[0], endRef[1] - 1, endRef[2])
                            : new Date(endRef);
                        end.setHours(23, 59, 59, 999);
                        // Vérifie si la date choisie est dans l’intervalle
                        return selectedDate >= start && selectedDate <= end;
                    });
                }
                if (eventSearchApplied.prixMax) {
                    //evenement selon prix
                    eventsPool = eventsPool.filter(ev => {
                        const price = parseFloat(ev.prix);
                        if (isNaN(price)) return true;
                        return price <= parseFloat(eventSearchApplied.prixMax);
                    });
                }
            }
            pool = [...pool, ...eventsPool.map(i => ({ ...i, category: t('home.category_event'), type: 'EVENT', icon: 'bi-balloon', color: '#fdba74' }))];
        }
        // Si aucun texte de recherche n’est saisi,
        // retourner directement toute la liste
        if (!searchQuery) return pool;
        return pool.filter(i => {
        // Détermine quel champ utiliser pour la recherche
        // EVENT / SORTIE / FILM utilisent principalement "titre"
        // Les autres utilisent principalement "nom"
            const nameToSearch = i.type === 'EVENT' || i.type === 'SORTIE' || i.type === 'FILM'
                ? (i.titre || i.nom || '')
                : (i.nom || i.titre || '');
            return nameToSearch.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [data, activeTab, searchQuery, hotelSearchApplied, restoSearchApplied, moyennesAvis, cinemaSearchType, guideSearchType, guideSearchDateApplied, guideSearchRatingApplied, sportSearchDateApplied, sportSearchRatingApplied, eventSearchApplied]);

    // Navigation vers la page de détail adaptée au type de l'élément sélectionné
    const handleReserve = (item) => {
        // Fonction appelée lorsqu’un utilisateur clique sur "voir details"
        if (item.type === 'HOTEL') navigate(`/hotel/${item.id}`);
        else if (item.type === 'RESTO') navigate(`/reservation-resto/${item.id}`, { state: { item } });
        else if (item.type === 'CINEMA') navigate(`/cinema/${item.id}`, { state: { item } });
        else if (item.type === 'FILM') {
            navigate(`/reserver-ticket/evenement/${item.id}`, { 
                state: { 
                    item: { ...item, type: 'EVENT', category: 'Cinéma', nom: item.titre, color: '#f97316' } 
                } 
            });
        }
        else if (item.type === 'EVENT') navigate(`/reserver-ticket/evenement/${item.id}`, { state: { item } });
        else if (item.type === 'SPORT') navigate(`/reserver-sport/${item.id}`, { state: { item } });
        else if (item.type === 'GUIDE') navigate(`/reserver-sortie/${item.id}`, { state: { item } });
        else if (item.type === 'SORTIE') navigate(`/sortie-detail/${item.id}`, { state: { item } });
    };

    if (loading) return (
        <div className="loading-screen">
            <div className="loading-spinner"></div>
            <h3 className="fw-700 mt-3 text-secondary">{t('home.loading_services')}</h3>
        </div>
    );



    return (
        <div className="touriste-dashboard">
            <Topbar />
            <main className="p-0">
                <div className="hero-section">
                    <div className="hero-overlay"></div>
                    <div className="hero-content">
                        <p className="hero-subtitle text-uppercase mb-2" style={{ letterSpacing: '2px', color: '#7dd3fc', fontWeight: '700' }}>{t('dashboard.welcome')}</p>
                        <h1 className="display-4 fw-800 mb-3 text-white">{t('dashboard.explore_title')} <span className="text-info">{t('common.djerba', 'Djerba')}</span></h1>
                        <p className="lead mb-4 text-white-50">{t('dashboard.explore_subtitle')}</p>

                        <div className="search-container mx-auto" style={{ maxWidth: '600px' }}>
                            <div className="input-group input-group-lg shadow-lg rounded-pill overflow-hidden bg-body p-1">
                                <span className="input-group-text border-0 bg-body ps-4 text-muted">
                                    <i className="bi bi-search"></i>
                                </span>
                                <input
                                    className="form-control border-0 shadow-none fs-6 py-3"
                                    placeholder={t('dashboard.search_placeholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') scrollToResults(); }}
                                />
                                <button className="btn btn-primary px-4 rounded-pill fw-700" onClick={scrollToResults}>{t('dashboard.search_button')}</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="transition-all py-2" style={{ background: 'transparent' }}>
                    <div className="container-fluid">
                        <div className="d-flex justify-content-start justify-content-md-center gap-3 overflow-auto py-2 scrollbar-hidden px-2">
                            {[
                                { id: 'TOUT', label: 'home.category_all', icon: 'bi-stars' },
                                { id: 'HOTEL', label: 'home.category_hotel', icon: 'bi-building' },
                                { id: 'RESTAURANT', label: 'home.category_restaurant', icon: 'bi-egg-fried' },
                                { id: 'CAFE', label: 'home.category_cafe', icon: 'bi-cup-hot' },
                                { id: 'CINEMA', label: 'home.category_cinema', icon: 'bi-film' },
                                { id: 'SPORT', label: 'home.category_sport', icon: 'bi-trophy' },
                                { id: 'GUIDE', label: 'home.category_guide', icon: 'bi-map' },
                                { id: 'EVENEMENT', label: 'home.category_event', icon: 'bi-balloon' }
                            ].map(cat => (
                                <div
                                    key={cat.id}
                                    onClick={() => { setActiveTab(cat.id); scrollToResults(); }}
                                    className={`category-card ${activeTab === cat.id ? 'active' : ''}`}
                                >
                                    <div className="icon-wrapper">
                                        <i className={`bi ${cat.icon}`}></i>
                                    </div>
                                    <span className="category-label">{t(cat.label)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div ref={mainRef} className="container-fluid pt-2 pb-5 px-lg-5">
                    {activeTab === 'TOUT' && searchQuery ? (
                        <div>
                            <div className="d-flex align-items-center justify-content-between mb-4 pb-3 border-bottom">
                                <h2 className="fw-800 mb-0">🔍 {filteredItems.length} {t('dashboard.results_count')} "{searchQuery}"</h2>
                                <button className="btn btn-sm btn-outline-secondary" onClick={() => setSearchQuery('')}>{t('dashboard.reset')}</button>
                            </div>
                            <div className="row g-4 mt-2">
                                {filteredItems.map(item => (
                                    <div key={`${item.type}-${item.id}`} className="col-12 col-md-6 col-lg-4 col-xl-3">
                                        <ItemCard item={item} onReserve={handleReserve} />
                                    </div>
                                ))}
                            </div>
                            {filteredItems.length === 0 && <EmptyResults query={searchQuery} onClear={() => setSearchQuery('')} />}
                        </div>
                    ) : activeTab === 'TOUT' ? (
                        <div>
                            {[
                                { id: 'HOTEL', label: 'home.category_hotel', icon: 'bi-building', items: data.hotels.map(i => ({ ...i, category: t('home.category_hotel'), type: 'HOTEL', icon: 'bi-building' })) },
                                { id: 'RESTAURANT', label: 'home.category_restaurant', icon: 'bi-egg-fried', items: data.restaurants.map(i => ({ ...i, category: t('home.category_restaurant'), type: 'RESTO', icon: 'bi-egg-fried' })) },
                                { id: 'CAFE', label: 'home.category_cafe', icon: 'bi-cup-hot', items: (data.cafes || []).map(i => ({ ...i, category: t('home.category_cafe'), type: 'RESTO', icon: 'bi-cup-hot' })) },
                                { id: 'CINEMA', label: 'home.category_cinema', icon: 'bi-film', items: data.cinemas.map(i => ({ ...i, category: t('home.category_cinema'), type: 'CINEMA', icon: 'bi-film' })) },
                                { id: 'SPORT', label: 'home.category_sport', icon: 'bi-trophy', items: data.sports.map(i => ({ ...i, category: t('home.category_sport'), type: 'SPORT', icon: 'bi-trophy' })) },
                                { id: 'GUIDE', label: 'home.category_guide', icon: 'bi-map', items: data.guides.map(i => ({ ...i, category: t('home.category_guide'), type: 'GUIDE', icon: 'bi-map', nom: i.utilisateur ? `${i.utilisateur.prenom} ${i.utilisateur.nom}` : "Guide Professionnel" })) },
                                { id: 'EVENEMENT', label: 'home.category_event', icon: 'bi-balloon', items: data.evenements.map(i => ({ ...i, category: t('home.category_event'), type: 'EVENT', icon: 'bi-balloon' })) },
                            ].filter(sec => sec.items.length > 0).map(section => (
                                <section key={section.id} className="mb-5">
                                    <div className="d-flex align-items-center justify-content-between mb-4 pb-2 border-bottom">
                                        <h2 className="fw-800 mb-0 d-flex align-items-center">
                                            <span className="me-2 text-primary">{t(section.label)}</span>
                                        </h2>
                                        <button className="btn btn-link text-decoration-none fw-700 text-primary p-0 h-100" onClick={() => setActiveTab(section.id)}>
                                            {t('dashboard.see_all')} <i className="bi bi-arrow-right ms-1"></i>
                                        </button>
                                    </div>
                                    <div className="row g-4">
                                        {section.items.slice(0, 4).map(item => (
                                            <div key={`${item.type}-${item.id}`} className="col-12 col-md-6 col-lg-3">
                                                <ItemCard item={item} onReserve={handleReserve} />
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    ) : (
                        <div>
                            {activeTab === 'HOTEL' && (
                                <div className="mb-4 bg-white rounded-4 shadow-sm border p-3 mx-auto" style={{maxWidth: '1200px'}}>
                                    <div className="row g-2 align-items-center w-100 m-0">
                                        {/* Arrivée */}
                                        <div className="col-12 col-md-6 col-lg-2 p-0 pe-lg-1 mb-2 mb-lg-0">
                                            <div className="d-flex align-items-center border rounded-3 px-3 bg-white w-100" style={{height: '52px'}}>
                                                <i className="bi bi-calendar-check text-primary me-2 fs-5"></i>
                                                <div className="d-flex flex-column flex-grow-1">
                                                    <span className="text-muted text-start" style={{fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', lineHeight: '1.2'}}>{t('booking.arrival', 'Arrivée')}</span>
                                                    <input type="date" min={new Date().toISOString().split('T')[0]} className="form-control form-control-sm border-0 shadow-none p-0 fw-700 bg-transparent text-dark" style={{fontSize: '0.85rem', marginTop: '-2px'}} value={hotelSearch.dateDebut} onChange={e => setHotelSearch({...hotelSearch, dateDebut: e.target.value})} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Départ */}
                                        <div className="col-12 col-md-6 col-lg-2 p-0 px-lg-1 mb-2 mb-lg-0">
                                            <div className="d-flex align-items-center border rounded-3 px-3 bg-white w-100" style={{height: '52px'}}>
                                                <i className="bi bi-calendar-x text-primary me-2 fs-5"></i>
                                                <div className="d-flex flex-column flex-grow-1">
                                                    <span className="text-muted text-start" style={{fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', lineHeight: '1.2'}}>{t('booking.departure', 'Départ')}</span>
                                                    <input type="date" min={hotelSearch.dateDebut || new Date().toISOString().split('T')[0]} className="form-control form-control-sm border-0 shadow-none p-0 fw-700 bg-transparent text-dark" style={{fontSize: '0.85rem', marginTop: '-2px'}} value={hotelSearch.dateFin} onChange={e => setHotelSearch({...hotelSearch, dateFin: e.target.value})} />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Voyageurs */}
                                        <div className="col-12 col-md-6 col-lg-2 p-0 px-lg-1 mb-2 mb-lg-0">
                                            <div className="d-flex align-items-center border rounded-3 px-3 position-relative dropdown bg-white w-100" style={{height: '52px'}}>
                                                <i className="bi bi-people-fill text-primary me-2 fs-5"></i>
                                                <div className="w-100 d-flex flex-column user-select-none" onClick={() => setShowHotelDropdown(!showHotelDropdown)} style={{cursor: 'pointer'}}>
                                                    <span className="text-muted text-start" style={{fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', lineHeight: '1.2'}}>{t('booking.travelers', 'Voyageurs')}</span>
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <span className="fw-700 text-nowrap text-dark" style={{fontSize: '0.85rem', marginTop: '-2px'}}>{hotelSearch.adultes} {t('booking.ad', 'ad.')} · {hotelSearch.enfants} {t('booking.enf', 'enf.')}</span>
                                                        <i className={`bi bi-chevron-${showHotelDropdown ? 'up' : 'down'} text-muted small ms-1`}></i>
                                                    </div>
                                                </div>
                                                {showHotelDropdown && (
                                                    <>
                                                        <div className="position-fixed top-0 start-0 w-100 h-100" style={{zIndex: 1040}} onClick={() => setShowHotelDropdown(false)}></div>
                                                        <div className="dropdown-menu p-4 shadow-lg rounded-4 border-0 show position-absolute mt-2" style={{width: '300px', zIndex: 1050, left: 0}} onClick={(e) => e.stopPropagation()}>
                                                            <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                                                                <span className="fw-700 text-dark">{t('booking.adults', 'Adultes')}</span>
                                                                <div className="d-flex align-items-center gap-3">
                                                                    <button className="btn btn-sm btn-outline-secondary rounded-circle" style={{width: '32px', height: '32px'}} onClick={() => setHotelSearch(prev => ({...prev, adultes: Math.max(1, prev.adultes - 1)}))}><i className="bi bi-dash"></i></button>
                                                                    <span className="fw-800 text-dark" style={{minWidth: '20px', textAlign: 'center'}}>{hotelSearch.adultes}</span>
                                                                    <button className="btn btn-sm btn-outline-secondary rounded-circle" style={{width: '32px', height: '32px'}} onClick={() => setHotelSearch(prev => ({...prev, adultes: prev.adultes + 1}))}><i className="bi bi-plus"></i></button>
                                                                </div>
                                                            </div>
                                                            <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                                                                <span className="fw-700 text-dark">{t('booking.children', 'Enfants')}</span>
                                                                <div className="d-flex align-items-center gap-3">
                                                                    <button className="btn btn-sm btn-outline-secondary rounded-circle" style={{width: '32px', height: '32px'}} onClick={() => setHotelSearch(prev => ({...prev, enfants: Math.max(0, prev.enfants - 1)}))}><i className="bi bi-dash"></i></button>
                                                                    <span className="fw-800 text-dark" style={{minWidth: '20px', textAlign: 'center'}}>{hotelSearch.enfants}</span>
                                                                    <button className="btn btn-sm btn-outline-secondary rounded-circle" style={{width: '32px', height: '32px'}} onClick={() => setHotelSearch(prev => ({...prev, enfants: prev.enfants + 1}))}><i className="bi bi-plus"></i></button>
                                                                </div>
                                                            </div>
                                                            <div className="d-flex justify-content-between align-items-center">
                                                                <span className="fw-700 text-dark">{t('booking.rooms', 'Chambres')}</span>
                                                                <div className="d-flex align-items-center gap-3">
                                                                    <button className="btn btn-sm btn-outline-secondary rounded-circle" style={{width: '32px', height: '32px'}} onClick={() => setHotelSearch(prev => ({...prev, chambres: Math.max(1, prev.chambres - 1)}))}><i className="bi bi-dash"></i></button>
                                                                    <span className="fw-800 text-dark" style={{minWidth: '20px', textAlign: 'center'}}>{hotelSearch.chambres}</span>
                                                                    <button className="btn btn-sm btn-outline-secondary rounded-circle" style={{width: '32px', height: '32px'}} onClick={() => setHotelSearch(prev => ({...prev, chambres: prev.chambres + 1}))}><i className="bi bi-plus"></i></button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Note minimale */}
                                        <div className="col-12 col-md-6 col-lg-2 p-0 px-lg-1 mb-2 mb-lg-0">
                                            <div className="d-flex align-items-center border rounded-3 px-3 bg-white w-100" style={{height: '52px'}}>
                                                <i className="bi bi-star-fill text-warning me-2 fs-5"></i>
                                                <div className="d-flex flex-column w-100">
                                                    <span className="text-muted text-start" style={{fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', lineHeight: '1.2'}}>{t('dashboard.min_rating', 'Note minimale')}</span>
                                                    <select 
                                                        className="form-select form-select-sm border-0 shadow-none p-0 fw-700 bg-transparent text-dark" 
                                                        style={{fontSize: '0.85rem', marginTop: '-2px'}}
                                                        value={hotelSearch.rating} 
                                                        onChange={e => setHotelSearch({...hotelSearch, rating: Number(e.target.value)})}
                                                    >
                                                        <option value="0">{t('dashboard.all', 'Toutes')}</option>
                                                        <option value="4">4 ★ {t('dashboard.and_plus', 'et plus')}</option>
                                                        <option value="3">3 ★ {t('dashboard.and_plus', 'et plus')}</option>
                                                        <option value="2">2 ★ {t('dashboard.and_plus', 'et plus')}</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Prix Max */}
                                        <div className="col-12 col-md-6 col-lg-2 p-0 px-lg-1 mb-2 mb-lg-0">
                                            <div className="d-flex align-items-center border rounded-3 px-3 bg-white w-100" style={{height: '52px'}}>
                                                <i className="bi bi-tag-fill text-primary me-2 fs-5"></i>
                                                <div className="d-flex flex-column w-100">
                                                    <span className="text-muted text-start" style={{fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', lineHeight: '1.2'}}>{t('dashboard.price_max_dt', 'Prix Max (DT)')}</span>
                                                    <input type="number" className="form-control form-control-sm border-0 shadow-none p-0 fw-700 text-dark bg-transparent" style={{fontSize: '0.85rem', marginTop: '-2px'}} placeholder={t('dashboard.unlimited', 'Illimité')} value={hotelSearch.prixMax} onChange={e => setHotelSearch({...hotelSearch, prixMax: e.target.value})} />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Button */}
                                        <div className="col-12 col-lg-2 p-0 ps-lg-2">
                                            <button className="btn btn-primary rounded-3 w-100 fw-800" style={{height: '52px'}} onClick={handleHotelSearch}>
                                                {t('dashboard.search', 'Rechercher')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(activeTab === 'RESTAURANT' || activeTab === 'CAFE') && (
                                <div className="mb-4 bg-white rounded-4 shadow-sm border p-3 mx-auto animate-fade-in" style={{maxWidth: '1000px'}}>
                                    <div className="d-flex flex-column flex-lg-row gap-3 align-items-center">
                                        <div className="d-flex align-items-center flex-grow-1 border rounded-3 p-2 px-3 w-100 bg-white" style={{height: '52px'}}>
                                            <i className="bi bi-calendar-event text-primary me-3 fs-5"></i>
                                            <div className="d-flex flex-column w-100">
                                                <span className="text-muted text-start" style={{fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', lineHeight: '1.2'}}>Date de travail</span>
                                                <input 
                                                    type="date" 
                                                    min={new Date().toISOString().split('T')[0]} 
                                                    className="form-control form-control-sm border-0 shadow-none p-0 fw-700 bg-transparent text-dark" 
                                                    style={{fontSize: '0.85rem'}} 
                                                    value={restoSearch.date} 
                                                    onChange={e => setRestoSearch({...restoSearch, date: e.target.value})} 
                                                />
                                            </div>
                                            {restoSearch.date && (
                                                <button 
                                                    className="btn btn-sm btn-link text-muted p-0 ms-2 hover-scale border-0 bg-transparent" 
                                                    onClick={() => setRestoSearch({...restoSearch, date: ''})}
                                                    title={t('dashboard.clear_date', 'Effacer la date')}
                                                >
                                                    <i className="bi bi-x-circle-fill"></i>
                                                </button>
                                            )}
                                        </div>

                                        <div className="d-flex align-items-center flex-grow-1 border rounded-3 p-2 px-3 w-100" style={{height: '52px'}}>
                                            <i className="bi bi-star-fill text-warning me-3 fs-5"></i>
                                            <div className="d-flex flex-column w-100">
                                                <span className="text-muted text-start" style={{fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', lineHeight: '1.2'}}>Note minimale</span>
                                                <select 
                                                    className="form-select form-select-sm border-0 shadow-none p-0 fw-700 bg-transparent text-dark" 
                                                    style={{fontSize: '0.85rem'}}
                                                    value={restoSearch.rating} 
                                                    onChange={e => setRestoSearch({...restoSearch, rating: Number(e.target.value)})}
                                                >
                                                    <option value="0">{t('dashboard.all_ratings', 'Toutes les notes')}</option>
                                                    <option value="4">4 ★ {t('dashboard.and_plus', 'et plus')}</option>
                                                    <option value="3">3 ★ {t('dashboard.and_plus', 'et plus')}</option>
                                                    <option value="2">2 ★ {t('dashboard.and_plus', 'et plus')}</option>
                                                </select>
                                            </div>
                                        </div>

                                        <button 
                                            className="btn btn-primary rounded-3 fw-800 flex-shrink-0" 
                                            style={{height: '52px', minWidth: '130px'}}
                                            onClick={() => setRestoSearchApplied({...restoSearch})}
                                        >
                                            <i className="bi bi-search me-2"></i>{t('dashboard.search', 'Rechercher')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'CINEMA' && (
                                <div className="mb-4 bg-white rounded-4 shadow-sm border p-3 mx-auto" style={{maxWidth: '1000px'}}>
                                    <div className="d-flex flex-column gap-3">
                                        {/* Toggle Cinema / Film */}
                                        <div className="d-flex justify-content-center mb-1">
                                            <div className="btn-group p-1 bg-light rounded-pill" style={{border: '1px solid #eee'}}>
                                                <button 
                                                    className={`btn btn-sm rounded-pill px-4 fw-700 transition-all ${cinemaSearchType === 'CINEMA' ? 'btn-primary shadow-sm' : 'btn-light border-0 text-muted'}`}
                                                    onClick={() => {
                                                        setCinemaSearchType('CINEMA');
                                                        loadAllData(); // Recharge tout, y compris les cinémas par défaut
                                                    }}
                                                >
                                                    <i className="bi bi-building-fill me-2"></i>{t('dashboard.cinemas', 'Cinémas')}
                                                </button>
                                                <button 
                                                    className={`btn btn-sm rounded-pill px-4 fw-700 transition-all ${cinemaSearchType === 'FILM' ? 'btn-primary shadow-sm' : 'btn-light border-0 text-muted'}`}
                                                    onClick={async () => {
                                                        setCinemaSearchType('FILM');
                                                        // Charger tous les films par défaut quand on passe en mode "Films"
                                                        setLoading(true);
                                                        try {
                                                            const films = await evenementService.getTousLesFilms();
                                                            const now = new Date();
                                                            const futureFilms = (films || []).filter(f => {
                                                                if (!f.dateProjection) return false;
                                                                let parsedDate = Array.isArray(f.dateProjection)
                                                                    ? new Date(f.dateProjection[0], f.dateProjection[1] - 1, f.dateProjection[2], f.dateProjection[3] || 0, f.dateProjection[4] || 0)
                                                                    : new Date(f.dateProjection);
                                                                return parsedDate >= now;
                                                            });
                                                            
                                                            const taggedFilms = futureFilms.map(f => ({ 
                                                                ...f, 
                                                                type: 'FILM',
                                                                category: t('home.category_cinema'),
                                                                icon: 'bi-film',
                                                                color: '#fb923c'
                                                            }));
                                                            setData(prev => ({ ...prev, cinemas: taggedFilms }));
                                                        } catch (err) {
                                                            console.error(err);
                                                        } finally {
                                                            setLoading(false);
                                                        }
                                                    }}
                                                >
                                                    <i className="bi bi-film me-2"></i>{t('dashboard.movies', 'Films')}
                                                </button>
                                            </div>
                                        </div>

                                        {cinemaSearchType === 'FILM' ? (
                                            <div className="d-flex flex-column flex-lg-row gap-3 align-items-center animate-fade-in">
                                                <div className="d-flex align-items-center flex-grow-1 border rounded-3 p-2 px-3 w-100">
                                                    <i className="bi bi-calendar-event text-primary me-3 fs-5"></i>
                                                    <div className="d-flex flex-column w-100">
                                                        <span className="text-muted" style={{fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase'}}>Date de séance</span>
                                                        <input type="date" min={new Date().toISOString().split('T')[0]} className="form-control form-control-sm border-0 shadow-none p-0 fw-700 bg-transparent text-dark" style={{fontSize: '0.9rem'}} value={cinemaSearch.date} onChange={e => setCinemaSearch({...cinemaSearch, date: e.target.value})} />
                                                    </div>
                                                </div>

                                                <div className="d-flex align-items-center flex-grow-1 border rounded-3 p-2 px-3 w-100">
                                                    <i className="bi bi-film text-primary me-3 fs-5"></i>
                                                    <div className="d-flex flex-column w-100">
                                                        <span className="text-muted" style={{fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase'}}>Genre du film</span>
                                                        <select className="form-select form-select-sm border-0 shadow-none p-0 fw-700 bg-transparent text-dark" style={{fontSize: '0.9rem'}} value={cinemaSearch.genre} onChange={e => setCinemaSearch({...cinemaSearch, genre: e.target.value})}>
                                                            <option value="">{t('dashboard.all_genres', 'Tous les genres')}</option>
                                                            <option value="Action">{t('dashboard.genre_action', 'Action / Aventure')}</option>
                                                            <option value="Comedy">{t('dashboard.genre_comedy', 'Comédie')}</option>
                                                            <option value="Drama">{t('dashboard.genre_drama', 'Drame')}</option>
                                                            <option value="Horror">{t('dashboard.genre_horror', 'Horreur')}</option>
                                                            <option value="Sci-Fi">{t('dashboard.genre_scifi', 'Science-Fiction')}</option>
                                                            <option value="Romantic">{t('dashboard.genre_romance', 'Romance')}</option>
                                                            <option value="Animation">{t('dashboard.genre_animation', 'Animation')}</option>
                                                            <option value="Thriller">{t('dashboard.genre_thriller', 'Thriller / Policier')}</option>
                                                            <option value="Documentary">{t('dashboard.genre_documentary', 'Documentaire')}</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="d-flex align-items-center border rounded-3 p-2 px-3 w-100" style={{minWidth: '150px', maxWidth: '180px'}}>
                                                    <i className="bi bi-tag-fill text-primary me-3 fs-5"></i>
                                                    <div className="d-flex flex-column w-100">
                                                        <span className="text-muted" style={{fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase'}}>Prix Max (DT)</span>
                                                        <input type="number" className="form-control form-control-sm border-0 shadow-none p-0 fw-700 text-dark bg-transparent" style={{fontSize: '0.9rem'}} placeholder={t('dashboard.unlimited', 'Illimité')} value={cinemaSearch.prixMax} onChange={e => setCinemaSearch({...cinemaSearch, prixMax: e.target.value})} />
                                                    </div>
                                                </div>
                                                
                                                <button className="btn btn-primary rounded-3 px-4 fw-800 h-100 py-3 flex-shrink-0 w-100" onClick={handleCinemaSearch} style={{maxWidth: '140px'}}>
                                                    {t('dashboard.search', 'Rechercher')}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="text-center py-2 animate-fade-in">
                                                <p className="text-muted mb-0"><i className="bi bi-info-circle me-2"></i>{t('dashboard.all_cinemas_desc', 'Tous les cinémas de Djerba sont affichés ci-dessous.')}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'GUIDE' && (
                                <div className="mb-4 bg-white rounded-4 shadow-sm border p-3 mx-auto animate-fade-in" style={{maxWidth: '1000px'}}>
                                    <div className="d-flex flex-column gap-3">
                                        <div className="d-flex justify-content-center mb-1">
                                            <div className="btn-group p-1 bg-light rounded-pill" style={{border: '1px solid #eee'}}>
                                                <button 
                                                    className={`btn btn-sm rounded-pill px-4 fw-700 transition-all ${guideSearchType === 'GUIDE' ? 'btn-primary shadow-sm' : 'btn-light border-0 text-muted'}`}
                                                    onClick={() => setGuideSearchType('GUIDE')}
                                                >
                                                    <i className="bi bi-person-badge me-2"></i>{t('dashboard.guides', 'Guides')}
                                                </button>
                                                <button 
                                                    className={`btn btn-sm rounded-pill px-4 fw-700 transition-all ${guideSearchType === 'SORTIE' ? 'btn-primary shadow-sm' : 'btn-light border-0 text-muted'}`}
                                                    onClick={() => setGuideSearchType('SORTIE')}
                                                >
                                                    <i className="bi bi-compass me-2"></i>{t('dashboard.outings', 'Sorties')}
                                                </button>
                                            </div>
                                        </div>

                                        {guideSearchType === 'SORTIE' && (
                                            <div className="d-flex flex-column flex-lg-row gap-3 align-items-center animate-fade-in">
                                                <div className="d-flex align-items-center flex-grow-1 border rounded-3 p-2 px-3 w-100 bg-white" style={{height: '52px'}}>
                                                    <i className="bi bi-calendar-event text-primary me-3 fs-5"></i>
                                                    <div className="d-flex flex-column w-100">
                                                        <span className="text-muted text-start" style={{fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', lineHeight: '1.2'}}>Rechercher par date</span>
                                                        <input 
                                                            type="date" 
                                                            min={new Date().toISOString().split('T')[0]} 
                                                            className="form-control form-control-sm border-0 shadow-none p-0 fw-700 bg-transparent text-dark" 
                                                            style={{fontSize: '0.85rem'}} 
                                                            value={guideSearchDate} 
                                                            onChange={e => setGuideSearchDate(e.target.value)} 
                                                        />
                                                    </div>
                                                    {guideSearchDate && (
                                                        <button 
                                                            className="btn btn-sm btn-link text-muted p-0 ms-2 hover-scale border-0 bg-transparent" 
                                                            onClick={() => { setGuideSearchDate(''); setGuideSearchDateApplied(''); }}
                                                            title={t('dashboard.clear_date', 'Effacer la date')}
                                                        >
                                                            <i className="bi bi-x-circle-fill"></i>
                                                        </button>
                                                    )}
                                                </div>

                                                <button 
                                                    className="btn btn-primary rounded-3 fw-800 flex-shrink-0" 
                                                    style={{height: '52px', minWidth: '130px'}}
                                                    onClick={() => setGuideSearchDateApplied(guideSearchDate)}
                                                >
                                                    <i className="bi bi-search me-2"></i>{t('dashboard.search', 'Rechercher')}
                                                </button>
                                            </div>
                                        )}

                                        {guideSearchType === 'GUIDE' && (
                                            <div className="d-flex flex-column flex-lg-row gap-3 align-items-center animate-fade-in">
                                                <div className="d-flex align-items-center flex-grow-1 border rounded-3 p-2 px-3 w-100 bg-white" style={{height: '52px'}}>
                                                    <i className="bi bi-star-fill text-warning me-3 fs-5"></i>
                                                    <div className="d-flex flex-column w-100">
                                                        <span className="text-muted text-start" style={{fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', lineHeight: '1.2'}}>Note minimale</span>
                                                        <select 
                                                            className="form-select form-select-sm border-0 shadow-none p-0 fw-700 bg-transparent text-dark" 
                                                            style={{fontSize: '0.85rem', marginTop: '-2px'}}
                                                            value={guideSearchRating} 
                                                            onChange={e => setGuideSearchRating(Number(e.target.value))}
                                                        >
                                                            <option value="0">{t('dashboard.all_ratings', 'Toutes les notes')}</option>
                                                            <option value="4">4 ★ {t('dashboard.and_plus', 'et plus')}</option>
                                                            <option value="3">3 ★ {t('dashboard.and_plus', 'et plus')}</option>
                                                            <option value="2">2 ★ {t('dashboard.and_plus', 'et plus')}</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <button 
                                                    className="btn btn-primary rounded-3 fw-800 flex-shrink-0" 
                                                    style={{height: '52px', minWidth: '130px'}}
                                                    onClick={() => setGuideSearchRatingApplied(guideSearchRating)}
                                                >
                                                    <i className="bi bi-search me-2"></i>{t('dashboard.search', 'Rechercher')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'SPORT' && (
                                <div className="mb-4 bg-white rounded-4 shadow-sm border p-3 mx-auto animate-fade-in" style={{maxWidth: '1000px'}}>
                                    <div className="d-flex flex-column flex-lg-row gap-3 align-items-center">
                                        <div className="d-flex align-items-center flex-grow-1 border rounded-3 p-2 px-3 w-100 bg-white" style={{height: '52px'}}>
                                            <i className="bi bi-calendar-event text-primary me-3 fs-5"></i>
                                            <div className="d-flex flex-column w-100">
                                                <span className="text-muted text-start" style={{fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', lineHeight: '1.2'}}>Date de travail</span>
                                                <input 
                                                    type="date" 
                                                    min={new Date().toISOString().split('T')[0]} 
                                                    className="form-control form-control-sm border-0 shadow-none p-0 fw-700 bg-transparent text-dark" 
                                                    style={{fontSize: '0.85rem'}} 
                                                    value={sportSearchDate} 
                                                    onChange={e => setSportSearchDate(e.target.value)} 
                                                />
                                            </div>
                                            {sportSearchDate && (
                                                <button 
                                                    className="btn btn-sm btn-link text-muted p-0 ms-2 hover-scale border-0 bg-transparent" 
                                                    onClick={() => setSportSearchDate('')}
                                                    title={t('dashboard.clear_date', 'Effacer la date')}
                                                >
                                                    <i className="bi bi-x-circle-fill"></i>
                                                </button>
                                            )}
                                        </div>

                                        <div className="d-flex align-items-center flex-grow-1 border rounded-3 p-2 px-3 w-100 bg-white" style={{height: '52px'}}>
                                            <i className="bi bi-star-fill text-warning me-3 fs-5"></i>
                                            <div className="d-flex flex-column w-100">
                                                <span className="text-muted text-start" style={{fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', lineHeight: '1.2'}}>Note minimale</span>
                                                <select 
                                                    className="form-select form-select-sm border-0 shadow-none p-0 fw-700 bg-transparent text-dark" 
                                                    style={{fontSize: '0.85rem', marginTop: '-2px'}}
                                                    value={sportSearchRating} 
                                                    onChange={e => setSportSearchRating(Number(e.target.value))}
                                                >
                                                    <option value="0">{t('dashboard.all_ratings', 'Toutes les notes')}</option>
                                                    <option value="4">4 ★ {t('dashboard.and_plus', 'et plus')}</option>
                                                    <option value="3">3 ★ {t('dashboard.and_plus', 'et plus')}</option>
                                                    <option value="2">2 ★ {t('dashboard.and_plus', 'et plus')}</option>
                                                </select>
                                            </div>
                                        </div>

                                        <button 
                                            className="btn btn-primary rounded-3 fw-800 flex-shrink-0" 
                                            style={{height: '52px', minWidth: '130px'}}
                                            onClick={() => {
                                                setSportSearchDateApplied(sportSearchDate);
                                                setSportSearchRatingApplied(sportSearchRating);
                                            }}
                                        >
                                            <i className="bi bi-search me-2"></i>{t('dashboard.search', 'Rechercher')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'EVENEMENT' && (
                                <div className="mb-4 bg-white rounded-4 shadow-sm border p-3 mx-auto animate-fade-in" style={{maxWidth: '1000px'}}>
                                    <div className="d-flex flex-column flex-lg-row gap-3 align-items-center">
                                        <div className="d-flex align-items-center flex-grow-1 border rounded-3 p-2 px-3 bg-white w-100" style={{height: '52px'}}>
                                            <i className="bi bi-calendar-event text-primary me-3 fs-5"></i>
                                            <div className="d-flex flex-column w-100">
                                                <span className="text-muted text-start" style={{fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', lineHeight: '1.2'}}>Rechercher par date</span>
                                                <input 
                                                    type="date" 
                                                    className="form-control form-control-sm border-0 shadow-none p-0 fw-700 bg-transparent text-dark" 
                                                    style={{fontSize: '0.85rem'}} 
                                                    value={eventSearch.date} 
                                                    onChange={e => setEventSearch({...eventSearch, date: e.target.value})} 
                                                />
                                            </div>
                                            {eventSearch.date && (
                                                <button 
                                                    className="btn btn-sm btn-link text-muted p-0 ms-2 hover-scale border-0 bg-transparent" 
                                                    onClick={() => setEventSearch({...eventSearch, date: ''})}
                                                    title={t('dashboard.clear_date', 'Effacer la date')}
                                                >
                                                    <i className="bi bi-x-circle-fill"></i>
                                                </button>
                                            )}
                                        </div>

                                        <div className="d-flex align-items-center flex-grow-1 border rounded-3 p-2 px-3 bg-white w-100" style={{height: '52px'}}>
                                            <i className="bi bi-cash-coin text-primary me-3 fs-5"></i>
                                            <div className="d-flex flex-column w-100">
                                                <span className="text-muted text-start" style={{fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', lineHeight: '1.2'}}>Prix Maximum (DT)</span>
                                                <input 
                                                    type="number" 
                                                    className="form-control form-control-sm border-0 shadow-none p-0 fw-700 bg-transparent text-dark" 
                                                    style={{fontSize: '0.85rem'}} 
                                                    placeholder={t('dashboard.unlimited', 'Illimité')}
                                                    value={eventSearch.prixMax} 
                                                    onChange={e => setEventSearch({...eventSearch, prixMax: e.target.value})} 
                                                />
                                            </div>
                                            {eventSearch.prixMax && (
                                                <button 
                                                    className="btn btn-sm btn-link text-muted p-0 ms-2 hover-scale border-0 bg-transparent" 
                                                    onClick={() => setEventSearch({...eventSearch, prixMax: ''})}
                                                    title={t('dashboard.clear_price', 'Effacer le prix')}
                                                >
                                                    <i className="bi bi-x-circle-fill"></i>
                                                </button>
                                            )}
                                        </div>

                                        <button 
                                            className="btn btn-primary rounded-3 fw-800 flex-shrink-0" 
                                            style={{height: '52px', minWidth: '130px'}}
                                            onClick={() => setEventSearchApplied({...eventSearch})}
                                        >
                                            <i className="bi bi-search me-2"></i>{t('dashboard.search', 'Rechercher')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="d-flex align-items-center justify-content-between mb-4 pb-3 border-bottom">
                                <h2 className="fw-800 mb-0">
                                    {filteredItems.length} {t('dashboard.results_count')} — {t(`home.category_${
                                        activeTab === 'TOUT' ? 'all' : 
                                        activeTab === 'EVENEMENT' ? 'event' : 
                                        activeTab.toLowerCase()
                                    }`)}
                                </h2>
                                <button className="btn btn-sm btn-outline-secondary" onClick={() => setActiveTab('TOUT')}>{t('dashboard.back_home')}</button>
                            </div>
                            <div className="row g-4">
                                {filteredItems.map(item => (
                                    <div key={`${item.type}-${item.id}`} className="col-12 col-md-6 col-lg-3">
                                        <ItemCard item={item} onReserve={handleReserve} />
                                    </div>
                                ))}
                            </div>
                            {filteredItems.length === 0 && <EmptyResults onClear={() => setActiveTab('TOUT')} />}
                        </div>
                    )}
                </div>

                <footer className="footer-professional pt-5 pb-4 mt-5 bg-dark text-white-50">
                    <div className="container-fluid px-lg-5">
                        <div className="row gy-4">
                            <div className="col-lg-4">
                                <h3 className="fw-800 mb-3 d-inline-flex align-items-center" style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>
                                    <img src="/logodreamland.png" alt="Logo" style={{ height: '80px', width: 'auto', objectFit: 'contain', marginRight: '-20px', marginLeft: '-30px', position: 'relative', top: '5px' }} />
                                    <span>DreamLand</span>
                                </h3>
                                <p className="mb-4">{t('footer.about')}</p>
                                <div className="d-flex gap-3 fs-4 text-white">
                                    <i className="bi bi-facebook ps-2 cursor-pointer"></i>
                                    <i className="bi bi-instagram ps-2 cursor-pointer"></i>
                                    <i className="bi bi-twitter ps-2 cursor-pointer"></i>
                                </div>
                            </div>
                            <div className="col-lg-2 offset-lg-1">
                                <h5 className="text-white fw-700 mb-4">{t('footer.navigation')}</h5>
                                <ul className="list-unstyled d-grid gap-2">
                                    <li><button onClick={() => { window.scrollTo({top: 0, behavior: 'smooth'}); setActiveTab('TOUT'); }} className="btn btn-link text-white-50 text-decoration-none p-0">{t('common.home', 'Accueil')}</button></li>
                                    <li><button onClick={() => navigate('/conditions')} className="btn btn-link text-white-50 text-decoration-none p-0">{t('common.terms_of_service', 'Conditions générales')}</button></li>
                                    <li><button onClick={() => navigate('/about')} className="btn btn-link text-white-50 text-decoration-none p-0">{t('common.about', 'À propos')}</button></li>
                                </ul>
                            </div>
                            <div className="col-lg-3 text-start">
                                <h5 className="text-white fw-700 mb-4">{t('footer.contact')}</h5>
                                <p className="mb-2"><i className="bi bi-geo-alt me-2 text-primary"></i> Houmt Souk, {t('common.djerba', 'Djerba')}, {t('footer.country')}</p>
                                <p className="mb-3"><i className="bi bi-envelope me-2 text-primary"></i> support@dreamland.com</p>
                                <button 
                                    onClick={() => window.dispatchEvent(new CustomEvent('openContactAdmin'))}
                                    className="btn btn-primary rounded-pill px-4 py-2 d-inline-flex align-items-center gap-2 hover-scale transition-all fw-700 text-white"
                                    style={{ fontSize: '0.85rem', background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', border: 'none' }}
                                >
                                    <i className="bi bi-chat-left-text-fill"></i> {t('common.contact_us', 'Contactez-nous')}
                                </button>
                            </div>
                        </div>
                        <div className="text-center pt-5 mt-5 border-top border-secondary">
                            <p className="small mb-0">&copy; 2026 DreamLand — {t('footer.credit')}</p>
                        </div>
                    </div>
                </footer>

                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&display=swap');
                    
                    .modern-card { background: var(--bg-card); border-radius: 20px; overflow: hidden; transition: 0.3s; border: 1px solid var(--border-glass); }
                    .hover-scale:hover { transform: scale(1.05); }
                    .shadow-hover:hover { box-shadow: 0 15px 30px rgba(0,0,0,0.1) !important; }
                    .scrollbar-hidden::-webkit-scrollbar { display: none; }
                    .scrollbar-hidden { -ms-overflow-style: none; scrollbar-width: none; }
                    .cursor-pointer { cursor: pointer; }
                    .fw-800 { font-weight: 800; }

                    .hero-section {
                        position: relative;
                        height: 55vh;
                        min-height: 450px;
                        background: url('/djerbaacceuil.jpeg') center center / cover no-repeat;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        text-align: center;
                    }
                    .hero-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(15, 23, 42, 0.45) 0%, rgba(15, 23, 42, 0.75) 100%); }
                    .hero-content { position: relative; z-index: 10; max-width: 800px; padding: 0 20px; width: 100%; }

                    @media (max-width: 768px) {
                        .hero-content h1 { font-size: 32px; }
                        .modern-grid { grid-template-columns: 1fr; }
                        .border-end-md { border-right: none !important; border-bottom: 1px solid #dee2e6; }
                    }
                    @media (min-width: 769px) {
                        .border-end-md { border-right: 1px solid #dee2e6 !important; }
                    }
                    @media (max-width: 576px) {
                        .search-container { padding: 0 10px; width: 100%; }
                        .search-container .input-group { border-radius: 16px !important; flex-wrap: wrap !important; padding: 6px !important; background: white !important; }
                        .search-container .form-control { margin-bottom: 8px; text-align: center; border-radius: 12px !important; width: 100%; height: 50px; font-size: 14px !important; }
                        .search-container .btn { border-radius: 12px !important; width: 100%; padding: 12px !important; font-size: 15px; }
                        .search-container .input-group-text { display: none; }
                        .hero-content h1 { font-size: 24px; line-height: 1.2; }
                        .hero-content .lead { font-size: 14px; }
                        .hero-section { padding-top: 60px; height: auto; min-height: 400px; padding-bottom: 40px; }
                        .category-card { min-width: 100px; height: 110px; padding: 10px; }
                        .category-card .icon-wrapper { width: 45px; height: 45px; }
                        .category-card .icon-wrapper i { font-size: 1.3rem; }
                        .category-label { font-size: 0.85rem; }
                    }
                `}</style>
            </main>
        </div>
    );
};

const ItemRating = ({ id, type, item }) => {
    const { t } = useTranslation();
    const [stats, setStats] = useState(null);
        // CHARGEMENT DES NOTES
    useEffect(() => {
        const fetchStats = async () => {
            try {
                let backendType = type;
                if (type === 'RESTO') {
                    backendType = item.typeRestaurant || 'RESTAURANT';
                }
                // Only fetch if backendType is valid for reviews
                const validTypes = ['HOTEL', 'RESTAURANT', 'CAFE', 'CINEMA', 'GUIDE', 'SPORT'];
                if (!validTypes.includes(backendType)) return;
                // Appel API moyenne des avis
                const res = await api.get(`/avis/moyenne/${backendType}/${id}`);
                setStats(res.data);
            } catch (err) { console.error(err); }
        };
        fetchStats();
    }, [id, type, item.typeRestaurant]);

    if (!stats) return <div style={{ height: '40px' }}></div>;
    // CALCUL NOTE SUR 5
    const rating = (stats.pourcentageMoyenne * 5 / 100).toFixed(1);
        // AFFICHAGE NOTE
    return (
        <div className="d-flex flex-column animate-in-y">
            <span className="text-muted small mb-0" style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' }}>{t('reviews.rating_label')}</span>
            <div className="d-flex align-items-center gap-1">
                <span className="fw-900 fs-4 text-warning" style={{ lineHeight: '1' }}>{rating}</span>
                <span className="text-muted small fw-700" style={{ marginTop: '4px' }}>/ 5</span>
                <div className="ms-1 d-flex gap-1" style={{ fontSize: '0.8rem' }}>
                    {[...Array(5)].map((_, i) => (
                        <i key={i} className={`bi bi-star-fill ${i < Math.round(stats.pourcentageMoyenne / 20) ? 'text-warning' : 'text-light-emphasis opacity-25'}`}></i>
                    ))}
                </div>
            </div>
        </div>
    );
};
// CARTE D’UN ÉLÉMENT 
const ItemCard = ({ item, onReserve }) => {
    const { t } = useTranslation();
    // NOM À AFFICHER
    // EVENT / SORTIE / FILM utilisent "titre"
    // Les autres utilisent "nom"
    const displayName = item.type === 'EVENT' || item.type === 'SORTIE' || item.type === 'FILM'
        ? (item.titre || item.nom || 'Événement Djerbien')
        : (item.nomActivite || item.nom || item.titre || 'Activité Djerbienne');

    return (
        <div className="modern-card h-100 group shadow-hover border-0">
                        {/* ================= IMAGE ================= */}
            <div className="card-img-container rounded-4 position-relative overflow-hidden mb-3" style={{ height: '220px' }}>
                {(() => {
                    const firstImage = item.urlImage ? item.urlImage.split(',').filter(Boolean)[0] : null;
                    return firstImage ? (
                        <img src={firstImage} alt={displayName} className="w-100 h-100 object-fit-cover transition-all" />
                    ) : (
                        <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-body-tertiary text-muted fs-1 border">
                            <i className={`bi ${item.icon}`}></i>
                        </div>
                    );
                })()}
            </div>
            <div className="card-body p-2">
                                {/* ================= TITRE + PRIX ================= */}
                <div className="d-flex justify-content-between align-items-start mb-2">
                    <h3 className="h6 fw-800 text-body mb-0 text-truncate pe-2">{displayName}</h3>
                    {item.prix && item.prix !== 0 && item.prix !== '0' && item.prix !== 0.0 ? (
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2 fw-700">
                            {item.prix} DT
                        </span>
                    ) : null}
                </div>
                                {/* ================= ADRESSE ================= */}
                <p className="text-muted small mb-3"><i className="bi bi-geo-alt-fill text-primary me-1"></i> {item.adresse || item.lieu || t('common.default_location', 'Tunisie, Djerba')}</p>
                                {/* ================= DESCRIPTION ================= */}
                <p className="text-body-secondary small mb-4" style={{ height: '40px', overflow: 'hidden' }}>
                    {item.description ? item.description : t('common.default_establishment_desc', 'Découvrez cet établissement exceptionnel et profitez de moments inoubliables.')}
                </p>
                <div className="d-flex align-items-center justify-content-between pt-3 border-top mt-auto">
                                        {/* Notes */}
                    <ItemRating id={item.id} type={item.type} item={item} />
                                        {/* Bouton détail */}
                    <button
                        className="btn btn-primary rounded-3 px-3 py-2 fw-700 shadow-sm border-0 transition-all hover-scale"
                        onClick={() => onReserve(item)}
                    >
                        <i className="bi bi-eye-fill me-1"></i> {t('dashboard.view_details')}
                    </button>
                </div>
            </div>
        </div>
    );
};
// AUCUN RÉSULTAT

const EmptyResults = ({ query, onClear }) => {
    const { t } = useTranslation();
    return (
        <div className="text-center py-5">
            <div className="display-1 text-muted opacity-25 mb-4"><i className="bi bi-search"></i></div>
            <h3 className="fw-800">{t('dashboard.no_results')}</h3>
            <p className="text-muted">{t('dashboard.no_results_desc')} "{query}".</p>
            <button className="btn btn-primary mt-3 px-4 rounded-pill fw-700" onClick={onClear}>{t('dashboard.show_all')}</button>
        </div>
    );
};

export default TouristeDashboard;
