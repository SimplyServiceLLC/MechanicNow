

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { Wrench, Mic, Lock, Mail } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useApp();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      // Name is optional for login, but used for registration fallback
      login(name || email.split('@')[0], email, password);
      navigate('/profile');
    }
  };

  const startDictation = (onResult: (text: string) => void) => {
    if (!('webkitSpeechRecognition' in window)) {
        alert("Speech recognition not supported in this browser.");
        return;
    }
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onresult = (e: any) => {
        onResult(e.results[0][0].transcript);
    };
    recognition.start();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 pt-20">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-blue-600 rounded-xl text-white">
            <Wrench size={32} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">Welcome Back</h2>
        <p className="text-slate-500 text-center mb-8">Sign in to your account.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <div className="relative">
                <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                <input 
                type="email" 
                required
                className="w-full p-3 pl-10 pr-10 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-slate-900 placeholder:text-slate-400 transition-all"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                />
                <button 
                    type="button"
                    onClick={() => startDictation((text) => setEmail(text.replace(/\s/g, '').toLowerCase()))}
                    className="absolute right-3 top-3 text-slate-400 hover:text-blue-600"
                >
                    <Mic size={20} />
                </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                <input 
                type="password" 
                required
                className="w-full p-3 pl-10 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-slate-900 placeholder:text-slate-400 transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                />
            </div>
          </div>
          
          <div className="pt-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name (New Users)</label>
              <div className="relative">
                <input 
                type="text" 
                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-slate-900 placeholder:text-slate-400 transition-all"
                placeholder="e.g. Alex Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                />
              </div>
          </div>

          <button 
            type="submit" 
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-colors shadow-lg shadow-blue-200"
          >
            Sign In / Register
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
                Are you a professional? <button onClick={() => navigate('/register-mechanic')} className="text-blue-600 font-bold hover:underline">Apply to be a Partner</button>
            </p>
        </div>
      </div>
    </div>
  );
};