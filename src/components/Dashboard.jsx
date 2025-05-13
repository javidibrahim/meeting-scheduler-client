import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS } from '../config';
import ConnectedCalendars from './ConnectedCalendars';
import SuccessMessage from './SuccessMessage';
import Calendar from './Calendar';
import HubspotConnection from './HubspotConnection';
import AvailabilityModal from './AvailabilityModal';
import ScheduleLinksModal from './ScheduleLinksModal';
import ScheduledMeetings from './ScheduledMeetings';


const Dashboard = () => {
  const { user, loading, logout, refreshAuth } = useAuth();
  const navigate = useNavigate();
  const [connectedCalendars, setConnectedCalendars] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(true);
  const [events, setEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [isScheduleLinksModalOpen, setIsScheduleLinksModalOpen] = useState(false);
  const [isScheduledMeetingsModalOpen, setIsScheduledMeetingsModalOpen] = useState(false);


  const fetchCalendars = useCallback(async () => {
    try {
      setIsLoadingCalendars(true);
      const response = await fetch(API_ENDPOINTS.CALENDAR_LIST, {
        credentials: 'include'
      });
      if (response.ok) {
        const calendars = await response.json();
        setConnectedCalendars(calendars);
        // Fetch events after calendars are updated
        if (calendars.length > 0) {
          await fetchEvents(calendars);
        }
      } else {
        console.error('Failed to fetch calendars');
        setError('Failed to load calendars');
      }
    } catch (err) {
      console.error('Failed to fetch calendars:', err);
      setError('Failed to load calendars');
    } finally {
      setIsLoadingCalendars(false);
    }
  }, []);

  const fetchEvents = useCallback(async (calendars = connectedCalendars) => {
    try {
      setIsLoadingEvents(true);
      setEvents([]);
      
      if (calendars.length === 0) {
        return;
      }

      // Fetch events from all connected calendars
      const eventPromises = calendars.map(calendar => 
        fetch(API_ENDPOINTS.EVENTS(calendar.id), {
          credentials: 'include'
        }).then(response => {
          if (!response.ok) {
            console.warn(`Failed to fetch events for calendar ${calendar.id}`);
            return [];
          }
          return response.json();
        })
      );

      const eventsResults = await Promise.all(eventPromises);
      // Flatten all events into a single array
      const allEvents = eventsResults.flat();
      setEvents(allEvents);
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setError('Failed to load calendar events');
    } finally {
      setIsLoadingEvents(false);
    }
  }, [connectedCalendars]);

  // Check authentication on mount and when URL changes
  useEffect(() => {
    const checkAuth = async () => {
      if (!loading && !user) {
        console.log('No user found, redirecting to login'); // Debug log
        navigate('/');
        return;
      }
      
      // Try to refresh auth state
      const isAuthenticated = await refreshAuth();
      if (!isAuthenticated) {
        console.log('Auth refresh failed, redirecting to login'); // Debug log
        navigate('/');
      }
    };
    
    checkAuth();
  }, [user, loading, navigate, refreshAuth]);

  // Handle URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorMessage = params.get('error');
    const successMessage = params.get('success');
    
    if (errorMessage) {
      console.log('Error in URL params:', errorMessage); // Debug log
      setError(params.get('message') || 'An error occurred');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (successMessage === 'hubspot_connected') {
      setSuccess('HubSpot connected successfully!');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (successMessage === 'true') {
      setSuccess('Calendar connected successfully!');
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchCalendars();
    }
  }, [fetchCalendars]);

  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  const handleConnectCalendar = () => {
    setIsConnecting(true);
    setError(null);
    setSuccess(null);
    // Redirect to the backend calendar auth endpoint
    window.location.href = API_ENDPOINTS.CALENDAR_AUTH;
  };

  const handleDisconnectCalendar = async (calendarId) => {
    try {
      setError(null);
      setSuccess(null);
      const encodedCalendarId = encodeURIComponent(calendarId);
      const response = await fetch(API_ENDPOINTS.CALENDAR_DISCONNECT(encodedCalendarId), {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        setConnectedCalendars(prev => prev.filter(cal => cal.id !== calendarId));
        setSuccess('Calendar disconnected successfully');
        // Refresh events after disconnecting
        await fetchEvents();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to disconnect calendar:', errorData);
        setError(errorData.detail || 'Failed to disconnect calendar');
      }
    } catch (err) {
      console.error('Error disconnecting calendar:', err);
      setError('Failed to disconnect calendar');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-800">Advisor Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{user?.name}</span>
              <button
                onClick={logout}
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column - User Info and Connected Calendars */}
          <div className="md:col-span-1">
            <div className="space-y-6">
              {/* User Info Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex flex-col items-center space-y-4">
                  <h2 className="text-2xl font-semibold text-gray-800">{user?.name}</h2>
                  <p className="text-gray-600">{user?.email}</p>
                </div>
              </div>

              {/* Calendar Integration Section */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">Calendar Integration</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Connect multiple calendars to manage your availability
                    </p>
                  </div>
                  <button
                    onClick={handleConnectCalendar}
                    disabled={isConnecting}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                    <span>{isConnecting ? 'Connecting...' : 'Add Calendar'}</span>
                  </button>
                </div>

                {/* Connected Calendars Component */}
                <ConnectedCalendars
                  calendars={connectedCalendars}
                  isLoading={isLoadingCalendars}
                  onDisconnect={handleDisconnectCalendar}
                />
              </div>

              {/* HubSpot Connection */}
              <HubspotConnection />
              
              {/* Scheduled Meetings Button */}
              <div className="bg-white rounded-lg shadow p-6">
                <button
                  onClick={() => setIsScheduledMeetingsModalOpen(true)}
                  className="w-full bg-emerald-500 text-white px-4 py-3 rounded-md hover:bg-emerald-600 transition-colors flex items-center justify-center space-x-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  <span>View Scheduled Meetings</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Calendar Section */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col h-[600px]">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-800">Calendar</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      View and manage your calendar events
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setIsScheduleLinksModalOpen(true)}
                      className="bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-600 transition-colors flex items-center justify-center space-x-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                      </svg>
                      <span>Manage Links</span>
                    </button>
                    <button
                      onClick={() => setIsAvailabilityModalOpen(true)}
                      className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors flex items-center justify-center space-x-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <span>Set Availability</span>
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-600">{error}</p>
                  </div>
                )}

                {success && (
                  <SuccessMessage 
                    message={success} 
                    onClose={() => setSuccess(null)} 
                  />
                )}

                {/* Calendar View */}
                <div className="flex-1 overflow-hidden">
                  <Calendar 
                    events={events} 
                    isLoading={isLoadingEvents}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <AvailabilityModal
        isOpen={isAvailabilityModalOpen}
        onClose={() => setIsAvailabilityModalOpen(false)}
        onSave={() => {
          setSuccess('Availability updated successfully');
          // Optionally refresh calendar events here if needed
        }}
      />
      <ScheduleLinksModal
        isOpen={isScheduleLinksModalOpen}
        onClose={() => setIsScheduleLinksModalOpen(false)}
        onSave={() => {
          setSuccess('Schedule links updated successfully');
        }}
      />
      <ScheduledMeetings
        isOpen={isScheduledMeetingsModalOpen}
        onClose={() => setIsScheduledMeetingsModalOpen(false)}
      />
    </div>
  );
};

export default Dashboard;