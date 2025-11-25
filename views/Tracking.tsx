
import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { BookingStatus, Mechanic, ServiceItem, Vehicle, GeoLocation } from '../types';
import { Phone, MessageSquare, CheckCircle, MapPin, ArrowLeft, Wrench, Star, Navigation } from 'lucide-react';
import { api } from '../services/api';

const LiveMap = ({ mechanicPos, customerPos, rotation }: { mechanicPos: {x: number, y: number}, customerPos: {x: number, y: number}, rotation: number }) => {
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

    // Update Customer Marker
    // Convert 0-100 coord system to fake lat/lng offset for demo
    const cLat = 37.7749 + (customerPos.y - 50) * 0.0001;
    const cLng = -122.4194 + (customerPos.x - 50) * 0.0001;
    
    // Mechanic Position logic (same fake projection)
    const mLat = 37.7749 + (mechanicPos.y - 50) * 0.0001; // Inverted Y in map usually, but treating as direct offset here
    const mLng = -122.4194 + (mechanicPos.x - 50) * 0.0001;

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

    if (!mechanicMarkerRef.current) {
         const carIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `
            <div style="transform: rotate(${rotation}deg); transition: transform 0.3s ease;">
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
        // Update rotation logic if needed via direct DOM manipulation or icon update, 
        // simplified here by re-creating icon on major rotation change would be better but expensive.
        // For smoother rotation in Leaflet, usually requires a plugin like RotatedMarker. 
        // We'll stick to position updates for now.
    }

    // Fit bounds to keep both in view
    const bounds = L.latLngBounds([cLat, cLng], [mLat, mLng]);
    leafletMap.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });

  }, [mechanicPos, customerPos, rotation]);

  return <div ref={mapRef} className="w-full h-full bg-slate-200" />;
};

export const Tracking: React.FC = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const { notify, addServiceRecord } = useApp();
    
    // Core Status
    const [status, setStatus] = useState<BookingStatus>(BookingStatus.PENDING);
    
    // Data from nav
    const bookingData = state as { jobId?: string, mechanic: Mechanic, vehicle: Vehicle, services: ServiceItem[], totalPrice: number, location: string, geoData?: GeoLocation } | null;

    // Positional Data
    // We keep 'mechanicPos' as the smoothed visual position (0-100 coord system for easy lerp)
    const [mechanicPos, setMechanicPos] = useState({ x: 10, y: 10 });
    // We keep 'targetMechanicPos' as the latest calculated position
    const [targetMechanicPos, setTargetMechanicPos] = useState({ x: 10, y: 10 });
    
    const [customerRealLoc, setCustomerRealLoc] = useState<GeoLocation | null>(state?.geoData || null); 
    const [driverRealLoc, setDriverRealLoc] = useState<GeoLocation | null>(null);
    const [carRotation, setCarRotation] = useState(180);
    
    const useRealGps = useRef(false);

    // 1. Live GPS Tracking (Customer)
    useEffect(() => {
        if (!navigator.geolocation) return;
        
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setCustomerRealLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            (err) => console.warn("Location Access denied", err),
            { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
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
                         // ... completion logic ...
                    }
                }
                return newStatus;
            });

            if (job.driverLocation) {
                setDriverRealLoc(job.driverLocation);
                useRealGps.current = true;
            }
        });
        
        return () => unsubscribe();
    }, [bookingData?.jobId]); 

    // 3. Coordinate Projection 
    useEffect(() => {
        // Simplified projection: center map is 50,50. 
        // 1 deg lat/lng = ~3000 units on our 0-100 scale? 
        // Actually, for the Leaflet implementation above, we pass raw 0-100 coords and it converts them to small lat/lng offsets.
        // We just need to animate x/y smoothly.
        
        if (useRealGps.current && driverRealLoc && customerRealLoc) {
             // If real GPS is available, we map relative differences.
             // But honestly, mixing real GPS with a 0-100 lerp system is complex.
             // For this demo, let's keep the target pos logic abstract (0-100) and let the Map component project it.
             
             // If driver is approaching...
             // We can just simulate movement towards 50,50 for visual effect unless we fully switch to real lat/lng state.
             // For robust "Real Maps", normally we'd pass lat/lng directly to the map component.
             // But to keep the lerp animation smooth without rewriting the whole state machine:
             
             // Let's assume 50,50 is customer.
             // Driver starts at 10,10.
             // We'll update target based on status.
        } 
        
        if (status === BookingStatus.CONFIRMED || status === BookingStatus.EN_ROUTE) {
            setTargetMechanicPos({ x: 50, y: 50 }); // Move to center
        }
    }, [driverRealLoc, customerRealLoc, status]);


    // 4. Smooth Animation Loop (Lerp)
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
            >
                <ArrowLeft size={20} />
            </button>

            <div className="absolute inset-0 z-0">
                <LiveMap mechanicPos={mechanicPos} customerPos={{x: 50, y: 50}} rotation={carRotation} />
                
                {/* Overlay Gradients for Depth */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/90 to-transparent pointer-events-none z-0"></div>
                <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-white/90 to-transparent pointer-events-none z-0"></div>
            </div>

            {/* Status Card */}
            <div className="relative z-10 flex-1 flex flex-col justify-between pointer-events-none">
                <div className="pt-24 px-4 pointer-events-auto flex flex-col items-center">
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
                                <button className="w-11 h-11 rounded-full bg-gray-50 flex items-center justify-center text-slate-700 hover:bg-gray-100 transition-colors border border-gray-100">
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
        </div>
    );
};
