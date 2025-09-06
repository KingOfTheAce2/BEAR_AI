import React from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { User } from './types';
import './styles/globals.css';

// Mock user data for development
const mockUser: User = {
  id: '1',
  name: 'Sarah Johnson',
  email: 'sarah.johnson@lawfirm.com',
  role: 'attorney',
  firm: 'Johnson & Associates Law Firm',
  avatar: undefined // Will use default avatar
};

function App() {
  return (
    <div className="App">
      <AppLayout initialUser={mockUser} />
    </div>
  );
}

export default App;