import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import PublicNavbar from '../components/layout/PublicNavbar';
import Footer from '../components/layout/Footer';
import './About.css';

const About = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalHotels: 0,
        totalRestaurants: 0,
        totalCafes: 0,
        totalCinemas: 0,
        totalGuides: 0,
        totalSports: 0,
        totalEvenements: 0,
        totalTouristes: 0
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axios.get('http://localhost:8080/api/utilisateurs/public-stats');
                setStats(res.data);
            } catch (err) {
                console.error("Failed to fetch public stats", err);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="about-page">
            {/* Hero Section */}
            <header className="about-hero" style={{ position: 'relative' }}>
                <PublicNavbar transparent={true} />
                
                {/* Bouton Retour - Positionné exactement en dessous du logo DreamLand */}
                <div className="back-btn-wrapper animate-in-y">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="btn btn-outline-light rounded-pill px-4 py-2 d-inline-flex align-items-center gap-2 hover-scale transition-all"
                        style={{ fontWeight: '700', fontSize: '0.9rem', borderColor: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}
                    >
                        <i className="bi bi-arrow-left"></i> Retour
                    </button>
                </div>

                <div className="container">
                    <div className="hero-content text-center animate-in-y">
                        <span className="badge bg-primary-subtle text-primary rounded-pill px-4 py-2 fw-800 mb-4">
                            {t('about.badge')}
                        </span>
                        <h1 className="display-3 fw-900 text-white mb-4">
                            {t('about.title_part1')} <br />
                            <span className="text-primary text-gradient">{t('about.title_part2')}</span>
                        </h1>
                        <p className="lead text-white-50 mx-auto" style={{ maxWidth: '700px' }}>
                            {t('about.subtitle')}
                        </p>
                    </div>
                </div>
            </header>

            <section className="mission-section py-5">
                <div className="container py-5">
                    <div className="row align-items-center g-5">
                        <div className="col-lg-7 animate-in-x">
                            <div className="stats-grid-about">
                                <div className="stat-card">
                                    <div className="stat-icon"><i className="bi bi-building"></i></div>
                                    <h2 className="fw-900 text-primary">{stats.totalHotels}</h2>
                                    <p className="text-muted fw-700 mb-0">{t('about.stats.hotels')}</p>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon"><i className="bi bi-cup-hot"></i></div>
                                    <h2 className="fw-900 text-primary">{stats.totalRestaurants}</h2>
                                    <p className="text-muted fw-700 mb-0">{t('about.stats.restaurants')}</p>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon"><i className="bi bi-cup-straw"></i></div>
                                    <h2 className="fw-900 text-primary">{stats.totalCafes}</h2>
                                    <p className="text-muted fw-700 mb-0">{t('about.stats.cafes')}</p>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon"><i className="bi bi-camera-reels"></i></div>
                                    <h2 className="fw-900 text-primary">{stats.totalCinemas}</h2>
                                    <p className="text-muted fw-700 mb-0">{t('about.stats.cinemas')}</p>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon"><i className="bi bi-map"></i></div>
                                    <h2 className="fw-900 text-primary">{stats.totalGuides}</h2>
                                    <p className="text-muted fw-700 mb-0">{t('about.stats.guides')}</p>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon"><i className="bi bi-bicycle"></i></div>
                                    <h2 className="fw-900 text-primary">{stats.totalSports}</h2>
                                    <p className="text-muted fw-700 mb-0">{t('about.stats.sports')}</p>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon"><i className="bi bi-balloon"></i></div>
                                    <h2 className="fw-900 text-primary">{stats.totalEvenements}</h2>
                                    <p className="text-muted fw-700 mb-0">{t('about.stats.events')}</p>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon"><i className="bi bi-people"></i></div>
                                    <h2 className="fw-900 text-primary">{stats.totalTouristes}+</h2>
                                    <p className="text-muted fw-700 mb-0">{t('about.stats.tourists')}</p>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-5">
                            <h6 className="text-primary fw-800 text-uppercase mb-3">{t('about.mission.badge')}</h6>
                            <h2 className="display-5 fw-800 mb-4">{t('about.mission.title')}</h2>
                            <p className="text-muted mb-4 lh-lg">
                                {t('about.mission.desc')}
                            </p>
                            <div className="d-flex flex-column gap-3">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="icon-check">
                                        <i className="bi bi-check-lg"></i>
                                    </div>
                                    <span className="fw-700 text-dark">{t('about.mission.item1')}</span>
                                </div>
                                <div className="d-flex align-items-center gap-3">
                                    <div className="icon-check">
                                        <i className="bi bi-check-lg"></i>
                                    </div>
                                    <span className="fw-700 text-dark">{t('about.mission.item2')}</span>
                                </div>
                                <div className="d-flex align-items-center gap-3">
                                    <div className="icon-check">
                                        <i className="bi bi-check-lg"></i>
                                    </div>
                                    <span className="fw-700 text-dark">{t('about.mission.item3')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Why Us Section */}
            <section className="why-us py-5 bg-light">
                <div className="container py-5">
                    <div className="text-center mb-5">
                        <h2 className="fw-900 mb-3">{t('about.why_us.title')}</h2>
                        <p className="text-muted mx-auto" style={{ maxWidth: '600px' }}>
                            {t('about.why_us.subtitle')}
                        </p>
                    </div>
                    <div className="row g-4">
                        {[
                            { icon: 'bi-shield-check', title: t('about.why_us.card1_title'), desc: t('about.why_us.card1_desc') },
                            { icon: 'bi-heart', title: t('about.why_us.card2_title'), desc: t('about.why_us.card2_desc') },
                            { icon: 'bi-lightning-charge', title: t('about.why_us.card3_title'), desc: t('about.why_us.card3_desc') },
                            { icon: 'bi-star', title: t('about.why_us.card4_title'), desc: t('about.why_us.card4_desc') }
                        ].map((item, idx) => (
                            <div className="col-md-6 col-lg-3" key={idx}>
                                <div className="feature-card text-center p-4">
                                    <div className="feature-icon mb-3 mx-auto">
                                        <i className={`bi ${item.icon}`}></i>
                                    </div>
                                    <h5 className="fw-800 mb-3">{item.title}</h5>
                                    <p className="text-muted small mb-0">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default About;
