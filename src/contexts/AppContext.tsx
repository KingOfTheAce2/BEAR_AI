import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Combined state from both GUI variants
export interface AppState {
  // User and authentication
  user: User | null;
  isAuthenticated: boolean;
  
  // UI state
  sidebarCollapsed: boolean;
  currentView: string;
  
  // System state
  systemStatus: SystemStatus;
  notifications: Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: Date;
  }>;
  
  // Content state
  searchQuery: string;
  activeChat: ChatSession | null;
  recentChats: ChatSession[];
  documents: Document[];
  
  // Loading states
  isLoading: boolean;
  error: string | null;
}

type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SIDEBAR_COLLAPSED'; payload: boolean }
  | { type: 'SET_CURRENT_VIEW'; payload: string }
  | { type: 'SET_SYSTEM_STATUS'; payload: Partial<SystemStatus> }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_ACTIVE_CHAT'; payload: ChatSession | null }
  | { type: 'SET_RECENT_CHATS'; payload: ChatSession[] }
  | { type: 'ADD_CHAT'; payload: ChatSession }
  | { type: 'SET_DOCUMENTS'; payload: Document[] }
  | { type: 'ADD_DOCUMENT'; payload: Document }
  | { type: 'ADD_NOTIFICATION'; payload: { type: 'info' | 'success' | 'warning' | 'error'; title: string; message: string } }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' };

const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  sidebarCollapsed: false,
  currentView: 'chat',
  systemStatus: {
    connection: 'online',
    security: 'secure',
    operations: { active: 0, queued: 0 },
    version: '1.0.0'
  },
  notifications: [],
  searchQuery: '',
  activeChat: null,
  recentChats: [],
  documents: [],
  isLoading: false,
  error: null
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    
    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload };
    
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    
    case 'SET_SIDEBAR_COLLAPSED':
      return { ...state, sidebarCollapsed: action.payload };
    
    case 'SET_CURRENT_VIEW':
      return { ...state, currentView: action.payload };
    
    case 'SET_SYSTEM_STATUS':
      return {
        ...state,
        systemStatus: { ...state.systemStatus, ...action.payload }
      };
    
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    
    case 'SET_ACTIVE_CHAT':
      return { ...state, activeChat: action.payload };
    
    case 'SET_RECENT_CHATS':
      return { ...state, recentChats: action.payload };
    
    case 'ADD_CHAT':
      return {
        ...state,
        recentChats: [action.payload, ...state.recentChats.slice(0, 9)] // Keep only 10 recent
      };
    
    case 'SET_DOCUMENTS':
      return { ...state, documents: action.payload };
    
    case 'ADD_DOCUMENT':
      return {
        ...state,
        documents: [action.payload, ...state.documents]
      };
    
    case 'ADD_NOTIFICATION': {
      const id = Math.random().toString(36).substring(2);
      const notification = {
        ...action.payload,
        id,
        timestamp: new Date()
      };
      return {
        ...state,
        notifications: [...state.notifications, notification]
      };
    }
    
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };
    
    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  
  // Convenience methods
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  toggleSidebar: () => void;
  setCurrentView: (view: string) => void;
  setSearchQuery: (query: string) => void;
  addNotification: (type: 'info' | 'success' | 'warning' | 'error', title: string, message: string) => void;
  removeNotification: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: React.ReactNode;
  initialUser?: User;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children, initialUser }) => {
  const [state, dispatch] = useReducer(appReducer, {
    ...initialState,
    user: initialUser || null,
    isAuthenticated: !!initialUser
  });

  // Auto-remove notifications after 5 seconds
  useEffect(() => {
    state.notifications.forEach(notification => {
      const timeoutId = setTimeout(() => {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: notification.id });
      }, 5000);
      
      return () => clearTimeout(timeoutId);
    });
  }, [state.notifications]);

  // Persist authentication state
  useEffect(() => {
    const savedUser = localStorage.getItem('bear-ai-user');
    if (savedUser && !state.user) {
      try {
        const user = JSON.parse(savedUser);
        dispatch({ type: 'SET_USER', payload: user });
        dispatch({ type: 'SET_AUTHENTICATED', payload: true });
      } catch (error) {
        console.error('Failed to parse saved user data:', error);
        localStorage.removeItem('bear-ai-user');
      }
    }
  }, []);

  // Save user to localStorage when authenticated
  useEffect(() => {
    if (state.user && state.isAuthenticated) {
      localStorage.setItem('bear-ai-user', JSON.stringify(state.user));
    } else {
      localStorage.removeItem('bear-ai-user');
    }
  }, [state.user, state.isAuthenticated]);

  const login = async (email: string, password: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });
    
    try {
      // Mock login - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock user data
      const mockUser: User = {
        id: '1',
        name: 'Sarah Johnson',
        email,
        role: 'attorney',
        firm: 'Johnson & Associates Law Firm',
        avatar: undefined
      };
      
      dispatch({ type: 'SET_USER', payload: mockUser });
      dispatch({ type: 'SET_AUTHENTICATED', payload: true });
      dispatch({ type: 'ADD_NOTIFICATION', payload: { 
        type: 'success', 
        title: 'Welcome!', 
        message: 'Successfully logged in to BEAR AI' 
      }});
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      dispatch({ type: 'ADD_NOTIFICATION', payload: { 
        type: 'error', 
        title: 'Login Failed', 
        message: errorMessage 
      }});
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const logout = () => {
    dispatch({ type: 'SET_USER', payload: null });
    dispatch({ type: 'SET_AUTHENTICATED', payload: false });
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
    dispatch({ type: 'SET_CURRENT_VIEW', payload: 'chat' });
    dispatch({ type: 'SET_ACTIVE_CHAT', payload: null });
    localStorage.removeItem('bear-ai-user');
  };

  const toggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  };

  const setCurrentView = (view: string) => {
    dispatch({ type: 'SET_CURRENT_VIEW', payload: view });
  };

  const setSearchQuery = (query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  };

  const addNotification = (type: 'info' | 'success' | 'warning' | 'error', title: string, message: string) => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: { type, title, message } });
  };

  const removeNotification = (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  const value: AppContextType = {
    state,
    dispatch,
    login,
    logout,
    toggleSidebar,
    setCurrentView,
    setSearchQuery,
    addNotification,
    removeNotification
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};