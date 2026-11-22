import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import PrivateRoute from './routes/PrivateRoute';
import { Toaster } from 'react-hot-toast';

// Pages
import TouristeDashboard from './pages/touriste/TouristeDashboard';
import ProfileTouriste from './pages/touriste/ProfileTouriste';
import MesReservations from './pages/touriste/MesReservations';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminNouveautes from './pages/admin/AdminNouveautes';
import HotelDashboard from './pages/prestataire/HotelDashboard';
import RestaurantDashboard from './pages/prestataire/RestaurantDashboard';
import CinemaDashboard from './pages/prestataire/CinemaDashboard';
import SportDashboard from './pages/prestataire/SportDashboard';
import GuideDashboard from './pages/prestataire/GuideDashboard';
import HotelDetails from './pages/touriste/HotelDetails';
import RestaurantDetails from './pages/touriste/RestaurantDetails';
import EvenementDetails from './pages/touriste/EvenementDetails';
import SportDetails from './pages/touriste/SportDetails';
import SortieDetails from './pages/touriste/SortieDetails';
import SortieDirectDetails from './pages/touriste/SortieDirectDetails';
import CinemaDetails from './pages/touriste/CinemaDetails';
import PaiementReussi from './pages/touriste/PaiementReussi';
import PaiementAnnule from './pages/touriste/PaiementAnnule';
import RecuReservation from './pages/touriste/RecuReservation';
import About from './pages/About';
import Conditions from './pages/Conditions';

// Services
import hotelService from './services/hotelService';
import restaurantService from './services/restaurantService';
import evenementService from './services/evenementService';
import guideService from './services/guideService';

// Layout Components
import PublicNavbar from './components/layout/PublicNavbar';
import Footer from './components/layout/Footer';
import Chatbot from './components/chatbot/Chatbot';
import ContactAdminModal from './components/layout/ContactAdminModal';
import ScrollToTop from './components/layout/ScrollToTop';

const CATEGORIES = [
    { key: 'Tous', label: 'home.category_all', icon: 'bi-grid-3x3-gap-fill' },
    { key: 'Hôtel', label: 'home.category_hotel', icon: 'bi-building' },
    { key: 'Restaurant', label: 'home.category_restaurant', icon: 'bi-egg-fried' },
    { key: 'Café', label: 'home.category_cafe', icon: 'bi-cup-hot' },
    { key: 'Sport', label: 'home.category_sport', icon: 'bi-bicycle' },
    { key: 'Cinéma', label: 'home.category_cinema', icon: 'bi-camera-reels' },
    { key: 'Guide', label: 'home.category_guide', icon: 'bi-map' },
    { key: 'Événement', label: 'home.category_event', icon: 'bi-balloon' },
];

