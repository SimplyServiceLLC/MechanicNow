

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../App';
import { MapPin, DollarSign, Clock, User, ArrowRight, Shield, Settings, Power, Navigation, Phone, Bell, MessageSquare, X, Send, CheckCircle, PenTool, Sparkles, Loader2, FileText, Wrench, Mic, TrendingUp, RefreshCw, Calendar, ChevronRight, Timer, RotateCcw, Package, Wallet, CreditCard, Banknote, Smartphone, Filter, Map, Link2 } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import { JobRequest, JobCompletionDetails, AiDiagnosisResult } from '../types';
import { diagnoseCarIssue } from '../services/geminiService';
import { api } from '../services/api';

interface DashboardChatMessage {
  id: string;
  sender: 'mechanic' | 'customer';
  text: string;
  timestamp: number;
}

const DashboardMap: React.FC<{ requests: JobRequest[], activeId: string | null, onSelect: (id: string) => void }> = ({ requests, activeId, onSelect }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!(window as any).L) return; // Guard if Leaflet not loaded

    if (!leafletMap.current) {
      // Initialize map
      const map = (window as any).L.map(mapRef.current, {
          zoomControl: false
      }).setView([37.7749, -122.4194], 12);
      
      (window as any).L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      leafletMap.current = map;
    }

    const L = (window as any).L;

    // Clear existing markers
    markersRef.current.forEach(m => leafletMap.current.removeLayer(m));
    markersRef.current = [];

    // Default icon
    const defaultIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    const activeIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #10b981; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.4); transform: scale(1.1);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    // Add markers for requests
    requests.forEach(req => {
        // Use real lat/lng if available, otherwise fallback/mock
        const lat = req.location?.lat || 37.77 + (req.coordinates.y - 50) * 0.002;
        const lng = req.location?.lng || -122.41 + (req.coordinates.x - 50) * 0.002;

        const marker = L.marker([lat, lng], {
            icon: req.id === activeId ? activeIcon : defaultIcon,
            zIndexOffset: req.id === activeId ? 1000 : 0
        }).addTo(leafletMap.current);

        // Tooltip Content
        const tooltipContent = `
            <div style="text-align: center; padding: 4px;">
                <div style="font-weight: bold; color: #0f172a; font-size: 13px;">${req.customerName}</div>
                <div style="font-size: 11px; color: #64748b;">${req.issue}</div>
                ${req.id === activeId ? '<div style="font-size:10px; color:#10b981; font-weight:bold; margin-top:2px;">SELECTED</div>' : ''}
            </div>
        `;

        marker.bindTooltip(tooltipContent, {
            permanent: req.id === activeId, // Always show if active to satisfy "show on click" persistence
            direction: 'top',
            offset: [0, -15],
            opacity: 1,
            className: 'custom-tooltip'
        });

        marker.on('click', () => {
             onSelect(req.id);
             leafletMap.current.flyTo([lat, lng], 14);
        });

        markersRef.current.push(marker);
    });

  }, [requests, activeId, onSelect]);

  return <div ref={mapRef} className="w-full h-full bg-slate-100 relative z-0" />;
};

const JobChat: React.FC<{ job: JobRequest, onClose: () => void }> = ({ job, onClose }) => {
  const storageKey = `mn_chat_${job.id}`;
  
  const [messages, setMessages] = useState<DashboardChatMessage[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error("Error parsing chat", e);
        }
    }
    return [
      { id: '1', sender: 'customer', text: `Hi, I need help with my ${job.vehicle}.`, timestamp: Date.now() - 10000 }
    ];
  });
  
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.sender === 'mechanic') {
        const timer = setTimeout(() => {
            const responses = ["Okay, thanks!", "See you soon!", "Great.", "Code is 1234"];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            const reply: DashboardChatMessage = { id: Date.now().toString(), sender: 'customer', text: randomResponse, timestamp: Date.now() };
            setMessages(prev => [...prev, reply]);
        }, 4000);
        return () => clearTimeout(timer);
    }
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!inputText.trim()) return;
      const newMsg: DashboardChatMessage = { id: Date.now().toString(), sender: 'mechanic', text: inputText, timestamp: Date.now() };
      setMessages(prev => [...prev, newMsg]);
      setInputText('');
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[600px] animate-scale-up">
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold border-2 border-blue-400">
                        {job.customerName.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-bold">{job.customerName}</h3>
                        <p className="text-xs text-blue-200 flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-400 rounded-full"></span> Online
                        </p>
                    </div>
                </div>
                <button onClick={onClose} className="hover:bg-blue-500 p-2 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="flex-1 bg-slate-50 p-4 overflow-y-auto space-y-4">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender === 'mechanic' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${msg.sender === 'mechanic' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex gap-2">
                <input className="w-full bg-slate-100 rounded-xl pl-4 pr-10 outline-none" placeholder="Message..." value={inputText} onChange={e => setInputText(e.target.value)} />
                <button type="submit" className="p-3 bg-blue-600 text-white rounded-xl"><Send size={20} /></button>
            </form>
        </div>
    </div>
  );
};

