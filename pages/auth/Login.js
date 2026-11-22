import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../../context/AuthContext';

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [error, setError] = useState('');   // États pour gestion des erreurs et chargement
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);   // État pour afficher / masquer le mot de passe
  const [validated, setValidated] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    setValidated(true);
    setError('');
    setLoading(true);
    try {
      const user = await login(email, motDePasse);
      const role = user.role.replace('ROLE_', '');
      switch (role) {
        case 'ADMIN':      navigate('/admin', { replace: true }); break;
        case 'TOURISTE':   navigate('/touriste', { replace: true }); break;
        case 'HOTEL':      navigate('/dashboard/hotel', { replace: true }); break;
        case 'RESTAURANT':
        case 'CAFE':       navigate('/dashboard/restaurant', { replace: true }); break;
        case 'CINEMA':
        case 'THEATRE':    navigate('/dashboard/culture', { replace: true }); break;
        case 'SPORT':      navigate('/dashboard/sport', { replace: true }); break;
        case 'GUIDE':      navigate('/dashboard/guide', { replace: true }); break;
        default:           navigate('/', { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data || t('auth.error_creds');
      setError(typeof msg === 'object' ? (msg.message || t('auth.error_creds')) : msg);
    } finally {
      setLoading(false);
    }
  };

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

      <div className="auth-card">
        {/* Logo */}
        <div className="text-center mb-4">
          <div className="auth-logo mb-1 d-flex align-items-center justify-content-center" style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>
            <img src="/logodreamland.png" alt="Logo" style={{ height: '80px', width: 'auto', objectFit: 'contain', marginRight: '-20px', marginLeft: '-30px', position: 'relative', top: '5px' }} />
            <span className="fw-800" style={{ color: 'var(--primary)' }}>DreamLand</span>
          </div>
          <h2>{t('auth.login_title')}</h2>
          <p className="text-muted small">{t('auth.login_subtitle')}</p>
        </div>

        {error && (
          <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3" role="alert">
            <i className="bi bi-exclamation-triangle-fill" />
            <span>{error}</span>
          </div>
        )}

        <form className={`needs-validation ${validated ? 'was-validated' : ''}`} noValidate onSubmit={handleSubmit} autoComplete="off">
          <div className="mb-3">
            <label className="form-label">
              <i className="bi bi-envelope me-1" />{t('auth.email')}
            </label>
            <input
              type="email"
              className="form-control form-control-lg"
              placeholder={t('auth.email_placeholder')}
              required
              autoComplete="off"
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="invalid-feedback">
              {t('auth.error_email')}
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label">
              <i className="bi bi-lock me-1" />{t('auth.password')}
            </label>
            <div className="input-group input-group-lg has-validation">
              <input
                type={showPwd ? 'text' : 'password'}
                className="form-control"
                placeholder="••••••••"
                required
                onChange={(e) => setMotDePasse(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowPwd(!showPwd)}
                tabIndex={-1}
              >
                <i className={`bi ${showPwd ? 'bi-eye-slash' : 'bi-eye'}`} />
              </button>
              <div className="invalid-feedback">
                {t('auth.error_password_req')}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100 py-2 fw-700"
            disabled={loading}
            style={{ borderRadius: 10, fontSize: 15 }}
          >
            {loading
              ? <><span className="spinner-border spinner-border-sm me-2" />{t('auth.logging_in')}</>
              : <><i className="bi bi-box-arrow-in-right me-2" />{t('auth.login_button')}</>
            }
          </button>
        </form>

        <hr className="my-4" />
        <p className="text-center text-muted mb-0" style={{ fontSize: 14 }}>
          {t('auth.no_account')}{' '}
          <Link to="/register" className="fw-700">{t('auth.create_account')}</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
