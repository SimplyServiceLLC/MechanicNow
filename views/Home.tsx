import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Star, MapPin, ArrowRight, Shield, Zap, Clock, Mic } from 'lucide-react';

const AddressAutocomplete = ({ value, onChange, onSelect }: { value: string, onChange: (val: string) => void, onSelect?: (address: string) => void }) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    
    if (val.length > 2) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=us&limit=4`);
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(true);
      } catch (err) {
        console.error("Address fetch error", err);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative flex-1" ref={wrapperRef}>
         <div className="flex items-center bg-gray-50 rounded-xl px-4 py-3 border border-slate-200 focus-within:ring-2 focus-within:ring-black focus-within:border-transparent transition-all">
            <MapPin className="text-slate-400 mr-3 flex-shrink-0" size={20} />
            <input 
              type="text" 
              placeholder="Enter zip code or address" 
              className="bg-transparent flex-1 outline-none text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal min-w-0"
              value={value}
              onChange={handleInput}
            />
         </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-fade-in text-left">
          {suggestions.map((s: any, i) => (
            <button
              key={i}
              onClick={() => {
                const address = s.display_name.split(',').slice(0,3).join(',');
                onChange(address);
                if(onSelect) onSelect(address);
                setShowSuggestions(false);
              }}
              className="w-full text-left p-3 hover:bg-blue-50 flex items-start gap-3 border-b border-gray-50 last:border-0 transition-colors"
            >
              <div className="mt-1 bg-slate-100 p-1 rounded-full"><MapPin size={12} className="text-slate-500"/></div>
              <div>
                <p className="text-sm font-medium text-slate-800 line-clamp-1">{s.display_name.split(',')[0]}</p>
                <p className="text-xs text-slate-500 line-clamp-1">{s.display_name}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [issue, setIssue] = useState('');
  const [location, setLocation] = useState('');

  const handleSearch = () => {
    navigate('/book', { 
      state: { 
        prefilledIssue: issue, 
        prefilledLocation: location 
      } 
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="flex flex-col animate-fade-in bg-white">
      {/* Hero Section - Uber Style */}
      <section className="relative min-h-[85vh] flex items-center bg-slate-900 overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1498887960847-2a5e46312788?ixlib=rb-4.0.3&auto=format&fit=crop&w=2069&q=80" 
            alt="Mechanic working on car" 
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            
            {/* Left Content */}
            <div className="max-w-2xl text-white">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/30 mb-6 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <span className="text-xs font-bold tracking-wide uppercase">Live in 50 States</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.1]">
                The Uber for <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-white">Mobile Mechanics.</span>
              </h1>
              
              <p className="text-xl text-slate-300 mb-8 leading-relaxed max-w-lg">
                Connect instantly with top-rated mechanics nearby. Get instant quotes, book in seconds, and track your repair in real-time.
              </p>

              <div className="flex flex-wrap gap-6 text-sm font-medium text-slate-400">
                <div className="flex items-center gap-2">
                    <div className="p-1 bg-blue-500/20 rounded-full"><CheckCircle size={14} className="text-blue-400" /></div>
                    <span>Fair Price Guarantee</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="p-1 bg-blue-500/20 rounded-full"><CheckCircle size