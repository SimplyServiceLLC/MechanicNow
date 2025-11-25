
import React, { useState, createContext, useContext, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Wrench, Menu, X, Bell, Mic, Loader2, AlertTriangle } from 'lucide-react';
import { Home } from './views/Home';
import { Booking } from './views/Booking';
import { MechanicList } from './views/MechanicList';
import { Login } from './views/Login';
import { Profile } from './views/Profile';
import { Tracking } from './views/Tracking';
import { MechanicDashboard } from './views/MechanicDashboard';
import { MechanicRegistration } from './views/MechanicRegistration';
import { Terms } from './views/Terms';
import { UserProfile, Vehicle, ServiceRecord } from './types';
import { api } from './services/api';

// --- Contexts ---

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success';
}

interface AppContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (name: string, email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  addVehicle: (v: Vehicle) => Promise<void>;
  updateVehicle: (v: Vehicle) => Promise<void>;
  removeVehicle: (vehicleId: string) => Promise<void>;
  addServiceRecord: (r: ServiceRecord) => Promise<void>;
  notify: (title: string, message: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

// --- Components ---

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };
  // Explicitly declare props to avoid TS error "Property 'props' does not exist on type 'ErrorBoundary'"
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md border border-red-100">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
               <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-slate-500 mb-6">We encountered an unexpected error. Please try refreshing the page.</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
            >
              Reload Application
            </button>
            {process.env.NODE_ENV === 'development' && (
                <div className="mt-6 p-4 bg-red-50 rounded-lg text-left overflow-auto max-h-40 text-xs font-mono text-red-800">
                    {this.state.error?.toString()}
                </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const VoiceAssistant: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const navigate = useNavigate();
  const { notify } = useApp();

  const toggleListen = () => {
    if (!('webkitSpeechRecognition' in window)) {
      notify('Error', 'Voice control not supported in this browser.');
      return;
    }

    if (isListening) return;

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      
      if (transcript.includes('home')) navigate('/');
      else if (transcript.includes('book') || transcript.includes('service')) navigate('/book');
      else if (transcript.includes('profile')) navigate('/profile');
      else if (transcript.includes('mechanic') || transcript.includes('dashboard')) navigate('/mechanic-dashboard');
      else notify('Voice Assistant', `Heard: "${transcript}"`);
    };

    recognition.start();
  };

  return (
    <button 
      onClick={toggleListen}
      className={`fixed bottom-24 left-6 z-50 p-4 rounded-full shadow-xl transition-all transform hover:scale-105 ${isListening ? 'bg-red-500 animate-pulse text-white' : 'bg-slate-800 text-white'}`}
      title="Voice Command"
    >
      <Mic size={24} />
    </button>
  );
};

const Layout = ({ children }: { children?: React.ReactNode }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useApp();

  // Determine if we should show the simplified "app-like" header or the landing header
  const isAppView = location.pathname !== '/';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-slate-800">
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isAppView ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div 
              className="flex items-center cursor-pointer" 
              onClick={() => navigate('/')}
            >
              <div className={`p-2 rounded-lg mr-2 ${isAppView ? 'bg-blue-600 text-white' : 'bg-white text-blue-600'}`}>
                <Wrench size={20} />
              </div>
              <span className={`text-xl font-bold tracking-tight ${isAppView ? 'text-slate-900' : 'text-white'}`}>
                MechanicNow
              </span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-8">
              {!user && ['How it Works', 'Services', 'Mechanics'].map((item) => (
                <a 
                  key={item} 
                  href="#" 
                  className={`text-sm font-medium hover:opacity-75 ${isAppView ? 'text-slate-600' : 'text-white'}`}
                >
                  {item}
                </a>
              ))}
              
              {user ? (
                <div className="flex items-center gap-4">
                   <button 
                    onClick={() => navigate('/profile')}
                    className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-full transition-colors ${isAppView ? 'hover:bg-slate-100 text-slate-700' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  >
                    <img src={user.avatar} alt="Avatar" className="w-6 h-6 rounded-full" />
                    <span>{user.name}</span>
                  </button>
                  <button 
                    onClick={logout}
                    className={`text-sm font-medium ${isAppView ? 'text-red-500' : 'text-white'}`}
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => navigate('/login')}
                  className={`text-sm font-medium px-4 py-2 rounded-full transition-all ${isAppView ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-blue-900 hover:bg-gray-100'}`}
                >
                  Sign In
                </button>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? 
                <X className={isAppView ? 'text-slate-900' : 'text-white'} /> : 
                <Menu className={isAppView ? 'text-slate-900' : 'text-white'} />
              }
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white shadow-lg md:hidden p-4 flex flex-col space-y-4 text-slate-800 animate-fade-in border-t border-gray-100">
            {user ? (
              <>
                <div className="flex items-center gap-3 p-2 border-b border-gray-100 pb-4">
                  <img src={user.avatar} alt="Avatar" className="w-10 h-10 rounded-full" />
                  <div>
                    <p className="font-bold">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>
                <button onClick={() => { navigate('/profile'); setIsMenuOpen(false); }} className="p-2 text-left hover:bg-gray-50 rounded">My Profile</button>
                <button onClick={() => { navigate('/book'); setIsMenuOpen(false); }} className="p-2 text-left hover:bg-gray-50 rounded">Book Service</button>
                <button onClick={() => { navigate('/mechanic-dashboard'); setIsMenuOpen(false); }} className="p-2 text-left hover:bg-gray-50 rounded text-blue-600">Mechanic Dashboard</button>
                <button onClick={() => { logout(); setIsMenuOpen(false); }} className="p-2 text-left text-red-500">Sign Out</button>
              </>
            ) : (
              <>
                <a href="#" className="p-2 hover:bg-gray-50 rounded">How it Works</a>
                <a href="#" className="p-2 hover:bg-gray-50 rounded">Services</a>
                <button onClick={() => { navigate('/register-mechanic'); setIsMenuOpen(false); }} className="p-2 text-left hover:bg-gray-50 rounded text-blue-600">Mechanic Partner</button>
                <button onClick={() => { navigate('/login'); setIsMenuOpen(false); }} className="p-2 text-left text-blue-600 font-bold">Sign In</button>
              </>
            )}
          </div>
        )}
      </header>

      <main className="flex-grow pt-0">
        {children}
      </main>
      <VoiceAssistant />
    </div>
  );
};

