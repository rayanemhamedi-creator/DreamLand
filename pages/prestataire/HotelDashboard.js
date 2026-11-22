import React, { useEffect, useState, useContext } from 'react';
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
    { id: 'PROFILE', label: 'Profil de l’hôtel', icon: 'bi-building' },
    { id: 'RESERVATIONS', label: 'Liste des réservations', icon: 'bi-calendar3' },
    { id: 'ROOMS', label: 'Gestion des chambres', icon: 'bi-door-open' },
    { id: 'FORMULES', label: 'Formules de Logement', icon: 'bi-cup-hot' },
    { id: 'EVENTS', label: 'Mes Événements', icon: 'bi-stars' },
    { id: 'EVENT_RESERVATIONS', label: 'Réservations Événements', icon: 'bi-ticket-perforated' },
];

const ROOM_TYPE_LABELS = {
    'SINGLE': 'Chambre Single (Individuelle)',
    'DOUBLE': 'Chambre Double',
    'TWIN': 'Chambre Twin',
    'TRIPLE': 'Chambre Triple',
    'QUADRUPLE': 'Chambre Quadruple',
    'FAMILIALE': 'Chambre Familiale',
    'SUITE': 'Suite'
};

const HotelDashboard = () => {
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
    const [stats, setStats] = useState({ totalRooms: 0, reservedRooms: 0, totalRevenue: 0, adminCommission: 0 });
    const [hotel, setHotel] = useState(null);
    const [reservations, setReservations] = useState([]);
    const [rooms, setRooms] = useState([]);

    const dynamicReservedCount = reservations.filter(res => 
        (res.statut === 'CONFIRMEE' || res.statut === 'EN_COURS') && 
        new Date(res.dateDebut) <= currentTime && 
        new Date(res.dateFin) > currentTime
    ).length;

    // Form states
    const [showAddRoom, setShowAddRoom] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [newRoom, setNewRoom] = useState({ 
        numero: '', type: 'SINGLE', prix: 50, capacite: 1, nombreTotal: 1, urlImage: '', description: '', 
        aWifi: true, aClimatisation: true, aSmartTv: false, aCoffreFort: false, aBureau: false, aBalcon: false, aVueSurMer: false,
        prixParAdulte: 50, prixParEnfant3_10: 25, prixParEnfant11_17: 35,
        prixLibre: 0,
        nbLitsSimples: 1, nbLitsDoubles: 0 // SINGLE par défaut
    });
    const [profileForm, setProfileForm] = useState({
        id: null,
        nom: '',
        adresse: '',
        description: '',
        localisation: '',
        telephone: '',
        urlImage: '',
        utilisateur: { nom: '', email: '', telephone: '' }
    });
    const [uploading, setUploading] = useState(false);
    const [showOfflineModal, setShowOfflineModal] = useState(false);
    const [resTab, setResTab] = useState('EN_LIGNE');
    const [cancelTarget, setCancelTarget] = useState(null);
    const [editTarget, setEditTarget] = useState(null);
    const [detailModal, setDetailModal] = useState(null);
    const [reservFilter, setReservFilter] = useState('ALL');
    const [finFilter, setFinFilter] = useState('ALL'); // ALL, HOTEL, EVENT
    const [eventReservations, setEventReservations] = useState([]);

    // ── Indisponibilité des chambres ──
    const [indispoModal, setIndispoModal] = useState(null); // room object | null
    const [indispoDebut, setIndispoDebut] = useState('');
    const [indispoFin, setIndispoFin] = useState('');
    const [indispoLoading, setIndispoLoading] = useState(false);
    const [indispoError, setIndispoError] = useState(null);
    const [indispoSuccess, setIndispoSuccess] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    // ── Handlers Indisponibilité ──
    const openIndispoModal = (room) => {
        setIndispoModal(room);
        // Pré-remplir si une indisponibilité existe déjà
        setIndispoDebut(room.dateDebutIndisponibilite ? room.dateDebutIndisponibilite.split('T')[0] : '');
        setIndispoFin(room.dateFinIndisponibilite ? room.dateFinIndisponibilite.split('T')[0] : '');
        setIndispoError(null);
        setIndispoSuccess(null);
    };

    const handleSetIndispo = async () => {
        if (!indispoDebut || !indispoFin) {
            setIndispoError('Veuillez sélectionner les deux dates.');
            return;
        }
        if (indispoDebut >= indispoFin) {
            setIndispoError('La date de début doit être avant la date de fin.');
            return;
        }
        setIndispoLoading(true);
        setIndispoError(null);
        setIndispoSuccess(null);
        try {
            await api.post(`/chambres/${indispoModal.id}/indisponibilite`, {
                dateDebut: `${indispoDebut}T00:00:00`,
                dateFin: `${indispoFin}T23:59:59`
            });
            setIndispoSuccess('Période d\'indisponibilité enregistrée avec succès.');
            await fetchData();
            // Mettre à jour la room dans le modal
            setIndispoModal(prev => prev ? { ...prev, dateDebutIndisponibilite: `${indispoDebut}T00:00:00`, dateFinIndisponibilite: `${indispoFin}T23:59:59` } : null);
            
            // Fermer automatiquement la modale après 1.5 secondes
            setTimeout(() => {
                setIndispoModal(null);
            }, 1500);
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data || err.message || 'Erreur lors de l\'enregistrement.';
            setIndispoError(typeof msg === 'string' ? msg : 'Erreur lors de l\'enregistrement.');
        } finally {
            setIndispoLoading(false);
        }
    };

    const handleRemoveIndispo = async () => {
        setIndispoLoading(true);
        setIndispoError(null);
        setIndispoSuccess(null);
        try {
            await api.delete(`/chambres/${indispoModal.id}/indisponibilite`);
            setIndispoSuccess('Chambre rendue disponible.');
            setIndispoDebut('');
            setIndispoFin('');
            await fetchData();
            setIndispoModal(prev => prev ? { ...prev, dateDebutIndisponibilite: null, dateFinIndisponibilite: null } : null);
            
            // Fermer automatiquement la modale après 1.5 secondes
            setTimeout(() => {
                setIndispoModal(null);
            }, 1500);
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Erreur lors de la suppression.';
            setIndispoError(typeof msg === 'string' ? msg : 'Erreur lors de la suppression.');
        } finally {
            setIndispoLoading(false);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, hotelRes, resRes, eventRes, roomsRes] = await Promise.all([
                api.get('/hotels/stats').catch(() => ({ data: null })),
                api.get('/hotels/me').catch(() => ({ data: null })),
                api.get('/reservations/mon-hotel').catch(() => ({ data: [] })),
                api.get('/reservations/mes-evenements').catch(() => ({ data: [] })),
                api.get('/chambres').catch(() => ({ data: [] }))
            ]);

            if (statsRes.data) setStats(statsRes.data);
            if (hotelRes.data) { 
                setHotel(hotelRes.data); 
                
                // Normalisation des clés booleennes (ex: awifiGenerale -> aWifiGenerale)
                const data = { ...hotelRes.data };
                const booleanKeys = [
                    'aReception24h', 'aSecurite24h', 'aWifiGenerale', 'aParking', 
                    'aAscenseur', 'aPiscine', 'aServiceReception'
                ];
                
                booleanKeys.forEach(key => {
                    const lowerKey = key.toLowerCase();
                    // Si la version camelCase est manquante mais la version minuscule existe
                    if (data[key] === undefined && data[lowerKey] !== undefined) {
                        data[key] = data[lowerKey];
                    }
                    // Forcer en boolean
                    data[key] = !!data[key];
                });

                setProfileForm({
                    ...data,
                    description: data.description || '',
                    adresse: data.adresse || '',
                    localisation: data.localisation || '',
                    utilisateur: data.utilisateur || { nom: '', email: '', telephone: '' }
                }); 
            }
            if (resRes.data) setReservations(resRes.data);
            if (eventRes.data) setEventReservations(eventRes.data);
            if (roomsRes.data) {
                const normalizedRooms = roomsRes.data.map(room => {
                    const r = { ...room };
                    const keys = ['aWifi', 'aClimatisation', 'aSmartTv', 'aCoffreFort', 'aBureau', 'aBalcon', 'aVueSurMer'];
                    keys.forEach(k => {
                        const lowerK = k.toLowerCase();
                        if (r[k] === undefined && r[lowerK] !== undefined) r[k] = r[lowerK];
                        r[k] = !!r[k];
                    });

                    // Normalisation des lits
                    r.nbLitsSimples = r.nbLitsSimples || 0;
                    r.nbLitsDoubles = r.nbLitsDoubles || 0;
                    
                    return r;
                });
                setRooms(normalizedRooms);
            }
        } catch (err) {
            console.error("Erreur critique Dashboard:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        
        // Si c'est un champ utilisateur (nom, email, telephone)
        if (['nom', 'email', 'telephone'].includes(name)) {
            setProfileForm(prev => ({
                ...prev,
                [name]: value, // On garde à la racine pour l'intercepteur
                utilisateur: {
                    ...prev.utilisateur,
                    [name]: value // On met aussi dans utilisateur pour la structure attendue
                }
            }));
        } else {
            // Champ racine classique (description, adresse, prix)
            setProfileForm(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleUpdateProfile = async (e) => {
        if (e) e.preventDefault();
        try {
            // Nettoyage final du payload avant envoi
            const payload = {
                ...profileForm,
                description: profileForm.description || "",
                adresse: profileForm.adresse || "",
                localisation: profileForm.localisation || "",
                utilisateur: {
                    ...profileForm.utilisateur,
                    nom: profileForm.utilisateur?.nom || profileForm.nom || "",
                    telephone: profileForm.utilisateur?.telephone || profileForm.telephone || ""
                }
            };
            
            // Nettoyage des doublons minuscules (ex: awifiGenerale)
            ['aReception24h', 'aSecurite24h', 'aWifiGenerale', 'aParking', 'aAscenseur', 'aPiscine', 'aServiceReception'].forEach(k => delete payload[k.toLowerCase()]);

            console.log("🚀 PAYLOAD PROFIL COMPLET:", JSON.stringify(payload, null, 2));
            const response = await api.put(`/hotels/${hotel.id}`, payload);
            
            console.log("✅ REPONSE API PROFIL:", response.data);
            setProfileForm({
                ...response.data,
                description: response.data.description || '',
                utilisateur: response.data.utilisateur || payload.utilisateur
            });
            
            alert("✅ Profil mis à jour avec succès !");
            fetchData(); // Recharger tout pour être sûr
        } catch (err) {
            console.error("Erreur mise à jour profil:", err);
            alert("❌ Erreur lors de la mise à jour : " + (err.response?.data?.message || err.message));
        }
    };
// CRÉATION / MODIFICATION CHAMBRES

    const handleRoomAction = async (e) => {
        e.preventDefault();
        try {
            const fallbackNum = `CH-${Date.now().toString().slice(-8)}`;
            const roomData = {
                type: newRoom.type,
                prix: parseFloat(newRoom.prix),
                capacite: parseInt(newRoom.capacite),
                nombreTotal: parseInt(newRoom.nombreTotal),
                numero: newRoom.numero || fallbackNum,
                description: newRoom.description || '',
                urlImage: newRoom.urlImage,
                aWifi: !!newRoom.aWifi,
                aClimatisation: !!newRoom.aClimatisation,
                aSmartTv: !!newRoom.aSmartTv,
                aCoffreFort: !!newRoom.aCoffreFort,
                aBureau: !!newRoom.aBureau,
                aBalcon: !!newRoom.aBalcon,
                prixParAdulte: parseFloat(newRoom.prixParAdulte) || 0,
                prixParEnfant3_10: (parseFloat(newRoom.prixParAdulte) || 0) * 0.5,
                prixParEnfant11_17: (parseFloat(newRoom.prixParAdulte) || 0) * 0.7,
                prixLibre: parseFloat(newRoom.prixLibre) || 0,
                nbLitsSimples: parseInt(newRoom.nbLitsSimples) || 0,
                nbLitsDoubles: parseInt(newRoom.nbLitsDoubles) || 0
            };

            console.log("🚀 PAYLOAD CHAMBRE:", JSON.stringify(roomData, null, 2));
            if (editingRoom) {
                const roomUpdate = { ...roomData, id: editingRoom.id, nombreTotal: 1 };
                await api.put(`/chambres/${editingRoom.id}`, roomUpdate);
                alert("✅ Chambre modifiée avec succès");
            } else {
                const count = parseInt(newRoom.nombreTotal) || 1;
                const promises = [];
                
                for (let i = 0; i < count; i++) {
                    const finalNumero = count > 1 ? `${newRoom.numero || 'CH'}-${i + 1}` : (newRoom.numero || fallbackNum);
                    const singleRoomData = { 
                        ...roomData, 
                        numero: finalNumero,
                        nombreTotal: 1 
                    };
                    promises.push(api.post('/chambres', singleRoomData));
                }
                
                await Promise.all(promises);
                alert(`✅ ${count} chambre(s) ajoutée(s) avec succès`);
            }
            setShowAddRoom(false);
            setEditingRoom(null);
            fetchData();
        } catch (err) {
            const serverError = err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response?.data : JSON.stringify(err.response?.data)) || err.message;
            alert(`❌ Erreur d'enregistrement : ${serverError}`);
        }
    };

    const handleDeleteRoom = async (id) => {
        if (window.confirm("🗑️ Voulez-vous supprimer cette catégorie ?")) {
            try {
                await api.delete(`/chambres/${id}`);
                alert("✅ Catégorie supprimée");
                fetchData();
            } catch (err) {
                alert("❌ Impossible de supprimer : Cette catégorie est probablement utilisée dans une réservation.");
            }
        }
    };

    const handleFileChange = async (e, type, isRoom = false) => {
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

            if (isRoom) {
                setNewRoom(prev => {
                    const current = prev.urlImage ? prev.urlImage.split(',').filter(Boolean) : [];
                    return { ...prev, urlImage: [...current, ...newUrls].join(',') };
                });
            } else if (type === 'main') {
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

    const removeImage = (index, type, isRoom = false) => {
        if (isRoom) {
            setNewRoom(prev => {
                const current = prev.urlImage ? prev.urlImage.split(',').filter(Boolean) : [];
                const updated = [...current];
                updated.splice(index, 1);
                return { ...prev, urlImage: updated.join(',') };
            });
        } else if (type === 'main') {
            setProfileForm(prev => {
                const current = prev.urlImage ? prev.urlImage.split(',').filter(Boolean) : [];
                const updated = [...current];
                updated.splice(index, 1);
                return { ...prev, urlImage: updated.join(',') };
            });
        }
    };

    const getDetailModalContent = () => {
        if (!detailModal) return null;
        
        const closeBtn = (
            <button className="btn-close btn-close-white ms-auto shadow-none" onClick={() => setDetailModal(null)}></button>
        );

        if (detailModal === 'INVENTAIRE') {
            return (
                <>
                    <div className="modal-header border-0 pb-4 px-4 py-4" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                        <i className="bi bi-door-open-fill text-warning me-3 fs-3"></i>
                        <div>
                            <h5 className="modal-title fw-800 mb-0">Détail de l'Inventaire</h5>
                            <small className="opacity-75">Statut actuel de vos {stats.totalRooms} chambres</small>
                        </div>
                        {closeBtn}
                    </div>
                    <div className="modal-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="ps-4 border-0 small fw-800 text-secondary py-3 text-uppercase letter-spacing-1">Catégorie</th>
                                        <th className="border-0 small fw-800 text-secondary py-3 text-uppercase letter-spacing-1">Prix Base</th>
                                        <th className="border-0 small fw-800 text-secondary py-3 text-uppercase letter-spacing-1">Capacité</th>
                                        <th className="pe-4 border-0 small fw-800 text-secondary text-end py-3 text-uppercase letter-spacing-1">Unités Dispo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rooms.length === 0 ? (
                                        <tr><td colSpan="4" className="text-center py-5 text-muted fw-600"><i className="bi bi-info-circle fs-3 d-block mb-2"></i>Aucune chambre trouvée dans l'inventaire.</td></tr>
                                    ) : rooms.map(r => (
                                        <tr key={r.id} className="bg-white hover-scale transition-all">
                                            <td className="ps-4 py-4 fw-800 text-dark">{ROOM_TYPE_LABELS[r.type] || r.type}</td>
                                            <td className="py-4 fw-900 text-primary">
                                                {(['QUADRUPLE','FAMILIALE','SUITE'].includes(r.type) && r.prixLibre) ? r.prixLibre : r.prix} DT
                                            </td>
                                            <td className="py-4 text-muted fw-600"><i className="bi bi-people-fill me-2 opacity-50"></i>{r.capacite} Personne(s)</td>
                                            <td className="pe-4 py-4 text-end"><span className="badge bg-secondary-subtle text-secondary border border-secondary border-opacity-25 rounded-pill px-4 py-2 fw-800 shadow-sm">{r.nombreTotal} Unités</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            );
        }

        if (detailModal === 'OCCUPATION') {
            const occRes = reservations.filter(r => r.etat === 'ACCEPTEE' || r.statut === 'CONFIRMEE');
            return (
                <>
                    <div className="modal-header border-0 pb-4 px-4 py-4" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                        <i className="bi bi-pie-chart-fill text-warning me-3 fs-3"></i>
                        <div>
                            <h5 className="modal-title fw-800 mb-0">Répartition de l'Occupation</h5>
                            <small className="opacity-75">Visualisez les séjours de vos clients confirmés</small>
                        </div>
                        {closeBtn}
                    </div>
                    <div className="modal-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="ps-4 border-0 small fw-800 text-secondary py-3 text-uppercase letter-spacing-1">Client</th>
                                        <th className="border-0 small fw-800 text-secondary py-3 text-uppercase letter-spacing-1">Séjour Actif</th>
                                        <th className="pe-4 border-0 small fw-800 text-secondary text-end py-3 text-uppercase letter-spacing-1">Chambre Réservée</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {occRes.length === 0 ? (
                                        <tr><td colSpan="3" className="text-center py-5 text-muted fw-600"><i className="bi bi-door-closed fs-3 d-block mb-2"></i>Aucune unité n'est occupée actuellement.</td></tr>
                                    ) : occRes.map(r => (
                                        <tr key={r.id} className="bg-white hover-scale transition-all">
                                            <td className="ps-4 py-4 fw-800 text-dark">
                                                <i className="bi bi-person-circle text-primary opacity-50 me-2"></i>
                                                {(r.clientNom + ' ' + (r.clientPrenom || '')).trim() || 'Client inconnu'}
                                            </td>
                                            <td className="py-4 small text-muted fw-700">Du {new Date(r.dateDebut).toLocaleDateString()} au {new Date(r.dateFin).toLocaleDateString()}</td>
                                            <td className="pe-4 py-4 text-end">
                                                <span className="badge bg-success-subtle text-success border border-success border-opacity-25 rounded-pill px-4 py-2 fw-800 shadow-sm"><i className="bi bi-key-fill me-2"></i>Chambre {r.chambreId}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            );
        }

        if (detailModal === 'FINANCES_CA' || detailModal === 'FINANCES_COMMISSION' || detailModal === 'FINANCES_NET') {
            // Création d'un tableau contenant TOUTES les transactions financières
            // provenant :
            // 1) des réservations d'hôtels/chambres
            // 2) des réservations d'événements
            const allFinRes = [
                ...reservations.filter(r => r.typeReservation !== 'SUR_PLACE' && r.statutPaiement === 'PAYE').map(r => ({ ...r, source: 'HOTEL' })),
                ...eventReservations.filter(r => r.statutPaiement === 'PAYE').map(r => ({ ...r, source: 'EVENT' }))
            ].filter(r => (r.prixTotal || 0) > 0).sort((a, b) => b.id - a.id);

            const filteredFinRes = allFinRes.filter(r => {
                if (finFilter === 'ALL') return true;
                return r.source === finFilter;
            });

            const typeCA = detailModal === 'FINANCES_CA';
            const typeComm = detailModal === 'FINANCES_COMMISSION';
            
            const title = typeCA ? "Détail du Chiffre d'Affaires"
                        : typeComm ? "Détail des Commissions"
                        : "Détail du Revenu Net";
            const sub   = typeCA ? "Revenus bruts (Standard + Événements)"
                        : typeComm ? "Frais plateforme (10%)"
                        : "Gains nets après commissions (90%)";

            const total = filteredFinRes.reduce((s, r) => {
                const v = typeCA ? ((r.prixTotal||0) - (r.montantRembourse||0)) : typeComm ? parseFloat(r.commissionAdmin||0) : parseFloat(r.gainPrestataire||0);
                return s + parseFloat(v);
            }, 0);

            const colClass = typeCA ? 'text-white' : typeComm ? 'text-danger' : 'text-success';
            const colLabel = typeCA ? 'Brut' : typeComm ? 'Commission' : 'Net';

            return (
                <div className="card border-0 rounded-4 overflow-hidden" style={{ backgroundColor: '#1e293b' }}>
                    <div className="card-header border-0 py-4 px-5 d-flex align-items-center justify-content-between" style={{ backgroundColor: '#0f172a' }}>
                        <div>
                            <h4 className="fw-900 mb-1 text-white">{title}</h4>
                            <p className="m-0 opacity-75 text-white small">{sub} &mdash; Total: <strong className="fs-5">{total.toFixed(2)} DT</strong></p>
                        </div>
                        <div className="d-flex gap-2">
                            {['ALL', 'HOTEL', 'EVENT'].map(f => (
                                <button 
                                    key={f} 
                                    onClick={() => setFinFilter(f)}
                                    className={`btn btn-sm rounded-pill px-3 fw-800 transition-all ${finFilter === f ? 'btn-warning shadow-sm' : 'btn-outline-light opacity-50'}`}
                                >
                                    {f === 'ALL' ? 'Tous' : f === 'HOTEL' ? 'Chambres' : 'Événements'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-dark table-hover align-middle mb-0" style={{ '--bs-table-bg': '#1e293b' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#0f172a' }}>
                                        <th className="ps-5 py-3 border-0 text-secondary small fw-800 text-uppercase letter-spacing-1">Source</th>
                                        <th className="py-3 border-0 text-secondary small fw-800 text-uppercase letter-spacing-1">Réf / Client</th>
                                        <th className="py-3 border-0 text-secondary small fw-800 text-uppercase letter-spacing-1 text-center">Date</th>
                                        <th className={`pe-5 py-3 border-0 text-end small fw-800 text-uppercase letter-spacing-1 ${colClass}`}>{colLabel}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredFinRes.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="text-center py-5">
                                                <i className="bi bi-inbox display-4 opacity-25 d-block mb-3"></i>
                                                <p className="text-muted fw-600">Aucune transaction trouvée pour cette période.</p>
                                            </td>
                                        </tr>
                                    ) : filteredFinRes.map(r => {
                                        const val = typeCA ? ((r.prixTotal||0) - (r.montantRembourse||0)) : typeComm ? parseFloat(r.commissionAdmin||0) : parseFloat(r.gainPrestataire||0);
                                        return (
                                            <tr key={`${r.source}-${r.id}`} className="border-bottom border-white border-opacity-10 transition-all hover-bg-dark">
                                                <td className="ps-5 py-4">
                                                    <span className={`badge rounded-pill px-3 py-2 fw-800 small ${r.source === 'EVENT' ? 'bg-primary text-white' : 'bg-info bg-opacity-10 text-info'}`} style={r.source === 'EVENT' ? { boxShadow: '0 4px 10px rgba(249, 115, 22, 0.3)' } : { color: '#7dd3fc' }}>
                                                        {r.source === 'EVENT' ? 'Événement' : 'Chambre'}
                                                    </span>
                                                </td>
                                                <td className="py-4">
                                                    <div className="fw-800 text-white fs-6">RES-{r.id}</div>
                                                    <div className="text-muted smaller fw-600">{(r.clientNom||'') + ' ' + (r.clientPrenom||'')}</div>
                                                </td>
                                                <td className="py-4 text-center">
                                                    <div className="text-white small fw-700">{r.dateDebut ? new Date(r.dateDebut).toLocaleDateString('fr-FR') : '—'}</div>
                                                </td>
                                                <td className={`pe-5 py-4 text-end fw-900 fs-4 ${colClass}`}>
                                                    {parseFloat(val).toFixed(2)} <small className="fs-6 opacity-75">DT</small>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
        }

        if (detailModal === 'OFFLINE_CA') {
            const offlineRes = reservations.filter(r => r.typeReservation === 'SUR_PLACE' && (r.prixTotal || 0) > 0).sort((a, b) => b.id - a.id);
            const totalOffline = offlineRes.reduce((s, r) => s + (parseFloat(r.prixTotal) || 0) - (parseFloat(r.montantRembourse) || 0), 0);
            return (
                <div className="row g-4 animate-in-y" style={{ padding: '20px' }}><div className="col-12"><div className="card border-0 rounded-4 shadow-sm overflow-hidden" style={{ backgroundColor: '#0f172a' }}>
                    <div className="card-header py-4 px-5 d-flex align-items-center justify-content-between border-0" style={{ backgroundColor: '#0f172a' }}>
                        <div>
                            <h4 className="fw-900 mb-1 text-white"><i className="bi bi-shop-window me-3 text-warning"></i>Réservations Hors Ligne</h4>
                            <small className="opacity-75" style={{ color: '#94a3b8' }}>Réservations sur place — Total encaissé: <strong className="fs-5 text-white">{totalOffline.toFixed(2)} DT</strong></small>
                        </div>
                        <span className="badge rounded-pill px-4 py-2 fw-900 fs-6" style={{ backgroundColor: '#f97316', color: '#fff' }}><i className="bi bi-percent me-2"></i>0% Commission</span>
                    </div>
                    <div className="table-responsive"><table className="table align-middle mb-0" style={{ backgroundColor: '#0f172a' }}>
                        <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <th className="ps-5 border-0 small fw-800 py-3 text-uppercase" style={{ color: '#64748b' }}>Référence</th>
                            <th className="border-0 small fw-800 py-3 text-uppercase" style={{ color: '#64748b' }}>Client</th>
                            <th className="border-0 small fw-800 py-3 text-uppercase" style={{ color: '#64748b' }}>Date</th>
                            <th className="pe-5 border-0 small fw-800 py-3 text-end text-uppercase" style={{ color: '#64748b' }}>Montant (100%)</th>
                        </tr></thead>
                        <tbody>
                            {offlineRes.length === 0 ? (<tr><td colSpan="4" className="text-center py-5 fw-600" style={{ color: '#64748b', backgroundColor: '#0f172a' }}><i className="bi bi-inbox display-4 d-block mb-2 opacity-25"></i>Aucune réservation hors ligne.</td></tr>) : offlineRes.map(r => (
                                <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#0f172a' }}>
                                    <td className="ps-5 py-4"><span className="rounded-pill px-3 py-2 fw-800 small" style={{ backgroundColor: 'rgba(202,138,4,0.2)', color: '#f59e0b', border: '1px solid rgba(202,138,4,0.3)' }}>OFF-{r.id}</span></td>
                                    <td className="py-4"><div className="fw-800 small text-white">{(r.clientNom||'')} {(r.clientPrenom||'')}</div><div className="smaller" style={{ color: '#64748b' }}>{r.clientEmail || '—'}</div></td>
                                    <td className="py-4 small" style={{ color: '#64748b' }}>{r.dateDebut ? new Date(r.dateDebut).toLocaleDateString('fr-FR') : '—'}</td>
                                    <td className="pe-5 py-4 text-end fw-900 fs-4" style={{ color: '#10b981' }}>{(parseFloat(r.prixTotal || 0) - parseFloat(r.montantRembourse || 0)).toFixed(2)} <small className="fs-6 opacity-75">DT</small></td>
                                </tr>
                            ))}
                        </tbody>
                    </table></div>
                </div></div></div>
            );
        }

        return null;
    };

    if (loading) return (
        <div className="loading-screen">
            <div className="loading-spinner"></div>
            <h3 className="fw-700 mt-3">Chargement de votre espace...</h3>
        </div>
    );

    return (
        <>
        <div className="dashboard-wrapper">
            <Sidebar
                title={hotel?.nom || "Hotel Dashboard"}
                subtitle="Espace Prestataire"
                iconClass="bi-building"
                navItems={NAV_ITEMS}
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                onLogout={logout}
            />

            <main className="dashboard-main">
                <header className="page-header d-flex flex-wrap align-items-center justify-content-between">
                    <div>
                        <h1 className="fw-800 text-dark mb-0">
                            {activeSection === 'DASHBOARD' && "Tableau de Bord"}
                            {activeSection === 'PROFILE' && "Profil de l'Établissement"}
                            {activeSection === 'RESERVATIONS' && "Réservations Clients"}
                            {activeSection === 'ROOMS' && "Gestion de l'Inventaire"}
                            {activeSection === 'FORMULES' && "Services & Formules"}
                            {activeSection === 'EVENTS' && "Évènements & Culture"}
                            {activeSection === 'EVENT_RESERVATIONS' && "Billetterie"}
                        </h1>
                        <p className="text-muted mb-0 small">Gérez votre présence sur DreamLand avec précision.</p>
                    </div>
                    {hotel && (
                        <div className="d-none d-md-flex align-items-center gap-3">
                            <NotificationBell userId={user?.id} />
                            <div className="text-end">
                                <div className="fw-700 text-dark">{hotel.nom}</div>

                            </div>
                            {hotel.urlImage && <img src={hotel.urlImage} alt="Hotel" className="rounded-circle shadow-sm" style={{ width: 45, height: 45, objectFit: 'cover' }} />}
                        </div>
                    )}
                </header>

                <div className="section-content">
                    {/* 1. DASHBOARD */}
                    {activeSection === 'DASHBOARD' && (
                        <div className="d-flex flex-column gap-4 animate-in-y">
                            {/* Top Hero Cards: Inventaire & CA Hors Ligne */}
                            <div className="row g-4">
                                <div className="col-12 col-xl-7">
                                    <div 
                                        className="card border-0 shadow-lg rounded-4 overflow-hidden h-100 position-relative hover-scale transition-all" 
                                        style={{ backgroundColor: '#0f172a', color: '#ffffff', cursor: 'pointer' }}
                                        onClick={() => setDetailModal('INVENTAIRE')}
                                        title="Voir la gestion des chambres"
                                    >
                                        {/* Background pattern/accents */}
                                        <div className="position-absolute top-0 start-0 w-100 h-100 opacity-25" style={{ background: 'radial-gradient(circle at top right, rgba(249,115,22,0.8), transparent 50%)' }}></div>
                                        <div className="position-absolute end-0 bottom-0 mb-n4 me-n4" style={{ color: 'rgba(255, 255, 255, 0.05)' }}>
                                            <i className="bi bi-door-open-fill" style={{ fontSize: '14rem', transform: 'rotate(-10deg)' }}></i>
                                        </div>
                                        
                                        <div className="card-body p-4 p-md-5 position-relative z-1">
                                            <h6 className="fw-800 text-uppercase letter-spacing-2 mb-4 d-flex align-items-center" style={{ color: '#94a3b8' }}>
                                                <i className="bi bi-building me-2 fs-5" style={{ color: '#f97316' }}></i>Inventaire de l'Établissement
                                            </h6>
                                            
                                            <div className="d-flex align-items-end mb-4">
                                                <h1 className="fw-900 mb-0 lh-1 text-white" style={{ fontSize: '5rem' }}>{stats.totalRooms}</h1>
                                                <span className="fs-4 fw-600 ms-3 pb-2" style={{ color: '#94a3b8' }}>unités au total</span>
                                            </div>
                                            
                                            <div className="progress rounded-pill mt-5 mb-3 shadow-sm" style={{ height: '14px', backgroundColor: 'rgba(255,255,255,0.1)' }}>
                                                <div 
                                                    className="progress-bar progress-bar-striped progress-bar-animated rounded-pill" 
                                                    role="progressbar" 
                                                    style={{ width: `${stats.totalRooms > 0 ? (dynamicReservedCount/stats.totalRooms)*100 : 0}%`, backgroundColor: '#f97316' }}
                                                ></div>
                                            </div>
                                            
                                            <div className="d-flex justify-content-between small fw-700 mt-3 pt-2 border-top border-secondary border-opacity-25">
                                                <span style={{ color: '#f97316' }}><i className="bi bi-key-fill me-1"></i> {dynamicReservedCount} Chambres Occupées</span>
                                                <span className="text-white"><i className="bi bi-check-circle-fill me-1"></i> {stats.totalRooms - dynamicReservedCount} Disponibles</span>
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

                            {/* Bottom Finance Row */}
                            <div className="row g-4 mt-2">
                                {[
                                    { label: 'Chiffre d’Affaires', val: (reservations.filter(r => r.typeReservation !== 'SUR_PLACE' && r.statutPaiement === 'PAYE').reduce((s, r) => s + (r.prixTotal || 0) - (r.montantRembourse || 0), 0) + eventReservations.filter(r => r.statutPaiement === 'PAYE').reduce((s, r) => s + (r.prixTotal || 0) - (r.montantRembourse || 0), 0)).toFixed(2), icon: 'bi-wallet2', theme: 'dark', suffix: 'DT', sub: 'En ligne uniquement (Stripe)', finType: 'FINANCES_CA' },
                                    { label: 'Commissions', val: (reservations.filter(r => r.typeReservation !== 'SUR_PLACE' && r.statutPaiement === 'PAYE').reduce((s, r) => s + (parseFloat(r.commissionAdmin) || 0), 0) + eventReservations.filter(r => r.statutPaiement === 'PAYE').reduce((s, r) => s + (parseFloat(r.commissionAdmin) || 0), 0)).toFixed(2), icon: 'bi-pie-chart-fill', theme: 'danger', suffix: 'DT', sub: 'Frais plateforme (10%) sur transactions en ligne', finType: 'FINANCES_COMMISSION' },
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
                                                <i className={`bi ${card.icon}`} style={{ fontSize: '12rem', transform: 'rotate(-5deg)' }}></i>
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
                                                    <span className="display-4 fw-900 text-dark lh-1 me-2">{card.val}</span>
                                                    <span className={`fw-900 text-${card.theme} fs-4 opacity-75`}>{card.suffix}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* End of section */}
                        </div>
                    )}

                    {/* 2. PROFILE */}
                    {activeSection === 'PROFILE' && (
                        <div className="card border-0 shadow-sm rounded-4 overflow-hidden animate-in-x">
                            <div className="card-header bg-white border-bottom py-3">
                                <h5 className="fw-800 text-dark mb-0">Identité de l'Hôtel</h5>
                            </div>
                            <div className="card-body p-4 p-md-5">
                                <form onSubmit={handleUpdateProfile}>
                                    <div className="row g-4 mb-5">
                                        <div className="col-12 col-md-4">
                                            <label className="form-label fw-700 text-secondary small">Nom de l'Hotel</label>
                                            <input 
                                                className="form-control form-control-lg rounded-3 fs-6" 
                                                required 
                                                name="nom"
                                                value={profileForm?.utilisateur?.nom || profileForm?.nom || ''} 
                                                onChange={handleProfileChange} 
                                                placeholder="Ex: Hilton Djerba" 
                                            />
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label fw-700 text-secondary small">Email de l'Hotel</label>
                                            <div className="input-group">
                                                <span className="input-group-text bg-light border-end-0 rounded-start-3"><i className="bi bi-envelope text-primary"></i></span>
                                                <input 
                                                    className="form-control form-control-lg border-start-0 rounded-end-3 fs-6" 
                                                    required 
                                                    name="email"
                                                    value={profileForm?.utilisateur?.email || ''} 
                                                    onChange={handleProfileChange} 
                                                    placeholder="contact@hotel.tn" 
                                                />
                                            </div>
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label fw-700 text-secondary small">Téléphone de contact (8 chiffres)</label>
                                            <div className="input-group">
                                                <span className="input-group-text bg-light border-end-0 rounded-start-3"><i className="bi bi-telephone text-primary"></i></span>
                                                <input 
                                                    type="tel" 
                                                    pattern="[0-9]{8}" 
                                                    minLength="8" 
                                                    maxLength="8" 
                                                    name="telephone"
                                                    className="form-control form-control-lg border-start-0 rounded-end-3 fs-6" 
                                                    required 
                                                    value={profileForm?.utilisateur?.telephone || profileForm?.telephone || ''} 
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                                                        handleProfileChange({ target: { name: 'telephone', value: val } });
                                                    }} 
                                                    placeholder="Ex: 55443322" 
                                                />
                                            </div>
                                        </div>
                                        <div className="col-12 col-md-4">
                                            <label className="form-label fw-700 text-secondary small">Tarif d'appel (À partir de)</label>
                                            <div className="input-group">
                                                <input type="number" min="0" step="0.5" className="form-control form-control-lg rounded-start-3 fs-6 border-end-0" required value={profileForm?.prix || ''} onChange={e => setProfileForm({ ...profileForm, prix: e.target.value ? parseFloat(e.target.value) : '' })} placeholder="Ex: 80" />
                                                <span className="input-group-text bg-light border-start-0 rounded-end-3 fw-700 text-dark">DT</span>
                                            </div>
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label fw-700 text-secondary small">Adresse</label>
                                            <div className="input-group mb-3">
                                                <span className="input-group-text bg-light border-end-0 rounded-start-3"><i className="bi bi-geo-alt text-primary"></i></span>
                                                <input 
                                                    className="form-control form-control-lg border-start-0 rounded-end-3 fs-6" 
                                                    required 
                                                    name="adresse"
                                                    value={profileForm?.adresse || ''} 
                                                    onChange={handleProfileChange} 
                                                    placeholder="Zone Touristique, Houmt Souk..." 
                                                />
                                            </div>
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label fw-700 text-secondary small d-flex justify-content-between">
                                                Position sur la carte (Cliquez pour définir)
                                                <span className="text-primary">{profileForm?.localisation || "Non définie"}</span>
                                            </label>
                                            <MapPicker 
                                                initialValue={profileForm?.localisation} 
                                                onChange={(val) => setProfileForm({ ...profileForm, localisation: val })}
                                                onAddressChange={(addr) => setProfileForm({ ...profileForm, adresse: addr })}
                                            />
                                            <p className="smaller text-muted mt-2"><i className="bi bi-info-circle me-1"></i> Déplacez le marqueur en cliquant sur votre emplacement exact sur la carte.</p>
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label fw-700 text-secondary small">Galerie de photos du profil</label>
                                            <div className="p-4 border border-2 border-dashed rounded-4 bg-light">
                                                <div className="row g-3 mb-3">
                                                    {(profileForm?.urlImage ? profileForm.urlImage.split(',').filter(Boolean) : []).map((url, idx) => (
                                                        <div key={idx} className="col-6 col-md-4 col-lg-3">
                                                            <div className="position-relative group shadow-sm rounded-4 overflow-hidden" style={{ height: '120px' }}>
                                                                <img src={url} alt={`Profile ${idx}`} className="w-100 h-100 object-fit-cover transition-all group-hover-scale" />
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => removeImage(idx, 'main')}
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
                                                    <p className="text-muted small mb-0"><i className="bi bi-info-circle me-1"></i> Vous pouvez sélectionner plusieurs images. Elles défileront automatiquement sur votre profil.</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label fw-700 text-secondary small">Description de l'établissement</label>
                                            <textarea 
                                                className="form-control rounded-3 fs-6" 
                                                rows="5" 
                                                name="description"
                                                value={profileForm?.description || ''} 
                                                onChange={handleProfileChange} 
                                                placeholder="Décrivez les services, l'ambiance et les points forts de votre hôtel..." 
                                            />
                                        </div>

                                        <div className="col-12 mt-4">
                                            <h6 className="fw-800 text-dark mb-3">Points forts de l'établissement</h6>
                                            <div className="row g-3">
                                                {[
                                                    { key: 'aReception24h', label: 'Réception 24h/24', icon: 'bi-person-badge text-primary' },
                                                    { key: 'aSecurite24h', label: 'Sécurité 24h/24', icon: 'bi-shield-check text-success' },
                                                    { key: 'aWifiGenerale', label: 'Wi-Fi général', icon: 'bi-wifi text-info' },
                                                    { key: 'aParking', label: 'Parking', icon: 'bi-p-square text-secondary' },
                                                    { key: 'aAscenseur', label: 'Ascenseur', icon: 'bi-arrows-expand text-warning' },
                                                    { key: 'aPiscine', label: 'Piscine', icon: 'bi-water text-primary' },
                                                    { key: 'aServiceReception', label: 'Salle de réception', icon: 'bi-cup-hot text-dark' }
                                                ].map(equip => (
                                                    <div key={equip.key} className="col-12 col-md-6 col-lg-4">
                                                        <div className={`form-check p-3 rounded-3 border transition-all ${profileForm?.[equip.key] ? 'border-primary bg-primary-subtle' : 'bg-light'}`}>
                                                            <input className="form-check-input ms-1 shadow-sm" type="checkbox" id={`hotel-${equip.key}`} 
                                                                style={{transform: 'scale(1.2)', cursor: 'pointer', marginTop: '6px'}}
                                                                checked={profileForm?.[equip.key] || false} 
                                                                onChange={(e) => setProfileForm({...profileForm, [equip.key]: e.target.checked})} 
                                                            />
                                                            <label className="form-check-label ms-3 fw-700 text-dark w-100" style={{cursor: 'pointer'}} htmlFor={`hotel-${equip.key}`}>
                                                                <i className={`bi ${equip.icon} me-2 fs-5`}></i> {equip.label}
                                                            </label>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="d-flex justify-content-end">
                                        <button type="submit" className="btn btn-primary btn-lg rounded-pill px-5 fw-800 shadow-sm transition-all hover-scale" style={{ background: '#f97316', border: 'none' }}>
                                            Mettre à jour le profil
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* 3. RESERVATIONS */}
                    {activeSection === 'RESERVATIONS' && (
                        <div className="card border-0 shadow-lg rounded-4 overflow-hidden animate-in-x bg-white relative">
                            {/* Accent border on top */}
                            <div className="position-absolute top-0 start-0 w-100 bg-primary opacity-75" style={{ height: '4px' }}></div>
                            
                            <div className="card-header bg-white border-bottom-0 pt-4 pb-0 px-4 position-relative">
                                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
                                    <div>
                                        <h4 className="fw-900 text-dark mb-1 letter-spacing-1">Historique des Séjours</h4>
                                        <p className="text-muted small mb-0 fw-600">Gérez l'ensemble des réservations de vos clients en un seul endroit.</p>
                                    </div>
                                    <button className="btn btn-primary rounded-pill px-4 py-2 fw-800 shadow-sm transition-all hover-scale d-flex align-items-center gap-2" onClick={() => setShowOfflineModal(true)}>
                                        <i className="bi bi-plus-lg"></i> Ajouter une réservation
                                    </button>
                                </div>
                                
                                {/* Premium Segmented Control */}
                                <div className="d-inline-flex bg-light p-1 rounded-pill mb-4 border border-light shadow-sm">
                                    <button 
                                        className={`btn rounded-pill py-2 px-4 fw-800 transition-all border-0 d-flex align-items-center gap-2 ${resTab === 'EN_LIGNE' ? 'btn-white shadow-sm text-primary' : 'text-muted bg-transparent'}`}
                                        onClick={() => setResTab('EN_LIGNE')}
                                    >
                                        <i className="bi bi-globe"></i>
                                        Plateforme DreamLand
                                        <span className={`badge rounded-pill ms-1 ${resTab === 'EN_LIGNE' ? 'bg-primary-subtle text-primary' : 'bg-secondary-subtle text-secondary'}`}>
                                            {reservations.filter(r => (r.typeReservation || 'EN_LIGNE') === 'EN_LIGNE' && r.statutPaiement === 'PAYE').length}
                                        </span>
                                    </button>
                                    <button 
                                        className={`btn rounded-pill py-2 px-4 fw-800 transition-all border-0 d-flex align-items-center gap-2 ${resTab === 'SUR_PLACE' ? 'btn-white shadow-sm text-info' : 'text-muted bg-transparent'}`}
                                        onClick={() => setResTab('SUR_PLACE')}
                                    >
                                        <i className="bi bi-person-badge"></i>
                                        En Direct (Sur Place)
                                        <span className={`badge rounded-pill ms-1 ${resTab === 'SUR_PLACE' ? 'bg-info-subtle text-info' : 'bg-secondary-subtle text-secondary'}`}>
                                            {reservations.filter(r => r.typeReservation === 'SUR_PLACE').length}
                                        </span>
                                    </button>
                                </div>
                            </div>
                            
                            {/* FILTER PILLS */}
                            <div className="px-4 py-3 bg-white border-bottom d-flex gap-2 align-items-center">
                                <span className="text-muted small fw-700 me-2">Filtrer par :</span>
                                {[
                                    { id: 'ALL', label: 'Tous', icon: 'bi-grid' },
                                    { id: 'EN_COURS', label: 'En Cours', icon: 'bi-play-circle' },
                                    { id: 'CONFIRMEE', label: 'Confirmées', icon: 'bi-check-circle' },
                                    { id: 'PASSE', label: 'Déjà passées', icon: 'bi-clock-history' },
                                    { id: 'ANNULEE', label: 'Annulées', icon: 'bi-x-circle' }
                                ].map(filter => (
                                    <button
                                        key={filter.id}
                                        onClick={() => setReservFilter(filter.id)}
                                        className={`btn rounded-pill px-3 py-1 fw-700 small transition-all d-flex align-items-center gap-2 ${reservFilter === filter.id ? 'btn-dark shadow-sm' : 'btn-light text-muted'}`}
                                    >
                                        <i className={`bi ${filter.icon}`}></i>
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="card-body p-0">
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle mb-0">
                                        <thead>
                                            <tr className="bg-light border-top border-bottom">
                                                <th className="ps-4 py-3 border-0 text-secondary small fw-800 text-uppercase letter-spacing-1">Client & Contact</th>
                                                <th className="py-3 border-0 text-secondary small fw-800 text-uppercase letter-spacing-1 text-center">Période du Séjour</th>
                                                <th className="py-3 border-0 text-secondary small fw-800 text-uppercase letter-spacing-1 text-center">Hébergement</th>
                                                <th className="py-3 border-0 text-secondary small fw-800 text-uppercase letter-spacing-1 text-center">Statut</th>
                                                <th className="pe-4 py-3 border-0 text-secondary text-end small fw-800 text-uppercase letter-spacing-1">Transaction</th>
                                                <th className="pe-4 py-3 border-0 text-secondary text-end small fw-800 text-uppercase letter-spacing-1">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reservations
                                                .sort((a, b) => b.id - a.id)
                                                .filter(r => (r.typeReservation || 'EN_LIGNE') === resTab)
                                                .filter(r => {
                                                    // Les réservations EN_LIGNE doivent être payées pour apparaître
                                                    // Les réservations SUR_PLACE sont toujours visibles (pas de paiement en ligne)
                                                    if (resTab === 'EN_LIGNE') return r.statutPaiement === 'PAYE';
                                                    return true; // SUR_PLACE : toujours afficher
                                                })
                                                .filter(r => {
                                                    if (reservFilter === 'ALL') return true;
                                                    if (reservFilter === 'ANNULEE') return r.statut === 'ANNULEE' || r.etat === 'ANNULEE';
                                                    if (reservFilter === 'PASSE') return r.statut === 'PASSEE';
                                                    if (reservFilter === 'CONFIRMEE') return r.statut === 'CONFIRMEE';
                                                    if (reservFilter === 'EN_COURS') return r.statut === 'EN_COURS';
                                                    return true;
                                                })
                                                .map(res => (
                                                    <tr key={res.id} className="transition-all hover-bg-light">
                                                        <td className="ps-4 py-3">
                                                            <div className="d-flex align-items-center">
                                                                <div className={`avatar shadow-sm rounded-circle fw-800 d-flex align-items-center justify-content-center me-3 border-2 border-white ${res.typeReservation === 'SUR_PLACE' ? 'bg-info text-white' : 'bg-primary text-white'}`} style={{ width: 44, height: 44 }}>
                                                                    {(res.clientNom || 'C').charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <div className="fw-800 text-dark fs-6">{res.clientNom} {res.clientPrenom}</div>
                                                                    <div className="text-muted smaller fw-600"><i className="bi bi-envelope me-1 opacity-50"></i>{res.clientEmail}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="text-center">
                                                            <div className="fw-800 text-dark small">
                                                                {new Date(res.dateDebut).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                                                                <i className="bi bi-arrow-right mx-2 text-muted"></i>
                                                                {new Date(res.dateFin).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                                                            </div>
                                                            <div className="text-muted smaller fw-700 mt-1">
                                                                <i className="bi bi-moon-stars me-1 opacity-50"></i>
                                                                {Math.ceil((new Date(res.dateFin) - new Date(res.dateDebut)) / (1000 * 60 * 60 * 24))} nuits
                                                            </div>
                                                        </td>
                                                        <td className="text-center">
                                                            <div className="d-inline-flex flex-column gap-1">
                                                                <span className="badge rounded-pill px-3 py-2 fw-800 shadow-sm" style={{ backgroundColor: 'rgba(79, 70, 229, 0.08)', color: '#4f46e5', border: '1px solid rgba(79, 70, 229, 0.15)' }}>
                                                                    <i className="bi bi-door-open-fill me-2"></i>Chambre {res.chambreId}
                                                                </span>
                                                                <span className="text-muted fw-700 smaller">Format Standard</span>
                                                            </div>
                                                        </td>
                                                        <td className="text-center">
                                                            {res.statut === 'ANNULEE' || res.etat === 'ANNULEE' ? (
                                                                <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 rounded-pill px-3 py-2 fw-800 shadow-sm">
                                                                    <i className="bi bi-x-octagon-fill me-1"></i> Annulée
                                                                </span>
                                                            ) : res.statut === 'PASSEE' ? (
                                                                <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 rounded-pill px-3 py-2 fw-800 shadow-sm">
                                                                    <i className="bi bi-clock-history me-1"></i> Déjà passé
                                                                </span>
                                                            ) : res.statut === 'EN_COURS' ? (
                                                                <span className="badge rounded-pill px-3 py-2 fw-800 shadow-sm" style={{ backgroundColor: 'rgba(249,115,22,0.1)', color: '#ea580c', border: '1px solid rgba(249,115,22,0.25)' }}>
                                                                    <i className="bi bi-play-circle-fill me-1"></i> Séjour en cours
                                                                </span>
                                                            ) : (
                                                                <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill px-3 py-2 fw-800 shadow-sm">
                                                                    <i className="bi bi-patch-check-fill me-1"></i> Confirmée
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="pe-4 text-end">
                                                            <div className="fw-900 text-dark fs-5 tracking-tight">{res.prixTotal} <small className="text-muted fw-700 fs-6">DT</small></div>
                                                            <div className="mt-1">
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
                                                                        style={{ width: 34, height: 34 }} 
                                                                        onClick={() => window.open(`/receipt/${res.id}`, '_blank')}
                                                                        title="Voir Reçu"
                                                                    >
                                                                        <i className="bi bi-file-earmark-text-fill"></i>
                                                                    </button>
                                                                    {(res.statut === 'CONFIRMEE' || res.etat === 'ACCEPTEE') && resTab === 'SUR_PLACE' && (
                                                                        <>
                                                                            <button className="btn btn-dark btn-sm rounded-circle d-flex align-items-center justify-content-center shadow-sm hover-scale" style={{ width: 34, height: 34 }} onClick={() => setEditTarget(res)} title="Modifier">
                                                                                <i className="bi bi-pencil-fill"></i>
                                                                            </button>
                                                                            <button className="btn btn-danger btn-sm rounded-circle d-flex align-items-center justify-content-center shadow-sm hover-scale" style={{ width: 34, height: 34 }} onClick={() => setCancelTarget(res)} title="Annuler">
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
                                    {reservations.filter(r => (r.typeReservation || 'EN_LIGNE') === resTab).filter(r => r.typeReservation === 'SUR_PLACE' || r.statutPaiement === 'PAYE').length === 0 && (
                                        <div className="text-center py-5">
                                            <div className="py-4">
                                                <i className="bi bi-calendar-x display-4 text-muted opacity-25 mb-3 d-block"></i>
                                                <h5 className="fw-800 text-dark">Aucun séjour {resTab.toLowerCase()}</h5>
                                                <p className="text-muted small">L'historique des séjours apparaîtra ici dès qu'un client réserve.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 4. ROOMS */}
                    {activeSection === 'ROOMS' && (
                        <div className="animate-in-x">
                            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-5">
                                <div>
                                    <h5 className="fw-900 text-dark mb-1 letter-spacing-1">Gestion des Chambres</h5>
                                    <p className="text-secondary small fw-600 mb-0">Listez chaque chambre de votre hôtel et liez-la à une catégorie.</p>
                                </div>
                                <button className="btn rounded-pill px-5 py-3 fw-800 shadow-lg d-flex align-items-center gap-3 transition-all hover-scale w-100 w-md-auto justify-content-center text-white" style={{ backgroundColor: '#f97316' }} onClick={() => { setEditingRoom(null); setNewRoom({ numero: '', type: 'SINGLE', prix: 50, capacite: 1, nombreTotal: 1, urlImage: '', description: '', nbLitsSimples: 1, nbLitsDoubles: 0 }); setShowAddRoom(true); }}>
                                    <i className="bi bi-plus-lg fs-5"></i> Ajouter une chambre
                                </button>
                            </div>

                            {showAddRoom && (
                                <div className="card border-0 shadow-lg rounded-5 mb-5 overflow-hidden bg-white position-relative animate-in-y">
                                    <div className="position-absolute top-0 start-0 w-100 bg-dark" style={{ height: '5px' }}></div>
                                    <div className="card-body p-4 p-md-5">
                                        <div className="d-flex justify-content-between align-items-center mb-5">
                                            <div className="d-flex align-items-center gap-3">
                                                <div className="bg-dark text-white rounded-circle d-flex align-items-center justify-content-center shadow" style={{ width: 48, height: 48 }}>
                                                    <i className={`bi ${editingRoom ? 'bi-pencil-fill' : 'bi-stars'} fs-5`}></i>
                                                </div>
                                                <h4 className="fw-900 text-dark mb-0 letter-spacing-1">{editingRoom ? "Modifier la chambre" : "Nouvelle chambre"}</h4>
                                            </div>
                                            <button className="btn btn-light rounded-circle shadow-sm transition-all hover-scale" style={{ width: 40, height: 40 }} onClick={() => setShowAddRoom(false)}><i className="bi bi-x-lg text-dark"></i></button>
                                        </div>
                                        <form onSubmit={handleRoomAction}>
                                            <div className="row g-4 mb-4">
                                                <div className="col-12 col-md-3">
                                                    <label className="form-label fw-800 text-secondary small text-uppercase letter-spacing-1">N° Chambre</label>
                                                    <div className="input-group input-group-lg bg-light rounded-4 border-0 p-1">
                                                        <span className="input-group-text border-0 bg-transparent text-secondary"><i className="bi bi-tag-fill"></i></span>
                                                        <input type="text" className="form-control border-0 bg-transparent text-dark fw-700 fs-5" placeholder="ex: 101" required value={newRoom.numero} onChange={e => setNewRoom({ ...newRoom, numero: e.target.value })} />
                                                    </div>
                                                </div>
                                                <div className="col-12 col-md-3">
                                                    <label className="form-label fw-800 text-secondary small text-uppercase letter-spacing-1">Catégorie</label>
                                                    <select 
                                                        className="form-select form-select-lg rounded-4 fs-6 border-0 bg-light fw-700 py-3 text-dark" 
                                                        value={newRoom.type} 
                                                        onChange={e => {
                                                            const selectedType = e.target.value;
                                                            const isLibreOnly = ['QUADRUPLE', 'FAMILIALE', 'SUITE'].includes(selectedType);
                                                            let defaultBeds = { nbLitsSimples: 0, nbLitsDoubles: 0 };
                                                            if (selectedType === 'SINGLE') defaultBeds = { nbLitsSimples: 1, nbLitsDoubles: 0 };
                                                            else if (selectedType === 'DOUBLE') defaultBeds = { nbLitsSimples: 0, nbLitsDoubles: 1 };
                                                            else if (selectedType === 'TRIPLE') defaultBeds = { nbLitsSimples: 1, nbLitsDoubles: 1 };
                                                            setNewRoom(prev => ({
                                                                ...prev,
                                                                type: selectedType,
                                                                prix: isLibreOnly ? 0 : prev.prix,
                                                                prixParAdulte: isLibreOnly ? 0 : prev.prixParAdulte,
                                                                ...defaultBeds
                                                            }));
                                                        }}
                                                    >
                                                        <option value="SINGLE">Chambre Single (Individuelle)</option>
                                                        <option value="DOUBLE">Chambre Double</option>
                                                        <option value="TRIPLE">Chambre Triple</option>
                                                        <option value="QUADRUPLE">Chambre Quadruple</option>
                                                        <option value="FAMILIALE">Chambre Familiale</option>
                                                        <option value="SUITE">Suite</option>
                                                    </select>
                                                </div>
                                                <div className="col-6 col-md-3">
                                                    <label className="form-label fw-800 text-secondary small text-uppercase letter-spacing-1">Nb. personnes</label>
                                                    <div className="input-group input-group-lg bg-light rounded-4 border-0 p-1">
                                                        <span className="input-group-text border-0 bg-transparent text-secondary"><i className="bi bi-people-fill"></i></span>
                                                        <input type="number" className="form-control border-0 bg-transparent text-dark fw-700 fs-5" min="1" value={newRoom.capacite} onChange={e => setNewRoom({ ...newRoom, capacite: parseInt(e.target.value) })} />
                                                    </div>
                                                </div>
                                                <div className="col-6 col-md-3">
                                                    <label className="form-label fw-800 text-secondary small text-uppercase letter-spacing-1">Prix 1er adulte</label>
                                                    <div className={`input-group input-group-lg rounded-4 border-0 p-1 ${['QUADRUPLE', 'FAMILIALE', 'SUITE'].includes(newRoom.type) ? 'bg-secondary bg-opacity-10 opacity-75' : 'bg-light'}`}>
                                                        <input 
                                                            type="number" 
                                                            className="form-control border-0 bg-transparent text-dark fw-900 fs-5 text-end" 
                                                            min={['QUADRUPLE', 'FAMILIALE', 'SUITE'].includes(newRoom.type) ? "0" : "1"} 
                                                            step="0.5" 
                                                            disabled={['QUADRUPLE', 'FAMILIALE', 'SUITE'].includes(newRoom.type)} 
                                                            value={newRoom.prix} 
                                                            onChange={e => setNewRoom({ ...newRoom, prix: parseFloat(e.target.value) })} 
                                                        />
                                                        <span className="input-group-text border-0 bg-transparent text-primary fw-900">DT</span>
                                                    </div>
                                                </div>
                                                <div className="col-6 col-md-3">
                                                    <label className="form-label fw-800 text-secondary small text-uppercase letter-spacing-1">Prix adulte suppl.</label>
                                                    <div className={`input-group input-group-lg rounded-4 border-0 p-1 ${['QUADRUPLE', 'FAMILIALE', 'SUITE'].includes(newRoom.type) ? 'bg-secondary bg-opacity-10 opacity-75' : 'bg-light'}`}>
                                                        <input 
                                                            type="number" 
                                                            className="form-control border-0 bg-transparent text-dark fw-900 fs-5 text-end" 
                                                            min="0" 
                                                            step="0.5" 
                                                            disabled={['QUADRUPLE', 'FAMILIALE', 'SUITE'].includes(newRoom.type)} 
                                                            value={newRoom.prixParAdulte} 
                                                            onChange={e => setNewRoom({ ...newRoom, prixParAdulte: parseFloat(e.target.value) })} 
                                                        />
                                                        <span className="input-group-text border-0 bg-transparent text-primary fw-900">DT</span>
                                                    </div>
                                                </div>
                                                <div className="col-6 col-md-3">
                                                    <label className="form-label fw-800 text-secondary small text-uppercase letter-spacing-1">Prix libre (tarif fixe)</label>
                                                    <div className="input-group input-group-lg bg-light rounded-4 border-0 p-1">
                                                        <input type="number" className="form-control border-0 bg-transparent text-dark fw-900 fs-5 text-end" min="0" step="0.5" value={newRoom.prixLibre || 0} onChange={e => setNewRoom({ ...newRoom, prixLibre: parseFloat(e.target.value) })} />
                                                        <span className="input-group-text border-0 bg-transparent text-primary fw-900">DT</span>
                                                    </div>
                                                </div>
                                                {!editingRoom && (
                                                    <div className="col-6 col-md-3">
                                                        <label className="form-label fw-800 text-secondary small text-uppercase letter-spacing-1">Quantité à créer</label>
                                                        <div className="input-group input-group-lg bg-light rounded-4 border-0 p-1">
                                                            <span className="input-group-text border-0 bg-transparent text-secondary"><i className="bi bi-layers-half"></i></span>
                                                            <input type="number" className="form-control border-0 bg-transparent text-dark fw-700 fs-5" min="1" value={newRoom.nombreTotal} onChange={e => setNewRoom({ ...newRoom, nombreTotal: parseInt(e.target.value) })} />
                                                        </div>
                                                    </div>
                                                )}

                                            </div>

                                            {/* Configuration des Lits — selon le type de chambre */}
                                            {!['QUADRUPLE', 'FAMILIALE', 'SUITE'].includes(newRoom.type) && (
                                                <div className="bg-dark p-4 rounded-4 mb-4 border border-secondary" style={{ '--bs-bg-opacity': '.05' }}>
                                                    <label className="form-label fw-900 text-white mb-3 d-flex align-items-center gap-2">
                                                        <i className="bi bi-bed text-white fs-5"></i>
                                                        Configuration des Lits
                                                    </label>

                                                    {/* SINGLE : 1 lit simple fixe */}
                                                    {newRoom.type === 'SINGLE' && (
                                                        <div className="d-flex align-items-center gap-3 p-3 rounded-4 border" style={{ background: 'rgba(249, 115, 22, 0.08)', borderColor: '#f97316' }}>
                                                            <div className="bg-primary bg-opacity-20 text-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: 45, height: 45, flexShrink: 0 }}>
                                                                <i className="bi bi-person fs-4 text-white"></i>
                                                            </div>
                                                            <div>
                                                                <div className="fw-800 text-white">1 Lit Simple</div>
                                                                <small className="text-white-50 fw-600">Configuration fixe pour chambre individuelle</small>
                                                            </div>
                                                            <span className="badge ms-auto rounded-pill px-3 py-2 fw-800" style={{ background: '#f97316', color: 'white' }}>Fixe</span>
                                                        </div>
                                                    )}

                                                    {/* DOUBLE : 2 options radio */}
                                                    {newRoom.type === 'DOUBLE' && (
                                                        <div className="d-flex flex-column gap-3">
                                                            <div
                                                                className="p-3 rounded-4 border d-flex align-items-center gap-3 transition-all"
                                                                style={{
                                                                    background: (newRoom.nbLitsSimples === 2 && newRoom.nbLitsDoubles === 0) ? 'rgba(249, 115, 22, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                                                                    borderColor: (newRoom.nbLitsSimples === 2 && newRoom.nbLitsDoubles === 0) ? '#f97316' : 'rgba(255, 255, 255, 0.12)',
                                                                    cursor: 'pointer'
                                                                }}
                                                                onClick={() => setNewRoom(prev => ({ ...prev, nbLitsSimples: 2, nbLitsDoubles: 0 }))}
                                                            >
                                                                <input type="radio" name="bedConfig" checked={newRoom.nbLitsSimples === 2 && newRoom.nbLitsDoubles === 0} onChange={() => setNewRoom(prev => ({ ...prev, nbLitsSimples: 2, nbLitsDoubles: 0 }))} style={{ accentColor: '#f97316', width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }} />
                                                                <div className={`rounded-circle d-flex align-items-center justify-content-center ${ (newRoom.nbLitsSimples === 2 && newRoom.nbLitsDoubles === 0) ? 'bg-primary bg-opacity-25 text-primary' : 'bg-secondary bg-opacity-10 text-white-50' }`} style={{ width: 40, height: 40, flexShrink: 0 }}>
                                                                    <i className="bi bi-person fs-5"></i>
                                                                </div>
                                                                <div>
                                                                    <div className="fw-800 text-white">2 Lits Simples</div>
                                                                    <small className="text-white-50 fw-600">Deux lits individuels séparés</small>
                                                                </div>
                                                            </div>
                                                            <div
                                                                className="p-3 rounded-4 border d-flex align-items-center gap-3 transition-all"
                                                                style={{
                                                                    background: (newRoom.nbLitsSimples === 0 && newRoom.nbLitsDoubles === 1) ? 'rgba(249, 115, 22, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                                                                    borderColor: (newRoom.nbLitsSimples === 0 && newRoom.nbLitsDoubles === 1) ? '#f97316' : 'rgba(255, 255, 255, 0.12)',
                                                                    cursor: 'pointer'
                                                                }}
                                                                onClick={() => setNewRoom(prev => ({ ...prev, nbLitsSimples: 0, nbLitsDoubles: 1 }))}
                                                            >
                                                                <input type="radio" name="bedConfig" checked={newRoom.nbLitsSimples === 0 && newRoom.nbLitsDoubles === 1} onChange={() => setNewRoom(prev => ({ ...prev, nbLitsSimples: 0, nbLitsDoubles: 1 }))} style={{ accentColor: '#f97316', width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }} />
                                                                <div className={`rounded-circle d-flex align-items-center justify-content-center ${ (newRoom.nbLitsSimples === 0 && newRoom.nbLitsDoubles === 1) ? 'bg-info bg-opacity-25 text-info' : 'bg-secondary bg-opacity-10 text-white-50' }`} style={{ width: 40, height: 40, flexShrink: 0 }}>
                                                                    <i className="bi bi-people fs-5"></i>
                                                                </div>
                                                                <div>
                                                                    <div className="fw-800 text-white">1 Lit Double</div>
                                                                    <small className="text-white-50 fw-600">Grand lit (Double/Queen)</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* TRIPLE : 2 options radio */}
                                                    {newRoom.type === 'TRIPLE' && (
                                                        <div className="d-flex flex-column gap-3">
                                                            <div
                                                                className="p-3 rounded-4 border d-flex align-items-center gap-3 transition-all"
                                                                style={{
                                                                    background: (newRoom.nbLitsSimples === 3 && newRoom.nbLitsDoubles === 0) ? 'rgba(249, 115, 22, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                                                                    borderColor: (newRoom.nbLitsSimples === 3 && newRoom.nbLitsDoubles === 0) ? '#f97316' : 'rgba(255, 255, 255, 0.12)',
                                                                    cursor: 'pointer'
                                                                }}
                                                                onClick={() => setNewRoom(prev => ({ ...prev, nbLitsSimples: 3, nbLitsDoubles: 0 }))}
                                                            >
                                                                <input type="radio" name="bedConfig" checked={newRoom.nbLitsSimples === 3 && newRoom.nbLitsDoubles === 0} onChange={() => setNewRoom(prev => ({ ...prev, nbLitsSimples: 3, nbLitsDoubles: 0 }))} style={{ accentColor: '#f97316', width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }} />
                                                                <div className={`rounded-circle d-flex align-items-center justify-content-center ${ (newRoom.nbLitsSimples === 3 && newRoom.nbLitsDoubles === 0) ? 'bg-primary bg-opacity-25 text-primary' : 'bg-secondary bg-opacity-10 text-white-50' }`} style={{ width: 40, height: 40, flexShrink: 0 }}>
                                                                    <i className="bi bi-person fs-5"></i>
                                                                </div>
                                                                <div>
                                                                    <div className="fw-800 text-white">3 Lits Simples</div>
                                                                    <small className="text-white-50 fw-600">Trois lits individuels</small>
                                                                </div>
                                                            </div>
                                                            <div
                                                                className="p-3 rounded-4 border d-flex align-items-center gap-3 transition-all"
                                                                style={{
                                                                    background: (newRoom.nbLitsSimples === 1 && newRoom.nbLitsDoubles === 1) ? 'rgba(249, 115, 22, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                                                                    borderColor: (newRoom.nbLitsSimples === 1 && newRoom.nbLitsDoubles === 1) ? '#f97316' : 'rgba(255, 255, 255, 0.12)',
                                                                    cursor: 'pointer'
                                                                }}
                                                                onClick={() => setNewRoom(prev => ({ ...prev, nbLitsSimples: 1, nbLitsDoubles: 1 }))}
                                                            >
                                                                <input type="radio" name="bedConfig" checked={newRoom.nbLitsSimples === 1 && newRoom.nbLitsDoubles === 1} onChange={() => setNewRoom(prev => ({ ...prev, nbLitsSimples: 1, nbLitsDoubles: 1 }))} style={{ accentColor: '#f97316', width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }} />
                                                                <div className={`rounded-circle d-flex align-items-center justify-content-center ${ (newRoom.nbLitsSimples === 1 && newRoom.nbLitsDoubles === 1) ? 'bg-warning bg-opacity-25 text-warning' : 'bg-secondary bg-opacity-10 text-white-50' }`} style={{ width: 40, height: 40, flexShrink: 0 }}>
                                                                    <i className="bi bi-people fs-5"></i>
                                                                </div>
                                                                <div>
                                                                    <div className="fw-800 text-white">1 Lit Double + 1 Lit Simple</div>
                                                                    <small className="text-white-50 fw-600">Un grand lit et un lit individuel</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="bg-light p-4 rounded-4 mb-4 border border-light">
                                                <label className="form-label fw-900 text-dark mb-4 d-flex align-items-center gap-2">
                                                    <i className="bi bi-images text-dark fs-5"></i>
                                                    Galerie Photographique ({newRoom.urlImage ? newRoom.urlImage.split(',').filter(Boolean).length : 0})
                                                </label>
                                                <div className="row g-3">
                                                    {(newRoom.urlImage ? newRoom.urlImage.split(',').filter(Boolean) : []).map((url, idx) => (
                                                        <div key={idx} className="col-6 col-md-3 col-lg-2">
                                                            <div className="position-relative rounded-4 shadow-sm overflow-hidden group transition-all" style={{ height: 130 }}>
                                                                <img src={url} alt={`Room ${idx}`} className="w-100 h-100 object-fit-cover transition-all hover-scale" />
                                                                <button type="button" className="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 rounded-circle shadow-lg d-flex justify-content-center align-items-center hover-scale" style={{ width: 32, height: 32 }} onClick={() => { const list = newRoom.urlImage.split(',').filter(Boolean); list.splice(idx, 1); setNewRoom({...newRoom, urlImage: list.join(',')}); }}>
                                                                    <i className="bi bi-x-lg"></i>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div className="col-6 col-md-3 col-lg-2">
                                                        <label htmlFor="room-photo" className="d-flex flex-column align-items-center justify-content-center border border-2 border-dashed border-dark rounded-4 bg-white shadow-sm transition-all hover-scale w-100" style={{ height: 130, cursor: 'pointer' }}>
                                                            {uploading ? (
                                                                <span className="spinner-border text-dark"></span>
                                                            ) : (
                                                                <>
                                                                    <div className="bg-dark text-white rounded-circle d-flex align-items-center justify-content-center mb-2 shadow-sm" style={{ width: 36, height: 36 }}><i className="bi bi-plus-lg fs-5"></i></div>
                                                                    <span className="small text-dark fw-800">Ajouter</span>
                                                                </>
                                                            )}
                                                        </label>
                                                        <input type="file" id="room-photo" hidden multiple onChange={(e) => { const files = Array.from(e.target.files); files.forEach(file => handleFileChange({ target: { files: [file] } }, 'room', true)); }} disabled={uploading} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-12 mt-5">
                                                <label className="form-label fw-900 text-dark mb-4 d-flex align-items-center gap-2">
                                                    <i className="bi bi-star-fill text-warning fs-5"></i>
                                                    Prestations Incluses
                                                </label>
                                                <div className="row g-3">
                                                    {[
                                                        { key: 'aWifi', label: 'Wi-Fi', icon: 'bi-wifi' },
                                                        { key: 'aClimatisation', label: 'Climatisation', icon: 'bi-snow' },
                                                        { key: 'aSmartTv', label: 'Smart TV', icon: 'bi-tv' },
                                                        { key: 'aCoffreFort', label: 'Coffre-fort', icon: 'bi-box-seam' },
                                                        { key: 'aBureau', label: 'Bureau', icon: 'bi-briefcase' },
                                                        { key: 'aBalcon', label: 'Balcon', icon: 'bi-building' },
                                                        { key: 'aVueSurMer', label: 'Vue sur mer', icon: 'bi-tsunami' }
                                                    ].map(equip => {
                                                        const isSelected = newRoom[equip.key];
                                                        return (
                                                            <div key={equip.key} className="col-6 col-md-4 col-lg-3">
                                                                <div 
                                                                    className={`p-3 rounded-4 border transition-all d-flex flex-column align-items-center justify-content-center gap-2 text-center h-100 w-100 ${isSelected ? 'border-0 shadow-md' : 'bg-white shadow-sm hover-scale'}`} 
                                                                    style={{ cursor: 'pointer', backgroundColor: isSelected ? '#ff7a00' : '#ffffff' }} 
                                                                    onClick={() => setNewRoom({...newRoom, [equip.key]: !newRoom[equip.key]})}
                                                                >
                                                                    <i className={`bi ${equip.icon} fs-3 ${isSelected ? 'text-white' : 'text-dark opacity-50'}`}></i>
                                                                    <span className={`fw-800 small ${isSelected ? 'text-white' : 'text-dark'}`}>{equip.label}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="col-12 mt-4">
                                                <label className="form-label fw-800 text-secondary small text-uppercase letter-spacing-1">Description (optionnelle)</label>
                                                <textarea
                                                    className="form-control rounded-4 border-0 bg-light fw-600 py-3"
                                                    rows="3"
                                                    placeholder="Décrivez cette catégorie de chambre (vue, ambiance, particularités...)..."
                                                    value={newRoom.description || ''}
                                                    onChange={e => setNewRoom({ ...newRoom, description: e.target.value })}
                                                />
                                            </div>

                                            <div className="col-12 d-flex flex-column flex-md-row justify-content-end gap-3 pt-5 mt-4 border-top">
                                                <button type="button" className="btn btn-light rounded-pill px-5 py-3 fw-800 shadow-sm text-dark transition-all hover-scale" onClick={() => setShowAddRoom(false)}>Annuler</button>
                                                <button type="submit" className="btn rounded-pill px-5 py-3 fw-900 shadow-lg transition-all hover-scale d-flex align-items-center justify-content-center gap-2 text-white" style={{ backgroundColor: '#f97316' }}>
                                                    <i className="bi bi-check2-circle fs-5"></i> {editingRoom ? "Enregistrer les modifications" : "Publier la chambre"}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}

                            <div className="row g-4">
                                {rooms.map(room => (
                                    <div key={room.id} className="col-12 col-md-6 col-xl-4 align-self-stretch">
                                        <div className="card h-100 border-0 shadow-lg rounded-5 overflow-hidden group transition-all hover-scale bg-white">
                                            <div className="position-relative overflow-hidden" style={{ height: 260 }}>
                                                {room.urlImage ? (
                                                    <img src={room.urlImage.split(',')[0]} alt={room.type} className="w-100 h-100 object-fit-cover transition-all" style={{ transform: 'scale(1.02)' }} />
                                                ) : (
                                                    <div className="w-100 h-100 bg-dark bg-opacity-10 d-flex align-items-center justify-content-center">
                                                        <i className="bi bi-image text-muted display-1 opacity-25"></i>
                                                    </div>
                                                )}
                                                
                                                {/* Dark bottom gradient for legible title */}
                                                <div className="position-absolute bottom-0 start-0 w-100" style={{ height: '70%', background: 'linear-gradient(to top, rgba(15,23,42,0.9), transparent)' }}></div>

                                                {/* Top floating actions */}
                                                <div className="position-absolute top-0 end-0 m-3 d-flex gap-2">
                                                    <button className="btn btn-white text-dark btn-sm rounded-circle shadow-sm opacity-75 hover-opacity-100 transition-all hover-scale d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }} onClick={() => { setEditingRoom(room); setNewRoom(room); setShowAddRoom(true); }}>
                                                        <i className="bi bi-pencil-fill"></i>
                                                    </button>
                                                    <button
                                                        className={`btn btn-sm rounded-circle shadow-sm opacity-75 hover-opacity-100 transition-all hover-scale d-flex align-items-center justify-content-center ${room.dateDebutIndisponibilite ? 'btn-warning text-dark' : 'btn-white text-dark'}`}
                                                        style={{ width: 36, height: 36 }}
                                                        title={room.dateDebutIndisponibilite ? 'Gérer l\'indisponibilité (active)' : 'Définir une indisponibilité'}
                                                        onClick={() => openIndispoModal(room)}
                                                    >
                                                        <i className="bi bi-calendar-x-fill"></i>
                                                    </button>
                                                    <button className="btn btn-danger btn-sm rounded-circle shadow-sm opacity-75 hover-opacity-100 transition-all hover-scale d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }} onClick={() => handleDeleteRoom(room.id)}>
                                                        <i className="bi bi-trash-fill"></i>
                                                    </button>
                                                </div>

                                                {/* Title & Price overlay */}
                                                <div className="position-absolute bottom-0 start-0 w-100 p-4">
                                                    <div className="d-flex justify-content-between align-items-end">
                                                        <div>
                                                            <div className="badge bg-primary rounded-pill px-3 py-1 mb-2 fw-800">N° {room.numero}</div>
                                                            <h4 className="fw-900 text-white mb-0 text-uppercase letter-spacing-1">{ROOM_TYPE_LABELS[room.type] || room.type}</h4>
                                                        </div>
                                                        {/* Prix selon le type de chambre — couleurs forcées pour dark mode */}
                                                        {['QUADRUPLE','FAMILIALE','SUITE'].includes(room.type) ? (
                                                            <div className="rounded-3 px-3 py-2 shadow-lg text-end" style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(255,255,255,0.97)', minWidth: '120px' }}>
                                                                <div className="smaller fw-700 text-uppercase mb-1" style={{ color: '#64748b' }}>Prix libre</div>
                                                                <div>
                                                                    <span className="fw-900 fs-5" style={{ color: '#f97316' }}>{room.prixLibre || '—'}</span>
                                                                    {room.prixLibre ? <span className="fw-800 small ms-1" style={{ color: '#64748b' }}>DT</span> : null}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="rounded-3 px-3 py-2 shadow-lg text-end" style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(255,255,255,0.97)', minWidth: '150px' }}>
                                                                <div className="d-flex flex-column gap-1">
                                                                    <div className="d-flex justify-content-between align-items-center gap-3">
                                                                        <span className="smaller fw-700 text-uppercase" style={{ color: '#94a3b8' }}>Adulte</span>
                                                                        <span className="fw-900" style={{ color: '#f97316' }}>{room.prix} <small style={{ color: '#64748b' }}>DT</small></span>
                                                                    </div>
                                                                    <div className="d-flex justify-content-between align-items-center gap-3">
                                                                        <span className="smaller fw-700 text-uppercase" style={{ color: '#94a3b8' }}>Suppl.</span>
                                                                        <span className="fw-700" style={{ color: '#1e293b' }}>{room.prixParAdulte || '—'} {room.prixParAdulte ? <small style={{ color: '#64748b' }}>DT</small> : null}</span>
                                                                    </div>
                                                                    {room.prixLibre > 0 && (
                                                                        <div className="d-flex justify-content-between align-items-center gap-3" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '4px' }}>
                                                                            <span className="smaller fw-700 text-uppercase" style={{ color: '#94a3b8' }}>Libre</span>
                                                                            <span className="fw-700" style={{ color: '#1e293b' }}>{room.prixLibre} <small style={{ color: '#64748b' }}>DT</small></span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="card-body p-4 d-flex flex-column justify-content-between">
                                                <div>
                                                    <div className="d-flex justify-content-between align-items-center mb-4">
                                                        <div className="d-flex gap-2 w-100">
                                                            <div className="flex-fill bg-light rounded-pill px-3 py-2 text-center border">
                                                                <i className="bi bi-people-fill text-primary me-2"></i>
                                                                <span className="fw-800 text-dark small">{room.capacite} Pers. Max</span>
                                                            </div>
                                                            <div className="flex-fill bg-light rounded-pill px-3 py-2 text-center border">
                                                                <i className="bi bi-info-circle-fill text-dark me-2"></i>
                                                                <span className="fw-800 text-dark small">{room.disponible ? 'Disponible' : 'Occupée'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Badge indisponibilité */}
                                                    {room.dateDebutIndisponibilite && room.dateFinIndisponibilite && (() => {
                                                        const now = new Date();
                                                        const debut = new Date(room.dateDebutIndisponibilite);
                                                        const fin = new Date(room.dateFinIndisponibilite);
                                                        const isActive = debut <= now && fin >= now;
                                                        const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
                                                        return (
                                                            <div
                                                                className="d-flex align-items-center gap-2 rounded-3 px-3 py-2 mt-2 small fw-700"
                                                                style={isActive
                                                                    ? { background: '#fef3c7', border: '1px solid #fbbf24', color: '#92400e' }
                                                                    : { background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569' }
                                                                }
                                                            >
                                                                <i className={`bi ${isActive ? 'bi-calendar-x-fill' : 'bi-calendar-x'}`} style={{ color: isActive ? '#d97706' : '#64748b' }}></i>
                                                                <span>
                                                                    {isActive ? 'Indisponible jusqu\'au ' : 'Bloquée du '}
                                                                    <strong>{isActive ? formatDate(room.dateFinIndisponibilite) : `${formatDate(room.dateDebutIndisponibilite)} au ${formatDate(room.dateFinIndisponibilite)}`}</strong>
                                                                </span>
                                                            </div>
                                                        );
                                                    })()}
                                                    
                                                    <div className="d-flex gap-2 flex-wrap">
                                                        {room.aWifi !== false && <span className="badge bg-secondary bg-opacity-10 text-secondary border rounded-pill px-3 py-2 fw-700 shadow-sm"><i className="bi bi-wifi me-1 text-dark fs-6"></i> Wi-Fi</span>}
                                                        {room.aClimatisation !== false && <span className="badge bg-secondary bg-opacity-10 text-secondary border rounded-pill px-3 py-2 fw-700 shadow-sm"><i className="bi bi-snow me-1 text-info fs-6"></i> Clim</span>}
                                                        {room.aSmartTv && <span className="badge bg-secondary bg-opacity-10 text-secondary border rounded-pill px-3 py-2 fw-700 shadow-sm"><i className="bi bi-tv me-1 text-dark fs-6"></i> Smart TV</span>}
                                                        {room.aCoffreFort && <span className="badge bg-secondary bg-opacity-10 text-secondary border rounded-pill px-3 py-2 fw-700 shadow-sm"><i className="bi bi-safe me-1 text-warning fs-6"></i> Coffre</span>}
                                                        {room.aBureau && <span className="badge bg-secondary bg-opacity-10 text-secondary border rounded-pill px-3 py-2 fw-700 shadow-sm"><i className="bi bi-briefcase me-1 text-secondary fs-6"></i> Bureau</span>}
                                                        {room.aBalcon && <span className="badge bg-secondary bg-opacity-10 text-secondary border rounded-pill px-3 py-2 fw-700 shadow-sm"><i className="bi bi-building me-1 text-success fs-6"></i> Balcon</span>}
                                                        {room.aVueSurMer && <span className="badge bg-secondary bg-opacity-10 text-secondary border rounded-pill px-3 py-2 fw-700 shadow-sm"><i className="bi bi-tsunami me-1 text-primary fs-6"></i> Vue mer</span>}
                                                    </div>
                                                    {room.description && (
                                                        <p className="text-muted small fw-600 mt-3 mb-0 border-top pt-3" style={{ lineHeight: '1.6' }}>
                                                            <i className="bi bi-info-circle me-1" style={{ color: '#f97316' }}></i>{room.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {rooms.length === 0 && (
                                    <div className="col-12 py-5 my-4">
                                        <div className="bg-white rounded-5 shadow-sm p-4 p-md-5 text-center border-0 animate-in-y position-relative overflow-hidden">
                                            <div className="position-absolute top-0 start-0 w-100 bg-dark" style={{ height: '4px' }}></div>
                                            <div className="bg-light rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4 shadow-sm" style={{ width: 100, height: 100 }}>
                                                <i className="bi bi-stars display-4 text-dark"></i>
                                            </div>
                                            <h3 className="fw-900 text-dark mb-2 letter-spacing-1">Votre Collection est vide</h3>
                                            <p className="text-secondary fw-600 mb-4 px-md-5">Référencez chaque chambre de votre hôtel pour permettre aux touristes de réserver.</p>
                                            <button className="btn btn-lg rounded-pill px-5 py-3 fw-900 shadow-lg transition-all hover-scale d-inline-flex align-items-center gap-2 text-white" style={{ backgroundColor: '#f97316' }} onClick={() => setShowAddRoom(true)}>
                                                <i className="bi bi-plus-lg fs-5"></i> Ajouter ma première chambre
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 5. FORMULES */}
                    {activeSection === 'FORMULES' && (
                        <div className="card border-0 shadow-sm rounded-4 overflow-hidden animate-in-x">
                            <div className="card-header bg-white border-bottom py-3">
                                <h5 className="fw-800 text-dark mb-0">Configurations des Services (DT)</h5>
                            </div>
                            <div className="card-body p-4 p-md-5">
                                <div className="p-4 rounded-4 bg-info-subtle border border-info-subtle d-flex gap-4 mb-5">
                                    <div className="fs-2 text-info"><i className="bi bi-info-circle-fill"></i></div>
                                    <div>
                                        <p className="m-0 fw-700 text-dark">Gestion des Formules de Logement</p>
                                        <p className="m-0 text-secondary small lead">Les prix définis ci-dessous s'appliqueront par nuit et par personne en supplément du prix de base de la chambre choisie.</p>
                                    </div>
                                </div>

                                <div className="row g-4">
                                    {[
                                        { key: 'prixRO', label: 'Logement Seul (RO)', icon: 'bi-house-heart', desc: 'Hébergement uniquement, sans repas.' },
                                        { key: 'prixBB', label: 'Petit Déjeuner (BB)', icon: 'bi-cup-hot', desc: 'Nuitée avec petit déjeuner continental.' },
                                        { key: 'prixHB', icon: 'bi-egg-fried', label: 'Demi-Pension (HB)', desc: 'Petit déjeuner et dîner inclus.' },
                                        { key: 'prixFB', icon: 'bi-restaurant', label: 'Pension Complète (FB)', desc: 'Trois repas par jour inclus.' },
                                        { key: 'prixSoftAI', icon: 'bi-droplet', label: 'Soft All Inclusive', desc: 'Tout inclus avec boissons sans alcool.' },
                                        { key: 'prixAllInclusive', icon: 'bi-stars', label: 'All Inclusive Gold', desc: 'Expérience gastronomique complète illimitée.' }
                                    ].map(fType => (
                                        <div key={fType.key} className="col-12 col-md-6 col-lg-4">
                                            <div className="p-4 rounded-4 border group shadow-hover transition-all h-100 bg-white">
                                                <div className="d-flex align-items-center mb-3">
                                                    <div className="p-2 rounded-circle bg-light me-3 text-primary"><i className={`bi ${fType.icon} fs-5`}></i></div>
                                                    <div className="fw-800 text-dark small uppercase letter-spacing-1">{fType.label}</div>
                                                </div>
                                                <p className="text-muted smaller mb-4" style={{ height: '32px', overflow: 'hidden' }}>{fType.desc}</p>
                                                <div className="input-group input-group-lg bg-light rounded-3 overflow-hidden border">
                                                    <input
                                                        type="number"
                                                        className="form-control border-0 bg-transparent text-dark fw-700 p-3"
                                                        style={{ fontSize: '1.2rem' }}
                                                        placeholder="0.00"
                                                        value={profileForm?.[fType.key] ?? ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                                            setProfileForm(prev => ({ ...prev, [fType.key]: val }));
                                                        }}
                                                    />
                                                    <span className="input-group-text border-0 bg-transparent text-secondary fw-700 pe-3">DT</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="d-flex justify-content-end mt-5 pt-3 border-top">
                                    <button onClick={handleUpdateProfile} className="btn btn-primary btn-lg rounded-pill px-5 fw-800 shadow-sm transition-all hover-scale">
                                        Sauvegarder les tarifs
                                    </button>
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
                    providerType="HOTEL" 
                    providerData={hotel} 
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
            </main>
        </div>
        
        {/* DASHBOARD DETAILS MODAL (ESCAPED FROM PARENTS) */}
        {detailModal && (
            <div 
                className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
                style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', zIndex: 1050, padding: '2vh 2vw' }}
                onClick={(e) => { if (e.target === e.currentTarget) setDetailModal(null); }}
            >
                <div 
                    className={`${['FINANCES_CA','FINANCES_COMMISSION','FINANCES_NET','OFFLINE_CA'].includes(detailModal) ? 'bg-dark' : 'bg-white'} rounded-4 shadow-lg animate-in-y d-flex flex-column w-100`} 
                    style={{ width: '96vw', maxWidth: '1600px', maxHeight: '96vh', overflowY: 'auto' }}
                >
                    {getDetailModalContent()}
                </div>
            </div>
        )}
        {/* MODAL INDISPONIBILITÉ CHAMBRE */}
        {indispoModal && (
            <div
                className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
                style={{ backgroundColor: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(8px)', zIndex: 1060 }}
                onClick={(e) => { if (e.target === e.currentTarget) setIndispoModal(null); }}
            >
                <div className="bg-white rounded-4 shadow-lg animate-in-y p-0 overflow-hidden" style={{ width: '100%', maxWidth: '480px' }}>
                    {/* Header */}
                    <div className="d-flex align-items-center justify-content-between px-4 py-3" style={{ borderBottom: '2px solid #f1f5f9' }}>
                        <div className="d-flex align-items-center gap-3">
                            <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: 42, height: 42, background: 'linear-gradient(135deg,#f97316,#fb923c)' }}>
                                <i className="bi bi-calendar-x-fill text-white fs-5"></i>
                            </div>
                            <div>
                                <h6 className="fw-900 text-dark mb-0">Indisponibilité — N°&nbsp;{indispoModal.numero}</h6>
                                <small className="text-muted fw-600">{ROOM_TYPE_LABELS[indispoModal.type] || indispoModal.type}</small>
                            </div>
                        </div>
                        <button className="btn btn-light btn-sm rounded-circle" onClick={() => setIndispoModal(null)}>
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>

                    {indispoSuccess ? (
                        <div className="p-5 text-center animate-fade-in">
                            <div className="bg-success bg-opacity-10 text-success rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4 animate-scale-in" style={{ width: 80, height: 80 }}>
                                <i className="bi bi-check-circle-fill fs-1 text-success"></i>
                            </div>
                            <h5 className="fw-900 text-dark mb-2">Opération réussie !</h5>
                            <p className="text-secondary fw-700 mb-0">{indispoSuccess}</p>
                        </div>
                    ) : (
                        <div className="p-4">
                            {/* Statut actuel */}
                            {indispoModal.dateDebutIndisponibilite && indispoModal.dateFinIndisponibilite ? (
                                <div className="rounded-3 p-3 mb-4" style={{ background: '#fef3c7', border: '1px solid #fde68a' }}>
                                    <div className="d-flex align-items-center gap-2 mb-2">
                                        <i className="bi bi-exclamation-triangle-fill" style={{ color: '#ea580c' }}></i>
                                        <span className="fw-800 small" style={{ color: '#92400e' }}>Indisponibilité active</span>
                                    </div>
                                    <p className="mb-3 small fw-600" style={{ color: '#78350f' }}>
                                        Du <strong>{new Date(indispoModal.dateDebutIndisponibilite).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
                                        &nbsp;au <strong>{new Date(indispoModal.dateFinIndisponibilite).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
                                    </p>
                                    <button
                                        className="btn btn-sm rounded-pill px-4 fw-800"
                                        style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}
                                        onClick={handleRemoveIndispo}
                                        disabled={indispoLoading}
                                    >
                                        {indispoLoading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-calendar-check me-2"></i>}
                                        Remettre disponible
                                    </button>
                                </div>
                            ) : (
                                <div className="rounded-3 p-3 mb-4" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                                    <div className="d-flex align-items-center gap-2">
                                        <i className="bi bi-check-circle-fill" style={{ color: '#059669' }}></i>
                                        <span className="fw-700 small" style={{ color: '#065f46' }}>Aucune indisponibilité définie — chambre disponible</span>
                                    </div>
                                </div>
                            )}

                            {/* Formulaire */}
                            <label className="fw-800 text-secondary small text-uppercase mb-3 d-block" style={{ letterSpacing: '0.07em' }}>
                                <i className="bi bi-calendar3 me-2"></i>Définir une nouvelle période
                            </label>
                            <div className="row g-3 mb-4">
                                <div className="col-6">
                                    <label className="form-label fw-700 small text-muted mb-1">Date de début</label>
                                    <input
                                        type="date"
                                        className="form-control rounded-3 border fw-700"
                                        min={new Date().toISOString().split('T')[0]}
                                        value={indispoDebut}
                                        onChange={e => {
                                            setIndispoDebut(e.target.value);
                                            setIndispoError(null);
                                            setIndispoSuccess(null);
                                        }}
                                    />
                                </div>
                                <div className="col-6">
                                    <label className="form-label fw-700 small text-muted mb-1">Date de fin</label>
                                    <input
                                        type="date"
                                        className="form-control rounded-3 border fw-700"
                                        min={indispoDebut || new Date().toISOString().split('T')[0]}
                                        value={indispoFin}
                                        onChange={e => {
                                            setIndispoFin(e.target.value);
                                            setIndispoError(null);
                                            setIndispoSuccess(null);
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Messages retour */}
                            {indispoError && (
                                <div className="alert border rounded-3 small fw-700 mb-3 d-flex align-items-center gap-2" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' }}>
                                    <i className="bi bi-x-circle-fill" style={{ color: '#dc2626' }}></i> {indispoError}
                                </div>
                            )}

                            <div className="d-flex gap-3 justify-content-end">
                                <button className="btn btn-light rounded-pill px-4 fw-700" onClick={() => setIndispoModal(null)}>Annuler</button>
                                <button
                                    className="btn rounded-pill px-5 fw-800 text-white shadow-sm"
                                    style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)', border: 'none' }}
                                    onClick={handleSetIndispo}
                                    disabled={indispoLoading || !indispoDebut || !indispoFin}
                                >
                                    {indispoLoading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-calendar-x-fill me-2"></i>}
                                    Bloquer la chambre
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
        </>
    );
};

export default HotelDashboard;
