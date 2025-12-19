
import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from '../App';
import { useApp } from '../App';
import { BookingStatus, Mechanic, ServiceItem, Vehicle, GeoLocation } from '../types';
import { Phone, MessageSquare, CheckCircle, MapPin, ArrowLeft, Wrench, Star, Navigation, Send, X, AlertTriangle, HelpCircle, Radar } from 'lucide-react';
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
  realCustomerLocation,
  isSearching
}: { 
  mechanicPos: {x: number, y: number}, 
  customerPos: {x: number, y: number}, 
  rotation: number,
  realMechanicLocation: GeoLocation | null,
  realCustomerLocation: GeoLocation | null,
  isSearching: boolean
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const mechanicMarkerRef = useRef<any>(null);
  const customerMarkerRef = useRef<any>(null);
  const pulseOverlayRef = useRef<any>(null);

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
    let cLat = realCustomerLocation?.lat || 36.8508;
    let cLng = realCustomerLocation?.lng || -76.2859;

    // Update Customer Marker
    if (!customerMarkerRef.current) {
        const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `
                <div class="relative flex items-center justify-center">
                    <div class="absolute w-8 h-8 bg-blue-500/20 rounded-full animate-ping"></div>
                    <div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg z-10"></div>
                </div>`,
            iconSize: [32, 32]
        });
        customerMarkerRef.current = L.marker([cLat, cLng], { icon, zIndexOffset: 500 }).addTo(leafletMap.current);
    } else {
        customerMarkerRef.current.setLatLng([cLat, cLng]);
    }

    // Searching Pulse Effect (Uber-like Radar)
    if (isSearching && !pulseOverlayRef.current) {
        pulseOverlayRef.current = L.circle([cLat, cLng], {
            radius: 400,
            color: '#3b82f6',
            weight: 1,
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            className: 'animate-pulse'
        }).addTo(leafletMap.current);
    } else if (!isSearching && pulseOverlayRef.current) {
        leafletMap.current.removeLayer(pulseOverlayRef.current);
        pulseOverlayRef.current = null;
    }

    // Update Mechanic Marker
    if (realMechanicLocation || !isSearching) {
        let mLat = realMechanicLocation?.lat || (cLat + (mechanicPos.y - 50) * 0.0005);
        let mLng = realMechanicLocation?.lng || (cLng + (mechanicPos.x - 50) * 0.0005);

        if (!mechanicMarkerRef.current) {
             const carIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `
                <div style="transform: rotate(${rotation}deg); transition: transform 0.5s linear;">
                    <div style="width: 24px; height: 40px; background: #1e293b; border-radius: 6px; position: relative; box-shadow: 0 4px 10px rgba(0,0,0,0.4);">
                        <div style="width: 18px; height: 12px; background: #475569; position: absolute; top: 8px; left: 3px; border-radius: 2px;"></div>
                        <div style="width: 5px; height: 5px; background: #facc15; border-radius: 50%; position: absolute; top: 2px; left: 3px; box-shadow: 0 0 5px #facc15;"></div>
                        <div style="width: 5px; height: 5px; background: #facc15; border-radius: 50%; position: absolute; top: 2px; right: 3px; box-shadow: 0 0 5px #facc15;"></div>
                    </div>
                </div>`,
                iconSize: [24, 40],
                iconAnchor: [12, 20]
            });
            mechanicMarkerRef.current = L.marker([mLat, mLng], { icon: carIcon, zIndexOffset: 1000 }).addTo(leafletMap.current);
        } else {
            mechanicMarkerRef.current.setLatLng([mLat, mLng]);
            const icon = mechanicMarkerRef.current.options.icon;
            icon.options.html = `
                <div style="transform: rotate(${rotation}deg); transition: transform 0.5s linear;">
                    <div style="width: 24px; height: 40px; background: #1e293b; border-radius: 6px; position: relative; box-shadow: 0 4px 10px rgba(0,0,0,0.4);">
                        <div style="width: 18px; height: 12px; background: #475569; position: absolute; top: 8px; left: 3px; border-radius: 2px;"></div>
                        <div style="width: 5px; height: 5px; background: #facc15; border-radius: 50%; position: absolute; top: 2px; left: 3px; box-shadow: 0 0 5px #facc15;"></div>
                        <div style="width: 5px; height: 5px; background: #facc15; border-radius: 50%; position: absolute; top: 2px; right: 3px; box-shadow: 0 0 5px #facc15;"></div>
                    </div>
                </div>`;
            mechanicMarkerRef.current.setIcon(icon);
        }

        const bounds = L.latLngBounds([cLat, cLng], [mLat, mLng]);
        leafletMap.current.fitBounds(bounds, { padding: [80, 80], maxZoom: 16, animate: true });
    } else {
        leafletMap.current.setView([cLat, cLng], 15, { animate: true });
    }

  }, [mechanicPos, customerPos, rotation, realMechanicLocation, realCustomerLocation, isSearching]);

  return <div ref={mapRef} className="w-full h-full bg-slate-200" />;
};

