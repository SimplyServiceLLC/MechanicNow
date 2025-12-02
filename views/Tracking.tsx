
import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { BookingStatus, Mechanic, ServiceItem, Vehicle, GeoLocation } from '../types';
import { Phone, MessageSquare, CheckCircle, MapPin, ArrowLeft, Wrench, Star, Navigation, Send, X, AlertTriangle, HelpCircle } from 'lucide-react';
import { api } from '../services/api';

// Helper to calculate bearing between two points
const toRad = (deg: number) => deg * Math.PI / 180;
const toDeg = (rad: number) => rad * 180 / Math.PI;

const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const dLon = toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - 
              Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
    const brng = toDeg(Math.atan2(y, x));
    return (brng + 360) % 360;
};

const LiveMap = ({ 
  mechanicPos, 
  customerPos, 
  rotation,
  realMechanicLocation,
  realCustomerLocation 
}: { 
  mechanicPos: {x: number, y: number}, 
  customerPos: {x: number, y: number}, 
  rotation: number,
  realMechanicLocation: GeoLocation | null,
  realCustomerLocation: GeoLocation | null
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const mechanicMarkerRef = useRef<any>(null);
  const customerMarkerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || !(window as any).L) return;

    if (!leafletMap.current) {
      const map = (window as any).L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([36.8508, -76.2859], 15);
      
      (window as any).L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      leafletMap.current = map;
    }

    const L = (window as any).L;

    // Determine Coordinates
    // Default to Hampton Roads if nothing else available
    let cLat = 36.8508;
    let cLng = -76.2859;

    if (realCustomerLocation) {
        cLat = realCustomerLocation.lat;
        cLng = realCustomerLocation.lng;
    } else {
        // Fallback simulation base
        cLat = 36.8508 + (customerPos.y - 50) * 0.0001;
        cLng = -76.2859 + (customerPos.x - 50) * 0.0001;
    }

    let mLat = cLat;
    let mLng = cLng;

    if (realMechanicLocation) {
        mLat = realMechanicLocation.lat;
        mLng = realMechanicLocation.lng;
    } else {
        // Simulation relative to customer (mechanicPos is 0-100)
        // Scale factor: 0.0005 degrees per unit approx 50 meters
        mLat = cLat + (mechanicPos.y - 50) * 0.0005;
        mLng = cLng + (mechanicPos.x - 50) * 0.0005;
    }

    // Update Customer Marker
    if (!customerMarkerRef.current) {
        const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);"></div>`,
            iconSize: [14, 14]
        });
        customerMarkerRef.current = L.marker([cLat, cLng], { icon }).addTo(leafletMap.current);
    } else {
        customerMarkerRef.current.setLatLng([cLat, cLng]);
    }

    // Update Mechanic Marker
    if (!mechanicMarkerRef.current) {
         const carIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `
            <div style="transform: rotate(${rotation}deg); transition: transform 0.5s linear;">
                <div style="width: 20px; height: 36px; background: #1e293b; border-radius: 4px; position: relative; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                    <div style="width: 16px; height: 10px; background: #334155; position: absolute; top: 6px; left: 2px; border-radius: 2px;"></div>
                    <div style="width: 4px; height: 4px; background: #fbbf24; border-radius: 50%; position: absolute; top: 2px; left: 2px;"></div>
                    <div style="width: 4px; height: 4px; background: #fbbf24; border-radius: 50%; position: absolute; top: 2px; right: 2px;"></div>
                </div>
            </div>`,
            iconSize: [20, 36],
            iconAnchor: [10, 18]
        });
        mechanicMarkerRef.current = L.marker([mLat, mLng], { icon: carIcon }).addTo(leafletMap.current);
    } else {
        mechanicMarkerRef.current.setLatLng([mLat, mLng]);
        // Update rotation
        const icon = mechanicMarkerRef.current.options.icon;
        icon.options.html = `
            <div style="transform: rotate(${rotation}deg); transition: transform 0.5s linear;">
                <div style="width: 20px; height: 36px; background: #1e293b; border-radius: 4px; position: relative; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                    <div style="width: 16px; height: 10px; background: #334155; position: absolute; top: 6px; left: 2px; border-radius: 2px;"></div>
                    <div style="width: 4px; height: 4px; background: #fbbf24; border-radius: 50%; position: absolute; top: 2px; left: 2px;"></div>
                    <div style="width: 4px; height: 4px; background: #fbbf24; border-radius: 50%; position: absolute; top: 2px; right: 2px;"></div>
                </div>
            </div>`;
        mechanicMarkerRef.current.setIcon(icon);
    }

    // Fit bounds to keep both in view
    const bounds = L.latLngBounds([cLat, cLng], [mLat, mLng]);
    leafletMap.current.fitBounds(bounds, { padding: [100, 100], maxZoom: 16, animate: true });

  }, [mechanicPos, customerPos, rotation, realMechanicLocation, realCustomerLocation]);

  return <div ref={mapRef} className="w-full h-full bg-slate-200" />;
};

