import React from 'react';
import { useNavigate } from 'react-router-dom';
import PublicNavbar from '../components/layout/PublicNavbar';
import Footer from '../components/layout/Footer';

const Conditions = () => {
    const navigate = useNavigate();

    return (
        <div className="conditions-page d-flex flex-column min-vh-100">
            <PublicNavbar transparent={false} />
            
            <main className="flex-grow-1" style={{ paddingTop: '100px', paddingBottom: '60px', backgroundColor: 'var(--bg-page)' }}>
                <div className="container">
                    {/* Bouton Retour */}
                    <div className="mb-4 mx-auto" style={{ maxWidth: '800px' }}>
                        <button 
                            onClick={() => navigate(-1)} 
                            className="btn btn-outline-primary border-2 rounded-pill px-4 py-2 d-flex align-items-center gap-2 transition-all hover-scale"
                            style={{ fontWeight: '700', fontSize: '0.9rem' }}
                        >
                            <i className="bi bi-arrow-left"></i> Retour
                        </button>
                    </div>

                    <div className="rounded-4 shadow-sm border p-4 p-md-5 mx-auto" style={{ maxWidth: '800px', backgroundColor: 'var(--bg-card)' }}>
                        <div className="text-center mb-5 border-bottom pb-4">
                            <i className="bi bi-file-earmark-text text-primary fs-1 mb-3 d-inline-block"></i>
                            <h1 className="fw-900 mb-3" style={{ color: 'var(--text-main)' }}>Conditions Générales d'Utilisation</h1>
                        </div>

                        <div className="conditions-content" style={{ color: 'var(--text-main)' }}>
                            <h5 className="fw-800 text-primary mb-3 d-inline-flex align-items-center" style={{ fontSize: '1.1rem' }}>
                                Bienvenue sur
                                <img src="/logodreamland.png" alt="Logo" style={{ height: '80px', width: 'auto', objectFit: 'contain', marginRight: '-20px', marginLeft: '-15px', position: 'relative', top: '5px' }} />
                                <span style={{ color: 'var(--primary)' }}>DreamLand</span>
                            </h5>
                            <p className="text-muted lh-lg mb-4">
                                En créant un compte sur notre plateforme ou en utilisant nos services, vous acceptez de respecter les présentes Conditions Générales d'Utilisation (CGU).
                            </p>
                            
                            <h6 className="fw-800 mt-4 mb-3" style={{ color: 'var(--text-main)' }}><i className="bi bi-shield-check text-success me-2"></i>1. Utilisation du Service</h6>
                            <p className="text-muted lh-lg mb-4">
                                DreamLand est une plateforme destinée à faciliter la mise en relation entre les touristes et les prestataires locaux de l'île de Djerba (Hôtels, Restaurants, Cafés, Cinémas, Sports et Guides). Vous vous engagez à utiliser la plateforme de manière légale, respectueuse et conformément à son but initial.
                            </p>

                            <h6 className="fw-800 mt-4 mb-3" style={{ color: 'var(--text-main)' }}><i className="bi bi-person-check text-success me-2"></i>2. Responsabilité des Utilisateurs</h6>
                            <ul className="text-muted lh-lg mb-4 ps-4">
                                <li className="mb-2"><strong>Touristes :</strong> Les réservations effectuées doivent être honorées. Tout abus ou comportement inapproprié pourra entraîner la suspension du compte.</li>
                                <li className="mb-2"><strong>Prestataires :</strong> Vous êtes tenus de fournir des informations exactes concernant vos services, tarifs et disponibilités. Vous êtes seuls responsables de la qualité de la prestation fournie au client.</li>
                            </ul>

                            <h6 className="fw-800 mt-4 mb-3" style={{ color: 'var(--text-main)' }}><i className="bi bi-star text-success me-2"></i>3. Avis et Évaluations</h6>
                            <p className="text-muted lh-lg mb-4">
                                Les utilisateurs peuvent laisser des avis sur les services utilisés. Ces avis doivent être honnêtes, objectifs et ne contenir aucun propos diffamatoire, injurieux ou inapproprié. DreamLand se réserve le droit de modérer ou supprimer tout contenu ne respectant pas ces règles.
                            </p>

                            <h6 className="fw-800 mt-4 mb-3" style={{ color: 'var(--text-main)' }}><i className="bi bi-lock text-success me-2"></i>4. Protection des Données Personnelles</h6>
                            <p className="text-muted lh-lg mb-4">
                                Vos données personnelles (nom, email, téléphone) sont collectées dans le seul but de traiter vos réservations et d'améliorer votre expérience. Elles ne seront en aucun cas vendues à des tiers. Conformément à la législation, vous disposez d'un droit d'accès, de rectification et de suppression de vos données.
                            </p>

                            <h6 className="fw-800 mt-4 mb-3" style={{ color: 'var(--text-main)' }}><i className="bi bi-exclamation-triangle text-success me-2"></i>5. Limitation de Responsabilité</h6>
                            <p className="text-muted lh-lg mb-4">
                                DreamLand agit uniquement en tant qu'intermédiaire technique. Nous ne saurions être tenus responsables en cas d'annulation, de litige ou de dommage survenu lors de l'exécution d'une prestation entre un touriste et un prestataire.
                            </p>

                            <h6 className="fw-800 mt-4 mb-3" style={{ color: 'var(--text-main)' }}><i className="bi bi-x-circle text-success me-2"></i>6. Politique d'Annulation et de Remboursement</h6>
                            <p className="text-muted lh-lg mb-2">
                                Les réservations peuvent être annulées par le touriste depuis son tableau de bord. Sauf mention contraire spécifique définie par le prestataire, la politique de remboursement standard de DreamLand est la suivante :
                            </p>
                            <ul className="text-muted lh-lg mb-4 ps-4">
                                <li className="mb-2"><strong>Annulation effectuée plus de 48 heures avant :</strong> Remboursement intégral (100%).</li>
                                <li className="mb-2"><strong>Annulation effectuée entre 24h et 48 heures avant :</strong> Remboursement partiel (50% de pénalité).</li>
                                <li className="mb-2"><strong>Annulation à moins de 24 heures ou non-présentation :</strong> Aucun remboursement n'est accordé.</li>
                            </ul>
                            <p className="text-muted lh-lg mb-4">
                                Les prestataires s'engagent à traiter les annulations et les remboursements avec transparence en respectant ces conditions.
                            </p>

                            <h6 className="fw-800 mt-4 mb-3" style={{ color: 'var(--text-main)' }}><i className="bi bi-graph-up-arrow text-success me-2"></i>7. Commission de la Plateforme</h6>
                            <p className="text-muted lh-lg mb-4">
                                L'inscription sur DreamLand est gratuite. Néanmoins, pour assurer le fonctionnement et la promotion du site, l'administration prélève une <strong>commission fixe</strong> sur chaque réservation finalisée via la plateforme. Cette commission est déduite des revenus des prestataires et n'impacte pas le prix payé par le touriste.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Conditions;
