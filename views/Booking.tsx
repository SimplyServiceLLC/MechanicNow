
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation as useRouteLocation } from '../App';
import { useApp } from '../App';
import { Search, MapPin, Calendar, Wrench, Car, ChevronRight, MessageSquare, Sparkles, ArrowLeft, Loader2, X, Clock, Mic, Stethoscope, Navigation, Fuel, Battery, Lock, Key, AlertTriangle, Droplet, CreditCard, Banknote, CheckCircle, Wallet, Star, ShieldCheck, Crosshair, PlusCircle } from 'lucide-react';
import { diagnoseCarIssue, chatWithMechanicAI } from '../services/geminiService';
import { Vehicle, ServiceItem, ServiceType, GeoLocation, PaymentMethod, PriceBreakdown, Mechanic } from '../types';
import { api } from '../services/api';

const VEHICLE_DATA: Record<string, string[]> = {
  "Toyota": ["Camry", "Corolla", "RAV4", "Highlander", "Tacoma", "Tundra", "Prius", "Sienna", "4Runner"],
  "Honda": ["Civic", "Accord", "CR-V", "Pilot", "Odyssey", "HR-V", "Ridgeline"],
  "Ford": ["F-150", "Explorer", "Escape", "Mustang", "Edge", "Expedition", "Ranger"],
  "Chevrolet": ["Silverado", "Equinox", "Malibu", "Tahoe", "Suburban", "Traverse"],
  "Nissan": ["Altima", "Rogue", "Sentra", "Versa", "Pathfinder", "Frontier"],
  "Hyundai": ["Elantra", "Sonata", "Tucson", "Santa Fe", "Palisade", "Kona"],
  "Jeep": ["Wrangler", "Grand Cherokee", "Cherokee", "Compass", "Renegade"],
  "Kia": ["Forte", "Optima", "K5", "Sportage", "Sorento", "Telluride"],
  "Subaru": ["Outback", "Forester", "Crosstrek", "Impreza", "Legacy", "Ascent"],
  "BMW": ["3 Series", "5 Series", "X3", "X5", "X7", "4 Series"],
  "Tesla": ["Model 3", "Model Y", "Model S", "Model X"]
};
const VEHICLE_MAKES = Object.keys(VEHICLE_DATA).sort();
const currentYear = new Date().getFullYear() + 1;
const VEHICLE_YEARS = Array.from({length: currentYear - 1989}, (_, i) => (currentYear - i).toString());

const COMMON_SERVICES: ServiceItem[] = [
  { id: 'rs1', name: 'Car Lockout Service', price: 85.00, durationMin: 30, type: ServiceType.ROADSIDE, description: 'Emergency door unlocking service.' },
  { id: 'rs2', name: 'Jump Start', price: 65.00, durationMin: 20, type: ServiceType.ROADSIDE, description: 'Battery jump start service.' },
  { id: 'rs3', name: 'Tire Change (Spare)', price: 75.00, durationMin: 45, type: ServiceType.ROADSIDE, description: 'Installation of your spare tire.' },
  { id: 'rs5', name: 'Battery Replacement', price: 149.99, durationMin: 45, type: ServiceType.ROADSIDE, description: 'New battery installation and testing.' },
  { id: 'd1', name: 'Diagnostic (Check Engine)', price: 125.00, durationMin: 60, type: ServiceType.DIAGNOSTIC, description: 'OBD-II scan and physical inspection.' },
  { id: 'm1', name: 'Oil Change (Full Synthetic)', price: 89.99, durationMin: 45, type: ServiceType.MAINTENANCE, description: 'Up to 5 qts synthetic oil + filter.' },
  { id: 'm3', name: 'Brake Pads (Front)', price: 189.00, durationMin: 90, type: ServiceType.REPAIR, description: 'Ceramic brake pads installation.' },
  { id: 'r1', name: 'Alternator Replacement', price: 380.00, durationMin: 120, type: ServiceType.REPAIR, description: 'Alternator replacement including labor.' }
];

const SERVICE_CATEGORIES = [
  { type: ServiceType.DIAGNOSTIC, label: 'Diagnostics', icon: <Stethoscope size={16} className="text-purple-500" /> },
  { type: ServiceType.MAINTENANCE, label: 'Maintenance', icon: <Droplet size={16} className="text-blue-500" /> },
  { type: ServiceType.REPAIR, label: 'Repairs', icon: <Wrench size={16} className="text-slate-500" /> },
  { type: ServiceType.ROADSIDE, label: 'Emergency', icon: <AlertTriangle size={16} className="text-amber-500" /> }
];