// Chat Component
const CustomerChat = ({ mechanicName, jobId, onClose }: { mechanicName: string, jobId: string, onClose: () => void }) => {
    const storageKey = `mn_chat_${jobId}`;
    const [messages, setMessages] = useState<{id: string, sender: 'mechanic' | 'customer', text: string}[]>([]);
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
  
    useEffect(() => {
        // Initial load
        const saved = localStorage.getItem(storageKey);
        if (saved) setMessages(JSON.parse(saved));
  
        // Poll for updates (Simulating real-time socket)
        const interval = setInterval(() => {
            const current = localStorage.getItem(storageKey);
            if (current) {
                const parsed = JSON.parse(current);
                if (parsed.length !== messages.length) {
                    setMessages(parsed);
                }
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [storageKey]);
  
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
  
    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) return;
        
        const newMsg = { 
            id: Date.now().toString(), 
            sender: 'customer' as const, 
            text: inputText, 
            timestamp: Date.now() 
        };
        
        const updatedMessages = [...messages, newMsg];
        setMessages(updatedMessages);
        localStorage.setItem(storageKey, JSON.stringify(updatedMessages));
        setInputText('');
    };
  
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[500px] animate-scale-up">
              <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold">
                          {mechanicName.charAt(0)}
                      </div>
                      <div>
                          <h3 className="font-bold">{mechanicName}</h3>
                          <p className="text-xs text-slate-300">Mechanic</p>
                      </div>
                  </div>
                  <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="flex-1 bg-slate-50 p-4 overflow-y-auto space-y-4">
                  {messages.length === 0 && (
                      <p className="text-center text-slate-400 text-sm mt-4">Start conversation with {mechanicName}...</p>
                  )}
                  {messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${msg.sender === 'customer' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}`}>
                              {msg.text}
                          </div>
                      </div>
                  ))}
                  <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex gap-2">
                  <input 
                    className="flex-1 bg-slate-100 rounded-xl pl-4 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="Type a message..." 
                    value={inputText} 
                    onChange={e => setInputText(e.target.value)} 
                  />
                  <button type="submit" className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500"><Send size={20} /></button>
              </form>
          </div>
      </div>
    );
};

// Support Modal
const SupportModal = ({ onClose, jobId }: { onClose: () => void, jobId?: string }) => {
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await api.support.createTicket(jobId || 'general', 'Customer Issue Report', message);
            setSent(true);
        } catch(e) {
            alert("Failed to send ticket.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6">
                {sent ? (
                    <div className="text-center py-8">
                        <CheckCircle size={48} className="text-green-500 mx-auto mb-4"/>
                        <h3 className="text-xl font-bold text-slate-900">Issue Reported</h3>
                        <p className="text-slate-500 mb-6">Our support team will contact you shortly.</p>
                        <button onClick={onClose} className="w-full py-3 bg-slate-100 rounded-xl font-bold">Close</button>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><AlertTriangle size={20} className="text-amber-500"/> Report Issue</h3>
                            <button onClick={onClose}><X size={20} className="text-slate-400"/></button>
                        </div>
                        <p className="text-sm text-slate-500 mb-4">Please describe the problem with your current service.</p>
                        <textarea 
                            className="w-full p-3 border border-slate-200 rounded-xl h-32 mb-4 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Mechanic hasn't arrived..."
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                        />
                        <button 
                            onClick={handleSubmit} 
                            disabled={!message || isSubmitting}
                            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold disabled:opacity-50"
                        >
                            {isSubmitting ? "Sending..." : "Submit Report"}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export const Tracking: React.FC = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const { notify, addServiceRecord } = useApp();
    
    // Core Status
    const [status, setStatus] = useState<BookingStatus>(BookingStatus.PENDING);
    const [showChat, setShowChat] = useState(false);
    const [showSupport, setShowSupport] = useState(false);
    
    // Data from nav
    const bookingData = state as { jobId?: string, mechanic: Mechanic, vehicle: Vehicle, services: ServiceItem[], totalPrice: number, location: string, geoData?: GeoLocation } | null;

    // Positional Data
    const [mechanicPos, setMechanicPos] = useState({ x: 10, y: 10 });
    const [targetMechanicPos, setTargetMechanicPos] = useState({ x: 10, y: 10 });
    
    const [customerRealLoc, setCustomerRealLoc] = useState<GeoLocation | null>(state?.geoData || null); 
    const [driverRealLoc, setDriverRealLoc] = useState<GeoLocation | null>(null);
    const [carRotation, setCarRotation] = useState(180);
    
    const useRealGps = useRef(false);
    const prevDriverLoc = useRef<GeoLocation | null>(null);

    // 1. Live GPS Tracking (Customer)
    useEffect(() => {
        if (!navigator.geolocation) return;
        
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setCustomerRealLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            (err) => console.warn("Location Access denied", err),
            { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    // 2. Job Subscription (Driver Status & Location)
    useEffect(() => {
        if (!bookingData?.jobId) return;

        const unsubscribe = api.mechanic.subscribeToJobRequest(bookingData.jobId, (job) => {
            if (!job) return;
            
            let newStatus = BookingStatus.PENDING;
            if (job.status === 'ACCEPTED') newStatus = BookingStatus.CONFIRMED;
            else if (job.status === 'ARRIVED') newStatus = BookingStatus.ARRIVED;
            else if (job.status === 'IN_PROGRESS') newStatus = BookingStatus.IN_PROGRESS;
            else if (job.status === 'COMPLETED') newStatus = BookingStatus.COMPLETED;
            
            setStatus(prev => {
                if (newStatus !== prev) {
                    if (newStatus === BookingStatus.CONFIRMED) notify('Booking Confirmed', `${bookingData.mechanic.name} is on the way.`);
                    if (newStatus === BookingStatus.ARRIVED) notify('Mechanic Arrived', 'Meet them at your vehicle.');
                    if (newStatus === BookingStatus.IN_PROGRESS) notify('Work Started', 'Your mechanic is working.');
                    if (newStatus === BookingStatus.COMPLETED) {
                         // Play success sound logic here if desired
                    }
                }
                return newStatus;
            });

            if (job.driverLocation) {
                // Calculate rotation based on previous location
                if (prevDriverLoc.current) {
                    const dist = Math.sqrt(Math.pow(job.driverLocation.lat - prevDriverLoc.current.lat, 2) + Math.pow(job.driverLocation.lng - prevDriverLoc.current.lng, 2));
                    // Only update rotation if movement is significant (> ~5-10 meters) to avoid jitter
                    if (dist > 0.00005) {
                        const angle = calculateBearing(prevDriverLoc.current.lat, prevDriverLoc.current.lng, job.driverLocation.lat, job.driverLocation.lng);
                        setCarRotation(angle);
                    }
                }
                prevDriverLoc.current = job.driverLocation;
                setDriverRealLoc(job.driverLocation);
                useRealGps.current = true;
            }
        });
        
        return () => unsubscribe();
    }, [bookingData?.jobId]); 

    // 3. Coordinate Projection (Visual simulation for fallback)
    useEffect(() => {
        if (status === BookingStatus.CONFIRMED || status === BookingStatus.EN_ROUTE) {
            setTargetMechanicPos({ x: 50, y: 50 }); // Move to center visual logic
        }
    }, [status]);

    // 4. Smooth Animation Loop (Lerp for fallback visual)
    useEffect(() => {
        let animId: number;
        
        const animate = () => {
            setMechanicPos(prev => {
                const dx = targetMechanicPos.x - prev.x;
                const dy = targetMechanicPos.y - prev.y;
                const dist = Math.sqrt(dx*dx + dy*dy);

                if (dist < 0.1) {
                    if (status === BookingStatus.ARRIVED) return {x: 48, y: 52}; 
                    return prev;
                }
                
                const factor = 0.005; // Slow smooth movement
                return {
                    x: prev.x + dx * factor,
                    y: prev.y + dy * factor
                };
            });
            animId = requestAnimationFrame(animate);
        };

        animId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animId);
    }, [targetMechanicPos, status]);

    if (!bookingData) return <div className="pt-24 text-center">Invalid Booking</div>;

    const getStatusLabel = () => {
        switch(status) {
            case BookingStatus.PENDING: return "Connecting...";
            case BookingStatus.CONFIRMED: return "En Route";
            case BookingStatus.ARRIVED: return "Arrived";
            case BookingStatus.IN_PROGRESS: return "In Progress";
            case BookingStatus.COMPLETED: return "Completed";
            default: return "Waiting...";
        }
    };

    return (
        <div className="relative h-screen w-full flex flex-col bg-white">
            <button 
                onClick={() => navigate('/')}
                className="absolute top-6 left-6 z-50 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-slate-700 hover:bg-gray-50"
                style={{ marginTop: 'env(safe-area-inset-top)' }}
            >
                <ArrowLeft size={20} />
            </button>
            
            <button 
                onClick={() => setShowSupport(true)}
                className="absolute top-6 right-6 z-50 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-slate-700 hover:bg-gray-50"
                style={{ marginTop: 'env(safe-area-inset-top)' }}
                title="Report Issue"
            >
                <HelpCircle size={20} />
            </button>

            <div className="absolute inset-0 z-0">
                <LiveMap 
                    mechanicPos={mechanicPos} 
                    customerPos={{x: 50, y: 50}} 
                    rotation={carRotation}
                    realMechanicLocation={driverRealLoc}
                    realCustomerLocation={customerRealLoc}
                />
                
                {/* Overlay Gradients for Depth */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/90 to-transparent pointer-events-none z-0"></div>
                <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-white/90 to-transparent pointer-events-none z-0"></div>
            </div>

            {/* Status Card */}
            <div className="relative z-10 flex-1 flex flex-col justify-between pointer-events-none pb-[env(safe-area-inset-bottom)]">
                <div className="pt-24 px-4 pointer-events-auto flex flex-col items-center" style={{ paddingTop: 'calc(6rem + env(safe-area-inset-top))' }}>
                    <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xl w-full max-w-sm transform transition-all hover:scale-[1.02] border border-slate-700">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1">Status</p>
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    {getStatusLabel()}
                                    {status === BookingStatus.CONFIRMED && <span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>}
                                    {status === BookingStatus.IN_PROGRESS && <Wrench className="animate-spin-slow" size={20} />}
                                    {status === BookingStatus.COMPLETED && <CheckCircle className="text-green-400" size={24} />}
                                </h2>
                            </div>
                            <div className="bg-white/10 px-2 py-1 rounded text-xs font-mono">
                                {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="relative pt-2">
                            <div className="overflow-hidden h-1.5 mb-2 text-xs flex rounded bg-slate-700">
                                <div style={{ width: status === BookingStatus.COMPLETED ? '100%' : status === BookingStatus.IN_PROGRESS ? '75%' : status === BookingStatus.ARRIVED ? '50%' : '25%' }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-1000"></div>
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                                <span>En Route</span>
                                <span>Arrived</span>
                                <span>Working</span>
                                <span>Done</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mechanic Details Card */}
                <div className="pb-8 px-4 pointer-events-auto">
                    <div className="bg-white rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] max-w-md mx-auto overflow-hidden border border-slate-100">
                        <div className="p-6 border-b border-gray-100 flex items-center gap-4">
                            <div className="relative">
                                <img src={bookingData.mechanic.avatar} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md" />
                                <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-sm border border-slate-100">
                                    <Star size={12} fill="#eab308" className="text-amber-400" />
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-slate-900">{bookingData.mechanic.name}</h3>
                                <div className="flex items-center text-sm text-slate-500 gap-2">
                                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{bookingData.vehicle.make} Expert</span>
                                    <span>• {bookingData.mechanic.rating} ★</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setShowChat(true)}
                                    className="w-11 h-11 rounded-full bg-gray-50 flex items-center justify-center text-slate-700 hover:bg-gray-100 transition-colors border border-gray-100 relative"
                                >
                                    <MessageSquare size={20} />
                                </button>
                                <a href={`tel:5555555555`} className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-200">
                                    <Phone size={20} />
                                </a>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50/50">
                             <div className="flex items-start gap-4 mb-4">
                                <div className="p-2 bg-white rounded-full shadow-sm text-slate-400"><MapPin size={18} /></div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">{bookingData.location}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Service Location</p>
                                </div>
                             </div>
                             <div className="flex items-start gap-4">
                                <div className="p-2 bg-white rounded-full shadow-sm text-slate-400"><CheckCircle size={18} /></div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">
                                        {bookingData.services.map(s => s.name).join(', ')}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {bookingData.vehicle.year} {bookingData.vehicle.make} {bookingData.vehicle.model}
                                    </p>
                                </div>
                             </div>
                        </div>

                        {status === BookingStatus.COMPLETED ? (
                             <div className="p-4 bg-white">
                                <button onClick={() => navigate('/profile')} className="w-full py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 transition-all shadow-lg shadow-green-200">
                                    Rate & Pay ${bookingData.totalPrice}
                                </button>
                             </div>
                        ) : (
                            <div className="p-4 bg-white">
                                <button className="w-full py-4 text-slate-400 font-bold text-sm hover:text-red-500 transition-colors">
                                    Cancel Booking
                                </button>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {showChat && bookingData.jobId && (
                <CustomerChat 
                    mechanicName={bookingData.mechanic.name} 
                    jobId={bookingData.jobId} 
                    onClose={() => setShowChat(false)} 
                />
            )}
            
            {showSupport && (
                <SupportModal onClose={() => setShowSupport(false)} jobId={bookingData.jobId} />
            )}
        </div>
    );
};
