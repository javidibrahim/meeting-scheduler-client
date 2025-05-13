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

// Add request interceptor for logging
api.interceptors.request.use(request => {
  console.log('Making request to:', request.url);
  console.log('Request headers:', request.headers);
  console.log('Request withCredentials:', request.withCredentials);
  return request;
});

// Add response interceptor for logging
api.interceptors.response.use(
  response => {
    console.log('Response received:', response.status);
    console.log('Response headers:', response.headers);
    console.log('Response cookies:', document.cookie);
    return response;
  },
  error => {
    console.error('Request failed:', {
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers,
      cookies: document.cookie,
      error: error.message
    });
    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        console.log('Checking auth status...');
        console.log('Current cookies:', document.cookie);
        console.log('API base URL:', config.apiBaseUrl);
        
        const response = await api.get('/me');
        console.log('Auth check successful:', response.data);
        setUser(response.data);
      } catch (error) {
        console.error('Auth check failed:', {
          error: error.message,
          status: error.response?.status,
          data: error.response?.data,
          cookies: document.cookie,
          url: error.config?.url
        });
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