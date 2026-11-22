import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import api from '../../services/api';
import toast from 'react-hot-toast';

// La redirection se fait désormais via l'URL fournie par le backend
// Plus besoin de loadStripe ici pour un flux Checkout Simple

const PaymentButton = ({ reservationId, amount }) => {
    const [loading, setLoading] = useState(false);

    const handlePayment = async () => {
        setLoading(true);
        try {
            // 1. Créer la session de paiement sur le backend
            const response = await api.post(`/payments/create-session/${reservationId}`);
            const { url } = response.data;

            if (!url) {
                throw new Error("URL de paiement non reçue du serveur.");
            }

            // 2. Rediriger vers Stripe Checkout dans un nouvel onglet/fenêtre
            window.open(url, '_blank');
            
        } catch (err) {
            console.error("❌ Erreur détaillée du flux de paiement:", err);
            const errorMsg = err.response?.data || err.message;
            toast.error(`Erreur: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handlePayment}
            disabled={loading}
            className="btn btn-primary shadow-sm px-4 rounded-pill fw-700"
        >
            {loading ? (
                <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Redirection...
                </>
            ) : (
                <>
                    <i className="bi bi-credit-card me-2"></i>
                    Payer {amount} DT maintenant
                </>
            )}
        </button>
    );
};

export default PaymentButton;



