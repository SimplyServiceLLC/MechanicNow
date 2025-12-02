
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, MapPin, ArrowRight, Shield, Zap, Clock, Wrench, Crosshair, Loader2 } from 'lucide-react';

const AddressAutocomplete = ({ value, onChange, onSelect }: { value: string, onChange: (val: string) => void, onSelect?: (address: string) => void }) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isLocating, setIsLocating] = useState(false);

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

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    
    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
                const data = await res.json();
                if (data && data.address) {
                    const addr = data.address;
                    // Format: House Number Street, City, State
                    const formatted = `${addr.house_number || ''} ${addr.road || ''}, ${addr.city || addr.town || ''}, ${addr.state || ''}`.trim().replace(/^,/, '');
                    onChange(formatted);
                    if(onSelect) onSelect(formatted);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsLocating(false);
            }
        },
        (err) => {
            console.error(err);
            setIsLocating(false);
            alert("Could not retrieve location. Please enter address manually.");
        },
        { enableHighAccuracy: true }
    );
  };

  return (
    <div className="relative flex-1" ref={wrapperRef}>
         <div className="flex items-center bg-gray-50 rounded-xl px-4 py-3 border border-slate-200 focus-within:ring-2 focus-within:ring-black focus-within:border-transparent transition-all">
            <MapPin className="text-slate-400 mr-3 flex-shrink-0" size={20} />
            <input 
              type="text" 
              placeholder="Enter address or zip code" 
              className="bg-transparent flex-1 outline-none text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal min-w-0"
              value={value}
              onChange={handleInput}
            />
            <button 
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="ml-2 p-1.5 hover:bg-white rounded-lg text-blue-600 transition-colors"
                title="Use Current Location"
            >
                {isLocating ? <Loader2 className="animate-spin" size={20} /> : <Crosshair size={20} />}
            </button>
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
                    <div className="p-1 bg-blue-500/20 rounded-full"><CheckCircle size={14} className="text-blue-400" /></div>
                    <span>Certified Pros</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="p-1 bg-blue-500/20 rounded-full"><CheckCircle size={14} className="text-blue-400" /></div>
                    <span>12-Month Warranty</span>
                </div>
              </div>

            </div>

            {/* Right Form */}
            <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl animate-slide-up relative z-20">
               <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">What's Wrong?</label>
                  <div className="relative">
                    <Wrench className="absolute left-4 top-3.5 text-slate-400" size={20} />
                    <input 
                      type="text" 
                      placeholder="e.g. Brakes squeaking, Oil change..." 
                      className="w-full bg-gray-50 text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal p-3 pl-12 rounded-xl border border-slate-200 focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                      value={issue}
                      onChange={(e) => setIssue(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                  </div>
               </div>

               <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Where?</label>
                  <AddressAutocomplete value={location} onChange={setLocation} />
               </div>

               <button 
                onClick={handleSearch}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold p-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-2 group"
               >
                 See Prices <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
               </button>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="bg-white py-12 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="text-center">
                    <p className="text-3xl font-black text-slate-900">50k+</p>
                    <p className="text-sm text-slate-500 font-medium">Repairs Completed</p>
                </div>
                <div className="text-center">
                    <p className="text-3xl font-black text-slate-900">4.8/5</p>
                    <p className="text-sm text-slate-500 font-medium">Average Rating</p>
                </div>
                <div className="text-center">
                    <p className="text-3xl font-black text-slate-900">30min</p>
                    <p className="text-sm text-slate-500 font-medium">Avg. Arrival Time</p>
                </div>
                <div className="text-center">
                    <p className="text-3xl font-black text-slate-900">30%</p>
                    <p className="text-sm text-slate-500 font-medium">Cheaper than Shops</p>
                </div>
            </div>
        </div>
      </section>

       {/* Features Grid */}
       <section className="py-20 bg-gray-50">
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
               <div className="text-center max-w-3xl mx-auto mb-16">
                   <h2 className="text-3xl font-bold text-slate-900 mb-4">Why car owners love MechanicNow</h2>
                   <p className="text-slate-500 text-lg">Skip the repair shop waiting room. We bring certified mechanics directly to your driveway.</p>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                       <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
                           <Shield size={28} />
                       </div>
                       <h3 className="text-xl font-bold text-slate-900 mb-3">12-Month / 12,000-Mile Warranty</h3>
                       <p className="text-slate-500 leading-relaxed">
                           Every service is backed by our nationwide 12-month / 12,000-mile warranty. Peace of mind included.
                       </p>
                   </div>
                   <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                       <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-6">
                           <Zap size={28} />
                       </div>
                       <h3 className="text-xl font-bold text-slate-900 mb-3">Instant Quotes</h3>
                       <p className="text-slate-500 leading-relaxed">
                           No more "we'll call you with an estimate". See the exact price for parts and labor before you book.
                       </p>
                   </div>
                   <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                       <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-6">
                           <Clock size={28} />
                       </div>
                       <h3 className="text-xl font-bold text-slate-900 mb-3">Same-Day Service</h3>
                       <p className="text-slate-500 leading-relaxed">
                           Most repairs are completed within 24 hours. Emergency roadside assistance is available 24/7.
                       </p>
                   </div>
               </div>
           </div>
       </section>

       {/* Footer */}
       <footer className="bg-slate-900 text-slate-400 py-16 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-2 text-white mb-6">
                            <div className="p-2 bg-blue-600 rounded-xl text-white"><Wrench size={20} /></div>
                            <span className="text-xl font-bold tracking-tight">MechanicNow</span>
                        </div>
                        <p className="text-slate-400 mb-6 max-w-xs leading-relaxed">
                            The modern way to fix your car. Certified mobile mechanics, transparent pricing, and a nationwide warranty.
                        </p>
                        <div className="flex gap-4">
                            {/* Social Placeholders */}
                            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors cursor-pointer">X</div>
                            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors cursor-pointer">In</div>
                            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors cursor-pointer">Fb</div>
                        </div>
                    </div>
                    
                    <div>
                        <h4 className="text-white font-bold mb-6">Services</h4>
                        <ul className="space-y-3 text-sm">
                            <li><a href="#" className="hover:text-white transition-colors">Oil Change</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Brake Repair</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Diagnostics</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Battery Replacement</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Starter / Alternator</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6">Legal</h4>
                        <ul className="space-y-3 text-sm">
                            <li><a href="#/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                            <li><a href="#/terms" className="hover:text-white transition-colors">Liability Waiver</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                            <li><a href="/register-mechanic" className="hover:text-white transition-colors font-bold text-blue-400">Partner Login</a></li>
                        </ul>
                    </div>
                </div>
                <div className="pt-8 border-t border-slate-800 text-sm text-slate-500 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p>&copy; {new Date().getFullYear()} MechanicNow Inc. All rights reserved.</p>
                    <p>Made with ❤️ for drivers everywhere.</p>
                </div>
            </div>
       </footer>
    </div>
  );
};
