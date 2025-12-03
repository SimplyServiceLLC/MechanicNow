
import React, { useState, createContext, useContext, useEffect } from 'react';
import { Wrench, Menu, X, Bell, Mic, Loader2, AlertTriangle, ShieldCheck, User, Calendar, MapPin, Briefcase, LayoutDashboard, Home as HomeIcon, Clock, Settings, Search } from 'lucide-react';
import { Home } from './views/Home';
import { Booking } from './views/Booking';
import { MechanicList } from './views/MechanicList';
import { Login } from './views/Login';
import { Profile } from './views/Profile';
import { Tracking } from './views/Tracking';
import { MechanicDashboard } from './views/MechanicDashboard';
import { MechanicRegistration } from './views/MechanicRegistration';
import { AdminDashboard } from './views/AdminDashboard';
import { Terms } from './views/Terms';
import { UserProfile, Vehicle, ServiceRecord } from './types';
import { api } from './services/api';

/* --- Custom Router Implementation (replacing react-router-dom) --- */
const RouterContext = createContext<{ path: string; search: string; navigate: (path: string, options?: any) => void; state: any } | null>(null);

export const HashRouter = ({ children }: { children?: React.ReactNode }) => {
  const [path, setPath] = useState(window.location.hash.slice(1) || '/');
  const [state, setState] = useState<any>(null);

  useEffect(() => {
    const handler = () => {
        const hash = window.location.hash.slice(1) || '/';
        setPath(hash);
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = (to: string, options?: { state?: any, replace?: boolean }) => {
    if (options?.state) setState(options.state);
    if (options?.replace) {
        window.location.replace('#' + to);
    } else {
        window.location.hash = to;
    }
  };

  const [pathname, search] = path.split('?');

  return (
    <RouterContext.Provider value={{ path: pathname || '/', search: search ? '?' + search : '', navigate, state }}>
      {children}
    </RouterContext.Provider>
  );
};

export function useLocation() {
  const ctx = useContext(RouterContext);
  if (!ctx) return { pathname: '/', search: '', state: null };
  return { pathname: ctx.path, search: ctx.search, state: ctx.state };
}

export function useNavigate() {
  const ctx = useContext(RouterContext);
  return (to: string | number, options?: any) => {
      if (!ctx) return;
      if (typeof to === 'number') {
          window.history.go(to);
      } else {
          ctx.navigate(to, options);
      }
  };
}

export const Navigate = ({ to, replace }: { to: string, replace?: boolean }) => {
    const navigate = useNavigate();
    useEffect(() => {
        navigate(to, { replace });
    }, []);
    return null;
};

export const Routes = ({ children }: { children?: React.ReactNode }) => {
   const location = useLocation();
   let found: React.ReactNode = null;
   
   React.Children.forEach(children, (child) => {
       if (found) return;
       if (!React.isValidElement(child)) return;
       const { path, element } = child.props as any;
       if (path === '*' || path === location.pathname) {
           found = element;
       }
   });
   return <>{found}</>;
};

export const Route = (props: { path: string, element: React.ReactNode; children?: React.ReactNode }) => null;
/* --- End Custom Router --- */

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
  login: (name: string, email: string, password?: string) => Promise<UserProfile | null>;
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

const CustomerBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-2 pb-[env(safe-area-inset-bottom)] flex justify-between items-center z-40 md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
       <button 
          onClick={() => navigate('/')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${isActive('/') ? 'text-blue-600' : 'text-slate-400'}`}
       >
          <HomeIcon size={24} strokeWidth={isActive('/') ? 2.5 : 2} />
          <span className="text-[10px] font-bold">Home</span>
       </button>
       <button 
          onClick={() => navigate('/book')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${isActive('/book') || isActive('/mechanics') ? 'text-blue-600' : 'text-slate-400'}`}
       >
          <Search size={24} strokeWidth={isActive('/book') ? 2.5 : 2} />
          <span className="text-[10px] font-bold">Book</span>
       </button>
       <button 
          onClick={() => navigate('/tracking')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${isActive('/tracking') ? 'text-blue-600' : 'text-slate-400'}`}
       >
          <Clock size={24} strokeWidth={isActive('/tracking') ? 2.5 : 2} />
          <span className="text-[10px] font-bold">Activity</span>
       </button>
       <button 
          onClick={() => navigate('/profile')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${isActive('/profile') ? 'text-blue-600' : 'text-slate-400'}`}
       >
          <User size={24} strokeWidth={isActive('/profile') ? 2.5 : 2} />
          <span className="text-[10px] font-bold">Account</span>
       </button>
    </div>
  );
};

const Layout = ({ children }: { children?: React.ReactNode }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useApp();

  // Determine if we should show the simplified "app-like" header or the landing header
  const isAppView = location.pathname !== '/';

  // Specific check for Mechanic or Admin views to change header context
  const isPartnerView = location.pathname.includes('mechanic-dashboard') || location.pathname.includes('admin');
  const isLoginView = location.pathname === '/login';

  // Should we show the Customer Bottom Nav?
  const showCustomerNav = user && !user.isMechanic && !user.isAdmin && !isPartnerView && !isLoginView;

  if (isLoginView) return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-slate-800 pb-[env(safe-area-inset-bottom)]">
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 pt-[env(safe-area-inset-top)] ${isAppView || isPartnerView ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-transparent'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div 
              className="flex items-center cursor-pointer" 
              onClick={() => navigate(user?.isMechanic && isPartnerView ? '/mechanic-dashboard' : '/')}
            >
              <div className={`p-2 rounded-lg mr-2 ${isAppView || isPartnerView ? (isPartnerView ? 'bg-slate-900 text-white' : 'bg-blue-600 text-white') : 'bg-white text-blue-600'}`}>
                {isPartnerView ? <LayoutDashboard size={20}/> : <Wrench size={20} />}
              </div>
              <span className={`text-xl font-bold tracking-tight ${isAppView || isPartnerView ? 'text-slate-900' : 'text-white'}`}>
                MechanicNow <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ml-1 ${isPartnerView ? 'bg-slate-100 text-slate-600' : 'hidden'}`}>{isPartnerView ? 'Partner' : ''}</span>
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
                   {user.isAdmin && !isPartnerView && (
                        <button 
                            onClick={() => navigate('/admin')}
                            className="flex items-center gap-2 text-sm font-bold px-3 py-2 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                        >
                            <ShieldCheck size={16} /> Admin Panel
                        </button>
                   )}
                   
                   {/* Mechanic Switcher Logic */}
                   {user.isMechanic && (
                       <button
                           onClick={() => navigate(isPartnerView ? '/' : '/mechanic-dashboard')}
                           className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full transition-all border ${isPartnerView ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50' : (isAppView ? 'border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100' : 'bg-white/10 text-white border-transparent hover:bg-white/20')}`}
                       >
                           {isPartnerView ? <><User size={16}/> Customer App</> : <><LayoutDashboard size={16}/> Dashboard</>}
                       </button>
                   )}

                   <button 
                    onClick={() => navigate('/profile')}
                    className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-full transition-colors ${isAppView || isPartnerView ? 'hover:bg-slate-100 text-slate-700' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  >
                    <img src={user.avatar} alt="Avatar" className="w-8 h-8 rounded-full border border-gray-200" />
                    <span className="hidden lg:inline">{user.name}</span>
                  </button>
                  <button 
                    onClick={logout}
                    className={`text-sm font-medium ${isAppView || isPartnerView ? 'text-red-500 hover:text-red-600' : 'text-white/80 hover:text-white'}`}
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => navigate('/login')}
                  className={`text-sm font-medium px-5 py-2.5 rounded-full transition-all font-bold ${isAppView ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200' : 'bg-white text-blue-900 hover:bg-gray-100'}`}
                >
                  Sign In
                </button>
              )}
            </nav>

            {/* Mobile Menu Button - Hide if logged in Customer since they have Bottom Nav */}
            {!showCustomerNav && (
                <button 
                className="md:hidden p-2"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                {isMenuOpen ? 
                    <X className={isAppView || isPartnerView ? 'text-slate-900' : 'text-white'} /> : 
                    <Menu className={isAppView || isPartnerView ? 'text-slate-900' : 'text-white'} />
                }
                </button>
            )}
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && !showCustomerNav && (
          <div className="absolute top-full left-0 right-0 bg-white shadow-xl md:hidden p-4 flex flex-col space-y-2 text-slate-800 animate-fade-in border-t border-gray-100 h-screen">
            {user ? (
              <>
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl mb-2">
                  <img src={user.avatar} alt="Avatar" className="w-12 h-12 rounded-full bg-white border border-slate-100" />
                  <div>
                    <p className="font-bold text-lg">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>

                {user.isAdmin && (
                    <button onClick={() => { navigate('/admin'); setIsMenuOpen(false); }} className="p-4 text-left bg-slate-100 rounded-xl font-bold text-slate-900 flex items-center gap-3">
                        <ShieldCheck size={20} className="text-blue-600"/> Admin Panel
                    </button>
                )}

                <div className="space-y-1">
                    <button onClick={() => { navigate('/profile'); setIsMenuOpen(false); }} className="w-full p-4 text-left hover:bg-gray-50 rounded-xl flex items-center gap-3 font-medium text-slate-700">
                        <User size={20} className="text-slate-400"/> My Profile
                    </button>
                </div>

                {(user.isMechanic || user.isAdmin) && (
                    <div className="space-y-1 pt-4 mt-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-4 mb-2">Partner</p>
                        <button onClick={() => { navigate('/mechanic-dashboard'); setIsMenuOpen(false); }} className="w-full p-4 text-left hover:bg-blue-50 bg-blue-50/50 text-blue-700 rounded-xl flex items-center gap-3 font-bold border border-blue-100">
                            <Briefcase size={20} className="text-blue-600"/> Mechanic Dashboard
                        </button>
                    </div>
                )}
                
                <div className="mt-auto pb-8 pt-4">
                     <button onClick={() => { logout(); setIsMenuOpen(false); }} className="w-full p-4 text-center text-red-500 font-bold bg-red-50 rounded-xl">Sign Out</button>
                </div>
              </>
            ) : (
              <div className="space-y-4 pt-4">
                <a href="#" className="block p-4 hover:bg-gray-50 rounded-xl font-bold text-xl">How it Works</a>
                <a href="#" className="block p-4 hover:bg-gray-50 rounded-xl font-bold text-xl">Services</a>
                <hr className="border-gray-100"/>
                <button onClick={() => { navigate('/register-mechanic'); setIsMenuOpen(false); }} className="w-full p-4 text-left hover:bg-blue-50 text-blue-600 font-bold rounded-xl bg-blue-50/50 flex items-center gap-2">
                    <Briefcase size={20}/> Join as Mechanic
                </button>
                <button onClick={() => { navigate('/login'); setIsMenuOpen(false); }} className="w-full p-4 text-center bg-slate-900 text-white rounded-xl font-bold text-lg shadow-xl">
                    Sign In
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content with padding to account for fixed header + safe area */}
      <main className={`flex-grow pt-[calc(72px+env(safe-area-inset-top))] ${showCustomerNav ? 'pb-20' : ''}`}>
        {children}
      </main>

      {showCustomerNav && <CustomerBottomNav />}
    </div>
  );
};

const NotificationToast: React.FC<{ notifications: Notification[] }> = ({ notifications }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-24 right-4 z-[60] flex flex-col gap-2 pointer-events-none mt-[env(safe-area-inset-top)]">
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

const App = () => {
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
      notify('Welcome Back!', `Signed in as ${newUser.name}`);
      return newUser;
    } catch (e: any) {
      console.error(e);
      notify('Error', e.message || 'Login failed');
      throw e;
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
              <Route path="/admin" element={<AdminDashboard />} />
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