const CustomerChat = ({ mechanicName, jobId, onClose }: { mechanicName: string, jobId: string, onClose: () => void }) => {
    const [messages, setMessages] = useState<{id: string, sender: 'mechanic' | 'customer', text: string}[]>([]);
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const unsubscribe = api.chat.subscribe(jobId, (msgs) => setMessages(msgs));
        return () => unsubscribe();
    }, [jobId]);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault(); if (!inputText.trim()) return;
        await api.chat.sendMessage(jobId, 'customer', inputText); setInputText('');
    };
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[550px] animate-scale-up">
              <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold border border-slate-600">{mechanicName.charAt(0)}</div>
                      <div>
                          <h3 className="font-bold">{mechanicName}</h3>
                          <div className="flex items-center gap-1 text-[10px] text-green-400 font-bold uppercase tracking-widest"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> Active Now</div>
                      </div>
                  </div>
                  <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-colors"><X size={24} /></button>
              </div>
              <div className="flex-1 bg-slate-50 p-4 overflow-y-auto space-y-4">
                  {messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-4 rounded-2xl text-sm shadow-sm ${msg.sender === 'customer' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none'}`}>
                              {msg.text}
                          </div>
                      </div>
                  ))}
                  <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex gap-2">
                  <input className="flex-1 bg-slate-100 rounded-2xl pl-5 pr-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium" placeholder="Type a message..." value={inputText} onChange={e => setInputText(e.target.value)} />
                  <button type="submit" className="p-3.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-500 shadow-lg shadow-blue-200 transition-transform active:scale-95"><Send size={22} /></button>
              </form>
          </div>
      </div>
    );
};

