import React, { useState, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import PhoneInput from '../../components/common/PhoneInput';

// cache bust comment to force eslint reload

const Register = () => {
  const { register } = useContext(AuthContext);
  const { t } = useTranslation();
  
  const ROLE_OPTIONS = [
    { value: 'TOURISTE', label: 'Visiteur', icon: 'bi-person-hearts' },
    { value: 'HOTEL', label: t('home.category_hotel'), icon: 'bi-building' },
    { value: 'RESTAURANT', label: t('home.category_restaurant'), icon: 'bi-egg-fried' },
    { value: 'CAFE', label: 'Café', icon: 'bi-cup-hot' },
    { value: 'CINEMA', label: t('home.category_cinema'), icon: 'bi-camera-reels' },
    { value: 'SPORT', label: t('home.category_sport'), icon: 'bi-bicycle' },
    { value: 'GUIDE', label: t('home.category_guide'), icon: 'bi-compass' },
  ];
  const navigate = useNavigate();
  const [role, setRole] = useState('TOURISTE');
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [formData, setFormData] = useState({
    nom: '', prenom: '', email: '', telephone: '', motDePasse: '', confirmerMotDePasse: '',
    nomHotel: '', localisation: '', description: '',
    nomActivite: '', prix: 0, horaires: '', nombrePlaces: 10,
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const [validated, setValidated] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    if (formData.motDePasse !== formData.confirmerMotDePasse) {
      alert(t('auth.error_password_match') || "Les mots de passe ne correspondent pas !");
      return;
    }

    setValidated(true);
    // Afficher les conditions d'utilisation au lieu d'inscrire directement
    setShowTerms(true);
  };

  const executeRegistration = async () => {
    setLoading(true);
    try {
      const payload = {
        email: formData.email,
        telephone: formData.telephone,
        motDePasse: formData.motDePasse,
        role,
      };
      if (['TOURISTE', 'ADMIN', 'GUIDE'].includes(role)) {
        payload.nom = formData.nom;
        payload.prenom = formData.prenom;
      } else {
        if (role === 'HOTEL') payload.nom = formData.nomHotel;
        else if (role === 'SPORT') payload.nom = formData.nomActivite;
        else payload.nom = formData.nom;
        payload.prenom = '';
      }
      if (role === 'HOTEL') payload.nomHotel = formData.nomHotel;
      if (role === 'SPORT') {
        payload.nomActivite = formData.nomActivite;
        payload.prix = parseFloat(formData.prix);
      }
      if (['HOTEL', 'RESTAURANT', 'CAFE', 'CINEMA', 'SPORT', 'GUIDE'].includes(role)) {
        payload.localisation = formData.localisation;
        payload.description = formData.description;
      }
      const res = await register(payload);
      alert(t('auth.success_register') || 'Inscription réussie !');
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data || err.message;
      alert((t('common.error') || "Erreur : ") + (typeof msg === 'string' ? msg : (t('auth.error_generic') || 'Données invalides ou email déjà utilisé')));
      setShowTerms(false);
    } finally {
      setLoading(false);
    }
  };

  const isPrestataire = !['TOURISTE', 'ADMIN'].includes(role);

  return (
    <div className="auth-page">
      {/* Bouton Retour */}
      <button 
        type="button" 
        onClick={() => navigate('/')} 
        className="btn-back-auth-floating"
      >
        <i className="bi bi-arrow-left"></i> Retour
      </button>

      <div className="auth-card" style={{ maxWidth: 580 }}>
        {/* Logo */}
        <div className="text-center mb-4">
          <div className="auth-logo mb-1 d-flex align-items-center justify-content-center" style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>
            <img src="/logodreamland.png" alt="Logo" style={{ height: '80px', width: 'auto', objectFit: 'contain', marginRight: '-20px', marginLeft: '-30px', position: 'relative', top: '5px' }} />
            <span className="fw-800" style={{ color: 'var(--primary)' }}>DreamLand</span>
          </div>
          <h2>{t('auth.register_title') || 'Créer un compte'}</h2>
          <p className="text-muted small">{t('auth.register_subtitle') || 'Rejoignez la communauté DreamLand'}</p>
        </div>

        <form className={`needs-validation ${validated ? 'was-validated' : ''}`} noValidate onSubmit={handleSubmit} autoComplete="off">
          {/* Role selector */}
          <div className="mb-3">
            <label className="form-label">
              <i className="bi bi-person-badge me-1" />{t('auth.who_are_you') || 'Vous êtes ?'}
            </label>
            <div className="row g-2">
              {ROLE_OPTIONS.map(opt => (
                <div key={opt.value} className="col-6 col-sm-4">
                  <button
                    type="button"
                    onClick={() => setRole(opt.value)}
                    className={`w-100 text-center py-2 px-1 rounded-3 border d-flex flex-column align-items-center gap-1 ${role === opt.value
                      ? 'border-primary text-primary fw-700'
                      : 'border-light text-muted'
                      }`}
                    style={{
                      fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      background: role === opt.value ? '#fff7ed' : 'var(--bg-page)',
                      transition: '0.15s',
                    }}
                  >
                    <i className={`bi ${opt.icon}`} style={{ fontSize: 18 }} />
                    {opt.label}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Name fields */}
          {['TOURISTE', 'ADMIN', 'GUIDE'].includes(role) && (
            <div className="row g-3 mb-3">
              <div className="col-6">
                <label className="form-label"><i className="bi bi-person me-1" />{t('auth.last_name')}</label>
                <input name="nom" className="form-control" required onChange={handleChange} />
                <div className="invalid-feedback">{t('auth.error_name_req')}</div>
              </div>
              <div className="col-6">
                <label className="form-label"><i className="bi bi-person me-1" />{t('auth.first_name')}</label>
                <input name="prenom" className="form-control" required onChange={handleChange} />
                <div className="invalid-feedback">{t('auth.error_firstname_req')}</div>
              </div>
            </div>
          )}

          {role === 'HOTEL' && (
            <div className="mb-3">
              <label className="form-label"><i className="bi bi-building me-1" />{t('auth.hotel_name')}</label>
              <input name="nomHotel" className="form-control" required onChange={handleChange} />
              <div className="invalid-feedback">{t('auth.hotel_name')}</div>
            </div>
          )}
          {role === 'RESTAURANT' && (
            <div className="mb-3">
              <label className="form-label"><i className="bi bi-egg-fried me-1" />{t('auth.restaurant_name')}</label>
              <input name="nom" className="form-control" required onChange={handleChange} />
              <div className="invalid-feedback">{t('auth.restaurant_name')}</div>
            </div>
          )}
          {role === 'CAFE' && (
            <div className="mb-3">
              <label className="form-label"><i className="bi bi-cup-hot me-1" />{t('auth.cafe_name')}</label>
              <input name="nom" className="form-control" required onChange={handleChange} />
              <div className="invalid-feedback">{t('auth.cafe_name')}</div>
            </div>
          )}
          {role === 'CINEMA' && (
            <div className="mb-3">
              <label className="form-label"><i className="bi bi-camera-reels me-1" />{t('auth.cinema_name')}</label>
              <input name="nom" className="form-control" required onChange={handleChange} />
              <div className="invalid-feedback">{t('auth.cinema_name')}</div>
            </div>
          )}
          {role === 'SPORT' && (
            <div className="mb-3">
              <label className="form-label"><i className="bi bi-bicycle me-1" />{t('auth.activity_name')}</label>
              <input name="nomActivite" className="form-control" required onChange={handleChange} />
              <div className="invalid-feedback">{t('auth.activity_name')}</div>
            </div>
          )}

          {/* Common fields */}
          <div className="mb-3">
            <label className="form-label"><i className="bi bi-envelope me-1" />{t('auth.email')}</label>
            <input name="email" type="email" className="form-control" required placeholder={t('auth.email_placeholder')} autoComplete="off" onChange={handleChange} />
            <div className="invalid-feedback">{t('auth.error_email')}</div>
          </div>
          <div className="mb-3">
            <label className="form-label"><i className="bi bi-telephone me-1" />{t('auth.phone')}</label>
            {role === 'TOURISTE' ? (
              <PhoneInput
                value={formData.telephone}
                onChange={val => setFormData({ ...formData, telephone: val })}
                required
              />
            ) : (
              <input name="telephone" className="form-control" required minLength="8" maxLength="8" pattern="[0-9]{8}" onChange={handleChange} />
            )}
            <div className="invalid-feedback">{t('auth.error_phone')}</div>
          </div>
          <div className="mb-3">
            <label className="form-label"><i className="bi bi-lock me-1" />{t('auth.password')} (Min 6)</label>
            <input name="motDePasse" type="password" className="form-control" required minLength="6" autoComplete="new-password" onChange={handleChange} />
            <div className="invalid-feedback">{t('auth.error_password_min')}</div>
          </div>
          <div className="mb-3">
            <label className="form-label"><i className="bi bi-shield-lock me-1" />{t('auth.confirm_password')}</label>
            <input name="confirmerMotDePasse" type="password" className="form-control" required onChange={handleChange} />
            <div className="invalid-feedback">{t('auth.confirm_password')}</div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100 py-2 fw-700 mt-2"
            disabled={loading}
            style={{ borderRadius: 10, fontSize: 15 }}
          >
            {loading
              ? <><span className="spinner-border spinner-border-sm me-2" />{t('auth.registering') || 'Inscription en cours...'}</>
              : <><i className="bi bi-person-check me-2" />{t('auth.create_account') || 'Créer mon compte'}</>
            }
          </button>
        </form>

        <hr className="my-4" />
        <p className="text-center text-muted mb-0" style={{ fontSize: 14 }}>
          {t('auth.already_registered') || 'Déjà inscrit ?'}{' '}
          <Link to="/login" className="fw-700">{t('dashboard.login')}</Link>
        </p>
      </div>

      {/* Modal des conditions d'utilisation */}
      {showTerms && (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
            zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div className="bg-white rounded-4 shadow-lg overflow-hidden d-flex flex-column" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh' }}>
            <div className="p-4 border-bottom bg-light d-flex justify-content-between align-items-center">
              <h4 className="fw-800 mb-0 text-dark"><i className="bi bi-file-earmark-text text-primary me-2"></i>{t('auth.terms.title')}</h4>
              <button onClick={() => setShowTerms(false)} className="btn-close shadow-none"></button>
            </div>
            <div className="p-4 overflow-auto text-dark" style={{ flex: '1 1 auto' }}>
              <h5 className="fw-800 text-primary mb-3 d-inline-flex align-items-center" style={{ fontSize: '1.1rem' }}>
                Bienvenue sur
                <img src="/logodreamland.png" alt="Logo" style={{ height: '80px', width: 'auto', objectFit: 'contain', marginRight: '-20px', marginLeft: '-15px', position: 'relative', top: '5px' }} />
                <span style={{ color: 'var(--primary)' }}>DreamLand</span>
              </h5>
              <p className="text-muted">En créant un compte sur notre plateforme, vous acceptez de respecter les présentes Conditions Générales d'Utilisation (CGU).</p>
              
              <h6 className="fw-800 mt-4 text-dark"><i className="bi bi-shield-check text-success me-2"></i>1. Utilisation du Service</h6>
              <p className="text-muted small mb-3">
                DreamLand est une plateforme destinée à faciliter la mise en relation entre les touristes et les prestataires locaux de l'île de Djerba (Hôtels, Restaurants, Cafés, Cinémas, Sports et Guides). Vous vous engagez à utiliser la plateforme de manière légale, respectueuse et conformément à son but initial.
              </p>

              <h6 className="fw-800 mt-4 text-dark"><i className="bi bi-person-check text-success me-2"></i>2. Responsabilité des Utilisateurs</h6>
              <ul className="text-muted small mb-3 ps-3">
                <li className="mb-1"><strong>Touristes :</strong> Les réservations effectuées doivent être honorées. Tout abus ou comportement inapproprié pourra entraîner la suspension du compte.</li>
                <li className="mb-1"><strong>Prestataires :</strong> Vous êtes tenus de fournir des informations exactes concernant vos services, tarifs et disponibilités. Vous êtes seuls responsables de la qualité de la prestation fournie au client.</li>
              </ul>

              <h6 className="fw-800 mt-4 text-dark"><i className="bi bi-star text-success me-2"></i>3. Avis et Évaluations</h6>
              <p className="text-muted small mb-3">
                Les utilisateurs peuvent laisser des avis sur les services utilisés. Ces avis doivent être honnêtes, objectifs et ne contenir aucun propos diffamatoire, injurieux ou inapproprié. DreamLand se réserve le droit de modérer ou supprimer tout contenu ne respectant pas ces règles.
              </p>

              <h6 className="fw-800 mt-4 text-dark"><i className="bi bi-lock text-success me-2"></i>4. Protection des Données Personnelles</h6>
              <p className="text-muted small mb-3">
                Vos données personnelles (nom, email, téléphone) sont collectées dans le seul but de traiter vos réservations et d'améliorer votre expérience. Elles ne seront en aucun cas vendues à des tiers. Conformément à la législation, vous disposez d'un droit d'accès, de rectification et de suppression de vos données.
              </p>

              <h6 className="fw-800 mt-4 text-dark"><i className="bi bi-exclamation-triangle text-success me-2"></i>5. Limitation de Responsabilité</h6>
              <p className="text-muted small mb-3">
                DreamLand agit uniquement en tant qu'intermédiaire technique. Nous ne saurions être tenus responsables en cas d'annulation, de litige ou de dommage survenu lors de l'exécution d'une prestation entre un touriste et un prestataire.
              </p>

              <h6 className="fw-800 mt-4 text-dark"><i className="bi bi-x-circle text-success me-2"></i>6. Politique d'Annulation et de Remboursement</h6>
              <p className="text-muted small mb-2">
                Les réservations peuvent être annulées par le touriste depuis son tableau de bord. Sauf mention contraire spécifique définie par le prestataire, la politique de remboursement standard de DreamLand est la suivante :
              </p>
              <ul className="text-muted small mb-3 ps-3">
                <li className="mb-1"><strong>Annulation effectuée plus de 48 heures avant :</strong> Remboursement intégral (100%).</li>
                <li className="mb-1"><strong>Annulation effectuée entre 24h et 48 heures avant :</strong> Remboursement partiel (50% de pénalité).</li>
                <li className="mb-1"><strong>Annulation à moins de 24 heures ou non-présentation :</strong> Aucun remboursement n'est accordé.</li>
              </ul>
              <p className="text-muted small mb-3">
                Les prestataires s'engagent à traiter les annulations et les remboursements avec transparence en respectant ces conditions.
              </p>

              <h6 className="fw-800 mt-4 text-dark"><i className="bi bi-graph-up-arrow text-success me-2"></i>7. Commission de la Plateforme</h6>
              <p className="text-muted small">
                L'inscription sur DreamLand est gratuite. Néanmoins, pour assurer le fonctionnement et la promotion du site, l'administration prélève une <strong>commission fixe</strong> sur chaque réservation finalisée via la plateforme. Cette commission est déduite des revenus des prestataires et n'impacte pas le prix payé par le touriste.
              </p>
            </div>
            <div className="p-4 border-top bg-light d-flex gap-3 justify-content-end">
              <button onClick={() => setShowTerms(false)} className="btn btn-outline-secondary rounded-pill px-4 fw-700" disabled={loading}>
                {t('auth.terms.refuse_btn')}
              </button>
              <button onClick={executeRegistration} className="btn btn-primary rounded-pill px-4 fw-700 d-flex align-items-center" disabled={loading}>
                {loading ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-check-circle-fill me-2" />}
                {t('auth.terms.accept_btn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
