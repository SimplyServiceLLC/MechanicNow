


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
                Mechanics that <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-white">come to you.</span>
              </h1>
              
              <p className="text-xl text-slate-300 mb-8 leading-relaxed max-w-lg">
                Skip the repair shop. Get instant quotes, book a certified mobile mechanic, and track your repair in real-time.
              </p>

              <div className="flex flex-wrap gap-6 text-sm font-medium text-slate-400">
                <div className="flex items-center gap-2">
                    <div className="p-1 bg-blue-500/20 rounded-full"><CheckCircle size={14} className="text-blue-400" /></div>
                    <span>Fair Price Guarantee</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="p-1 bg-blue-500/20 rounded-full"><CheckCircle size={14} className="text-blue-400" /></div>
                    <span>12-Month Warranty</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="p-1 bg-blue-500/20 rounded-full"><CheckCircle size={14} className="text-blue-400" /></div>
                    <span>Certified Pros</span>
                </div>
              </div>
            </div>

            {/* Floating Booking Widget (Uber Style) */}
            <div className="w-full md:w-[450px] bg-white rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
                <div className="p-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Get an instant quote</h2>
                    
                    <div className="space-y-4">
                        <div className="space-y-1">
                             <label className="text-xs font-bold text-slate-500 uppercase">Car Issue</label>
                             <div className="flex items-center bg-gray-50 rounded-xl px-4 py-3 border border-slate-200 focus-within:ring-2 focus-within:ring-black focus-within:border-transparent transition-all">
                                <Zap className="text-slate-400 mr-3" size={20} />
                                <input 
                                  type="text" 
                                  placeholder="e.g. Squeaky brakes, Oil change" 
                                  className="bg-transparent w-full outline-none text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal"
                                  value={issue}
                                  onChange={(e) => setIssue(e.target.value)}
                                  onKeyDown={handleKeyDown}
                                />
                             </div>
                        </div>
                        
                        <div className="space-y-1">
                             <label className="text-xs font-bold text-slate-500 uppercase">Location</label>
                             <AddressAutocomplete value={location} onChange={setLocation} />
                        </div>

                        <button 
                            onClick={handleSearch}
                            className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all flex justify-center items-center gap-2 mt-2 group"
                        >
                            See Prices <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                        <p className="text-slate-500 text-sm">
                            Or <button onClick={() => navigate('/book')} className="text-blue-600 font-bold hover:underline">use AI Diagnostics</button> if you're unsure.
                        </p>
                    </div>
                </div>
                <div className="bg-blue-50 p-4 text-center text-blue-800 text-xs font-semibold">
                    Is it fixed yet? Book now and track in real-time.
                </div>
            </div>

          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-10 bg-white border-b border-slate-100">
         <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center md:justify-between items-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            {['Toyota', 'Honda', 'Ford', 'BMW', 'Tesla', 'Chevrolet'].map(brand => (
                <span key={brand} className="text-xl font-bold text-slate-400">{brand}</span>
            ))}
         </div>
      </section>

      {/* Feature Grid */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Why go to the shop?</h2>
            <p className="text-xl text-slate-500">We bring the shop to your driveway, office, or parking lot.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
             {[
                { 
                    icon: Clock, 
                    title: "Save Time", 
                    desc: "No more waiting rooms or arranging rides. We work while you relax or work." 
                },
                { 
                    icon: Shield, 
                    title: "Transparency", 
                    desc: "Upfront pricing. No hidden fees. You only pay after the work is done and verified." 
                },
                { 
                    icon: Star, 
                    title: "Top Mechanics", 
                    desc: "Our mechanics are vetted, background-checked, and highly rated by neighbors." 
                }
             ].map((feature, i) => (
                 <div key={i} className="flex flex-col items-start p-6 rounded-3xl hover:bg-gray-50 transition-colors">
                    <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-slate-200">
                        <feature.icon size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                    <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
                 </div>
             ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-slate-100">
          <div className="max-w-5xl mx-auto px-4">
              <div className="bg-blue-600 rounded-[2.5rem] p-12 md:p-16 text-center text-white relative overflow-hidden shadow-2xl shadow-blue-200">
                  <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                  <div className="relative z-10">
                      <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to get back on the road?</h2>
                      <p className="text-blue-100 text-lg mb-10 max-w-2xl mx-auto">Join thousands of happy car owners who have switched to MechanicNow.</p>
                      <button 
                        onClick={() => navigate('/book')}
                        className="bg-white text-blue-900 px-10 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-transform hover:scale-105 shadow-xl"
                      >
                          Book a Mechanic
                      </button>
                  </div>
              </div>
          </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-16 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8">
           <div>
               <h4 className="font-bold text-slate-900 mb-4">Company</h4>
               <ul className="space-y-2 text-sm text-slate-500">
                   <li><a href="#" className="hover:text-blue-600">About us</a></li>
                   <li><a href="#" className="hover:text-blue-600">Careers</a></li>
                   <li><a href="#" className="hover:text-blue-600">Press</a></li>
               </ul>
           </div>
           <div>
               <h4 className="font-bold text-slate-900 mb-4">Services</h4>
               <ul className="space-y-2 text-sm text-slate-500">
                   <li><a href="#" className="hover:text-blue-600">Oil Change</a></li>
                   <li><a href="#" className="hover:text-blue-600">Brake Repair</a></li>
                   <li><a href="#" className="hover:text-blue-600">Diagnostics</a></li>
               </ul>
           </div>
           <div>
               <h4 className="font-bold text-slate-900 mb-4">Support</h4>
               <ul className="space-y-2 text-sm text-slate-500">
                   <li><a href="#" className="hover:text-blue-600">Help Center</a></li>
                   <li><a href="#" className="hover:text-blue-600">Safety</a></li>
                   <li><a href="#" className="hover:text-blue-600">Terms</a></li>
               </ul>
           </div>
           <div>
               <h4 className="font-bold text-slate-900 mb-4">Partner</h4>
               <button onClick={() => navigate('/register-mechanic')} className="text-sm font-bold text-blue-600 hover:underline">Sign up to be a mechanic</button>
           </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-slate-100 text-center text-slate-400 text-sm">
            © 2024 MechanicNow Inc. The Uber for Mechanics.
        </div>
      </footer>
    </div>
  );
};