const SupportModal = ({ onClose, jobId }: { onClose: () => void, jobId?: string }) => {
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sent, setSent] = useState(false);
    const handleSubmit = async () => {
        setIsSubmitting(true);
        try { await api.support.createTicket(jobId || 'general', 'Customer Issue Report', message); setSent(true); } 
        catch(e) { alert("Failed to send ticket."); } finally { setIsSubmitting(false); }
    };
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8">
                {sent ? (
                    <div className="text-center py-6">
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500"><CheckCircle size={40}/></div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Message Sent</h3>
                        <p className="text-slate-500 mb-8">Support has been notified and will reach out shortly.</p>
                        <button onClick={onClose} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-xl">Close</button>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><AlertTriangle size={24} className="text-amber-500"/> Get Help</h3>
                            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                        </div>
                        <p className="text-sm text-slate-500 mb-6 font-medium">Something not right? Tell us what's happening and we'll jump in to help.</p>
                        <textarea className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl h-32 mb-6 resize-none focus:ring-2 focus:ring-blue-500 outline-none font-medium" placeholder="Describe the issue..." value={message} onChange={e => setMessage(e.target.value)} />
                        <button onClick={handleSubmit} disabled={!message || isSubmitting} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold disabled:opacity-50 shadow-xl active:scale-[0.98] transition-all">
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
    const { notify } = useApp();
    const [status, setStatus] = useState<BookingStatus>(BookingStatus.PENDING);
    const [showChat, setShowChat] = useState(false);
    const [showSupport, setShowSupport] = useState(false);
    const bookingData = state as { jobId?: string, mechanic: Mechanic, vehicle: Vehicle, services: ServiceItem[], totalPrice: number, location: string, geoData?: GeoLocation } | null;
    const [mechanicPos, setMechanicPos] = useState({ x: 10, y: 10 });
    const [targetMechanicPos, setTargetMechanicPos] = useState({ x: 10, y: 10 });
    const [customerRealLoc, setCustomerRealLoc] = useState<GeoLocation | null>(state?.geoData || null); 
    const [driverRealLoc, setDriverRealLoc] = useState<GeoLocation | null>(null);
    const [carRotation, setCarRotation] = useState(180);
    const prevDriverLoc = useRef<GeoLocation | null>(null);

    useEffect(() => {
        if (!navigator.geolocation) return;
        const watchId = navigator.geolocation.watchPosition(
            (pos) => { setCustomerRealLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
            (err) => console.warn("Location Access denied", err),
            { enableHighAccuracy: true }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

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
                    if (newStatus === BookingStatus.CONFIRMED) notify('Success', `${bookingData.mechanic.name} is on the way!`);
                    if (newStatus === BookingStatus.ARRIVED) notify('Arrived', 'Your mechanic is at the vehicle.');
                    if (newStatus === BookingStatus.COMPLETED) notify('Completed', 'Service finished. Please rate your mechanic.');
                }
                return newStatus;
            });
            if (job.driverLocation) {
                if (prevDriverLoc.current) {
                    const angle = calculateBearing(prevDriverLoc.current.lat, prevDriverLoc.current.lng, job.driverLocation.lat, job.driverLocation.lng);
                    setCarRotation(angle);
                }
                prevDriverLoc.current = job.driverLocation;
                setDriverRealLoc(job.driverLocation);
            }
        });
        return () => unsubscribe();
    }, [bookingData?.jobId]); 

    useEffect(() => {
        if (status === BookingStatus.CONFIRMED || status === BookingStatus.EN_ROUTE) setTargetMechanicPos({ x: 50, y: 50 });
    }, [status]);

    useEffect(() => {
        let animId: number;
        const animate = () => {
            setMechanicPos(prev => {
                const dx = targetMechanicPos.x - prev.x;
                const dy = targetMechanicPos.y - prev.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 0.1) return prev;
                return { x: prev.x + dx * 0.005, y: prev.y + dy * 0.005 };
            });
            animId = requestAnimationFrame(animate);
        };
        animId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animId);
    }, [targetMechanicPos]);

    if (!bookingData) return <div className="pt-24 text-center">Invalid Booking</div>;

    return (
        <div className="relative h-screen w-full flex flex-col bg-white overflow-hidden">
            <button onClick={() => navigate('/')} className="absolute top-6 left-6 z-50 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-slate-700 hover:bg-gray-50 transition-transform active:scale-90" style={{ marginTop: 'env(safe-area-inset-top)' }}><ArrowLeft size={24} /></button>
            <button onClick={() => setShowSupport(true)} className="absolute top-6 right-6 z-50 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-slate-700 hover:bg-gray-50 transition-transform active:scale-90" style={{ marginTop: 'env(safe-area-inset-top)' }}><HelpCircle size={24} /></button>

            <div className="absolute inset-0 z-0">
                <LiveMap 
                    mechanicPos={mechanicPos} customerPos={{x: 50, y: 50}} rotation={carRotation}
                    realMechanicLocation={driverRealLoc} realCustomerLocation={customerRealLoc}
                    isSearching={status === BookingStatus.PENDING}
                />
            </div>

            <div className="relative z-10 flex-1 flex flex-col justify-between pointer-events-none pb-[env(safe-area-inset-bottom)]">
                <div className="pt-24 px-4 pointer-events-auto flex flex-col items-center" style={{ paddingTop: 'calc(5rem + env(safe-area-inset-top))' }}>
                    <div className="bg-slate-900/95 backdrop-blur-md text-white p-6 rounded-[2rem] shadow-2xl w-full max-w-sm border border-white/10">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-2">Request Status</p>
                                <h2 className="text-2xl font-bold flex items-center gap-3">
                                    {status === BookingStatus.PENDING ? "Locating Pro..." : status === BookingStatus.CONFIRMED ? "En Route" : status === BookingStatus.ARRIVED ? "Arrived" : status === BookingStatus.IN_PROGRESS ? "Working..." : "Job Done"}
                                    {status === BookingStatus.PENDING && <Radar className="animate-spin-slow text-blue-500" size={24} />}
                                    {status === BookingStatus.IN_PROGRESS && <Wrench className="animate-bounce text-blue-400" size={24} />}
                                    {status === BookingStatus.COMPLETED && <CheckCircle className="text-green-400" size={28} />}
                                </h2>
                            </div>
                            <div className="bg-white/10 px-3 py-1.5 rounded-full text-xs font-mono font-bold">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        </div>
                        <div className="relative pt-2">
                            <div className="overflow-hidden h-2 mb-3 text-xs flex rounded-full bg-slate-800 border border-white/5">
                                <div style={{ width: status === BookingStatus.COMPLETED ? '100%' : status === BookingStatus.IN_PROGRESS ? '75%' : status === BookingStatus.ARRIVED ? '50%' : '25%' }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000"></div>
                            </div>
                            <div className="flex justify-between text-[9px] text-slate-500 font-black uppercase tracking-widest px-1">
                                <span className={status === BookingStatus.PENDING ? 'text-blue-400' : ''}>En Route</span>
                                <span className={status === BookingStatus.ARRIVED ? 'text-blue-400' : ''}>Arrived</span>
                                <span className={status === BookingStatus.IN_PROGRESS ? 'text-blue-400' : ''}>Working</span>
                                <span className={status === BookingStatus.COMPLETED ? 'text-green-400' : ''}>Done</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pb-8 px-4 pointer-events-auto">
                    <div className="bg-white rounded-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.15)] max-w-md mx-auto overflow-hidden border border-slate-50 animate-slide-up">
                        <div className="p-7 border-b border-slate-100 flex items-center gap-5">
                            <div className="relative shrink-0">
                                <img src={bookingData.mechanic.avatar} className="w-16 h-16 rounded-3xl object-cover shadow-lg border-2 border-slate-50" />
                                <div className="absolute -bottom-2 -right-2 bg-white p-1.5 rounded-full shadow-md border border-slate-50"><Star size={14} fill="#eab308" className="text-amber-400" /></div>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">{bookingData.mechanic.name}</h3>
                                <div className="flex items-center text-sm text-slate-500 font-bold gap-2 mt-0.5">
                                    <span className="bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-lg text-[10px] uppercase tracking-wider">{bookingData.vehicle.make} Pro</span>
                                    <span>•</span>
                                    <span>{bookingData.mechanic.rating} ★</span>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowChat(true)} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-all border border-slate-100 active:scale-90 relative"><MessageSquare size={24} /></button>
                                <a href={`tel:5555555555`} className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-90"><Phone size={24} /></a>
                            </div>
                        </div>
                        <div className="p-7 bg-slate-50/40 space-y-5">
                             <div className="flex items-start gap-4">
                                <div className="p-3 bg-white rounded-2xl shadow-sm text-blue-500 border border-slate-100"><MapPin size={20} /></div>
                                <div className="pt-1">
                                    <p className="text-sm font-black text-slate-800 leading-none mb-1.5">{bookingData.location.split(',')[0]}</p>
                                    <p className="text-xs text-slate-500 font-bold leading-tight">{bookingData.location.split(',').slice(1).join(',')}</p>
                                </div>
                             </div>
                             <div className="flex items-start gap-4">
                                <div className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 border border-slate-100"><CheckCircle size={20} /></div>
                                <div className="pt-1">
                                    <p className="text-sm font-black text-slate-800 leading-none mb-1.5">{bookingData.services[0].name}</p>
                                    <p className="text-xs text-slate-500 font-bold">{bookingData.vehicle.year} {bookingData.vehicle.make} {bookingData.vehicle.model}</p>
                                </div>
                             </div>
                        </div>
                        <div className="p-5 bg-white">
                            {status === BookingStatus.COMPLETED ? (
                                <button onClick={() => navigate('/profile', { state: { reviewJob: bookingData } })} className="w-full py-5 bg-green-600 text-white font-black rounded-2xl hover:bg-green-700 transition-all shadow-xl shadow-green-200 active:scale-[0.98]">RATE & PAY ${bookingData.totalPrice.toFixed(2)}</button>
                            ) : (
                                <button className="w-full py-3 text-slate-400 font-black text-[11px] uppercase tracking-[0.2em] hover:text-red-500 transition-colors">Cancel Booking</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {showChat && bookingData.jobId && <CustomerChat mechanicName={bookingData.mechanic.name} jobId={bookingData.jobId} onClose={() => setShowChat(false)} />}
            {showSupport && <SupportModal onClose={() => setShowSupport(false)} jobId={bookingData.jobId} />}
        </div>
    );
};
