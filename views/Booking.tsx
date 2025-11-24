

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation as useRouteLocation } from 'react-router-dom';
import { useApp } from '../App';
import { Search, MapPin, Calendar, Wrench, Car, ChevronRight, MessageSquare, Sparkles, ArrowLeft, Loader2, X, Clock, Mic, Stethoscope, Navigation, Fuel, Battery, Lock, Key, AlertTriangle, Droplet, CreditCard, Banknote, CheckCircle, Wallet, Star, ShieldCheck } from 'lucide-react';
import { diagnoseCarIssue, chatWithMechanicAI } from '../services/geminiService';
import { Vehicle, ServiceItem, ServiceType, GeoLocation, PaymentMethod, PriceBreakdown, Mechanic } from '../types';
import { api } from '../services/api';

// Extended Vehicle Data (Make -> Models)
const VEHICLE_DATA: Record<string, string[]> = {
  "Toyota": ["Camry", "Corolla", "RAV4", "Highlander", "Tacoma", "Tundra", "Prius", "Sienna", "4Runner", "Avalon", "Sequoia", "Land Cruiser", "Supra", "GR86", "Venza", "C-HR"],
  "Honda": ["Civic", "Accord", "CR-V", "Pilot", "Odyssey", "HR-V", "Ridgeline", "Passport", "Insight"],
  "Ford": ["F-150", "Explorer", "Escape", "Mustang", "Edge", "Expedition", "Ranger", "Bronco", "Maverick", "Transit", "Super Duty"],
  "Chevrolet": ["Silverado", "Equinox", "Malibu", "Tahoe", "Suburban", "Traverse", "Colorado", "Camaro", "Corvette", "Blazer", "Trailblazer"],
  "Nissan": ["Altima", "Rogue", "Sentra", "Versa", "Pathfinder", "Frontier", "Titan", "Murano", "Maxima", "Armada", "Kicks", "Leaf"],
  "Hyundai": ["Elantra", "Sonata", "Tucson", "Santa Fe", "Palisade", "Kona", "Venue", "Ioniq", "Santa Cruz"],
  "Jeep": ["Wrangler", "Grand Cherokee", "Cherokee", "Compass", "Renegade", "Gladiator", "Wagoneer"],
  "Kia": ["Forte", "Optima", "K5", "Sportage", "Sorento", "Telluride", "Soul", "Seltos", "Carnival", "Rio"],
  "Subaru": ["Outback", "Forester", "Crosstrek", "Impreza", "Legacy", "Ascent", "WRX", "BRZ"],
  "BMW": ["3 Series", "5 Series", "X3", "X5", "X7", "4 Series", "7 Series", "X1", "M3", "M5"],
  "Mercedes-Benz": ["C-Class", "E-Class", "S-Class", "GLC", "GLE", "GLS", "A-Class", "CLA", "G-Class"],
  "Volkswagen": ["Jetta", "Tiguan", "Atlas", "Passat", "Golf", "ID.4", "Taos"],
  "Audi": ["A4", "Q5", "A6", "Q7", "Q3", "A3", "e-tron", "A5", "Q8"],
  "Tesla": ["Model 3", "Model Y", "Model S", "Model X", "Cybertruck"],
  "Lexus": ["RX", "ES", "NX", "GX", "IS", "LS", "UX", "LX"],
  "Dodge": ["Charger", "Challenger", "Durango", "Hornet"],
  "Ram": ["1500", "2500", "3500", "ProMaster"],
  "Mazda": ["CX-5", "CX-30", "Mazda3", "CX-9", "MX-5 Miata", "CX-50"],
  "GMC": ["Sierra", "Yukon", "Terrain", "Acadia", "Canyon"],
  "Volvo": ["XC90", "XC60", "XC40", "S60", "S90", "V60"],
  "Buick": ["Encore", "Enclave", "Envision"],
  "Cadillac": ["Escalade", "XT5", "XT6", "CT5", "CT4", "Lyriq"],
  "Acura": ["MDX", "RDX", "TLX", "Integra"],
  "Infiniti": ["QX60", "QX50", "Q50", "QX80"],
  "Lincoln": ["Navigator", "Aviator", "Corsair", "Nautilus"],
  "Land Rover": ["Range Rover", "Defender", "Discovery", "Evoque"],
  "Porsche": ["911", "Cayenne", "Macan", "Panamera", "Taycan"],
  "Mini": ["Cooper", "Countryman", "Clubman"],
  "Mitsubishi": ["Outlander", "Eclipse Cross", "Mirage"],
  "Fiat": ["500X"],
  "Jaguar": ["F-PACE", "E-PACE", "I-PACE", "F-TYPE"],
  "Alfa Romeo": ["Giulia", "Stelvio"],
  "Genesis": ["G70", "G80", "GV70", "GV80"],
  "Polestar": ["2"],
  "Lucid": ["Air"],
  "Rivian": ["R1T", "R1S"]
};
const VEHICLE_MAKES = Object.keys(VEHICLE_DATA).sort();

