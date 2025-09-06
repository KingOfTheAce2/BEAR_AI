import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@components/layout'
import { Dashboard, Login } from '@pages/index'
import { useAuthStore } from '@store/index'

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

// Public Route component (redirect if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            
            {/* Placeholder routes for future pages */}
            <Route path="cases" element={<div>Cases Page (Coming Soon)</div>} />
            <Route path="documents" element={<div>Documents Page (Coming Soon)</div>} />
            <Route path="clients" element={<div>Clients Page (Coming Soon)</div>} />
            <Route path="calendar" element={<div>Calendar Page (Coming Soon)</div>} />
            <Route path="reports" element={<div>Reports Page (Coming Soon)</div>} />
            <Route path="ai-chat" element={<div>AI Chat Page (Coming Soon)</div>} />
            <Route path="settings" element={<div>Settings Page (Coming Soon)</div>} />
            <Route path="help" element={<div>Help Page (Coming Soon)</div>} />
          </Route>

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App