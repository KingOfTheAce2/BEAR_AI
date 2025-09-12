import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppProvider } from './contexts/AppContext';
import { UnifiedLayout } from './components/layout/UnifiedLayout';
import { LoginPage } from './components/auth/LoginPage';
import { NotificationCenter } from './components/common/NotificationCenter';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PublicRoute } from './components/auth/PublicRoute';
import { User } from './types';
import './styles/unified.css';

// User data should be provided by authentication system

function App() {
  return (
    <ThemeProvider initialTheme="professional" initialColorMode="light">
      <AppProvider initialUser={undefined}>
        <Router>
          <div className="App min-h-screen bg-background text-text-primary font-primary">
            <Routes>
              {/* Public routes */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                }
              />

              {/* Protected routes */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <UnifiedLayout />
                  </ProtectedRoute>
                }
              />
            </Routes>
            
            {/* Global notification center */}
            <NotificationCenter />
          </div>
        </Router>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;