// Generate years from 1990 to next year
const currentYear = new Date().getFullYear() + 1;
const VEHICLE_YEARS = Array.from({length: currentYear - 1989}, (_, i) => (currentYear - i).toString());

// Comprehensive Services List (25+ Common Items)
const COMMON_SERVICES: ServiceItem[] = [
  // Roadside / Urgent
  { id: 'rs1', name: 'Car Lockout Service', price: 85.00, durationMin: 30, type: ServiceType.REPAIR, description: 'Emergency door unlocking service.' },
  { id: 'rs2', name: 'Jump Start', price: 65.00, durationMin: 20, type: ServiceType.REPAIR, description: 'Battery jump start service.' },
  { id: 'rs3', name: 'Tire Change (Spare)', price: 75.00, durationMin: 45, type: ServiceType.REPAIR, description: 'Installation of your spare tire.' },
  { id: 'rs4', name: 'Fuel Delivery', price: 50.00, durationMin: 30, type: ServiceType.REPAIR, description: 'Delivery of 2 gallons of fuel (fuel cost extra).' },
  { id: 'rs5', name: 'Battery Replacement', price: 149.99, durationMin: 45, type: ServiceType.REPAIR, description: 'New battery installation and testing.' },
  
  // Maintenance
  { id: 'm1', name: 'Oil Change (Full Synthetic)', price: 89.99, durationMin: 45, type: ServiceType.MAINTENANCE, description: 'Up to 5 qts synthetic oil + filter.' },
  { id: 'm2', name: 'Oil Change (Conventional)', price: 59.99, durationMin: 45, type: ServiceType.MAINTENANCE, description: 'Up to 5 qts conventional oil + filter.' },
  { id: 'm3', name: 'Brake Pads Replacement (Front)', price: 189.00, durationMin: 90, type: ServiceType.REPAIR, description: 'Ceramic brake pads installation (Front axle).' },
  { id: 'm4', name: 'Brake Pads Replacement (Rear)', price: 189.00, durationMin: 90, type: ServiceType.REPAIR, description: 'Ceramic brake pads installation (Rear axle).' },
  { id: 'm5', name: 'Brake Rotors & Pads (Front)', price: 350.00, durationMin: 120, type: ServiceType.REPAIR, description: 'New rotors and pads (Front axle).' },
  { id: 'm6', name: 'Spark Plug Replacement (4-Cyl)', price: 140.00, durationMin: 60, type: ServiceType.MAINTENANCE, description: 'Replace spark plugs on 4-cylinder engine.' },
  { id: 'm7', name: 'Air Filter Replacement', price: 40.00, durationMin: 15, type: ServiceType.MAINTENANCE, description: 'Engine air filter replacement.' },
  { id: 'm8', name: 'Cabin Air Filter', price: 45.00, durationMin: 20, type: ServiceType.MAINTENANCE, description: 'Cabin air filter replacement.' },
  { id: 'm9', name: 'Wiper Blades Replacement', price: 40.00, durationMin: 15, type: ServiceType.MAINTENANCE, description: 'Front windshield wiper blades.' },

  // Diagnostics & Inspection
  { id: 'd1', name: 'Diagnostic (Check Engine Light)', price: 125.00, durationMin: 60, type: ServiceType.DIAGNOSTIC, description: 'OBD-II scan and physical inspection to identify issues.' },
  { id: 'd2', name: 'Pre-Purchase Inspection', price: 150.00, durationMin: 90, type: ServiceType.DIAGNOSTIC, description: 'Comprehensive 150-point vehicle inspection.' },
  { id: 'd3', name: 'Leak Inspection', price: 95.00, durationMin: 45, type: ServiceType.DIAGNOSTIC, description: 'Locate oil, coolant, or fluid leaks.' },
  { id: 'd4', name: 'Noise Diagnostic', price: 95.00, durationMin: 45, type: ServiceType.DIAGNOSTIC, description: 'Identify source of rattles, squeaks, or grinding.' },

  // Common Repairs
  { id: 'r1', name: 'Alternator Replacement', price: 380.00, durationMin: 120, type: ServiceType.REPAIR, description: 'Alternator replacement (parts included for most cars).' },
  { id: 'r2', name: 'Starter Replacement', price: 320.00, durationMin: 90, type: ServiceType.REPAIR, description: 'Starter motor replacement.' },
  { id: 'r3', name: 'Serpentine Belt Replacement', price: 130.00, durationMin: 45, type: ServiceType.REPAIR, description: 'Drive belt replacement.' },
  { id: 'r4', name: 'Radiator Replacement', price: 550.00, durationMin: 180, type: ServiceType.REPAIR, description: 'Radiator replacement and coolant flush.' },
  { id: 'r5', name: 'Thermostat Replacement', price: 220.00, durationMin: 90, type: ServiceType.REPAIR, description: 'Thermostat housing and seal.' },
  { id: 'r6', name: 'Water Pump Replacement', price: 450.00, durationMin: 180, type: ServiceType.REPAIR, description: 'Water pump replacement (external only).' },
  { id: 'r7', name: 'O2 Sensor Replacement', price: 210.00, durationMin: 60, type: ServiceType.REPAIR, description: 'Oxygen sensor replacement (per sensor).' },
  { id: 'r8', name: 'Headlight Bulb Replacement', price: 60.00, durationMin: 30, type: ServiceType.REPAIR, description: 'Standard halogen bulb replacement (pair).' },
];