const NotificationToast: React.FC<{ notifications: Notification[] }> = ({ notifications }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-24 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
      {notifications.map((n) => (
        <div key={n.id} className="bg-white rounded-lg shadow-xl border border-blue-100 p-4 w-80 animate-slide-in pointer-events-auto flex gap-3 items-start">
           <div className="bg-blue-100 text-blue-600 p-2 rounded-full">
             <Bell size={16} />
           </div>
           <div>
             <h4 className="font-bold text-slate-800 text-sm">{n.title}</h4>
             <p className="text-xs text-slate-600 mt-1">{n.message}</p>
           </div>
        </div>
      ))}
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Initial Load from "Backend"
  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await api.auth.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error("Failed to fetch user", error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = async (name: string, email: string, password?: string) => {
    setIsLoading(true);
    try {
      const newUser = await api.auth.login(name, email, password);
      setUser(newUser);
      notify('Welcome Back!', `Signed in as ${name}`);
    } catch (e: any) {
      console.error(e);
      notify('Error', e.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await api.auth.logout();
    setUser(null);
    notify('Signed Out', 'See you next time!');
  };

  const addVehicle = async (v: Vehicle) => {
    if (!user) return;
    const updatedUser = { ...user, vehicles: [...user.vehicles, { ...v, id: Math.random().toString(36).substr(2, 9) }] };
    
    // Optimistic UI Update
    setUser(updatedUser);
    await api.auth.updateProfile(updatedUser);
    
    notify('Vehicle Added', `${v.year} ${v.make} ${v.model} added to your garage.`);
  };

  const updateVehicle = async (updatedVehicle: Vehicle) => {
    if (!user) return;
    const updatedVehicles = user.vehicles.map(v => v.id === updatedVehicle.id ? updatedVehicle : v);
    const updatedUser = { ...user, vehicles: updatedVehicles };

    setUser(updatedUser);
    await api.auth.updateProfile(updatedUser);
    notify('Vehicle Updated', `${updatedVehicle.year} ${updatedVehicle.make} ${updatedVehicle.model} updated.`);
  };

  const removeVehicle = async (vehicleId: string) => {
    if (!user) return;
    const updatedVehicles = user.vehicles.filter(v => v.id !== vehicleId);
    const updatedUser = { ...user, vehicles: updatedVehicles };
    
    setUser(updatedUser);
    await api.auth.updateProfile(updatedUser);
    notify('Vehicle Removed', 'Vehicle removed from your garage.');
  };

  const addServiceRecord = async (r: ServiceRecord) => {
    if (!user) return;
    const updatedUser = { ...user, history: [r, ...user.history] };
    
    // Optimistic UI update
    setUser(updatedUser);
    await api.auth.updateProfile(updatedUser);
  };

  const notify = (title: string, message: string) => {
    const id = Math.random().toString(36);
    setNotifications(prev => [...prev, { id, title, message, type: 'info' }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="text-blue-600 animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse">Connecting to MechanicNow...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AppContext.Provider value={{ user, isLoading, login, logout, addVehicle, updateVehicle, removeVehicle, addServiceRecord, notify }}>
        <HashRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register-mechanic" element={<MechanicRegistration />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/book" element={<Booking />} />
              <Route path="/mechanics" element={<MechanicList />} />
              <Route path="/tracking" element={<Tracking />} />
              <Route path="/mechanic-dashboard" element={<MechanicDashboard />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
          <NotificationToast notifications={notifications} />
        </HashRouter>
      </AppContext.Provider>
    </ErrorBoundary>
  );
};

export default App;
