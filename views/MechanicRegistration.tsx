
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { Wrench, User, Mail, Lock, Phone as PhoneIcon, Upload, CheckCircle, ChevronRight, ArrowLeft, ShieldCheck, MapPin, Briefcase, Award, Loader2, FileText, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { MechanicRegistrationData } from '../types';

// Extended Vehicle Data (Make -> Models) to show capability
// For brevity, we just use a sample, but ideally shared with Booking
const VEHICLE_DATA_KEYS = ["Toyota", "Honda", "Ford", "Chevrolet", "Nissan", "BMW", "Mercedes-Benz", "Audi", "Volkswagen"];

export const MechanicRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { notify } = useApp();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<MechanicRegistrationData>({
    name: '',
    email: '',
    password: '',
    phone: '',
    bio: '',
    yearsExperience: 1,
    specialties: [],
    certifications: [],
    zipCode: ''
  });

  const [ssn, setSsn] = useState(''); // Only for UI demo, do not store plain SSN in real app
  const [agreedToCheck, setAgreedToCheck] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [verificationDocs, setVerificationDocs] = useState({
    license: false,
    insurance: false,
    ase: false
  });
  
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const commonSpecialties = ["Brakes", "Diagnostics", "Engine Repair", "Electrical", "Suspension", "Oil & Fluids", "HVAC", "Hybrid/EV"];
  const commonCerts = ["ASE Master Technician", "ASE A1 Engine Repair", "ASE A5 Brakes", "Hybrid Certified", "Manufacturer Certified (Toyota/Honda/Ford)"];

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const toggleSpecialty = (s: string) => {
      setFormData(prev => ({
          ...prev,
          specialties: prev.specialties.includes(s) 
            ? prev.specialties.filter(item => item !== s)
            : [...prev.specialties, s]
      }));
  };

  const toggleCert = (c: string) => {
      setFormData(prev => ({
          ...prev,
          certifications: prev.certifications.includes(c) 
            ? prev.certifications.filter(item => item !== c)
            : [...prev.certifications, c]
      }));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: 'license' | 'insurance' | 'ase') => {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      
      setUploadingDoc(docType);
      try {
          // Call API (Mock or Real Storage)
          await api.storage.uploadFile(file, `documents/${docType}`);
          setVerificationDocs(prev => ({ ...prev, [docType]: true }));
          notify("Success", `${docType.toUpperCase()} uploaded.`);
      } catch (err) {
          notify("Error", "Upload failed. Try again.");
      } finally {
          setUploadingDoc(null);
      }
  };

  const handleSubmit = async () => {
      if (!formData.name || !formData.email || !formData.password) {
          notify("Missing Info", "Please complete all account fields.");
          return;
      }
      
      setIsSubmitting(true);
      try {
          // 1. Create Account
          await api.mechanic.register(formData);
          
          // 2. Trigger Checkr (Simulated)
          await api.mechanic.verifyBackground(formData.email, ssn);
          
          setStep(5); // Success step
      } catch (e: any) {
          console.error(e);
          notify("Registration Failed", e.message || "Could not create account.");
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-10 px-4 flex flex-col items-center">
        {/* Progress Header */}
        <div className="max-w-xl w-full mb-8">
            <div className="flex justify-between mb-2 px-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${step >= 1 ? 'text-blue-600' : 'text-slate-300'}`}>Account</span>
                <span className={`text-xs font-bold uppercase tracking-wider ${step >= 2 ? 'text-blue-600' : 'text-slate-300'}`}>Profile</span>
                <span className={`text-xs font-bold uppercase tracking-wider ${step >= 3 ? 'text-blue-600' : 'text-slate-300'}`}>Skills</span>
                <span className={`text-xs font-bold uppercase tracking-wider ${step >= 4 ? 'text-blue-600' : 'text-slate-300'}`}>Verify</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-blue-600 transition-all duration-500 ease-in-out" 
                    style={{ width: `${(step / 4) * 100}%` }}
                ></div>
            </div>
        </div>

        <div className="bg-white max-w-xl w-full rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative">
            {step === 1 && (
                <div className="p-8 animate-fade-in">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Wrench size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">Partner Registration</h1>
                        <p className="text-slate-500">Join the network and earn up to $50/hr.</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-slate-400" size={20} />
                                <input 
                                    className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Legal Name"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-slate-400" size={20} />
                                <input 
                                    type="email"
                                    className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="mechanic@example.com"
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
                                <input 
                                    type="password"
                                    className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Create a password"
                                    value={formData.password}
                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Phone Number</label>
                            <div className="relative">
                                <PhoneIcon className="absolute left-3 top-3 text-slate-400" size={20} />
                                <input 
                                    type="tel"
                                    className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="(555) 555-5555"
                                    value={formData.phone}
                                    onChange={e => setFormData({...formData, phone: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>
                    
                    <button onClick={handleNext} className="w-full mt-8 bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-500 transition-colors flex items-center justify-center gap-2">
                        Next Step <ChevronRight size={20} />
                    </button>
                    
                    <div className="mt-4 text-center">
                        <button onClick={() => navigate('/login')} className="text-sm text-slate-500 hover:text-blue-600">Already have an account? Sign In</button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="p-8 animate-fade-in">
                    <button onClick={handleBack} className="mb-4 text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm font-medium"><ArrowLeft size={16}/> Back</button>
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Profile Details</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Bio / Introduction</label>
                            <textarea 
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                                placeholder="Tell customers about your experience and why they should hire you."
                                value={formData.bio}
                                onChange={e => setFormData({...formData, bio: e.target.value})}
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Experience (Years)</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-3 text-slate-400" size={20} />
                                    <input 
                                        type="number"
                                        min="1"
                                        className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.yearsExperience}
                                        onChange={e => setFormData({...formData, yearsExperience: parseInt(e.target.value) || 0})}
                                    />
                                </div>
                            </div>
                             <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Service Zip Code</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 text-slate-400" size={20} />
                                    <input 
                                        type="text"
                                        className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="90210"
                                        value={formData.zipCode}
                                        onChange={e => setFormData({...formData, zipCode: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <button onClick={handleNext} className="w-full mt-8 bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-500 transition-colors flex items-center justify-center gap-2">
                        Next Step <ChevronRight size={20} />
                    </button>
                </div>
            )}

            {step === 3 && (
                <div className="p-8 animate-fade-in">
                    <button onClick={handleBack} className="mb-4 text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm font-medium"><ArrowLeft size={16}/> Back</button>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Skills & Qualifications</h2>
                    <p className="text-slate-500 mb-6 text-sm">Select your areas of expertise.</p>

                    <div className="mb-6">
                        <label className="block text-sm font-bold text-slate-700 mb-3">Specialties</label>
                        <div className="flex flex-wrap gap-2">
                            {commonSpecialties.map(spec => (
                                <button 
                                    key={spec}
                                    onClick={() => toggleSpecialty(spec)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                        formData.specialties.includes(spec) 
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {spec}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {/* Vehicle Specialization Multi-Select */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-slate-700 mb-3">Vehicle Expertise</label>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-slate-100 rounded-xl">
                            {VEHICLE_DATA_KEYS.map(make => (
                                <button 
                                    key={make}
                                    className={`px-3 py-1 rounded border text-xs font-medium transition-all bg-slate-50 text-slate-600 hover:bg-slate-200`}
                                    onClick={() => { /* Could add vehicle spec state here */ }}
                                >
                                    {make}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Select Makes you are comfortable servicing.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">Certifications</label>
                        <div className="space-y-2">
                            {commonCerts.map(cert => (
                                <div 
                                    key={cert} 
                                    onClick={() => toggleCert(cert)}
                                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${
                                        formData.certifications.includes(cert)
                                        ? 'bg-blue-50 border-blue-500'
                                        : 'bg-white border-slate-200 hover:border-blue-300'
                                    }`}
                                >
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${formData.certifications.includes(cert) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                                        {formData.certifications.includes(cert) && <CheckCircle size={14} className="text-white" />}
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">{cert}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button onClick={handleNext} className="w-full mt-8 bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-500 transition-colors flex items-center justify-center gap-2">
                        Next Step <ChevronRight size={20} />
                    </button>
                </div>
            )}

            {step === 4 && (
                <div className="p-8 animate-fade-in">
                    <button onClick={handleBack} className="mb-4 text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm font-medium"><ArrowLeft size={16}/> Back</button>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Trust & Safety</h2>
                    <p className="text-slate-500 mb-6 text-sm">We need to verify your identity and insurance.</p>

                    <div className="space-y-4 mb-6">
                        <div className="p-4 border border-dashed border-slate-300 rounded-xl bg-slate-50 relative">
                            <input 
                                type="file" 
                                accept="image/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                onChange={(e) => handleUpload(e, 'license')}
                                disabled={!!verificationDocs.license}
                            />
                            <div className="flex justify-between items-center mb-2 pointer-events-none">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg shadow-sm text-slate-500"><ShieldCheck size={20} /></div>
                                    <span className="font-bold text-slate-700 text-sm">Driver's License</span>
                                </div>
                                {verificationDocs.license ? <span className="text-green-600 text-xs font-bold bg-green-100 px-2 py-1 rounded">Uploaded</span> : <span className="text-amber-600 text-xs font-bold bg-amber-100 px-2 py-1 rounded">Required</span>}
                            </div>
                            <button 
                                className="w-full py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg pointer-events-none flex justify-center items-center gap-2"
                            >
                                {uploadingDoc === 'license' ? <Loader2 className="animate-spin" size={16}/> : verificationDocs.license ? <CheckCircle size={16} /> : <Upload size={16} />} 
                                {uploadingDoc === 'license' ? "Uploading..." : verificationDocs.license ? "File Received" : "Tap to Upload Photo"}
                            </button>
                        </div>

                         <div className="p-4 border border-dashed border-slate-300 rounded-xl bg-slate-50 relative">
                            <input 
                                type="file" 
                                accept="image/*,.pdf"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                onChange={(e) => handleUpload(e, 'insurance')}
                                disabled={!!verificationDocs.insurance}
                            />
                            <div className="flex justify-between items-center mb-2 pointer-events-none">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg shadow-sm text-slate-500"><FileText size={20} /></div>
                                    <span className="font-bold text-slate-700 text-sm">Liability Insurance</span>
                                </div>
                                {verificationDocs.insurance ? <span className="text-green-600 text-xs font-bold bg-green-100 px-2 py-1 rounded">Uploaded</span> : <span className="text-amber-600 text-xs font-bold bg-amber-100 px-2 py-1 rounded">Required</span>}
                            </div>
                            <button 
                                className="w-full py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg pointer-events-none flex justify-center items-center gap-2"
                            >
                                {uploadingDoc === 'insurance' ? <Loader2 className="animate-spin" size={16}/> : verificationDocs.insurance ? <CheckCircle size={16} /> : <Upload size={16} />} 
                                {uploadingDoc === 'insurance' ? "Uploading..." : verificationDocs.insurance ? "File Received" : "Tap to Upload Policy PDF"}
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6 mb-6">
                        <h3 className="font-bold text-slate-900 mb-3 text-sm">Background Check Authorization</h3>
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                            <p className="text-xs text-blue-800 leading-relaxed">
                                We use <strong>Checkr</strong> to perform background checks. By providing your SSN, you authorize MechanicNow to obtain consumer reports about you.
                            </p>
                        </div>
                        
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Social Security Number</label>
                            <input 
                                type="password"
                                placeholder="XXX-XX-XXXX"
                                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm"
                                value={ssn}
                                onChange={(e) => setSsn(e.target.value)}
                            />
                        </div>

                        <label className="flex items-start gap-3 cursor-pointer mb-3">
                            <input type="checkbox" className="mt-1" checked={agreedToCheck} onChange={e => setAgreedToCheck(e.target.checked)} />
                            <span className="text-xs text-slate-600">I agree to the <a href="#" className="text-blue-600 underline">Checkr Terms</a> and authorize a background check.</span>
                        </label>

                         <label className="flex items-start gap-3 cursor-pointer">
                            <input type="checkbox" className="mt-1" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} />
                            <span className="text-xs text-slate-600">I accept the <a href="#/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">MechanicNow Partner Agreement</a> and Liability Waiver.</span>
                        </label>
                    </div>

                    <button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting || !verificationDocs.license || !verificationDocs.insurance || !agreedToCheck || !agreedToTerms || ssn.length < 9}
                        className="w-full bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" /> : "Submit Application"}
                    </button>
                </div>
            )}

            {step === 5 && (
                 <div className="p-12 animate-scale-up text-center">
                    <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={48} />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">Application Received!</h2>
                    <p className="text-slate-500 mb-8">
                        Your profile, background check, and insurance documents are under review. You can access your dashboard to set up payouts via Stripe.
                    </p>
                    <button 
                        onClick={() => navigate('/mechanic-dashboard')}
                        className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-xl"
                    >
                        Go to Dashboard
                    </button>
                 </div>
            )}
        </div>
    </div>
  );
};
