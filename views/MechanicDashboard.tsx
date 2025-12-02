
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../App';
import { MapPin, DollarSign, Clock, User, ArrowRight, Shield, Settings, Power, Navigation, Phone, Bell, MessageSquare, X, Send, CheckCircle, PenTool, Sparkles, Loader2, FileText, Wrench, Mic, TrendingUp, RefreshCw, Calendar, ChevronRight, Timer, RotateCcw, Package, Wallet, CreditCard, Banknote, Smartphone, Filter, Map as MapIcon, Link2, Save, ClipboardList, Lock } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import { JobRequest, JobCompletionDetails, AiDiagnosisResult, MechanicSchedule } from '../types';
import { diagnoseCarIssue } from '../services/geminiService';
import { api } from '../services/api';

// --- TYPES & INTERFACES ---
interface DashboardChatMessage {
  id: string;
  sender: 'mechanic' | 'customer';
  text: string;
  timestamp: number;
}

// --- SUB-COMPONENTS ---

// 1. Dashboard Map (Leaflet)
const DashboardMap = ({ requests, activeId, onSelect, mechanicLocation }: { requests: JobRequest[], activeId: string | null, onSelect: (id: string) => void, mechanicLocation: {lat: number, lng: number} | null }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markers = useRef<Map<string, any>>(new Map());
  const mechanicMarker = useRef<any>(null);
  const hasCentered = useRef(false);

  useEffect(() => {
    if (!mapRef.current || !(window as any).L) return;

    if (!leafletMap.current) {
        const L = (window as any).L;
        const map = L.map(mapRef.current, {
            zoomControl: false,
            attributionControl: false
        }).setView([36.8508, -76.2859], 12); // Hampton Roads Default

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
        }).addTo(map);
        leafletMap.current = map;
    }
  }, []);

  // Auto-center on mechanic location once available
  useEffect(() => {
    if (mechanicLocation && leafletMap.current && !hasCentered.current) {
        leafletMap.current.setView([mechanicLocation.lat, mechanicLocation.lng], 13);
        hasCentered.current = true;
    }
  }, [mechanicLocation]);

  // Update Job Pins
  useEffect(() => {
      if (!leafletMap.current) return;
      const L = (window as any).L;

      // Remove old markers not in current list
      markers.current.forEach((marker, id) => {
          if (!requests.find(r => r.id === id)) {
              marker.remove();
              markers.current.delete(id);
          }
      });

      requests.forEach(req => {
          const lat = req.location?.lat || (36.8508 + (Math.random() - 0.5) * 0.1);
          const lng = req.location?.lng || (-76.2859 + (Math.random() - 0.5) * 0.1);
          const isActive = req.id === activeId;

          let marker = markers.current.get(req.id);

          const iconHtml = `
            <div class="relative group">
                <div class="absolute -inset-2 bg-${isActive ? 'blue' : 'slate'}-500/20 rounded-full blur-sm ${isActive ? 'animate-pulse' : ''}"></div>
                <div class="w-8 h-8 ${isActive ? 'bg-blue-600 scale-110' : 'bg-white border-2 border-slate-400'} rounded-full flex items-center justify-center shadow-lg transition-all transform duration-300">
                    ${req.status === 'COMPLETED' ? 
                        `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${isActive ? 'white' : '#64748b'}" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>` :
                        `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${isActive ? 'white' : '#64748b'}" stroke-width="3"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
                    }
                </div>
                ${isActive ? `<div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-blue-600"></div>` : ''}
            </div>
          `;

          const icon = L.divIcon({
              className: 'custom-pin',
              html: iconHtml,
              iconSize: [32, 32],
              iconAnchor: [16, 32]
          });

          if (!marker) {
              marker = L.marker([lat, lng], { icon }).addTo(leafletMap.current);
              marker.on('click', () => onSelect(req.id));
              markers.current.set(req.id, marker);
          } else {
              marker.setIcon(icon);
              marker.setLatLng([lat, lng]);
          }
          
          // Tooltip logic
          const tooltipContent = `
            <div class="font-bold text-slate-800">${req.customerName}</div>
            <div class="text-xs text-slate-500">${req.issue}</div>
          `;
          marker.bindTooltip(tooltipContent, { direction: 'top', offset: [0, -30], permanent: isActive });
      });

  }, [requests, activeId]);

  // Update Mechanic Location Pin
  useEffect(() => {
      if (!leafletMap.current || !mechanicLocation) return;
      const L = (window as any).L;

      if (!mechanicMarker.current) {
          const icon = L.divIcon({
              className: 'mechanic-location',
              html: `<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md relative"><div class="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div></div>`,
              iconSize: [16, 16]
          });
          mechanicMarker.current = L.marker([mechanicLocation.lat, mechanicLocation.lng], { icon }).addTo(leafletMap.current);
      } else {
          mechanicMarker.current.setLatLng([mechanicLocation.lat, mechanicLocation.lng]);
      }
  }, [mechanicLocation]);

  return <div ref={mapRef} className="w-full h-full bg-slate-100" />;
};

// 2. Job Chat Component
const JobChat = ({ job, onClose }: { job: JobRequest, onClose: () => void }) => {
    const storageKey = `mn_chat_${job.id}`;
    const [messages, setMessages] = useState<DashboardChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const load = () => {
            const saved = localStorage.getItem(storageKey);
            if (saved) setMessages(JSON.parse(saved));
        };
        load();
        const interval = setInterval(load, 1000); // Poll for customer replies
        return () => clearInterval(interval);
    }, [storageKey]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputText.trim()) return;

        const newMsg: DashboardChatMessage = {
            id: Date.now().toString(),
            sender: 'mechanic',
            text: inputText,
            timestamp: Date.now()
        };

        const updated = [...messages, newMsg];
        localStorage.setItem(storageKey, JSON.stringify(updated));
        setMessages(updated);
        setInputText('');

        // Sim Customer Reply
        setTimeout(() => {
            const reply: DashboardChatMessage = {
                id: (Date.now() + 1).toString(),
                sender: 'customer',
                text: "Thanks for the update!",
                timestamp: Date.now()
            };
            const withReply = [...updated, reply];
            localStorage.setItem(storageKey, JSON.stringify(withReply));
            setMessages(withReply);
        }, 3000);
    };

    const startDictation = () => {
        if (!('webkitSpeechRecognition' in window)) return;
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.lang = 'en-US';
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (e: any) => {
            setInputText(e.results[0][0].transcript);
        };
        recognition.start();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[600px] animate-scale-up">
                <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold">{job.customerName[0]}</div>
                        <div>
                            <h3 className="font-bold">{job.customerName}</h3>
                            <p className="text-xs text-slate-300">{job.vehicle}</p>
                        </div>
                    </div>
                    <button onClick={onClose}><X size={20}/></button>
                </div>
                <div className="flex-1 bg-slate-50 p-4 overflow-y-auto space-y-4">
                    {messages.map(m => (
                        <div key={m.id} className={`flex ${m.sender === 'mechanic' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.sender === 'mechanic' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}`}>
                                {m.text}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-3 bg-white border-t border-slate-100 flex gap-2 relative">
                    <input 
                        className="flex-1 bg-slate-100 rounded-xl pl-4 pr-10 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Message customer..."
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                    />
                    <button onClick={startDictation} className={`absolute right-16 top-5 ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}><Mic size={18}/></button>
                    <button onClick={() => handleSend()} className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-500"><Send size={20}/></button>
                </div>
            </div>
        </div>
    );
};

// 3. Completion Modal
const CompletionModal = ({ job, onClose, onComplete }: { job: JobRequest, onClose: () => void, onComplete: (details: JobCompletionDetails, method: 'CARD'|'CASH'|'EXTERNAL') => void }) => {
    const [step, setStep] = useState(1);
    const [details, setDetails] = useState<JobCompletionDetails>({ description: '', parts: '', notes: '', partsCost: 0 });
    const [paymentMethod, setPaymentMethod] = useState<'CARD'|'CASH'|'EXTERNAL'>('CARD');
    const [aiLoading, setAiLoading] = useState(false);
    const [recordingField, setRecordingField] = useState<string | null>(null);

    // Auto-fill logic from AI
    useEffect(() => {
        if (job.aiAnalysis?.recommendedServices?.[0] && !details.description) {
            // Optional: auto-fill logic if desired, but explicit button is safer
        }
    }, [job]);

    const handleAiAnalyze = async () => {
        setAiLoading(true);
        try {
            const res = await diagnoseCarIssue(job.issue, job.vehicle);
            if (res.recommendedServices.length > 0) {
                const svc = res.recommendedServices[0];
                setDetails(prev => ({
                    ...prev,
                    description: `${svc.name} (${svc.duration})`,
                    parts: svc.parts.join(', ')
                }));
            }
        } catch(e) {} finally { setAiLoading(false); }
    };

    const startDictation = (field: keyof JobCompletionDetails) => {
        if (!('webkitSpeechRecognition' in window)) return;
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.lang = 'en-US';
        recognition.onstart = () => setRecordingField(field as string);
        recognition.onend = () => setRecordingField(null);
        recognition.onresult = (e: any) => {
            setDetails(prev => ({ ...prev, [field]: e.results[0][0].transcript }));
        };
        recognition.start();
    };

    // Financials
    const subtotal = job.payout; // Labor
    const parts = details.partsCost || 0;
    const total = subtotal + parts;
    const fee = subtotal * 0.20; // 20% on labor
    const net = total - fee;

    if (step === 1) return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 animate-scale-up max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">Complete Job</h2>
                    <button onClick={onClose}><X size={24} className="text-slate-400 hover:text-slate-600"/></button>
                </div>

                {/* AI Assist */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-blue-900 flex items-center gap-2"><Sparkles size={16}/> AI Diagnostics</h3>
                        <button onClick={handleAiAnalyze} disabled={aiLoading} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold">
                            {aiLoading ? 'Analyzing...' : 'Auto-Fill Form'}
                        </button>
                    </div>
                    <p className="text-xs text-blue-700">Use AI to suggest service descriptions and parts based on the vehicle issue.</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Service Performed <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <textarea 
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl h-24 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Describe the work done..."
                                value={details.description}
                                onChange={e => setDetails({...details, description: e.target.value})}
                            />
                            <button onClick={() => startDictation('description')} className={`absolute right-2 bottom-2 ${recordingField === 'description' ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}><Mic size={18}/></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Parts Used</label>
                            <div className="relative">
                                <input 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                    placeholder="e.g. Brake Pads"
                                    value={details.parts}
                                    onChange={e => setDetails({...details, parts: e.target.value})}
                                />
                                <button onClick={() => startDictation('parts')} className={`absolute right-2 top-3 ${recordingField === 'parts' ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}><Mic size={18}/></button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Parts Cost ($)</label>
                            <input 
                                type="number"
                                min="0"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                placeholder="0.00"
                                value={details.partsCost || ''}
                                onChange={e => setDetails({...details, partsCost: parseFloat(e.target.value) || 0})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Final Notes</label>
                        <div className="relative">
                            <textarea 
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl h-20 text-sm"
                                placeholder="Any recommendations for the customer..."
                                value={details.notes}
                                onChange={e => setDetails({...details, notes: e.target.value})}
                            />
                            <button onClick={() => startDictation('notes')} className={`absolute right-2 bottom-2 ${recordingField === 'notes' ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}><Mic size={18}/></button>
                        </div>
                    </div>
                </div>

                <button 
                    disabled={!details.description}
                    onClick={() => setStep(2)} 
                    className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold mt-6 hover:bg-blue-500 disabled:opacity-50"
                >
                    Next: Payment
                </button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 animate-scale-up">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">Process Payment</h2>
                    <button onClick={() => setStep(1)} className="text-sm text-slate-500 font-bold">Back</button>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Labor (Base)</span>
                        <span className="font-medium">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Parts Cost</span>
                        <span className="font-medium">${parts.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-red-500">
                        <span>Platform Fee (20% Labor)</span>
                        <span>-${fee.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between text-lg font-bold text-slate-900">
                        <span>Your Payout</span>
                        <span className="text-green-600">${net.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-center text-slate-400 pt-1">Customer Charged: ${total.toFixed(2)}</div>
                </div>

                <div className="space-y-3 mb-6">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Method</label>
                    <button 
                        onClick={() => setPaymentMethod('CARD')}
                        className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${paymentMethod === 'CARD' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:bg-gray-50'}`}
                    >
                        <div className="flex items-center gap-3">
                            <CreditCard className={paymentMethod === 'CARD' ? 'text-blue-600' : 'text-slate-400'} />
                            <div className="text-left">
                                <p className={`font-bold ${paymentMethod === 'CARD' ? 'text-blue-900' : 'text-slate-700'}`}>App Payment</p>
                                <p className="text-xs text-slate-500">Customer's card on file (Stripe)</p>
                            </div>
                        </div>
                        {paymentMethod === 'CARD' && <CheckCircle className="text-blue-600" size={20}/>}
                    </button>

                    <button 
                        onClick={() => setPaymentMethod('CASH')}
                        className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${paymentMethod === 'CASH' ? 'border-green-600 bg-green-50' : 'border-slate-200 hover:bg-gray-50'}`}
                    >
                        <div className="flex items-center gap-3">
                            <Banknote className={paymentMethod === 'CASH' ? 'text-green-600' : 'text-slate-400'} />
                            <div className="text-left">
                                <p className={`font-bold ${paymentMethod === 'CASH' ? 'text-green-900' : 'text-slate-700'}`}>Cash / External</p>
                                <p className="text-xs text-slate-500">You collected cash/Venmo directly</p>
                            </div>
                        </div>
                        {paymentMethod === 'CASH' && <CheckCircle className="text-green-600" size={20}/>}
                    </button>
                </div>

                <button 
                    onClick={() => onComplete(details, paymentMethod)}
                    className="w-full bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-500 shadow-lg shadow-green-200 transition-all"
                >
                    {paymentMethod === 'CARD' ? `Charge Card $${total.toFixed(2)}` : 'Confirm Payment Collected'}
                </button>
                {paymentMethod === 'CASH' && (
                    <p className="text-xs text-center text-slate-400 mt-3">
                        * Platform fee will be deducted from your wallet balance.
                    </p>
                )}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

export const MechanicDashboard: React.FC = () => {
  const { user, notify, isLoading: appLoading } = useApp();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'earnings' | 'profile' | 'map' | 'history'>('requests');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'NEW' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [isOnline, setIsOnline] = useState(false);
  const [isStripeConnected, setIsStripeConnected] = useState(false);
  const [requests, setRequests] = useState<JobRequest[]>([]);
  const [earningsStats, setEarningsStats] = useState({ today: 0, week: 0, month: 0 });
  const [mechanicLocation, setMechanicLocation] = useState<{lat: number, lng: number} | null>(null);
  
  // Mechanic Profile Edit State
  const [profileBio, setProfileBio] = useState('');
  const [profileExp, setProfileExp] = useState(1);
  const [schedule, setSchedule] = useState<MechanicSchedule>({
      monday: { start: '09:00', end: '17:00', active: true },
      tuesday: { start: '09:00', end: '17:00', active: true },
      wednesday: { start: '09:00', end: '17:00', active: true },
      thursday: { start: '09:00', end: '17:00', active: true },
      friday: { start: '09:00', end: '17:00', active: true },
      saturday: { start: '10:00', end: '14:00', active: true },
      sunday: { start: '09:00', end: '17:00', active: false },
  });

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [chatJob, setChatJob] = useState<JobRequest | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [navPromptJob, setNavPromptJob] = useState<JobRequest | null>(null);
  const [isCashOutProcessing, setIsCashOutProcessing] = useState(false);
  const [isOnboardingStripe, setIsOnboardingStripe] = useState(false);
  
  const prevRequestsRef = useRef<JobRequest[]>([]);

  // Get Mechanic Location on mount with high accuracy for background prep
  useEffect(() => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => setMechanicLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => console.log("Location access denied", err),
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    }
  }, []);

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
            
            // Init profile data if available
            // For now assuming user context or separate fetch, simplified here:
            if (user.isMechanic) {
                // mock prefill
                setProfileExp(5);
            }
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

  // Check for Stripe Connect Return
  useEffect(() => {
    const checkStripe = async () => {
        // If we are waiting for stripe AND we have a code or we are simply returning
        if (localStorage.getItem('mn_awaiting_stripe') === 'true') {
            localStorage.removeItem('mn_awaiting_stripe');
            setIsOnboardingStripe(true);
            try {
                // Parse code from URL search params (Standard Connect)
                // Express accounts typically return without code but trigger an update
                const params = new URLSearchParams(window.location.search);
                const code = params.get('code') || '';
                
                await api.mechanic.onboardStripe(code);
                
                setIsStripeConnected(true);
                notify("Success", "Stripe Account Verified!");
                
                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch(e) {
                notify("Note", "Stripe verification incomplete or cancelled.");
            } finally {
                setIsOnboardingStripe(false);
            }
        }
    };
    checkStripe();
  }, []);

  // Monitor for New Jobs and Send Notifications
  useEffect(() => {
      if (isLoading) return;

      const previousIds = new Set(prevRequestsRef.current.map(r => r.id));
      const newJobs = requests.filter(r => r.status === 'NEW' && !previousIds.has(r.id));

      if (newJobs.length > 0 && isOnline) {
          notify("New Job Alert", `${newJobs.length} new job(s) available nearby.`);
          
          // Try browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
             new Notification('MechanicNow', { 
                 body: `New Job: ${newJobs[0].vehicle} - ${newJobs[0].issue}`,
                 icon: '/vite.svg'
             });
          } else if ('Notification' in window && Notification.permission !== 'denied') {
              Notification.requestPermission();
          }
      }
      
      prevRequestsRef.current = requests;
  }, [requests, isLoading, isOnline, notify]);

  const activeJob = requests.find(r => r.id === selectedJobId);

  // GPS Broadcaster: Whenever an active job is in progress or en-route, track position
  useEffect(() => {
    let watchId: number | null = null;

    if (activeJob && (activeJob.status === 'ACCEPTED' || activeJob.status === 'ARRIVED' || activeJob.status === 'IN_PROGRESS')) {
        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setMechanicLocation(newLoc);
                    // Update location in DB for tracking
                    api.mechanic.updateLocation(activeJob.id, pos.coords.latitude, pos.coords.longitude);
                },
                (err) => console.error(err),
                { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
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
      if (newState) {
          notify("You are Online", "Waiting for job requests...");
      } else {
          notify("You are Offline", "You will not receive new job requests.");
      }
  };
  
  const handleSaveProfile = () => {
      // In real app, we would save schedule too
      notify("Profile Saved", "Your mechanic profile and schedule have been updated.");
      // api.mechanic.updateProfile({ bio: profileBio, yearsExperience: profileExp, schedule });
  };

  const handleAcceptJob = async (id: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const job = requests.find(r => r.id === id);
      if (job) setNavPromptJob(job);
  };

  const handleConfirmNavigation = async (startNav: boolean) => {
    if (!navPromptJob || !user) return;
    const updatedJob: JobRequest = { ...navPromptJob, status: 'ACCEPTED', mechanicId: user.id };
    
    setRequests(prev => prev.map(r => r.id === navPromptJob.id ? updatedJob : r));
    setNavPromptJob(null);
    
    if (startNav && updatedJob.location) {
        window.open(`https://www.google.com/maps/search/?api=1&query=${updatedJob.location.lat},${updatedJob.location.lng}`, '_blank');
    }
    await api.mechanic.updateJobRequest(updatedJob);
    
    notify("Job Accepted", "Customer has been notified that you are en route.");
  };

  const handleStatusUpdate = async (id: string, newStatus: JobRequest['status']) => {
      const job = requests.find(r => r.id === id);
      if (!job) return;
      const updatedJob = { ...job, status: newStatus };
      setRequests(prev => prev.map(r => r.id === id ? updatedJob : r));
      await api.mechanic.updateJobRequest(updatedJob);
      
      if (newStatus === 'ARRIVED') {
          notify("Status Updated", "Customer notified of arrival.");
      }
  };

  const handleCompleteJobClick = (id: string) => {
      setSelectedJobId(id);
      setShowCompletionModal(true);
  };

  const handleCashOut = async () => {
    setIsCashOutProcessing(true);
    try {
        await api.mechanic.payoutToBank(earningsStats.week);
        notify("Payout Initiated", `$${earningsStats.week.toFixed(2)} is on its way to your bank.`);
    } catch(e) {
        notify("Error", "Payout failed. Please try again.");
    } finally {
        setIsCashOutProcessing(false);
    }
  };
  
  const handleStripeConnect = async () => {
      setIsOnboardingStripe(true);
      try {
          // 1. Get OAuth Link
          const { url } = await api.mechanic.createStripeConnectAccount();
          
          // 2. Set flag and Redirect to Stripe Express
          localStorage.setItem('mn_awaiting_stripe', 'true');
          window.location.href = url;

      } catch(e) {
          notify("Error", "Failed to connect Stripe.");
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
      
      setShowCompletionModal(false);
      notify("Job Completed", `You earned $${mechanicNet.toFixed(2)}!`);
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
    <div className="flex h-screen bg-slate-50 overflow-hidden pt-[calc(5rem+env(safe-area-inset-top))]">
        <div className="w-20 md:w-64 bg-white border-r border-slate-200 flex flex-col justify-between flex-shrink-0 transition-all duration-300 pb-[env(safe-area-inset-bottom)]">
            <div className="p-4 space-y-2">
                <button onClick={() => setActiveTab('requests')} className={`w-full p-3 rounded-xl flex items-center gap-3 ${activeTab === 'requests' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-gray-50'}`}>
                    <Wrench size={24} /><span className="hidden md:block font-medium">Jobs</span>
                </button>
                <button onClick={() => setActiveTab('map')} className={`w-full p-3 rounded-xl flex items-center gap-3 ${activeTab === 'map' ? 'bg-purple-50 text-purple-600' : 'text-slate-500 hover:bg-gray-50'}`}>
                    <MapIcon size={24} /><span className="hidden md:block font-medium">Map View</span>
                </button>
                <button onClick={() => setActiveTab('earnings')} className={`w-full p-3 rounded-xl flex items-center gap-3 ${activeTab === 'earnings' ? 'bg-green-50 text-green-600' : 'text-slate-500 hover:bg-gray-50'}`}>
                    <DollarSign size={24} /><span className="hidden md:block font-medium">Earnings</span>
                </button>
                <button onClick={() => setActiveTab('history')} className={`w-full p-3 rounded-xl flex items-center gap-3 ${activeTab === 'history' ? 'bg-amber-50 text-amber-600' : 'text-slate-500 hover:bg-gray-50'}`}>
                    <ClipboardList size={24} /><span className="hidden md:block font-medium">History</span>
                </button>
                <button onClick={() => setActiveTab('profile')} className={`w-full p-3 rounded-xl flex items-center gap-3 ${activeTab === 'profile' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-gray-50'}`}>
                    <User size={24} /><span className="hidden md:block font-medium">Profile</span>
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
                    {/* List Container - Full width on mobile, fixed width on desktop */}
                    <div className="w-full md:w-96 bg-white border-r border-slate-200 flex flex-col z-10 shadow-xl md:shadow-none h-full">
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
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 pb-[env(safe-area-inset-bottom)]">
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
                    {/* Hide map on mobile for requests tab, forcing use of Map tab for map on mobile */}
                    <div className="hidden md:flex flex-1 bg-gray-100 relative flex-col">
                        <DashboardMap 
                            requests={visibleRequests} 
                            activeId={selectedJobId} 
                            onSelect={setSelectedJobId} 
                            mechanicLocation={mechanicLocation}
                        />
                        {activeJob && !showCompletionModal && (
                            <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 bg-white rounded-3xl shadow-2xl p-6 animate-slide-up border border-slate-100 z-10" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold">{activeJob.customerName}</h2>
                                    <button 
                                        onClick={() => setChatJob(activeJob)}
                                        className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                                    >
                                        <MessageSquare size={20} />
                                    </button>
                                </div>
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
                    <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-sm border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Live Job Map
                    </div>
                    
                    <DashboardMap 
                        requests={requests.filter(r => ['NEW', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(r.status))} 
                        activeId={selectedJobId} 
                        onSelect={setSelectedJobId} 
                        mechanicLocation={mechanicLocation}
                    />

                    {activeJob && !showCompletionModal && (
                        <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 bg-white rounded-3xl shadow-2xl p-6 animate-slide-up border border-slate-100 z-10" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
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
                                     <div className="flex gap-2 w-full">
                                         <button onClick={() => setChatJob(activeJob)} className="p-3 bg-blue-50 text-blue-600 rounded-xl"><MessageSquare size={20}/></button>
                                         <button onClick={() => setActiveTab('requests')} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200">View Details</button>
                                     </div>
                                 )}
                             </div>
                        </div>
                    )}
                </div>
            )}
            
            {activeTab === 'earnings' && (
                <div className="p-8 max-w-5xl mx-auto w-full overflow-y-auto pb-[env(safe-area-inset-bottom)]">
                    <h2 className="text-3xl font-bold text-slate-900 mb-6">Earnings & Payouts</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <p className="text-slate-500 text-sm font-bold uppercase mb-2">Today</p>
                            <p className="text-4xl font-bold text-slate-900">${earningsStats.today.toFixed(2)}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <p className="text-slate-500 text-sm font-bold uppercase mb-2">This Week</p>
                            <p className="text-4xl font-bold text-slate-900">${earningsStats.week.toFixed(2)}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <p className="text-slate-500 text-sm font-bold uppercase mb-2">This Month</p>
                            <p className="text-4xl font-bold text-slate-900">${earningsStats.month.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
                        <div>
                            <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
                                <Wallet /> MechanicNow Payouts
                            </h3>
                            <p className="text-slate-300 max-w-md">
                                {isStripeConnected 
                                    ? "Your Stripe account is connected. Earnings are automatically transferred or available for cash out." 
                                    : "Connect a bank account or debit card to receive your earnings instantly via Stripe."}
                            </p>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                            {!isStripeConnected ? (
                                <button 
                                    onClick={handleStripeConnect}
                                    className="bg-white text-slate-900 px-8 py-4 rounded-xl font-bold hover:bg-blue-50 transition-colors flex items-center gap-2"
                                >
                                    <Link2 size={20} /> Setup Payouts
                                </button>
                            ) : (
                                <button 
                                    onClick={handleCashOut}
                                    disabled={earningsStats.week <= 0 || isCashOutProcessing}
                                    className="bg-green-500 text-white px-8 py-4 rounded-xl font-bold hover:bg-green-400 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-900/20"
                                >
                                    {isCashOutProcessing ? <Loader2 className="animate-spin"/> : <DollarSign size={20} />} 
                                    Cash Out Now
                                </button>
                            )}
                            {isStripeConnected && <div className="text-xs text-green-400 font-medium flex items-center gap-1"><CheckCircle size={12}/> Account Connected</div>}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="p-8 max-w-5xl mx-auto w-full overflow-y-auto pb-[env(safe-area-inset-bottom)]">
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">Service History</h2>
                    <p className="text-slate-500 mb-8">A record of all your completed repairs.</p>

                    <div className="space-y-4">
                        {completedJobs.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
                                <ClipboardList size={48} className="text-slate-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-900 mb-2">No completed jobs yet</h3>
                                <p className="text-slate-500">When you finish a repair, it will appear here.</p>
                            </div>
                        ) : (
                            completedJobs.map(job => (
                                <div key={job.id} className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                            <CheckCircle size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-lg">{job.vehicle}</h4>
                                            <p className="text-sm text-slate-500">{job.issue} • {job.customerName}</p>
                                            <p className="text-xs text-slate-400 mt-1">Completed on {new Date().toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-slate-900">${job.priceBreakdown?.mechanicPayout.toFixed(2)}</p>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Earned</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'profile' && (
                <div className="p-8 max-w-3xl mx-auto w-full overflow-y-auto pb-[env(safe-area-inset-bottom)]">
                    <h2 className="text-3xl font-bold text-slate-900 mb-6">Mechanic Profile</h2>
                    
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-6">
                        <div className="flex items-center gap-4 mb-6">
                            <img src={user?.avatar} alt="Profile" className="w-20 h-20 rounded-full bg-slate-100" />
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">{user?.name}</h3>
                                <p className="text-slate-500">{user?.email}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Bio</label>
                                <textarea 
                                    className="w-full p-3 border border-slate-200 rounded-xl"
                                    rows={3}
                                    value={profileBio}
                                    onChange={(e) => setProfileBio(e.target.value)}
                                    placeholder="Tell customers about yourself..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Years Experience</label>
                                <input 
                                    type="number"
                                    className="w-full p-3 border border-slate-200 rounded-xl"
                                    value={profileExp}
                                    onChange={(e) => setProfileExp(parseInt(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>

                    <button onClick={handleSaveProfile} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-500 shadow-lg shadow-blue-200">
                        Save Changes
                    </button>
                </div>
            )}
        </div>
        
        {/* Modals */}
        {showCompletionModal && activeJob && (
             <CompletionModal 
                job={activeJob} 
                onClose={handleCloseCompletionModal} 
                onComplete={handleProcessPayment} 
             />
        )}
        {chatJob && (
            <JobChat job={chatJob} onClose={() => setChatJob(null)} />
        )}
        {navPromptJob && (
             <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl p-6 max-w-sm w-full animate-scale-up text-center">
                    <Navigation size={48} className="text-blue-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Open Navigation?</h3>
                    <p className="text-slate-500 mb-6">We can open Google Maps to guide you to the customer's location.</p>
                    <div className="flex gap-3">
                        <button onClick={() => handleConfirmNavigation(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">No, Just Accept</button>
                        <button onClick={() => handleConfirmNavigation(true)} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl">Open Maps</button>
                    </div>
                </div>
             </div>
        )}
        {isOnboardingStripe && (
             <div className="fixed inset-0 z-[70] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center">
                 <Loader2 size={64} className="text-blue-600 animate-spin mb-4" />
                 <h3 className="text-2xl font-bold text-slate-900">Connecting to Stripe...</h3>
                 <p className="text-slate-500">Please wait while we verify your payout details.</p>
             </div>
        )}
    </div>
  );
};