// --- COMPONENTS ---

// Address Autocomplete Input
const AddressAutocomplete = ({ value, onChange, onSelect }: { value: string, onChange: (val: string) => void, onSelect: (address: string, lat: number, lon: number) => void }) => {
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

  const startDictation = () => {
    if (!('webkitSpeechRecognition' in window)) return;
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onresult = (e: any) => handleInput({ target: { value: e.results[0][0].transcript } } as any);
    recognition.start();
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="bg-gray-50 p-1 rounded-xl border border-slate-200 shadow-sm flex items-center relative focus-within:ring-2 focus-within:ring-blue-500 transition-all">
          <MapPin className="text-slate-400 ml-3 flex-shrink-0" size={20} />
          <input 
              type="text"
              placeholder="Enter your address"
              className="flex-1 bg-transparent p-3 outline-none text-slate-900 placeholder:text-slate-400 pr-10 min-w-0"
              value={value}
              onChange={handleInput}
          />
          <button 
              onClick={startDictation}
              className="absolute right-3 text-slate-400 hover:text-blue-600 p-1"
          >
              <Mic size={20} />
          </button>
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-fade-in">
          {suggestions.map((s: any, i) => (
            <button
              key={i}
              onClick={() => {
                const address = s.display_name.split(',').slice(0,3).join(',');
                onSelect(address, parseFloat(s.lat), parseFloat(s.lon));
                onChange(address);
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

// Interactive Mechanics Map (Leaflet)
const AvailableMechanicsMap = ({ active, center }: { active: boolean, center?: GeoLocation }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markers = useRef<any[]>([]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!(window as any).L) return; // Leaflet not available

    if (!leafletMap.current) {
      const L = (window as any).L;
      const map = L.map(mapRef.current, {
          zoomControl: false,
          scrollWheelZoom: false,
          attributionControl: false 
      }).setView([37.7749, -122.4194], 13);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      leafletMap.current = map;
    }

    if (center && leafletMap.current) {
        leafletMap.current.setView([center.lat, center.lng], 14);
        
        // Add User Marker
        const L = (window as any).L;
        
        // Clear old markers
        markers.current.forEach(m => leafletMap.current.removeLayer(m));
        markers.current = [];

        // Add user marker
        const userIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);"></div>`,
            iconSize: [14, 14]
        });
        const m = L.marker([center.lat, center.lng], { icon: userIcon }).addTo(leafletMap.current);
        markers.current.push(m);

        // Add Fake Mechanics nearby
        for (let i = 0; i < 3; i++) {
             const offsetLat = (Math.random() - 0.5) * 0.02;
             const offsetLng = (Math.random() - 0.5) * 0.02;
             const mechIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="font-size: 16px;">🚗</div>`,
                iconSize: [20, 20]
             });
             const mm = L.marker([center.lat + offsetLat, center.lng + offsetLng], { icon: mechIcon }).addTo(leafletMap.current);
             markers.current.push(mm);
        }
    }

  }, [center]);

  return (
    <div className={`w-full h-full bg-slate-100 relative overflow-hidden transition-opacity duration-1000 ${active ? 'opacity-100' : 'opacity-50 grayscale'}`}>
      <div ref={mapRef} className="w-full h-full" />
      
      {active && (
        <div className="absolute bottom-4 left-4 z-[400] bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm text-xs font-bold text-slate-700 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Local mechanics online
        </div>
      )}
    </div>
  );
};

export const BookingConfirmationView = ({ mechanic, vehicle, services, date, time, location, totalPrice, onConfirm, onBack, isProcessing, onUpdateServices, availableServices }: {
    mechanic: Mechanic, 
    vehicle: Vehicle, 
    services: ServiceItem[], 
    date: string, 
    time: string, 
    location: string, 
    totalPrice: number, 
    onConfirm: (paymentMethod?: PaymentMethod, priceBreakdown?: PriceBreakdown) => void, 
    onBack: () => void,
    isProcessing: boolean,
    onUpdateServices: (services: ServiceItem[]) => void,
    availableServices: ServiceItem[]
}) => {
    
    const [isEditingCart, setIsEditingCart] = useState(false);
    const [localServices, setLocalServices] = useState<ServiceItem[]>(services);
    const [paymentType, setPaymentType] = useState<'CARD' | 'CASH'>('CARD');
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    useEffect(() => {
        setLocalServices(services);
    }, [services]);

    const handleRemoveService = (id: string) => {
        const updated = localServices.filter(s => s.id !== id);
        setLocalServices(updated);
        onUpdateServices(updated); // Sync up
    };

    const handleAddService = (service: ServiceItem) => {
        if (localServices.find(s => s.id === service.id)) return;
        const updated = [...localServices, service];
        setLocalServices(updated);
        onUpdateServices(updated);
    };

    const currentTotal = localServices.reduce((acc, s) => acc + s.price, 0);

    // Calculate Breakdown
    const breakdown: PriceBreakdown = {
        subtotal: currentTotal,
        tax: currentTotal * 0.08,
        total: (currentTotal * 1.08),
        platformFee: currentTotal * 0.20,
        mechanicPayout: currentTotal * 0.80
    };

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-10 px-4 animate-fade-in flex items-center justify-center">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
                <div className="bg-slate-900 p-6 text-white text-center">
                    <h2 className="text-2xl font-bold mb-1">Confirm Booking</h2>
                    <p className="text-slate-400 text-sm">Review details to secure your mechanic.</p>
                </div>
            
                <div className="p-6 space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <img src={mechanic.avatar} alt={mechanic.name} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm" />
                    <div>
                        <h3 className="font-bold text-lg text-slate-900">{mechanic.name}</h3>
                        <div className="flex items-center gap-1 text-amber-500 text-sm font-medium">
                            <Star size={14} fill="currentColor" /> {mechanic.rating} ({mechanic.jobsCompleted} jobs)
                        </div>
                    </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Service Details</h3>
                            <div className="space-y-3 text-sm bg-white border border-slate-100 rounded-xl p-4">
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-slate-500 flex items-center gap-2"><CheckCircle size={14} /> Vehicle</span>
                                    <span className="font-semibold text-slate-900">{vehicle.year} {vehicle.make} {vehicle.model}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-slate-500 flex items-center gap-2"><Calendar size={14} /> Time</span>
                                    <span className="font-semibold text-slate-900">{new Date(date).toLocaleDateString()} @ {time}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-slate-500 flex items-center gap-2"><MapPin size={14} /> Location</span>
                                    <span className="font-semibold text-slate-900 text-right max-w-[120px] truncate">{location}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Payment Method</h3>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <button
                                    onClick={() => setPaymentType('CARD')}
                                    className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${paymentType === 'CARD' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}
                                >
                                    <CreditCard size={24} />
                                    <span className="text-xs font-bold">Secure Card</span>
                                </button>
                                <button
                                    onClick={() => setPaymentType('CASH')}
                                    className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${paymentType === 'CASH' ? 'border-green-600 bg-green-50 text-green-700' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}
                                >
                                    <Wallet size={24} />
                                    <span className="text-xs font-bold">Pay Later</span>
                                </button>
                            </div>
                            {paymentType === 'CARD' ? (
                                <div className="p-4 bg-white rounded-xl border border-blue-200 shadow-sm relative overflow-hidden">
                                     {/* Simulated Stripe Element Container */}
                                     <div className="flex items-center gap-3 mb-3">
                                         <div className="flex gap-1">
                                             <div className="w-8 h-5 bg-slate-200 rounded"></div>
                                             <div className="w-8 h-5 bg-slate-200 rounded"></div>
                                             <div className="w-8 h-5 bg-slate-200 rounded"></div>
                                         </div>
                                         <span className="text-[10px] text-slate-400 font-bold uppercase ml-auto flex items-center gap-1">
                                             <ShieldCheck size={10} /> Stripe Secure
                                         </span>
                                     </div>
                                     <div className="space-y-3">
                                         <div className="h-10 bg-slate-50 border border-slate-200 rounded-lg flex items-center px-3 text-sm text-slate-400 font-mono">
                                             •••• •••• •••• 4242
                                         </div>
                                         <div className="flex gap-3">
                                             <div className="h-10 flex-1 bg-slate-50 border border-slate-200 rounded-lg flex items-center px-3 text-sm text-slate-400 font-mono">
                                                MM / YY
                                             </div>
                                              <div className="h-10 flex-1 bg-slate-50 border border-slate-200 rounded-lg flex items-center px-3 text-sm text-slate-400 font-mono">
                                                CVC
                                             </div>
                                         </div>
                                     </div>
                                </div>
                            ) : (
                                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-3 shadow-sm">
                                    <div className="bg-slate-100 p-2 rounded"><Banknote size={16} className="text-slate-600"/></div>
                                    <div className="flex-1 text-left">
                                         <p className="text-xs font-bold text-slate-900">Pay After Service</p>
                                         <p className="text-[10px] text-slate-500">Zelle, Venmo, or Cash</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-3">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Summary</h3>
                            <button onClick={() => setIsEditingCart(!isEditingCart)} className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
                                {isEditingCart ? 'Done Editing' : 'Edit Services'}
                            </button>
                        </div>
                        
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 transition-all">
                            {localServices.map((s) => (
                                <div key={s.id} className="flex justify-between items-center mb-2 text-sm group">
                                    <div className="flex items-center gap-2">
                                        {isEditingCart && (
                                            <button onClick={() => handleRemoveService(s.id)} className="text-red-400 hover:text-red-600 transition-colors">
                                                <X size={14} />
                                            </button>
                                        )}
                                        <span className="text-slate-700">{s.name}</span>
                                    </div>
                                    <span className="font-medium text-slate-900">${s.price.toFixed(2)}</span>
                                </div>
                            ))}
                            
                            {isEditingCart && (
                                <div className="mt-3 pt-3 border-t border-slate-200">
                                    <p className="text-xs font-bold text-slate-500 mb-2">Add More Services:</p>
                                    <div className="max-h-40 overflow-y-auto space-y-1">
                                        {availableServices.filter(s => !localServices.find(ls => ls.id === s.id)).map(s => (
                                            <button 
                                                key={s.id} 
                                                onClick={() => handleAddService(s)}
                                                className="w-full flex justify-between items-center p-2 rounded hover:bg-white text-xs text-slate-600 border border-transparent hover:border-slate-200"
                                            >
                                                <span>{s.name}</span>
                                                <span className="font-bold text-blue-600">+ ${s.price.toFixed(0)}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                             <div className="flex justify-between mb-2 text-sm pt-4 border-t border-slate-200 border-dashed mt-2">
                                    <span className="text-slate-500">Subtotal</span>
                                    <span className="font-medium text-slate-700">${breakdown.subtotal.toFixed(2)}</span>
                             </div>
                             <div className="flex justify-between mb-2 text-sm">
                                    <span className="text-slate-500">Tax (8%)</span>
                                    <span className="font-medium text-slate-700">${breakdown.tax.toFixed(2)}</span>
                             </div>
                            <div className="border-t border-slate-200 mt-3 pt-3 flex justify-between font-bold text-xl text-slate-900">
                                <span>Total</span>
                                <span>${breakdown.total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="mt-1 w-4 h-4 rounded text-blue-600"
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                            />
                            <span className="text-xs text-slate-700">
                                I agree to the <a href="#" className="font-bold text-blue-600 hover:underline">Terms of Service</a> and acknowledge that I have read the <a href="#" className="font-bold text-blue-600 hover:underline">Liability Waiver</a>. I understand that MechanicNow connects me with independent contractors.
                            </span>
                        </label>
                    </div>

                    <div className="flex gap-4 pt-2">
                        <button 
                            onClick={onBack} 
                            disabled={isProcessing}
                            className="flex-1 py-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                        >
                            Back
                        </button>
                        <button 
                            onClick={() => onConfirm({ id: 'pm_prod', type: paymentType, last4: '4242', brand: 'Visa' }, breakdown)} 
                            disabled={isProcessing || localServices.length === 0 || !agreedToTerms}
                            className="flex-[2] py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-200 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? <Loader2 className="animate-spin" /> : <><CheckCircle size={16} /> Book Appointment</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


export const Booking: React.FC = () => {
  const navigate = useNavigate();
  const locationState = useRouteLocation().state as { prefilledIssue?: string, prefilledLocation?: string } | null;
  const { user, notify } = useApp();
  const [step, setStep] = useState(1);
  
  // Vehicle State - Clean defaults
  const [vehicle, setVehicle] = useState<Vehicle>({ 
    year: '', 
    make: '', 
    model: '',
    trim: '',
    engine: '',
    mileage: ''
  });
  const [useSavedVehicle, setUseSavedVehicle] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  
  // Service State
  const [selectedServices, setSelectedServices] = useState<ServiceItem[]>([]);
  const [symptom, setSymptom] = useState('');
  const [aiDiagnosis, setAiDiagnosis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Location State
  const [location, setLocation] = useState('');
  const [geoData, setGeoData] = useState<GeoLocation | undefined>(undefined);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Time Slot State
  const [dates, setDates] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  // AI Chat State
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'model', text: string}[]>([
    { role: 'model', text: "Hi! I'm the MechanicNow AI. Describe a noise or problem, and I can help you pick the right service." }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    // Dates
    const d = [];
    const today = new Date();
    for(let i=0; i<5; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      d.push(date);
    }
    setDates(d);

    // Auto-Geolocation on Mount if no location passed
    if (!locationState?.prefilledLocation && !geoData) {
        handleUseCurrentLocation();
    }

    // Pre-select first vehicle if logged in
    if (user && user.vehicles.length > 0) {
      setUseSavedVehicle(true);
      setVehicle(user.vehicles[0]);
    }

    // Pre-fill from Home Page
    if (locationState?.prefilledIssue) {
      setSymptom(locationState.prefilledIssue);
    }
    if (locationState?.prefilledLocation) {
      setLocation(locationState.prefilledLocation);
      if (!geoData) setGeoData({ lat: 37.77, lng: -122.41 }); 
    }
  }, [user, locationState]);

  // Update Models when Make changes
  useEffect(() => {
      if (vehicle.make && VEHICLE_DATA[vehicle.make]) {
          setAvailableModels(VEHICLE_DATA[vehicle.make].sort());
      } else {
          setAvailableModels([]);
      }
  }, [vehicle.make]);

  // Helper for local date string (YYYY-MM-DD)
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Handlers
  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const toggleService = (service: ServiceItem) => {
    if (selectedServices.find(s => s.id === service.id)) {
      setSelectedServices(selectedServices.filter(s => s.id !== service.id));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const handleAnalyzeSymptom = async () => {
    if (!symptom) return;
    setIsAnalyzing(true);
    const result = await diagnoseCarIssue(symptom, `${vehicle.year} ${vehicle.make} ${vehicle.model}`);
    setAiDiagnosis(result.diagnosis);
    
    // Auto-select services
    const recommended = COMMON_SERVICES.filter(s => 
      result.recommendedServices.some(rec => s.name.toLowerCase().includes(rec.name.toLowerCase()) || rec.name.toLowerCase().includes(s.name.toLowerCase()))
    );
    
    if (recommended.length === 0) {
        const diag = COMMON_SERVICES.find(s => s.id === 'd1') || COMMON_SERVICES[0];
        if (diag) recommended.push(diag);
    }

    setSelectedServices(prev => {
        const newServices = [...prev];
        recommended.forEach(r => {
            if (!newServices.find(existing => existing.id === r.id)) {
                newServices.push(r);
            }
        });
        return newServices;
    });

    setIsAnalyzing(false);
  };

  const handleChatSend = async () => {
    if (!currentMessage.trim()) return;
    const userMsg = currentMessage;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setCurrentMessage('');
    setIsTyping(true);

    const history = chatMessages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
    }));

    const responseText = await chatWithMechanicAI(history, userMsg);
    setChatMessages(prev => [...prev, { role: 'model', text: responseText }]);
    setIsTyping(false);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

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

  const handleUseCurrentLocation = () => {
    setGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            setGeoData({ lat: latitude, lng: longitude });
            
            // Attempt simple reverse geocoding
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await response.json();
            if (data && data.display_name) {
                const address = data.address;
                const simpleAddress = `${address.house_number || ''} ${address.road || ''}, ${address.city || address.town || ''}, ${address.state || ''}`;
                const formatted = simpleAddress.trim().replace(/^,/, '');
                setLocation(formatted);
                setGeoData({ lat: latitude, lng: longitude, address: formatted });
            } else {
                setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            }
          } catch (e) {
            console.warn("Reverse geocode failed", e);
            setLocation("Current Location (GPS)");
            setGeoData({ lat: position.coords.latitude, lng: position.coords.longitude });
          } finally {
            setGettingLocation(false);
          }
        }, 
        (error) => {
            console.error(error);
            // Don't notify on initial load failure to avoid annoyance
            if (step === 3) notify("Location Error", "Unable to retrieve location. Please enter manually.");
            setGettingLocation(false);
        },
        { enableHighAccuracy: true }
      );
    } else {
      setGettingLocation(false);
    }
  };

  const times = ['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];

  return (
    <div className="relative min-h-screen pt-20 bg-gray-100 flex flex-col md:flex-row overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-slate-200 bg-map-pattern relative">
            <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/70 to-transparent md:from-white/90 md:via-white/50 md:to-transparent pointer-events-none"></div>
        </div>
      </div>

      <div className="relative z-10 w-full md:w-[540px] md:h-[calc(100vh-80px)] md:overflow-y-auto p-4 md:p-6 flex flex-col">
        <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 transition-all duration-300 min-h-[500px] flex flex-col justify-center">
            
            <div className="flex gap-2 mb-8">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`h-2 flex-1 rounded-full transition-all ${i <= step ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                ))}
            </div>

            {step === 1 && (
                <div className="animate-fade-in">
                  <h2 className="text-2xl font-bold mb-6 text-slate-800">What are you driving?</h2>
                  
                  {user && user.vehicles.length > 0 && (
                    <div className="mb-6">
                      <div className="flex gap-2 mb-4">
                         <button 
                          onClick={() => setUseSavedVehicle(true)}
                          className={`flex-1 py-2 text-sm font-medium rounded-lg border ${useSavedVehicle ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200 text-slate-600'}`}
                         >
                           Saved Vehicles
                         </button>
                         <button 
                          onClick={() => { setUseSavedVehicle(false); setVehicle({year:'', make:'', model:''}); }}
                          className={`flex-1 py-2 text-sm font-medium rounded-lg border ${!useSavedVehicle ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200 text-slate-600'}`}
                         >
                           New Vehicle
                         </button>
                      </div>

                      {useSavedVehicle && (
                         <div className="space-y-3">
                           {user.vehicles.map(v => (
                             <div 
                                key={v.id}
                                onClick={() => setVehicle(v)}
                                className={`p-4 rounded-xl border cursor-pointer flex items-center gap-4 ${vehicle.id === v.id ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-gray-50'}`}
                             >
                                <Car className="text-slate-400 flex-shrink-0" />
                                <div>
                                  <div className="font-bold text-slate-800">{v.year} {v.make} {v.model}</div>
                                  <div className="text-xs text-slate-500 flex flex-wrap gap-2">
                                      {v.trim && <span>{v.trim}</span>}
                                      {v.engine && <span>• {v.engine}</span>}
                                  </div>
                                </div>
                             </div>
                           ))}
                         </div>
                      )}
                    </div>
                  )}

                  {(!useSavedVehicle || !user || user.vehicles.length === 0) && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-500 mb-1">Year</label>
                                <select 
                                    className="w-full p-3 border border-slate-200 rounded-xl bg-gray-50 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={vehicle.year}
                                    onChange={(e) => setVehicle({...vehicle, year: e.target.value})}
                                >
                                    <option value="">Select Year</option>
                                    {VEHICLE_YEARS.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-500 mb-1">Make</label>
                                <select 
                                    className="w-full p-3 border border-slate-200 rounded-xl bg-gray-50 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={vehicle.make}
                                    onChange={(e) => setVehicle({...vehicle, make: e.target.value, model: ''})}
                                >
                                    <option value="">Select Make</option>
                                    {VEHICLE_MAKES.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1">Model</label>
                            <div className="relative">
                                {vehicle.make ? (
                                    <select
                                        className="w-full p-3 border border-slate-200 rounded-xl bg-gray-50 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                        value={vehicle.model}
                                        onChange={(e) => setVehicle({...vehicle, model: e.target.value})}
                                        disabled={!vehicle.make}
                                    >
                                        <option value="">Select Model</option>
                                        {availableModels.map(model => (
                                            <option key={model} value={model}>{model}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input 
                                        type="text"
                                        disabled
                                        placeholder="Select a Make first"
                                        className="w-full p-3 border border-slate-200 rounded-xl bg-gray-100 text-slate-400"
                                    />
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-slate-500 mb-1">Trim (Optional)</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. LE, XLE"
                                    className="w-full p-3 border border-slate-200 rounded-xl bg-gray-50 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={vehicle.trim || ''}
                                    onChange={(e) => setVehicle({...vehicle, trim: e.target.value})}
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-500 mb-1">Engine (Optional)</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. V6"
                                    className="w-full p-3 border border-slate-200 rounded-xl bg-gray-50 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={vehicle.engine || ''}
                                    onChange={(e) => setVehicle({...vehicle, engine: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>
                  )}

                  <button 
                    onClick={handleNext} 
                    disabled={!vehicle.model || !vehicle.year || !vehicle.make}
                    className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold mt-6 hover:bg-blue-500 transition-colors disabled:opacity-50"
                  >
                      Next Step
                  </button>
                </div>
            )}

            {step === 2 && (
                <div className="animate-fade-in flex flex-col h-full">
                  <h2 className="text-2xl font-bold mb-2 text-slate-800">How can we help?</h2>
                  <p className="text-slate-500 mb-4 text-sm">Select services or describe the issue.</p>

                  <div className="mb-4 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <div className="flex items-center gap-2 mb-2 text-blue-700 font-semibold">
                      <Sparkles size={18} />
                      <span>AI Diagnostic</span>
                    </div>
                    <div className="flex gap-2 relative">
                      <input 
                        type="text" 
                        placeholder="e.g. 'Squeaking noise when braking'"
                        className="flex-1 p-3 pr-10 rounded-xl border border-blue-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 placeholder:text-slate-400"
                        value={symptom}
                        onChange={(e) => setSymptom(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAnalyzeSymptom()}
                      />
                      <button 
                        onClick={() => startDictation((text) => setSymptom(text))}
                        className="absolute right-24 top-3 text-slate-400 hover:text-blue-600"
                      >
                          <Mic size={18} />
                      </button>
                      <button 
                        onClick={handleAnalyzeSymptom}
                        disabled={isAnalyzing || !symptom}
                        className="bg-blue-600 text-white px-4 rounded-xl font-medium disabled:opacity-50"
                      >
                        {isAnalyzing ? <Loader2 className="animate-spin" size={20} /> : 'Analyze'}
                      </button>
                    </div>
                    {aiDiagnosis && (
                      <div className="mt-3 p-3 bg-white rounded-xl text-sm text-slate-700 shadow-sm border border-blue-100">
                        <p className="font-medium text-blue-800 mb-1">Diagnosis:</p>
                        {aiDiagnosis}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 min-h-0 space-y-3 max-h-[400px]">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 sticky top-0 bg-white py-2 z-10">Popular Services</h3>
                    {COMMON_SERVICES.map(service => (
                        <div 
                            key={service.id}
                            onClick={() => toggleService(service)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${
                                selectedServices.find(s => s.id === service.id) 
                                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                        >
                            <div className="flex-1 pr-4">
                                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                    {service.id.startsWith('rs') && <AlertTriangle size={16} className="text-amber-500" />}
                                    {service.id.startsWith('m') && <Droplet size={16} className="text-blue-500" />}
                                    {service.id.startsWith('d') && <Stethoscope size={16} className="text-purple-500" />}
                                    {service.id.startsWith('r') && <Wrench size={16} className="text-slate-500" />}
                                    {service.name}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-1">{service.description}</p>
                                <p className="text-xs font-bold text-slate-700 mt-2">${service.price.toFixed(2)} • {service.durationMin} mins</p>
                            </div>
                            {selectedServices.find(s => s.id === service.id) ? 
                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"><div className="w-2.5 h-2.5 bg-white rounded-full"></div></div> 
                                : <div className="w-6 h-6 border-2 border-slate-200 rounded-full"></div>
                            }
                        </div>
                    ))}
                  </div>
                  
                  {selectedServices.length > 0 && (
                      <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                          <span className="font-medium text-slate-600">{selectedServices.length} Services Selected</span>
                          <span className="font-bold text-slate-900 text-lg">${selectedServices.reduce((a,b) => a+b.price, 0).toFixed(2)}</span>
                      </div>
                  )}

                  <div className="flex gap-3 mt-4">
                      <button onClick={handleBack} className="flex-1 bg-slate-100 text-slate-700 p-4 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                          Back
                      </button>
                      <button 
                        onClick={handleNext} 
                        disabled={selectedServices.length === 0}
                        className="flex-[2] bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-500 transition-colors disabled:opacity-50"
                      >
                          Location
                      </button>
                  </div>
                </div>
            )}

            {step === 3 && (
                <div className="animate-fade-in">
                  <h2 className="text-2xl font-bold mb-6 text-slate-800">Where should we come?</h2>
                  
                  {/* Address Auto Complete */}
                  <div className="mb-3">
                     <AddressAutocomplete 
                        value={location}
                        onChange={setLocation}
                        onSelect={(addr, lat, lon) => {
                            setLocation(addr);
                            setGeoData({ lat, lng: lon, address: addr });
                        }}
                     />
                  </div>
                  
                  <button 
                    onClick={handleUseCurrentLocation}
                    disabled={gettingLocation}
                    className="text-sm text-blue-600 font-medium flex items-center gap-2 mb-6 hover:text-blue-700 disabled:opacity-50"
                  >
                    {gettingLocation ? <Loader2 className="animate-spin" size={16} /> : <MapPin size={16} />}
                    {gettingLocation ? "Finding location..." : "Use my current location"}
                  </button>

                  <div className="h-64 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-6 overflow-hidden relative shadow-inner">
                      <AvailableMechanicsMap active={!!location || !!geoData} center={geoData} />
                  </div>

                  <div className="flex gap-3 mt-6">
                      <button onClick={handleBack} className="flex-1 bg-slate-100 text-slate-700 p-4 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                          Back
                      </button>
                      <button 
                        onClick={handleNext}
                        disabled={!location} 
                        className="flex-[2] bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-500 transition-colors disabled:opacity-50"
                      >
                          Schedule
                      </button>
                  </div>
                </div>
            )}

            {step === 4 && (
                <div className="animate-fade-in">
                  <h2 className="text-2xl font-bold mb-6 text-slate-800">When works for you?</h2>
                  
                  <div className="mb-6">
                      <h3 className="text-sm font-bold text-slate-500 mb-3 uppercase tracking-wide">Date</h3>
                      <div className="flex gap-3 overflow-x-auto pb-2">
                          {dates.map((date, i) => {
                              const dateStr = getLocalDateString(date);
                              const isSelected = selectedDate === dateStr;
                              return (
                                <button 
                                    key={i}
                                    onClick={() => setSelectedDate(dateStr)}
                                    className={`min-w-[80px] p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${isSelected ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'}`}
                                >
                                    <span className="text-xs font-medium">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                    <span className="text-xl font-bold">{date.getDate()}</span>
                                </button>
                              );
                          })}
                      </div>
                  </div>

                  <div className="mb-6">
                      <h3 className="text-sm font-bold text-slate-500 mb-3 uppercase tracking-wide">Time</h3>
                      <div className="grid grid-cols-3 gap-2">
                          {times.map(time => (
                              <button 
                                key={time}
                                onClick={() => setSelectedTime(time)}
                                className={`p-3 rounded-xl border text-sm font-medium transition-all ${selectedTime === time ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'}`}
                              >
                                  {time}
                              </button>
                          ))}
                      </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button onClick={handleBack} className="flex-1 bg-slate-100 text-slate-700 p-4 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                        Back
                    </button>
                    <button 
                        onClick={() => navigate('/mechanics', { state: { vehicle, services: selectedServices, location, date: selectedDate, time: selectedTime, geoData, availableServices: COMMON_SERVICES } })} 
                        disabled={!selectedDate || !selectedTime}
                        className="flex-[2] bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-500 transition-colors disabled:opacity-50"
                    >
                        See Quotes
                    </button>
                </div>
                </div>
            )}

        </div>
      </div>

      {/* Chat Bubble */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {showChat && (
            <div className="mb-4 w-80 bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-slide-up h-96">
                <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Sparkles size={16} />
                        <span className="font-bold">Mechanic AI</span>
                    </div>
                    <button onClick={() => setShowChat(false)}><ArrowLeft size={18}/></button>
                </div>
                <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-3">
                    {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-700 shadow-sm rounded-bl-none border border-slate-100'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                         <div className="flex justify-start">
                             <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm border border-slate-100">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                </div>
                             </div>
                         </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
                <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
                    <input 
                        className="flex-1 p-2 text-sm bg-gray-100 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Ask about repairs..."
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                    />
                    <button onClick={handleChatSend} className="bg-blue-600 text-white p-2 rounded-lg">
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>
        )}
        <button 
            onClick={() => setShowChat(!showChat)}
            className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-500 transition-transform hover:scale-105"
        >
            {showChat ? <X size={24} /> : <MessageSquare size={24} />}
        </button>
      </div>

    </div>
  );
};