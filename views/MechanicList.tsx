
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Star, Clock, Award, ShieldCheck, ArrowLeft, MapPin as MapPinIcon, ChevronRight, CheckCircle, Zap, Calendar, Loader2, CreditCard, Banknote, X, Wrench, Wallet } from 'lucide-react';
import { Vehicle, ServiceItem, Mechanic, JobRequest, PriceBreakdown, PaymentMethod, GeoLocation } from '../types';
import { useApp } from '../App';
import { api } from '../services/api';

const getAvailabilityColor = (status: string) => {
  switch (status) {
    case 'Available Now': return 'text-green-600';
    case 'On another job': return 'text-amber-600';
    case 'Offline': return 'text-slate-400';
    default: return 'text-blue-600';
  }
};

const getAvailabilityBg = (status: string) => {
  switch (status) {
    case 'Available Now': return 'bg-green-500';
    case 'On another job': return 'bg-amber-500';
    case 'Offline': return 'bg-slate-400';
    default: return 'bg-blue-500';
  }
};

const MechanicProfileView = ({ mechanic, onBack, onBook, totalPrice }: { mechanic: Mechanic, onBack: () => void, onBook: () => void, totalPrice: number }) => (
  <div className="min-h-screen bg-white pb-24 animate-slide-up">
    <div className="relative h-48 bg-slate-900">
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent z-10"></div>
      <img 
          src="https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" 
          className="w-full h-full object-cover opacity-50" 
          alt="Cover"
      />
      <button 
          onClick={onBack}
          className="absolute top-24 left-4 z-20 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
      >
          <ArrowLeft size={24} />
      </button>
    </div>

    <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-16 relative z-20">
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
         <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-end -mt-12 mb-4">
              <img src={mechanic.avatar} alt={mechanic.name} className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg object-cover bg-gray-100" />
              <div className="text-center sm:text-left flex-1">
                  <h1 className="text-2xl font-bold text-slate-900 flex items-center justify-center sm:justify-start gap-2">
                      {mechanic.name} <ShieldCheck size={20} className="text-blue-500" fill="currentColor" />
                  </h1>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-3 text-sm text-slate-500 mt-1">
                    <span>{mechanic.yearsExperience} Years Exp.</span>
                    <span>•</span>
                    <span>{mechanic.distance} away</span>
                    <span>•</span>
                    <span className={`font-medium ${getAvailabilityColor(mechanic.availability)}`}>
                        {mechanic.availability}
                    </span>
                  </div>
              </div>
              <div className="flex items-center gap-1 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                  <Star size={20} className="text-amber-500" fill="currentColor" />
                  <span className="font-bold text-amber-700">{mechanic.rating}</span>
                  <span className="text-amber-600 text-sm">({mechanic.reviews?.length || 0} reviews)</span>
              </div>
         </div>

         <div className="grid grid-cols-3 gap-4 py-6 border-b border-gray-100">
             <div className="text-center border-r border-gray-100">
                 <div className="text-xl font-bold text-slate-800">{mechanic.jobsCompleted}+</div>
                 <div className="text-xs text-slate-400 uppercase tracking-wider">Jobs Done</div>
             </div>
             <div className="text-center border-r border-gray-100">
                 <div className="text-xl font-bold text-slate-800">{mechanic.eta}</div>
                 <div className="text-xs text-slate-400 uppercase tracking-wider">Reliability</div>
             </div>
             <div className="text-center">
                 <div className="text-xl font-bold text-slate-800">100%</div>
                 <div className="text-xs text-slate-400 uppercase tracking-wider">Vetted</div>
             </div>
         </div>

         <div className="py-6">
             <h3 className="font-bold text-slate-900 mb-2">About {mechanic.name.split(' ')[0]}</h3>
             <p className="text-slate-600 leading-relaxed text-sm">{mechanic.bio || "No bio available."}</p>
         </div>

         <div className="py-4">
             <h3 className="font-bold text-slate-900 mb-3">Expertise</h3>
             <div className="flex flex-wrap gap-2 mb-4">
                 {mechanic.certifications?.map(cert => (
                     <span key={cert} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100 flex items-center gap-1">
                         <Award size={12} /> {cert}
                     </span>
                 ))}
                 {mechanic.specialties?.map(spec => (
                     <span key={spec} className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                         {spec}
                     </span>
                 ))}
             </div>
         </div>

         <div className="py-6 border-t border-gray-100">
             <h3 className="font-bold text-slate-900 mb-4 text-lg">Customer Reviews</h3>
             <div className="space-y-4">
                 {mechanic.reviews && mechanic.reviews.length > 0 ? (
                    mechanic.reviews.map(review => (
                     <div key={review.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                         <div className="flex items-center gap-3 mb-3">
                             <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm uppercase shadow-sm border border-blue-200">
                                {review.author.charAt(0)}
                             </div>
                             <div className="flex-1">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-slate-900">{review.author}</span>
                                    <span className="text-xs text-slate-400">{review.date}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                     <div className="flex text-amber-400">
                                         {Array.from({length: 5}).map((_, i) => (
                                             <Star key={i} size={12} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "" : "text-gray-300"} />
                                         ))}
                                     </div>
                                     <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-green-100">
                                        <CheckCircle size={10} /> Verified
                                     </span>
                                </div>
                             </div>
                         </div>
                         <p className="text-slate-600 text-sm leading-relaxed bg-white p-3 rounded-lg border border-slate-100">"{review.text}"</p>
                     </div>
                 ))
                ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <p className="text-slate-500">No reviews yet.</p>
                    </div>
                )}
             </div>
         </div>
      </div>
    </div>

    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 shadow-2xl z-50">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-6">
            <div>
                <p className="text-xs text-slate-500">Total Quote</p>
                <p className="text-2xl font-bold text-slate-900">${totalPrice.toFixed(2)}</p>
            </div>
            <button 
              onClick={onBook}
              disabled={mechanic.availability === 'Offline'}
              className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-500 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {mechanic.availability === 'Offline' ? 'Mechanic Offline' : 'Hire Mechanic'} <ChevronRight size={18} />
            </button>
        </div>
    </div>
  </div>
);

