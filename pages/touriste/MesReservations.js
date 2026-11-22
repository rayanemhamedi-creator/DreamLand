// Importation des hooks React
import React, { useEffect, useState, useContext } from 'react';
// Hook de traduction multilingue
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
// Service REST pour gérer les réservations (liste, annulation)
import reservationService from '../../services/reservationService';
// Composants de mise en page
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import { AuthContext } from '../../context/AuthContext';
// Modal de modification d'une réservation existante
import EditReservationModal from '../../components/espace-gestion/ModaleModifierReservation';
// Composant bouton de relance du paiement Stripe
import PaymentButton from '../../components/paiement/BoutonPaiement';

const MesReservations = () => {
    // Liste complète des réservations du touriste connecté
    const [reservations, setReservations] = useState([]);
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true); // Indicateur de chargement initial
    const [error, setError] = useState(null); // Message d'erreur en cas d'échec de chargement
    const [modal, setModal] = useState({ show: false, res: null }); // Modal de confirmation d'annulation
    const [editTarget, setEditTarget] = useState(null); // Réservation en cours d'édition
    const navigate = useNavigate();

    // Chargement des réservations au montage du composant
    useEffect(() => {
        loadReservations();
    }, []);

    // Appel API pour récupérer la liste des réservations du touriste connecté
    const loadReservations = async () => {
        try {
            setError(null);
            const data = await reservationService.getMesReservations();
            setReservations(data);
        } catch (err) {
            console.error("Erreur chargement réservations", err);
            setError(t('reservations.loading_error') || "Impossible de charger vos réservations.");
        } finally {
            setLoading(false);
        }
    };

    // Fonction utilitaire : extrait le type, le nom et la date d'une réservation
    // en inspectant les relations présentes (chambre, tableResto, film, sortie, événement, sport)
    const getResDetails = (res) => {
        if (res.chambre) return { type: 'Hôtel', nom: res.chambre.hotel?.nom || res.serviceReserve || 'Hôtel', date: `Du ${formatDate(res.dateDebut)} au ${formatDate(res.dateFin)}` };
        if (res.tableResto || res.restaurant) {
            const nomResto = res.restaurant?.utilisateur?.nom || res.tableResto?.restaurant?.utilisateur?.nom || res.serviceReserve || 'Restaurant';
            return { type: 'Restaurant/Café', nom: nomResto, date: `Le ${formatDate(res.dateDebut)}` };
        }
        if (res.film) return { type: 'Cinéma', nom: res.film.titre || res.serviceReserve || 'Film', date: `Le ${formatDate(res.dateDebut)}` };
        if (res.sortie) return { type: 'Sortie Guide', nom: res.sortie.titre || res.serviceReserve || 'Sortie', date: `Le ${formatDate(res.dateDebut)}` };
        if (res.evenement) return { type: 'Événement', nom: res.evenement.titre || res.serviceReserve || 'Événement', date: `Le ${formatDate(res.dateDebut)}` };
        if (res.sport) return { type: 'Sport/Matériel', nom: res.sport.nomActivite || res.serviceReserve || 'Sport', date: `Le ${formatDate(res.dateDebut)} (${res.nombreHeures}h)` };
        return { type: 'Autre', nom: res.serviceReserve || 'Inconnu', date: '-' };
    };

    // Formattage de date en français lisible
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // Ouverture du modal de confirmation d'annulation
    const handleCancelClick = (res) => {
        setModal({ show: true, res });
    };

    // Confirmation et exécution de l'annulation de la réservation
    const confirmCancel = async () => {
        try {
            await reservationService.annulerReservation(modal.res.id);
            setModal({ show: false, res: null });
            loadReservations(); // Rechargement de la liste après annulation
            alert(t('reservations.cancel_success') || "Réservation annulée avec succès.");
        } catch (err) {
            alert("Erreur : " + (err.response?.data || err.message));
        }
    };

    // Calcul de la politique de remboursement selon le délai avant le début du service
    // Règles : >= 48h -> 100%, entre 24h et 48h -> 50%, < 24h -> 0%
    const getRefundInfo = (dateDebut, prixTotal) => {
        const now = new Date();
        const start = new Date(dateDebut);
        const hoursDiff = (start - now) / (1000 * 60 * 60);

        if (hoursDiff >= 48) return { refund: 100, message: "Annulation plus de 48h avant : Remboursement total (100%)." };
        if (hoursDiff >= 24) return { refund: 50, message: "Annulation entre 24h et 48h : Remboursement partiel (50%)." };
        return { refund: 0, message: "Annulation moins de 24h avant : Aucun remboursement (0%)." };
    };

    if (loading) return (
        <div className="loading-screen">
            <div className="loading-spinner"></div>
            <h3 className="fw-700 mt-3 text-secondary">{t('home.loading_services')}</h3>
        </div>
    );



    return (
        <div className="touriste-reservations min-vh-100 bg-light">
            <Topbar />
            <main className="container-fluid py-4 px-lg-5">
                <header className="page-header d-flex align-items-center justify-content-between mb-4">
                    <h1 className="fw-800 mb-0">🧾 {t('reservations.title')}</h1>
                    <div className="d-flex gap-2">
                        <button onClick={loadReservations} className="btn btn-outline-success btn-sm rounded-pill px-3">
                            <i className="bi bi-arrow-clockwise me-1"></i> {t('reservations.refresh')}
                        </button>
                        <button onClick={() => navigate('/touriste')} className="btn btn-outline-primary btn-sm rounded-pill px-3">
                            <i className="bi bi-arrow-left me-1"></i> {t('reservations.back_explore')}
                        </button>
                    </div>
                </header>

                {error && (
                    <div className="alert alert-danger shadow-sm border-0 rounded-4 p-4 mb-4" role="alert">
                        <div className="d-flex align-items-center">
                            <i className="bi bi-exclamation-triangle-fill fs-3 me-3"></i>
                            <div>
                                <h5 className="alert-heading fw-700 mb-1">Erreur de chargement</h5>
                                <p className="mb-0">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <div className="card-body p-0">
                        {reservations.length === 0 ? (
                            <div className="text-center py-5">
                                <div className="display-1 text-muted opacity-25 mb-4"><i className="bi bi-calendar-x"></i></div>
                                <h3 className="fw-800">{t('reservations.no_reservations')}</h3>
                                <p className="text-muted">{t('reservations.no_reservations_desc')}</p>
                                <button onClick={() => navigate('/touriste')} className="btn btn-primary mt-3 px-4 rounded-pill fw-700">{t('reservations.explore_btn')}</button>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="bg-light text-muted small text-uppercase fw-700 letter-spacing-1">
                                        <tr>
                                            <th className="ps-4 py-3">{t('reservations.table.type')}</th>
                                            <th className="py-3">{t('reservations.table.establishment')}</th>
                                            <th className="py-3">{t('reservations.table.date')}</th>
                                            <th className="py-3">{t('reservations.table.price')}</th>
                                            <th className="py-3">{t('reservations.table.status')}</th>
                                            <th className="py-3">{t('reservations.table.payment')}</th>
                                            <th className="text-end pe-4 py-3">{t('reservations.table.actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reservations.map(res => {
                                            const details = getResDetails(res);
                                            return (
                                                <tr key={res.id} className="transition-all">
                                                    <td className="ps-4">
                                                        <span className="badge bg-primary-subtle text-primary rounded-pill px-3 py-2 fw-700">{details.type}</span>
                                                    </td>
                                                    <td>
                                                        <div className="fw-800 text-dark">{details.nom}</div>
                                                        {res.typeLogement && res.chambre && (
                                                            <div className="small text-success fw-600 mt-1">
                                                                <i className="bi bi-info-circle me-1"></i> {res.typeLogement}
                                                            </div>
                                                        )}
                                                        {res.menuProducts && res.menuProducts.length > 0 && (
                                                            <div className="d-flex flex-wrap gap-1 mt-1">
                                                                {res.menuProducts.map((mp, i) => (
                                                                    <span key={i} className="badge bg-light text-muted border smaller fw-600">
                                                                        {mp.menu?.nom} x{mp.quantite}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div className="fw-600 text-muted small"><i className="bi bi-clock me-1"></i> {details.date}</div>
                                                    </td>
                                                    <td>
                                                        <div className="fw-800 fs-5 text-dark">{res.prixTotal || 0} <small className="text-muted fs-6">DT</small></div>
                                                    </td>
                                                    <td>
                                                        <StatusBadge statut={res.statut} />
                                                    </td>
                                                    <td>
                                                        <PaymentBadge status={res.statutPaiement} />
                                                    </td>
                                                    <td className="text-end pe-4">
                                                        <div className="d-flex justify-content-end align-items-center gap-2">
                                                            {res.statutPaiement === 'PAYE' && res.statut !== 'ANNULEE' && (
                                                                <button 
                                                                    onClick={() => navigate(`/receipt/${res.id}`)}
                                                                    className="btn btn-sm btn-outline-success shadow-sm border-0 px-3 h-100"
                                                                >
                                                                    <i className="bi bi-file-earmark-text me-1"></i> {t('reservations.actions.view_receipt')}
                                                                </button>
                                                            )}
                                                            
                                                            {(res.statut === 'CONFIRMEE' || res.statut === 'EN_ATTENTE') && (
                                                                <>
                                                                    {res.statutPaiement === 'EN_ATTENTE' && (
                                                                        <PaymentButton reservationId={res.id} amount={res.prixTotal || 0} />
                                                                    )}
                                                                    <button
                                                                        onClick={() => setEditTarget(res)}
                                                                        className="btn btn-sm btn-outline-primary shadow-sm border-0 px-3 h-100"
                                                                    >
                                                                        <i className="bi bi-pencil-square me-1"></i> {t('reservations.actions.edit')}
                                                                    </button>
                                                                </>
                                                            )}
                                                            {res.statut === 'CONFIRMEE' && res.statutPaiement === 'PAYE' && (
                                                                <button 
                                                                    onClick={() => handleCancelClick(res)}
                                                                    className="btn btn-sm btn-outline-danger shadow-sm border-0 px-3 h-100"
                                                                >
                                                                    <i className="bi bi-x-circle me-1"></i> {t('reservations.actions.cancel')}
                                                                </button>
                                                            )}
                                                        </div>
                                                        {res.statut === 'ANNULEE' && (
                                                            <div className="text-danger small fw-700">
                                                                <i className="bi bi-cash-stack me-1"></i> Remboursé: {res.montantRembourse || 0} DT
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal de confirmation d'annulation */}
                {modal.show && (
                    <div className="modal-overlay">
                        <div className="modal-content border-0 shadow-lg p-0 rounded-5">
                            <div className="p-4 border-bottom d-flex justify-content-between align-items-center bg-danger-subtle rounded-top-5">
                                <h4 className="fw-800 text-danger mb-0">{t('reservations.cancel_modal.title')}</h4>
                                <button className="btn-close" onClick={() => setModal({ show: false, res: null })}></button>
                            </div>
                            <div className="p-4">
                                <p className="mb-4">{t('reservations.cancel_modal.confirm_text')} <strong className="text-dark">{getResDetails(modal.res).nom}</strong>.</p>
                                
                                <div className="alert alert-info border-0 rounded-4 d-flex align-items-start p-3 bg-light border-start border-primary border-4 shadow-sm mb-4">
                                    <i className="bi bi-info-circle-fill text-primary fs-4 me-3"></i>
                                    <div>
                                        <h6 className="fw-800 text-dark mb-1">{t('reservations.cancel_modal.policy_title')}</h6>
                                        <p className="small mb-0 text-muted">{getRefundInfo(modal.res.dateDebut, modal.res.prixTotal).message}</p>
                                    </div>
                                </div>

                                <div className="d-flex gap-3 mt-4">
                                    <button className="btn btn-light flex-grow-1 py-3 fw-700 rounded-4" onClick={() => setModal({ show: false, res: null })}>{t('common.back')}</button>
                                    <button className="btn btn-danger flex-grow-1 py-3 fw-700 rounded-4 shadow-sm" onClick={confirmCancel}>{t('reservations.cancel_modal.confirm_btn')}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
            <EditReservationModal
                show={!!editTarget}
                reservation={editTarget}
                onClose={() => setEditTarget(null)}
                onSuccess={() => { setEditTarget(null); loadReservations(); }}
            />
        </div>
    );
};

// Composant badge affichant le statut du paiement avec couleur et icône adaptées
const PaymentBadge = ({ status }) => {
    const { t } = useTranslation();
    let bgClass = "bg-warning-subtle text-warning";
    let label = t('reservations.payment_status.unpaid');
    let icon = "bi-credit-card";

    if (status === 'PAYE') {
        bgClass = "bg-success-subtle text-success";
        label = t('reservations.payment_status.paid');
        icon = "bi-check-all";
    } else if (status === 'ECHOUE') {
        bgClass = "bg-danger-subtle text-danger";
        label = t('reservations.payment_status.failed');
        icon = "bi-exclamation-octagon";
    } else if (status === 'ANNULE') {
        bgClass = "bg-secondary-subtle text-secondary";
        label = t('reservations.payment_status.cancelled');
        icon = "bi-dash-circle";
    }

    return (
        <span className={`badge rounded-pill ${bgClass} px-3 py-2 fw-700`}>
            <i className={`bi ${icon} me-1`}></i> {label}
        </span>
    );
};

// Composant badge affichant le statut de la réservation (EN_ATTENTE, CONFIRMEE, ANNULEE, PASSEE)
const StatusBadge = ({ statut }) => {
    const { t } = useTranslation();
    let bgClass = "bg-warning-subtle text-warning";
    let label = t('reservations.status.pending');
    let icon = "bi-hourglass-split";

    if (statut === 'CONFIRMEE') {
        bgClass = "bg-success-subtle text-success";
        label = t('reservations.status.confirmed');
        icon = "bi-check-circle-fill";
    } else if (statut === 'ANNULEE') {
        bgClass = "bg-danger-subtle text-danger";
        label = t('reservations.status.cancelled');
        icon = "bi-x-circle-fill";
    } else if (statut === 'PASSEE') {
        bgClass = "bg-secondary-subtle text-secondary";
        label = t('reservations.status.passed');
        icon = "bi-clock-history";
    }

    return (
        <span className={`badge rounded-pill ${bgClass} px-3 py-2 fw-700`}>
            <i className={`bi ${icon} me-1`}></i> {label}
        </span>
    );
};

export default MesReservations;
