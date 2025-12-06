
import React, { useState, useEffect } from 'react';
import { useApp } from '../App';
import { Car, Plus, Calendar, Wrench, User, Trash2, Mic, Cloud, Server, Wifi, Edit2, X, MapPin, Phone, Mail, Save, CreditCard, Star, CheckCircle } from 'lucide-react';
import { Navigate, useNavigate, useLocation } from '../App';
import { Vehicle, UserProfile, JobRequest } from '../types';
import { api } from '../services/api';

// Comprehensive List of Makes (Shared constant)
const VEHICLE_MAKES = [
  "Acura", "Alfa Romeo", "Audi", "BMW", "Buick", "Cadillac", "Chevrolet", "Chrysler", 
  "Dodge", "Fiat", "Ford", "Genesis", "GMC", "Honda", "Hyundai", "Infiniti", "Jaguar", 
  "Jeep", "Kia", "Land Rover", "Lexus", "Lincoln", "Lucid", "Maserati", "Mazda", 
  "Mercedes-Benz", "Mini", "Mitsubishi", "Nissan", "Polestar", "Porsche", "Ram", 
  "Rivian", "Subaru", "Tesla", "Toyota", "Volkswagen", "Volvo"
];

const currentYear = new Date().getFullYear() + 1;
const VEHICLE_YEARS = Array.from({length: currentYear - 1989}, (_, i) => (currentYear - i).toString());

