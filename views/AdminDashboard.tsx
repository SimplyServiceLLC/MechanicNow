
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../App';
import { useNavigate, Navigate } from '../App';
import { LayoutDashboard, Users, Wrench, FileText, CheckCircle, XCircle, TrendingUp, DollarSign, Activity, Calendar, ExternalLink, ShieldCheck, Eye, X, Briefcase, Filter, RotateCcw, ArrowUpDown } from 'lucide-react';
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
  
  // Filter States
  const [jobStatusFilter, setJobStatusFilter] = useState<string>('All');
  const [dateRange, setDateRange] = useState<{start: string, end: string}>({ start: '', end: '' });

  // Sort State
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });
  
  // Review Modal State
  const [reviewingMechanic, setReviewingMechanic] = useState<Mechanic | null>(null);

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

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedJobs = useMemo(() => {
    // 1. Filter
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

    // 2. Sort
    return result.sort((a, b) => {
        let aValue: any = '';
        let bValue: any = '';

        switch (sortConfig.key) {
            case 'createdAt':
                aValue = new Date(a.createdAt || 0).getTime();
                bValue = new Date(b.createdAt || 0).getTime();
                break;
            case 'customerName':
                aValue = a.customerName || '';
                bValue = b.customerName || '';
                break;
            case 'mechanicName':
                aValue = a.mechanicId ? (mechanics.find(m => m.id === a.mechanicId)?.name || '') : '';
                bValue = b.mechanicId ? (mechanics.find(m => m.id === b.mechanicId)?.name || '') : '';
                break;
            case 'payout':
                aValue = a.payout || 0;
                bValue = b.payout || 0;
                break;
            case 'status':
                aValue = a.status || '';
                bValue = b.status || '';
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

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-500">Loading Admin Panel...</div>;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden pt-[calc(4.5rem+env(safe-area-inset-top))]">
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
                </nav>
            </div>
            <div className="px-6 text-xs text-slate-500">
                Logged in as {user?.name}
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative pb-20 md:pb-8">
            
            {activeTab === 'overview' && (
                <div className="animate-fade-in space-y-6">
                    <h2 className="text-2xl font-bold text-slate-900">Platform Overview</h2>
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
                    <h2 className="text-2xl font-bold text-slate-900">Mechanic Applications</h2>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        {mechanics.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">No mechanics found.</div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {mechanics.map(mech => (
                                    <div key={mech.id} className="p-6 flex flex-col md:flex-row items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-4 w-full md:w-auto md:flex-1">
                                            <img src={mech.avatar} className="w-12 h-12 rounded-full bg-slate-200 object-cover" />
                                            <div>
                                                <h4 className="font-bold text-slate-900">{mech.name}</h4>
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <span>{mech.yearsExperience} Years Exp.</span>
                                                    {mech.verified ? (
                                                        <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle size={10} /> Verified</span>
                                                    ) : (
                                                        <span className="text-amber-500 font-bold flex items-center gap-1"><XCircle size={10} /> Pending</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-start md:justify-center gap-8 w-full md:w-auto md:px-8">
                                            <div>
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</div>
                                                <div className={`text-sm font-bold flex items-center gap-2 ${mech.availability === 'Available Now' ? 'text-green-600' : 'text-slate-500'}`}>
                                                    <div className={`w-2 h-2 rounded-full ${mech.availability === 'Available Now' ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                                                    {mech.availability || 'Offline'}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Jobs Done</div>
                                                <div className="text-sm font-bold text-slate-900">{mech.jobsCompleted || 0}</div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 w-full md:w-auto">
                                            <button 
                                                onClick={() => setReviewingMechanic(mech)}
                                                className="flex-1 md:flex-none px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-white transition-colors"
                                            >
                                                Review App
                                            </button>
                                            {!mech.verified && (
                                                <button 
                                                    onClick={() => handleApproveMechanic(mech.id)}
                                                    className="flex-1 md:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-500 transition-colors"
                                                >
                                                    Approve
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'jobs' && (
                <div className="animate-fade-in space-y-6">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <h2 className="text-2xl font-bold text-slate-900">Job Bookings</h2>
                        <div className="flex flex-wrap gap-2">
                             {/* Status Filter */}
                             <div className="relative">
                                <Filter size={16} className="absolute left-3 top-3 text-slate-400" />
                                <select 
                                    className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                    value={jobStatusFilter}
                                    onChange={(e) => setJobStatusFilter(e.target.value)}
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="NEW">New</option>
                                    <option value="ACCEPTED">Accepted</option>
                                    <option value="COMPLETED">Completed</option>
                                </select>
                             </div>

                             {/* Date Filters */}
                             <input 
                                type="date" 
                                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                                value={dateRange.start}
                                onChange={e => setDateRange({...dateRange, start: e.target.value})}
                             />
                             <input 
                                type="date" 
                                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                                value={dateRange.end}
                                onChange={e => setDateRange({...dateRange, end: e.target.value})}
                             />
                             <button 
                                onClick={() => { setJobStatusFilter('All'); setDateRange({start:'', end:''}); }}
                                className="p-2 bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200"
                                title="Reset Filters"
                             >
                                <RotateCcw size={18} />
                             </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('createdAt')}>
                                            <div className="flex items-center gap-1">Date <ArrowUpDown size={12}/></div>
                                        </th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('customerName')}>
                                            <div className="flex items-center gap-1">Customer <ArrowUpDown size={12}/></div>
                                        </th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vehicle & Issue</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('mechanicName')}>
                                            <div className="flex items-center gap-1">Mechanic <ArrowUpDown size={12}/></div>
                                        </th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('payout')}>
                                            <div className="flex items-center gap-1">Amount <ArrowUpDown size={12}/></div>
                                        </th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort('status')}>
                                            <div className="flex items-center gap-1">Status <ArrowUpDown size={12}/></div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-sm">
                                    {sortedJobs.length === 0 ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-slate-500">No jobs match your filters.</td></tr>
                                    ) : (
                                        sortedJobs.map(job => {
                                            const mechName = job.mechanicId ? mechanics.find(m => m.id === job.mechanicId)?.name : 'Unassigned';
                                            return (
                                                <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-4 text-slate-500 whitespace-nowrap">
                                                        {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A'}
                                                        <div className="text-xs opacity-50">{job.createdAt ? new Date(job.createdAt).toLocaleTimeString() : ''}</div>
                                                    </td>
                                                    <td className="p-4 font-bold text-slate-900">{job.customerName}</td>
                                                    <td className="p-4">
                                                        <div className="font-medium text-slate-800">{job.vehicle}</div>
                                                        <div className="text-xs text-slate-500 truncate max-w-[150px]">{job.issue}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${mechName === 'Unassigned' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-700'}`}>
                                                            {mechName}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 font-bold text-slate-900">${job.payout.toFixed(2)}</td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                            job.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                            job.status === 'NEW' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-amber-100 text-amber-700'
                                                        }`}>
                                                            {job.status}
                                                        </span>
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

        {/* Review Mechanic Modal */}
        {reviewingMechanic && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
                        <h3 className="font-bold flex items-center gap-2"><ShieldCheck size={18}/> Review Application</h3>
                        <button onClick={() => setReviewingMechanic(null)}><X size={20} className="hover:text-slate-300"/></button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto space-y-6">
                        <div className="flex items-center gap-4">
                            <img src={reviewingMechanic.avatar} className="w-16 h-16 rounded-full border-2 border-slate-200" />
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">{reviewingMechanic.name}</h2>
                                <p className="text-slate-500 text-sm">Applied: Just now</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm mb-2">Qualifications</h4>
                                <div className="flex flex-wrap gap-2">
                                    {reviewingMechanic.specialties?.map(s => (
                                        <span key={s} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded font-bold border border-blue-100">{s}</span>
                                    ))}
                                    {reviewingMechanic.certifications?.map(c => (
                                        <span key={c} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded font-bold border border-green-100">{c}</span>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm mb-2">Submitted Documents</h4>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                            <FileText size={16} className="text-blue-500" /> Driver's License
                                        </div>
                                        <button className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline"><Eye size={12}/> View</button>
                                    </div>
                                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                            <FileText size={16} className="text-blue-500" /> Insurance Policy
                                        </div>
                                        <button className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline"><Eye size={12}/> View</button>
                                    </div>
                                     <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                            <ShieldCheck size={16} className="text-green-500" /> Background Check
                                        </div>
                                        <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded">Passed</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50">
                        <button 
                            onClick={() => setReviewingMechanic(null)}
                            className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100"
                        >
                            Close
                        </button>
                        {!reviewingMechanic.verified && (
                            <button 
                                onClick={() => handleApproveMechanic(reviewingMechanic.id)}
                                className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 shadow-lg shadow-green-200"
                            >
                                Approve Mechanic
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};
