// Composant d'affichage du reçu officiel d'une réservation
// Accessible aussi bien par les touristes que par les prestataires (adaptation du layout selon le rôle)
import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import reservationService from '../../services/reservationService';
import { AuthContext } from '../../context/AuthContext';

const RecuReservation = () => {
    // Identifiant de la réservation récupéré depuis l'URL
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [reservation, setReservation] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReservation = async () => {
            try {
                const data = await reservationService.getReservationParId(id);
                if (data && data.statut === 'ANNULEE') {
                    navigate('/touriste/mes-reservations');
                    return;
                }
                setReservation(data);
            } catch (err) {
                console.error("Erreur lors de la récupération du reçu:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchReservation();
    }, [id]);

    // Déclenchement de l'impression du reçu via le navigateur
    const handlePrint = () => {
        window.print();
    };

    // Formattage d'une date en format localisé français (jour mois année hh:mm)
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(date);
        } catch (e) {
            return dateString;
        }
    };

    // Formattage d'une date sans l'heure (pour les séjours hôtel : check-in / check-out)
    const formatDateOnly = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            }).format(date);
        } catch (e) {
            return dateString;
        }
    };

    // Rendu réutilisable d'une ligne de détail du reçu : libellé à gauche, valeur à droite
    const renderReceiptDetail = (label, value) => (
        <div className="d-flex justify-content-between mb-2">
            <span className="text-muted fw-600">{label}</span>
            <span className="fw-700 text-dark">{value || 'N/A'}</span>
        </div>
    );


    if (loading) return (
        <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '80vh' }}>
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-3 fw-700">Chargement du reçu...</p>
        </div>
    );

    // Table de correspondance rôle -> URL du dashboard de l'utilisateur
    const getDashboardUrl = () => {
        const redirects = {
            ADMIN: '/admin',
            TOURISTE: '/touriste',
            HOTEL: '/dashboard/hotel',
            RESTAURANT: '/dashboard/restaurant',
            CAFE: '/dashboard/restaurant',
            CINEMA: '/dashboard/culture',
            SPORT: '/dashboard/sport',
            GUIDE: '/dashboard/guide',
        };
        return redirects[role] || '/touriste';
    };

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate(getDashboardUrl());
        }
    };

    if (!reservation) return (
        <div className="container py-5 text-center">
            <div className="alert alert-danger rounded-4">Reçu non trouvé ou accès non autorisé.</div>
            <button onClick={handleBack} className="btn btn-primary rounded-pill px-4 mt-3">Retour</button>
        </div>
    );

    // Détection du rôle de l'utilisateur (nettoyage du préfixe ROLE_)
    const role = user?.role?.replace('ROLE_', '');
    // Les touristes ont une interface simplifiée sans sidebar
    const isTouriste = role === 'TOURISTE';

    const getProviderNavItems = () => {
        switch (role) {
            case 'HOTEL':
                return [
                    { id: 'DASHBOARD', label: 'Tableau de bord', icon: 'bi-grid-fill' },
                    { id: 'PROFILE', label: 'Profil de l\'hôtel', icon: 'bi-building' },
                    { id: 'RESERVATIONS', label: 'Liste des réservations', icon: 'bi-calendar-check' },
                    { id: 'ROOMS', label: 'Gestion des chambres', icon: 'bi-door-open' },
                    { id: 'PENSIONS', label: 'Formules de Logement', icon: 'bi-cup-hot' },
                    { id: 'EVENTS', label: 'Mes Événements', icon: 'bi-stars' },
                    { id: 'EVENT_RESERVATIONS', label: 'Réservations Événements', icon: 'bi-ticket-perforated' },
                ];
            case 'RESTAURANT':
            case 'CAFE':
                return [
                    { id: 'DASHBOARD', label: 'Tableau de bord', icon: 'bi-grid-fill' },
                    { id: 'PROFILE', label: 'Profil du Restaurant', icon: 'bi-shop' },
                    { id: 'RESERVATIONS', label: 'Réservations Tables', icon: 'bi-calendar-check' },
                    { id: 'TABLES', label: 'Gestion des Tables', icon: 'bi-layout-three-columns' },
                    { id: 'MENU', label: 'Menu Digital', icon: 'bi-book' },
                    { id: 'EVENTS', label: 'Mes Événements', icon: 'bi-stars' },
                    { id: 'EVENT_RESERVATIONS', label: 'Réservations Événements', icon: 'bi-ticket-perforated' },
                ];
            case 'CINEMA':
                return [
                    { id: 'DASHBOARD', label: 'Tableau de bord', icon: 'bi-grid-fill' },
                    { id: 'PROFILE', label: 'Profil du Cinéma', icon: 'bi-camera-reels' },
                    { id: 'FILMS', label: 'Programmation Films', icon: 'bi-film' },
                    { id: 'RESERVATIONS', label: 'Billets & Ventes', icon: 'bi-ticket-perforated' },
                ];
            case 'SPORT':
                return [
                    { id: 'DASHBOARD', label: 'Tableau de bord', icon: 'bi-grid-fill' },
                    { id: 'PROFILE', label: 'Profil Centre Sportif', icon: 'bi-bicycle' },
                    { id: 'SPORTS', label: 'Activités & Matériel', icon: 'bi-dribbble' },
                    { id: 'RESERVATIONS', label: 'Suivi des Sessions', icon: 'bi-calendar-check' },
                ];
            case 'GUIDE':
                return [
                    { id: 'DASHBOARD', label: 'Tableau de bord', icon: 'bi-grid-fill' },
                    { id: 'PROFILE', label: 'Profil Guide / Agence', icon: 'bi-compass' },
                    { id: 'CIRCUITS', label: 'Mes Sorties & Circuits', icon: 'bi-map' },
                    { id: 'RESERVATIONS', label: 'Liste des Participants', icon: 'bi-people' },
                    { id: 'EVENTS', label: 'Mes Événements', icon: 'bi-stars' },
                    { id: 'EVENT_RESERVATIONS', label: 'Réservations Événements', icon: 'bi-ticket-perforated' },
                ];
            default:
                return [{ id: 'DASHBOARD', label: 'Tableau de bord', icon: 'bi-speedometer2' }];
        }
    };

    const renderReceiptCard = () => (
        <div className="card receipt-card border-0 shadow-lg rounded-5 p-0 mb-4 overflow-hidden" style={{ maxWidth: '700px', width: '100%' }}>
            <div className="bg-dark p-4 text-white d-flex justify-content-between align-items-center card-receipt-header">
                <div>
                    <h4 className="mb-0 fw-800 letter-spacing-1">REÇU DE RÉSERVATION</h4>
                    <small className="opacity-75">DreamLand - Votre voyage commence ici</small>
                </div>
                <div className="text-end">
                    <div className="fw-700">N° {String(reservation.id).padStart(6, '0')}</div>
                    <small className="opacity-75">{formatDate(reservation.dateCreation)}</small>
                </div>
            </div>

            <div className="p-4 p-md-5">
                <div className="mb-4">
                    <h6 className="text-uppercase fw-700 text-primary mb-3 letter-spacing-1">Informations Client</h6>
                    {renderReceiptDetail("Nom & Prénom", `${reservation.clientPrenom || ''} ${reservation.clientNom || ''}`)}
                    {renderReceiptDetail("E-mail", reservation.clientEmail || reservation.touriste?.email)}
                    {renderReceiptDetail("Téléphone", reservation.clientTelephone)}
                </div>

                <hr className="my-4 opacity-10" />

                <div className="mb-4">
                    <h6 className="text-uppercase fw-700 text-primary mb-3 letter-spacing-1">Détails du Service</h6>
                    {renderReceiptDetail("Service", reservation.serviceReserve)}

                    {reservation.chambre && (
                        <>
                            {renderReceiptDetail("Hôtel",
                                reservation.chambre?.hotel?.nom ||
                                reservation.chambre?.hotel?.utilisateur?.nom ||
                                reservation.serviceReserve ||
                                'N/A'
                            )}
                            {renderReceiptDetail("Type de Chambre", reservation.chambre?.type)}
                            {renderReceiptDetail("Nombre de Chambres", reservation.nombreChambres)}
                            {renderReceiptDetail("Type de Pension", reservation.typeLogement)}
                        </>
                    )}

                    {reservation.evenement && (
                        <>
                            {renderReceiptDetail("Événement", reservation.evenement.titre)}
                            {renderReceiptDetail("Organisé par", reservation.evenement.nomOrganisateur || "DreamLand")}
                            {renderReceiptDetail("Nombre de Tickets", reservation.nombrePersonnes)}
                        </>
                    )}

                    {reservation.film && (
                        <>
                            {renderReceiptDetail("Film", reservation.film.titre)}
                            {renderReceiptDetail("Nombre de Billets", reservation.nombrePersonnes)}
                        </>
                    )}

                    {reservation.tableResto && (
                        <>
                            {renderReceiptDetail("Restaurant", reservation.tableResto?.restaurant?.nom || reservation.tableResto?.restaurant?.prenom || 'N/A')}
                            {renderReceiptDetail("Nombre de Personnes", reservation.nombrePersonnes)}
                            {reservation.menuProducts && reservation.menuProducts.length > 0 && (
                                <div className="mt-4 animate-in-y">
                                    <h6 className="text-uppercase fw-700 text-primary mb-3 letter-spacing-1 small">Menu & Consommations</h6>
                                    <div className="bg-light rounded-4 p-3 border">
                                        <table className="table table-sm table-borderless mb-0">
                                            <thead className="border-bottom">
                                                <tr className="smaller text-muted fw-700 text-uppercase">
                                                    <th>Produit</th>
                                                    <th className="text-center">Qté</th>
                                                    <th className="text-end">Prix</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reservation.menuProducts.map((mp, idx) => (
                                                    <tr key={idx} className="small">
                                                        <td className="fw-600">{mp.menu?.nom}</td>
                                                        <td className="text-center fw-600">x{mp.quantite}</td>
                                                        <td className="text-end fw-700">{(mp.prixUnitaire * mp.quantite).toFixed(2)} DT</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {reservation.sport && (
                        <>
                            {renderReceiptDetail("Activité", reservation.sport.nomActivite)}
                            {renderReceiptDetail("Équipement/Quantité", reservation.nombreMateriel)}
                        </>
                    )}

                    {reservation.sortie && (
                        <>
                            {renderReceiptDetail("Circuit", reservation.sortie.titre)}
                            {renderReceiptDetail("Participants", reservation.nombrePersonnes)}
                        </>
                    )}

                    {(reservation.nombreAdultes > 0 || reservation.nombreEnfants > 0) && reservation.chambre && (
                        <>
                            <div className="d-flex justify-content-between mb-2">
                                <span className="text-muted fw-600">Passagers</span>
                                <span className="fw-700 text-dark">
                                    {reservation.nombreAdultes} Adulte(s) {reservation.nombreEnfants > 0 && `+ ${reservation.nombreEnfants} Enfant(s)`}
                                </span>
                            </div>
                            {reservation.listeCompagnons && (
                                <div className="mt-3 bg-light p-3 rounded-4 border animate-in-y">
                                    <div className="small fw-800 text-muted mb-2 text-uppercase letter-spacing-1" style={{ fontSize: '0.7rem' }}>Noms des adultes supplémentaires</div>
                                    <div className="d-flex flex-wrap gap-2">
                                        {(() => {
                                            try {
                                                const comps = JSON.parse(reservation.listeCompagnons);
                                                return comps.map((c, i) => (
                                                    <span key={i} className="badge bg-white text-dark border shadow-sm p-2 px-3 fw-600 d-flex align-items-center">
                                                        <i className="bi bi-person me-2 text-primary opacity-75"></i>
                                                        {c.prenom} {c.nom} {c.chambre ? <span className="opacity-50 ms-1">(Ch. {c.chambre})</span> : ''}
                                                    </span>
                                                ));
                                            } catch (e) { return null; }
                                        })()}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {reservation.chambre
                        ? renderReceiptDetail("Période", `${formatDateOnly(reservation.dateDebut)} - ${formatDateOnly(reservation.dateFin || reservation.dateDebut)}`)
                        : renderReceiptDetail("Période", `${formatDate(reservation.dateDebut)} - ${formatDate(reservation.dateFin || reservation.dateDebut)}`)
                    }
                </div>

                <hr className="my-4 border-2 border-dark" />

                <div className="mb-0">
                    <div className="d-flex justify-content-between align-items-center">
                        <h4 className="fw-800 text-dark mb-0">Total Payé</h4>
                        <div className="text-end">
                            <span className="h3 fw-900 text-primary mb-0">{reservation.prixTotal} DT</span>
                            <div className="small text-muted fw-600 mt-1">
                                {reservation.typeReservation === 'SUR_PLACE' ? 'Payé sur place (Espèces)' : 'Payé par Carte (Stripe)'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-light p-3 text-center border-top">
                <small className="text-muted">
                    Ceci est un document officiel généré par DreamLand.
                    Veuillez le présenter à votre arrivée.
                </small>
            </div>
        </div>
    );

    if (isTouriste) {
        return (
            <div className="touriste-receipt min-vh-100 bg-light">
                <style>{`
                    @media print {
                        header, nav, aside, .dashboard-sidebar, .dashboard-topbar, .topbar-wrapper,
                        .sidebar-wrapper, .user-profile-top, .user-info-wrapper, .notification-bell,
                        .sidebar-toggle, .btn-no-print, .success-icon-wrapper, .print-hide,
                        .topbar-right, .user-profile-nav, .page-header {
                            display: none !important;
                        }
                        body, .touriste-receipt {
                            background: white !important;
                            margin: 0 !important;
                            padding: 0 !important;
                        }
                        .container { max-width: 100% !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
                        .receipt-card {
                            box-shadow: none !important; border: 1px solid #eee !important;
                            max-width: 100% !important; width: 100% !important; border-radius: 0 !important;
                            margin: 0 !important; position: relative !important; z-index: 9999 !important;
                        }
                        .card-receipt-header {
                            background-color: #000 !important; color: #fff !important;
                            -webkit-print-color-adjust: exact; print-color-adjust: exact;
                        }
                    }
                `}</style>

                <Topbar className="print-hide" />

                <main className="container d-flex flex-column align-items-center py-4 px-lg-5">
                    <header className="page-header d-flex align-items-center justify-content-between mb-4 w-100 print-hide" style={{ maxWidth: '700px' }}>
                        <h2 className="fw-800 mb-0">Reçu Officiel</h2>
                        <button onClick={handleBack} className="btn btn-outline-secondary btn-sm rounded-pill px-3">
                            <i className="bi bi-arrow-left me-1"></i> Retour
                        </button>
                    </header>

                    {renderReceiptCard()}

                    <div className="btn-no-print w-100 d-flex justify-content-center">
                        <button onClick={handlePrint} className="btn btn-dark btn-lg rounded-pill fw-700 px-5 shadow-sm">
                            <i className="bi bi-printer me-2"></i> Imprimer le reçu
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="dashboard-wrapper">
            <style>{`
                @media print {
                    header, nav, aside, .dashboard-sidebar, .dashboard-topbar, .topbar-wrapper,
                    .sidebar-wrapper, .user-profile-top, .user-info-wrapper, .notification-bell,
                    .sidebar-toggle, .btn-no-print, .success-icon-wrapper, .print-hide,
                    .topbar-right, .user-profile-nav, .page-header {
                        display: none !important;
                    }
                    body, .dashboard-wrapper, .dashboard-main {
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .dashboard-main { padding: 0 !important; margin: 0 !important; display: block !important; width: 100% !important; }
                    .container { max-width: 100% !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
                    .receipt-card {
                        box-shadow: none !important; border: 1px solid #eee !important;
                        max-width: 100% !important; width: 100% !important; border-radius: 0 !important;
                        margin: 0 !important; position: relative !important; z-index: 9999 !important;
                    }
                    .card-receipt-header {
                        background-color: #000 !important; color: #fff !important;
                        -webkit-print-color-adjust: exact; print-color-adjust: exact;
                    }
                }
            `}</style>

            <Sidebar
                title="DreamLand 🌴"
                subtitle="Espace Prestataire"
                iconClass="bi-compass"
                navItems={getProviderNavItems()}
                activeSection="DASHBOARD"
                onSectionChange={(id) => {
                    navigate(getDashboardUrl(), { state: { activeSection: id } });
                }}
            />

            <main className="dashboard-main p-4">
                <div className="container d-flex flex-column align-items-center py-4">
                    <header className="page-header d-flex align-items-center justify-content-between mb-4 w-100 print-hide" style={{ maxWidth: '700px' }}>
                        <h2 className="fw-800 mb-0">Reçu Officiel</h2>
                        <button onClick={handleBack} className="btn btn-outline-secondary btn-sm rounded-pill px-3">
                            <i className="bi bi-arrow-left me-1"></i> Retour
                        </button>
                    </header>

                    {renderReceiptCard()}

                    <div className="btn-no-print w-100 d-flex justify-content-center">
                        <button onClick={handlePrint} className="btn btn-dark btn-lg rounded-pill fw-700 px-5 shadow-sm">
                            <i className="bi bi-printer me-2"></i> Imprimer le reçu
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default RecuReservation;
