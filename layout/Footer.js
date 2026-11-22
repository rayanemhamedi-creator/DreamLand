import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Footer = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <footer className="footer-professional pt-5 pb-4 mt-5 bg-dark text-white-50">
            <div className="container-fluid px-lg-5">
                <div className="row gy-4">
                    <div className="col-lg-4 text-start">
                        <h3 className="fw-800 mb-3 d-inline-flex align-items-center" style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>
                            <img src="/logodreamland.png" alt="Logo" style={{ height: '80px', width: 'auto', objectFit: 'contain', marginRight: '-20px', marginLeft: '-30px', position: 'relative', top: '5px' }} />
                            <span>DreamLand</span>
                        </h3>
                        <p className="mb-4">{t('footer.about')}</p>
                        <div className="d-flex gap-3 fs-4 text-white">
                            <i className="bi bi-facebook ps-2 cursor-pointer"></i>
                            <i className="bi bi-instagram ps-2 cursor-pointer"></i>
                            <i className="bi bi-twitter ps-2 cursor-pointer"></i>
                        </div>
                    </div>
                    <div className="col-lg-2 offset-lg-1 text-start">
                        <h5 className="text-white fw-700 mb-4">{t('footer.navigation')}</h5>
                        <ul className="list-unstyled d-grid gap-2">
                            <li>
                                <button 
                                    onClick={() => { window.scrollTo({top: 0, behavior: 'smooth'}); navigate('/'); }} 
                                    className="btn btn-link text-white-50 text-decoration-none p-0 text-start"
                                >
                                    Accueil
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => navigate('/conditions')} 
                                    className="btn btn-link text-white-50 text-decoration-none p-0 text-start"
                                >
                                    Conditions générales
                                </button>
                            </li>
                            <li>
                                <button 
                                    onClick={() => navigate('/about')} 
                                    className="btn btn-link text-white-50 text-decoration-none p-0 text-start"
                                >
                                    À propos
                                </button>
                            </li>
                        </ul>
                    </div>
                    <div className="col-lg-3 text-start">
                        <h5 className="text-white fw-700 mb-4">{t('footer.contact')}</h5>
                        <p className="mb-2"><i className="bi bi-geo-alt me-2 text-primary"></i> Houmt Souk, Djerba, {t('footer.country')}</p>
                        <p className="mb-3"><i className="bi bi-envelope me-2 text-primary"></i> support@dreamland.com</p>
                        <button 
                            onClick={() => window.dispatchEvent(new CustomEvent('openContactAdmin'))}
                            className="btn btn-primary rounded-pill px-4 py-2 d-inline-flex align-items-center gap-2 hover-scale transition-all fw-700 text-white"
                            style={{ fontSize: '0.85rem', background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', border: 'none' }}
                        >
                            <i className="bi bi-chat-left-text-fill"></i> Contactez-nous
                        </button>
                    </div>
                </div>
                <div className="text-center pt-5 mt-5 border-top border-secondary">
                    <p className="small mb-0">&copy; 2026 DreamLand — {t('footer.credit')}</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
