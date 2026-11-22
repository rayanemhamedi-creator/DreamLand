// Hooks React fondamentaux
import React, { useState, useContext, useEffect } from 'react';
// Hook de traduction pour le support multilingue (i18n)
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
// Contexte d'authentification pour accéder aux données du touriste connecté
import { AuthContext } from '../../context/AuthContext';
// Service REST de gestion des utilisateurs
import utilisateurService from '../../services/utilisateurService';
// Composants de mise en page
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import PhoneInput from '../../components/common/PhoneInput';

const ProfileTouriste = () => {
    // Récupération de l'utilisateur connecté et de la fonction de mise à jour du contexte global
    const { user, updateUser } = useContext(AuthContext);
    const { t } = useTranslation();
    const navigate = useNavigate();

    // Formulaire principal : modification des informations personnelles du touriste
    const [formData, setFormData] = useState({
        nom: '',
        prenom: '',
        email: '',
        telephone: ''
    });
    const [loading, setLoading] = useState(false); // Verrou pendant l'envoi du formulaire profil
    const [message, setMessage] = useState(null); // Message de succès ou d'erreur suite à la sauvegarde

    // Section sécurité : états pour le formulaire de changement de mot de passe
    const [pwdData, setPwdData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [pwdLoading, setPwdLoading] = useState(false); // Verrou pendant la requête de changement
    const [pwdMessage, setPwdMessage] = useState(null); // Feedback (succès/erreur) du changement

    // Pré-remplissage du formulaire dès que les données du contexte Auth sont disponibles
    useEffect(() => {
        if (user) {
            setFormData({
                nom: user.nom || '',
                prenom: user.prenom || '',
                email: user.email || '',
                telephone: user.telephone || ''
            });
        }
    }, [user]);

    // Soumission du formulaire de mise à jour du profil
    // Appel PUT vers l'API, puis synchronisation du contexte Auth global
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            const updatedUser = await utilisateurService.mettreAJourUtilisateur(user.id, {
                nom: formData.nom,
                prenom: formData.prenom,
                email: formData.email,
                telephone: formData.telephone
            });
            updateUser(updatedUser); // Mise à jour du contexte global pour reflet immédiat
            setMessage({ type: 'success', text: t('profile.success') });
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: t('profile.error') + (err.response?.data?.message || err.message) });
        } finally {
            setLoading(false);
        }
    };

    // Changement de mot de passe avec contrôle de cohérence côté client
    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (pwdData.newPassword !== pwdData.confirmPassword) {
            setPwdMessage({ type: 'error', text: t('profile.password_mismatch') });
            return;
        }
        setPwdLoading(true);
        setPwdMessage(null);
        try {
            await utilisateurService.changerMotDePasse(pwdData.oldPassword, pwdData.newPassword);
            setPwdMessage({ type: 'success', text: t('profile.password_success') });
            setPwdData({ oldPassword: '', newPassword: '', confirmPassword: '' }); // Réinitialisation
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.data || err.message;
            setPwdMessage({ type: 'error', text: '❌ ' + (typeof errorMsg === 'string' ? errorMsg : "Une erreur est survenue lors de la modification.") });
        } finally {
            setPwdLoading(false);
        }
    };

    if (loading && !user) return (
        <div className="loading-screen" style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner-border text-primary mb-3" role="status"></div>
            <h3 className="fw-700">{t('home.loading_services')}</h3>
        </div>
    );



    return (
        <div className="touriste-profile min-vh-100 bg-light">
            <Topbar />
            <main className="container-fluid py-4 px-lg-5">
                <header className="page-header d-flex align-items-center justify-content-between">
                    <h1 className="fw-800 mb-0">👤 {t('profile.title')}</h1>
                    <button onClick={() => navigate('/touriste')} className="btn btn-link text-decoration-none p-0 fw-700 text-primary d-flex align-items-center">
                        <i className="bi bi-arrow-left me-2"></i> Retour
                    </button>
                </header>

                <div className="row justify-content-center">
                    <div className="col-lg-8 animate-in-y">
                        <div className="card border-0 shadow-sm rounded-4 overflow-hidden transition-all shadow-hover">
                            <div className="card-body p-4 p-md-5">
                                <div className="text-center mb-5">
                                    <div className="profile-avatar-large mx-auto mb-3 bg-primary text-white d-flex align-items-center justify-content-center rounded-circle shadow-lg border border-3 border-white" style={{ width: '100px', height: '100px', fontSize: '40px', fontWeight: '800' }}>
                                        {user?.prenom?.[0] || 'T'}
                                    </div>
                                    <h2 className="fw-800 text-dark mb-1">{t('profile.settings_title')}</h2>
                                    <p className="text-muted small fw-600">{t('profile.settings_desc')}</p>
                                </div>

                                {message && (
                                    <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'} border-0 rounded-4 p-3 mb-4 shadow-sm`} role="alert">
                                        <div className="d-flex align-items-center">
                                            <i className={`bi ${message.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'} fs-4 me-2`}></i>
                                            <div className="fw-600">{message.text}</div>
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit}>
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <div className="form-floating mb-3">
                                                <input
                                                    type="text"
                                                    className="form-control rounded-3 border-0 bg-light shadow-none"
                                                    id="prenomInput"
                                                    placeholder="Prénom"
                                                    required
                                                    value={formData.prenom}
                                                    onChange={e => setFormData({ ...formData, prenom: e.target.value })}
                                                />
                                                <label htmlFor="prenomInput" className="text-muted fw-600 small ps-3">{t('profile.first_name')}</label>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="form-floating mb-3">
                                                <input
                                                    type="text"
                                                    className="form-control rounded-3 border-0 bg-light shadow-none"
                                                    id="nomInput"
                                                    placeholder="Nom"
                                                    required
                                                    value={formData.nom}
                                                    onChange={e => setFormData({ ...formData, nom: e.target.value })}
                                                />
                                                <label htmlFor="nomInput" className="text-muted fw-600 small ps-3">{t('profile.last_name')}</label>
                                            </div>
                                        </div>
                                        <div className="col-12">
                                            <div className="form-floating mb-3">
                                                <input
                                                    type="email"
                                                    className="form-control rounded-3 border-0 bg-light shadow-none"
                                                    id="emailInput"
                                                    placeholder="Email"
                                                    required
                                                    value={formData.email}
                                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                />
                                                <label htmlFor="emailInput" className="text-muted fw-600 small ps-3">{t('profile.email_label')}</label>
                                            </div>
                                        </div>
                                        <div className="col-12">
                                            <div className="mb-4">
                                                <label className="form-label text-muted fw-600 small mb-1">{t('profile.phone_label')}</label>
                                                <PhoneInput
                                                    value={formData.telephone}
                                                    onChange={val => setFormData({ ...formData, telephone: val })}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="col-12 mt-4">
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="btn btn-primary w-100 py-3 rounded-4 fw-800 shadow-sm border-0 transition-all hover-scale"
                                            >
                                                {loading ? (
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                ) : <i className="bi bi-person-check-fill me-2"></i>}
                                                {loading ? t('profile.saving') : t('profile.save_btn')}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Security Section */}
                        <div className="card border-0 shadow-sm rounded-4 overflow-hidden mt-4 shadow-hover">
                            <div className="card-body p-4 p-md-5">
                                <div className="d-flex align-items-center mb-4">
                                    <div className="bg-warning text-white p-2 rounded-3 me-3">
                                        <i className="bi bi-shield-lock-fill fs-4"></i>
                                    </div>
                                    <div>
                                        <h3 className="fw-800 text-dark mb-0">{t('profile.security_title')}</h3>
                                        <p className="text-muted small mb-0">{t('profile.security_desc')}</p>
                                    </div>
                                </div>

                                {pwdMessage && (
                                    <div className={`alert ${pwdMessage.type === 'success' ? 'alert-success' : 'alert-danger'} border-0 rounded-4 p-3 mb-4`} role="alert">
                                        <div className="fw-600">{pwdMessage.text}</div>
                                    </div>
                                )}

                                <form onSubmit={handlePasswordChange}>
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <div className="form-floating mb-3">
                                                <input
                                                    type="password"
                                                    className="form-control rounded-3 border-0 bg-light shadow-none"
                                                    id="oldPwd"
                                                    placeholder="Ancien mot de passe"
                                                    required
                                                    value={pwdData.oldPassword}
                                                    onChange={e => setPwdData({ ...pwdData, oldPassword: e.target.value })}
                                                />
                                                <label htmlFor="oldPwd">{t('profile.old_password')}</label>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="form-floating mb-3">
                                                <input
                                                    type="password"
                                                    className="form-control rounded-3 border-0 bg-light shadow-none"
                                                    id="newPwd"
                                                    placeholder="Nouveau mot de passe"
                                                    required
                                                    minLength={6}
                                                    value={pwdData.newPassword}
                                                    onChange={e => setPwdData({ ...pwdData, newPassword: e.target.value })}
                                                />
                                                <label htmlFor="newPwd">{t('profile.new_password')}</label>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="form-floating mb-3">
                                                <input
                                                    type="password"
                                                    className="form-control rounded-3 border-0 bg-light shadow-none"
                                                    id="confirmPwd"
                                                    placeholder="Confirmer"
                                                    required
                                                    value={pwdData.confirmPassword}
                                                    onChange={e => setPwdData({ ...pwdData, confirmPassword: e.target.value })}
                                                />
                                                <label htmlFor="confirmPwd">{t('profile.confirm_password')}</label>
                                            </div>
                                        </div>
                                        <div className="col-12 mt-3">
                                            <button
                                                type="submit"
                                                disabled={pwdLoading}
                                                className="btn btn-dark w-100 py-3 rounded-4 fw-800 shadow-sm border-0 transition-all hover-scale"
                                            >
                                                {pwdLoading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-key-fill me-2"></i>}
                                                {t('profile.change_password_btn')}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');
                .hover-scale:hover { transform: scale(1.02); transition: 0.2s; }
                .fw-800 { font-weight: 800; }
                .form-floating > .form-control:focus ~ label, 
                .form-floating > .form-control:not(:placeholder-shown) ~ label {
                    transform: scale(.85) translateY(-.75rem) translateX(.15rem);
                    color: #0ea5e9;
                }
            `}</style>
        </div>
    );
};

export default ProfileTouriste;
