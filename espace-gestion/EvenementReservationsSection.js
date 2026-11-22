import React, { useState, useEffect, useContext } from 'react';
import api from '../../services/api';
import OfflineReservationModal from './ModaleReservationSurPlace';
import EditReservationModal from './ModaleModifierReservation';
import OfflineCancelModal from './ModaleAnnulationSurPlace';
import { ThemeContext } from '../../context/ThemeContext';

const EvenementReservationsSection = () => {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [resTab, setResTab] = useState('EN_LIGNE');
    const [showOfflineModal, setShowOfflineModal] = useState(false);
    const [reservFilter, setReservFilter] = useState('ALL');
    const [editTarget, setEditTarget] = useState(null);
    const [cancelTarget, setCancelTarget] = useState(null);

    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'dark';

    const cardBg = isDark ? '#1e293b' : 'white';
    const headerBg = isDark ? '#0f172a' : '#f8fafc';
    const textColor = isDark ? '#ffffff' : '#0f172a';
    const subTextColor = isDark ? '#f1f5f9' : '#1e293b';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
    const borderBottomColor = isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9';
    const ticketsBg = isDark ? '#334155' : '#f1f5f9';
    const ticketsColor = isDark ? '#f1f5f9' : '#000000';

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/reservations/mes-evenements');
            setReservations(res.data);
        } catch (err) {
            console.error("Erreur chargement réservations événements:", err);
        } finally { setLoading(false); }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) return (
        <div className="p-5 text-center">
            <div className="spinner-border text-primary me-2"></div>
            Chargement des réservations...
        </div>
    );

    const filtered = reservations
        .filter(r => (r.typeReservation || 'EN_LIGNE') === resTab)
        .filter(r => r.statutPaiement === 'PAYE')
        .filter(r => {
            if (reservFilter === 'ALL') return true;
            if (reservFilter === 'ANNULEE') return r.statut === 'ANNULEE' || r.etat === 'ANNULEE';
            if (reservFilter === 'PASSE') return r.statut === 'PASSEE';
            if (reservFilter === 'CONFIRMEE') return r.statut === 'CONFIRMEE';
            if (reservFilter === 'EN_COURS') return r.statut === 'EN_COURS';
            return true;
        });
    const grouped = filtered.reduce((acc, res) => {
        const evId = res.evenement?.id || 'unknown';
        if (!acc[evId]) {
            acc[evId] = {
                evenement: res.evenement,
                items: [],
                totalEvent: 0
            };
        }
        acc[evId].items.push(res);
        // Net revenue calculation: Subtract refunds for cancelled bookings
        const netAmount = (res.statut === 'ANNULEE' || res.etat === 'ANNULEE') 
            ? ((res.prixTotal || 0) - (res.montantRembourse || 0)) 
            : (res.prixTotal || 0);
        acc[evId].totalEvent += netAmount;
        return acc;
    }, {});

    return (
        <div style={{ padding: '0' }}>
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4 animate-in-x" style={{ background: cardBg }}>
                <div className="card-header border-bottom p-0" style={{ background: cardBg, borderColor: borderColor }}>
                    <div className="d-flex justify-content-between align-items-center p-4 border-bottom" style={{ borderColor: borderColor }}>
                        <div className="d-flex flex-column">
                            <h4 className="fw-800 mb-0" style={{ color: textColor }}>Gestion des Participations</h4>
                            <p className="text-muted small mb-0">Suivez les réservations et gérez vos listes de participants.</p>
                        </div>
                        <button 
                            className="btn btn-primary rounded-pill px-4 fw-800 shadow-sm"
                            onClick={() => setShowOfflineModal(true)}
                        >
                            <i className="bi bi-plus-circle-fill me-2"></i> Ajouter manuellement
                        </button>
                    </div>
                    <div className="d-flex px-3" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc' }}>
                        <button 
                            className={`btn btn-link py-3 px-4 text-decoration-none fw-800 transition-all ${resTab === 'EN_LIGNE' ? 'text-primary border-bottom border-3 border-primary' : 'text-muted'}`}
                            onClick={() => setResTab('EN_LIGNE')}
                        >
                            <i className="bi bi-globe me-2"></i>Participations En Ligne 
                            <span className="badge bg-primary-subtle text-primary rounded-pill ms-2">{reservations.filter(r => (r.typeReservation || 'EN_LIGNE') === 'EN_LIGNE' && r.statutPaiement === 'PAYE').length}</span>
                        </button>
                        <button 
                            className={`btn btn-link py-3 px-4 text-decoration-none fw-800 transition-all ${resTab === 'SUR_PLACE' ? 'text-primary border-bottom border-3 border-primary' : 'text-muted'}`}
                            onClick={() => setResTab('SUR_PLACE')}
                        >
                            <i className="bi bi-person-badge me-2"></i>Participations Sur Place
                            <span className="badge bg-info-subtle text-info rounded-pill ms-2">{reservations.filter(r => r.typeReservation === 'SUR_PLACE' && r.statutPaiement === 'PAYE').length}</span>
                        </button>
                    </div>
                    {/* FILTER PILLS */}
                    <div className="d-flex gap-2 p-3 border-top" style={{ background: cardBg, borderColor: borderColor }}>
                        {['ALL', 'EN_COURS', 'CONFIRMEE', 'PASSE', 'ANNULEE'].map(f => (
                            <button
                                key={f}
                                onClick={() => setReservFilter(f)}
                                className={`btn btn-sm rounded-pill px-3 fw-800 transition-all ${reservFilter === f ? (isDark ? 'btn-light' : 'btn-dark') : 'btn-outline-secondary'}`}
                            >
                                {f === 'ALL' ? 'Tous' : f === 'EN_COURS' ? 'En Cours' : f === 'CONFIRMEE' ? 'À venir' : f === 'PASSE' ? 'Passés' : 'Annulés'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {Object.values(grouped).sort((a, b) => {
                const dateA = a.evenement ? new Date(a.evenement.dateDebut) : 0;
                const dateB = b.evenement ? new Date(b.evenement.dateDebut) : 0;
                return dateB - dateA;
            }).map(group => {
                const isPast = group.evenement?.dateDebut && new Date(group.evenement.dateDebut) < new Date();
                
                return (
                    <div key={group.evenement?.id || Math.random()} style={{ background: cardBg, borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden', marginBottom: '40px', borderTop: `4px solid ${isPast ? '#ef4444' : '#10b981'}`, borderLeft: isDark ? `1px solid ${borderColor}` : 'none', borderRight: isDark ? `1px solid ${borderColor}` : 'none', borderBottom: isDark ? `1px solid ${borderColor}` : 'none' }}>
                    <div style={{ background: headerBg, padding: '25px 35px', borderBottom: `2px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ margin: 0, color: textColor, fontSize: '20px' }}>{group.evenement?.titre || "Événement inconnu"}</h3>
                            <div style={{ display: 'flex', gap: '15px', marginTop: '10px', fontSize: '13px', color: isPast ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                                <span>{isPast ? '❌' : '✅'} 📅 {group.evenement?.dateDebut ? new Date(group.evenement.dateDebut).toLocaleString() : 'N/A'}</span>
                                <span style={{ color: mutedColor, fontWeight: 'normal' }}>📍 {group.evenement?.lieu || 'Lieu non défini'}</span>
                            </div>
                        </div>
                        <div style={{ flexGrow: 1 }}></div>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '11px', color: mutedColor, textTransform: 'uppercase', fontWeight: '800', display:'block', marginBottom:'5px' }}>Total {resTab}</span>
                            <div style={{ fontSize: '28px', fontWeight: '900', color: '#10b981' }}>{group.totalEvent.toFixed(2)} DT</div>
                        </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: headerBg }}>
                            <tr>
                                <th style={{ ...thStyle, color: mutedColor }}>ID / Date Res</th>
                                <th style={{ ...thStyle, color: mutedColor }}>Client / Participant</th>
                                <th style={{ ...thStyle, color: mutedColor }}>Type</th>
                                <th style={{ ...thStyle, color: mutedColor, textAlign: 'center' }}>Statut</th>
                                <th style={{ ...thStyle, color: mutedColor, textAlign: 'center' }}>Tickets</th>
                                <th style={{ ...thStyle, color: mutedColor, textAlign: 'right' }}>Total Payé</th>
                                <th style={{ ...thStyle, color: mutedColor, textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {group.items.sort((a, b) => b.id - a.id).map(res => (
                                <tr key={res.id} style={{ borderBottom: `1px solid ${borderBottomColor}` }}>
                                    <td style={{ padding: '20px' }}>
                                        <div style={{ fontWeight: '700', color: textColor }}>RES-{res.id}</div>
                                        <div style={{ fontSize: '11px', color: mutedColor }}>{new Date(res.dateCreation || new Date()).toLocaleDateString()}</div>
                                    </td>
                                    <td style={{ padding: '20px' }}>
                                        <div style={{ fontWeight: '600', color: subTextColor }}>
                                            {res.clientNom || res.utilisateur?.nom} {res.clientPrenom || res.utilisateur?.prenom}
                                        </div>
                                        <div style={{ fontSize: '13px', color: mutedColor }}>
                                            📧 {res.clientEmail || res.utilisateur?.email || 'N/A'}<br/>
                                            📞 {res.clientTelephone || res.utilisateur?.telephone || '---'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '20px' }}>
                                        <span className={`badge rounded-pill px-2 py-1 ${res.typeReservation === 'SUR_PLACE' ? 'bg-info-subtle text-info' : 'bg-primary-subtle text-primary'}`}>
                                            {res.typeReservation || 'EN_LIGNE'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '20px', textAlign: 'center' }}>
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
                                                <i className="bi bi-play-circle-fill me-1"></i> Événement en cours
                                            </span>
                                        ) : (
                                            <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill px-3 py-2 fw-800 shadow-sm">
                                                <i className="bi bi-patch-check-fill me-1"></i> Confirmé
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: '20px', textAlign: 'center' }}>
                                        <span style={{ background: ticketsBg, color: ticketsColor, padding: '5px 12px', borderRadius: '15px', fontWeight: 'bold' }}>{res.nombrePersonnes} 🎟️</span>
                                    </td>
                                    <td style={{ padding: '20px', textAlign: 'right' }}>
                                        <div style={{ fontWeight: '900', color: '#10b981' }}>{(res.prixTotal || 0).toFixed(2)} DT</div>
                                        {(res.etat === 'ANNULEE' || res.statut === 'ANNULEE') && (
                                            <div className="badge rounded-pill bg-danger text-white smaller fw-800 mt-1 shadow-sm px-2">
                                                Remboursé: {res.montantRembourse || 0} DT
                                            </div>
                                        )}
                                    </td>
                                        <td style={{ padding: '20px', textAlign: 'right' }}>
                                            <div className="d-flex justify-content-end gap-2">
                                                <button 
                                                    className="btn btn-outline-primary btn-sm rounded-circle d-flex align-items-center justify-content-center shadow-sm hover-scale" 
                                                    style={{ width: 34, height: 34 }} 
                                                    onClick={() => window.open(`/receipt/${res.id}`, '_blank')}
                                                    title="Voir Reçu"
                                                >
                                                    <i className="bi bi-file-earmark-text-fill"></i>
                                                </button>
                                                {(res.statut === 'CONFIRMEE' || res.statut === 'EN_COURS' || res.etat === 'ACCEPTEE') && resTab === 'SUR_PLACE' && (
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
                </div>
                );
            })}

            {reservations.length === 0 && (
                <div style={{ background: cardBg, padding: '60px', borderRadius: '24px', textAlign: 'center', color: mutedColor, border: isDark ? `1px solid ${borderColor}` : 'none' }}>
                    <div style={{ fontSize: '50px', marginBottom: '15px' }}>📭</div>
                    <h3>Aucune réservation enregistrée pour vos événements.</h3>
                </div>
            )}

            <OfflineReservationModal 
                show={showOfflineModal}
                onClose={() => setShowOfflineModal(false)}
                onSuccess={fetchData}
                providerType="EVENEMENT"
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
        </div>
    );
};

const thStyle = {
    padding: '15px 20px',
    textAlign: 'left',
    fontSize: '11px',
    textTransform: 'uppercase',
    fontWeight: '800',
    letterSpacing: '0.05em'
};

export default EvenementReservationsSection;
