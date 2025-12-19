
import React, { useState } from 'react';
import { useNavigate } from '../App';
import { useApp } from '../App';
import { Wrench, Lock, Mail, ArrowLeft, CheckCircle, User, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  const { login, register, notify } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    if (isSignUp) {
        if (!name) {
            notify('Missing Info', 'Please enter your full name.');
            return;
        }
        await performRegister(name, email, password);
    } else {
        await performLogin(email, password);
    }
  };

  const performLogin = async (uEmail: string, uPass: string) => {
      try {
        const user = await login(uEmail, uPass);
        routeUser(user);
      } catch (error) {
          // Context handles notification, but we can log specifically here if needed
      }
  };

  const performRegister = async (uName: string, uEmail: string, uPass: string) => {
      try {
          const user = await register(uName, uEmail, uPass);
          routeUser(user);
      } catch (error) {
          // Context handles notification
      }
  };

  const routeUser = (user: any) => {
      if (user) {
        if (user.isAdmin) {
            navigate('/admin');
        } else if (user.isMechanic) {
            navigate('/mechanic-dashboard');
        } else {
            navigate('/profile');
        }
      }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email) {
          notify('Error', 'Please enter your email address.');
          return;
      }
      try {
          await api.auth.resetPassword(email);
          setResetSent(true);
      } catch (e: any) {
          notify('Error', e.message || 'Failed to send reset email');
      }
  };

  // Check connection mode for UI hint
  const connection = api.status.getConnectionInfo();

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden z-10 animate-fade-in">
        
        {connection.mode === 'MOCK' && (
            <div className="bg-amber-100 text-amber-800 px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2">
                <AlertTriangle size={14} /> Demo Mode Active
            </div>
        )}

        <div className="p-8">
            <button onClick={() => navigate('/')} className="mb-6 text-slate-400 hover:text-slate-600 flex items-center gap-2 text-sm font-bold transition-colors">
                <ArrowLeft size={16} /> Back to Home
            </button>

            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
                    <Wrench className="text-white" size={32} />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">{isSignUp ? 'Create Account' : 'Welcome Back'}</h1>
                <p className="text-slate-500">{isSignUp ? 'Join MechanicNow to book repairs.' : 'Sign in to manage your repairs.'}</p>
            </div>

            {!isResetting ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                    {isSignUp && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required={isSignUp}
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                            <input 
                                type="email" 
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    
                    <div>
                         <div className="flex justify-between items-center mb-1 ml-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase">Password</label>
                            {!isSignUp && <button type="button" onClick={() => setIsResetting(true)} className="text-xs font-bold text-blue-600 hover:underline">Forgot?</button>}
                         </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                            <input 
                                type="password" 
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all shadow-xl active:scale-95"
                    >
                        {isSignUp ? 'Create Account' : 'Sign In'}
                    </button>
                </form>
            ) : (
                <form onSubmit={handleResetPassword} className="space-y-4 animate-fade-in">
                    <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 border border-blue-100 mb-4">
                        Enter your email address and we'll send you a link to reset your password.
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                            <input 
                                type="email" 
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    {resetSent ? (
                        <div className="p-4 bg-green-50 text-green-700 rounded-xl flex items-center gap-2 font-bold justify-center">
                            <CheckCircle size={20} /> Email Sent!
                        </div>
                    ) : (
                        <button 
                            type="submit" 
                            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-500 transition-all shadow-xl active:scale-95"
                        >
                            Send Reset Link
                        </button>
                    )}
                    <button type="button" onClick={() => setIsResetting(false)} className="w-full text-slate-500 font-bold py-2 hover:text-slate-800">
                        Cancel
                    </button>
                </form>
            )}

            <div className="mt-8 text-center space-y-4">
                <p className="text-slate-500 text-sm">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"} <span onClick={() => setIsSignUp(!isSignUp)} className="text-blue-600 font-bold cursor-pointer hover:underline">{isSignUp ? 'Sign In' : 'Sign Up'}</span>
                </p>
                <div className="pt-4 border-t border-slate-100">
                    <span onClick={() => navigate('/register-mechanic')} className="text-xs font-bold text-slate-400 uppercase tracking-wide cursor-pointer hover:text-slate-600">
                        Apply as a Mechanic
                    </span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
