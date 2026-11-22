import React, { useEffect, useState } from 'react';
import reservationService from '../../services/reservationService';

const AdminNouveautes = () => {
    const [cancellations, setCancellations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCancellations = async () => {
            try {
                const data = await reservationService.getReservationsAnnulees();
                setCancellations(data);
            } catch (err) {
                console.error("Erreur admin nouveautés:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchCancellations();
    }, []);

    const totalRefunded = cancellations.reduce((sum, res) => sum + (res.montantRembourse || 0), 0);

    return (
        <div style={{ padding: '30px', fontFamily: "'Outfit', sans-serif" }}>
            <div style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '32px', color: '#0f172a', fontWeight: '800' }}>✨ Nouveautés Admin</h1>
                <p style={{ color: '#64748b' }}>Suivi des réservations annulées et flux de remboursements.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                <div style={statCardStyle('#fee2e2', '#991b1b')}>
                    <h3>Annulations totales</h3>
                    <p style={{ fontSize: '36px', fontWeight: '800' }}>{cancellations.length}</p>
                </div>
                <div style={statCardStyle('#f0fdf4', '#166534')}>
                    <h3>Total remboursé aux clients</h3>
                    <p style={{ fontSize: '36px', fontWeight: '800' }}>{totalRefunded.toFixed(2)} DT</p>
                </div>
                <div style={statCardStyle('#eff6ff', '#1e40af')}>
                    <h3>Commissions Admin conservées</h3>
                    <p style={{ fontSize: '36px', fontWeight: '800' }}>
                        {cancellations.reduce((sum, res) => sum + (res.commissionAdmin || 0), 0).toFixed(2)} DT
                    </p>
                </div>
            </div>

            <div style={{ background: 'white', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', padding: '30px' }}>
                <h2 style={{ marginBottom: '20px' }}>Historique des annulations</h2>
                {loading ? <p>Chargement...</p> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9', color: '#64748b' }}>
                                <th style={{ padding: '15px' }}>Client</th>
                                <th>Service</th>
                                <th>Date réservation</th>
                                <th>Prix Total</th>
                                <th style={{ color: '#dc2626' }}>Remboursement</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cancellations.map(res => (
                                <tr key={res.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '15px', fontWeight: '600' }}>{res.clientNom} {res.clientPrenom}</td>
                                    <td>{getServiceName(res)}</td>
                                    <td>{new Date(res.dateDebut).toLocaleDateString()}</td>
                                    <td>{res.prixTotal} DT</td>
                                    <td style={{ color: '#dc2626', fontWeight: '800' }}>-{res.montantRembourse || 0} DT</td>
                                </tr>
                            ))}
                            {cancellations.length === 0 && (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Aucune annulation pour le moment.</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

const getServiceName = (res) => {
    if (res.chambre) return "Hôtel (" + res.chambre.type + ")";
    if (res.tableResto) return "Restaurant";
    if (res.film) return "Cinéma (" + res.film.titre + ")";
    if (res.sortie) return "Sortie";
    if (res.sport) return "Activités Sport";
    if (res.evenement) return "Événement";
    return "Service inconnu";
};

const statCardStyle = (bg, color) => ({
    background: bg,
    color,
    padding: '30px',
    borderRadius: '20px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
});

export default AdminNouveautes;
