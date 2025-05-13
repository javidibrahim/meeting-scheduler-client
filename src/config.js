// Get URLs from environment variables
const FRONTEND_URL = process.env.REACT_APP_FRONTEND_URL;
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
console.log("FRONT END URL", FRONTEND_URL, "API BASE URL", API_BASE_URL);


export const API_ENDPOINTS = {
    // Auth endpoints
    GOOGLE_AUTH: `${API_BASE_URL}/auth/google`,
    GOOGLE_CALLBACK: `${API_BASE_URL}/auth/google/callback`,
    LOGOUT: `${API_BASE_URL}/logout`,
    ME: `${API_BASE_URL}/me`,

    // Calendar endpoints
    CALENDAR_AUTH: `${API_BASE_URL}/auth/google/calendar`,
    CALENDAR_LIST: `${API_BASE_URL}/auth/google/calendar/list`,
    CALENDAR_DISCONNECT: (calendarId) => `${API_BASE_URL}/auth/google/calendar/${calendarId}`,
    EVENTS: (calendarId) => `${API_BASE_URL}/events/${calendarId}`,

    // HubSpot endpoints
    HUBSPOT_AUTH: `${API_BASE_URL}/auth/hubspot`,
    HUBSPOT_CONNECTION: `${API_BASE_URL}/auth/hubspot/connection`,
    HUBSPOT_DISCONNECT: `${API_BASE_URL}/auth/hubspot/connection`,

    // Availability endpoints
    AVAILABILITY: `${API_BASE_URL}/availability`,
    
    // Schedule Links endpoints
    SCHEDULE_LINKS: `${API_BASE_URL}/schedule-links`,
    
    // Public Scheduling endpoints
    PUBLIC_SCHEDULE: `${API_BASE_URL}/public`,
    
    // Meetings endpoints
    MEETINGS: `${API_BASE_URL}/meetings`,
    MEETING_DETAILS: (meetingId) => `${API_BASE_URL}/meetings/${meetingId}`,
};

const config = {
  apiBaseUrl: API_BASE_URL,
  frontendUrl: FRONTEND_URL,
};

export default config; 