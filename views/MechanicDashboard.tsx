import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../App';
import { MapPin, DollarSign, Clock, User, ArrowRight, Shield, Settings, Power, Navigation, Phone, Bell, MessageSquare, X, Send, CheckCircle, PenTool, Sparkles, Loader2, FileText, Wrench, Mic, TrendingUp, RefreshCw, Calendar, ChevronRight, Timer, RotateCcw, Package, Wallet, CreditCard, Banknote, Smartphone, Filter, Map as MapIcon, Link2, Save, ClipboardList, Lock } from 'lucide-react';
import { useNavigate, Navigate } from '../App';
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
                            <CreditCard className={paymentMethod === 'CARD' ? 'text-blue-600' : 'text-slate-400'} size={24} />
                            <div className="text-left">
                                <p className={`font-bold text-sm ${paymentMethod === 'CARD' ? 'text-blue-900' : 'text-slate-700'}`}>Card Payment (Stripe)</p>
                                <p className="text-xs text-slate-500">Secure online processing</p>
                            </div>
                        </div>
                        {paymentMethod === 'CARD' && <CheckCircle size={20} className="text-blue-600"/>}
                    </button>

                    <button 
                        onClick={() => setPaymentMethod('CASH')}
                        className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${paymentMethod === 'CASH' ? 'border-green-600 bg-green-50' : 'border-slate-200 hover:bg-gray-50'}`}
                    >
                         <div className="flex items-center gap-3">
                            <Banknote className={paymentMethod === 'CASH' ? 'text-green-600' : 'text-slate-400'} size={24} />
                            <div className="text-left">
                                <p className={`font-bold text-sm ${paymentMethod === 'CASH' ? 'text-green-900' : 'text-slate-700'}`}>Cash / External</p>
                                <p className="text-xs text-slate-500">Cash, Zelle, Venmo</p>
                            </div>
                        </div>
                        {paymentMethod === 'CASH' && <CheckCircle size={20} className="text-green-600"/>}
                    </button>
                </div>

                <button 
                    onClick={() => onComplete(details, paymentMethod)} 
                    className="w-full bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-500 shadow-lg shadow-green-200"
                >
                    Confirm & Finish Job
                </button>
            </div>
        </div>
    );
};

export const MechanicDashboard: React.FC = () => {
  const { user, notify, isLoading: appLoading } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'requests' | 'map' | 'earnings' | 'history' | 'profile'>('requests');
  const [isOnline, setIsOnline] = useState(false);
  const [requests, setRequests] = useState<JobRequest[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  
  // Dashboard Stats
  const [stats, setStats] = useState({ 
      earnings: { today: 0, week: 0, month: 0 },
      isOnline: false,
      stripeConnected: false
  });

  const [isLoading, setIsLoading] = useState(true);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);

  // Modals
  const [showChat, setShowChat] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  
  // Handle Stripe OAuth Return
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    // If we have a code and we were expecting a stripe return (simple check via localStorage or just presence of code)
    if (code) {
         // Clear the query param to avoid re-trigger
         window.history.replaceState({}, document.title, window.location.pathname);
         notify('Processing', 'Linking Stripe Account...');
         
         api.mechanic.onboardStripe(code)
            .then(() => {
                notify('Success', 'Stripe account connected!');
                setStats(prev => ({ ...prev, stripeConnected: true }));
            })
            .catch(err => {
                notify('Error', 'Failed to link Stripe account.');
            });
    }
  }, []);

  useEffect(() => {
    if (user?.isMechanic) {
        initDashboard();
        
        // Start Location Tracking
        if (navigator.geolocation) {
            const watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    // If online and on active job, update server
                    if (activeJobId && isOnline) {
                         api.mechanic.updateLocation(activeJobId, pos.coords.latitude, pos.coords.longitude);
                    }
                },
                (err) => console.warn(err),
                { enableHighAccuracy: true }
            );
            return () => navigator.geolocation.clearWatch(watchId);
        }
    }
  }, [user, activeJobId, isOnline]);

  const initDashboard = async () => {
      try {
          const data = await api.mechanic.getDashboardData();
          setRequests(data.requests);
          setStats({
              earnings: data.earnings,
              isOnline: data.isOnline,
              stripeConnected: data.stripeConnected
          });
          setIsOnline(data.isOnline);
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoading(false);
      }

      const unsubscribe = api.mechanic.subscribeToDashboard((data) => {
          setRequests(data.requests);
      });
      return unsubscribe;
  };

  const toggleOnline = async () => {
      const newState = !isOnline;
      setIsOnline(newState);
      await api.mechanic.updateStatus(newState);
      notify(newState ? "You're Online" : "You're Offline", newState ? "Receiving job requests." : "Hidden from search.");
  };

  const handleJobAction = async (job: JobRequest, action: 'ACCEPT' | 'DECLINE' | 'ARRIVE' | 'START') => {
      let status: any = job.status;
      if (action === 'ACCEPT') status = 'ACCEPTED';
      if (action === 'DECLINE') {
          // In real app, maybe hide for this mechanic or re-assign
          // For now, delete/hide
          await api.mechanic.deleteJobRequest(job.id);
          return;
      }
      if (action === 'ARRIVE') status = 'ARRIVED';
      if (action === 'START') status = 'IN_PROGRESS';

      await api.mechanic.updateJobRequest({ ...job, status, mechanicId: user!.id });
      if (action === 'ACCEPT') setActiveJobId(job.id);
  };

  const handleCompleteJob = async (details: JobCompletionDetails, method: 'CARD'|'CASH'|'EXTERNAL') => {
      if (!activeJobId) return;
      const job = requests.find(r => r.id === activeJobId);
      if (!job) return;

      try {
          // If Card, we need to capture payment via API
          if (method === 'CARD' && job.paymentIntentId) {
             await api.payment.capture(job.id, (job.payout + (details.partsCost || 0)) * 1.25); // Capture total + fee
          }

          // Update Job
          await api.mechanic.updateJobRequest({
              ...job,
              status: 'COMPLETED',
              completionDetails: { ...details, collectedPaymentMethod: method },
              paymentStatus: method === 'CARD' ? 'CAPTURED' : 'PENDING'
          });

          // Update Earnings (Simple logic: labor + parts - fee)
          // In reality, parts might be reimbursed differently. Assuming Mechanic gets Parts Cost back 100% + Labor Share
          const payout = job.payout; // Net payout from breakdown
          await api.mechanic.updateEarnings(payout);

          // Update local stats
          setStats(prev => ({
              ...prev,
              earnings: {
                  ...prev.earnings,
                  today: prev.earnings.today + payout,
                  week: prev.earnings.week + payout,
                  month: prev.earnings.month + payout
              }
          }));

          setActiveJobId(null);
          setShowComplete(false);
          notify("Job Completed", `You earned $${payout.toFixed(2)}`);
      } catch (e) {
          notify("Error", "Failed to complete job. Please try again.");
      }
  };

  const handleStripeConnect = async () => {
      try {
          const res = await api.mechanic.createStripeConnectAccount();
          if (res.url) window.location.href = res.url;
      } catch(e) {
          notify("Error", "Could not initiate Stripe Connect.");
      }
  };

  const handleCashOut = async () => {
      try {
          if (stats.earnings.week <= 0) return;
          await api.mechanic.payoutToBank(stats.earnings.week);
          notify("Success", "Payout initiated to your bank.");
          setStats(prev => ({ ...prev, earnings: { ...prev.earnings, week: 0 } }));
      } catch(e) {
          notify("Error", "Payout failed.");
      }
  };

  if (!appLoading && (!user || !user.isMechanic)) return <Navigate to="/" replace />;
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white"><Loader2 className="animate-spin mr-2"/> Loading Dashboard...</div>;

  const activeJob = requests.find(r => r.id === activeJobId) || requests.find(r => ['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(r.status) && r.mechanicId === user?.id);
  // Sync active job ID if found in list
  if (activeJob && activeJob.id !== activeJobId) setActiveJobId(activeJob.id);

  const completedJobs = requests.filter(r => r.status === 'COMPLETED' && r.mechanicId === user?.id);

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden pt-[calc(3.5rem+env(safe-area-inset-top))]">
        {/* Top Status Bar */}
        <div className="bg-white px-4 py-3 border-b border-gray-200 flex justify-between items-center shadow-sm z-20">
            <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></div>
                <div>
                   <h1 className="font-bold text-slate-800 leading-none">Partner Dashboard</h1>
                   <p className="text-xs text-slate-500 mt-0.5">{isOnline ? 'Online - Receiving Jobs' : 'Offline'}</p>
                </div>
            </div>
            <button 
                onClick={toggleOnline}
                className={`p-2 rounded-full font-bold transition-all ${isOnline ? 'bg-green-100 text-green-700 px-4' : 'bg-slate-100 text-slate-600 px-4'}`}
            >
                {isOnline ? 'GO OFFLINE' : 'GO ONLINE'}
            </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 relative overflow-hidden flex flex-col md:flex-row">
            
            {/* Map Background (Always rendered for smoothness, hidden on mobile if not tab) */}
            <div className={`absolute inset-0 z-0 ${activeTab === 'map' ? 'block' : 'hidden md:block'}`}>
                <DashboardMap 
                    requests={requests.filter(r => r.status === 'NEW' || r.mechanicId === user?.id)} 
                    activeId={activeJobId} 
                    onSelect={setActiveJobId}
                    mechanicLocation={location}
                />
            </div>

            {/* Content Overlay (Desktop: Left Panel, Mobile: Full Screen based on Tab) */}
            <div className={`relative z-10 w-full md:w-[450px] h-full bg-slate-100 md:shadow-2xl flex flex-col transition-transform duration-300 ${activeTab === 'map' ? 'translate-y-full md:translate-y-0 pointer-events-none md:pointer-events-auto opacity-0 md:opacity-100' : ''}`}>
                
                {/* Active Job Floating Card (If any) */}
                {activeJob && activeTab !== 'earnings' && activeTab !== 'profile' && activeTab !== 'history' && (
                     <div className="bg-blue-600 text-white p-4 m-4 rounded-2xl shadow-xl animate-slide-up pointer-events-auto">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-bold text-lg">{activeJob.vehicle}</h3>
                                <p className="text-blue-100 text-sm">{activeJob.issue}</p>
                            </div>
                            <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold">{activeJob.status}</span>
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                            {activeJob.status === 'ACCEPTED' && (
                                <button onClick={() => handleJobAction(activeJob, 'ARRIVE')} className="flex-1 bg-white text-blue-600 py-2 rounded-lg font-bold hover:bg-blue-50">
                                    Arrived at Location
                                </button>
                            )}
                            {activeJob.status === 'ARRIVED' && (
                                <button onClick={() => handleJobAction(activeJob, 'START')} className="flex-1 bg-white text-blue-600 py-2 rounded-lg font-bold hover:bg-blue-50">
                                    Start Job
                                </button>
                            )}
                            {activeJob.status === 'IN_PROGRESS' && (
                                <button onClick={() => setShowComplete(true)} className="flex-1 bg-green-400 text-green-900 py-2 rounded-lg font-bold hover:bg-green-300">
                                    Complete Job
                                </button>
                            )}
                            <button onClick={() => setShowChat(true)} className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30"><MessageSquare size={20}/></button>
                            <a href={`tel:5555555555`} className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30"><Phone size={20}/></a>
                        </div>
                     </div>
                )}

                {/* Tabs Content */}
                <div className="flex-1 overflow-y-auto pointer-events-auto pb-20">
                    
                    {activeTab === 'requests' && (
                        <div className="p-4 space-y-4">
                            <h2 className="font-bold text-slate-500 text-xs uppercase tracking-wider mb-2">New Requests ({requests.filter(r => r.status === 'NEW').length})</h2>
                            {requests.filter(r => r.status === 'NEW').length === 0 ? (
                                <div className="text-center py-10 text-slate-400">
                                    <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                                        <Wrench size={24} />
                                    </div>
                                    <p>Scanning for jobs...</p>
                                </div>
                            ) : (
                                requests.filter(r => r.status === 'NEW').map(req => (
                                    <div key={req.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold">{req.customerName[0]}</div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900">{req.customerName}</h3>
                                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                                        <MapPin size={12}/> {req.distance} • 15 min away
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-green-600 text-lg">${req.payout.toFixed(0)}</div>
                                                {req.urgency === 'HIGH' && <div className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold inline-block">URGENT</div>}
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-50 p-3 rounded-xl mb-4 text-sm text-slate-700">
                                            <span className="font-bold block text-slate-900 mb-1">{req.vehicle}</span>
                                            {req.issue}
                                        </div>

                                        <div className="flex gap-2">
                                            <button onClick={() => handleJobAction(req, 'DECLINE')} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Decline</button>
                                            <button onClick={() => handleJobAction(req, 'ACCEPT')} className="flex-[2] py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-200">Accept Job</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'earnings' && (
                        <div className="p-4 space-y-6">
                            <h2 className="text-xl font-bold text-slate-900">Earnings</h2>
                            
                            {!stats.stripeConnected ? (
                                <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-xl text-center">
                                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Banknote size={24} />
                                    </div>
                                    <h3 className="font-bold text-lg mb-2">Set up Payouts</h3>
                                    <p className="text-blue-100 text-sm mb-6">Connect your bank account via Stripe to receive payments instantly.</p>
                                    <button onClick={handleStripeConnect} className="w-full bg-white text-blue-600 py-3 rounded-xl font-bold hover:bg-blue-50">
                                        Connect Stripe
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
                                    <p className="text-slate-400 text-sm font-medium mb-1">Available for Payout</p>
                                    <h3 className="text-4xl font-bold mb-6">${stats.earnings.week.toFixed(2)}</h3>
                                    <button 
                                        onClick={handleCashOut}
                                        disabled={stats.earnings.week <= 0}
                                        className="w-full bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-400 disabled:opacity-50 disabled:bg-slate-700"
                                    >
                                        Cash Out Now
                                    </button>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                    <p className="text-xs text-slate-500 font-bold uppercase">Today</p>
                                    <p className="text-2xl font-bold text-slate-900">${stats.earnings.today}</p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                    <p className="text-xs text-slate-500 font-bold uppercase">This Month</p>
                                    <p className="text-2xl font-bold text-slate-900">${stats.earnings.month}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="p-4 space-y-4">
                            <h2 className="text-xl font-bold text-slate-900">Completed Jobs</h2>
                            {completedJobs.length === 0 ? (
                                <p className="text-slate-400 text-center py-8">No completed jobs yet.</p>
                            ) : (
                                completedJobs.map(job => (
                                    <div key={job.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                                        <div>
                                            <h4 className="font-bold text-slate-900">{job.vehicle}</h4>
                                            <p className="text-xs text-slate-500">{new Date().toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="block font-bold text-green-600">+${(job.payout * 0.8).toFixed(2)}</span>
                                            <span className="text-[10px] text-slate-400 uppercase">Net Earned</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'profile' && (
                         <div className="p-4 space-y-4">
                            <div className="text-center mb-6">
                                <img src={user?.avatar} className="w-24 h-24 rounded-full mx-auto mb-3 border-4 border-white shadow-lg" />
                                <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
                                <p className="text-slate-500">Certified Mechanic</p>
                            </div>

                            <div className="bg-white p-4 rounded-2xl border border-slate-200">
                                <h3 className="font-bold text-slate-900 mb-4">Settings</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between p-3 hover:bg-slate-50 rounded-lg cursor-pointer">
                                        <span>Edit Bio</span> <ChevronRight size={16} className="text-slate-400"/>
                                    </div>
                                    <div className="flex justify-between p-3 hover:bg-slate-50 rounded-lg cursor-pointer">
                                        <span>Update Insurance</span> <ChevronRight size={16} className="text-slate-400"/>
                                    </div>
                                    <div className="flex justify-between p-3 hover:bg-slate-50 rounded-lg cursor-pointer">
                                        <span>Change Password</span> <ChevronRight size={16} className="text-slate-400"/>
                                    </div>
                                </div>
                            </div>
                             
                            <button className="w-full py-4 text-red-500 font-bold bg-white border border-red-100 rounded-xl hover:bg-red-50">
                                Log Out
                            </button>
                         </div>
                    )}

                </div>
            </div>
        </div>

        {/* Bottom Tab Bar (Mobile Only) */}
        <div className="md:hidden bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center z-30 pb-[env(safe-area-inset-bottom)]">
            <button onClick={() => setActiveTab('requests')} className={`flex flex-col items-center gap-1 ${activeTab === 'requests' ? 'text-slate-900' : 'text-slate-400'}`}>
                <ClipboardList size={24} strokeWidth={activeTab === 'requests' ? 2.5 : 2} />
                <span className="text-[10px] font-bold">Jobs</span>
            </button>
            <button onClick={() => setActiveTab('map')} className={`flex flex-col items-center gap-1 ${activeTab === 'map' ? 'text-slate-900' : 'text-slate-400'}`}>
                <MapIcon size={24} strokeWidth={activeTab === 'map' ? 2.5 : 2} />
                <span className="text-[10px] font-bold">Map</span>
            </button>
             <button onClick={() => setActiveTab('earnings')} className={`flex flex-col items-center gap-1 ${activeTab === 'earnings' ? 'text-slate-900' : 'text-slate-400'}`}>
                <Wallet size={24} strokeWidth={activeTab === 'earnings' ? 2.5 : 2} />
                <span className="text-[10px] font-bold">Earn</span>
            </button>
            <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-slate-900' : 'text-slate-400'}`}>
                <User size={24} strokeWidth={activeTab === 'profile' ? 2.5 : 2} />
                <span className="text-[10px] font-bold">Me</span>
            </button>
        </div>

        {/* Desktop Sidebar Navigation (Hidden Mobile) - Actually managed by Layout wrapper usually, but if this page is standalone: */}
        {/* Included in Main Content Overlay style above as a persistent left panel */}

        {/* Modals */}
        {showChat && activeJob && <JobChat job={activeJob} onClose={() => setShowChat(false)} />}
        {showComplete && activeJob && <CompletionModal job={activeJob} onClose={() => setShowComplete(false)} onComplete={handleCompleteJob} />}

    </div>
  );
};