const AddressAutocomplete = ({ value, onChange, onSelect }: { value: string, onChange: (val: string) => void, onSelect: (address: string, lat: number, lon: number) => void }) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowSuggestions(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const handleInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; onChange(val);
    if (val.length > 2) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=us&limit=4`);
        const data = await res.json(); setSuggestions(data); setShowSuggestions(true);
      } catch (err) { console.error(err); }
    } else setShowSuggestions(false);
  };
  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="bg-slate-50 p-1 rounded-2xl border border-slate-200 shadow-sm flex items-center focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all">
          <MapPin className="text-slate-400 ml-4 flex-shrink-0" size={20} />
          <input className="flex-1 bg-transparent p-4 outline-none text-slate-900 font-semibold placeholder:text-slate-400 pr-10 min-w-0" placeholder="Where should we come?" value={value} onChange={handleInput} />
          <button onClick={() => { if (!('webkitSpeechRecognition' in window)) return; const r = new (window as any).webkitSpeechRecognition(); r.onresult = (e: any) => handleInput({ target: { value: e.results[0][0].transcript } } as any); r.start(); }} className="p-2 mr-2 text-slate-400 hover:text-blue-500 transition-colors"><Mic size={20}/></button>
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-fade-in">
          {suggestions.map((s: any, i) => (
            <button key={i} onClick={() => { const addr = s.display_name.split(',').slice(0,3).join(','); onSelect(addr, parseFloat(s.lat), parseFloat(s.lon)); onChange(addr); setShowSuggestions(false); }} className="w-full text-left p-4 hover:bg-blue-50 flex items-start gap-4 border-b border-gray-50 last:border-0 transition-colors">
              <div className="mt-1 bg-slate-100 p-2 rounded-full text-slate-500"><MapPin size={14}/></div>
              <div className="flex-1 min-w-0"><p className="text-sm font-bold text-slate-800 truncate">{s.display_name.split(',')[0]}</p><p className="text-xs text-slate-500 truncate">{s.display_name}</p></div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const AvailableMechanicsMap = ({ active, center, mechanics = [], onMapMoveEnd, isInteracting }: { active: boolean, center?: GeoLocation, mechanics?: Mechanic[], onMapMoveEnd?: (lat: number, lng: number) => void, isInteracting?: (isMoving: boolean) => void }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markers = useRef<any[]>([]);
  useEffect(() => {
    if (!mapRef.current || !(window as any).L) return;
    if (!leafletMap.current) {
      const L = (window as any).L;
      const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([36.8508, -76.2859], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      leafletMap.current = map;
      map.on('movestart', () => isInteracting?.(true));
      map.on('moveend', () => { isInteracting?.(false); onMapMoveEnd?.(map.getCenter().lat, map.getCenter().lng); });
    }
  }, []);
  useEffect(() => {
    if (center && leafletMap.current) { leafletMap.current.flyTo([center.lat, center.lng], 15, { animate: true }); }
  }, [center]);
  useEffect(() => {
    if (leafletMap.current && active) {
        const L = (window as any).L;
        markers.current.forEach(m => leafletMap.current.removeLayer(m));
        markers.current = [];
        mechanics.forEach((mech: any) => {
             if (mech.lat && mech.lng) {
                 const icon = L.divIcon({ className: 'custom-mech', html: `<div class="w-10 h-10 bg-slate-900 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></div>`, iconSize: [40, 40], iconAnchor: [20, 20] });
                 const mm = L.marker([mech.lat, mech.lng], { icon }).addTo(leafletMap.current);
                 markers.current.push(mm);
             }
        });
    }
  }, [mechanics, active, center]); 
  return <div ref={mapRef} className="w-full h-full z-0" />;
};

