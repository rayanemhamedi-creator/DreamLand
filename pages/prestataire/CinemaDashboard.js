import React, { useEffect, useState, useContext, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import EvenementsSection from '../../components/espace-gestion/EvenementsSection';
import EvenementReservationsSection from '../../components/espace-gestion/EvenementReservationsSection';
import Sidebar from '../../components/layout/Sidebar';
import OfflineReservationModal from '../../components/espace-gestion/ModaleReservationSurPlace';
import OfflineCancelModal from '../../components/espace-gestion/ModaleAnnulationSurPlace';
import EditReservationModal from '../../components/espace-gestion/ModaleModifierReservation';
import MapPicker from '../../components/espace-gestion/SelecteurCarte';



import televersementService from '../../services/televersementService';
import NotificationBell from '../../components/layout/NotificationBell';

const NAV_ITEMS = [
    { id: 'DASHBOARD', label: 'Tableau de bord', icon: 'bi-speedometer2' },
    { id: 'PROFILE', label: 'Profil du Cinéma', icon: 'bi-person-badge' },
    { id: 'RESERVATIONS', label: 'Réservations reçues', icon: 'bi-receipt' },
    { id: 'FILMS', label: 'Gestion des Films', icon: 'bi-film' },
    { id: 'EVENTS', label: 'Mes Événements', icon: 'bi-stars' },
    { id: 'EVENT_RESERVATIONS', label: 'Réservations Événements', icon: 'bi-ticket-perforated' },
];

const CinemaDashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const location = useLocation();
    const [activeSection, setActiveSection] = useState(location.state?.activeSection || 'DASHBOARD');
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Data states
    const [stats, setStats] = useState({ futureProjections: 0, totalReservations: 0, totalRevenue: 0, adminCommission: 0 });
    const [cinema, setCinema] = useState(null);
    const [reservations, setReservations] = useState([]);
    const [films, setFilms] = useState([]);

    const dynamicActiveTicketsCount = reservations.filter(res => {
        if (res.statut !== 'CONFIRMEE' || !res.dateDebut) return false;
        const start = new Date(res.dateDebut);
        const film = films.find(f => f.id === res.filmId) || { duree: 120 };
        const end = new Date(start.getTime() + film.duree * 60000);
        return currentTime >= start && currentTime < end;
    }).reduce((sum, res) => sum + (res.nombrePersonnes || 1), 0);

    // Form states
    const [showAddFilm, setShowAddFilm] = useState(false);
    const [editingFilm, setEditingFilm] = useState(null);
    const [newFilm, setNewFilm] = useState({ titre: '', description: '', duree: 120, dateProjection: '', placesDisponibles: 50, prix: 10.0, genre: 'Drama', urlImage: '' });
    const [profileForm, setProfileForm] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [showOfflineModal, setShowOfflineModal] = useState(false);
    const [resTab, setResTab] = useState('EN_LIGNE');
    const [cancelTarget, setCancelTarget] = useState(null);
    const [editTarget, setEditTarget] = useState(null);
    const [detailModal, setDetailModal] = useState(null);
    const [reservFilter, setReservFilter] = useState('ALL');
    const [finFilter, setFinFilter] = useState('ALL'); // ALL, CINEMA, EVENT
    const [eventReservations, setEventReservations] = useState([]);

    const getDetailModalContent = (type) => {
        switch (type) {
            case 'PROGRAMMING':
                return (
                    <div className="row g-4 animate-in-y">
                        <div className="col-md-6">
                            <div className="p-5 rounded-4 text-white shadow-lg h-100 position-relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #ff7a00, #ff9900)' }}>
                                <i className="bi bi-film position-absolute opacity-10" style={{ fontSize: '12rem', right: '-30px', bottom: '-50px' }}></i>
                                <h5 className="fw-700 opacity-75 letter-spacing-1 text-uppercase mb-4">Séances à l'Affiche</h5>
                                <div className="display-1 fw-900 mt-2 mb-1">{stats.futureProjections}</div>
                                <div className="fs-4 fw-600 opacity-75 mb-4">Films actuellement en programmation</div>
                                <div className="pt-4 border-top border-white border-opacity-25 mt-auto">
                                    <p className="m-0 fw-600 d-flex align-items-center gap-2"><i className="bi bi-calendar-check"></i> Mise à jour en temps réel</p>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="p-5 rounded-4 text-white shadow-lg h-100 position-relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                                <i className="bi bi-ticket-detailed position-absolute opacity-10" style={{ fontSize: '12rem', right: '-30px', bottom: '-50px' }}></i>
                                <h5 className="fw-700 opacity-75 letter-spacing-1 text-uppercase mb-4">Billetterie Totale</h5>
                                <div className="display-1 fw-900 mt-2 mb-1">{stats.totalReservations}</div>
                                <div className="fs-4 fw-600 opacity-75 mb-4">Billets réservés sur la plateforme</div>
                                <div className="pt-4 border-top border-white border-opacity-25 mt-auto">
                                    <p className="m-0 fw-600 d-flex align-items-center gap-2"><i className="bi bi-graph-up"></i> Performance de vente globale</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'FINANCIAL': {
                const totalRev = reservations.filter(r => r.typeReservation !== 'SUR_PLACE' && r.statutPaiement === 'PAYE').reduce((s, r) => s + (r.prixTotal || 0) - (r.montantRembourse || 0), 0) + eventReservations.filter(r => r.statutPaiement === 'PAYE').reduce((s, r) => s + (r.prixTotal || 0) - (r.montantRembourse || 0), 0);
                const totalComm = reservations.filter(r => r.typeReservation !== 'SUR_PLACE' && r.statutPaiement === 'PAYE').reduce((s, r) => s + (parseFloat(r.commissionAdmin) || 0), 0) + eventReservations.filter(r => r.statutPaiement === 'PAYE').reduce((s, r) => s + (parseFloat(r.commissionAdmin) || 0), 0);
                const totalNet = reservations.filter(r => r.typeReservation !== 'SUR_PLACE' && r.statutPaiement === 'PAYE').reduce((s, r) => s + (parseFloat(r.gainPrestataire) || 0), 0) + eventReservations.filter(r => r.statutPaiement === 'PAYE').reduce((s, r) => s + (parseFloat(r.gainPrestataire) || 0), 0);

                return (
                    <div className="row g-4 animate-in-y">
                        <div className="col-12 col-xl-4">
                            <div className="financial-card-pro d-flex flex-column h-100" onClick={() => setDetailModal('FINANCES_CA')} style={{cursor:'pointer'}}>
                                <div className="d-flex align-items-center gap-3 mb-4">
                                    <div className="p-3 rounded-circle bg-dark text-white">
                                        <i className="bi bi-wallet2 fs-4"></i>
                                    </div>
                                    <h5 className="m-0 fw-800 text-uppercase letter-spacing-1 text-muted">Chiffre d'Affaires</h5>
                                </div>
                                <div className="mt-auto">
                                    <div className="display-1 fw-900 text-dark mb-2 tracking-tight">{totalRev.toFixed(2)} <span className="fs-2 fw-400 text-muted">DT</span></div>
                                    <div className="d-flex align-items-center gap-2 text-success fw-700">
                                        <i className="bi bi-arrow-up-right"></i>
                                        <span>Total des revenus bruts</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-12 col-xl-4">
                            <div className="financial-card-pro d-flex flex-column h-100 border-start-0" onClick={() => setDetailModal('FINANCES_COMMISSION')} style={{cursor:'pointer'}}>
                                <div className="d-flex align-items-center gap-3 mb-4">
                                    <div className="p-3 rounded-circle bg-danger bg-opacity-10 text-danger">
                                        <i className="bi bi-percent fs-4"></i>
                                    </div>
                                    <h5 className="m-0 fw-800 text-uppercase letter-spacing-1 text-muted">Commissions Plat.</h5>
                                </div>
                                <div className="mt-auto">
                                    <div className="display-1 fw-900 text-danger mb-2 tracking-tight">-{totalComm.toFixed(2)} <span className="fs-2 fw-400 text-muted">DT</span></div>
                                    <div className="text-muted fw-600">Frais de service (10%) déduits</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-12 col-xl-4">
                            <div className="financial-card-pro d-flex flex-column h-100 position-relative overflow-hidden" style={{ border: '2px solid #ff7a00', cursor: 'pointer' }} onClick={() => setDetailModal('FINANCES_NET')}>
                                <div className="position-absolute top-0 end-0 p-4 opacity-10">
                                    <i className="bi bi-trophy-fill" style={{ fontSize: '8rem' }}></i>
                                </div>
                                <div className="d-flex align-items-center gap-3 mb-4">
                                    <div className="p-3 rounded-circle text-white shadow-lg" style={{ backgroundColor: '#ff7a00' }}>
                                        <i className="bi bi-bank fs-4"></i>
                                    </div>
                                    <h5 className="m-0 fw-800 text-uppercase letter-spacing-1 text-muted">Revenu Net Final</h5>
                                </div>
                                <div className="mt-auto">
                                    <div className="display-1 fw-900 mb-2 tracking-tight" style={{ color: '#ff7a00' }}>{totalNet.toFixed(2)} <span className="fs-2 fw-400 text-muted">DT</span></div>
                                    <div className="badge rounded-pill px-3 py-2 fs-6 fw-700 shadow-sm" style={{ backgroundColor: '#fff5eb', color: '#ff7a00' }}>
                                        Prêt pour virement
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            }
            case 'FINANCES_CA':
            case 'FINANCES_COMMISSION':
            case 'FINANCES_NET': {
                const typeCA = type === 'FINANCES_CA';
                const typeComm = type === 'FINANCES_COMMISSION';
                
                const allFinRes = [
                    ...reservations.filter(r => r.typeReservation !== 'SUR_PLACE' && r.statutPaiement === 'PAYE').map(r => ({ ...r, source: 'CINEMA' })),
                    ...eventReservations.filter(r => r.statutPaiement === 'PAYE').map(r => ({ ...r, source: 'EVENT' }))
                ].filter(r => (r.prixTotal || 0) > 0).sort((a, b) => b.id - a.id);

                const filteredFinRes = allFinRes.filter(r => {
                    if (finFilter === 'ALL') return true;
                    return r.source === finFilter;
                });

                const title = typeCA ? "Détail du Chiffre d'Affaires"
                            : typeComm ? "Détail des Commissions"
                            : "Détail du Revenu Net";
                const sub   = typeCA ? "Revenus bruts (Cinéma + Événements)"
                            : typeComm ? "Frais plateforme (10%)"
                            : "Gains nets après commissions (90%)";

                const total = filteredFinRes.reduce((s, r) => {
                    const v = typeCA ? ((r.prixTotal||0) - (r.montantRembourse||0)) : typeComm ? parseFloat(r.commissionAdmin||0) : parseFloat(r.gainPrestataire||0);
                    return s + parseFloat(v);
                }, 0);

                const colClass = typeCA ? 'text-dark' : typeComm ? 'text-danger' : 'text-success';
                const colLabel = typeCA ? 'Brut' : typeComm ? 'Commission' : 'Net';

                return (
                    <div className="row g-4 animate-in-y">
                        <div className="col-12">
                            <div className="card border-0 rounded-4 shadow-sm overflow-hidden">
                                <div className="card-header bg-dark text-white py-4 px-5 d-flex align-items-center justify-content-between">
                                    <div>
                                        <h4 className="fw-900 mb-1">{title}</h4>
                                        <small className="opacity-75">{sub} &mdash; Total: <strong>{total.toFixed(2)} DT</strong></small>
                                    </div>
                                    <div className="d-flex gap-2">
                                        {['ALL', 'CINEMA', 'EVENT'].map(f => (
                                            <button 
                                                key={f} 
                                                onClick={() => setFinFilter(f)}
                                                className={`btn btn-sm rounded-pill px-3 fw-800 ${finFilter === f ? 'btn-warning text-dark' : 'btn-outline-light'}`}
                                            >
                                                {f === 'ALL' ? 'Tous' : f === 'CINEMA' ? 'Films' : 'Événements'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle mb-0">
                                        <thead className="bg-light">
                                            <tr>
                                                <th className="ps-5 border-0 small fw-800 text-secondary py-3 text-uppercase">Source</th>
                                                <th className="border-0 small fw-800 text-secondary py-3 text-uppercase">Réf / Client</th>
                                                <th className="border-0 small fw-800 text-secondary py-3 text-uppercase">Date</th>
                                                <th className={`pe-5 border-0 small fw-800 py-3 text-end text-uppercase ${colClass}`}>{colLabel}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredFinRes.length === 0 ? (
                                                <tr><td colSpan="4" className="text-center py-5 text-muted fw-600">Aucune donnée trouvée.</td></tr>
                                            ) : filteredFinRes.map(r => {
                                                const val = typeCA ? ((r.prixTotal||0) - (r.montantRembourse||0)) : typeComm ? parseFloat(r.commissionAdmin||0) : parseFloat(r.gainPrestataire||0);
                                                return (
                                                    <tr key={`${r.source}-${r.id}`} className="bg-white">
                                                        <td className="ps-5 py-4">
                                                            <span className={`badge rounded-pill small ${r.source === 'EVENT' ? 'bg-primary-subtle text-primary' : 'bg-secondary-subtle text-secondary'}`}>
                                                                {r.source === 'EVENT' ? 'Événement' : 'Cinéma'}
                                                            </span>
                                                        </td>
                                                        <td className="py-4">
                                                            <div className="fw-800 text-dark small">RES-{r.id}</div>
                                                            <div className="text-muted smaller">{(r.clientNom||'') + ' ' + (r.clientPrenom||'')}</div>
                                                        </td>
                                                        <td className="py-4 text-muted small">{r.dateDebut ? new Date(r.dateDebut).toLocaleDateString('fr-FR') : '—'}</td>
                                                        <td className={`pe-5 py-4 text-end fw-900 fs-4 ${colClass}`}>{parseFloat(val).toFixed(2)} DT</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            }
            case 'OFFLINE_CA': {
                const offlineRes = reservations
                    .filter(r => r.typeReservation === 'SUR_PLACE' && (r.prixTotal || 0) > 0)
                    .sort((a, b) => b.id - a.id);
                const totalOffline = offlineRes.reduce((s, r) => s + (parseFloat(r.prixTotal) || 0) - (parseFloat(r.montantRembourse) || 0), 0);
                return (
                    <div className="row g-4 animate-in-y">
                        <div className="col-12">
                            <div className="card border-0 rounded-4 shadow-sm overflow-hidden" style={{ backgroundColor: '#0f172a' }}>
                                <div className="card-header py-4 px-5 d-flex align-items-center justify-content-between border-0" style={{ backgroundColor: '#0f172a' }}>
                                    <div>
                                        <h4 className="fw-900 mb-1 text-white"><i className="bi bi-shop-window me-3 text-warning"></i>Réservations Hors Ligne</h4>
                                        <small className="opacity-75" style={{ color: '#94a3b8' }}>Réservations sur place — Total encaissé: <strong className="fs-5 text-white">{totalOffline.toFixed(2)} DT</strong></small>
                                    </div>
                                    <span className="badge rounded-pill px-4 py-2 fw-900 fs-6" style={{ backgroundColor: '#f97316', color: '#fff' }}>
                                        <i className="bi bi-percent me-2"></i>0% Commission
                                    </span>
                                </div>
                                <div className="table-responsive">
                                    <table className="table align-middle mb-0" style={{ backgroundColor: '#0f172a' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                                <th className="ps-5 border-0 small fw-800 py-3 text-uppercase" style={{ color: '#64748b' }}>Référence</th>
                                                <th className="border-0 small fw-800 py-3 text-uppercase" style={{ color: '#64748b' }}>Client</th>
                                                <th className="border-0 small fw-800 py-3 text-uppercase" style={{ color: '#64748b' }}>Date</th>
                                                <th className="pe-5 border-0 small fw-800 py-3 text-end text-uppercase" style={{ color: '#64748b' }}>Montant (100%)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {offlineRes.length === 0 ? (
                                                <tr><td colSpan="4" className="text-center py-5 fw-600" style={{ color: '#64748b', backgroundColor: '#0f172a' }}><i className="bi bi-inbox display-4 d-block mb-2 opacity-25"></i>Aucune réservation hors ligne enregistrée.</td></tr>
                                            ) : offlineRes.map(r => (
                                                <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#0f172a' }}>
                                                    <td className="ps-5 py-4">
                                                        <span className="rounded-pill px-3 py-2 fw-800 small" style={{ backgroundColor: 'rgba(202,138,4,0.2)', color: '#f59e0b', border: '1px solid rgba(202,138,4,0.3)' }}>OFF-{r.id}</span>
                                                    </td>
                                                    <td className="py-4">
                                                        <div className="fw-800 small text-white">{(r.clientNom||'')} {(r.clientPrenom||'')}</div>
                                                        <div className="smaller" style={{ color: '#64748b' }}>{r.clientEmail || '—'}</div>
                                                    </td>
                                                    <td className="py-4 small" style={{ color: '#64748b' }}>{r.dateDebut ? new Date(r.dateDebut).toLocaleDateString('fr-FR') : '—'}</td>
                                                    <td className="pe-5 py-4 text-end fw-900 fs-4" style={{ color: '#10b981' }}>{(parseFloat(r.prixTotal || 0) - parseFloat(r.montantRembourse || 0)).toFixed(2)} <small className="fs-6 opacity-75">DT</small></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            }
            default: return null;
        }
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [statsRes, cinRes, resRes, eventRes, filmsRes] = await Promise.all([
                api.get('/cinemas/stats').catch(e => ({ data: null })),
                api.get('/cinemas/me').catch(e => ({ data: null })),
                api.get('/reservations/mon-cinema').catch(e => ({ data: [] })),
                api.get('/reservations/mes-evenements').catch(e => ({ data: [] })),
                api.get('/films/mon-cinema').catch(e => ({ data: [] }))
            ]);

            if (statsRes.data) setStats(statsRes.data);
            if (cinRes.data) {
                setCinema(cinRes.data);
                setProfileForm(cinRes.data);
            }
            if (resRes.data) setReservations(resRes.data);
            if (eventRes.data) setEventReservations(eventRes.data);
            if (filmsRes.data) setFilms(filmsRes.data);
        } catch (err) {
            console.error("Erreur chargement Dashboard Cinéma:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/cinemas/${cinema.id}`, profileForm);
            alert("Profil Cinéma mis à jour !");
            setCinema(profileForm);
        } catch (err) {
            alert("Erreur de mise à jour : " + (err.response?.data?.message || err.message));
        }
    };

    const handleFilmAction = async (e) => {
        e.preventDefault();
        const selectedDate = new Date(newFilm.dateProjection);
        if (selectedDate < new Date()) {
            alert("Vous ne pouvez pas Programmer une séance pour une date déjà passée.");
            return;
        }

        try {
            if (editingFilm) {
                await api.put(`/films/${editingFilm.id}`, newFilm);
                alert("Film modifié avec succès");
            } else {
                await api.post('/films', newFilm);
                alert("Séance ajoutée avec succès");
            }
            setShowAddFilm(false);
            setEditingFilm(null);
            fetchData();
        } catch (err) {
            alert("❌ Erreur d'enregistrement : " + (err.response?.data?.message || "Vérifiez les champs"));
        }
    };

    const handleDeleteFilm = async (id) => {
        if (window.confirm("🗑️ Supprimer cette séance ?")) {
            try {
                await api.delete(`/films/${id}`);
                alert("✅ Séance supprimée");
                fetchData();
            } catch (err) {
                alert("❌ Erreur : Cette séance est peut-être liée à des réservations.");
            }
        }
    };

    const handleFileChange = async (e, type, isFilm = false) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploading(true);
        try {
            let newUrls = [];
            if (files.length > 1) {
                newUrls = await televersementService.televerserPlusieursImages(files);
            } else {
                const url = await televersementService.televerserImage(files[0]);
                newUrls = [url];
            }

            if (isFilm) {
                setNewFilm(prev => {
                    const current = prev.urlImage ? prev.urlImage.split(',').filter(Boolean) : [];
                    return { ...prev, urlImage: [...current, ...newUrls].join(',') };
                });
            } else {
                setProfileForm(prev => {
                    const current = prev.urlImage ? prev.urlImage.split(',').filter(Boolean) : [];
                    return { ...prev, urlImage: [...current, ...newUrls].join(',') };
                });
            }
        } catch (err) {
            alert("❌ Erreur d'upload : " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const removeImage = (index) => {
        setProfileForm(prev => {
            const current = prev.urlImage ? prev.urlImage.split(',').filter(Boolean) : [];
            const updated = [...current];
            updated.splice(index, 1);
            return { ...prev, urlImage: updated.join(',') };
        });
    };

    if (loading) return (
        <div className="loading-screen">
            <div className="loading-spinner"></div>
            <h3 className="fw-700 mt-3">Chargement de votre espace Cinéma...</h3>
        </div>
    );

    return (
        <div className="dashboard-wrapper">
            <Sidebar
                title={cinema?.nom || "Cinema Dashboard"}
                subtitle="Management Cinéma"
                iconClass="bi-film"
                navItems={NAV_ITEMS}
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                onLogout={logout}
            />

            <main className="dashboard-main">
                <header className="page-header d-flex flex-wrap align-items-center justify-content-between">
                    <div>
                        <h1 className="fw-800 text-dark mb-0">
                            {activeSection === 'DASHBOARD' && "Tableau de Bord Cinéma"}
                            {activeSection === 'PROFILE' && "Identité du Complexe"}
                            {activeSection === 'RESERVATIONS' && "Billetterie Ventes"}
                            {activeSection === 'FILMS' && "Programmation"}
                            {activeSection === 'EVENTS' && "Évènements Spéciaux"}
                            {activeSection === 'EVENT_RESERVATIONS' && "Réservations Spéciales"}
                        </h1>
                        <p className="text-muted mb-0 small">Interface de gestion experte pour exploitants de cinéma.</p>
                    </div>
                    {cinema && (
                        <div className="d-none d-md-flex align-items-center gap-3">
                            <NotificationBell userId={user?.id} />
                            <div className="text-end">
                                <div className="fw-700 text-dark">{cinema.nom}</div>

                            </div>
                            {cinema.urlImage && <img src={cinema.urlImage} alt="Cinema" className="rounded-circle shadow-sm" style={{ width: 45, height: 45, objectFit: 'cover' }} />}
                        </div>
                    )}
                </header>

                <div className="section-content">
                    {/* 1. DASHBOARD */}
                    {activeSection === 'DASHBOARD' && (
                        <div className="d-flex flex-column gap-4 animate-in-y">
                            {/* Top Hero Cards: Programmation & Billetterie */}
                            <div className="row g-4">
                                <div className="col-12 col-xl-7">
                                    <div 
                                        className="card border-0 shadow-lg rounded-4 overflow-hidden h-100 position-relative hover-scale transition-all" 
                                        style={{ backgroundColor: '#0f172a', color: '#ffffff', cursor: 'pointer' }}
                                        onClick={() => setActiveSection('FILMS')}
                                        title="Gérer la programmation"
                                    >
                                        <div className="position-absolute top-0 start-0 w-100 h-100 opacity-25" style={{ background: 'radial-gradient(circle at top right, rgba(234,88,12,0.8), transparent 50%)' }}></div>
                                        <div className="position-absolute end-0 bottom-0 mb-n4 me-n4" style={{ color: 'rgba(255, 255, 255, 0.05)' }}>
                                            <i className="bi bi-film" style={{ fontSize: '14rem', transform: 'rotate(-10deg)' }}></i>
                                        </div>
                                        
                                        <div className="card-body p-4 p-md-5 position-relative z-1">
                                            <h6 className="fw-800 text-uppercase letter-spacing-2 mb-4 d-flex align-items-center" style={{ color: '#94a3b8' }}>
                                                <i className="bi bi-camera-reels me-2 fs-5" style={{ color: '#ea580c' }}></i>Programmation Active
                                            </h6>
                                            
                                            <div className="d-flex align-items-end mb-4">
                                                <h1 className="fw-900 mb-0 lh-1 text-white" style={{ fontSize: '5rem' }}>{stats.futureProjections}</h1>
                                                <span className="fs-4 fw-600 ms-3 pb-2" style={{ color: '#94a3b8' }}>séances à l'affiche</span>
                                            </div>
                                            
                                            <div className="progress rounded-pill mt-5 mb-3 shadow-sm" style={{ height: '14px', backgroundColor: 'rgba(255,255,255,0.1)' }}>
                                                <div 
                                                    className="progress-bar progress-bar-striped progress-bar-animated rounded-pill" 
                                                    role="progressbar" 
                                                    style={{ width: '100%', backgroundColor: '#ea580c' }}
                                                ></div>
                                            </div>
                                            
                                            <div className="d-flex justify-content-between small fw-700 mt-3 pt-2 border-top border-secondary border-opacity-25">
                                                <span className="text-white"><i className="bi bi-ticket-perforated-fill me-1"></i> {dynamicActiveTicketsCount} Spectateurs en salle</span>
                                                <span style={{ color: '#ea580c' }}><i className="bi bi-clock-fill me-1"></i> En direct</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-12 col-xl-5">
                                    <div 
                                        className="card border-0 shadow-lg rounded-4 h-100 overflow-hidden position-relative bg-white hover-scale transition-all"
                                        style={{ cursor: 'pointer', borderLeft: '4px solid #f97316' }}
                                        onClick={() => setDetailModal('OFFLINE_CA')}
                                        title="Voir le détail des réservations hors ligne"
                                    >
                                        <div className="card-body p-4 p-md-5 d-flex flex-column justify-content-center align-items-center text-center">
                                            <div className="position-absolute top-0 end-0 p-4">
                                                <span className="badge rounded-pill px-3 py-2 fw-800 small text-uppercase shadow-sm" style={{ backgroundColor: 'rgba(249,115,22,0.1)', color: '#f97316' }}>Sur Place</span>
                                            </div>
                                            <div className="p-4 rounded-circle mb-4 d-inline-flex justify-content-center align-items-center shadow-sm" style={{ width: '100px', height: '100px', backgroundColor: 'rgba(249,115,22,0.1)', color: '#f97316' }}>
                                                <i className="bi bi-shop-window display-4"></i>
                                            </div>
                                            <h5 className="fw-800 text-uppercase letter-spacing-1 mb-2" style={{ color: '#0f172a' }}>CA Hors Ligne</h5>
                                            <div className="display-4 fw-900 mb-1" style={{ color: '#f97316' }}>
                                                {reservations.filter(r => r.typeReservation === 'SUR_PLACE').reduce((s, r) => s + (parseFloat(r.prixTotal) || 0) - (parseFloat(r.montantRembourse) || 0), 0).toFixed(2)}
                                            </div>
                                            <span className="fw-700 text-muted fs-5">DT</span>
                                            <small className="text-muted fw-700 mt-2">
                                                {reservations.filter(r => r.typeReservation === 'SUR_PLACE').length} réservation(s) sur place · 0% commission
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="row g-4">
                                {[
                                    { label: 'Chiffre d’Affaires', val: (reservations.filter(r => r.typeReservation !== 'SUR_PLACE' && r.statutPaiement === 'PAYE').reduce((s, r) => s + (r.prixTotal || 0) - (r.montantRembourse || 0), 0) + eventReservations.filter(r => r.statutPaiement === 'PAYE').reduce((s, r) => s + (r.prixTotal || 0) - (r.montantRembourse || 0), 0)).toFixed(2), icon: 'bi-wallet2', theme: 'secondary', suffix: 'DT', sub: 'En ligne uniquement (Stripe)', finType: 'FINANCES_CA' },
                                    { label: 'Commissions', val: (reservations.filter(r => r.typeReservation !== 'SUR_PLACE' && r.statutPaiement === 'PAYE').reduce((s, r) => s + (parseFloat(r.commissionAdmin) || 0), 0) + eventReservations.filter(r => r.statutPaiement === 'PAYE').reduce((s, r) => s + (parseFloat(r.commissionAdmin) || 0), 0)).toFixed(2), icon: 'bi-percent', theme: 'danger', suffix: 'DT', sub: 'Frais plateforme (10%) sur transactions en ligne', finType: 'FINANCES_COMMISSION' },
                                    { label: 'Revenu Net', val: (reservations.filter(r => r.typeReservation !== 'SUR_PLACE' && r.statutPaiement === 'PAYE').reduce((s, r) => s + (parseFloat(r.gainPrestataire) || 0), 0) + eventReservations.filter(r => r.statutPaiement === 'PAYE').reduce((s, r) => s + (parseFloat(r.gainPrestataire) || 0), 0)).toFixed(2), icon: 'bi-stars', theme: 'primary', suffix: 'DT', sub: 'Gains nets après commissions en ligne', finType: 'FINANCES_NET' }
                                ].map((card) => (
                                    <div key={card.label} className="col-12 col-md-4">
                                        <div 
                                            className={`card border-0 shadow-sm rounded-4 h-100 hover-scale transition-all bg-${card.theme}-subtle position-relative overflow-hidden`}
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setDetailModal(card.finType)}
                                            title="Cliquez pour voir le détail par réservation"
                                        >
                                            <div className="position-absolute end-0 bottom-0 mb-n4 me-n4" style={{ opacity: 0.1, color: `var(--bs-${card.theme})` }}>
                                                <i className={`bi ${card.icon}`} style={{ fontSize: '10rem', transform: 'rotate(-5deg)' }}></i>
                                            </div>
                                            <div className="card-body p-4 p-md-5 position-relative z-1">
                                                <div className="d-flex align-items-start justify-content-between mb-4">
                                                    <div>
                                                        <h6 className={`text-${card.theme} fw-900 text-uppercase letter-spacing-1 mb-1`}>{card.label}</h6>
                                                        <small className="text-secondary fw-700 opacity-75">{card.sub}</small>
                                                    </div>
                                                    <div className={`p-3 rounded-circle bg-white text-${card.theme} shadow-sm d-flex align-items-center justify-content-center`} style={{ width: '56px', height: '56px' }}>
                                                        <i className={`bi ${card.icon} fs-4`}></i>
                                                    </div>
                                                </div>
                                                <div className="d-flex align-items-baseline mt-4">
                                                    <span className="display-5 fw-900 text-dark lh-1 me-2">{card.val}</span>
                                                    <span className={`fw-900 text-${card.theme} fs-4 opacity-75`}>{card.suffix}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 2. PROFILE */}
                    {activeSection === 'PROFILE' && cinema && (
                        <div className="card border-0 shadow-sm rounded-4 overflow-hidden animate-in-x">
                            <div className="card-header bg-white border-bottom py-3">
                                <h5 className="fw-800 text-dark mb-0">Identité du Complexe</h5>
                            </div>
                            <div className="card-body p-4 p-md-5">
                                <form onSubmit={handleUpdateProfile}>
                                    <div className="row g-4 mb-5">
                                        <div className="col-12 col-md-4">
                                            <label className="form-label fw-700 text-secondary small">Nom du Complexe Cinématographique</label>
                                            <input className="form-control form-control-lg rounded-3 fs-6" required value={profileForm?.utilisateur?.nom || ''} onChange={e => setProfileForm({ ...profileForm, utilisateur: { ...profileForm.utilisateur, nom: e.target.value } })} placeholder="Ex: Pathé Palace" />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label fw-700 text-secondary small">Email de Contact</label>
                                            <div className="input-group">
                                                <span className="input-group-text bg-light border-end-0 rounded-start-3"><i className="bi bi-envelope text-primary"></i></span>
                                                <input className="form-control form-control-lg border-start-0 rounded-end-3 fs-6" required value={profileForm?.utilisateur?.email || ''} onChange={e => setProfileForm({ ...profileForm, utilisateur: { ...profileForm.utilisateur, email: e.target.value } })} placeholder="contact@cinema.tn" />
                                            </div>
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label fw-700 text-secondary small">Numéro de Téléphone (8 chiffres)</label>
                                            <div className="input-group">
                                                <span className="input-group-text bg-light border-end-0 rounded-start-3"><i className="bi bi-telephone text-primary"></i></span>
                                                <input 
                                                   type="tel" 
                                                   pattern="[0-9]{8}" 
                                                   minLength="8" 
                                                   maxLength="8" 
                                                   className="form-control form-control-lg border-start-0 rounded-end-3 fs-6" 
                                                   required 
                                                   value={profileForm?.utilisateur?.telephone || ''} 
                                                   onChange={e => setProfileForm({ ...profileForm, utilisateur: { ...profileForm.utilisateur, telephone: e.target.value.replace(/\D/g, '').slice(0, 8) } })} 
                                                   placeholder="Ex: 55443322" 
                                               />
                                            </div>
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label fw-700 text-secondary small">Position sur la carte</label>
                                            <MapPicker 
                                                initialValue={profileForm.localisation} 
                                                onChange={(val) => setProfileForm({ ...profileForm, localisation: val })}
                                                onAddressChange={(addr) => setProfileForm({ ...profileForm, adresse: addr })}
                                            />
                                            <div className="mt-2">
                                                <label className="form-label fw-700 text-secondary small">Adresse</label>
                                                <div className="input-group">
                                                    <span className="input-group-text bg-light border-end-0 rounded-start-3"><i className="bi bi-geo-alt text-primary"></i></span>
                                                    <input className="form-control form-control-lg border-start-0 rounded-end-3 fs-6" required value={profileForm.adresse} onChange={e => setProfileForm({ ...profileForm, adresse: e.target.value })} placeholder="Avenue Principale..." />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label fw-700 text-secondary small">Galerie de photos du complexe</label>
                                            <div className="p-4 border border-2 border-dashed rounded-4 bg-light">
                                                <div className="row g-3 mb-3">
                                                    {(profileForm?.urlImage ? profileForm.urlImage.split(',').filter(Boolean) : []).map((url, idx) => (
                                                        <div key={idx} className="col-6 col-md-4 col-lg-3">
                                                            <div className="position-relative group shadow-sm rounded-4 overflow-hidden" style={{ height: '120px' }}>
                                                                <img src={url} alt={`Cinema ${idx}`} className="w-100 h-100 object-fit-cover transition-all group-hover-scale" />
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => removeImage(idx)}
                                                                    className="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 rounded-circle shadow-sm"
                                                                    style={{ width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyCenter: 'center' }}
                                                                >
                                                                    <i className="bi bi-trash fs-6"></i>
                                                                </button>
                                                                <div className="position-absolute bottom-0 start-0 w-100 bg-dark bg-opacity-50 text-white text-center py-1 smaller fw-700">
                                                                    Photo {idx + 1}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div className="col-6 col-md-4 col-lg-3">
                                                        <label htmlFor="main-photo" className="w-100 h-100 d-flex flex-column align-items-center justify-content-center border border-2 border-dashed rounded-4 bg-white transition-all hover-bg-primary-subtle cursor-pointer" style={{ minHeight: '120px' }}>
                                                            {uploading ? (
                                                                <div className="spinner-border spinner-border-sm text-primary mb-2"></div>
                                                            ) : (
                                                                <i className="bi bi-plus-lg fs-3 text-primary mb-1"></i>
                                                            )}
                                                            <span className="smaller fw-700 text-primary">Ajouter</span>
                                                            <input 
                                                                type="file" 
                                                                id="main-photo" 
                                                                hidden 
                                                                multiple 
                                                                onChange={(e) => handleFileChange(e, 'main')} 
                                                                disabled={uploading} 
                                                            />
                                                        </label>
                                                    </div>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-muted small mb-0"><i className="bi bi-info-circle me-1"></i> Sélectionnez les meilleures photos de vos salles et de votre accueil.</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label fw-700 text-secondary small">Description / Installations</label>
                                            <textarea className="form-control rounded-3 fs-6" rows="5" value={profileForm.description} onChange={e => setProfileForm({ ...profileForm, description: e.target.value })} placeholder="Technologie IMAX, Dolby Atmos, nombre de salles..." />
                                        </div>
                                    </div>
                                    <div className="d-flex justify-content-end mt-5 pt-3 border-top">
                                        <button type="submit" className="btn btn-lg rounded-pill px-5 py-3 fw-900 shadow-lg transition-all hover-scale text-white" style={{ backgroundColor: '#ff7a00' }}>
                                            Mettre à jour le profil
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* réservations */}

                    {activeSection === 'RESERVATIONS' && (
                        <div className="d-flex flex-column gap-4 animate-in-x">
                            <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                                <div className="card-header bg-white border-bottom p-0">
                                    <div className="d-flex justify-content-between align-items-center p-4 border-bottom">
                                        <h5 className="fw-800 text-dark mb-0">Billets & Réservations</h5>
                                        <div className="d-flex gap-2">
                                            <button className="btn rounded-pill px-4 py-2 fw-800 shadow-sm transition-all hover-scale text-white" style={{ backgroundColor: '#ff7a00' }} onClick={() => setShowOfflineModal(true)}>
                                                <i className="bi bi-plus-circle me-1"></i> Capturer une réservation
                                            </button>
                                        </div>
                                    </div>
                                    <div className="d-flex px-3 bg-light">
                                        <button 
                                            className={`btn btn-link py-3 px-4 text-decoration-none fw-800 transition-all ${resTab === 'EN_LIGNE' ? 'text-primary border-bottom border-3 border-primary' : 'text-muted'}`}
                                            onClick={() => setResTab('EN_LIGNE')}
                                        >
                                            <i className="bi bi-globe me-2"></i>Ventes En Ligne 
                                            <span className="badge bg-primary-subtle text-primary rounded-pill ms-2">{reservations.filter(r => (r.typeReservation || 'EN_LIGNE') === 'EN_LIGNE' && r.statutPaiement === 'PAYE').length}</span>
                                        </button>
                                        <button 
                                            className={`btn btn-link py-3 px-4 text-decoration-none fw-800 transition-all ${resTab === 'SUR_PLACE' ? 'text-primary border-bottom border-3 border-primary' : 'text-muted'}`}
                                            onClick={() => setResTab('SUR_PLACE')}
                                        >
                                            <i className="bi bi-person-badge me-2"></i>Ventes Sur Place
                                            <span className="badge bg-info-subtle text-info rounded-pill ms-2">{reservations.filter(r => r.typeReservation === 'SUR_PLACE').length}</span>
                                        </button>
                                    </div>
                                    <div className="d-flex gap-2 p-3 bg-white border-top">
                                        {['ALL', 'EN_COURS', 'CONFIRMEE', 'PASSE', 'ANNULEE'].map(f => (
                                            <button 
                                                key={f}
                                                onClick={() => setReservFilter(f)}
                                                className={`btn btn-sm rounded-pill px-3 fw-700 ${reservFilter === f ? 'btn-dark' : 'btn-outline-secondary'}`}
                                            >
                                                {f === 'ALL' ? 'Toutes' : f === 'EN_COURS' ? 'En Cours' : f === 'CONFIRMEE' ? 'Confirmées' : f === 'PASSE' ? 'Passées' : 'Annulées'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {(() => {
                                const filtered = reservations
                                    .filter(r => (r.typeReservation || 'EN_LIGNE') === resTab)
                                    .filter(r => r.typeReservation === 'SUR_PLACE' || r.statutPaiement === 'PAYE')
                                    .filter(r => {
                                        if (reservFilter === 'ALL') return true;
                                        if (reservFilter === 'ANNULEE') return r.statut === 'ANNULEE' || r.etat === 'ANNULEE';
                                        if (reservFilter === 'PASSE') return r.statut === 'PASSEE';
                                        if (reservFilter === 'CONFIRMEE') return r.statut === 'CONFIRMEE';
                                        if (reservFilter === 'EN_COURS') return r.statut === 'EN_COURS';
                                        return true;
                                    });
                                const grouped = filtered.reduce((acc, res) => {
                                    const filmId = res.film?.id || 'unknown';
                                    if (!acc[filmId]) {
                                        acc[filmId] = { film: res.film, items: [], totalFilm: 0 };
                                    }
                                    acc[filmId].items.push(res);
                                    
                                    // Net revenue calculation: Subtract refunds for cancelled bookings
                                    const netAmount = (res.statut === 'ANNULEE' || res.etat === 'ANNULEE') 
                                        ? ((res.prixTotal || 0) - (res.montantRembourse || 0)) 
                                        : (res.prixTotal || 0);
                                    
                                    acc[filmId].totalFilm += netAmount;
                                    return acc;
                                }, {});

                                return Object.values(grouped).sort((a, b) => {
                                    const dateA = a.film ? new Date(a.film.dateProjection) : 0;
                                    const dateB = b.film ? new Date(b.film.dateProjection) : 0;
                                    return dateB - dateA;
                                }).map(group => (
                                    <div key={group.film?.id || Math.random()} className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4 border-start border-4 border-primary">
                                        <div className="card-header bg-white border-bottom-0 d-flex flex-wrap justify-content-between align-items-center p-4">
                                            <div className="d-flex align-items-center gap-4">
                                                <div className="avatar-lg bg-dark text-white rounded-4 d-flex align-items-center justify-content-center shadow-lg" style={{ width: 64, height: 64 }}>
                                                    <i className="bi bi-film fs-2"></i>
                                                </div>
                                                <div>
                                                    <h4 className="fw-900 text-dark mb-1 tracking-tight">{group.film?.titre || "Film Inconnu"}</h4>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className={`badge border px-3 py-2 rounded-pill fw-700 small shadow-sm ${group.film && new Date(group.film.dateProjection) < new Date() ? 'bg-danger bg-opacity-10 text-danger border-danger border-opacity-25' : 'bg-success bg-opacity-10 text-success border-success border-opacity-25'}`}>
                                                            <i className={`bi ${group.film && new Date(group.film.dateProjection) < new Date() ? 'bi-calendar-x' : 'bi-calendar-check'} me-2`}></i>
                                                            {group.film ? new Date(group.film.dateProjection).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Date inconnue'}
                                                        </span>
                                                        <span className="badge bg-primary-subtle text-primary border border-primary border-opacity-25 px-3 py-2 rounded-pill fw-800 small shadow-sm">
                                                            <i className="bi bi-ticket-perforated me-2"></i>
                                                            {group.items.length} Réservations
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-3 mt-md-0">
                                                <div className="card bg-white border shadow-sm rounded-4 px-4 py-3 text-end" style={{ minWidth: '200px' }}>
                                                    <div className="smaller text-muted text-uppercase fw-800 letter-spacing-2 mb-1 opacity-75">Recette Nette Estimée</div>
                                                    <div className="fw-900 text-dark fs-3 tracking-tight">{group.totalFilm.toFixed(2)} <span className="fs-6 fw-700">DT</span></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="table-responsive">
                                            <table className="table table-hover align-middle mb-0">
                                                <thead>
                                                    <tr className="bg-light border-top border-bottom">
                                                        <th className="ps-4 py-3 border-0 text-secondary small fw-800 text-uppercase letter-spacing-1">Client & Contact</th>
                                                        <th className="py-3 border-0 text-secondary small fw-800 text-uppercase letter-spacing-1 text-center">Places</th>
                                                        <th className="py-3 border-0 text-secondary small fw-800 text-uppercase letter-spacing-1 text-center">Canal</th>
                                                        <th className="py-3 border-0 text-secondary small fw-800 text-uppercase letter-spacing-1 text-center">Statut du Billet</th>
                                                        <th className="pe-4 py-3 border-0 text-secondary text-end small fw-800 text-uppercase letter-spacing-1">Transaction</th>
                                                        <th className="pe-4 py-3 border-0 text-secondary text-end small fw-800 text-uppercase letter-spacing-1">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {group.items.sort((a, b) => b.id - a.id).map(res => (
                                                        <tr key={res.id} className="transition-all hover-bg-light">
                                                            <td className="ps-4 py-3">
                                                                <div className="d-flex align-items-center">
                                                                    <div className={`avatar shadow-sm rounded-circle fw-800 d-flex align-items-center justify-content-center me-3 border-2 border-white ${res.typeReservation === 'SUR_PLACE' ? 'bg-info text-white' : 'bg-primary text-white'}`} style={{ width: 44, height: 44 }}>
                                                                        {(res.clientNom || res.utilisateur?.nom || 'C').charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <div className="fw-800 text-dark fs-6">{res.clientNom || res.utilisateur?.nom} {res.clientPrenom || res.utilisateur?.prenom}</div>
                                                                        <div className="text-muted smaller fw-600"><i className="bi bi-envelope me-1"></i>{res.clientEmail || res.utilisateur?.email}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="text-center">
                                                                <div className="d-inline-flex align-items-center justify-content-center bg-secondary-subtle text-secondary rounded-pill px-3 py-1 fw-900 shadow-sm" style={{ minWidth: '60px' }}>
                                                                    {res.nombrePersonnes} <i className="bi bi-person-fill ms-1 smaller"></i>
                                                                </div>
                                                            </td>
                                                            <td className="text-center">
                                                                <span className={`badge rounded-pill px-3 py-2 fw-800 small border shadow-sm ${res.typeReservation === 'SUR_PLACE' ? 'bg-info-subtle text-info border-info border-opacity-25' : 'bg-primary-subtle text-primary border-primary border-opacity-25'}`}>
                                                                    <i className={`bi ${res.typeReservation === 'SUR_PLACE' ? 'bi-person-vcard' : 'bi-globe'} me-1`}></i>
                                                                    {`${res.typeReservation || 'EN_LIGNE'}`}
                                                                </span>
                                                            </td>
                                                            <td className="text-center">
                                                                {res.statut === 'ANNULEE' || res.etat === 'ANNULEE' ? (
                                                                    <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 rounded-pill px-3 py-2 fw-800 shadow-sm">
                                                                        <i className="bi bi-x-octagon-fill me-1"></i> Annulé
                                                                    </span>
                                                                ) : res.statut === 'PASSEE' ? (
                                                                    <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 rounded-pill px-3 py-2 fw-800 shadow-sm">
                                                                        <i className="bi bi-clock-history me-1"></i> Déjà passé
                                                                    </span>
                                                                ) : res.statut === 'EN_COURS' ? (
                                                                    <span className="badge rounded-pill px-3 py-2 fw-800 shadow-sm" style={{ backgroundColor: 'rgba(249,115,22,0.1)', color: '#ea580c', border: '1px solid rgba(249,115,22,0.25)' }}>
                                                                        <i className="bi bi-play-circle-fill me-1"></i> Séance en cours
                                                                    </span>
                                                                ) : (
                                                                    <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill px-3 py-2 fw-800 shadow-sm">
                                                                        <i className="bi bi-patch-check-fill me-1"></i> Confirmé
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="text-end pe-4">
                                                                <div className="fw-900 text-dark fs-5 tracking-tight">{res.prixTotal} <small className="text-muted fw-700 fs-6">DT</small></div>
                                                                <div className="mt-1 text-end">
                                                                    {res.typeReservation === 'SUR_PLACE' ? (
                                                                        <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 rounded-pill px-2 py-1 smaller fw-700">
                                                                            <i className="bi bi-cash me-1"></i> Sur Place
                                                                        </span>
                                                                    ) : res.statutPaiement === 'PAYE' ? (
                                                                        <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill px-2 py-1 smaller fw-700">
                                                                            <i className="bi bi-credit-card-2-back-fill me-1"></i> Payé
                                                                        </span>
                                                                    ) : (
                                                                        <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 rounded-pill px-2 py-1 smaller fw-700">
                                                                            <i className="bi bi-exclamation-circle-fill me-1"></i> En attente
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {(res.statut === 'ANNULEE' || res.etat === 'ANNULEE') && (
                                                                    <div className="badge rounded-pill bg-danger text-white smaller fw-800 mt-1 shadow-sm px-2">
                                                                        <i className="bi bi-arrow-down-left-circle me-1"></i>
                                                                        Remboursé: {res.montantRembourse || 0} DT
                                                                    </div>
                                                                )}
                                                            </td>
                                                                <td className="pe-4 text-end">
                                                                    <div className="d-flex justify-content-end gap-2">
                                                                        <button 
                                                                            className="btn btn-outline-primary btn-sm rounded-circle d-flex align-items-center justify-content-center shadow-sm hover-scale" 
                                                                            style={{ width: 32, height: 32 }} 
                                                                            onClick={() => window.open(`/receipt/${res.id}`, '_blank')}
                                                                            title="Voir Reçu"
                                                                        >
                                                                            <i className="bi bi-file-earmark-text-fill"></i>
                                                                        </button>
                                                                        {(res.statut === 'CONFIRMEE' || res.statut === 'EN_COURS' || res.etat === 'ACCEPTEE') && resTab === 'SUR_PLACE' && (
                                                                            <>
                                                                                <button className="btn btn-dark btn-sm rounded-circle d-flex align-items-center justify-content-center shadow-sm hover-scale" style={{ width: 32, height: 32 }} onClick={() => setEditTarget(res)} title="Modifier">
                                                                                    <i className="bi bi-pencil-fill"></i>
                                                                                </button>
                                                                                <button className="btn btn-danger btn-sm rounded-circle d-flex align-items-center justify-content-center shadow-sm hover-scale" style={{ width: 32, height: 32 }} onClick={() => setCancelTarget(res)} title="Annuler">
                                                                                    <i className="bi bi-trash-fill"></i>
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ));
                            })()}
                            {reservations.filter(r => (r.typeReservation || 'EN_LIGNE') === resTab).filter(r => r.typeReservation === 'SUR_PLACE' || r.statutPaiement === 'PAYE').length === 0 && (
                                <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-light">
                                    <div className="mb-4">
                                        <i className="bi bi-ticket-perforated text-muted opacity-25" style={{ fontSize: '4rem' }}></i>
                                    </div>
                                    <h4 className="fw-800 text-dark">Aucune vente {resTab.toLowerCase()} enregistrée.</h4>
                                    <p className="text-muted">Les billets achetés apparaîtront ici dès qu'une séance sera réservée.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 4. FILMS */}
                    {activeSection === 'FILMS' && (
                        <div className="animate-in-x">
                            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-5">
                                <div>
                                    <h5 className="fw-800 text-dark mb-1">Affiche & Séances</h5>
                                    <p className="text-muted small mb-0">Programmez vos films et événements cinématographiques.</p>
                                </div>
                                <button className="btn rounded-pill px-5 py-3 fw-900 shadow-lg d-flex align-items-center gap-3 transition-all hover-scale w-100 w-md-auto justify-content-center text-white" style={{ backgroundColor: '#ff7a00' }} onClick={() => { setEditingFilm(null); setNewFilm({ titre: '', description: '', duree: 120, dateProjection: '', placesDisponibles: 50, prix: 10.0, genre: 'Drama' }); setShowAddFilm(true); }}>
                                    <i className="bi bi-plus-lg fs-5"></i> Programmer un Film
                                </button>
                            </div>

                            {showAddFilm && (
                                <div className="card border-0 shadow-lg rounded-4 mb-5 overflow-hidden border-start border-4 border-primary">
                                    <div className="card-body p-4 p-md-5">
                                        <div className="d-flex justify-content-between align-items-center mb-4">
                                            <h5 className="fw-800 text-dark mb-0">{editingFilm ? "Modifier la programmation" : "Programmer un film"}</h5>
                                            <button className="btn-close" onClick={() => setShowAddFilm(false)}></button>
                                        </div>
                                        <form onSubmit={handleFilmAction}>
                                            <div className="row g-4">
                                                <div className="col-12 col-md-6">
                                                    <label className="form-label fw-700 text-secondary small">Titre de l'œuvre</label>
                                                    <input className="form-control form-control-lg rounded-3 fs-6" required value={newFilm.titre} onChange={e => setNewFilm({ ...newFilm, titre: e.target.value })} placeholder="Ex: Dune: Deuxième Partie" />
                                                </div>
                                                <div className="col-12 col-md-6">
                                                    <label className="form-label fw-700 text-secondary small">Date & Heure Projection</label>
                                                    <input 
                                                        type="datetime-local" 
                                                        className="form-control form-control-lg rounded-3 fs-6" 
                                                        required 
                                                        min={new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16)}
                                                        value={newFilm.dateProjection} 
                                                        onChange={e => setNewFilm({ ...newFilm, dateProjection: e.target.value })} 
                                                    />
                                                </div>
                                                <div className="col-12 col-md-4">
                                                    <label className="form-label fw-700 text-secondary small">Durée (min)</label>
                                                    <div className="input-group input-group-lg">
                                                        <span className="input-group-text bg-light border-end-0"><i className="bi bi-clock text-secondary"></i></span>
                                                        <input type="number" className="form-control rounded-3 border-start-0" required value={newFilm.duree} onChange={e => setNewFilm({ ...newFilm, duree: e.target.value })} />
                                                    </div>
                                                </div>
                                                <div className="col-12 col-md-4">
                                                    <label className="form-label fw-700 text-secondary small">Jauge / Places Disponibles</label>
                                                    <div className="input-group input-group-lg">
                                                        <span className="input-group-text bg-light border-end-0"><i className="bi bi-people text-secondary"></i></span>
                                                        <input type="number" className="form-control rounded-3 border-start-0" required value={newFilm.placesDisponibles} onChange={e => setNewFilm({ ...newFilm, placesDisponibles: e.target.value })} />
                                                    </div>
                                                </div>
                                                <div className="col-12 col-md-4">
                                                    <label className="form-label fw-700 text-secondary small">Tarif Unitaire (DT)</label>
                                                    <input type="number" step="0.5" className="form-control form-control-lg rounded-3" required value={newFilm.prix} onChange={e => setNewFilm({ ...newFilm, prix: e.target.value })} />
                                                </div>
                                                <div className="col-12 col-md-6">
                                                    <label className="form-label fw-700 text-secondary small">Genre / Style</label>
                                                    <select className="form-select form-select-lg rounded-3 fs-6" value={newFilm.genre} onChange={e => setNewFilm({ ...newFilm, genre: e.target.value })}>
                                                        <option value="Drama">Drame</option>
                                                        <option value="Comedy">Comédie</option>
                                                        <option value="Romantic">Romance</option>
                                                        <option value="Thriller">Thriller / Policier</option>
                                                        <option value="Sci-Fi">Science-Fiction</option>
                                                        <option value="Horror">Horreur / Épouvante</option>
                                                        <option value="Action">Action / Aventure</option>
                                                        <option value="Animation">Animation / Famille</option>
                                                        <option value="Documentary">Documentaire</option>
                                                    </select>
                                                </div>
                                                <div className="col-12 col-md-6">
                                                    <label className="form-label fw-700 text-secondary small">Affiche (Poster)</label>
                                                    <div className="d-flex align-items-center gap-3 bg-light p-2 rounded-3 border">
                                                        {newFilm.urlImage ? (
                                                            <img src={newFilm.urlImage} alt="Preview" className="rounded shadow-sm" style={{ width: 45, height: 60, objectFit: 'cover' }} />
                                                        ) : (
                                                            <div className="bg-secondary bg-opacity-10 rounded d-flex align-items-center justify-content-center" style={{ width: 45, height: 60 }}>
                                                                <i className="bi bi-image text-muted"></i>
                                                            </div>
                                                        )}
                                                        <div className="flex-grow-1">
                                                            <input type="file" id="film-photo" hidden onChange={(e) => handleFileChange(e, 'film', true)} disabled={uploading} />
                                                            <label htmlFor="film-photo" className="btn btn-dark btn-sm rounded-pill px-3">
                                                                {uploading ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="bi bi-upload me-1"></i>}
                                                                Téléverser l'affiche
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-12">
                                                    <label className="form-label fw-700 text-secondary small">Synopsis / Description</label>
                                                    <textarea className="form-control rounded-3 fs-6" rows="4" value={newFilm.description} onChange={e => setNewFilm({ ...newFilm, description: e.target.value })} placeholder="Résumé de l'intrigue..." />
                                                </div>
                                                <div className="col-12 d-flex justify-content-end gap-3 mt-4">
                                                    <button type="button" onClick={() => setShowAddFilm(false)} className="btn btn-light rounded-pill px-5 py-3 fw-800 shadow-sm text-dark transition-all hover-scale">Annuler</button>
                                                    <button type="submit" className="btn rounded-pill px-5 py-3 fw-900 shadow-lg transition-all hover-scale text-white" style={{ backgroundColor: '#ff7a00' }}>{editingFilm ? "Actualiser le film" : "Ajouter à l'affiche"}</button>
                                                </div>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}

                            {/* Films à venir */}
                            <div className="mb-5">
                                <h6 className="fw-800 text-uppercase letter-spacing-1 text-primary mb-4 border-bottom pb-2"><i className="bi bi-calendar-check me-2"></i> Séances à venir</h6>
                                <div className="row g-4">
                                    {films.filter(f => !f.dateProjection || new Date(f.dateProjection) >= new Date()).sort((a, b) => new Date(a.dateProjection) - new Date(b.dateProjection)).map(film => (
                                        <div key={film.id} className="col-12 col-md-6 col-lg-4 col-xl-3">
                                            <div className="card h-100 overflow-hidden border-0 shadow-sm film-card group transition-all group-hover-scale rounded-4">
                                                <div className="position-relative" style={{ height: 260 }}>
                                                    {film.urlImage ? (
                                                        <img src={film.urlImage} alt={film.titre} className="w-100 h-100 object-fit-cover" />
                                                    ) : (
                                                        <div className="bg-dark text-white d-flex align-items-center justify-content-center w-100 h-100">
                                                            <i className="bi bi-film display-1 opacity-25"></i>
                                                        </div>
                                                    )}
                                                    <div className="position-absolute top-0 end-0 m-3 d-flex flex-column gap-2  transition-all z-2">
                                                        <button className="btn btn-white text-primary btn-sm rounded-circle shadow-sm" onClick={() => { setEditingFilm(film); setNewFilm(film); setShowAddFilm(true); }}>
                                                            <i className="bi bi-pencil-fill"></i>
                                                        </button>
                                                        <button className="btn btn-white text-danger btn-sm rounded-circle shadow-sm" onClick={() => handleDeleteFilm(film.id)}>
                                                            <i className="bi bi-trash-fill"></i>
                                                        </button>
                                                    </div>
                                                    <div className="position-absolute bottom-0 start-0 m-3 z-2">
                                                        <span className="badge bg-dark bg-opacity-75 rounded-pill px-3 py-2 fw-700 border border-secondary border-opacity-25 shadow-sm backdrop-blur">
                                                            {film.genre || 'Film'}
                                                        </span>
                                                    </div>
                                                    <div className="position-absolute top-0 start-0 w-100 h-100 bg-linear-gradient-bottom-dark opacity-50"></div>
                                                </div>

                                                <div className="card-body p-4 position-relative bg-white z-2">
                                                    <h5 className="fw-800 mb-3 text-dark text-truncate" title={film.titre}>{film.titre}</h5>
                                                    <div className="d-flex flex-column gap-3 mb-4">
                                                        <div className="d-flex align-items-center gap-2 fw-700 px-3 py-2 rounded-3 small text-success bg-success bg-opacity-10">
                                                            <i className="bi bi-calendar-check-fill"></i>
                                                            {new Date(film.dateProjection).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                        </div>
                                                        <div className="d-flex justify-content-between text-secondary bg-light p-3 rounded-3 small fw-600">
                                                            <span className="d-flex align-items-center gap-2"><i className="bi bi-clock-history"></i> {film.duree} min</span>
                                                            <span className="d-flex align-items-center gap-2"><i className="bi bi-people-fill"></i> {film.placesDisponibles} pers.</span>
                                                        </div>
                                                    </div>
                                                    <div className="d-flex justify-content-between align-items-end mt-auto pt-3 border-top">
                                                        <span className="text-secondary small fw-700 text-uppercase letter-spacing-1">Tarif unique</span>
                                                        <span className="text-primary fw-900 fs-4">{film.prix} <small className="fs-6">DT</small></span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {films.filter(f => !f.dateProjection || new Date(f.dateProjection) >= new Date()).length === 0 && (
                                        <div className="col-12 py-4 text-center text-muted border border-2 border-dashed rounded-4">
                                            <i className="bi bi-camera-reels fs-1 opacity-25 d-block mb-2"></i>
                                            <p className="fw-700 mb-0">Aucun film à venir au programme.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Films passés */}
                            <div className="mb-4">
                                <h6 className="fw-800 text-uppercase letter-spacing-1 text-secondary mb-4 border-bottom pb-2"><i className="bi bi-clock-history me-2"></i> Séances passées</h6>
                                <div className="row g-4 opacity-75">
                                    {films.filter(f => f.dateProjection && new Date(f.dateProjection) < new Date()).sort((a, b) => new Date(b.dateProjection) - new Date(a.dateProjection)).map(film => (
                                        <div key={film.id} className="col-12 col-md-6 col-lg-4 col-xl-3">
                                            <div className="card h-100 overflow-hidden border-0 shadow-sm film-card group transition-all group-hover-scale rounded-4">
                                                <div className="position-relative" style={{ height: 260 }}>
                                                    {film.urlImage ? (
                                                        <img src={film.urlImage} alt={film.titre} className="w-100 h-100 object-fit-cover grayscale" />
                                                    ) : (
                                                        <div className="bg-dark text-white d-flex align-items-center justify-content-center w-100 h-100">
                                                            <i className="bi bi-film display-1 opacity-25"></i>
                                                        </div>
                                                    )}
                                                    <div className="position-absolute top-0 end-0 m-3 d-flex flex-column gap-2  transition-all z-2">
                                                        <button className="btn btn-white text-danger btn-sm rounded-circle shadow-sm" onClick={() => handleDeleteFilm(film.id)}>
                                                            <i className="bi bi-trash-fill"></i>
                                                        </button>
                                                    </div>
                                                    <div className="position-absolute bottom-0 start-0 m-3 z-2">
                                                        <span className="badge bg-dark bg-opacity-75 rounded-pill px-3 py-2 fw-700 border border-secondary border-opacity-25 shadow-sm backdrop-blur">
                                                            Terminé
                                                        </span>
                                                    </div>
                                                    <div className="position-absolute top-0 start-0 w-100 h-100 bg-linear-gradient-bottom-dark opacity-50"></div>
                                                </div>

                                                <div className="card-body p-4 position-relative bg-white z-2">
                                                    <h5 className="fw-800 mb-3 text-dark text-truncate" title={film.titre}>{film.titre}</h5>
                                                    <div className="d-flex flex-column gap-3 mb-4">
                                                        <div className="d-flex align-items-center gap-2 fw-700 px-3 py-2 rounded-3 small text-danger bg-danger bg-opacity-10">
                                                            <i className="bi bi-calendar-x-fill"></i>
                                                            {new Date(film.dateProjection).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                        </div>
                                                        <div className="d-flex justify-content-between text-secondary bg-light p-3 rounded-3 small fw-600">
                                                            <span className="d-flex align-items-center gap-2"><i className="bi bi-clock-history"></i> {film.duree} min</span>
                                                            <span className="d-flex align-items-center gap-2"><i className="bi bi-people-fill"></i> {film.placesDisponibles} pers.</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {films.filter(f => f.dateProjection && new Date(f.dateProjection) < new Date()).length === 0 && (
                                        <div className="col-12 py-4 text-center text-muted border border-2 border-dashed rounded-4">
                                            <p className="fw-700 mb-0">Aucune séance passée.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'EVENTS' && <EvenementsSection />}
                    {activeSection === 'EVENT_RESERVATIONS' && <EvenementReservationsSection />}
                </div>

                <OfflineReservationModal 
                    show={showOfflineModal} 
                    onClose={() => setShowOfflineModal(false)} 
                    onSuccess={fetchData} 
                    providerType="CINEMA" 
                    providerData={cinema} 
                />
                <OfflineCancelModal
                    reservation={cancelTarget}
                    onClose={() => setCancelTarget(null)}
                    onSuccess={() => { setCancelTarget(null); fetchData(); }}
                />
                <EditReservationModal
                    show={!!editTarget}
                    reservation={editTarget}
                    onClose={() => setEditTarget(null)}
                    onSuccess={() => { setEditTarget(null); fetchData(); }}
                />

                {detailModal && !['FINANCES_CA','FINANCES_COMMISSION','FINANCES_NET','OFFLINE_CA'].includes(detailModal) && getDetailModalContent(detailModal) && (
                    <div className="modal-backdrop fade show" style={{ zIndex: 1050, backdropFilter: 'blur(8px)' }}></div>
                )}
                <div 
                    className={`${detailModal && !['FINANCES_CA','FINANCES_COMMISSION','FINANCES_NET','OFFLINE_CA'].includes(detailModal) ? 'd-flex' : 'd-none'}`} 
                    style={{ 
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        zIndex: 9999,
                        backgroundColor: '#f8f9fa',
                        flexDirection: 'column',
                        overflowX: 'hidden',
                        overflowY: 'auto'
                    }}
                >
                    {/* EN-TÊTE ULTRA PROFESSIONNEL */}
                    <div className="bg-white border-bottom shadow-sm px-5 py-4 d-flex align-items-center justify-content-between" style={{ minHeight: '120px' }}>
                        <div className="d-flex align-items-center gap-4">
                            <div className="p-4 rounded-4 shadow-lg text-white d-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #1a1a1a, #333)' }}>
                                <i className="bi bi-bar-chart-fill fs-1"></i>
                            </div>
                            <div>
                                <h1 className="display-4 fw-900 text-dark m-0 tracking-tight" style={{ letterSpacing: '-1px' }}>{detailModal === 'PROGRAMMING' ? 'Analyse de Programmation' : detailModal === 'FINANCIAL' ? 'Analyse Financière' : ''}</h1>
                                <p className="text-muted fw-600 m-0 fs-5"><i className="bi bi-shield-check text-success me-2"></i> Management System Pro v.2.0 — <span className="text-dark">Rapport d'activité détaillé</span></p>
                            </div>
                        </div>
                        <button type="button" className="btn btn-dark rounded-circle d-flex align-items-center justify-content-center shadow-lg hover-scale" style={{ width: '60px', height: '60px' }} onClick={() => setDetailModal(null)}>
                            <i className="bi bi-x-lg fs-3 text-white"></i>
                        </button>
                    </div>

                    {/* CORPS DU DASHBOARD (PLEINE LARGEUR) */}
                    <div className="flex-grow-1 p-5">
                        <div className="container-fluid">
                            <div className="row justify-content-center">
                                <div className="col-12" style={{ maxWidth: '1600px' }}>
                                    {detailModal ? getDetailModalContent(detailModal) : null}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PIED DE PAGE PREMIUM */}
                    <div className="bg-white border-top p-5 shadow-lg-reverse d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-5">
                            <div className="d-flex flex-column">
                                <span className="text-muted small fw-800 text-uppercase letter-spacing-1 mb-2">Options d'Export</span>
                                <div className="d-flex gap-3">
                                    <button className="btn btn-outline-dark fw-800 px-4 py-2 rounded-3 d-flex align-items-center gap-2">
                                        <i className="bi bi-file-earmark-pdf-fill text-danger"></i> PDF Export
                                    </button>
                                    <button className="btn btn-outline-dark fw-800 px-4 py-2 rounded-3 d-flex align-items-center gap-2">
                                        <i className="bi bi-file-earmark-spreadsheet-fill text-success"></i> Excel Data
                                    </button>
                                </div>
                            </div>
                            <div className="vr opacity-10" style={{ height: '50px' }}></div>
                            <div className="d-flex flex-column">
                                <span className="text-muted small fw-800 text-uppercase letter-spacing-1 mb-1">Status</span>
                                <div className="d-flex align-items-center gap-2">
                                    <span className="p-1 rounded-circle bg-success shadow-sm animate-pulse-green"></span>
                                    <span className="fw-700 text-dark">Données synchronisées en temps réel</span>
                                </div>
                            </div>
                        </div>
                        <button 
                            type="button" 
                            className="btn btn-lg rounded-pill px-5 py-4 fw-900 shadow-lg text-white transition-all hover-scale fs-4 d-flex align-items-center gap-3" 
                            style={{ backgroundColor: '#ff7a00', border: 'none' }} 
                            onClick={() => setDetailModal(null)}
                        >
                            Quitter l'analyse
                            <i className="bi bi-fullscreen-exit"></i>
                        </button>
                    </div>
                </div>

        {/* FINANCE DETAIL MODALS */}
        {['FINANCES_CA','FINANCES_COMMISSION','FINANCES_NET','OFFLINE_CA'].includes(detailModal) && (
            <div
                className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
                style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', zIndex: 1050, padding: '2vh 2vw' }}
                onClick={(e) => { if (e.target === e.currentTarget) setDetailModal(null); }}
            >
                <div
                    className={`${detailModal === 'OFFLINE_CA' ? 'bg-dark' : 'bg-white'} rounded-4 shadow-lg animate-in-y d-flex flex-column w-100`}
                    style={{ maxWidth: '1400px', maxHeight: '96vh', overflowY: 'auto' }}
                >
                    {getDetailModalContent(detailModal)}
                </div>
            </div>
        )}
            </main>
        </div>
    );
};

export default CinemaDashboard;
