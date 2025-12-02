import React, { useState, useEffect } from 'react';
import { useApp } from '../App';
import { useNavigate, Navigate } from 'react-router-dom';
import { LayoutDashboard, Users, Wrench, FileText, CheckCircle, XCircle, TrendingUp, DollarSign, Activity, Calendar } from 'lucide-react';
import { api } from '../services/api';
import { Mechanic, JobRequest } from '../types';

export const AdminDashboard: React.FC = () => {
  const { user, isLoading: appLoading, notify } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'mechanics' | 'jobs'>('overview');
  const [stats, setStats] = useState({ totalUsers: 0, totalMechanics: 0, totalJobs: 0, completedJobs: 0, totalRevenue: 0 });
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.isAdmin) {
        fetchData();
    }
  }, [user]);

  const fetchData = async () => {
      setIsLoading(true);
      try {
          const [statsData, mechanicsData, jobsData] = await Promise.all([
              api.admin.getStats(),
              api.admin.getAllMechanics(),
              api.admin.getAllJobs()
          ]);
          setStats(statsData);
          setMechanics(mechanicsData);
          setJobs(jobsData);
      } catch (e) {
          notify("Error", "Failed to load admin data.");
      } finally {
          setIsLoading(false);
      }
  };

  const handleApproveMechanic = async (id: string) => {
      try {
          await api.admin.approveMechanic(id);
          notify("Success", "Mechanic Approved.");
          fetchData(); // Refresh list
      } catch(e) {
          notify("Error", "Failed to approve mechanic.");
      }
  };

  if (!appLoading && (!user || !user.isAdmin)) return <Navigate to="/" replace />;

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading Admin Panel...</div>;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden pt-[calc(5rem+env(safe-area-inset-top))]">
        {/* Sidebar */}
        <div className="w-64 bg-slate-900 text-slate-300 flex-shrink-0 flex flex-col justify-between pb-6">
            <div className="p-6">
                <h1 className="text-white font-bold text-xl mb-8 flex items-center gap-2">
                    <LayoutDashboard className="text-blue-500" /> Admin Panel
                </h1>
                <nav className="space-y-2">
                    <button 
                        onClick={() => setActiveTab('overview')}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${activeTab === 'overview' ? 'bg-blue-600 text-white' : 'hover:bg-white/10'}`}
                    >
                        <Activity size={20} /> Overview
                    </button>
                    <button 
                        onClick={() => setActiveTab('mechanics')}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${activeTab === 'mechanics' ? 'bg-blue-600 text-white' : 'hover:bg-white/10'}`}
                    >
                        <Wrench size={20} /> Mechanics
                    </button>
                    <button 
                        onClick={() => setActiveTab('jobs')}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${activeTab === 'jobs' ? 'bg-blue-600 text-white' : 'hover:bg-white/10'}`}
                    >
                        <FileText size={20} /> Bookings
                    </button>
                </nav>
            </div>
            <div className="px-6 text-xs text-slate-500">
                Logged in as {user?.name}
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
            
            {activeTab === 'overview' && (
                <div className="max-w-6xl mx-auto animate-fade-in">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Platform Overview</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><DollarSign size={24} /></div>
                                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">+12%</span>
                            </div>
                            <h3 className="text-3xl font-bold text-slate-900">${stats.totalRevenue.toLocaleString()}</h3>
                            <p className="text-slate-500 text-sm mt-1">Total Platform Revenue</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                             <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Users size={24} /></div>
                            </div>
                            <h3 className="text-3xl font-bold text-slate-900">{stats.totalUsers}</h3>
                            <p className="text-slate-500 text-sm mt-1">Total Customers</p>
                        </div>
                         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                             <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Wrench size={24} /></div>
                            </div>
                            <h3 className="text-3xl font-bold text-slate-900">{stats.totalMechanics}</h3>
                            <p className="text-slate-500 text-sm mt-1">Registered Mechanics</p>
                        </div>
                         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                             <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-green-50 text-green-600 rounded-xl"><CheckCircle size={24} /></div>
                            </div>
                            <h3 className="text-3xl font-bold text-slate-900">{stats.completedJobs} / {stats.totalJobs}</h3>
                            <p className="text-slate-500 text-sm mt-1">Jobs Completed</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-900 mb-4">Recent Mechanics</h3>
                            <div className="space-y-4">
                                {mechanics.slice(0, 5).map(m => (
                                    <div key={m.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-600">
                                                {m.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm">{m.name}</h4>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${m.verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {m.verified ? 'Verified' : 'Pending'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right text-xs text-slate-500">
                                            {m.jobsCompleted} jobs
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setActiveTab('mechanics')} className="w-full mt-4 py-2 text-sm text-blue-600 font-bold hover:bg-blue-50 rounded-lg">View All Mechanics</button>
                        </div>
                        
                         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-900 mb-4">Recent Bookings</h3>
                             <div className="space-y-4">
                                {jobs.slice(0, 5).map(j => (
                                    <div key={j.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors">
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm">{j.vehicle}</h4>
                                            <p className="text-xs text-slate-500">{j.customerName} • {j.issue}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-slate-900 text-sm">${j.payout}</div>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${j.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{j.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setActiveTab('jobs')} className="w-full mt-4 py-2 text-sm text-blue-600 font-bold hover:bg-blue-50 rounded-lg">View All Bookings</button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'mechanics' && (
                <div className="animate-fade-in">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Manage Mechanics</h2>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Name</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Stats</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Joined</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {mechanics.map(m => (
                                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-600">
                                                    {m.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900">{m.name}</div>
                                                    <div className="text-xs text-slate-500 flex gap-2">
                                                        {m.specialties?.slice(0,2).join(', ')}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-slate-600">
                                            {m.jobsCompleted} Jobs • {m.rating} ★
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${m.verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {m.verified ? 'Verified' : 'Pending Review'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-slate-500">
                                            {new Date().toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-right">
                                            {!m.verified && (
                                                <button 
                                                    onClick={() => handleApproveMechanic(m.id)}
                                                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-500 transition-colors shadow-sm"
                                                >
                                                    Approve
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'jobs' && (
                <div className="animate-fade-in">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">All Bookings</h2>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">ID</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Customer</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Vehicle / Issue</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Mechanic</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Payout</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {jobs.map(j => (
                                    <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 text-xs font-mono text-slate-400">
                                            #{j.id.slice(-6)}
                                        </td>
                                        <td className="p-4 text-sm font-bold text-slate-900">
                                            {j.customerName}
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm text-slate-900 font-medium">{j.vehicle}</div>
                                            <div className="text-xs text-slate-500">{j.issue}</div>
                                        </td>
                                        <td className="p-4 text-sm text-slate-600">
                                            {j.mechanicId ? 'Assigned' : 'Unassigned'}
                                        </td>
                                        <td className="p-4 text-sm font-bold text-slate-900">
                                            ${j.payout}
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${
                                                j.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                j.status === 'NEW' ? 'bg-blue-100 text-blue-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                                {j.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};