const Home = () => {
    const { user } = useContext(AuthContext);
    const { t } = useTranslation();
    const [showcaseItems, setShowcaseItems] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [activeFilter, setActiveFilter] = React.useState('Tous');

    React.useEffect(() => {
        const fetchShowcase = async () => {
            try {
                const [hotels, restaurants, sports, cinemas, guides, events] = await Promise.all([
                    hotelService.getTousLesHotels(),
                    restaurantService.getTousLesRestaurants(),
                    evenementService.getTousLesSports(),
                    evenementService.getTousLesCinemas(),
                    guideService.getTousLesGuides(),
                    evenementService.getTousLesEvenements()
                ]);

                // Filtrer les événements futurs
                const now = new Date();
                const futureEvents = (events || []).filter(e => {
                    const eventDate = e.dateFin || e.dateDebut || e.dateProjection || e.dateSpectacle;
                    if (!eventDate) return false;
                    let parsedDate = Array.isArray(eventDate)
                        ? new Date(eventDate[0], eventDate[1] - 1, eventDate[2], eventDate[3] || 0, eventDate[4] || 0)
                        : new Date(eventDate);
                    return parsedDate >= now;
                });

                // Formatter les données pour l'affichage uniforme
                const items = [
                    ...hotels.map(h => ({ ...h, category: 'Hôtel', title: h.nom || 'Hôtel de Luxe', icon: 'bi-building' })),
                    ...restaurants.map(r => {
                        const isCafe = r.type === 'CAFE';
                        return {
                            ...r,
                            category: isCafe ? 'Café' : 'Restaurant',
                            title: r.nom || (isCafe ? 'Café de Djerba' : 'Saveurs de Djerba'),
                            icon: isCafe ? 'bi-cup-hot' : 'bi-egg-fried'
                        };
                    }),
                    ...sports.map(s => ({ ...s, category: 'Sport', title: s.nomActivite || 'Aventure Sportive', icon: 'bi-bicycle' })),
                    ...cinemas.map(c => ({ ...c, category: 'Cinéma', title: c.nom || 'Culture & Ciné', icon: 'bi-camera-reels' })),
                    ...(guides || []).map(g => ({ ...g, category: 'Guide', title: `${g.prenom} ${g.nom}`, icon: 'bi-map' })),
                    ...futureEvents.map(e => ({ ...e, category: 'Événement', title: e.titre || 'Événement Spécial', icon: 'bi-balloon' }))
                ];

                setShowcaseItems(items);
            } catch (error) {
                console.error("Erreur lors de la récupération de la vitrine:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchShowcase();
    }, []);

    if (user) {
        const role = user.role?.replace('ROLE_', '');
        const redirects = {
            ADMIN: '/admin', TOURISTE: '/touriste',
            HOTEL: '/dashboard/hotel', RESTAURANT: '/dashboard/restaurant',
            CAFE: '/dashboard/restaurant', CINEMA: '/dashboard/culture',
            SPORT: '/dashboard/sport', GUIDE: '/dashboard/guide',
        };
        return <Navigate to={redirects[role] || '/touriste'} replace />;
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
            {/* Hero Section */}
            <div className="landing-hero">
                <PublicNavbar />

                <div className="landing-hero-body">
                    <span className="landing-badge">
                        {t('home.badge')}
                    </span>
                    <h1 className="landing-title">
                        {t('home.title_part1')} <span style={{ color: '#f97316' }}>{t('home.title_part2')}</span><br />{t('home.title_part3')}
                    </h1>
                    <p className="landing-subtitle">
                        {t('home.subtitle')}
                    </p>
                    <div className="landing-hero-btns">
                        <Link to="/login" className="btn btn-primary landing-btn-main">
                            <i className="bi bi-rocket-takeoff me-2" />
                            {t('home.cta_start')}
                        </Link>
                        <Link to="/register" className="btn btn-outline-light landing-btn-secondary">
                            {t('home.cta_register')}
                        </Link>
                    </div>
                </div>
            </div>

            {/* Showcase Section */}
            <section id="showcase" className="showcase-section" style={{ background: 'var(--bg-page)' }}>
                <div className="container">
                    <div className="section-tag">
                        <h2 style={{ color: 'var(--text-main)' }}>{t('home.section_title')}</h2>
                        <p>{t('home.section_desc')}</p>
                    </div>

                    {/* ── Category Filter Chips ── */}
                    <div className="filter-bar">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.key}
                                onClick={() => setActiveFilter(cat.key)}
                                className={`filter-chip ${activeFilter === cat.key ? 'active' : ''}`}
                            >
                                <i className={`bi ${cat.icon}`}></i>
                                {t(cat.label)}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="text-center py-5">
                            <div className="loading-spinner mx-auto"></div>
                            <p className="mt-3 text-muted">{t('home.loading_services')}</p>
                        </div>
                    ) : (() => {
                        const filtered = activeFilter === 'Tous'
                            ? showcaseItems
                            : showcaseItems.filter(i => i.category === activeFilter);

                        return filtered.length > 0 ? (
                            <div className="showcase-grid">
                                {filtered.map((item, idx) => (
                                    <div key={idx} className="showcase-card" style={{ background: 'var(--bg-card)' }}>
                                        <div className="position-relative showcase-img-container" style={{ height: '220px', overflow: 'hidden' }}>
                                            {(() => {
                                                const firstImg = item.urlImage ? item.urlImage.split(',').filter(Boolean)[0] : null;
                                                return firstImg ? (
                                                    <img
                                                        src={firstImg}
                                                        alt={item.title}
                                                        className="showcase-img w-100 h-100 object-fit-cover"
                                                    />
                                                ) : (
                                                    <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-dark text-white-50 fs-1 border-bottom border-secondary">
                                                        <i className={`bi ${item.icon || 'bi-geo-alt'}`}></i>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        <div className="showcase-content">
                                            <h3 className="showcase-title" style={{ color: 'var(--text-main)' }}>{item.title}</h3>
                                            <div className="showcase-loc">
                                                <i className="bi bi-geo-alt text-primary"></i>
                                                {item.adresse || item.lieu || 'Djerba, Tunisie'}
                                            </div>
                                            {item.description && (
                                                <p className="text-muted small mb-4" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {item.description}
                                                </p>
                                            )}
                                            <div className="showcase-footer">
                                                <span className="fw-800 text-primary">{item.prix ? `${item.prix} DT` : ''}</span>
                                                <Link to={
                                                    item.category === 'Hôtel' ? `/hotel/${item.id}` :
                                                        (item.category === 'Restaurant' || item.category === 'Café') ? `/reservation-resto/${item.id}` :
                                                            item.category === 'Sport' ? `/reserver-sport/${item.id}` :
                                                                item.category === 'Cinéma' ? `/cinema/${item.id}` : 
                                                                    item.category === 'Guide' ? `/reserver-sortie/${item.id}` :
                                                                        item.category === 'Événement' ? `/reserver-ticket/evenement/${item.id}` : '/login'
                                                } className="btn btn-sm btn-outline-primary fw-700 px-3">
                                                    {t('home.learn_more')}
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-5">
                                <i className="bi bi-search fs-1 text-muted"></i>
                                <h4 className="mt-3" style={{ color: 'var(--text-main)' }}>{t('home.no_services_title')}</h4>
                                <p className="text-muted">{t('home.no_services_desc')}</p>
                            </div>
                        );
                    })()}
                </div>
            </section>

            <Footer />
        </div>
    );
};

function App() {
    return (
        <Router>
            <ScrollToTop />
            <AuthProvider>
                <Toaster />
                <Chatbot />
                <ContactAdminModal />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/conditions" element={<Conditions />} />

                    {/* Administrateur */}
                    <Route element={<PrivateRoute allowedRoles={['ADMIN']} />}>
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/admin/nouveautes" element={<AdminNouveautes />} />
                    </Route>

                    {/* Routes Détaillées Publiques (Accessibles sans être connecté) */}
                    <Route path="/hotel/:id" element={<HotelDetails />} />
                    <Route path="/reservation-resto/:id" element={<RestaurantDetails />} />
                    <Route path="/reserver-ticket/evenement/:id" element={<EvenementDetails />} />
                    <Route path="/reserver-sport/:id" element={<SportDetails />} />
                    <Route path="/reserver-sortie/:id" element={<SortieDetails />} />
                    <Route path="/sortie-detail/:id" element={<SortieDirectDetails />} />
                    <Route path="/cinema/:id" element={<CinemaDetails />} />
                    <Route path="/film/:id" element={<EvenementDetails />} />

                    {/* Touriste */}
                    <Route element={<PrivateRoute allowedRoles={['TOURISTE']} />}>
                        <Route path="/touriste" element={<TouristeDashboard />} />
                        <Route path="/touriste/profile" element={<ProfileTouriste />} />
                        <Route path="/touriste/mes-reservations" element={<MesReservations />} />
                    </Route>

                    {/* Routes de retour Paiement (Accessibles à tout utilisateur connecté) */}
                    <Route element={<PrivateRoute allowedRoles={['TOURISTE', 'ADMIN', 'GUIDE', 'HOTEL', 'RESTAURANT', 'CINEMA', 'SPORT']} />}>
                        <Route path="/payment-success" element={<PaiementReussi />} />
                        <Route path="/payment-cancel" element={<PaiementAnnule />} />
                        <Route path="/receipt/:id" element={<RecuReservation />} />
                    </Route>

                    {/* Prestataires */}
                    <Route element={<PrivateRoute allowedRoles={['HOTEL']} />}>
                        <Route path="/dashboard/hotel" element={<HotelDashboard />} />
                    </Route>
                    <Route element={<PrivateRoute allowedRoles={['RESTAURANT', 'CAFE']} />}>
                        <Route path="/dashboard/restaurant" element={<RestaurantDashboard />} />
                    </Route>
                    <Route element={<PrivateRoute allowedRoles={['CINEMA']} />}>
                        <Route path="/dashboard/culture" element={<CinemaDashboard />} />
                    </Route>
                    <Route element={<PrivateRoute allowedRoles={['SPORT']} />}>
                        <Route path="/dashboard/sport" element={<SportDashboard />} />
                    </Route>
                    <Route element={<PrivateRoute allowedRoles={['GUIDE']} />}>
                        <Route path="/dashboard/guide" element={<GuideDashboard />} />
                    </Route>

                    <Route path="/unauthorized" element={
                        <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
                            <i className="bi bi-shield-lock" style={{ fontSize: 60, color: '#f97316' }} />
                            <h2 className="mt-3 fw-800">Accès non autorisé</h2>
                            <Link to="/" className="btn btn-primary mt-3">Retour à l'accueil</Link>
                        </div>
                    } />
                </Routes>
            </AuthProvider>
        </Router>
    );
}

export default App;
