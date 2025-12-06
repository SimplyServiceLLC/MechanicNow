
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../App';
import { MapPin, DollarSign, Clock, User, ArrowRight, Shield, Settings, Power, Navigation, Phone, Bell, MessageSquare, X, Send, CheckCircle, PenTool, Sparkles, Loader2, FileText, Wrench, Mic, TrendingUp, RefreshCw, Calendar, ChevronRight, Timer, RotateCcw, Package, Wallet, CreditCard, Banknote, Smartphone, Filter, Map as MapIcon, Link2, Save, ClipboardList, Lock, Briefcase, ChevronUp, ShieldCheck, LogOut } from 'lucide-react';
import { useNavigate, Navigate } from '../App';
import { JobRequest, JobCompletionDetails, AiDiagnosisResult, MechanicSchedule } from '../types';
import { diagnoseCarIssue } from '../services/geminiService';
import { api } from '../services/api';

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
            attributionControl: false,
            zoomAnimation: true
        }).setView([36.8508, -76.2859], 12); 

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: ''
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

          const isNew = req.status === 'NEW';
          const colorClass = isNew ? 'bg-blue-600' : 'bg-slate-700';

          const iconHtml = `
            <div class="relative group">
                <div class="absolute -inset-2 ${isNew ? 'bg-blue-500/30' : 'bg-slate-500/20'} rounded-full blur-sm ${isActive || isNew ? 'animate-pulse' : ''}"></div>
                <div class="w-10 h-10 ${isActive ? 'scale-110' : ''} ${colorClass} rounded-full flex items-center justify-center shadow-xl border-2 border-white transition-all transform duration-300">
                    <span class="text-white font-bold text-xs">$${Math.floor(req.payout)}</span>
                </div>
                ${isActive ? `<div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-slate-700"></div>` : ''}
            </div>
          `;

          const icon = L.divIcon({
              className: 'custom-pin',
              html: iconHtml,
              iconSize: [40, 40],
              iconAnchor: [20, 40]
          });

          if (!marker) {
              marker = L.marker([lat, lng], { icon }).addTo(leafletMap.current);
              marker.on('click', () => onSelect(req.id));
              markers.current.set(req.id, marker);
          } else {
              marker.setIcon(icon);
              marker.setLatLng([lat, lng]);
          }
      });

  }, [requests, activeId]);

  // Update Mechanic Location Pin
  useEffect(() => {
      if (!leafletMap.current || !mechanicLocation) return;
      const L = (window as any).L;

      if (!mechanicMarker.current) {
          const icon = L.divIcon({
              className: 'mechanic-location',
              html: `
                <div class="w-4 h-4 bg-slate-900 rounded-full border-2 border-white shadow-md relative z-50">
                    <div class="absolute inset-0 bg-slate-900 rounded-full animate-ping opacity-75"></div>
                </div>`,
              iconSize: [16, 16]
          });
          mechanicMarker.current = L.marker([mechanicLocation.lat, mechanicLocation.lng], { icon, zIndexOffset: 1000 }).addTo(leafletMap.current);
      } else {
          mechanicMarker.current.setLatLng([mechanicLocation.lat, mechanicLocation.lng]);
      }
  }, [mechanicLocation]);

  return <div ref={mapRef} className="w-full h-full bg-slate-200" />;
};

// 2. Job Chat Component
const JobChat = ({ job, onClose }: { job: JobRequest, onClose: () => void }) => {
    const [messages, setMessages] = useState<{id: string, sender: string, text: string}[]>([]);
    const [inputText, setInputText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsubscribe = api.chat.subscribe(job.id, (msgs) => setMessages(msgs));
        return () => unsubscribe();
    }, [job.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputText.trim()) return;

        await api.chat.sendMessage(job.id, 'mechanic', inputText);
        setInputText('');
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[600px] animate-scale-up">
                <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold border border-slate-600">
                            {job.customerName[0]}
                        </div>
                        <div>
                            <h3 className="font-bold">{job.customerName}</h3>
                            <p className="text-xs text-slate-400">{job.vehicle}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
                </div>
                <div className="flex-1 bg-slate-50 p-4 overflow-y-auto space-y-4">
                    {messages.map(m => (
                        <div key={m.id} className={`flex ${m.sender === 'mechanic' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${m.sender === 'mechanic' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}`}>
                                {m.text}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-3 bg-white border-t border-slate-100 flex gap-2 relative">
                    <input 
                        className="flex-1 bg-slate-100 rounded-xl pl-4 pr-10 py-3 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                        placeholder="Message customer..."
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                    />
                    <button onClick={startDictation} className={`absolute right-16 top-5 ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}><Mic size={18}/></button>
                    <button onClick={() => handleSend()} className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-500 shadow-md"><Send size={20}/></button>
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

    const subtotal = job.payout; 
    const parts = details.partsCost || 0;
    const total = subtotal + parts;
    const fee = subtotal * 0.20; 
    const net = total - fee;

    if (step === 1) return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 animate-scale-up max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">Complete Job</h2>
                    <button onClick={onClose}><X size={24} className="text-slate-400 hover:text-slate-600"/></button>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-blue-900 flex items-center gap-2"><Sparkles size={16}/> AI Auto-Fill</h3>
                        <button onClick={handleAiAnalyze} disabled={aiLoading} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm">
                            {aiLoading ? <Loader2 className="animate-spin" size={14}/> : 'Generate'}
                        </button>
                    </div>
                    <p className="text-xs text-blue-700">Generate service description based on vehicle issue.</p>
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
                            <input 
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                placeholder="e.g. Brake Pads"
                                value={details.parts}
                                onChange={e => setDetails({...details, parts: e.target.value})}
                            />
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
                                placeholder="Recommendations for customer..."
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
                    className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold mt-6 hover:bg-slate-800 disabled:opacity-50 shadow-xl"
                >
                    Next: Collect Payment
                </button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 animate-scale-up">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">Payment Summary</h2>
                    <button onClick={() => setStep(1)} className="text-sm text-slate-500 font-bold hover:text-slate-800">Back</button>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-6 space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500 font-medium">Labor Earnings</span>
                        <span className="font-bold text-slate-900">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500 font-medium">Parts Reimbursement</span>
                        <span className="font-bold text-slate-900">${parts.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-red-500">
                        <span className="font-medium">Platform Fee (20%)</span>
                        <span className="font-bold">-${fee.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-3 flex justify-between text-xl font-bold text-slate-900">
                        <span>Net Payout</span>
                        <span className="text-green-600">${net.toFixed(2)}</span>
                    </div>
                </div>

                <div className="space-y-3 mb-6">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Collection Method</label>
                    
                    <button 
                        onClick={() => setPaymentMethod('CARD')}
                        className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${paymentMethod === 'CARD' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:bg-gray-50'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm"><CreditCard className="text-blue-600" size={20} /></div>
                            <div className="text-left">
                                <p className={`font-bold text-sm ${paymentMethod === 'CARD' ? 'text-blue-900' : 'text-slate-700'}`}>Charge Card on File</p>
                                <p className="text-xs text-slate-500">Secured via Stripe Connect</p>
                            </div>
                        </div>
                        {paymentMethod === 'CARD' && <CheckCircle size={20} className="text-blue-600"/>}
                    </button>

                    <button 
                        onClick={() => setPaymentMethod('CASH')}
                        className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${paymentMethod === 'CASH' ? 'border-green-600 bg-green-50' : 'border-slate-200 hover:bg-gray-50'}`}
                    >
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm"><Banknote className="text-green-600" size={20} /></div>
                            <div className="text-left">
                                <p className={`font-bold text-sm ${paymentMethod === 'CASH' ? 'text-green-900' : 'text-slate-700'}`}>Cash / External</p>
                                <p className="text-xs text-slate-500">Zelle, Venmo, Cash</p>
                            </div>
                        </div>
                        {paymentMethod === 'CASH' && <CheckCircle size={20} className="text-green-600"/>}
                    </button>
                </div>

                <button 
                    onClick={() => onComplete(details, paymentMethod)} 
                    className="w-full bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-500 shadow-xl shadow-green-200"
                >
                    Confirm & Finish Job
                </button>
            </div>
        </div>
    );
};

export const MechanicDashboard: React.FC = () => {
  const { user, notify, isLoading: appLoading, logout } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'requests' | 'map' | 'earnings' | 'history' | 'profile'>('requests');
  const [isOnline, setIsOnline] = useState(false);
  const [requests, setRequests] = useState<JobRequest[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [stats, setStats] = useState({ 
      earnings: { today: 0, week: 0, month: 0 },
      isOnline: false,
      stripeConnected: false
  });

  const [isLoading, setIsLoading] = useState(true);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  
  // Handle Stripe OAuth Return
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
         window.history.replaceState({}, document.title, window.location.pathname);
         notify('Processing', 'Linking Stripe Account...');
         api.mechanic.onboardStripe(code)
            .then(() => {
                notify('Success', 'Stripe account connected!');
                setStats(prev => ({ ...prev, stripeConnected: true }));
            })
            .catch(err => notify('Error', 'Failed to link Stripe account.'));
    }
  }, []);

  useEffect(() => {
    if (user?.isMechanic) {
        initDashboard();
        if (navigator.geolocation) {
            const watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    if (activeJobId && isOnline) api.mechanic.updateLocation(activeJobId, pos.coords.latitude, pos.coords.longitude);
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
      } catch (e) { console.error(e); } 
      finally { setIsLoading(false); }

      return api.mechanic.subscribeToDashboard((data) => setRequests(data.requests));
  };

  const toggleOnline = async () => {
      const newState = !isOnline;
      setIsOnline(newState);
      await api.mechanic.updateStatus(newState);
      if(newState) notify("You are Online", "Ready to receive job requests.");
  };

  const handleJobAction = async (job: JobRequest, action: 'ACCEPT' | 'DECLINE' | 'ARRIVE' | 'START') => {
      let status: any = job.status;
      if (action === 'ACCEPT') status = 'ACCEPTED';
      if (action === 'DECLINE') {
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
          if (method === 'CARD' && job.paymentIntentId) {
             await api.payment.capture(job.id, (job.payout + (details.partsCost || 0)) * 1.25);
          }

          await api.mechanic.updateJobRequest({
              ...job,
              status: 'COMPLETED',
              completionDetails: { ...details, collectedPaymentMethod: method },
              paymentStatus: method === 'CARD' ? 'CAPTURED' : 'PENDING'
          });

          const payout = job.payout; 
          await api.mechanic.updateEarnings(payout);

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
      } catch(e) { notify("Error", "Could not initiate Stripe Connect."); }
  };

  const handleCashOut = async () => {
      try {
          if (stats.earnings.week <= 0) return;
          await api.mechanic.payoutToBank(stats.earnings.week);
          notify("Success", "Payout initiated.");
          setStats(prev => ({ ...prev, earnings: { ...prev.earnings, week: 0 } }));
      } catch(e) { notify("Error", "Payout failed."); }
  };

  if (!appLoading && (!user || !user.isMechanic)) return <Navigate to="/" replace />;
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white"><Loader2 className="animate-spin mr-2"/> Loading Partner Dashboard...</div>;

  const activeJob = requests.find(r => r.id === activeJobId) || requests.find(r => ['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(r.status) && r.mechanicId === user?.id);
  if (activeJob && activeJob.id !== activeJobId) setActiveJobId(activeJob.id);
  
  const completedJobs = requests.filter(r => r.status === 'COMPLETED' && r.mechanicId === user?.id);

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden pt-[env(safe-area-inset-top)]">
        
        {/* Professional Header */}
        <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center shadow-md z-30">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                    <Briefcase size={20} className="text-white" />
                </div>
                <div>
                   <h1 className="font-bold text-lg leading-none">Partner Dashboard</h1>
                   <p className="text-xs text-slate-400 mt-0.5">{isOnline ? 'Active & Visible' : 'Offline - Not Visible'}</p>
                </div>
            </div>
            
            <button 
                onClick={toggleOnline}
                className={`relative px-1 w-16 h-8 rounded-full transition-colors duration-300 ${isOnline ? 'bg-green-500' : 'bg-slate-700'}`}
            >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 flex items-center justify-center ${isOnline ? 'left-[calc(100%-1.75rem)]' : 'left-1'}`}>
                    <Power size={14} className={isOnline ? 'text-green-600' : 'text-slate-600'} />
                </div>
            </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative overflow-hidden flex flex-col md:flex-row">
            
            {/* Map Background */}
            <div className={`absolute inset-0 z-0 ${activeTab === 'map' ? 'block' : 'hidden md:block'}`}>
                <DashboardMap 
                    requests={requests.filter(r => r.status === 'NEW' || r.mechanicId === user?.id)} 
                    activeId={activeJobId} 
                    onSelect={(id) => { setActiveJobId(id); setActiveTab('requests'); }}
                    mechanicLocation={location}
                />
            </div>

            {/* Main Interactive Panel */}
            <div className={`relative z-10 w-full md:w-[480px] h-full bg-slate-50 md:shadow-2xl flex flex-col transition-all duration-300 ${activeTab === 'map' ? 'translate-y-[85%] md:translate-y-0 opacity-90 md:opacity-100 hover:translate-y-0' : ''}`}>
                
                {/* Mobile Handle for Map Mode */}
                <div className="md:hidden w-full flex justify-center pt-2 pb-1" onClick={() => setActiveTab('requests')}>
                    <div className="w-12 h-1.5 bg-slate-300 rounded-full"></div>
                </div>

                {/* Active Job Card */}
                {activeJob && activeTab !== 'earnings' && activeTab !== 'profile' && activeTab !== 'history' && (
                     <div className="bg-white mx-4 mt-2 mb-4 rounded-2xl shadow-xl border border-blue-100 overflow-hidden animate-slide-up relative">
                        <div className="bg-blue-600 h-1.5 w-full"></div>
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center font-bold text-lg text-slate-700">
                                        {activeJob.customerName[0]}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-lg">{activeJob.customerName}</h3>
                                        <p className="text-sm text-slate-500">{activeJob.vehicle}</p>
                                    </div>
                                </div>
                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold shadow-sm">{activeJob.status}</span>
                            </div>
                            
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
                                <p className="text-sm font-medium text-slate-800 flex gap-2"><Wrench size={16} className="text-slate-400"/> {activeJob.issue}</p>
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                                {activeJob.status === 'ACCEPTED' && (
                                    <button onClick={() => handleJobAction(activeJob, 'ARRIVE')} className="col-span-2 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 shadow-lg">
                                        Arrived
                                    </button>
                                )}
                                {activeJob.status === 'ARRIVED' && (
                                    <button onClick={() => handleJobAction(activeJob, 'START')} className="col-span-2 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 shadow-lg">
                                        Start Work
                                    </button>
                                )}
                                {activeJob.status === 'IN_PROGRESS' && (
                                    <button onClick={() => setShowComplete(true)} className="col-span-2 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-500 shadow-lg">
                                        Complete
                                    </button>
                                )}
                                <button onClick={() => setShowChat(true)} className="bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-100 border border-blue-200"><MessageSquare size={24}/></button>
                                <a href={`tel:5555555555`} className="bg-green-50 text-green-600 rounded-xl flex items-center justify-center hover:bg-green-100 border border-green-200"><Phone size={24}/></a>
                            </div>
                        </div>
                     </div>
                )}

                {/* Main List Content */}
                <div className="flex-1 overflow-y-auto pb-24 px-4 custom-scrollbar">
                    
                    {activeTab === 'requests' && (
                        <div className="space-y-4 pt-2">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="font-bold text-slate-900 text-lg">Job Feed</h2>
                                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{requests.filter(r => r.status === 'NEW').length}</span>
                            </div>

                            {requests.filter(r => r.status === 'NEW').length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-20 h-20 bg-slate-200/50 rounded-full flex items-center justify-center mb-4 relative">
                                        <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-50"></div>
                                        <Wrench size={32} className="text-slate-400 relative z-10" />
                                    </div>
                                    <h3 className="font-bold text-slate-700 text-lg">Scanning for Jobs...</h3>
                                    <p className="text-slate-500 text-sm max-w-xs mt-1">
                                        {isOnline ? "Stay tight! We'll notify you when a customer nearby needs help." : "You are currently offline. Go online to receive requests."}
                                    </p>
                                </div>
                            ) : (
                                requests.filter(r => r.status === 'NEW').map(req => (
                                    <div key={req.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-slate-900 text-lg">{req.vehicle}</span>
                                                    {req.urgency === 'HIGH' && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold flex items-center gap-1"><Clock size={10}/> URGENT</span>}
                                                </div>
                                                <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin size={12}/> {req.distance} • 15 min away</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-green-600 text-xl">${req.payout.toFixed(0)}</div>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold">Payout</p>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-50 p-3 rounded-xl mb-4 border border-slate-100">
                                            <p className="text-sm text-slate-700 leading-relaxed font-medium">"{req.issue}"</p>
                                        </div>

                                        <div className="flex gap-3">
                                            <button onClick={() => handleJobAction(req, 'DECLINE')} className="flex-1 py-3 bg-white border border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition-colors">Decline</button>
                                            <button onClick={() => handleJobAction(req, 'ACCEPT')} className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 shadow-lg shadow-blue-200 transition-colors flex items-center justify-center gap-2">
                                                Accept Job <ArrowRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'earnings' && (
                        <div className="space-y-6 pt-2">
                            <h2 className="font-bold text-slate-900 text-lg">Financials</h2>
                            
                            {!stats.stripeConnected ? (
                                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
                                    <div className="relative z-10">
                                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                                            <Banknote size={24} />
                                        </div>
                                        <h3 className="font-bold text-xl mb-2">Activate Payouts</h3>
                                        <p className="text-blue-100 text-sm mb-6 leading-relaxed">Link your bank account via Stripe Connect to receive daily payouts securely.</p>
                                        <button onClick={handleStripeConnect} className="w-full bg-white text-blue-600 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-lg">
                                            Connect Stripe Account
                                        </button>
                                    </div>
                                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                </div>
                            ) : (
                                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
                                    <p className="text-slate-400 text-sm font-medium mb-1 flex items-center gap-2"><Wallet size={14}/> Balance Available</p>
                                    <h3 className="text-4xl font-bold mb-6 tracking-tight">${stats.earnings.week.toFixed(2)}</h3>
                                    <button 
                                        onClick={handleCashOut}
                                        disabled={stats.earnings.week <= 0}
                                        className="w-full bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-400 disabled:opacity-50 disabled:bg-slate-700 transition-colors shadow-lg shadow-green-900/20"
                                    >
                                        Cash Out Now
                                    </button>
                                </div>
                            )}

                            {/* Simulated Chart */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-end mb-4">
                                    <h3 className="font-bold text-slate-800">Weekly Performance</h3>
                                    <span className="text-green-600 text-sm font-bold flex items-center gap-1"><TrendingUp size={14}/> +15%</span>
                                </div>
                                <div className="flex items-end justify-between gap-2 h-32">
                                    {[45, 60, 35, 80, 50, 90, 65].map((h, i) => (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                            <div className="w-full bg-slate-100 rounded-t-lg relative overflow-hidden h-full group-hover:bg-slate-200 transition-colors">
                                                <div className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-t-lg transition-all duration-1000" style={{ height: `${h}%` }}></div>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{['M','T','W','T','F','S','S'][i]}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="space-y-4 pt-2">
                            <h2 className="font-bold text-slate-900 text-lg">Work History</h2>
                            {completedJobs.length === 0 ? (
                                <p className="text-slate-400 text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200">No completed jobs yet.</p>
                            ) : (
                                completedJobs.map(job => (
                                    <div key={job.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex justify-between items-center shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                                                <CheckCircle size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900">{job.vehicle}</h4>
                                                <p className="text-xs text-slate-500">{new Date().toLocaleDateString()} • {job.issue}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="block font-bold text-slate-900">+${(job.payout * 0.8).toFixed(2)}</span>
                                            <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-bold">PAID</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'profile' && (
                         <div className="space-y-6 pt-2">
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
                                <img src={user?.avatar} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-slate-50 shadow-md" />
                                <h2 className="text-2xl font-bold text-slate-900">{user?.name}</h2>
                                <p className="text-blue-600 font-medium text-sm flex items-center justify-center gap-1 mb-6"><ShieldCheck size={14}/> Verified Partner</p>
                                
                                <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-6">
                                    <div>
                                        <div className="text-xl font-bold text-slate-900">4.9</div>
                                        <div className="text-[10px] text-slate-400 uppercase font-bold">Rating</div>
                                    </div>
                                    <div>
                                        <div className="text-xl font-bold text-slate-900">{completedJobs.length}</div>
                                        <div className="text-[10px] text-slate-400 uppercase font-bold">Jobs</div>
                                    </div>
                                    <div>
                                        <div className="text-xl font-bold text-slate-900">100%</div>
                                        <div className="text-[10px] text-slate-400 uppercase font-bold">Rate</div>
                                    </div>
                                </div>
                            </div>

                            {/* Mode Switching - Prominent Button */}
                            <button 
                                onClick={() => navigate('/')}
                                className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg flex items-center justify-center gap-2"
                            >
                                <User size={18} /> Switch to Customer App
                            </button>

                            <div className="space-y-3">
                                <button className="w-full bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3 font-bold text-slate-700">
                                        <Settings size={20} className="text-slate-400"/> Account Settings
                                    </div>
                                    <ChevronRight size={16} className="text-slate-400"/>
                                </button>
                                <button className="w-full bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3 font-bold text-slate-700">
                                        <FileText size={20} className="text-slate-400"/> Insurance Documents
                                    </div>
                                    <ChevronRight size={16} className="text-slate-400"/>
                                </button>
                            </div>
                             
                            <button 
                                onClick={logout}
                                className="w-full py-4 text-red-500 font-bold bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <LogOut size={18}/> Sign Out
                            </button>
                         </div>
                    )}
                </div>
            </div>
        </div>

        {/* Bottom Tab Bar (Mobile Only) */}
        <div className="md:hidden bg-white border-t border-slate-200 px-6 py-2 flex justify-between items-center z-30 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <button onClick={() => setActiveTab('requests')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'requests' ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}>
                <ClipboardList size={24} strokeWidth={activeTab === 'requests' ? 2.5 : 2} />
                <span className="text-[10px] font-bold">Jobs</span>
            </button>
            <button onClick={() => setActiveTab('map')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'map' ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}>
                <MapIcon size={24} strokeWidth={activeTab === 'map' ? 2.5 : 2} />
                <span className="text-[10px] font-bold">Map</span>
            </button>
             <button onClick={() => setActiveTab('earnings')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'earnings' ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}>
                <Wallet size={24} strokeWidth={activeTab === 'earnings' ? 2.5 : 2} />
                <span className="text-[10px] font-bold">Earn</span>
            </button>
            <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'profile' ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}>
                <User size={24} strokeWidth={activeTab === 'profile' ? 2.5 : 2} />
                <span className="text-[10px] font-bold">Me</span>
            </button>
        </div>

        {/* Modals */}
        {showChat && activeJob && <JobChat job={activeJob} onClose={() => setShowChat(false)} />}
        {showComplete && activeJob && <CompletionModal job={activeJob} onClose={() => setShowComplete(false)} onComplete={handleCompleteJob} />}

    </div>
  );
};
