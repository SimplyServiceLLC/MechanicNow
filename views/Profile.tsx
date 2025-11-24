import React, { useState, useEffect } from 'react';
import { useApp } from '../App';
import { Car, Plus, Calendar, Wrench, User, Trash2, Mic, Cloud, Server, Wifi, Edit2, X } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { Vehicle } from '../types';
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

export const Profile: React.FC = () => {
  const { user, addVehicle, updateVehicle, removeVehicle } = useApp();
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  
  const [newVehicle, setNewVehicle] = useState<Vehicle>({ 
      year: '2020', make: 'Toyota', model: 'Camry', vin: '', trim: '', engine: '', mileage: '' 
  });
  
  const [serverStatus, setServerStatus] = useState({ mode: 'MOCK', provider: 'Local Storage' });

  useEffect(() => {
      const status = api.status.getConnectionInfo();
      setServerStatus(status);
  }, []);

  if (!user) return <Navigate to="/login" />;

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    addVehicle(newVehicle);
    setIsAddingVehicle(false);
    setNewVehicle({ year: '2020', make: 'Toyota', model: 'Camry', vin: '', trim: '', engine: '', mileage: '' });
  };

  const handleUpdateVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVehicle) {
        updateVehicle(editingVehicle);
        setEditingVehicle(null);
    }
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
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-6 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
           <img src={user.avatar} alt={user.name} className="w-24 h-24 rounded-full border-4 border-blue-50" />
           <div className="flex-1">
             <div className="flex justify-between items-start">
                 <div>
                    <h1 className="text-3xl font-bold text-slate-900">{user.name}</h1>
                    <p className="text-slate-500">{user.email}</p>
                 </div>
                 {/* Cloud Status Badge */}
                 <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border ${serverStatus.mode === 'REAL' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                     {serverStatus.mode === 'REAL' ? <Cloud size={14} /> : <Server size={14} />}
                     <span>{serverStatus.provider}</span>
                     <div className={`w-2 h-2 rounded-full ${serverStatus.mode === 'REAL' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></div>
                 </div>
             </div>

             <div className="flex gap-4 mt-4">
                <div className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">
                    {user.vehicles.length} Vehicles
                </div>
                <div className="text-sm bg-green-50 text-green-700 px-3 py-1 rounded-full font-medium">
                    {user.history.length} Services Completed
                </div>
             </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Garage Section */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex justify-between items-center">
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
                    <div className="bg-white p-6 rounded-2xl border border-blue-200 shadow-sm animate-fade-in">
                        <h3 className="font-semibold mb-4">Add New Vehicle</h3>
                        <form onSubmit={handleAddVehicle} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Year</label>
                                <select 
                                    className="w-full p-2 border rounded-lg bg-gray-50 text-slate-900"
                                    value={newVehicle.year} 
                                    onChange={e => setNewVehicle({...newVehicle, year: e.target.value})}
                                >
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

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Trim (Optional)</label>
                                <input 
                                    placeholder="e.g. LE, XLE" 
                                    className="w-full p-2 border border-slate-200 rounded-lg bg-gray-50 text-slate-900 placeholder:text-slate-400"
                                    value={newVehicle.trim || ''}
                                    onChange={e => setNewVehicle({...newVehicle, trim: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Engine (Optional)</label>
                                <input 
                                    placeholder="e.g. V6" 
                                    className="w-full p-2 border border-slate-200 rounded-lg bg-gray-50 text-slate-900 placeholder:text-slate-400"
                                    value={newVehicle.engine || ''}
                                    onChange={e => setNewVehicle({...newVehicle, engine: e.target.value})}
                                />
                            </div>

                             <div className="relative md:col-span-2">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Current Mileage</label>
                                <input 
                                    type="number"
                                    placeholder="e.g. 45000" 
                                    className="w-full p-2 pr-10 border border-slate-200 rounded-lg bg-gray-50 text-slate-900 placeholder:text-slate-400"
                                    value={newVehicle.mileage || ''}
                                    onChange={e => setNewVehicle({...newVehicle, mileage: e.target.value})}
                                />
                                <span className="absolute right-4 top-8 text-slate-400 text-xs">mi</span>
                            </div>

                            <div className="relative md:col-span-2">
                                <label className="block text-xs font-medium text-slate-500 mb-1">VIN (Optional)</label>
                                <input 
                                    placeholder="Vehicle Identification Number" 
                                    className="w-full p-2 pr-10 border border-slate-200 rounded-lg uppercase bg-gray-50 text-slate-900 placeholder:text-slate-400"
                                    value={newVehicle.vin}
                                    onChange={e => setNewVehicle({...newVehicle, vin: e.target.value})}
                                />
                                <button 
                                    type="button"
                                    onClick={() => startDictation((text) => setNewVehicle({...newVehicle, vin: text.toUpperCase().replace(/\s/g, '')}))}
                                    className="absolute right-2 top-8 text-slate-400 hover:text-blue-600"
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
            </div>

            {/* History Section */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Calendar size={20} /> Service History
                </h2>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {user.history.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                            <Wrench className="mx-auto mb-3 opacity-20" size={48} />
                            <p>No services yet.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {user.history.map(record => (
                                <div key={record.id} className="p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-medium text-slate-500">{new Date(record.date).toLocaleDateString()}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${record.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {record.status}
                                        </span>
                                    </div>
                                    <h4 className="font-semibold text-slate-800">{record.services.map(s => s.name).join(', ')}</h4>
                                    <div className="flex justify-between items-center mt-2">
                                        <p className="text-xs text-slate-500">{record.vehicle.year} {record.vehicle.model}</p>
                                        <p className="font-bold text-slate-900">${record.total.toFixed(2)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* Edit Vehicle Modal */}
      {editingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 animate-scale-up border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900">Edit Vehicle</h3>
                    <button onClick={() => setEditingVehicle(null)} className="p-2 hover:bg-gray-100 rounded-full text-slate-500 hover:text-slate-800"><X size={20} /></button>
                </div>
                
                <form onSubmit={handleUpdateVehicle} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Year</label>
                        <select 
                            className="w-full p-2 border border-slate-200 rounded-lg bg-gray-50 text-slate-900"
                            value={editingVehicle.year} 
                            onChange={e => setEditingVehicle({...editingVehicle, year: e.target.value})}
                        >
                            {VEHICLE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Make</label>
                        <select 
                            className="w-full p-2 border border-slate-200 rounded-lg bg-gray-50 text-slate-900"
                            value={editingVehicle.make} 
                            onChange={e => setEditingVehicle({...editingVehicle, make: e.target.value})}
                        >
                            {VEHICLE_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    
                    <div className="relative md:col-span-2">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Model</label>
                        <input 
                            placeholder="e.g. Camry, F-150" 
                            className="w-full p-2 pr-10 border border-slate-200 rounded-lg bg-gray-50 text-slate-900 placeholder:text-slate-400"
                            value={editingVehicle.model}
                            onChange={e => setEditingVehicle({...editingVehicle, model: e.target.value})}
                            required
                        />
                        <button 
                            type="button"
                            onClick={() => startDictation((text) => setEditingVehicle({...editingVehicle, model: text}))}
                            className="absolute right-2 top-6 text-slate-400 hover:text-blue-600"
                        >
                            <Mic size={18} />
                        </button>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Trim (Optional)</label>
                        <input 
                            placeholder="e.g. LE, XLE" 
                            className="w-full p-2 border border-slate-200 rounded-lg bg-gray-50 text-slate-900 placeholder:text-slate-400"
                            value={editingVehicle.trim || ''}
                            onChange={e => setEditingVehicle({...editingVehicle, trim: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Engine (Optional)</label>
                        <input 
                            placeholder="e.g. V6" 
                            className="w-full p-2 border border-slate-200 rounded-lg bg-gray-50 text-slate-900 placeholder:text-slate-400"
                            value={editingVehicle.engine || ''}
                            onChange={e => setEditingVehicle({...editingVehicle, engine: e.target.value})}
                        />
                    </div>

                    <div className="relative md:col-span-2">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Current Mileage</label>
                        <input 
                            type="number"
                            placeholder="e.g. 45000" 
                            className="w-full p-2 pr-10 border border-slate-200 rounded-lg bg-gray-50 text-slate-900 placeholder:text-slate-400"
                            value={editingVehicle.mileage || ''}
                            onChange={e => setEditingVehicle({...editingVehicle, mileage: e.target.value})}
                        />
                        <span className="absolute right-4 top-8 text-slate-400 text-xs">mi</span>
                    </div>

                    <div className="relative md:col-span-2">
                        <label className="block text-xs font-medium text-slate-500 mb-1">VIN (Optional)</label>
                        <input 
                            placeholder="Vehicle Identification Number" 
                            className="w-full p-2 pr-10 border border-slate-200 rounded-lg uppercase bg-gray-50 text-slate-900 placeholder:text-slate-400"
                            value={editingVehicle.vin || ''}
                            onChange={e => setEditingVehicle({...editingVehicle, vin: e.target.value})}
                        />
                        <button 
                            type="button"
                            onClick={() => startDictation((text) => setEditingVehicle({...editingVehicle, vin: text.toUpperCase().replace(/\s/g, '')}))}
                            className="absolute right-2 top-8 text-slate-400 hover:text-blue-600"
                        >
                            <Mic size={18} />
                        </button>
                    </div>

                    <div className="md:col-span-2 flex gap-3 pt-4">
                        <button 
                            type="button" 
                            onClick={() => setEditingVehicle(null)} 
                            className="flex-1 py-3 bg-gray-100 text-slate-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 shadow-md shadow-blue-200 transition-colors"
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};