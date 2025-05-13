import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import config from '../config';

const AuthContext = createContext(null);

const api = axios.create({
  baseURL: config.apiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        const response = await api.get('/me');
        console.log('Auth check response:', response.data); // Debug log
        setUser(response.data);
      } catch (error) {
        console.error('Auth check failed:', error); // Debug log
        setUser(null);
        // Only redirect to home if we're not already there
        if (window.location.pathname !== '/') {
          navigate('/');
        }
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const login = () => {
    // Clear any existing session data
    setUser(null);
    // Redirect to backend auth endpoint
    window.location.href = `${config.apiBaseUrl}/auth/google`;
  };

  const logout = async () => {
    try {
      await api.post('/logout');
      setUser(null);
      // Clear any local storage or session storage if needed
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear user state and redirect even if the API call fails
      setUser(null);
      navigate('/');
    }
  };

  // Add a function to refresh the auth state
  const refreshAuth = async () => {
    try {
      const response = await api.get('/me');
      setUser(response.data);
      return true;
    } catch (error) {
      console.error('Auth refresh failed:', error);
      setUser(null);
      return false;
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