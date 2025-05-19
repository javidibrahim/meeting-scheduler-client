import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import SchedulePage from './components/SchedulePage';

// Simple component to handle auth callback
const AuthCallback = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="text-center">
      <h2 className="text-xl font-semibold mb-2">Authenticating...</h2>
      <p>Please wait while we complete your sign-in.</p>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/schedule/:slug" element={<SchedulePage />} />
          <Route path="/auth-callback" element={<AuthCallback />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;