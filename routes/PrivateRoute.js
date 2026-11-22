import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const PrivateRoute = ({ allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Chargement...</div>;

  if (!user) return <Navigate to="/login" />;

  // Si les données utilisateur sont corrompues (pas de rôle), on déconnecte de force
  if (!user.role) {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    return <Navigate to="/login" replace />;
  }

  // Note: user.role is expected to be a string like "ROLE_ADMIN" or "ADMIN"
  const userRole = user.role.replace('ROLE_', '');
  
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" />;
  }

  return <Outlet />;
};

export default PrivateRoute;
