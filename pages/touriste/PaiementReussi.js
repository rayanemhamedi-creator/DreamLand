// Page de confirmation affichée après un paiement Stripe réussi
// Stripe redirige vers cette URL (success_url) en ajoutant le paramètre ?session_id={CHECKOUT_SESSION_ID}
// Ce composant utilise ce session_id pour récupérer les détails de la réservation et générer un reçu
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Topbar from '../../components/layout/Topbar';
import reservationService from '../../services/reservationService';

const PaiementReussi = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language === 'ar' ? 'ar-TN' : i18n.language === 'en' ? 'en-US' : 'fr-FR';
    // Récupération des paramètres d'URL (ex: ?session_id=cs_test_xxx)
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session_id'); // Identifiant de session Stripe
    const [reservation, setReservation] = useState(null); // Données de la réservation correspondante
    const [loading, setLoading] = useState(true); // Chargement initial du reçu

    useEffect(() => {
        const fetchReservation = async () => {
            if (sessionId) {
                try {
                    const data = await reservationService.getReservationParSession(sessionId);
                    setReservation(data);
                } catch (err) {
                    console.error("Erreur lors de la récupération de la réservation:", err);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };
        fetchReservation();
    }, [sessionId]);

    // Déclenchement de l'impression du reçu via le navigateur
    const handlePrint = () => {
        window.print();
    };

    // Fonction de rendu réutilisable pour une ligne du reçu (libellé + valeur)
    const renderReceiptDetail = (label, value) => (
        <div className="d-flex justify-content-between mb-2">
            <span className="text-muted fw-600">{label}</span>
            <span className="fw-700 text-dark">{value || 'N/A'}</span>
        </div>
    );

    // Formattage de date avec l'API Intl pour un affichage localisé en français
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat(currentLang, {
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

    // Formattage de date sans l'heure
    const formatDateOnly = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat(currentLang, {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            }).format(date);
        } catch (e) {
            return dateString;
        }
    };



    return (
        <div className="min-vh-100 bg-light">
            <style>{`
                @media print {
                    header, nav, aside,
                    .btn-no-print,
                    .success-icon-wrapper,
                    .print-hide {
                        display: none !important;
                        visibility: hidden !important;
                        opacity: 0 !important;
                    }

                    body, .min-vh-100 {
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    .container {
                        max-width: 100% !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    .receipt-card {
                        box-shadow: none !important;
                        border: 1px solid #eee !important;
                        max-width: 100% !important;
                        width: 100% !important;
                        border-radius: 0 !important;
                        margin: 0 !important;
                        position: relative !important;
                        z-index: 9999 !important;
                    }

                    .card-receipt-header {
                        background-color: #000 !important;
                        color: #fff !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            `}</style>
            <Topbar className="print-hide" />
            <main className="container-fluid pt-2 pb-4 px-lg-5">
                <div className="container d-flex flex-column align-items-center py-5">

                    <div className="text-center mb-5 print-hide">
                        <div className="success-icon-wrapper mb-3">
                            <i className="bi bi-patch-check-fill text-success" style={{ fontSize: '80px' }}></i>
                        </div>
                        <h1 className="fw-800 text-dark mb-2">{t('payment.success_title', 'Paiement Réussi ! 🎉')}</h1>
                        <p className="text-muted fs-5">
                            {t('payment.success_desc', 'Votre réservation est désormais confirmée. Un reçu a été généré ci-dessous.')}
                        </p>
                    </div>

                    {loading ? (
                        <div className="text-center py-5 print-hide">
                            <div className="spinner-border text-primary" role="status"></div>
                            <p className="mt-3 fw-600">{t('payment.generating_receipt', 'Génération de votre reçu...')}</p>
                        </div>
                    ) : reservation ? (
                        <div className="card receipt-card border-0 shadow-lg rounded-5 p-0 mb-4 overflow-hidden" style={{ maxWidth: '700px', width: '100%' }}>
                            <div className="bg-dark p-4 text-white d-flex justify-content-between align-items-center card-receipt-header">
                                <div>
                                    <h4 className="mb-0 fw-800 letter-spacing-1">{t('payment.receipt_title', 'REÇU DE RÉSERVATION')}</h4>
                                    <small className="opacity-75">{t('payment.receipt_subtitle', 'DreamLand - Votre voyage commence ici')}</small>
                                </div>
                                <div className="text-end">
                                    <div className="fw-700">N° {String(reservation.id).padStart(6, '0')}</div>
                                    <small className="opacity-75">{formatDate(reservation.dateCreation)}</small>
                                </div>
                            </div>

                            <div className="p-4 p-md-5">
                                <div className="mb-4">
                                    <h6 className="text-uppercase fw-700 text-primary mb-3 letter-spacing-1">{t('payment.client_info', 'Informations Client')}</h6>
                                    {renderReceiptDetail(t('booking.full_name', 'Nom & Prénom'), `${reservation.clientPrenom} ${reservation.clientNom}`)}
                                    {renderReceiptDetail(t('booking.email', 'E-mail'), reservation.clientEmail)}
                                    {renderReceiptDetail(t('booking.phone', 'Téléphone'), reservation.clientTelephone)}
                                </div>

                                <hr className="my-4 opacity-10" />

                                <div className="mb-4">
                                    <h6 className="text-uppercase fw-700 text-primary mb-3 letter-spacing-1">{t('payment.service_details', 'Détails du Service')}</h6>
                                    {renderReceiptDetail(t('payment.service', 'Service'), reservation.serviceReserve)}

                                    {reservation.chambre && (
                                        <>
                                            {renderReceiptDetail(t('payment.room_type', 'Type de Chambre'), reservation.chambre.type)}
                                            {renderReceiptDetail(t('payment.rooms_count', 'Nombre de Chambres'), reservation.nombreChambres)}
                                            {renderReceiptDetail(t('payment.board_type', 'Type de Pension'), reservation.typeLogement)}
                                        </>
                                    )}

                                    {(reservation.nombreAdultes > 0 || reservation.nombreEnfants > 0) && (
                                        <div className="d-flex justify-content-between mb-2">
                                            <span className="text-muted fw-600">{t('payment.passengers', 'Passagers')}</span>
                                            <span className="fw-700 text-dark">
                                                {reservation.nombreAdultes} {t('payment.adults_count', 'Adulte(s)')} {reservation.nombreEnfants > 0 && `+ ${reservation.nombreEnfants} {t('payment.children_count', 'Enfant(s)')}`}
                                            </span>
                                        </div>
                                    )}

                                    {reservation.chambre
                                        ? renderReceiptDetail(t('payment.period', 'Période'), `${formatDateOnly(reservation.dateDebut)} - ${formatDateOnly(reservation.dateFin || reservation.dateDebut)}`)
                                        : renderReceiptDetail(t('payment.period', 'Période'), `${formatDate(reservation.dateDebut)} - ${formatDate(reservation.dateFin || reservation.dateDebut)}`)
                                    }


                                </div>

                                <hr className="my-4 border-2 border-dark" />

                                <div className="mb-0">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <h4 className="fw-800 text-dark mb-0">{t('payment.total_paid', 'Total Payé')}</h4>
                                        <div className="text-end">
                                            <span className="h3 fw-900 text-primary mb-0">{reservation.prixTotal} DT</span>
                                            <div className="small text-muted fw-600 mt-1">{t('payment.paid_by_card', 'Payé par Carte (Stripe)')}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-light p-3 text-center border-top">
                                <small className="text-muted">
                                    {t('payment.official_doc_part1', 'Ceci est un document officiel généré par DreamLand.')}
                                    {t('payment.official_doc_part2', 'Veuillez le présenter à votre arrivée.')}
                                </small>
                            </div>
                        </div>
                    ) : (
                        <div className="alert alert-warning rounded-4 print-hide">
                            {t('payment.load_error', 'Impossible de charger les détails du reçu. Veuillez consulter vos emails ou la section "Mes Réservations".')}
                        </div>
                    )}

                    <div className="d-flex flex-column flex-sm-row gap-3 mt-2 btn-no-print">
                        <button onClick={handlePrint} className="btn btn-dark btn-lg rounded-pill fw-700 px-5 shadow-sm">
                            <i className="bi bi-printer me-2"></i> {t('payment.print_receipt', 'Imprimer le reçu')}
                        </button>
                        <button onClick={() => navigate('/touriste/mes-reservations')} className="btn btn-primary btn-lg rounded-pill fw-800 px-5 shadow-sm">
                            {t('payment.my_reservations', 'Mes réservations')}
                        </button>
                        <button onClick={() => navigate('/touriste')} className="btn btn-outline-secondary btn-lg rounded-pill fw-700 px-4">
                            {t('common.back_home', "Retour à l'accueil")}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PaiementReussi;