const NavigationModal = ({ job, onClose, onConfirm }: { job: JobRequest, onClose: () => void, onConfirm: (startNav: boolean) => void }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scale-up">
             <div className="flex justify-end p-4 pb-0">
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
             </div>
             <div className="px-6 pb-8 text-center">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm relative">
                    <Navigation size={32} className="text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Start Navigation?</h2>
                <div className="space-y-3">
                    <button onClick={() => onConfirm(true)} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">Start Navigation</button>
                    <button onClick={() => onConfirm(false)} className="w-full py-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl">Just Accept Job</button>
                </div>
             </div>
        </div>
    </div>
  );
};

const CompletionModal = ({ job, onClose, onProcessPayment }: { job: JobRequest, onClose: () => void, onProcessPayment: (details: JobCompletionDetails, paymentMethod: 'CARD' | 'CASH' | 'EXTERNAL') => Promise<void> }) => {
  const [stage, setStage] = useState<'DETAILS' | 'SUCCESS'>('DETAILS');
  const [details, setDetails] = useState<JobCompletionDetails>({ description: `Service for ${job.issue}`, parts: '', partsCost: 0, notes: '', collectedPaymentMethod: 'CARD' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiResult, setAiResult] = useState<AiDiagnosisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Initialize Payment Method
  useEffect(() => {
      setDetails(prev => ({ ...prev, collectedPaymentMethod: job.paymentMethod ? 'CARD' : 'CASH' }));
  }, [job.paymentMethod]);

  // Financial Calculations
  const baseLabor = job.payout;
  const partsCost = details.partsCost || 0;
  const customerTotal = baseLabor + partsCost;
  const platformFee = baseLabor * 0.20;
  const mechanicNet = customerTotal - platformFee;
  
  const handleProcess = async () => {
    if (!details.description) return;
    setIsSubmitting(true);
    try {
        await onProcessPayment(details, details.collectedPaymentMethod || 'CASH');
        setStage('SUCCESS');
    } catch(e) {
        console.error(e);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleRunAi = async () => {
    setAnalyzing(true);
    try {
      const result = await diagnoseCarIssue(job.issue, job.vehicle);
      setAiResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  const applyRecommendation = (svc: { name: string; duration: string; parts: string[] }) => {
      setDetails(prev => ({
          ...prev,
          description: `${svc.name} (${svc.duration})`,
          parts: svc.parts.join(', ')
      }));
  };

  if (stage === 'SUCCESS') {
      return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center animate-scale-up">
               <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle size={40} />
               </div>
               <h2 className="text-3xl font-bold text-slate-900 mb-2">${mechanicNet.toFixed(2)}</h2>
               <p className="text-slate-500 font-medium mb-8">Added to your earnings</p>
               
               <div className="bg-slate-50 rounded-xl p-4 mb-8 text-sm text-slate-600">
                  <div className="flex justify-between mb-2">
                     <span>Customer Paid</span>
                     <span className="font-bold text-slate-900">${customerTotal.toFixed(2)}</span>
                  </div>
                  {partsCost > 0 && (
                      <div className="flex justify-between mb-2">
                        <span>Parts Reimbursement</span>
                        <span className="font-medium text-slate-700">${partsCost.toFixed(2)}</span>
                      </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                     <span>Platform Fee</span>
                     <span className="text-red-500">-${platformFee.toFixed(2)}</span>
                  </div>
               </div>

               <button onClick={onClose} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-colors">
                  Done
               </button>
           </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scale-up relative max-h-[90vh]">
            <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white z-10">
                <X size={24} />
            </button>
            <div className="bg-slate-900 p-8 text-white text-center relative overflow-hidden flex-shrink-0">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold mb-1">Job Complete!</h2>
                    <p className="text-slate-300 text-sm">Review & Collect Payment</p>
                </div>
            </div>
            
            <div className="p-6 space-y-4 bg-white overflow-y-auto flex-1">
                {/* AI Diagnostics Panel */}
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-2">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-indigo-900 text-sm flex items-center gap-2">
                            <Sparkles size={16} /> AI Diagnostics
                        </h3>
                        {!aiResult && (
                            <button 
                                onClick={handleRunAi} 
                                disabled={analyzing}
                                className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-1"
                            >
                                {analyzing ? <Loader2 className="animate-spin" size={14} /> : 'Analyze'}
                            </button>
                        )}
                    </div>
                    
                    {aiResult && (
                        <div className="space-y-3 animate-fade-in">
                            <p className="text-xs text-indigo-700 bg-white p-2 rounded border border-indigo-100">{aiResult.diagnosis}</p>
                            <div className="space-y-2">
                                {aiResult.recommendedServices.map((svc, i) => (
                                    <div key={i} className="bg-white p-2 rounded border border-indigo-100 flex justify-between items-center group">
                                        <div>
                                            <p className="text-xs font-bold text-slate-800">{svc.name}</p>
                                            <p className="text-[10px] text-slate-500">{svc.duration}</p>
                                        </div>
                                        <button 
                                            onClick={() => applyRecommendation(svc)}
                                            className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold hover:bg-indigo-200 transition-colors"
                                        >
                                            Use
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Earnings Summary Box */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-2">
                        <Wallet size={16}/> Earnings Breakdown
                    </h3>
                    <div className="flex justify-between text-sm text-slate-500">
                        <span>Labor (Agreed Quote)</span>
                        <span>${baseLabor.toFixed(2)}</span>
                    </div>
                    {partsCost > 0 && (
                        <div className="flex justify-between text-sm text-slate-500">
                            <span>Parts Reimbursement</span>
                            <span>${partsCost.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm text-slate-500">
                        <span>Platform Fee (20% Labor)</span>
                        <span className="text-red-500">-${platformFee.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-slate-200 my-2"></div>
                    <div className="flex justify-between font-bold text-slate-900 text-sm">
                        <span>Customer Total Charge</span>
                        <span>${customerTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg text-green-600 pt-1">
                        <span>Your Net Earnings</span>
                        <span>${mechanicNet.toFixed(2)}</span>
                    </div>
                </div>

                {/* Payment Method Selector */}
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Collect Payment Via</label>
                    <div className="grid grid-cols-2 gap-3">
                        {job.paymentMethod ? (
                            <button
                                onClick={() => setDetails(p => ({...p, collectedPaymentMethod: 'CARD'}))}
                                className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${details.collectedPaymentMethod === 'CARD' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}
                            >
                                <CreditCard size={24} />
                                <div className="text-center">
                                    <span className="block text-xs font-bold">App Payment</span>
                                    <span className="block text-[10px] opacity-70">•••• {job.paymentMethod.last4}</span>
                                </div>
                            </button>
                        ) : (
                            <button
                                disabled
                                className="p-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-slate-400 flex flex-col items-center gap-2 opacity-50 cursor-not-allowed"
                            >
                                <CreditCard size={24} />
                                <div className="text-center">
                                    <span className="block text-xs font-bold">App Payment</span>
                                    <span className="block text-[10px]">No card linked</span>
                                </div>
                            </button>
                        )}
                        <button
                            onClick={() => setDetails(p => ({...p, collectedPaymentMethod: 'CASH'}))}
                            className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${details.collectedPaymentMethod === 'CASH' ? 'border-green-600 bg-green-50 text-green-700 shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}
                        >
                            <Banknote size={24} />
                            <div className="text-center">
                                <span className="block text-xs font-bold">Cash / External</span>
                                <span className="block text-[10px] opacity-70">Zelle, Venmo, Cash</span>
                            </div>
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Service Notes</label>
                    <textarea 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm min-h-[60px] focus:ring-2 focus:ring-blue-500 outline-none"
                        value={details.description}
                        onChange={e => setDetails({...details, description: e.target.value})}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 md:col-span-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Parts Used</label>
                        <input 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g. Oil Filter"
                            value={details.parts}
                            onChange={e => setDetails({...details, parts: e.target.value})}
                        />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Parts Cost ($)</label>
                        <input 
                            type="number"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            value={details.partsCost === undefined || Number.isNaN(details.partsCost) ? '' : details.partsCost}
                            onChange={e => setDetails({...details, partsCost: parseFloat(e.target.value) || 0})}
                        />
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex gap-3 bg-white shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-20">
                <button 
                    onClick={handleProcess}
                    disabled={isSubmitting}
                    className={`w-full py-4 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${details.collectedPaymentMethod === 'CARD' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-200' : 'bg-green-600 hover:bg-green-500 shadow-green-200'} disabled:opacity-70`}
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : (details.collectedPaymentMethod === 'CARD' ? `Charge Card $${customerTotal.toFixed(2)}` : `Confirm Cash ($${customerTotal.toFixed(2)})`)}
                </button>
            </div>
        </div>
    </div>
  );
};

export const MechanicDashboard: React.FC = () => {
  const { user, notify, isLoading: appLoading } = useApp();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'earnings' | 'profile' | 'map'>('requests');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'NEW' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [isOnline, setIsOnline] = useState(false);
  const [isStripeConnected, setIsStripeConnected] = useState(false);
  const [requests, setRequests] = useState<JobRequest[]>([]);
  const [earningsStats, setEarningsStats] = useState({ today: 0, week: 0, month: 0 });

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [chatJob, setChatJob] = useState<JobRequest | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [navPromptJob, setNavPromptJob] = useState<JobRequest | null>(null);
  const [isCashOutProcessing, setIsCashOutProcessing] = useState(false);
  const [isOnboardingStripe, setIsOnboardingStripe] = useState(false);
  
  const prevRequestsRef = useRef<JobRequest[]>([]);

  useEffect(() => {
    if (!user) return;
    const initDashboard = async () => {
        try {
            const data = await api.mechanic.getDashboardData();
            setRequests(data.requests);
            setEarningsStats(data.earnings);
            setIsOnline(data.isOnline);
            setIsStripeConnected(!!data.stripeConnected);
            prevRequestsRef.current = data.requests;
        } catch (e) {
            notify('Error', 'Failed to load dashboard.');
        } finally {
            setIsLoading(false);
        }
    };
    initDashboard();
    const unsubscribe = api.mechanic.subscribeToDashboard((data) => {
        if (data?.requests) setRequests(data.requests);
        if (data?.earnings) setEarningsStats(data.earnings); // Real-time update via subscription
        if (data?.stripeConnected !== undefined) setIsStripeConnected(data.stripeConnected);
    });
    return () => unsubscribe();
  }, [user, navigate]);

  const activeJob = requests.find(r => r.id === selectedJobId);

  // GPS Broadcaster: Whenever an active job is in progress or en-route, track position
  useEffect(() => {
    let watchId: number | null = null;

    if (activeJob && (activeJob.status === 'ACCEPTED' || activeJob.status === 'ARRIVED' || activeJob.status === 'IN_PROGRESS')) {
        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    // Update location in DB for tracking
                    api.mechanic.updateLocation(activeJob.id, pos.coords.latitude, pos.coords.longitude);
                },
                (err) => console.error(err),
                { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
            );
        }
    }

    return () => {
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [activeJob?.id, activeJob?.status]);

  const completedJobs = useMemo(() => {
    return requests.filter(r => r.status === 'COMPLETED').reverse();
  }, [requests]);

  if (!appLoading && !user) return <Navigate to="/login" replace />;

  const handleToggleOnline = async () => {
      const newState = !isOnline;
      setIsOnline(newState);
      await api.mechanic.updateStatus(newState);
  };

  const handleAcceptJob = async (id: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const job = requests.find(r => r.id === id);
      if (job) setNavPromptJob(job);
  };

  const handleConfirmNavigation = async (startNav: boolean) => {
    if (!navPromptJob) return;
    const updatedJob = { ...navPromptJob, status: 'ACCEPTED' as const, mechanicId: user?.id };
    setRequests(prev => prev.map(r => r.id === navPromptJob.id ? updatedJob : r));
    setNavPromptJob(null);
    if (startNav && updatedJob.location) {
        window.open(`https://www.google.com/maps/search/?api=1&query=${updatedJob.location.lat},${updatedJob.location.lng}`, '_blank');
    }
    await api.mechanic.updateJobRequest(updatedJob);
  };

  const handleStatusUpdate = async (id: string, newStatus: JobRequest['status']) => {
      const job = requests.find(r => r.id === id);
      if (!job) return;
      const updatedJob = { ...job, status: newStatus };
      setRequests(prev => prev.map(r => r.id === id ? updatedJob : r));
      await api.mechanic.updateJobRequest(updatedJob);
  };

  const handleCompleteJobClick = (id: string) => {
      setSelectedJobId(id);
      setShowCompletionModal(true);
  };

  const handleCashOut = () => {
    setIsCashOutProcessing(true);
    setTimeout(() => {
        setIsCashOutProcessing(false);
        notify("Transfer Initiated", `$${earningsStats.week.toFixed(2)} is being processed to your bank.`);
    }, 2000);
  };
  
  const handleStripeConnect = async () => {
      setIsOnboardingStripe(true);
      try {
          await api.mechanic.onboardStripe();
          setIsStripeConnected(true);
          notify("Success", "Payouts Setup Successfully!");
      } catch(e) {
          notify("Error", "Failed to connect Stripe.");
      } finally {
          setIsOnboardingStripe(false);
      }
  };

  const handleProcessPayment = async (details: JobCompletionDetails, paymentMethod: 'CARD' | 'CASH' | 'EXTERNAL') => {
      if (!selectedJobId) return;
      const job = requests.find(r => r.id === selectedJobId);
      if (!job) return;

      // Calculate Financials
      const baseLabor = job.payout;
      const partsCost = details.partsCost || 0;
      const customerTotal = baseLabor + partsCost;
      const platformFee = baseLabor * 0.20;
      const mechanicNet = customerTotal - platformFee;

      // Optimistic UI Update for Earnings
      const newStats = {
        today: earningsStats.today + mechanicNet,
        week: earningsStats.week + mechanicNet,
        month: earningsStats.month + mechanicNet
      };
      setEarningsStats(newStats);
      
      const updatedJob: JobRequest = { 
          ...job, 
          status: 'COMPLETED' as const, 
          completionDetails: details,
          paymentStatus: paymentMethod === 'CARD' ? 'CAPTURED' : 'PENDING',
          priceBreakdown: {
              subtotal: baseLabor,
              tax: 0,
              total: customerTotal,
              platformFee: platformFee,
              mechanicPayout: mechanicNet
          }
      };
      
      // Simulate Processing Delay
      await new Promise(r => setTimeout(r, 1500));
      
      if (paymentMethod === 'CARD') {
         await api.payment.capture(job.id, customerTotal);
      } 

      setRequests(prev => prev.map(r => r.id === selectedJobId ? updatedJob : r));
      
      await api.mechanic.updateJobRequest(updatedJob);
      await api.mechanic.updateEarnings(mechanicNet);
  };

  const handleCloseCompletionModal = () => {
      setShowCompletionModal(false);
      setSelectedJobId(null);
  };

  const visibleRequests = useMemo(() => {
      return requests.filter(r => {
        switch (filterStatus) {
            case 'NEW': return r.status === 'NEW';
            case 'ACTIVE': return ['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(r.status);
            case 'COMPLETED': return r.status === 'COMPLETED';
            default: return true;
        }
      });
  }, [requests, filterStatus]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden pt-20">
        <div className="w-20 md:w-64 bg-white border-r border-slate-200 flex flex-col justify-between flex-shrink-0 transition-all duration-300">
            <div className="p-4 space-y-2">
                <button onClick={() => setActiveTab('requests')} className={`w-full p-3 rounded-xl flex items-center gap-3 ${activeTab === 'requests' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-gray-50'}`}>
                    <Wrench size={24} /><span className="hidden md:block font-medium">Jobs</span>
                </button>
                <button onClick={() => setActiveTab('map')} className={`w-full p-3 rounded-xl flex items-center gap-3 ${activeTab === 'map' ? 'bg-purple-50 text-purple-600' : 'text-slate-500 hover:bg-gray-50'}`}>
                    <Map size={24} /><span className="hidden md:block font-medium">Map View</span>
                </button>
                <button onClick={() => setActiveTab('earnings')} className={`w-full p-3 rounded-xl flex items-center gap-3 ${activeTab === 'earnings' ? 'bg-green-50 text-green-600' : 'text-slate-500 hover:bg-gray-50'}`}>
                    <DollarSign size={24} /><span className="hidden md:block font-medium">Earnings</span>
                </button>
            </div>
            <div className="p-4 border-t border-slate-100 mt-auto">
                 <div className="hidden md:block bg-slate-900 rounded-xl p-4 mb-4 shadow-lg">
                   <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Today's Payout</p>
                   <div className="flex items-center justify-between">
                       <p className="text-2xl font-bold text-green-400">${earningsStats.today.toFixed(0)}</p>
                       <TrendingUp className="text-green-400" size={20} />
                   </div>
                 </div>
                 <button onClick={handleToggleOnline} className={`w-full p-4 rounded-xl flex items-center justify-center gap-3 font-bold text-white shadow-lg ${isOnline ? 'bg-green-500' : 'bg-slate-800'}`}>
                    <Power size={20} /><span className="hidden md:block">{isOnline ? 'Online' : 'Go Online'}</span>
                </button>
            </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden relative">
            {activeTab === 'requests' && (
                <div className="flex-1 flex flex-col md:flex-row h-full">
                    <div className="w-full md:w-96 bg-white border-r border-slate-200 flex flex-col z-10 shadow-xl md:shadow-none">
                        <div className="p-6 border-b border-slate-100 bg-white">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">Job Requests</h2>
                            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                {['ALL', 'NEW', 'ACTIVE', 'COMPLETED'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setFilterStatus(status as any)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                                            filterStatus === status 
                                            ? 'bg-slate-900 text-white' 
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}
                                    >
                                        {status === 'COMPLETED' ? 'DONE' : status}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                            {visibleRequests.length === 0 && (
                                <div className="text-center py-8 text-slate-400">
                                    <p className="text-sm">No jobs found.</p>
                                </div>
                            )}
                            {visibleRequests.map(req => (
                                <div 
                                    key={req.id} 
                                    onClick={() => setSelectedJobId(req.id)}
                                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${selectedJobId === req.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-100 hover:border-blue-300'}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            {/* Status Badge */}
                                            {req.status === 'NEW' && <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase">New</span>}
                                            {['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(req.status) && <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Active</span>}
                                            {req.status === 'COMPLETED' && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Done</span>}
                                            
                                            <span className={`font-bold text-sm ${selectedJobId === req.id ? 'text-blue-100' : 'text-slate-500'}`}>{req.distance}</span>
                                        </div>
                                        <span className={`font-bold text-lg ${selectedJobId === req.id ? 'text-white' : 'text-slate-900'}`}>
                                            ${req.payout}
                                        </span>
                                    </div>
                                    <h3 className={`font-bold text-lg mb-1 ${selectedJobId === req.id ? 'text-white' : 'text-slate-800'}`}>{req.vehicle}</h3>
                                    <p className={`text-xs ${selectedJobId === req.id ? 'text-blue-100' : 'text-slate-400'}`}>{req.issue}</p>
                                    
                                    {req.status === 'NEW' && (
                                        <div className="mt-3 pt-3 border-t border-white/20 flex gap-2">
                                            <button onClick={(e) => handleAcceptJob(req.id, e)} className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase ${selectedJobId === req.id ? 'bg-white text-blue-600' : 'bg-blue-50 text-blue-600'}`}>Accept</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 bg-gray-100 relative flex flex-col">
                        <DashboardMap requests={visibleRequests} activeId={selectedJobId} onSelect={setSelectedJobId} />
                        {activeJob && !showCompletionModal && (
                            <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 bg-white rounded-3xl shadow-2xl p-6 animate-slide-up border border-slate-100 z-10">
                                <h2 className="text-xl font-bold mb-4">{activeJob.customerName}</h2>
                                <div className="flex gap-4">
                                    {activeJob.status === 'NEW' ? (
                                        <button onClick={() => handleAcceptJob(activeJob.id)} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">Accept Job</button>
                                    ) : activeJob.status === 'ACCEPTED' ? (
                                        <button onClick={() => handleStatusUpdate(activeJob.id, 'ARRIVED')} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold">I've Arrived</button>
                                    ) : activeJob.status === 'ARRIVED' ? (
                                        <button onClick={() => handleStatusUpdate(activeJob.id, 'IN_PROGRESS')} className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-bold">Start Repair</button>
                                    ) : activeJob.status === 'IN_PROGRESS' ? (
                                        <button onClick={() => handleCompleteJobClick(activeJob.id)} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold">Complete Job</button>
                                    ) : (
                                        <button disabled className="flex-1 bg-slate-100 text-slate-400 py-3 rounded-xl font-bold cursor-default">Job Completed</button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {activeTab === 'map' && (
                <div className="flex-1 bg-gray-100 relative flex flex-col h-full">
                    {/* Map Header/Overlay */}
                    <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-sm border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Live Job Map
                    </div>
                    
                    <DashboardMap 
                        requests={requests.filter(r => ['NEW', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(r.status))} 
                        activeId={selectedJobId} 
                        onSelect={setSelectedJobId} 
                    />

                    {/* Floating Card for Selected Job */}
                    {activeJob && !showCompletionModal && (
                        <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 bg-white rounded-3xl shadow-2xl p-6 animate-slide-up border border-slate-100 z-10">
                             <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">{activeJob.customerName}</h2>
                                     <p className="text-slate-500 text-sm">{activeJob.vehicle}</p>
                                </div>
                                <div className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-600">
                                    ${activeJob.payout}
                                </div>
                             </div>
                             <p className="text-slate-600 text-sm mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">{activeJob.issue}</p>
                             
                             <div className="flex gap-3">
                                 {activeJob.status === 'NEW' ? (
                                     <button onClick={() => handleAcceptJob(activeJob.id)} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200">Accept Job</button>
                                 ) : (
                                     <button onClick={() => setActiveTab('requests')} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200">View Details</button>
                                 )}
                             </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'earnings' && (
                <div className="p-8 max-w-5xl mx-auto w-full overflow-y-auto">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900">Earnings & Payouts</h2>
                            <p className="text-slate-500">Manage your finances and transfer funds.</p>
                        </div>
                        
                        {isStripeConnected ? (
                            <button 
                                onClick={handleCashOut}
                                disabled={earningsStats.week <= 0 || isCashOutProcessing}
                                className="bg-green-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-green-500 disabled:opacity-50 flex items-center gap-3 transition-all active:scale-95"
                            >
                                {isCashOutProcessing ? <Loader2 className="animate-spin" /> : <><Wallet size={20}/> Cash Out Now</>}
                            </button>
                        ) : (
                             <button 
                                onClick={handleStripeConnect}
                                disabled={isOnboardingStripe}
                                className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-slate-800 disabled:opacity-50 flex items-center gap-3 transition-all active:scale-95"
                            >
                                {isOnboardingStripe ? <Loader2 className="animate-spin" /> : <><Link2 size={20}/> Setup Payouts with Stripe</>}
                            </button>
                        )}
                    </div>
                    
                    {!isStripeConnected && (
                        <div className="mb-8 bg-blue-50 border border-blue-100 p-6 rounded-2xl flex items-start gap-4">
                            <div className="p-3 bg-white rounded-xl text-blue-600 shadow-sm"><Banknote size={24} /></div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 mb-1">Get Paid Faster</h3>
                                <p className="text-slate-600 text-sm mb-4">Connect your bank account via Stripe to receive instant payouts for completed jobs. This is required to start cashing out your earnings.</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                            <p className="text-slate-500 font-medium mb-1">Available Balance</p>
                            <h3 className="text-3xl font-bold text-slate-900">${earningsStats.week.toFixed(2)}</h3>
                        </div>
                        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                            <p className="text-slate-500 font-medium mb-1">Today's Earnings</p>
                            <h3 className="text-3xl font-bold text-slate-900">${earningsStats.today.toFixed(2)}</h3>
                        </div>
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl">
                            <p className="text-slate-300 font-medium mb-1">Total Lifetime</p>
                            <h3 className="text-3xl font-bold text-white">${earningsStats.month.toFixed(2)}</h3>
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <CheckCircle className="text-green-500" size={20} /> Payment History
                    </h3>
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        {completedJobs.length === 0 ? (
                            <div className="p-10 text-center text-slate-500 flex flex-col items-center gap-3">
                                <div className="p-3 bg-slate-50 rounded-full"><FileText size={24} /></div>
                                <p>No completed jobs found.</p>
                            </div>
                        ) : (
                            completedJobs.map(job => {
                                const subtotal = job.priceBreakdown?.subtotal || job.payout;
                                const fee = job.priceBreakdown?.platformFee || 0;
                                const payout = job.priceBreakdown?.mechanicPayout || 0;
                                const paymentType = job.completionDetails?.collectedPaymentMethod || 'CARD';
                                const isCash = paymentType === 'CASH'; 
                                const partsCost = job.completionDetails?.partsCost || 0;
                                const estimatedProfit = payout - partsCost;

                                return (
                                    <div key={job.id} className="p-6 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <div className="flex flex-col md:flex-row justify-between gap-6 mb-4">
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-lg">{job.customerName}</h4>
                                                <p className="text-sm text-slate-500 font-medium">{job.vehicle}</p>
                                                <p className="text-xs text-slate-400 mt-1">Service: {job.completionDetails?.description || job.issue}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${isCash ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                                        {isCash ? 'Cash/External Payment' : 'Paid via App'}
                                                    </span>
                                                    <span className="text-xs text-slate-400">{new Date().toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="text-right">
                                                <span className="block text-xs text-slate-400 font-medium uppercase">Net Payout</span>
                                                <span className="text-2xl font-bold text-green-600">${payout.toFixed(2)}</span>
                                            </div>
                                        </div>

                                        {/* Detailed Breakdown Box */}
                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm">
                                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="col-span-2 md:col-span-1">
                                                    <span className="block text-xs text-slate-400 mb-1">Parts Used</span>
                                                    <span className="font-medium text-slate-700">{job.completionDetails?.parts || 'None'}</span>
                                                </div>
                                                
                                                <div className="text-right md:text-left">
                                                    <span className="block text-xs text-slate-400 mb-1">Customer Paid</span>
                                                    <span className="font-medium text-slate-900">${(job.priceBreakdown?.total || 0).toFixed(2)}</span>
                                                </div>

                                                <div className="text-right md:text-left">
                                                     <span className="block text-xs text-slate-400 mb-1">Platform Fee</span>
                                                     <span className="font-medium text-red-400">-${fee.toFixed(2)}</span>
                                                </div>

                                                <div className="text-right md:text-left border-t md:border-t-0 pt-2 md:pt-0 mt-2 md:mt-0 col-span-2 md:col-span-1">
                                                     <div className="flex justify-between md:block">
                                                        <span className="block text-xs text-slate-400 mb-1">Real Profit (After Parts)</span>
                                                        <span className={`font-bold ${estimatedProfit >= 0 ? 'text-slate-800' : 'text-red-500'}`}>
                                                            ${estimatedProfit.toFixed(2)}
                                                            {partsCost > 0 && <span className="text-xs font-normal text-slate-400 ml-1">(-${partsCost.toFixed(0)} parts exp)</span>}
                                                        </span>
                                                     </div>
                                                </div>
                                             </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
            
            {chatJob && <JobChat job={chatJob} onClose={() => setChatJob(null)} />}
            {navPromptJob && <NavigationModal job={navPromptJob} onClose={() => setNavPromptJob(null)} onConfirm={handleConfirmNavigation} />}
            {showCompletionModal && activeJob && <CompletionModal job={activeJob} onClose={handleCloseCompletionModal} onProcessPayment={handleProcessPayment} />}
        </div>
    </div>
  );
};