export const Booking: React.FC = () => {
  const navigate = useNavigate();
  const locationState = useRouteLocation().state as { prefilledIssue?: string, prefilledLocation?: string } | null;
  const { user, notify, addVehicle } = useApp();
  const [step, setStep] = useState(1);
  const [vehicle, setVehicle] = useState<Vehicle>({ year: '', make: '', model: '' });
  const [saveVehicle, setSaveVehicle] = useState(true);
  const [useSavedVehicle, setUseSavedVehicle] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<ServiceItem[]>([]);
  const [symptom, setSymptom] = useState('');
  const [aiDiagnosis, setAiDiagnosis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [location, setLocation] = useState('');
  const [geoData, setGeoData] = useState<GeoLocation | undefined>(undefined);
  const [nearbyMechanics, setNearbyMechanics] = useState<Mechanic[]>([]);
  const [dates, setDates] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  useEffect(() => {
    const d = []; const today = new Date();
    for(let i=0; i<7; i++) { const date = new Date(today); date.setDate(today.getDate() + i); d.push(date); }
    setDates(d);
    if (user && user.vehicles.length > 0) { setUseSavedVehicle(true); setVehicle(user.vehicles[0]); }
    if (locationState?.prefilledIssue) setSymptom(locationState.prefilledIssue);
    if (locationState?.prefilledLocation) setLocation(locationState.prefilledLocation);
  }, [user, locationState]);

  useEffect(() => { setAvailableModels(vehicle.make && VEHICLE_DATA[vehicle.make] ? VEHICLE_DATA[vehicle.make].sort() : []); }, [vehicle.make]);

  const handleNext = async () => {
      if (step === 1 && saveVehicle && !useSavedVehicle && user) {
          // Logic to ensure vehicle is saved to garage
          await addVehicle(vehicle);
      }
      setStep(prev => prev + 1);
  };

  const handleAnalyzeSymptom = async () => {
    if (!symptom) return; setIsAnalyzing(true);
    const result = await diagnoseCarIssue(symptom, `${vehicle.year} ${vehicle.make} ${vehicle.model}`);
    setAiDiagnosis(result.diagnosis);
    const recommended = COMMON_SERVICES.filter(s => result.recommendedServices.some(rec => s.name.toLowerCase().includes(rec.name.toLowerCase()) || rec.name.toLowerCase().includes(s.name.toLowerCase())));
    setSelectedServices(prev => {
        const next = [...prev];
        recommended.forEach(r => { if (!next.find(ex => ex.id === r.id)) next.push(r); });
        return next;
    });
    setIsAnalyzing(false);
  };

  return (
    <div className="relative min-h-screen pt-20 bg-gray-100 flex flex-col md:flex-row overflow-hidden">
      <div className="absolute inset-0 z-0 bg-slate-200 bg-map-pattern opacity-40"></div>
      <div className="relative z-10 w-full md:w-[580px] h-full p-4 md:p-10 flex flex-col overflow-y-auto no-scrollbar">
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-10 transition-all duration-500 animate-slide-up">
            <div className="flex gap-2 mb-10">
                {[1, 2, 3, 4].map(i => <div key={i} className={`h-2 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-blue-600 shadow-md shadow-blue-200' : 'bg-slate-100'}`}></div>)}
            </div>

            {step === 1 && (
                <div className="animate-fade-in">
                  <h2 className="text-3xl font-black mb-2 text-slate-900">Your Vehicle</h2>
                  <p className="text-slate-500 mb-8 font-medium">Which car needs attention today?</p>
                  
                  {user && user.vehicles.length > 0 && (
                    <div className="mb-8 p-1 bg-slate-50 rounded-2xl flex gap-1 border border-slate-100">
                         <button onClick={() => setUseSavedVehicle(true)} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${useSavedVehicle ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>My Garage</button>
                         <button onClick={() => { setUseSavedVehicle(false); setVehicle({year:'', make:'', model:''}); }} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${!useSavedVehicle ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>Add New</button>
                    </div>
                  )}

                  {useSavedVehicle && user?.vehicles ? (
                         <div className="space-y-4 mb-8">
                           {user.vehicles.map(v => (
                             <div key={v.id} onClick={() => setVehicle(v)} className={`p-5 rounded-3xl border-2 cursor-pointer transition-all flex items-center gap-5 ${vehicle.id === v.id ? 'border-blue-600 bg-blue-50/50 shadow-lg shadow-blue-100' : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
                                <div className={`p-4 rounded-2xl ${vehicle.id === v.id ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'}`}><Car size={24} /></div>
                                <div className="flex-1">
                                  <div className="font-black text-slate-900 text-lg">{v.year} {v.make} {v.model}</div>
                                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{v.engine || 'Standard Engine'}</div>
                                </div>
                                {vehicle.id === v.id && <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center"><CheckCircle size={14} className="text-white"/></div>}
                             </div>
                           ))}
                         </div>
                  ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Year</label>
                                <select className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-slate-900 font-bold focus:border-blue-600 focus:bg-white outline-none transition-all" value={vehicle.year} onChange={(e) => setVehicle({...vehicle, year: e.target.value})}>
                                    <option value="">Year</option>{VEHICLE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Make</label>
                                <select className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-slate-900 font-bold focus:border-blue-600 focus:bg-white outline-none transition-all" value={vehicle.make} onChange={(e) => setVehicle({...vehicle, make: e.target.value, model: ''})}>
                                    <option value="">Make</option>{VEHICLE_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Model</label>
                            <select className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-slate-900 font-bold focus:border-blue-600 focus:bg-white outline-none transition-all disabled:opacity-50" value={vehicle.model} onChange={(e) => setVehicle({...vehicle, model: e.target.value})} disabled={!vehicle.make}>
                                <option value="">Select Model</option>{availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        {user && (
                            <label className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl cursor-pointer hover:bg-blue-100 transition-colors border border-blue-100">
                                <input type="checkbox" className="w-5 h-5 rounded text-blue-600" checked={saveVehicle} onChange={e => setSaveVehicle(e.target.checked)} />
                                <div className="flex items-center gap-2 font-bold text-sm text-blue-800">
                                    <PlusCircle size={18}/> Save to My Garage
                                </div>
                            </label>
                        )}
                    </div>
                  )}

                  <button onClick={handleNext} disabled={!vehicle.model || !vehicle.year || !vehicle.make} className="w-full bg-slate-900 text-white p-5 rounded-[1.5rem] font-black text-lg mt-10 hover:bg-slate-800 transition-all shadow-xl active:scale-95 disabled:opacity-30 disabled:pointer-events-none">NEXT STEP</button>
                </div>
            )}

            {step === 2 && (
                <div className="animate-fade-in flex flex-col h-full">
                  <h2 className="text-3xl font-black mb-2 text-slate-900">What's the issue?</h2>
                  <p className="text-slate-500 mb-8 font-medium">Describe your car's symptoms or pick services.</p>

                  <div className="mb-10 bg-gradient-to-br from-blue-600 to-blue-700 p-8 rounded-[2rem] shadow-xl shadow-blue-200 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="flex items-center gap-2 mb-4 font-black uppercase tracking-[0.2em] text-[10px] text-blue-200"><Sparkles size={16} /> AI Mechanic Analysis</div>
                    <div className="flex gap-2 relative">
                      <input type="text" placeholder="e.g. 'Grinding noise when turning'..." className="flex-1 p-4 pr-12 rounded-2xl border-none text-slate-900 font-bold focus:ring-4 focus:ring-blue-400 outline-none bg-white placeholder:text-slate-400" value={symptom} onChange={(e) => setSymptom(e.target.value)} />
                      <button onClick={handleAnalyzeSymptom} disabled={isAnalyzing || !symptom} className="bg-slate-900 text-white px-6 rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50 active:scale-95">{isAnalyzing ? <Loader2 className="animate-spin" size={20} /> : 'ANALYZE'}</button>
                    </div>
                    {aiDiagnosis && <div className="mt-6 p-4 bg-white/10 rounded-2xl text-sm font-medium border border-white/20 backdrop-blur-sm animate-fade-in">"{aiDiagnosis}"</div>}
                  </div>

                  <div className="flex-1 overflow-y-auto pr-3 min-h-0 space-y-8 max-h-[450px] no-scrollbar">
                    {SERVICE_CATEGORIES.map(category => (
                        <div key={category.type}>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">{category.icon} {category.label}</h3>
                            <div className="space-y-4">
                                {COMMON_SERVICES.filter(s => s.type === category.type).map(service => {
                                    const isSel = !!selectedServices.find(ss => ss.id === service.id);
                                    return (
                                        <div key={service.id} onClick={() => isSel ? setSelectedServices(selectedServices.filter(ss => ss.id !== service.id)) : setSelectedServices([...selectedServices, service])} className={`p-6 rounded-[1.5rem] border-2 cursor-pointer transition-all flex justify-between items-center ${isSel ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-slate-100 hover:border-slate-300 bg-white'}`}>
                                            <div className="flex-1 pr-6"><h3 className="font-black text-slate-800 text-lg leading-tight mb-1">{service.name}</h3><p className="text-xs text-slate-400 font-bold uppercase tracking-widest">${service.price.toFixed(2)} • {service.durationMin} MINS</p></div>
                                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isSel ? 'bg-blue-600 border-blue-600 shadow-lg' : 'border-slate-200'}`}>{isSel && <CheckCircle size={18} className="text-white"/>}</div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-4 mt-8">
                      <button onClick={() => setStep(1)} className="p-5 rounded-2xl bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all">BACK</button>
                      <button onClick={handleNext} disabled={selectedServices.length === 0} className="flex-1 bg-slate-900 text-white p-5 rounded-[1.5rem] font-black text-lg hover:bg-slate-800 transition-all shadow-xl disabled:opacity-30">LOCATION</button>
                  </div>
                </div>
            )}

            {step === 3 && (
                <div className="animate-fade-in">
                  <h2 className="text-3xl font-black mb-2 text-slate-900">Your Location</h2>
                  <p className="text-slate-500 mb-8 font-medium">MechanicNow comes to your home or office.</p>
                  
                  <AddressAutocomplete value={location} onChange={setLocation} onSelect={(addr, lat, lon) => { setLocation(addr); setGeoData({ lat, lng: lon, address: addr }); }} />
                  
                  <div className="h-80 rounded-[2rem] bg-slate-200 border-4 border-slate-50 relative mt-8 overflow-hidden shadow-inner group">
                      <AvailableMechanicsMap active={!!location} center={geoData} mechanics={nearbyMechanics} onMapMoveEnd={(lat, lng) => { setGeoData({ lat, lng }); }} />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[401] pointer-events-none -mt-5 transition-transform duration-200"><MapPin size={48} className="text-slate-900 fill-slate-900 drop-shadow-2xl" /></div>
                  </div>

                  <div className="flex gap-4 mt-10">
                      <button onClick={() => setStep(2)} className="p-5 rounded-2xl bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all">BACK</button>
                      <button onClick={handleNext} disabled={!location} className="flex-1 bg-slate-900 text-white p-5 rounded-[1.5rem] font-black text-lg hover:bg-slate-800 transition-all shadow-xl disabled:opacity-30">SCHEDULE</button>
                  </div>
                </div>
            )}

            {step === 4 && (
                <div className="animate-fade-in">
                  <h2 className="text-3xl font-black mb-2 text-slate-900">Choose a Time</h2>
                  <p className="text-slate-500 mb-8 font-medium">Most repairs start same-day.</p>

                  <div className="mb-8">
                      <h3 className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">Select Date</h3>
                      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                          {dates.map((date, i) => {
                              const dateStr = date.toISOString().split('T')[0];
                              const isSel = selectedDate === dateStr;
                              return (
                                <button key={i} onClick={() => setSelectedDate(dateStr)} className={`min-w-[100px] p-6 rounded-3xl border-2 flex flex-col items-center justify-center transition-all ${isSel ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-lg shadow-blue-100' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}>
                                    <span className="text-[10px] font-black uppercase tracking-widest mb-2">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                    <span className="text-2xl font-black">{date.getDate()}</span>
                                </button>
                              );
                          })}
                      </div>
                  </div>

                  <div className="mb-8">
                      <h3 className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">Available Slots</h3>
                      <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto no-scrollbar">
                          {['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM', '5:00 PM', '7:00 PM'].map(t => (
                              <button key={t} onClick={() => setSelectedTime(t)} className={`p-4 rounded-2xl border-2 font-black text-xs tracking-widest transition-all ${selectedTime === t ? 'border-blue-600 bg-blue-600 text-white shadow-lg' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}>{t}</button>
                          ))}
                      </div>
                  </div>

                  <div className="flex gap-4 mt-10">
                    <button onClick={() => setStep(3)} className="p-5 rounded-2xl bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all">BACK</button>
                    <button onClick={() => navigate('/mechanics', { state: { vehicle, services: selectedServices, location, date: selectedDate, time: selectedTime, geoData, availableServices: COMMON_SERVICES } })} disabled={!selectedDate || !selectedTime} className="flex-1 bg-blue-600 text-white p-5 rounded-[1.5rem] font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 disabled:opacity-30">SEE QUOTES</button>
                </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
