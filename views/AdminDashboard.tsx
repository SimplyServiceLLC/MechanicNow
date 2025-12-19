
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../App';
import { useNavigate, Navigate } from '../App';
import { LayoutDashboard, Users, Wrench, FileText, CheckCircle, XCircle, TrendingUp, DollarSign, Activity, Calendar, ExternalLink, ShieldCheck, Eye, X, Briefcase, Filter, RotateCcw, ArrowUpDown, ArrowLeft, Star, MessageSquare, Phone, Mail, Search, Clock, MapPin, CreditCard, ChevronRight, Download } from 'lucide-react';
import { api } from '../services/api';
import { Mechanic, JobRequest } from '../types';

export const AdminDashboard: React.FC = () => {
  const { user, isLoading: appLoading, notify } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'mechanics' | 'jobs' | 'sms'>('overview');
  const [stats, setStats] = useState({ totalUsers: 0, totalMechanics: 0, totalJobs: 0, completedJobs: 0, totalRevenue: 0 });
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const [smsLogs, setSmsLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Job Filter States
  const [jobStatusFilter, setJobStatusFilter] = useState<string>('All');
  const [dateRange, setDateRange] = useState<{start: string, end: string}>({ start: '', end: '' });

  // Mechanic Filter States
  const [mechanicSearch, setMechanicSearch] = useState('');
  const [verificationFilter, setVerificationFilter] = useState<'All' | 'Verified' | 'Pending'>('All');

  // Sort State
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });
  
  // Modals / Panels
  const [reviewingMechanic, setReviewingMechanic] = useState<Mechanic | null>(null);
  const [viewingJob, setViewingJob] = useState<JobRequest | null>(null);

  useEffect(() => {
    if (user?.isAdmin) {
        fetchData();
    }
  }, [user]);

  const fetchData = async () => {
      setIsLoading(true);
      try {
          const [statsData, mechanicsData, jobsData, smsData] = await Promise.all([
              api.admin.getStats(),
              api.admin.getAllMechanics(),
              api.admin.getAllJobs(),
              api.notifications.getSmsHistory(50)
          ]);
          setStats(statsData);
          setMechanics(mechanicsData);
          setJobs(jobsData);
          setSmsLogs(smsData);
      } catch (e) {
          notify("Error", "Failed to load admin data.");
      } finally {
          setIsLoading(false);
      }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedMechanics = useMemo(() => {
    let result = mechanics.filter(m => {
        const searchLower = mechanicSearch.toLowerCase();
        const matchesSearch = !mechanicSearch || 
                              m.name.toLowerCase().includes(searchLower) ||
                              (m.specialties || []).some(s => s.toLowerCase().includes(searchLower));
        
        const matchesVer = verificationFilter === 'All' ||
                           (verificationFilter === 'Verified' && m.verified) ||
                           (verificationFilter === 'Pending' && !m.verified);
                           
        return matchesSearch && matchesVer;
    });
    
    return result.sort((a, b) => {
        let aValue: any = '';
        let bValue: any = '';

        switch (sortConfig.key) {
            case 'name':
                aValue = a.name.toLowerCase();
                bValue = b.name.toLowerCase();
                break;
            case 'specialties':
                aValue = (a.specialties || []).join(', ').toLowerCase();
                bValue = (b.specialties || []).join(', ').toLowerCase();
                break;
            case 'yearsExperience':
                aValue = a.yearsExperience || 0;
                bValue = b.yearsExperience || 0;
                break;
            case 'rating':
                aValue = a.rating || 0;
                bValue = b.rating || 0;
                break;
            case 'verification':
                aValue = a.verified ? 1 : 0;
                bValue = b.verified ? 1 : 0;
                break;
            default:
                if (a.verified === b.verified) return 0;
                return a.verified ? 1 : -1;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
  }, [mechanics, sortConfig, mechanicSearch, verificationFilter]);

  const sortedJobs = useMemo(() => {
    let result = jobs.filter(j => {
        const matchesStatus = jobStatusFilter === 'All' || j.status === jobStatusFilter;
        let matchesDate = true;
        const jobDate = new Date(j.createdAt || Date.now());
        
        if (dateRange.start) {
            matchesDate = matchesDate && jobDate >= new Date(dateRange.start);
        }
        if (dateRange.end) {
            const endDate = new Date(dateRange.end);
            endDate.setHours(23, 59, 59, 999);
            matchesDate = matchesDate && jobDate <= endDate;
        }
        
        return matchesStatus && matchesDate;
    });

    return result.sort((a, b) => {
        let aValue: any = '';
        let bValue: any = '';

        switch (sortConfig.key) {
            case 'createdAt':
                aValue = new Date(a.createdAt || 0).getTime();
                bValue = new Date(b.createdAt || 0).getTime();
                break;
            case 'customerName':
                aValue = (a.customerName || '').toLowerCase();
                bValue = (b.customerName || '').toLowerCase();
                break;
            case 'mechanicName':
                aValue = a.mechanicId ? (mechanics.find(m => m.id === a.mechanicId)?.name || '') : '';
                bValue = b.mechanicId ? (mechanics.find(m => m.id === b.mechanicId)?.name || '') : '';
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
                break;
            case 'payout':
                aValue = a.payout || 0;
                bValue = b.payout || 0;
                break;
            case 'status':
                aValue = (a.status || '').toLowerCase();
                bValue = (b.status || '').toLowerCase();
                break;
            case 'id':
                aValue = a.id || '';
                bValue = b.id || '';
                break;
            default:
                aValue = (a as any)[sortConfig.key] || '';
                bValue = (b as any)[sortConfig.key] || '';
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
  }, [jobs, jobStatusFilter, dateRange, sortConfig, mechanics]);

  const handleApproveMechanic = async (id: string) => {
      try {
          await api.admin.approveMechanic(id);
          notify("Success", "Mechanic Approved.");
          setReviewingMechanic(null);
          fetchData(); // Refresh list
      } catch(e) {
          notify("Error", "Failed to approve mechanic.");
      }
  };

  if (!appLoading && (!user || !user.isAdmin)) return <Navigate to="/" replace />;

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-500"><Activity className="animate-spin mr-2"/> Loading Admin Panel...</div>;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden pt-[env(safe-area-inset-top)]">
        {/* Mobile-Responsive Sidebar/Navbar */}
        <div className="hidden md:flex w-64 bg-slate-900 text-slate-300 flex-shrink-0 flex-col justify-between pb-6 shadow-2xl z-20">
            <div className="p-6">
                <h1 className="text-white font-bold text-xl mb-8 flex items-center gap-2">
                    <ShieldCheck className="text-blue-500" /> Admin Console
                </h1>
                <nav className="space-y-2">
                    <button 
                        onClick={() => setActiveTab('overview')}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-white/10'}`}
                    >
                        <Activity size={20} /> Overview
                    </button>
                    <button 
                        onClick={() => setActiveTab('mechanics')}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${activeTab === 'mechanics' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-white/10'}`}
                    >
                        <Wrench size={20} /> Mechanics
                    </button>
                    <button 
                        onClick={() => setActiveTab('jobs')}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${activeTab === 'jobs' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-white/10'}`}
                    >
                        <FileText size={20} /> Bookings
                    </button>
                    <button 
                        onClick={() => setActiveTab('sms')}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${activeTab === 'sms' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-white/10'}`}
                    >
                        <MessageSquare size={20} /> SMS Logs
                    </button>
                </nav>
            </div>
            
            <div className="px-6">
                <button 
                    onClick={() => navigate('/')}
                    className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft size={20} /> Exit to App
                </button>
                <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-500">
                    Logged in as {user?.name}
                </div>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative pb-20 md:pb-8">
            
            {/* Mobile Header (Hidden on Desktop) */}
            <div className="md:hidden flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Admin</h2>
                <button onClick={() => navigate('/')} className="text-sm font-bold text-slate-600">Exit</button>
            </div>
            
            {activeTab === 'overview' && (
                <div className="animate-fade-in space-y-6">
                    <h2 className="text-2xl font-bold text-slate-900 hidden md:block">Platform Overview</h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-3 mb-2 text-slate-500">
                                <Users size={18} /> Total Users
                            </div>
                            <p className="text-3xl font-bold text-slate-900">{stats.totalUsers}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-3 mb-2 text-slate-500">
                                <Wrench size={18} /> Mechanics
                            </div>
                            <p className="text-3xl font-bold text-slate-900">{stats.totalMechanics}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-3 mb-2 text-slate-500">
                                <FileText size={18} /> Total Jobs
                            </div>
                            <p className="text-3xl font-bold text-slate-900">{stats.totalJobs}</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-3 mb-2 text-slate-500">
                                <CheckCircle size={18} /> Completed
                            </div>
                            <p className="text-3xl font-bold text-green-600">{stats.completedJobs}</p>
                        </div>
                    </div>

                    <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl flex items-center justify-between">
                         <div>
                             <p className="text-slate-400 font-bold uppercase tracking-wider text-sm mb-1">Total Platform Revenue</p>
                             <p className="text-5xl font-black">${stats.totalRevenue.toLocaleString()}</p>
                         </div>
                         <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md">
                             <DollarSign size={32} />
                         </div>
                    </div>
                </div>
            )}

            {activeTab === 'mechanics' && (
                <div className="animate-fade-in space-y-6">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <h2 className="text-2xl font-bold text-slate-900 hidden md:block">Registered Mechanics</h2>
                        <div className="flex flex-wrap gap-2 w-full md:w-auto">
                             {/* Mechanic Search */}
                             <div className="relative flex-1 md:flex-none">
                                <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                                <input 
                                    className="w-full md:w-64 pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Search name or specialty..."
                                    value={mechanicSearch}
                                    onChange={(e) => setMechanicSearch(e.target.value)}
                                />
                             </div>

                             {/* Verification Filter */}
                             <div className="relative">
                                <Filter size={16} className="absolute left-3 top-3 text-slate-400" />
                                <select 
                                    className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                    value={verificationFilter}
                                    onChange={(e) => setVerificationFilter(e.target.value as any)}
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="Verified">Verified</option>
                                    <option value="Pending">Pending</option>
                                </select>
                             </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('name')}>
                                            <div className="flex items-center gap-1">Mechanic Name <ArrowUpDown size={12}/></div>
                                        </th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('specialties')}>
                                            <div className="flex items-center gap-1">Specialties <ArrowUpDown size={12}/></div>
                                        </th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('yearsExperience')}>
                                            <div className="flex items-center gap-1">Experience <ArrowUpDown size={12}/></div>
                                        </th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('rating')}>
                                            <div className="flex items-center gap-1">Rating <ArrowUpDown size={12}/></div>
                                        </th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('verification')}>
                                            <div className="flex items-center gap-1">Verification <ArrowUpDown size={12}/></div>
                                        </th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-sm">
                                    {sortedMechanics.length === 0 ? (
                                        <tr><td colSpan={7} className="p-8 text-center text-slate-500">No mechanics found.</td></tr>
                                    ) : (
                                        sortedMechanics.map(mech => (
                                            <tr key={mech.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <img src={mech.avatar} className="w-8 h-8 rounded-full bg-slate-200 object-cover" />
                                                        <div 
                                                            onClick={() => setReviewingMechanic(mech)}
                                                            className="font-bold text-slate-900 cursor-pointer hover:text-blue-600 hover:underline"
                                                        >
                                                            {mech.name}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {(mech.specialties || []).slice(0, 2).map(s => (
                                                            <span key={s} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200">{s}</span>
                                                        ))}
                                                        {(mech.specialties || []).length > 2 && <span className="text-xs text-slate-400">+{mech.specialties!.length - 2} more</span>}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-slate-600 font-medium">
                                                    {mech.yearsExperience} Years
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-1 font-bold text-slate-700">
                                                        <Star size={14} className="text-amber-400 fill-amber-400" />
                                                        {mech.rating.toFixed(1)}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    {mech.verified ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold border border-green-100">
                                                            <CheckCircle size={12} /> Verified
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
                                                            <XCircle size={12} /> Pending
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-xs ${mech.availability === 'Available Now' ? 'text-green-600 font-bold' : 'text-slate-400 font-medium'}`}>
                                                        {mech.availability || 'Offline'}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => setReviewingMechanic(mech)}
                                                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-white hover:border-slate-300 transition-colors"
                                                        >
                                                            {mech.verified ? 'View' : 'Review'}
                                                        </button>
                                                        {!mech.verified && (
                                                            <button 
                                                                onClick={() => handleApproveMechanic(mech.id)}
                                                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 transition-colors"
                                                            >
                                                                Approve
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'jobs' && (
                <div className="animate-fade-in space-y-6">
                    <h2 className="text-2xl font-bold text-slate-900 hidden md:block">Job Bookings</h2>
                    
                    {/* Filter Controls */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex flex-col md:flex-row gap-4">
                            {/* Status Filter */}
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Filter by Status</label>
                                <div className="relative">
                                    <Filter size={16} className="absolute left-3 top-3 text-slate-400" />
                                    <select 
                                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        value={jobStatusFilter}
                                        onChange={(e) => setJobStatusFilter(e.target.value)}
                                    >
                                        <option value="All">All Statuses</option>
                                        <option value="NEW">New Requests</option>
                                        <option value="ACCEPTED">Accepted</option>
                                        <option value="ARRIVED">Arrived</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="COMPLETED">Completed</option>
                                    </select>
                                </div>
                            </div>

                            {/* Date Range Filter */}
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                                <div className="relative">
                                    <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
                                    <input 
                                        type="date" 
                                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        value={dateRange.start}
                                        onChange={e => setDateRange({...dateRange, start: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Date</label>
                                <div className="relative">
                                    <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
                                    <input 
                                        type="date" 
                                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        value={dateRange.end}
                                        onChange={e => setDateRange({...dateRange, end: e.target.value})}
                                    />
                                </div>
                            </div>

                            {/* Reset Button */}
                            <div className="flex items-end">
                                <button 
                                    onClick={() => { setJobStatusFilter('All'); setDateRange({start:'', end:''}); }}
                                    className="w-full md:w-auto px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 hover:text-slate-800 transition-colors flex items-center justify-center gap-2"
                                    title="Reset Filters"
                                >
                                    <RotateCcw size={16} /> Reset
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Job ID</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('customerName')}>
                                            <div className="flex items-center gap-1">Customer <ArrowUpDown size={12}/></div>
                                        </th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('mechanicName')}>
                                            <div className="flex items-center gap-1">Mechanic <ArrowUpDown size={12}/></div>
                                        </th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('status')}>
                                            <div className="flex items-center gap-1">Status <ArrowUpDown size={12}/></div>
                                        </th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('createdAt')}>
                                            <div className="flex items-center gap-1">Created At <ArrowUpDown size={12}/></div>
                                        </th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('payout')}>
                                            <div className="flex items-center gap-1">Amount <ArrowUpDown size={12}/></div>
                                        </th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-sm">
                                    {sortedJobs.length === 0 ? (
                                        <tr><td colSpan={7} className="p-8 text-center text-slate-500">No jobs match your filters.</td></tr>
                                    ) : (
                                        sortedJobs.map(job => {
                                            const mechName = job.mechanicId ? mechanics.find(m => m.id === job.mechanicId)?.name : 'Unassigned';
                                            return (
                                                <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-4 text-xs font-mono text-slate-500 select-all">{job.id.substring(0, 8)}...</td>
                                                    <td className="p-4 font-bold text-slate-900">
                                                        {job.customerName}
                                                        <div className="text-xs text-slate-500 font-normal">{job.vehicle}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${mechName === 'Unassigned' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-700'}`}>
                                                            {mechName}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                            job.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                            job.status === 'NEW' ? 'bg-blue-100 text-blue-700' :
                                                            job.status === 'ACCEPTED' ? 'bg-amber-100 text-amber-700' :
                                                            job.status === 'ARRIVED' ? 'bg-purple-100 text-purple-700' :
                                                            job.status === 'IN_PROGRESS' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-slate-100 text-slate-700'
                                                        }`}>
                                                            {job.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-slate-500 whitespace-nowrap">
                                                        {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A'}
                                                        <div className="text-xs opacity-50">{job.createdAt ? new Date(job.createdAt).toLocaleTimeString() : ''}</div>
                                                    </td>
                                                    <td className="p-4 font-bold text-slate-900">${job.payout.toFixed(2)}</td>
                                                    <td className="p-4">
                                                        <button 
                                                            onClick={() => setViewingJob(job)}
                                                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-white hover:border-slate-300 transition-colors flex items-center gap-1"
                                                        >
                                                            <Eye size={12}/> View
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'sms' && (
                <div className="animate-fade-in space-y-6">
                    <h2 className="text-2xl font-bold text-slate-900 hidden md:block">SMS Notification History</h2>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date Sent</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Recipient</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Message Body</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-sm">
                                    {smsLogs.length === 0 ? (
                                        <tr><td colSpan={4} className="p-8 text-center text-slate-500">No messages sent yet.</td></tr>
                                    ) : (
                                        smsLogs.map((log, i) => (
                                            <tr key={log.id || i} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4 text-slate-500 whitespace-nowrap">
                                                    {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'N/A'}
                                                </td>
                                                <td className="p-4 font-mono text-slate-600">{log.to}</td>
                                                <td className="p-4 text-slate-800 max-w-md truncate">{log.body}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${log.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {log.status.toUpperCase()}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Mobile Tab Bar (Visible only on small screens) */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-2 pb-[env(safe-area-inset-bottom)] flex justify-between items-center z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <button 
                onClick={() => setActiveTab('overview')} 
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'overview' ? 'text-blue-600' : 'text-slate-400'}`}
            >
                <Activity size={24} strokeWidth={activeTab === 'overview' ? 2.5 : 2} />
                <span className="text-[10px] font-bold">Stats</span>
            </button>
            <button 
                onClick={() => setActiveTab('mechanics')} 
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'mechanics' ? 'text-blue-600' : 'text-slate-400'}`}
            >
                <Wrench size={24} strokeWidth={activeTab === 'mechanics' ? 2.5 : 2} />
                <span className="text-[10px] font-bold">Pros</span>
            </button>
            <button 
                onClick={() => setActiveTab('jobs')} 
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'jobs' ? 'text-blue-600' : 'text-slate-400'}`}
            >
                <FileText size={24} strokeWidth={activeTab === 'jobs' ? 2.5 : 2} />
                <span className="text-[10px] font-bold">Jobs</span>
            </button>
        </div>

        {/* Review Mechanic Slide-over (Side Panel) */}
        {reviewingMechanic && (
            <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-fade-in">
                <div className="bg-white w-full max-w-md h-full shadow-2xl overflow-hidden flex flex-col animate-slide-left">
                    <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0">
                        <h3 className="font-bold flex items-center gap-2 text-lg">
                            <ShieldCheck size={22}/> 
                            {reviewingMechanic.verified ? 'Mechanic Profile' : 'Application Review'}
                        </h3>
                        <button onClick={() => setReviewingMechanic(null)}><X size={24} className="hover:text-slate-300 transition-colors"/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* Header */}
                        <div className="flex flex-col items-center text-center animate-fade-in">
                            <img src={reviewingMechanic.avatar} className="w-24 h-24 rounded-full border-4 border-slate-100 shadow-md mb-4 object-cover" />
                            <h2 className="text-2xl font-bold text-slate-900">{reviewingMechanic.name}</h2>
                            <div className="flex items-center gap-2 mt-2">
                                {reviewingMechanic.verified ? (
                                    <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100 flex items-center gap-1">
                                        <CheckCircle size={12} /> Verified Partner
                                    </span>
                                ) : (
                                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 flex items-center gap-1">
                                        <XCircle size={12} /> Verification Pending
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Contact Info */}
                        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
                            <h4 className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-2">Contact Details</h4>
                            <div className="flex items-center gap-3 text-sm text-slate-700">
                                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm"><Mail size={14} className="text-blue-500" /></div>
                                <span className="font-medium">{reviewingMechanic.email || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-700">
                                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm"><Phone size={14} className="text-green-500" /></div>
                                <span className="font-medium">{reviewingMechanic.phone || 'N/A'}</span>
                            </div>
                        </div>

                        {/* Qualifications */}
                        <div>
                            <h4 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                                <Wrench size={16} className="text-slate-400"/> Expertise & Skills
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {reviewingMechanic.specialties?.map(s => (
                                    <span key={s} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs rounded-lg font-bold border border-blue-100">{s}</span>
                                ))}
                                {reviewingMechanic.certifications?.map(c => (
                                    <span key={c} className="px-3 py-1.5 bg-green-50 text-green-700 text-xs rounded-lg font-bold border border-green-100">{c}</span>
                                ))}
                            </div>
                        </div>
                        
                        {/* Documents Section */}
                        <div>
                            <h4 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                                <FileText size={16} className="text-slate-400"/> Submitted Documents
                            </h4>
                            <div className="space-y-3">
                                {/* License */}
                                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                                            <FileText size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">Driver's License</p>
                                            <p className="text-xs text-slate-400">ID Verification</p>
                                        </div>
                                    </div>
                                    {reviewingMechanic.documents?.license ? (
                                        <a 
                                            href={reviewingMechanic.documents.license} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors flex items-center gap-2"
                                        >
                                            View <ExternalLink size={12}/>
                                        </a>
                                    ) : (
                                        <span className="text-xs text-slate-400 italic bg-slate-100 px-2 py-1 rounded">Missing</span>
                                    )}
                                </div>

                                {/* Insurance */}
                                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-100 transition-colors">
                                            <ShieldCheck size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">Insurance Policy</p>
                                            <p className="text-xs text-slate-400">Liability Coverage</p>
                                        </div>
                                    </div>
                                    {reviewingMechanic.documents?.insurance ? (
                                        <a 
                                            href={reviewingMechanic.documents.insurance} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-colors flex items-center gap-2"
                                        >
                                            View <ExternalLink size={12}/>
                                        </a>
                                    ) : (
                                        <span className="text-xs text-slate-400 italic bg-slate-100 px-2 py-1 rounded">Missing</span>
                                    )}
                                </div>

                                {/* Background Check */}
                                 <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-green-50/50 border-green-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                            <ShieldCheck size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">Background Check</p>
                                            <p className="text-xs text-green-600 font-bold">Clear & Approved</p>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                        <CheckCircle size={16} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-4 shrink-0">
                        {!reviewingMechanic.verified ? (
                            <>
                                <button 
                                    onClick={() => setReviewingMechanic(null)}
                                    className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => handleApproveMechanic(reviewingMechanic.id)}
                                    className="flex-[2] py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={18} /> Approve Mechanic
                                </button>
                            </>
                        ) : (
                            <button 
                                onClick={() => setReviewingMechanic(null)}
                                className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg transition-colors"
                            >
                                Close Profile
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* View Job Details Modal (Centered) */}
        {viewingJob && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                     <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
                        <h3 className="font-bold flex items-center gap-2">
                            <Briefcase size={18}/> Job #{viewingJob.id.substring(0,8)}
                        </h3>
                        <button onClick={() => setViewingJob(null)}><X size={20} className="hover:text-slate-300"/></button>
                    </div>

                    <div className="p-6 overflow-y-auto space-y-6">
                        {/* Status Bar */}
                        <div className="flex justify-between items-center">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                viewingJob.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                viewingJob.status === 'NEW' ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-100 text-slate-700'
                            }`}>
                                {viewingJob.status}
                            </span>
                            <span className="text-sm text-slate-500 font-mono">
                                {viewingJob.createdAt ? new Date(viewingJob.createdAt).toLocaleString() : 'N/A'}
                            </span>
                        </div>

                        {/* Customer & Mechanic */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Customer</p>
                                <p className="font-bold text-slate-900">{viewingJob.customerName}</p>
                                <p className="text-xs text-slate-500">{viewingJob.vehicle}</p>
                                {viewingJob.location?.address && <p className="text-xs text-slate-500 mt-1 flex gap-1"><MapPin size={10} className="mt-0.5"/> {viewingJob.location.address}</p>}
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Mechanic</p>
                                {viewingJob.mechanicId ? (
                                    <>
                                        <p className="font-bold text-slate-900">{mechanics.find(m => m.id === viewingJob.mechanicId)?.name || 'Unknown'}</p>
                                        <p className="text-xs text-blue-600 font-bold">Assigned</p>
                                    </>
                                ) : (
                                    <p className="text-sm text-slate-500 italic">Unassigned</p>
                                )}
                            </div>
                        </div>

                        {/* Financials */}
                        <div>
                             <h4 className="font-bold text-slate-800 text-sm mb-3">Invoice Details</h4>
                             <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                                 <div className="flex justify-between text-sm">
                                     <span className="text-slate-600">Description</span>
                                     <span className="font-medium">{viewingJob.issue}</span>
                                 </div>
                                 <div className="flex justify-between text-sm">
                                     <span className="text-slate-600">Payment Status</span>
                                     <span className={`font-bold text-xs px-2 py-0.5 rounded ${viewingJob.paymentStatus === 'CAPTURED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{viewingJob.paymentStatus || 'PENDING'}</span>
                                 </div>
                                 <div className="flex justify-between text-sm">
                                     <span className="text-slate-600">Method</span>
                                     <span className="font-medium flex items-center gap-1">
                                         {viewingJob.paymentMethod?.type === 'CARD' ? <CreditCard size={14}/> : <DollarSign size={14}/>} 
                                         {viewingJob.paymentMethod?.type || 'N/A'}
                                     </span>
                                 </div>
                                 <div className="border-t border-slate-100 pt-2 mt-2 flex justify-between font-bold text-lg text-slate-900">
                                     <span>Total</span>
                                     <span>${viewingJob.payout.toFixed(2)}</span>
                                 </div>
                             </div>
                        </div>

                        {viewingJob.completionDetails && (
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm mb-2">Completion Notes</h4>
                                <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 border border-slate-100">
                                    <p><span className="font-bold">Work Done:</span> {viewingJob.completionDetails.description}</p>
                                    {viewingJob.completionDetails.parts && <p className="mt-2"><span className="font-bold">Parts:</span> {viewingJob.completionDetails.parts}</p>}
                                    {viewingJob.completionDetails.notes && <p className="mt-2 text-slate-500 italic">"{viewingJob.completionDetails.notes}"</p>}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-slate-50">
                        <button 
                            onClick={() => setViewingJob(null)}
                            className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg"
                        >
                            Close Details
                        </button>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};
