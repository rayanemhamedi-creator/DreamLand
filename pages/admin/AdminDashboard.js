import React, { useEffect, useState, useContext, useCallback } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import Sidebar from '../../components/layout/Sidebar';
import useNotifications from '../../hooks/useNotifications';

const NAV_ITEMS = [
    { id: 'DASHBOARD', label: 'Tableau de bord', icon: 'bi-speedometer2' },
    { id: 'USERS', label: 'Gestion Utilisateurs', icon: 'bi-people' },
    { id: 'VALIDATIONS', label: 'Validation Prestataires', icon: 'bi-patch-check' },
    { id: 'NOTIFICATIONS', label: 'Notifications', icon: 'bi-bell' },
    { id: 'RESERVATIONS', label: 'Les réservations', icon: 'bi-calendar-event' },
];

const AdminDashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications(user?.id);
    const [activeSection, setActiveSection] = useState('DASHBOARD');
    const [loading, setLoading] = useState(true);

    const [stats, setStats] = useState({
        totalUsers: 0, totalTouristes: 0, totalPrestataires: 0,
        totalRevenu: 0, totalCommissions: 0,
        totalHotels: 0, totalRestaurants: 0, totalCafes: 0,
        totalCinemas: 0, totalSports: 0, totalGuides: 0
    });
    const [showProviderModal, setShowProviderModal] = useState(false);
    const [users, setUsers] = useState([]);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [filters, setFilters] = useState({ type: 'ALL', status: 'ALL', category: 'ALL' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (activeSection === 'DASHBOARD') {
                const r = await api.get('/admin/statistics');
                setStats(r.data);           // Mise à jour des statistiques

            } else if (activeSection === 'USERS') {
                const r = await api.get('/admin/users');
                setUsers(r.data);
            } else if (activeSection === 'VALIDATIONS') {
                const r = await api.get('/utilisateurs/en-attente');
                setPendingUsers(r.data);
            } else if (activeSection === 'RESERVATIONS') {
                const r = await api.get('/reservations');
                setReservations(r.data);
            }
        } catch (err) {
            console.error('Erreur chargement Dashboard:', err);
        } finally {
            setLoading(false);
        }
    }, [activeSection]);

    useEffect(() => { fetchData(); }, [activeSection, fetchData]);

    const handleBlock = async (id, currentStatus) => {
        if (!window.confirm(`Voulez-vous ${currentStatus ? 'débloquer' : 'bloquer'} cet utilisateur ?`)) return;
        try {
            await api.put(`/admin/users/${id}/block?block=${!currentStatus}`);
            fetchData();
        } catch { alert("Erreur lors de l'opération"); }
    };

    const handleValidate = async (id) => {
        if (!window.confirm('Voulez-vous valider ce prestataire ?')) return;
        try {
            await api.put(`/utilisateurs/${id}/valider`);
            alert(' Prestataire validé avec succès !');
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Erreur validation');
        }
    };

    const handleReject = async (id) => {
        if (!window.confirm('Voulez-vous rejeter ce prestataire ?')) return;
        try {
            await api.put(`/utilisateurs/${id}/rejeter`);
            alert('Prestataire rejeté avec succès !');
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Erreur rejet');
        }
    };

    const PROVIDER_BREAKDOWN = [
        { label: 'Hôtels',       val: stats.totalHotels,      icon: 'bi-building',         color: '#3b82f6' },
        { label: 'Restaurants',  val: stats.totalRestaurants, icon: 'bi-egg-fried',         color: '#10b981' },
        { label: 'Cafés',        val: stats.totalCafes,       icon: 'bi-cup-hot',           color: '#8b5cf6' },
        { label: 'Cinémas',      val: stats.totalCinemas,     icon: 'bi-camera-reels',      color: '#ec4899' },
        { label: 'Sport',        val: stats.totalSports,      icon: 'bi-bicycle',           color: '#f59e0b' },
        { label: 'Guides',       val: stats.totalGuides,      icon: 'bi-compass',           color: '#06b6d4' },
    ];

    const sectionTitle = {
        DASHBOARD: 'Tableau de bord',
        USERS: 'Gestion des Utilisateurs',
        VALIDATIONS: 'Validation Prestataires',
        NOTIFICATIONS: 'Centre de Notifications',
        RESERVATIONS: 'Gestion des Réservations',
    };

    return (
        <div className="dashboard-wrapper">
            <Sidebar
                title="Admin Panel"
                subtitle="Contrôle Global"
                iconClass="bi-shield-fill"
                navItems={NAV_ITEMS.map(item => item.id === 'NOTIFICATIONS' ? { ...item, badge: unreadCount } : item)}
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                onLogout={logout}
            />

            <main className="dashboard-main">
                {/* Page header */}
                <div className="page-header d-flex justify-content-between align-items-center">
                    <div>
                        <h1>{sectionTitle[activeSection]}</h1>
                        <p>Espace d'administration centralisé de DreamLand.</p>
                    </div>
                </div>

                {loading ? (
                    <div className="d-flex justify-content-center py-5">
                        <div className="loading-spinner" />
                    </div>
                ) : (
                    <>
                        {/* ── DASHBOARD ── */}
                        {activeSection === 'DASHBOARD' && (
                            <div className="animate-in-y">
                                {/* Row 1: 5 stat cards */}
                                <div className="row g-4 mb-2">
                                    {/* Total Users */}
                                    <div className="col-12 col-sm-6 col-xl">
                                        <div className="stat-card h-100" style={{ borderLeft: '4px solid #f59e0b' }}>
                                            <div className="stat-icon" style={{ background: '#fef3c7' }}>
                                                <i className="bi bi-people-fill" style={{ color: '#f59e0b', fontSize: 20 }} />
                                            </div>
                                            <div className="stat-label">Utilisateurs Totaux</div>
                                            <div className="stat-value">{stats.totalUsers ?? '—'}</div>
                                        </div>
                                    </div>

                                    {/* Prestataires – clickable */}
                                    <div className="col-12 col-sm-6 col-xl">
                                        <div
                                            className="stat-card h-100 position-relative"
                                            style={{ borderLeft: '4px solid #f97316', cursor: 'pointer', transition: 'transform .15s' }}
                                            onClick={() => setShowProviderModal(v => !v)}
                                            title="Cliquez pour voir le détail par type"
                                        >
                                            <div className="stat-icon" style={{ background: '#fff7ed' }}>
                                                <i className="bi bi-shop" style={{ color: '#f97316', fontSize: 20 }} />
                                            </div>
                                            <div className="stat-label">Prestataires</div>
                                            <div className="stat-value">{stats.totalPrestataires ?? '—'}</div>
                                            <span
                                                className="position-absolute top-0 end-0 m-2 badge rounded-pill"
                                                style={{ fontSize: 9, background: '#f97316', color: '#fff', padding: '3px 7px' }}
                                            >
                                                {showProviderModal ? '▲ Fermer' : '▼ Détail'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Visiteurs / Touristes */}
                                    <div className="col-12 col-sm-6 col-xl">
                                        <div className="stat-card h-100" style={{ borderLeft: '4px solid #10b981' }}>
                                            <div className="stat-icon" style={{ background: '#d1fae5' }}>
                                                <i className="bi bi-person-walking" style={{ color: '#10b981', fontSize: 20 }} />
                                            </div>
                                            <div className="stat-label">Visiteurs</div>
                                            <div className="stat-value">{stats.totalTouristes ?? '—'}</div>
                                        </div>
                                    </div>

                                    {/* Revenue */}
                                    <div className="col-12 col-sm-6 col-xl">
                                        <div className="stat-card h-100" style={{ borderLeft: '4px solid #ea580c' }}>
                                            <div className="stat-icon" style={{ background: '#ffedd5' }}>
                                                <i className="bi bi-cash-stack" style={{ color: '#ea580c', fontSize: 20 }} />
                                            </div>
                                            <div className="stat-label">Revenu Total (DT)</div>
                                            <div className="stat-value">{stats.totalRevenu?.toFixed(2) ?? '—'}</div>
                                        </div>
                                    </div>

                                    {/* Commission */}
                                    <div className="col-12 col-sm-6 col-xl">
                                        <div className="stat-card h-100" style={{ borderLeft: '4px solid #c2410c' }}>
                                            <div className="stat-icon" style={{ background: '#fff7ed' }}>
                                                <i className="bi bi-percent" style={{ color: '#c2410c', fontSize: 20 }} />
                                            </div>
                                            <div className="stat-label">Commissions (10%)</div>
                                            <div className="stat-value">{stats.totalCommissions?.toFixed(2) ?? '—'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Provider breakdown panel */}
                                {showProviderModal && (
                                    <div
                                        className="animate-in-y rounded-4 p-4 mb-2"
                                        style={{
                                            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                                            border: '1px solid rgba(249,115,22,0.25)',
                                            boxShadow: '0 8px 32px rgba(0,0,0,0.35)'
                                        }}
                                    >
                                        <div className="d-flex align-items-center mb-3 gap-2">
                                            <i className="bi bi-shop fs-5" style={{ color: '#f97316' }} />
                                            <span className="fw-800 text-white" style={{ letterSpacing: '.05em' }}>Répartition des Prestataires</span>
                                            <span className="ms-auto badge rounded-pill px-3 py-1 fw-700" style={{ background: 'rgba(249,115,22,.15)', color: '#f97316', fontSize: 11 }}>
                                                {stats.totalPrestataires} au total
                                            </span>
                                        </div>
                                        <div className="row g-3">
                                            {PROVIDER_BREAKDOWN.map(p => (
                                                <div key={p.label} className="col-6 col-sm-4 col-md-2">
                                                    <div
                                                        className="rounded-4 p-3 text-center h-100 d-flex flex-column align-items-center justify-content-center"
                                                        style={{
                                                            background: `${p.color}18`,
                                                            border: `1px solid ${p.color}40`,
                                                            transition: 'transform .15s'
                                                        }}
                                                    >
                                                        <div
                                                            className="rounded-circle d-flex align-items-center justify-content-center mb-2"
                                                            style={{ width: 44, height: 44, background: `${p.color}22` }}
                                                        >
                                                            <i className={`bi ${p.icon} fs-5`} style={{ color: p.color }} />
                                                        </div>
                                                        <div className="fw-900 text-white" style={{ fontSize: '1.6rem', lineHeight: 1 }}>{p.val ?? 0}</div>
                                                        <div className="small fw-700 mt-1" style={{ color: p.color, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>{p.label}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── USERS ── */}
                        {activeSection === 'USERS' && (
                            <div className="card">
                                <div className="card-body p-0">
                                    <div className="table-responsive">
                                        <table className="table table-hover mb-0">
                                            <thead>
                                                <tr>
                                                    <th>Nom / Prénom</th>
                                                    <th>Email</th>
                                                    <th>Rôle</th>
                                                    <th>Statut</th>
                                                    <th className="text-end">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {users.map(u => (
                                                    <tr key={u.id}>
                                                        <td className="fw-600">{u.nom} {u.prenom}</td>
                                                        <td className="text-muted">{u.email}</td>
                                                        <td>
                                                            <span className="badge bg-light text-secondary fw-700 px-3 py-1" style={{ borderRadius: 100, fontSize: 11 }}>
                                                                {u.role?.replace('ROLE_', '')}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {u.estBloque
                                                                ? <span className="badge-status badge-cancelled">Bloqué</span>
                                                                : <span className="badge-status badge-confirmed">Actif</span>
                                                            }
                                                        </td>
                                                        <td className="text-end">
                                                            {u.role !== 'ROLE_ADMIN' && u.role !== 'ADMIN' && (
                                                                <button
                                                                    onClick={() => handleBlock(u.id, u.estBloque)}
                                                                    className={`btn btn-sm fw-600 ${u.estBloque ? 'btn-success' : 'btn-danger'}`}
                                                                    style={{ borderRadius: 8 }}
                                                                >
                                                                    <i className={`bi ${u.estBloque ? 'bi-unlock' : 'bi-lock'} me-1`} />
                                                                    {u.estBloque ? 'Débloquer' : 'Bloquer'}
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {users.length === 0 && (
                                            <div className="text-center py-5 text-muted">
                                                <i className="bi bi-people" style={{ fontSize: 40 }} />
                                                <p className="mt-2">Aucun utilisateur trouvé.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── VALIDATIONS ── */}
                        {activeSection === 'VALIDATIONS' && (
                            <div className="card">
                                <div className="card-body p-0">
                                    <div className="table-responsive">
                                        <table className="table table-hover mb-0">
                                            <thead>
                                                <tr>
                                                    <th>Nom / Prénom</th>
                                                    <th>Email</th>
                                                    <th>Téléphone</th>
                                                    <th>Rôle demandé</th>
                                                    <th className="text-end">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pendingUsers.map(u => (
                                                    <tr key={u.id}>
                                                        <td className="fw-600">{u.nom} {u.prenom}</td>
                                                        <td className="text-muted">{u.email}</td>
                                                        <td>{u.telephone}</td>
                                                        <td>
                                                            <span className="badge-status" style={{ background: '#fdf2f8', color: '#be185d' }}>
                                                                {u.role?.replace('ROLE_', '')}
                                                            </span>
                                                        </td>
                                                        <td className="text-end">
                                                            <button
                                                                onClick={() => handleValidate(u.id)}
                                                                className="btn btn-success btn-sm fw-600"
                                                                style={{ borderRadius: 8 }}
                                                            >
                                                                <i className="bi bi-check2-circle me-1" />Accepter
                                                            </button>
                                                            <button
                                                                onClick={() => handleReject(u.id)}
                                                                className="btn btn-danger btn-sm fw-600 ms-2"
                                                                style={{ borderRadius: 8 }}
                                                            >
                                                                <i className="bi bi-x-circle me-1" />Rejeter
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {pendingUsers.length === 0 && (
                                            <div className="text-center py-5 text-muted">
                                                <i className="bi bi-patch-check" style={{ fontSize: 40, color: '#10b981' }} />
                                                <p className="mt-2">Aucune validation en attente. </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── RESERVATIONS ── */}
                        {activeSection === 'RESERVATIONS' && (
                            <div className="animate-in-y">
                                {/* Filters */}
                                <div className="card border-0 shadow-sm rounded-4 mb-4">
                                    <div className="card-body p-3 d-flex flex-wrap align-items-center gap-3">
                                        <div className="d-flex align-items-center gap-2">
                                            <label className="small fw-700 text-muted text-uppercase mb-0">Type:</label>
                                            <select 
                                                className="form-select form-select-sm rounded-pill border-light"
                                                value={filters.type}
                                                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                                                style={{ minWidth: '150px' }}
                                            >
                                                <option value="ALL">Tous les types</option>
                                                <option value="EN_LIGNE">En ligne</option>
                                                <option value="SUR_PLACE">Sur place</option>
                                            </select>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            <label className="small fw-700 text-muted text-uppercase mb-0">Statut:</label>
                                            <select 
                                                className="form-select form-select-sm rounded-pill border-light"
                                                value={filters.status}
                                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                                style={{ minWidth: '150px' }}
                                            >
                                                <option value="ALL">Tous les statuts</option>
                                                <option value="CONFIRMEE">Confirmé</option>
                                                <option value="NON_PAYE">Non payé</option>
                                                <option value="ANNULEE">Annulé</option>
                                                <option value="PASSEE">Déjà passé</option>
                                            </select>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            <label className="small fw-700 text-muted text-uppercase mb-0">Catégorie:</label>
                                            <select 
                                                className="form-select form-select-sm rounded-pill border-light"
                                                value={filters.category}
                                                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                                                style={{ minWidth: '150px' }}
                                            >
                                                <option value="ALL">Toutes</option>
                                                <option value="HOTEL">Hôtel</option>
                                                <option value="RESTAURANT">Restaurant</option>
                                                <option value="CAFE">Café</option>
                                                <option value="CINEMA">Cinéma</option>
                                                <option value="GUIDE">Guide</option>
                                                <option value="SPORT">Sport</option>
                                                <option value="EVENEMENT">Événement</option>
                                            </select>
                                        </div>
                                        <div className="ms-auto text-muted small fw-600">
                                            <span className="badge bg-primary rounded-pill me-2">{reservations.length}</span> Réservations au total
                                        </div>
                                    </div>
                                </div>

                                <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                                    <div className="card-body p-0">
                                        <div className="table-responsive">
                                            <table className="table table-hover align-middle mb-0">
                                                <thead className="bg-light">
                                                    <tr>
                                                        <th className="px-4 py-3 border-0 small fw-700 text-muted text-uppercase">Client</th>
                                                        <th className="py-3 border-0 small fw-700 text-muted text-uppercase">Créée le</th>
                                                        <th className="py-3 border-0 small fw-700 text-muted text-uppercase">Établissement</th>
                                                        <th className="py-3 border-0 small fw-700 text-muted text-uppercase">Période / Date</th>
                                                        <th className="py-3 border-0 small fw-700 text-muted text-uppercase">Prix</th>
                                                        <th className="py-3 border-0 small fw-700 text-muted text-uppercase text-primary">Commission</th>
                                                        <th className="py-3 border-0 small fw-700 text-muted text-uppercase">Statut</th>
                                                        <th className="py-3 border-0 small fw-700 text-muted text-uppercase">Paiement</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {reservations
                                                        .filter(res => filters.type === 'ALL' || res.typeReservation === filters.type)
                                                        .filter(res => {
                                                            if (filters.category === 'ALL') return true;
                                                            if (filters.category === 'HOTEL') return !!res.chambre;
                                                            if (filters.category === 'RESTAURANT') return !!res.tableResto && res.tableResto.restaurant?.role === 'RESTAURANT';
                                                            if (filters.category === 'CAFE') return !!res.tableResto && res.tableResto.restaurant?.role === 'CAFE';
                                                            if (filters.category === 'CINEMA') return !!res.film;
                                                            if (filters.category === 'GUIDE') return !!res.sortie;
                                                            if (filters.category === 'SPORT') return !!res.sport;
                                                            if (filters.category === 'EVENEMENT') return !!res.evenement;
                                                            return true;
                                                        })
                                                        .filter(res => {
                                                            if (filters.status === 'ALL') return true;
                                                            if (filters.status === 'NON_PAYE') return res.statutPaiement === 'EN_ATTENTE' || res.statutPaiement === 'ECHOUE';
                                                            if (filters.status === 'PASSEE') {
                                                                const dateRes = new Date(res.dateDebut);
                                                                const now = new Date();
                                                                return res.statut === 'PASSEE' || dateRes < now;
                                                            }
                                                            return res.statut === filters.status;
                                                        })
                                                        .sort((a, b) => new Date(b.dateCreation) - new Date(a.dateCreation))
                                                        .map(res => (
                                                        <tr key={res.id}>
                                                            <td className="px-4 py-3">
                                                                <div className="fw-700 mb-0">{res.clientNom} {res.clientPrenom}</div>
                                                                <div className="text-muted smaller"><i className="bi bi-envelope me-1"></i>{res.clientEmail}</div>
                                                            </td>
                                                            <td className="smaller text-muted">
                                                                {new Date(res.dateCreation).toLocaleDateString('fr-FR')}<br/>
                                                                {new Date(res.dateCreation).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                            </td>
                                                            <td>
                                                                <div className="fw-700 text-dark smaller">
                                                                    {res.chambre?.hotel?.nom || res.tableResto?.restaurant?.nom || res.film?.cinema?.nom || res.sortie?.guide?.nom || res.sport?.nomActivite || res.evenement?.titre || '—'}
                                                                </div>
                                                                <div className="text-muted smaller" style={{ fontSize: '10px' }}>
                                                                    {res.chambre ? '🏨 Hôtel' : res.tableResto?.restaurant?.role === 'CAFE' ? '☕ Café' : res.tableResto ? '🍽️ Restaurant' : res.sport ? '🚴 Sport' : res.film ? '🎬 Cinéma' : res.sortie ? '🗺️ Guide' : res.evenement ? '📅 Événement' : '—'}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div className="fw-600 smaller">
                                                                    {new Date(res.dateDebut).toLocaleDateString('fr-FR')}
                                                                    {res.dateFin && ` au ${new Date(res.dateFin).toLocaleDateString('fr-FR')}`}
                                                                </div>
                                                                <div className="text-muted smaller" style={{ fontSize: '10px' }}>
                                                                    {new Date(res.dateDebut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                            </td>
                                                            <td className="fw-700">{res.prixTotal?.toFixed(2)} DT</td>
                                                            <td className="fw-800 text-primary">{res.commissionAdmin?.toFixed(2)} DT</td>
                                                            <td>
                                                                <span className={`badge rounded-pill px-3 py-1 fw-700 ${
                                                                    res.statut === 'CONFIRMEE' ? 'bg-success-subtle text-success' :
                                                                    res.statut === 'ANNULEE' ? 'bg-danger-subtle text-danger' :
                                                                    res.statut === 'PASSEE' ? 'bg-info-subtle text-info' : 'bg-warning-subtle text-warning'
                                                                }`} style={{ fontSize: '10px' }}>
                                                                    {res.statut}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span className={`badge rounded-pill px-3 py-1 fw-700 ${
                                                                    res.statutPaiement === 'PAYE' ? 'bg-success text-white' :
                                                                    res.statutPaiement === 'ECHOUE' ? 'bg-danger text-white' : 'bg-warning text-dark'
                                                                }`} style={{ fontSize: '10px' }}>
                                                                    {res.statutPaiement === 'PAYE' ? 'PAYÉ' : res.statutPaiement === 'EN_ATTENTE' ? 'EN ATTENTE' : res.statutPaiement}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {reservations.length === 0 && (
                                                <div className="text-center py-5 text-muted">
                                                    <i className="bi bi-calendar-x" style={{ fontSize: 40 }} />
                                                    <p className="mt-2">Aucune réservation trouvée.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeSection === 'NOTIFICATIONS' && (
                            <div className="card shadow-sm border-0" style={{ borderRadius: 16 }}>
                                <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
                                    <h5 className="mb-0 fw-800">Toutes les notifications</h5>
                                    {unreadCount > 0 && (
                                        <button onClick={markAllAsRead} className="btn btn-outline-primary btn-sm rounded-pill fw-600">
                                            Tout marquer comme lu
                                        </button>
                                    )}
                                </div>
                                <div className="card-body p-0">
                                    <div className="notif-list-admin">
                                        {notifications.length > 0 ? (
                                            notifications.map(n => (
                                                <div 
                                                    key={n.id} 
                                                    className={`p-3 border-bottom d-flex align-items-start gap-3 transition-all ${!n.estLu ? 'bg-light' : ''}`}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => !n.estLu && markAsRead(n.id)}
                                                >
                                                    <div className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${!n.estLu ? 'bg-primary text-white' : 'bg-light text-muted'}`} style={{ width: 40, height: 40 }}>
                                                        <i className={`bi ${n.message.includes('📩') ? 'bi-envelope-fill' : n.message.includes('❌') ? 'bi-x-circle' : n.message.includes('🏨') ? 'bi-building' : 'bi-bell'}`}></i>
                                                    </div>
                                                    <div className="flex-grow-1">
                                                        <div className="d-flex justify-content-between align-items-start">
                                                            <p className={`mb-1 ${!n.estLu ? 'fw-700 text-dark' : 'text-muted'}`} style={{ whiteSpace: 'pre-line' }}>{n.message}</p>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                                                                className="btn btn-link text-muted p-0 border-0"
                                                            >
                                                                <i className="bi bi-trash"></i>
                                                            </button>
                                                        </div>
                                                        <span className="smaller text-muted">{new Date(n.dateCreation).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-5 text-muted">
                                                <i className="bi bi-bell-slash" style={{ fontSize: 40 }}></i>
                                                <p className="mt-2">Aucune notification.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default AdminDashboard;
