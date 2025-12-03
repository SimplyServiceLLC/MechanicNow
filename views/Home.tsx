import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from '../App';
import { CheckCircle, MapPin, ArrowRight, Shield, Zap, Clock, Wrench, Crosshair, Loader2, Star, Battery, Car, Activity, ChevronRight, Play, Gauge, Calendar } from 'lucide-react';

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
         <div className="flex items-center bg-gray-50/50 hover:bg-white rounded-xl px-4 py-3.5 border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all shadow-sm">
            <MapPin className="text-blue-500 mr-3 flex-shrink-0" size={20} />
            <input 
              type="text" 
              placeholder="Enter zip code or address" 
              className="bg-transparent flex-1 outline-none text-slate-900 font-semibold placeholder:text-slate-400 placeholder:font-normal min-w-0"
              value={value}
              onChange={handleInput}
            />
            <button 
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="ml-2 p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                title="Use Current Location"
            >
                {isLocating ? <Loader2 className="animate-spin" size={18} /> : <Crosshair size={18} />}
            </button>
         </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-fade-in text-left">
          {suggestions.map((s: any, i) => (
            <button
              key={i}
              onClick={() => {
                const address = s.display_name.split(',').slice(0,3).join(',');
                onChange(address);
                if(onSelect) onSelect(address);
                setShowSuggestions(false);
              }}
              className="w-full text-left p-4 hover:bg-blue-50 flex items-start gap-3 border-b border-gray-50 last:border-0 transition-colors group"
            >
              <div className="mt-0.5 bg-slate-100 p-1.5 rounded-full group-hover:bg-blue-100 text-slate-500 group-hover:text-blue-600 transition-colors"><MapPin size={14}/></div>
              <div>
                <p className="text-sm font-bold text-slate-800 line-clamp-1">{s.display_name.split(',')[0]}</p>
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

  const handleServiceClick = (serviceName: string) => {
      navigate('/book', { state: { prefilledIssue: serviceName }});
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="flex flex-col animate-fade-in bg-white">
      {/* Modern Hero Section */}
      <section className="relative min-h-[90vh] flex items-center bg-slate-900 overflow-hidden pt-16">
        {/* Dynamic Background */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=2574&auto=format&fit=crop" 
            alt="Mechanic background" 
            className="w-full h-full object-cover opacity-30 scale-105 animate-subtle-zoom"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900/40"></div>
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-16">
            
            {/* Left Content */}
            <div className="max-w-2xl text-white pt-10 lg:pt-0 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 mb-8 backdrop-blur-md">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                </span>
                <span className="text-sm font-bold tracking-wide">Available Nationwide</span>
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-black tracking-tight mb-6 leading-[1.05] drop-shadow-sm">
                Car Repair <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Without the Shop.</span>
              </h1>
              
              <p className="text-xl text-slate-300 mb-10 leading-relaxed max-w-xl mx-auto lg:mx-0 font-light">
                We send certified mobile mechanics to your driveway or office. 
                <span className="text-white font-medium"> Instant quotes, fair prices, and a 12-month warranty.</span>
              </p>

              <div className="flex flex-wrap justify-center lg:justify-start gap-4 text-sm font-bold text-slate-300 mb-8">
                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg border border-white/10">
                    <CheckCircle size={16} className="text-blue-400" />
                    <span>7 Days a Week</span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg border border-white/10">
                    <CheckCircle size={16} className="text-blue-400" />
                    <span>ASE Certified</span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg border border-white/10">
                    <CheckCircle size={16} className="text-blue-400" />
                    <span>Background Checked</span>
                </div>
              </div>

            </div>

            {/* Right Form Card */}
            <div className="w-full max-w-[460px] bg-white/95 backdrop-blur-xl rounded-[2rem] p-8 shadow-2xl border border-white/20 relative z-20 animate-slide-up">
               <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600"></div>
               
               <h2 className="text-2xl font-black text-slate-900 mb-1">Get an Instant Quote</h2>
               <p className="text-slate-500 text-sm mb-6">No credit card required to see pricing.</p>

               <div className="space-y-5">
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">What's Wrong?</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-3.5 text-blue-500"><Wrench size={20} /></div>
                        <input 
                          type="text" 
                          placeholder="e.g. Oil Change, Brakes..." 
                          className="w-full bg-gray-50/50 hover:bg-white text-slate-900 font-semibold placeholder:text-slate-400 placeholder:font-normal p-3.5 pl-12 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                          value={issue}
                          onChange={(e) => setIssue(e.target.value)}
                          onKeyDown={handleKeyDown}
                        />
                      </div>
                   </div>

                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Your Location</label>
                      <AddressAutocomplete value={location} onChange={setLocation} />
                   </div>

                   <button 
                    onClick={handleSearch}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg p-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 group mt-2"
                   >
                     See My Price <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
                   </button>
               </div>
               
               <p className="text-center text-xs text-slate-400 mt-6 font-medium">
                   50,000+ happy customers this year
               </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Services Grid */}
      <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-end mb-10">
                  <div>
                      <h2 className="text-3xl font-black text-slate-900 mb-2">Popular Services</h2>
                      <p className="text-slate-500 text-lg">Common repairs we perform daily.</p>
                  </div>
                  <button onClick={() => navigate('/book')} className="hidden md:flex items-center gap-2 text-blue-600 font-bold hover:underline">
                      View all services <ArrowRight size={16}/>
                  </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div onClick={() => handleServiceClick('Oil Change')} className="group bg-slate-50 hover:bg-white p-6 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-xl transition-all cursor-pointer">
                      <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-700 group-hover:bg-blue-600 group-hover:text-white transition-colors mb-4 border border-slate-100">
                          <Gauge size={28} />
                      </div>
                      <h3 className="font-bold text-lg text-slate-900 mb-1">Oil Change</h3>
                      <p className="text-sm text-slate-500 mb-4">Synthetic & Conventional</p>
                      <span className="text-blue-600 text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">Book Now <ChevronRight size={14}/></span>
                  </div>

                  <div onClick={() => handleServiceClick('Brake Pads')} className="group bg-slate-50 hover:bg-white p-6 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-xl transition-all cursor-pointer">
                      <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-700 group-hover:bg-blue-600 group-hover:text-white transition-colors mb-4 border border-slate-100">
                          <Activity size={28} />
                      </div>
                      <h3 className="font-bold text-lg text-slate-900 mb-1">Brake Repair</h3>
                      <p className="text-sm text-slate-500 mb-4">Pads, Rotors & Calipers</p>
                      <span className="text-blue-600 text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">Book Now <ChevronRight size={14}/></span>
                  </div>

                  <div onClick={() => handleServiceClick('Car Not Starting')} className="group bg-slate-50 hover:bg-white p-6 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-xl transition-all cursor-pointer">
                      <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-700 group-hover:bg-blue-600 group-hover:text-white transition-colors mb-4 border border-slate-100">
                          <Battery size={28} />
                      </div>
                      <h3 className="font-bold text-lg text-slate-900 mb-1">Battery / Starter</h3>
                      <p className="text-sm text-slate-500 mb-4">Replacement & Testing</p>
                      <span className="text-blue-600 text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">Book Now <ChevronRight size={14}/></span>
                  </div>

                  <div onClick={() => handleServiceClick('Diagnostic')} className="group bg-slate-50 hover:bg-white p-6 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-xl transition-all cursor-pointer">
                      <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-700 group-hover:bg-blue-600 group-hover:text-white transition-colors mb-4 border border-slate-100">
                          <Zap size={28} />
                      </div>
                      <h3 className="font-bold text-lg text-slate-900 mb-1">Diagnostics</h3>
                      <p className="text-sm text-slate-500 mb-4">Check Engine Light</p>
                      <span className="text-blue-600 text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">Book Now <ChevronRight size={14}/></span>
                  </div>
              </div>
          </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-slate-900 text-white overflow-hidden relative">
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2"></div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="text-center max-w-2xl mx-auto mb-20">
                  <h2 className="text-3xl md:text-5xl font-black mb-6">Repair without the wait.</h2>
                  <p className="text-slate-400 text-lg">We've simplified car repair to be as easy as ordering takeout. Here is how it works.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                  {/* Connecting Line (Desktop) */}
                  <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-blue-900 via-blue-500 to-blue-900 border-t border-dashed border-white/20"></div>

                  <div className="relative text-center group">
                      <div className="w-24 h-24 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-white/10 shadow-2xl relative z-10 group-hover:scale-110 transition-transform duration-300">
                          <span className="absolute -top-3 -right-3 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold text-sm border-2 border-slate-900">1</span>
                          <Crosshair size={40} className="text-blue-400" />
                      </div>
                      <h3 className="text-xl font-bold mb-3">Get a Quote</h3>
                      <p className="text-slate-400 leading-relaxed">Tell us what's wrong and get a fair, transparent price instantly.</p>
                  </div>

                  <div className="relative text-center group">
                      <div className="w-24 h-24 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-white/10 shadow-2xl relative z-10 group-hover:scale-110 transition-transform duration-300">
                          <span className="absolute -top-3 -right-3 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold text-sm border-2 border-slate-900">2</span>
                          <Calendar size={40} className="text-blue-400" />
                      </div>
                      <h3 className="text-xl font-bold mb-3">Book a Time</h3>
                      <p className="text-slate-400 leading-relaxed">Choose a time and place that works for you. Home or office.</p>
                  </div>

                  <div className="relative text-center group">
                      <div className="w-24 h-24 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-white/10 shadow-2xl relative z-10 group-hover:scale-110 transition-transform duration-300">
                          <span className="absolute -top-3 -right-3 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold text-sm border-2 border-slate-900">3</span>
                          <Car size={40} className="text-blue-400" />
                      </div>
                      <h3 className="text-xl font-bold mb-3">We Fix It</h3>
                      <p className="text-slate-400 leading-relaxed">Our mechanic arrives fully equipped. You pay only after the job is done.</p>
                  </div>
              </div>
          </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="bg-white py-16 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-slate-100">
                <div className="text-center px-4">
                    <p className="text-4xl font-black text-slate-900 mb-1">50k+</p>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Repairs Done</p>
                </div>
                <div className="text-center px-4">
                    <p className="text-4xl font-black text-slate-900 mb-1">4.8</p>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-wider flex justify-center items-center gap-1">
                        Avg Rating <Star size={12} className="fill-amber-400 text-amber-400"/>
                    </p>
                </div>
                <div className="text-center px-4">
                    <p className="text-4xl font-black text-slate-900 mb-1">30<span className="text-2xl text-slate-400">%</span></p>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Savings vs Shops</p>
                </div>
                <div className="text-center px-4">
                    <p className="text-4xl font-black text-slate-900 mb-1">12<span className="text-xl text-slate-400">mo</span></p>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Warranty</p>
                </div>
            </div>
        </div>
      </section>

       {/* Features Grid */}
       <section className="py-24 bg-slate-50">
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
               <div className="text-center max-w-3xl mx-auto mb-16">
                   <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-6">Why car owners love us</h2>
                   <p className="text-slate-500 text-lg">We're changing the way car repair works by putting you in control.</p>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   <div className="bg-white p-10 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all">
                       <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-8">
                           <Shield size={32} />
                       </div>
                       <h3 className="text-xl font-bold text-slate-900 mb-4">12-Month Warranty</h3>
                       <p className="text-slate-500 leading-relaxed font-medium">
                           Every service is backed by our nationwide 12-month / 12,000-mile warranty. If something goes wrong, we fix it for free.
                       </p>
                   </div>
                   <div className="bg-white p-10 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all">
                       <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-8">
                           <Zap size={32} />
                       </div>
                       <h3 className="text-xl font-bold text-slate-900 mb-4">Total Transparency</h3>
                       <p className="text-slate-500 leading-relaxed font-medium">
                           No hidden fees. No upselling. You approve the price before we start, and the price never changes.
                       </p>
                   </div>
                   <div className="bg-white p-10 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all">
                       <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-8">
                           <Clock size={32} />
                       </div>
                       <h3 className="text-xl font-bold text-slate-900 mb-4">Same-Day Service</h3>
                       <p className="text-slate-500 leading-relaxed font-medium">
                           Don't leave your car at the shop for days. Most of our repairs are completed in your driveway in under 2 hours.
                       </p>
                   </div>
               </div>
           </div>
       </section>

       {/* Testimonials */}
       <section className="py-20 bg-white">
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
               <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">Real 5-Star Reviews</h2>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   {[
                       {name: "Sarah M.", text: "The mechanic arrived right on time and fixed my brakes in my office parking lot. Saved me so much time!", car: "Honda Civic"},
                       {name: "James T.", text: "Pricing was 40% less than the dealership quoted me. The mechanic was super professional and clean.", car: "Ford F-150"},
                       {name: "Emily R.", text: "I love that I didn't have to tow my car. They came to my house and replaced the starter in 45 minutes.", car: "Toyota Camry"}
                   ].map((review, i) => (
                       <div key={i} className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                           <div className="flex text-amber-400 mb-4">
                               <Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" />
                           </div>
                           <p className="text-slate-700 mb-6 font-medium leading-relaxed">"{review.text}"</p>
                           <div className="flex items-center gap-3">
                               <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-700">{review.name[0]}</div>
                               <div>
                                   <p className="text-sm font-bold text-slate-900">{review.name}</p>
                                   <p className="text-xs text-slate-500">{review.car}</p>
                               </div>
                           </div>
                       </div>
                   ))}
               </div>
           </div>
       </section>

       {/* CTA Section */}
       <section className="py-20 bg-slate-50">
           <div className="max-w-5xl mx-auto px-4 text-center">
               <div className="bg-blue-600 rounded-[2.5rem] p-12 md:p-20 shadow-2xl text-white relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                   <div className="relative z-10">
                       <h2 className="text-4xl md:text-5xl font-black mb-6">Ready to fix your car?</h2>
                       <p className="text-blue-100 text-xl mb-10 max-w-2xl mx-auto">Get a free quote in seconds. No credit card required.</p>
                       <button 
                        onClick={() => navigate('/book')}
                        className="bg-white text-blue-600 px-10 py-5 rounded-2xl font-bold text-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                       >
                           Get My Price
                       </button>
                   </div>
               </div>
           </div>
       </section>

       {/* Footer */}
       <footer className="bg-slate-900 text-slate-400 py-16">
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
