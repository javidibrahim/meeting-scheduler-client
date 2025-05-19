import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import config from '../config';

const AuthContext = createContext(null);

const api = axios.create({
  baseURL: config.apiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const refreshAuth = async () => {
    try {
      const res = await api.get('/me');
      setUser(res.data);
      console.log('Refreshed user session:', res.data);
      return true;
    } catch (error) {
      console.log('Session refresh failed');
      setUser(null);
      return false;
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        setLoading(true);
        const res = await api.get('/me');
        setUser(res.data);
        console.log('Authenticated user:', res.data);
      } catch (error) {
        console.log('No active session');
        setUser(null);

        // If on a protected route, redirect to home
        if (location.pathname !== '/' && location.pathname !== '/auth-callback') {
          navigate('/');
        }
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [location.pathname, navigate]);

  const login = () => {
    window.location.href = `${config.apiBaseUrl}/auth/google`;
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch (err) {
      console.error('Logout error:', err.message);
    } finally {
      setUser(null);
      navigate('/');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshAuth, api }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
