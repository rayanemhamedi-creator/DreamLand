import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authentificationService from '../services/authentificationService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = authentificationService.getUtilisateurActuel();
    if (savedUser) {
      setUser(savedUser);
    }
    setLoading(false);
  }, []);

  const login = async (email, motDePasse) => {
    const data = await authentificationService.connexion(email, motDePasse);
    setUser(data);
    return data;
  };

  const logout = () => {
    authentificationService.deconnexion();
    setUser(null);
    navigate('/login');
  };

  const register = async (userData) => {
    return await authentificationService.inscription(userData);
  };

  const updateUser = (userData) => {
    const currentUser = authentificationService.getUtilisateurActuel();
    const updated = { ...currentUser, ...userData };
    localStorage.setItem('user', JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, updateUser, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
