import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';
import { useAuth } from '../context/AuthContext';

const HubspotConnection = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [portalName, setPortalName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { api } = useAuth();

  const fetchConnectionStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get(API_ENDPOINTS.HUBSPOT_CONNECTION);
      console.log('HubSpot connection status:', response.data); // Debug log
      setIsConnected(response.data.connected);
      if (response.data.connected) {
        setPortalName(response.data.portal_name);
      } else {
        setPortalName('');
      }
    } catch (err) {
      console.error('Error fetching HubSpot connection:', err);
      setError('Failed to fetch HubSpot connection status');
      setIsConnected(false);
      setPortalName('');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchConnectionStatus();
  }, []);

  // Refresh status when URL has success parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'hubspot_connected') {
      console.log('Detected HubSpot connection success, refreshing status...'); // Debug log
      fetchConnectionStatus();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleConnect = async () => {
    try {
      setError(null);
      window.location.href = API_ENDPOINTS.HUBSPOT_AUTH;
    } catch (err) {
      console.error('Error connecting to HubSpot:', err);
      setError('Failed to initiate HubSpot connection');
    }
  };

  const handleDisconnect = async () => {
    try {
      setError(null);
      await api.delete(API_ENDPOINTS.HUBSPOT_DISCONNECT);
      setIsConnected(false);
      setPortalName('');
    } catch (err) {
      console.error('Error disconnecting from HubSpot:', err);
      setError('Failed to disconnect from HubSpot');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">HubSpot CRM</h3>
          {isConnected ? (
            <div className="mt-1">
              <p className="text-sm text-gray-500">
                Connected to <span className="font-medium text-gray-700">{portalName}</span>
              </p>
              <p className="text-xs text-green-600 mt-1 flex items-center">
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Successfully connected
              </p>
            </div>
          ) : (
            <p className="mt-1 text-sm text-gray-500">
              Connect your HubSpot CRM account to sync contacts and deals
            </p>
          )}
        </div>
        {isConnected ? (
          <button
            onClick={handleDisconnect}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={handleConnect}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Connect HubSpot
          </button>
        )}
      </div>
      {error && (
        <div className="mt-4 p-4 bg-red-50 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HubspotConnection; 