// Page affichée lorsque le touriste annule ou quitte la page Stripe Checkout
// Stripe redirige vers cette URL avec le paramètre cancel_url défini lors de la création de la session
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';

const PaiementAnnule = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    return (
        <div className="dashboard-wrapper">
             <Sidebar
                title="DreamLand 🌴"
                subtitle="Espace Touriste"
                iconClass="bi-compass"
                navItems={[
                    { id: 'DASHBOARD', label: t('sidebar.explore_djerba', 'Explorer Djerba'), icon: 'bi-grid-fill' },
                    { id: 'RESERVATIONS', label: t('sidebar.my_reservations', 'Mes Réservations'), icon: 'bi-calendar-check' },
                    { id: 'PROFILE', label: t('sidebar.my_profile', 'Mon Profil'), icon: 'bi-person-circle' },
                ]}
                activeSection="RESERVATIONS"
                onSectionChange={(id) => {
                    if (id === 'DASHBOARD') navigate('/touriste');
                    else if (id === 'PROFILE') navigate('/touriste/profile');
                    else if (id === 'RESERVATIONS') navigate('/touriste/mes-reservations');
                }}
            />
            <main className="dashboard-main p-4">
                <Topbar />
                <div className="container d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '70vh' }}>
                    <div className="card border-0 shadow-lg rounded-5 p-5 text-center" style={{ maxWidth: '600px' }}>
                        <div className="cancel-icon-wrapper mb-4">
                            <i className="bi bi-x-circle-fill text-warning" style={{ fontSize: '100px' }}></i>
                        </div>
                        <h1 className="fw-800 text-dark mb-3">{t('payment.cancelled_title', 'Paiement Annulé')}</h1>
                        <p className="text-muted fs-5 mb-4">
                            {t('payment.cancelled_desc_part1', "Votre paiement a été annulé et aucun montant n'a été débité.")} 
                            {t('payment.cancelled_desc_part2', 'Si vous avez rencontré un problème, vous pouvez réessayer plus tard.')}
                        </p>
                        <div className="d-grid gap-3">
                            <button 
                                onClick={() => navigate('/touriste/mes-reservations')} 
                                className="btn btn-primary btn-lg rounded-pill fw-800 shadow-sm py-3"
                            >
                                {t('payment.back_to_reservations', 'Revenir à mes réservations')}
                            </button>
                            <button 
                                onClick={() => navigate('/touriste')} 
                                className="btn btn-outline-secondary btn-lg rounded-pill fw-700 py-3"
                            >
                                {t('payment.explore_activities', "Explorer d'autres activités")}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PaiementAnnule;