const BookingConfirmationView = ({ mechanic, vehicle, services, date, time, location, totalPrice, onConfirm, onBack, isProcessing, onUpdateServices, availableServices }: {
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
    const breakdown: PriceBreakdown = useMemo(() => {
        const subtotal = currentTotal;
        const taxRate = 0.08;
        const tax = subtotal * taxRate;
        const total = subtotal + tax;
        const platformFee = subtotal * 0.20;
        const mechanicPayout = subtotal - platformFee;

        return { subtotal, tax, total, platformFee, mechanicPayout };
    }, [currentTotal]);

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
                                    <span className="text-slate-500 flex items-center gap-2"><MapPinIcon size={14} /> Location</span>
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
                                    <span className="text-xs font-bold">Card</span>
                                </button>
                                <button
                                    onClick={() => setPaymentType('CASH')}
                                    className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${paymentType === 'CASH' ? 'border-green-600 bg-green-50 text-green-700' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}
                                >
                                    <Wallet size={24} />
                                    <span className="text-xs font-bold">Cash / Other</span>
                                </button>
                            </div>
                            {paymentType === 'CARD' ? (
                                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-3 shadow-sm">
                                    <div className="bg-slate-100 p-2 rounded"><CreditCard size={16} className="text-slate-600"/></div>
                                    <div className="flex-1 text-left">
                                         <p className="text-xs font-bold text-slate-900">Visa ending in 4242</p>
                                         <p className="text-[10px] text-slate-500">Expires 12/25</p>
                                    </div>
                                    <button className="text-xs text-blue-600 font-bold hover:underline">Change</button>
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
                            disabled={isProcessing || localServices.length === 0}
                            className="flex-[2] py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-200 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                        >
                            {isProcessing ? <Loader2 className="animate-spin" /> : <><CheckCircle size={16} /> Book Appointment</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const MechanicList: React.FC = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, notify } = useApp();
  const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [isLoadingMechanics, setIsLoadingMechanics] = useState(true);

  // Editable services state
  const [currentServices, setCurrentServices] = useState<ServiceItem[]>(state?.services || []);

  if (!state) {
    return <div className="pt-24 text-center"><p>No booking details found.</p><button onClick={() => navigate('/book')} className="text-blue-600 mt-4">Start Booking</button></div>;
  }

  const { vehicle, date, time, location, geoData, availableServices } = state as { vehicle: Vehicle, services: ServiceItem[], date: string, time: string, location: string, geoData?: GeoLocation, availableServices: ServiceItem[] };

  const totalPrice = currentServices.reduce((sum, s) => sum + s.price, 0);

  useEffect(() => {
    // Fetch real mechanics
    const fetchMechanics = async () => {
        try {
            const lat = geoData?.lat || 0;
            const lng = geoData?.lng || 0;
            const fetched = await api.mechanic.getNearbyMechanics(lat, lng);
            setMechanics(fetched);
        } catch (e) {
            console.error("Failed to fetch mechanics", e);
        } finally {
            setIsLoadingMechanics(false);
        }
    };
    fetchMechanics();
  }, [geoData]);

  const sortedMechanics = useMemo(() => {
    if (mechanics.length === 0) return [];
    
    const serviceKeywords = currentServices.map(s => s.name.toLowerCase().replace(/ replacement| repair| change| inspection/g, '').trim());

    const scored = mechanics.map(mechanic => {
        let score = 0;
        let matchReason = '';

        // 1. Rating & Reviews (HIGHEST PRIORITY)
        // We want 4.9+ with many reviews to crush 5.0 with 1 review.
        // Base Score = Rating * 10000
        score += (mechanic.rating * 10000);
        
        // Review Count Weighting: Logarithmic scale to prevent 1000 reviews from dwarfing 100, 
        // but still giving significant weight to experience.
        const reviewCount = mechanic.reviews?.length || 0;
        // e.g. 10 reviews = 2300 pts, 100 reviews = 4600 pts
        score += (Math.log(reviewCount + 1) * 1000); 

        // 2. Availability
        if (mechanic.availability === 'Available Now') {
            score += 2000;
        } else if (mechanic.availability === 'Offline') {
            score -= 100000; // Bury offline
        }

        // 3. Specialization
        const mechanicSpecs = mechanic.specialties?.map(s => s.toLowerCase()) || [];
        const matchedSpecs = mechanicSpecs.filter(spec => 
            serviceKeywords.some(k => spec.includes(k) || k.includes(spec))
        );
        
        if (matchedSpecs.length > 0) {
            score += 500;
            if (!matchReason) matchReason = `${matchedSpecs[0].charAt(0).toUpperCase() + matchedSpecs[0].slice(1)} Expert`;
        }

        // 4. Match Reason Logic
        if (!matchReason) {
            if (mechanic.rating >= 4.9 && reviewCount > 10) matchReason = 'Top Rated Pro';
            else if (reviewCount > 50) matchReason = 'Most Experienced';
            else if (mechanic.availability === 'Available Now') matchReason = 'Fastest Arrival';
        }

        return { ...mechanic, score, matchReason };
    });

    return scored.sort((a, b) => b.score - a.score);
  }, [mechanics, currentServices]);


  const handleBookClick = (mechanic: Mechanic) => {
    setIsConfirming(true);
  };

  const handleConfirmBooking = async (paymentMethod: PaymentMethod | undefined, breakdown: PriceBreakdown | undefined) => {
    if (!selectedMechanic || !breakdown) return;
    
    setIsProcessing(true);

    try {
        const jobId = `job_${Date.now()}`;
        const newJob: JobRequest = {
            id: jobId,
            customerName: user?.name || "Guest User",
            vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
            issue: currentServices.map(s => s.name).join(", "),
            distance: selectedMechanic.distance, 
            coordinates: { x: 50, y: 50 }, 
            location: geoData, 
            status: 'NEW',
            payout: breakdown.total,
            urgency: currentServices.some(s => s.type === 'REPAIR') ? 'HIGH' : 'NORMAL',
            mechanicId: selectedMechanic.id,
            paymentMethod: paymentMethod, 
            priceBreakdown: breakdown,
            paymentStatus: 'PENDING'
        };

        await api.mechanic.createJobRequest(newJob);

        notify('Booking Requested', `Your request has been sent to ${selectedMechanic.name}.`);
        
        navigate('/tracking', { 
            state: { 
                jobId,
                mechanic: selectedMechanic, 
                vehicle, 
                services: currentServices, 
                totalPrice: breakdown.total,
                date, 
                time,
                location: state.location,
                geoData 
            } 
        });
    } catch (error) {
        console.error(error);
        notify('Error', 'Failed to confirm booking. Please try again.');
        setIsProcessing(false);
    }
  };

  if (isConfirming && selectedMechanic) {
      return (
        <BookingConfirmationView 
            mechanic={selectedMechanic}
            vehicle={vehicle}
            services={currentServices}
            date={date}
            time={time}
            location={location}
            totalPrice={totalPrice}
            onBack={() => setIsConfirming(false)}
            onConfirm={handleConfirmBooking}
            isProcessing={isProcessing}
            onUpdateServices={setCurrentServices}
            availableServices={availableServices}
        />
      );
  }

  if (selectedMechanic) {
      return <MechanicProfileView mechanic={selectedMechanic} onBack={() => setSelectedMechanic(null)} onBook={() => handleBookClick(selectedMechanic)} totalPrice={totalPrice} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 pt-20 pb-10">
      <div className="max-w-5xl mx-auto px-4">
        
        <div className="flex items-center gap-4 mb-8">
            <button onClick={() => navigate('/book')} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors">
                <ArrowLeft size={20} className="text-slate-700" />
            </button>
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Select a Mechanic</h1>
                <p className="text-slate-500 text-sm">{vehicle.year} {vehicle.make} {vehicle.model} • {new Date(date).toLocaleDateString()} at {time}</p>
            </div>
        </div>

        {isLoadingMechanics ? (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 size={48} className="text-blue-600 animate-spin mb-4" />
                <p className="text-slate-500">Finding qualified mechanics nearby...</p>
            </div>
        ) : sortedMechanics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                <Wrench size={48} className="text-slate-300 mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">No Mechanics Found</h3>
                <p className="text-slate-500 text-center max-w-md">
                    It looks like no mechanics are currently available in your area or registered on the platform yet. 
                </p>
                <button onClick={() => navigate('/mechanic-dashboard')} className="mt-6 text-blue-600 font-bold hover:underline">
                    Are you a mechanic? Sign up here.
                </button>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    {sortedMechanics.map((mechanic, idx) => (
                        <div 
                            key={mechanic.id} 
                            onClick={() => setSelectedMechanic(mechanic)}
                            className={`bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all hover:border-blue-300 cursor-pointer flex flex-col sm:flex-row gap-6 group ${mechanic.availability === 'Offline' ? 'opacity-70 bg-gray-50' : ''}`}
                        >
                            <div className="flex-shrink-0 flex flex-col items-center sm:items-start">
                                <img src={mechanic.avatar} alt={mechanic.name} className="w-16 h-16 rounded-full object-cover border-2 border-gray-100 mb-2 group-hover:border-blue-200 transition-colors" />
                                <div className="flex items-center gap-1 text-amber-500 font-bold">
                                    <Star size={16} fill="currentColor" />
                                    <span>{mechanic.rating}</span>
                                </div>
                                <span className="text-xs text-slate-400">({mechanic.reviews?.length || 0} reviews)</span>
                            </div>
                            
                            <div className="flex-1">
                                <div className="flex flex-wrap justify-between items-start mb-2 gap-2">
                                    <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{mechanic.name} <span className="text-sm font-normal text-slate-400 ml-2 hidden sm:inline">Certified</span></h3>
                                    
                                    {mechanic.availability !== 'Offline' && (idx === 0 || (mechanic as any).matchReason) && (
                                        <span className={`text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1 ${idx === 0 ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}`}>
                                        {idx === 0 && <Zap size={12} fill="currentColor" />}
                                        {idx === 0 ? 'Best Match: ' : ''}{(mechanic as any).matchReason || 'Recommended'}
                                        </span>
                                    )}
                                </div>
                                
                                <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-4">
                                    <div className="flex items-center gap-1">
                                        <MapPinIcon className="text-slate-400" size={16} />
                                        <span>{mechanic.distance} away</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="text-slate-400" size={16} />
                                        <span>Reliability: <span className="font-semibold text-slate-800">{mechanic.eta}</span></span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2 text-xs">
                                    <span className={`w-2 h-2 rounded-full ${getAvailabilityBg(mechanic.availability)}`}></span>
                                    <span className={`font-medium ${getAvailabilityColor(mechanic.availability)}`}>{mechanic.availability}</span>
                                </div>
                            </div>

                            <div className="flex flex-col justify-between items-end border-t sm:border-t-0 sm:border-l sm:pl-6 pt-4 sm:pt-0">
                                <div className="text-right mb-4">
                                    <span className="block text-xs text-slate-500">Total Quote</span>
                                    <span className="text-2xl font-bold text-slate-900">${totalPrice.toFixed(2)}</span>
                                </div>
                                <button 
                                    className="w-full sm:w-auto bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-bold group-hover:bg-blue-600 group-hover:text-white transition-all"
                                >
                                    View Profile
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="lg:col-span-1 hidden lg:block">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 sticky top-24">
                        <h3 className="font-bold text-slate-900 mb-4">Booking Summary</h3>
                        
                        <div className="space-y-4 mb-6">
                            {currentServices.map(s => (
                                <div key={s.id} className="flex justify-between text-sm">
                                    <span className="text-slate-600">{s.name}</span>
                                    <span className="font-semibold text-slate-900">${s.price.toFixed(2)}</span>
                                </div>
                            ))}
                            <hr className="border-slate-100" />
                            <div className="flex justify-between text-base font-bold">
                                <span>Subtotal</span>
                                <span>${totalPrice.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-xl mb-6">
                            <h4 className="font-semibold text-blue-900 text-sm mb-2 flex items-center gap-2">
                                <Award size={16} /> 12-Month / 12k Mile Warranty
                            </h4>
                            <p className="text-xs text-blue-700">
                                All services performed by MechanicNow partners are backed by our happiness guarantee.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