const ReviewModal = ({ job, onClose }: { job: JobRequest, onClose: () => void }) => {
    const [rating, setRating] = useState(5);
    const [text, setText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { notify } = useApp();

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            if (!job.mechanicId) return;
            await api.reviews.submit(job.mechanicId, job.id, rating, text);
            notify("Review Submitted", "Thank you for your feedback!");
            onClose();
        } catch(e) {
            notify("Error", "Failed to submit review.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 animate-scale-up">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                        <CheckCircle size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Job Complete!</h2>
                    <p className="text-slate-500">How was your service with the mechanic?</p>
                </div>

                <div className="flex justify-center gap-2 mb-6">
                    {[1, 2, 3, 4, 5].map(star => (
                        <button 
                            key={star}
                            onClick={() => setRating(star)}
                            className="transition-transform hover:scale-110 focus:outline-none"
                        >
                            <Star 
                                size={32} 
                                fill={star <= rating ? "#fbbf24" : "none"} 
                                className={star <= rating ? "text-amber-400" : "text-slate-300"} 
                            />
                        </button>
                    ))}
                </div>

                <textarea 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6 h-32 resize-none outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Write a review (optional)..."
                    value={text}
                    onChange={e => setText(e.target.value)}
                />

                <div className="flex gap-3">
                    <button 
                        onClick={onClose} 
                        className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200"
                    >
                        Skip
                    </button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting}
                        className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 shadow-lg shadow-blue-200"
                    >
                        {isSubmitting ? "Submitting..." : "Submit Review"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const Profile: React.FC = () => {
  const { user, addVehicle, updateVehicle, removeVehicle, login } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  const [newVehicle, setNewVehicle] = useState<Vehicle>({ 
      year: '', make: '', model: '', vin: '', trim: '', engine: '', mileage: '' 
  });
  
  const [profileForm, setProfileForm] = useState({
      name: '',
      email: '',
      phone: '',
      address: ''
  });
  
  const [serverStatus, setServerStatus] = useState({ mode: 'MOCK', provider: 'Local Storage' });
  const [reviewJob, setReviewJob] = useState<JobRequest | null>(null);

  useEffect(() => {
      const status = api.status.getConnectionInfo();
      setServerStatus(status);
      if (user) {
          setProfileForm({
              name: user.name,
              email: user.email,
              phone: user.phone || '',
              address: user.address || ''
          });
      }
      
      // Check for pending review passed from navigation
      const state = location.state as { reviewJob?: JobRequest };
      if (state?.reviewJob) {
          setReviewJob(state.reviewJob);
          // Clear state to prevent re-opening on refresh
          window.history.replaceState({}, document.title);
      }
  }, [user, location]);

  if (!user) return <Navigate to="/login" replace />;

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    addVehicle(newVehicle);
    setIsAddingVehicle(false);
    setNewVehicle({ year: '', make: '', model: '', vin: '', trim: '', engine: '', mileage: '' });
  };

  const handleUpdateVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVehicle) {
        updateVehicle(editingVehicle);
        setEditingVehicle(null);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser: UserProfile = {
        ...user,
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
        address: profileForm.address
    };
    await api.auth.updateProfile(updatedUser);
    window.location.reload(); 
    setIsEditingProfile(false);
  };

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

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 bg-gray-50">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Customer Header - Distinct "My Account" Feel */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
           <div className="bg-slate-900 h-24 w-full relative">
               <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-slate-900 opacity-90"></div>
               <div className="absolute bottom-0 left-8 transform translate-y-1/2">
                   <img src={user.avatar} alt={user.name} className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-white" />
               </div>
               {user.isMechanic && (
                   <button 
                    onClick={() => navigate('/mechanic-dashboard')}
                    className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-xs font-bold backdrop-blur-sm flex items-center gap-2 border border-white/20"
                   >
                       <Wrench size={14} /> Switch to Mechanic Mode
                   </button>
               )}
           </div>
           
           <div className="pt-14 pb-8 px-8 flex flex-col md:flex-row justify-between items-start gap-6">
               {isEditingProfile ? (
                   <form onSubmit={handleUpdateProfile} className="w-full max-w-2xl space-y-4 animate-fade-in">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1">Full Name</label>
                               <input 
                                className="w-full p-2 border rounded-lg" 
                                value={profileForm.name} 
                                onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                               />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                               <input 
                                className="w-full p-2 border rounded-lg bg-gray-50" 
                                value={profileForm.email} 
                                disabled
                               />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1">Phone</label>
                               <input 
                                className="w-full p-2 border rounded-lg" 
                                placeholder="(555) 555-5555"
                                value={profileForm.phone} 
                                onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
                               />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1">Home Address</label>
                               <input 
                                className="w-full p-2 border rounded-lg" 
                                placeholder="123 Main St"
                                value={profileForm.address} 
                                onChange={e => setProfileForm({...profileForm, address: e.target.value})}
                               />
                           </div>
                       </div>
                       <div className="flex gap-3">
                           <button type="button" onClick={() => setIsEditingProfile(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-bold text-slate-600">Cancel</button>
                           <button type="submit" className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-bold text-white flex items-center gap-2"><Save size={14}/> Save Changes</button>
                       </div>
                   </form>
               ) : (
                   <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
                            <button onClick={() => setIsEditingProfile(true)} className="text-slate-400 hover:text-blue-600"><Edit2 size={16}/></button>
                        </div>
                        <div className="flex flex-col md:flex-row gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1"><Mail size={14}/> {user.email}</span>
                            <span className="flex items-center gap-1"><Phone size={14}/> {user.phone || 'Add Phone'}</span>
                            <span className="flex items-center gap-1"><MapPin size={14}/> {user.address || 'Add Address'}</span>
                        </div>
                   </div>
               )}
               
               <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border self-start ${serverStatus.mode === 'REAL' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                     {serverStatus.mode === 'REAL' ? <Cloud size={14} /> : <Server size={14} />}
                     <span>{serverStatus.provider}</span>
                     <div className={`w-2 h-2 rounded-full ${serverStatus.mode === 'REAL' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></div>
               </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Garage & Payments */}
            <div className="lg:col-span-2 space-y-8">
                
                {/* Garage Section */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Car size={20} /> My Garage
                        </h2>
                        <button 
                            onClick={() => setIsAddingVehicle(!isAddingVehicle)}
                            className="text-sm text-blue-600 font-medium hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            {isAddingVehicle ? 'Cancel' : '+ Add Vehicle'}
                        </button>
                    </div>

                    {isAddingVehicle && (
                        <div className="bg-white p-6 rounded-2xl border border-blue-200 shadow-sm animate-fade-in mb-6">
                            <h3 className="font-semibold mb-4">Add New Vehicle</h3>
                            <form onSubmit={handleAddVehicle} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Year</label>
                                    <select 
                                        className="w-full p-2 border rounded-lg bg-gray-50 text-slate-900"
                                        value={newVehicle.year} 
                                        onChange={e => setNewVehicle({...newVehicle, year: e.target.value})}
                                    >
                                        <option value="">Select Year</option>
                                        {VEHICLE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Make</label>
                                    <select 
                                        className="w-full p-2 border rounded-lg bg-gray-50 text-slate-900"
                                        value={newVehicle.make} 
                                        onChange={e => setNewVehicle({...newVehicle, make: e.target.value})}
                                    >
                                        <option value="">Select Make</option>
                                        {VEHICLE_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                
                                <div className="relative md:col-span-2">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Model</label>
                                    <input 
                                        placeholder="e.g. Camry, F-150" 
                                        className="w-full p-2 pr-10 border border-slate-200 rounded-lg bg-gray-50 text-slate-900 placeholder:text-slate-400"
                                        value={newVehicle.model}
                                        onChange={e => setNewVehicle({...newVehicle, model: e.target.value})}
                                        required
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => startDictation((text) => setNewVehicle({...newVehicle, model: text}))}
                                        className="absolute right-2 top-6 text-slate-400 hover:text-blue-600"
                                    >
                                        <Mic size={18} />
                                    </button>
                                </div>
                                <button type="submit" className="md:col-span-2 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-500 shadow-md shadow-blue-200">
                                    Save Vehicle
                                </button>
                            </form>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {user.vehicles.map(v => (
                            <div key={v.id} className="bg-white p-6 rounded-2xl border border-slate-100 hover:shadow-md transition-shadow relative group">
                                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-4 text-slate-400">
                                    <Car size={24} />
                                </div>
                                <h3 className="font-bold text-lg text-slate-800">{v.year} {v.make} {v.model}</h3>
                                
                                <div className="mt-2 space-y-1">
                                    {v.trim && <p className="text-xs text-slate-500 font-medium">{v.trim} {v.engine ? `• ${v.engine}` : ''}</p>}
                                    {v.mileage && <p className="text-xs text-slate-500">{parseInt(v.mileage).toLocaleString()} miles</p>}
                                    {v.vin && <p className="text-xs text-slate-400 font-mono mt-1">VIN: {v.vin}</p>}
                                </div>

                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button onClick={() => setEditingVehicle(v)} className="text-slate-300 hover:text-blue-500 p-1 bg-white rounded-full shadow-sm"><Edit2 size={16} /></button>
                                    <button onClick={() => v.id && removeVehicle(v.id)} className="text-slate-300 hover:text-red-500 p-1 bg-white rounded-full shadow-sm"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>