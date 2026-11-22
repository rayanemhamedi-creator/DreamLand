import React from 'react';
import OfflineCinemaForm from './OfflineCinemaForm';
import OfflineSortieForm from './OfflineSortieForm';
import OfflineSportForm from './OfflineSportForm';
import OfflineEvenementForm from './OfflineEvenementForm';
import OfflineHotelForm from './OfflineHotelForm';
import OfflineRestaurantForm from './OfflineRestaurantForm';

const OfflineReservationModal = ({ show, onClose, onSuccess, providerType, providerData }) => {
    
    if (!show) return null;

    const handleSuccess = () => {
        onSuccess();
        onClose();
    };

    const renderStepContent = () => {
        // Normalisation du type pour les événements
        const type = providerType === 'EVENT' ? 'EVENEMENT' : providerType;

        switch (type) {
            case 'HOTEL':
                return <OfflineHotelForm providerData={providerData} onCancel={onClose} onSuccess={handleSuccess} />;
            case 'RESTAURANT':
            case 'CAFE':
                return <OfflineRestaurantForm providerData={providerData} onCancel={onClose} onSuccess={handleSuccess} />;
            case 'CINEMA':
                return <OfflineCinemaForm providerData={providerData} onCancel={onClose} onSuccess={handleSuccess} />;
            case 'GUIDE':
                return <OfflineSortieForm providerData={providerData} onCancel={onClose} onSuccess={handleSuccess} />;
            case 'SPORT':
                return <OfflineSportForm providerData={providerData} onCancel={onClose} onSuccess={handleSuccess} />;
            case 'EVENEMENT':
                return <OfflineEvenementForm providerData={providerData} onCancel={onClose} onSuccess={handleSuccess} />;
            default:
                return (
                    <div className="text-center py-5 text-white">
                        <i className="bi bi-exclamation-triangle fs-1 text-warning mb-3"></i>
                        <p>Type de prestataire non reconnu : {providerType}</p>
                    </div>
                );
        }
    };

    return (
        <div className="modal-overlay" style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', 
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' 
        }}>
            <div className="modal-content border border-secondary shadow-lg rounded-5 overflow-hidden animate-in-y" style={{ backgroundColor: '#1e293b', color: 'white', maxWidth: 550, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                <div className="p-4 border-bottom border-secondary border-opacity-10 d-flex align-items-center justify-content-between">
                    <h4 className="fw-900 text-white mb-0">Nouvelle Réservation</h4>
                    <button onClick={onClose} className="btn border-0 text-white p-0 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}>
                        <i className="bi bi-x-lg fs-5"></i>
                    </button>
                </div>

                <div className="p-4 overflow-auto flex-grow-1 custom-scrollbar">
                    {renderStepContent()}
                </div>
            </div>

            <style>{`
                .modal-overlay { animation: fadeIn 0.3s ease-out; }
                .animate-in-y { animation: slideInY 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideInY { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                
                .premium-input-dark {
                    background: #1e293b !important;
                    border: 1px solid rgba(255,255,255,0.12) !important;
                    color: white !important;
                    border-radius: 12px !important;
                    padding: 12px 15px !important;
                }
                .premium-input-dark:focus {
                    background: #263548 !important;
                    border-color: #f97316 !important;
                    box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.15) !important;
                    outline: none !important;
                }
                .premium-input-dark option,
                .premium-input-dark optgroup {
                    background-color: #1e293b !important;
                    color: white !important;
                }
                .premium-input-dark::placeholder {
                    color: rgba(255,255,255,0.35) !important;
                }

                /* Fix Bootstrap form-select in dark modal context */
                .modal-content .form-select,
                .modal-content .form-control {
                    background-color: #1e293b !important;
                    border-color: rgba(255,255,255,0.12) !important;
                    color: white !important;
                }
                .modal-content .form-select:focus,
                .modal-content .form-control:focus {
                    background-color: #263548 !important;
                    border-color: #f97316 !important;
                    box-shadow: 0 0 0 4px rgba(249,115,22,0.15) !important;
                }
                .modal-content .form-select option,
                .modal-content .form-select optgroup {
                    background-color: #1e293b !important;
                    color: white !important;
                }
                /* Select arrow color fix for dark background */
                .modal-content .form-select {
                    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e") !important;
                    background-repeat: no-repeat !important;
                    background-position: right 0.75rem center !important;
                    background-size: 16px 12px !important;
                }
                .modal-content .form-check-label { color: white !important; }
                .modal-content .text-muted { color: rgba(255,255,255,0.5) !important; }
                .modal-content label { color: rgba(255,255,255,0.85) !important; }
                .modal-content .badge.bg-secondary { background-color: rgba(255,255,255,0.12) !important; color: white !important; }

                /* ── Alerts / messages d'erreur & avertissement ── */
                .modal-content .alert {
                    border-radius: 12px !important;
                    font-weight: 600;
                }
                .modal-content .alert-danger {
                    background-color: rgba(239, 68, 68, 0.15) !important;
                    border: 1px solid rgba(239, 68, 68, 0.4) !important;
                    color: #fca5a5 !important;
                }
                .modal-content .alert-warning {
                    background-color: rgba(245, 158, 11, 0.15) !important;
                    border: 1px solid rgba(245, 158, 11, 0.4) !important;
                    color: #fcd34d !important;
                }
                .modal-content .alert-success {
                    background-color: rgba(34, 197, 94, 0.15) !important;
                    border: 1px solid rgba(34, 197, 94, 0.35) !important;
                    color: #86efac !important;
                }
                .modal-content .alert-info {
                    background-color: rgba(59, 130, 246, 0.15) !important;
                    border: 1px solid rgba(59, 130, 246, 0.35) !important;
                    color: #93c5fd !important;
                }
                .modal-content .alert i,
                .modal-content .alert .bi {
                    opacity: 0.9;
                }
                /* text-warning standalone (hors .alert) */
                .modal-content .text-warning { color: #fcd34d !important; }
                .modal-content .text-danger  { color: #fca5a5 !important; }
                .modal-content .text-success  { color: #86efac !important; }

                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default OfflineReservationModal;
