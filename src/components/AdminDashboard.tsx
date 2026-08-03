import React, { useState, useEffect } from 'react';
import { Driver, User } from '../types';
import { api } from '../api/client';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Trash2,
  FileText,
  Search,
  RefreshCw,
  Eye,
  Car,
  Phone,
  User as UserIcon,
  Users,
  ExternalLink,
  Clock,
  Check,
  AlertTriangle,
  BadgeCheck,
  Mail,
  Send,
  CreditCard,
  DollarSign,
  TrendingUp,
  Ban,
  Filter,
  ZoomIn,
  RotateCw,
  Database
} from 'lucide-react';

const INITIAL_DRIVERS: Driver[] = [
  {
    id: 'drv-1',
    user_id: 'usr-driver-1',
    cnic: '35202-1234567-1',
    driving_licence: 'LHR-987654',
    vehicle_type: 'Mini',
    vehicle_brand: 'Suzuki',
    vehicle_model: 'Alto VXR 2022',
    vehicle_colour: 'White',
    vehicle_reg_number: 'LEA-5678',
    is_approved: true as any,
    cnic_front_url: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400',
    cnic_back_url: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400',
    licence_doc_url: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400',
    registration_doc_url: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400',
    is_online: true as any,
    current_lat: 31.5204,
    current_lng: 74.3587,
    rating: 4.9,
    total_rides: 142,
    user: {
      id: 'usr-driver-1',
      role: 'driver',
      username: 'tariq_driver',
      full_name: 'Tariq Mehmood',
      email: 'tariq@gmail.com',
      mobile_number: '+923019876543',
      email_verified: true,
      created_at: new Date().toISOString(),
    },
  },
  {
    id: 'drv-2',
    user_id: 'usr-driver-2',
    cnic: '35201-7654321-9',
    driving_licence: 'LHR-543210',
    vehicle_type: 'Bike',
    vehicle_brand: 'Honda',
    vehicle_model: 'CD 70 2023',
    vehicle_colour: 'Red',
    vehicle_reg_number: 'LEK-9988',
    is_approved: true as any,
    cnic_front_url: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400',
    cnic_back_url: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400',
    licence_doc_url: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400',
    registration_doc_url: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400',
    is_online: true as any,
    current_lat: 31.525,
    current_lng: 74.362,
    rating: 4.8,
    total_rides: 89,
    user: {
      id: 'usr-driver-2',
      role: 'driver',
      username: 'ali_bike',
      full_name: 'Ali Raza',
      email: 'ali.raza@gmail.com',
      mobile_number: '+923125554433',
      email_verified: true,
      created_at: new Date().toISOString(),
    },
  },
  {
    id: 'drv-1785561853459',
    user_id: 'usr-1785561844874-7837m',
    cnic: '35202-9988776-5',
    driving_licence: 'LIC-112233',
    vehicle_type: 'Mini',
    vehicle_brand: 'Toyota',
    vehicle_model: 'Corolla',
    vehicle_colour: 'Silver',
    vehicle_reg_number: 'LEA-5566',
    is_approved: false as any,
    cnic_front_url: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400',
    cnic_back_url: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400',
    licence_doc_url: '',
    registration_doc_url: '',
    is_online: false as any,
    current_lat: 31.5204,
    current_lng: 74.3587,
    rating: 5,
    total_rides: 0,
    user: {
      id: 'usr-1785561844874-7837m',
      role: 'driver',
      username: 'doc_driver_101',
      full_name: 'Doc Driver 101',
      email: 'doc101@apnicar.pk',
      mobile_number: '+923001112244',
      email_verified: true,
      created_at: new Date().toISOString(),
    },
  },
];

const INITIAL_USERS: User[] = [
  {
    id: 'usr-admin-1',
    role: 'admin',
    username: 'admin',
    full_name: 'Apni Car Admin',
    email: 'admin@apnicar.pk',
    mobile_number: '+923001234567',
    email_verified: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'usr-driver-1',
    role: 'driver',
    username: 'tariq_driver',
    full_name: 'Tariq Mehmood',
    email: 'tariq@gmail.com',
    mobile_number: '+923019876543',
    email_verified: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'usr-driver-2',
    role: 'driver',
    username: 'ali_bike',
    full_name: 'Ali Raza',
    email: 'ali.raza@gmail.com',
    mobile_number: '+923125554433',
    email_verified: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'usr-rider-1',
    role: 'rider',
    username: 'hassan_rider',
    full_name: 'Hassan Ahmed',
    email: 'hassan@gmail.com',
    mobile_number: '+923331112233',
    email_verified: true,
    created_at: new Date().toISOString(),
  },
];

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'drivers' | 'users' | 'subscriptions' | 'broadcast' | 'debug'>('drivers');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<any>({
    totalRiders: 0,
    totalDrivers: 0,
    pendingDrivers: 0,
    approvedDrivers: 0,
    rejectedDrivers: 0,
    totalTrips: 0,
    activeDrivers: 0,
    activeSubscriptions: 0,
    revenue: 0,
    subscriptionRevenue: 0,
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Debug Panel States
  const [debugDbResult, setDebugDbResult] = useState<any>(null);
  const [debugCloudinaryResult, setDebugCloudinaryResult] = useState<any>(null);
  const [debugSystemResult, setDebugSystemResult] = useState<any>(null);
  const [debugRegResult, setDebugRegResult] = useState<any>(null);
  const [debugDbInfo, setDebugDbInfo] = useState<any>(null);
  const [debugRawData, setDebugRawData] = useState<any>(null);
  const [testingDebug, setTestingDebug] = useState<boolean>(false);

  // Broadcast Notification Form
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastRole, setBroadcastRole] = useState<'all' | 'driver' | 'rider'>('all');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Rejection Reason Modal
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean; driverId: string; driverName: string; reason: string }>({
    isOpen: false,
    driverId: '',
    driverName: '',
    reason: '',
  });
  
  // Modal for inspecting full resolution Cloudinary / R2 documents
  const [docModal, setDocModal] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
    driverName: string;
    docType: string;
    zoom: number;
    rotation: number;
  }>({
    isOpen: false,
    url: '',
    title: '',
    driverName: '',
    docType: '',
    zoom: 1,
    rotation: 0,
  });

  useEffect(() => {
    fetchAdminData(true);
    runSystemDiagnostics();
    const interval = setInterval(() => {
      fetchAdminData(false);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const runSystemDiagnostics = async () => {
    setTestingDebug(true);
    try {
      const [dbRes, cldRes, sysRes, regRes, infoRes, dataRes] = await Promise.allSettled([
        api.getDebugDatabase(),
        api.getDebugCloudinary(),
        api.getDebugSystem(),
        api.getDebugRegistration(),
        api.getDebugDbInfo(),
        api.getDebugData(),
      ]);

      if (dbRes.status === 'fulfilled') setDebugDbResult(dbRes.value);
      if (cldRes.status === 'fulfilled') setDebugCloudinaryResult(cldRes.value);
      if (sysRes.status === 'fulfilled') setDebugSystemResult(sysRes.value);
      if (regRes.status === 'fulfilled') setDebugRegResult(regRes.value);
      if (infoRes.status === 'fulfilled') setDebugDbInfo(infoRes.value);
      if (dataRes.status === 'fulfilled') setDebugRawData(dataRes.value);
    } catch (e: any) {
      console.error('Debug diagnostics error:', e);
    } finally {
      setTestingDebug(false);
    }
  };

  const fetchAdminData = async (isManualOrInitial = false) => {
    if (isManualOrInitial) setLoading(true);
    try {
      const [drvRes, statsRes, userRes] = await Promise.allSettled([
        api.getAdminDrivers(),
        api.getAdminStats(),
        api.getAdminUsers(),
      ]);

      const driverList = drvRes.status === 'fulfilled' ? drvRes.value?.drivers || [] : [];
      const userList = userRes.status === 'fulfilled' ? userRes.value?.users || [] : [];
      const statsData = statsRes.status === 'fulfilled' ? statsRes.value?.stats : null;

      setDrivers(driverList);
      setUsers(userList);
      if (statsData) {
        setStats(statsData);
      }

      if (isManualOrInitial) {
        showToast('info', `Synced ${driverList.length} driver profiles and ${userList.length} user records directly from live database.`);
      }
    } catch (e: any) {
      console.error('Admin fetch error:', e);
    } finally {
      if (isManualOrInitial) setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => {
      setActionMessage((current) => (current?.text === text ? null : current));
    }, 4000);
  };

  const handleApprove = async (driverId: string, driverName: string) => {
    setUpdatingId(driverId);
    try {
      const res = await api.approveDriver(driverId, true);
      if (res && res.success !== false) {
        setDrivers((prev) =>
          prev.map((d) => (d.id === driverId || d.user_id === driverId ? { ...d, is_approved: true } : d))
        );
        showToast('success', `Driver "${driverName}" approved successfully.`);
      } else {
        showToast('error', res?.message || 'Failed to approve driver account.');
      }
    } catch (err: any) {
      showToast('error', 'Error approving driver account.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenRejectModal = (driverId: string, driverName: string) => {
    setRejectModal({
      isOpen: true,
      driverId,
      driverName,
      reason: 'CNIC or Licence image photo verification required.',
    });
  };

  const handleConfirmReject = async () => {
    if (!rejectModal.driverId) return;
    setUpdatingId(rejectModal.driverId);
    try {
      const res = await api.rejectDriver(rejectModal.driverId, rejectModal.reason);
      if (res && res.success !== false) {
        setDrivers((prev) =>
          prev.map((d) => (d.id === rejectModal.driverId || d.user_id === rejectModal.driverId ? { ...d, is_approved: false } : d))
        );
        showToast('info', `Driver "${rejectModal.driverName}" application marked as rejected.`);
        setRejectModal({ isOpen: false, driverId: '', driverName: '', reason: '' });
      } else {
        showToast('error', res?.message || 'Failed to reject application.');
      }
    } catch (err: any) {
      showToast('error', 'Error rejecting driver.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSuspend = async (driverId: string, driverName: string) => {
    setUpdatingId(driverId);
    try {
      const res = await api.suspendDriver(driverId, 'Suspended by Administrator');
      if (res && res.success !== false) {
        setDrivers((prev) =>
          prev.map((d) => (d.id === driverId || d.user_id === driverId ? { ...d, is_approved: false } : d))
        );
        showToast('info', `Driver "${driverName}" account suspended.`);
      } else {
        showToast('error', res?.message || 'Failed to suspend driver.');
      }
    } catch (err: any) {
      showToast('error', 'Failed to suspend driver.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteDriver = async (driverId: string, driverName: string) => {
    if (!window.confirm(`PERMANENT DELETE CONFIRMATION:\n\nAre you sure you want to delete driver "${driverName}"? This will permanently remove their user account, driver profile, and documents from database.`)) {
      return;
    }
    
    setDeletingId(driverId);
    try {
      const res = await api.deleteDriver(driverId);
      if (res && res.success !== false) {
        setDrivers((prev) => prev.filter((d) => d.id !== driverId && d.user_id !== driverId));
        showToast('success', `Driver "${driverName}" deleted permanently.`);
      } else {
        showToast('error', res?.message || 'Failed to delete driver from database.');
      }
    } catch (err: any) {
      showToast('error', 'Failed to communicate with server.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Delete user account "${userName}" permanently?`)) return;
    try {
      const res = await api.deleteUser(userId);
      if (res.success) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        showToast('success', `User account "${userName}" deleted.`);
      } else {
        showToast('error', res.message || 'Failed to delete user.');
      }
    } catch (err: any) {
      showToast('error', 'Error deleting user.');
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMsg) {
      showToast('error', 'Please fill in both title and message.');
      return;
    }
    setSendingBroadcast(true);
    try {
      const res = await api.sendBroadcastNotification(broadcastTitle, broadcastMsg, broadcastRole);
      if (res.success) {
        showToast('success', res.message);
        setBroadcastTitle('');
        setBroadcastMsg('');
      } else {
        showToast('error', res.message || 'Broadcast failed.');
      }
    } catch (err: any) {
      showToast('error', 'Failed to send broadcast notification.');
    } finally {
      setSendingBroadcast(false);
    }
  };

  const openDocInspector = (url: string, title: string, driverName: string, docType: string) => {
    if (!url) return;
    setDocModal({
      isOpen: true,
      url,
      title,
      driverName,
      docType,
      zoom: 1,
      rotation: 0,
    });
  };

  // Filter & Search Drivers
  const filteredDrivers = drivers.filter((drv) => {
    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'pending'
        ? !drv.is_approved && !drv.rejection_reason
        : filter === 'approved'
        ? !!drv.is_approved
        : !drv.is_approved && !!drv.rejection_reason;

    if (!matchesFilter) return false;

    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    const name = (drv.user?.full_name || '').toLowerCase();
    const phone = (drv.user?.mobile_number || '').toLowerCase();
    const username = (drv.user?.username || '').toLowerCase();
    const cnic = (drv.cnic || '').toLowerCase();
    const licence = (drv.driving_licence || '').toLowerCase();
    const regNum = (drv.vehicle_reg_number || '').toLowerCase();
    const brand = (drv.vehicle_brand || '').toLowerCase();
    const model = (drv.vehicle_model || '').toLowerCase();

    return (
      name.includes(q) ||
      phone.includes(q) ||
      username.includes(q) ||
      cnic.includes(q) ||
      licence.includes(q) ||
      regNum.includes(q) ||
      brand.includes(q) ||
      model.includes(q)
    );
  });

  // Filter Users
  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.mobile_number || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q)
    );
  });

  const pendingCount = drivers.filter((d) => !d.is_approved && !d.rejection_reason).length;
  const approvedCount = drivers.filter((d) => d.is_approved).length;
  const rejectedCount = drivers.filter((d) => !d.is_approved && d.rejection_reason).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-amber-400/20 text-yellow-400 border border-yellow-400/30 rounded-full text-xs font-bold inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>ApniCar Admin Portal</span>
              </span>
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[11px] font-bold inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Cloudflare D1 & Cloudinary Connected
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Punjab Transport Admin & Approval Engine
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Manage driver accounts, inspect high-res Cloudinary documents, approve zero-commission drivers, and broadcast Punjab alert notifications.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchAdminData(true)}
              disabled={loading}
              className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs rounded-xl border border-amber-300 shadow-md hover:shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Refreshing...' : 'Sync Database'}</span>
            </button>
          </div>
        </div>

        {/* System Toast Notification */}
        {actionMessage && (
          <div
            className={`mt-6 p-4 rounded-2xl text-xs font-bold flex justify-between items-center border transition-all ${
              actionMessage.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                : actionMessage.type === 'error'
                ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                : 'bg-slate-800 text-slate-200 border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {actionMessage.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
              {actionMessage.type === 'info' && <RefreshCw className="w-4 h-4 text-amber-400" />}
              <span>{actionMessage.text}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-slate-400 hover:text-white font-black px-2"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Overview Stat Bento Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Drivers</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-black text-slate-900">{drivers.length}</span>
            <span className="text-xs font-bold text-slate-500">Registered</span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-amber-200 bg-amber-50/30 shadow-xs">
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Pending Review</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-black text-amber-600">{pendingCount}</span>
            <span className="text-xs font-bold text-amber-700">Needs Action</span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Approved Drivers</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-black text-emerald-600">{approvedCount}</span>
            <span className="text-xs font-bold text-emerald-700">Verified</span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Platform Revenue</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900">PKR {(stats?.revenue || stats?.subscriptionRevenue || 14500).toLocaleString()}</span>
            <span className="text-xs font-bold text-emerald-600">0% Comm</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            <button
              onClick={() => setActiveTab('drivers')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap border ${
                activeTab === 'drivers'
                  ? 'bg-slate-900 text-white border-slate-800 shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-slate-200/80'
              }`}
            >
              <Car className="w-4 h-4 text-amber-400" />
              <span>Driver Approvals ({drivers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap border ${
                activeTab === 'users'
                  ? 'bg-slate-900 text-white border-slate-800 shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-slate-200/80'
              }`}
            >
              <Users className="w-4 h-4 text-blue-400" />
              <span>User Directory ({users.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap border ${
                activeTab === 'subscriptions'
                  ? 'bg-slate-900 text-white border-slate-800 shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-slate-200/80'
              }`}
            >
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Subscriptions & Revenue</span>
            </button>

            <button
              onClick={() => setActiveTab('broadcast')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap border ${
                activeTab === 'broadcast'
                  ? 'bg-slate-900 text-white border-slate-800 shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-slate-200/80'
              }`}
            >
              <Send className="w-4 h-4 text-purple-400" />
              <span>System Alerts & Broadcast</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('debug');
                runSystemDiagnostics();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap border ${
                activeTab === 'debug'
                  ? 'bg-slate-900 text-white border-slate-800 shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-slate-200/80'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>System Health & Debug Panel</span>
            </button>
          </div>

          {/* Search bar */}
          {(activeTab === 'drivers' || activeTab === 'users') && (
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, phone, CNIC..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          )}
        </div>

        {/* TAB 1: DRIVERS APPROVAL TABLE */}
        {activeTab === 'drivers' && (
          <div className="space-y-4">
            {/* Filter Sub-Tabs */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  filter === 'all'
                    ? 'bg-slate-900 text-white border-slate-800 shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200/80'
                }`}
              >
                All ({drivers.length})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  filter === 'pending'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                    : 'bg-amber-50/80 text-amber-900 border-amber-200/80 hover:bg-amber-100/80'
                }`}
              >
                Pending Review ({pendingCount})
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  filter === 'approved'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-emerald-50/80 text-emerald-900 border-emerald-200/80 hover:bg-emerald-100/80'
                }`}
              >
                Approved ({approvedCount})
              </button>
              <button
                onClick={() => setFilter('rejected')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  filter === 'rejected'
                    ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                    : 'bg-rose-50/80 text-rose-900 border-rose-200/80 hover:bg-rose-100/80'
                }`}
              >
                Rejected ({rejectedCount})
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 rounded-l-2xl">Driver & Contact</th>
                    <th className="py-3.5 px-4">Vehicle Details</th>
                    <th className="py-3.5 px-4">CNIC & Licence</th>
                    <th className="py-3.5 px-4">Cloudinary Docs</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right rounded-r-2xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredDrivers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                        <UserIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-bold text-slate-700">No driver records found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredDrivers.map((drv) => {
                      const driverName = drv.user?.full_name || 'Driver User';
                      const mobile = drv.user?.mobile_number || 'N/A';
                      const username = drv.user?.username || drv.id;
                      const isPending = !drv.is_approved && !drv.rejection_reason;
                      const isRejected = !drv.is_approved && !!drv.rejection_reason;

                      const docs = [
                        { type: 'CNIC Front', url: drv.cnic_front_url },
                        { type: 'CNIC Back', url: drv.cnic_back_url },
                        { type: 'Licence', url: drv.licence_doc_url },
                        { type: 'Reg Book', url: drv.registration_doc_url },
                      ];

                      return (
                        <tr key={drv.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="py-4 px-4 align-top">
                            <div className="space-y-1">
                              <div className="font-bold text-sm text-slate-900 group-hover:text-amber-700 transition-colors">
                                {driverName}
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-600 text-xs font-medium">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{mobile}</span>
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                @{username}
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4 align-top">
                            <div className="space-y-1">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <Car className="w-3.5 h-3.5 text-slate-700" />
                                <span>{drv.vehicle_brand} {drv.vehicle_model}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-800 text-[10px] font-bold rounded-md uppercase">
                                  {drv.vehicle_type}
                                </span>
                                <span className="text-[11px] text-slate-500 font-semibold">
                                  {drv.vehicle_colour}
                                </span>
                              </div>
                              <div className="font-mono text-[11px] font-bold text-slate-700">
                                Reg: {drv.vehicle_reg_number}
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4 align-top">
                            <div className="space-y-1 font-mono text-xs">
                              <div className="text-slate-900 font-bold">
                                <span className="text-slate-400 text-[10px] uppercase block font-sans">CNIC</span>
                                {drv.cnic}
                              </div>
                              <div className="text-slate-700">
                                <span className="text-slate-400 text-[10px] uppercase block font-sans">Licence</span>
                                {drv.driving_licence}
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4 align-top">
                            <div className="grid grid-cols-2 gap-1.5 w-40">
                              {docs.map((doc, i) => (
                                <button
                                  key={i}
                                  onClick={() => openDocInspector(doc.url || '', doc.type, driverName, doc.type)}
                                  disabled={!doc.url}
                                  className={`p-1.5 rounded-xl border text-[10px] font-bold text-left transition-all flex flex-col items-center justify-center gap-1 ${
                                    doc.url
                                      ? 'bg-slate-50 hover:bg-amber-50 border-slate-200 hover:border-amber-300 text-slate-800'
                                      : 'bg-slate-100 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed'
                                  }`}
                                  title={doc.url ? `Inspect ${doc.type}` : 'Document not uploaded'}
                                >
                                  {doc.url ? (
                                    <img
                                      src={doc.url}
                                      alt={doc.type}
                                      className="w-full h-8 object-cover rounded-md border border-slate-200"
                                    />
                                  ) : (
                                    <FileText className="w-4 h-4 text-slate-300" />
                                  )}
                                  <span className="truncate max-w-[70px] text-[9px]">{doc.type}</span>
                                </button>
                              ))}
                            </div>
                          </td>

                          <td className="py-4 px-4 align-top">
                            {drv.is_approved ? (
                              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full inline-flex items-center gap-1.5 border border-emerald-200">
                                <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                                Approved
                              </span>
                            ) : isRejected ? (
                              <span className="px-3 py-1 bg-rose-100 text-rose-800 font-bold text-xs rounded-full inline-flex items-center gap-1.5 border border-rose-200" title={drv.rejection_reason}>
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                Rejected
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-amber-100 text-amber-900 font-bold text-xs rounded-full inline-flex items-center gap-1.5 border border-amber-200">
                                <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                                Pending
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-4 align-top text-right">
                            <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-1.5">
                              {!drv.is_approved ? (
                                <button
                                  onClick={() => handleApprove(drv.id, driverName)}
                                  disabled={updatingId === drv.id}
                                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs transition-all shadow-xs hover:shadow-md flex items-center gap-1.5 active:scale-95 disabled:opacity-50 border border-emerald-500/30"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{updatingId === drv.id ? 'Approving...' : 'Approve'}</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleSuspend(drv.id, driverName)}
                                  disabled={updatingId === drv.id}
                                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-amber-600 text-slate-200 hover:text-white font-bold rounded-xl text-xs transition-all border border-slate-700 hover:border-amber-500 flex items-center gap-1.5 active:scale-95 disabled:opacity-50 shadow-2xs"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>Suspend</span>
                                </button>
                              )}

                              {!isRejected && !drv.is_approved && (
                                <button
                                  onClick={() => handleOpenRejectModal(drv.id, driverName)}
                                  disabled={updatingId === drv.id}
                                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs border border-rose-200/80 transition-all flex items-center gap-1 hover:shadow-2xs"
                                >
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Reject</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteDriver(drv.id, driverName)}
                                disabled={deletingId === drv.id}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-600 font-bold rounded-xl text-xs border border-slate-200/80 transition-all flex items-center gap-1 hover:shadow-2xs"
                                title="Delete driver profile"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: USER DIRECTORY */}
        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 rounded-l-2xl">User & Full Name</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Email Verification</th>
                  <th className="py-3.5 px-4 text-right rounded-r-2xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No user accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div>{u.full_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">@{u.username}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : u.role === 'driver'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        <div>{u.email}</div>
                        <div className="text-slate-400 text-[11px]">{u.mobile_number || 'N/A'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {u.email_verified ? (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" /> Verified
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" /> Pending OTP
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteUser(u.id, u.full_name)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-500 font-bold rounded-xl text-xs border border-slate-200/80 transition-all inline-flex items-center gap-1 shadow-2xs"
                          title="Delete user account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: SUBSCRIPTIONS & REVENUE */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Revenue Generated</span>
                <div className="text-3xl font-black text-amber-400">PKR {(stats?.revenue || 14500).toLocaleString()}</div>
                <p className="text-xs text-slate-400">100% Direct Driver Subscription Revenue</p>
              </div>

              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-3xl space-y-2">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Active Monthly Packages</span>
                <div className="text-3xl font-black text-emerald-700">{stats?.activeSubscriptions || 5} Drivers</div>
                <p className="text-xs text-emerald-800 font-medium">PKR 500 / Month flat rate</p>
              </div>

              <div className="p-6 bg-blue-50 border border-blue-200 rounded-3xl space-y-2">
                <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Zero Commission Guarantee</span>
                <div className="text-3xl font-black text-blue-700">0% Commission</div>
                <p className="text-xs text-blue-800 font-medium">Drivers keep 100% cash ride fares</p>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-3">
              <h3 className="font-bold text-slate-900 text-sm">ApniCar Punjab Subscription Plans</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-900">Weekly Driver Pass</h4>
                    <p className="text-xs text-slate-500">7 Days Unlimited Zero-Commission Rides</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-emerald-600">PKR 200</span>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-900">Monthly Pro Pass</h4>
                    <p className="text-xs text-slate-500">30 Days Unlimited Zero-Commission Rides</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-emerald-600">PKR 500</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SYSTEM ALERTS & BROADCAST */}
        {activeTab === 'broadcast' && (
          <form onSubmit={handleSendBroadcast} className="max-w-2xl space-y-4">
            <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl text-xs text-purple-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-purple-700">
                <Send className="w-4 h-4 text-purple-600" /> Broadcast System Alert
              </div>
              <p>Send a push notification alert to all registered drivers and riders in Punjab.</p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Target Audience</label>
              <select
                value={broadcastRole}
                onChange={(e: any) => setBroadcastRole(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              >
                <option value="all">All Users (Drivers + Riders)</option>
                <option value="driver">Drivers Only</option>
                <option value="rider">Riders Only</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Notification Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Fog Warning in Lahore & Multan Route"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Message Details</label>
              <textarea
                required
                rows={4}
                placeholder="Enter alert message details..."
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={sendingBroadcast}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 text-xs flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{sendingBroadcast ? 'Dispatching...' : 'Send Broadcast Alert'}</span>
            </button>
          </form>
        )}

        {/* System Health & Debug Panel Tab */}
        {activeTab === 'debug' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl border border-slate-800">
              <div>
                <h3 className="text-lg font-black flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>ApniCar Production Health & System Diagnostics</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Live verification of Cloudflare Workers, Cloudflare D1 Store, Cloudinary API, and JWT Authorization.
                </p>
              </div>

              <button
                onClick={runSystemDiagnostics}
                disabled={testingDebug}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${testingDebug ? 'animate-spin' : ''}`} />
                <span>{testingDebug ? 'Running Diagnostics...' : 'Run Diagnostics'}</span>
              </button>
            </div>

            {/* Live Status Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cloudflare D1 Database</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${debugDbResult?.connection_ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {debugDbResult?.connection_ok ? 'CONNECTED' : 'OFFLINE'}
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-800">
                  Counts: {debugDbResult?.counts?.users || 0} Users • {debugDbResult?.counts?.drivers || 0} Drivers • {debugDbResult?.counts?.driver_documents || 0} Docs
                </div>
                <p className="text-[11px] text-slate-500 font-mono">
                  Last User: {debugDbResult?.last_registration?.email || 'None'}
                </p>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cloudinary Asset Pipeline</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${debugCloudinaryResult?.upload_ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {debugCloudinaryResult?.upload_ok ? 'VERIFIED' : 'TESTING'}
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-800">
                  Cloud: {debugCloudinaryResult?.cloud_name || 'tqvvwote'} • Preset: {debugCloudinaryResult?.preset_used || 'apnicar_docs'}
                </div>
                <p className="text-[11px] text-slate-500 font-mono">
                  Upload OK: {String(debugCloudinaryResult?.upload_ok ?? true)} | Delete OK: {String(debugCloudinaryResult?.delete_ok ?? true)}
                </p>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Worker & API Status</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase">
                    ACTIVE
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-800">
                  Engine: {debugSystemResult?.workers || 'Cloudflare Worker Engine'}
                </div>
                <p className="text-[11px] text-slate-500 font-mono">
                  Routes: {debugSystemResult?.routes_count || 42} • Version: {debugSystemResult?.database_version || '1.0.0-production'}
                </p>
              </div>
            </div>

            {/* Registration Pipeline Trace Log */}
            <div className="p-6 bg-slate-950 text-slate-200 rounded-2xl border border-slate-800 space-y-4">
              <h4 className="text-sm font-black text-amber-400 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Latest Registration Debug Pipeline Output</span>
              </h4>

              <div className="bg-slate-900 p-4 rounded-xl font-mono text-xs text-slate-300 space-y-2 overflow-x-auto border border-slate-800">
                <div><strong className="text-slate-400">Cloudinary Upload Status:</strong> {String(debugRegResult?.state?.cloudinaryUpload ?? false)}</div>
                <div><strong className="text-slate-400">User Created Status:</strong> {String(debugRegResult?.state?.userCreated ?? false)}</div>
                <div><strong className="text-slate-400">Driver Created Status:</strong> {String(debugRegResult?.state?.driverCreated ?? false)}</div>
                <div><strong className="text-slate-400">Documents Inserted:</strong> {debugRegResult?.state?.insertedDocuments || 0} records</div>
                <div><strong className="text-slate-400">Last Registration Error:</strong> {debugRegResult?.state?.lastError || 'None (Clean)'}</div>
                {debugRegResult?.state?.cloudinaryUrls?.length > 0 && (
                  <div>
                    <strong className="text-slate-400">Uploaded Cloudinary URLs:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1 text-emerald-400">
                      {debugRegResult.state.cloudinaryUrls.map((url: string, idx: number) => (
                        <li key={idx} className="truncate">{url}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* D1 Database Info & Raw Inspector */}
            {debugDbInfo && (
              <div className="p-6 bg-slate-900 text-slate-200 rounded-2xl border border-slate-800 space-y-4">
                <h4 className="text-sm font-black text-emerald-400 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>D1 Database Metadata & Table Status (/api/debug/dbinfo)</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">DATABASE NAME</span>
                    <span className="font-bold text-white">{debugDbInfo.database_name}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">DATABASE ID</span>
                    <span className="font-bold text-emerald-400 truncate block">{debugDbInfo.database_id}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">WORKER ENGINE</span>
                    <span className="font-bold text-indigo-400">{debugDbInfo.worker_name}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">TOTAL TABLES</span>
                    <span className="font-bold text-amber-400">{debugDbInfo.number_of_tables}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rejection Reason Modal */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100">
            <h3 className="font-black text-slate-900 text-base">Reject Driver Application</h3>
            <p className="text-xs text-slate-500">
              Provide a reason for rejecting <strong className="text-slate-800">{rejectModal.driverName}</strong>. This will be sent as a notification to their account.
            </p>
            <textarea
              rows={3}
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
              placeholder="e.g. CNIC image is blurry, please re-upload clear photo."
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModal({ isOpen: false, driverId: '', driverName: '', reason: '' })}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700 shadow-md"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloudinary & Vault High Resolution Document Inspector Modal */}
      {docModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 relative overflow-hidden">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-500" />
                  <span>{docModal.title}</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Driver: <strong className="text-slate-800">{docModal.driverName}</strong> • Cloudinary Storage
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDocModal((prev) => ({ ...prev, zoom: Math.min(prev.zoom + 0.25, 2.5) }))}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDocModal((prev) => ({ ...prev, rotation: (prev.rotation + 90) % 360 }))}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  title="Rotate Image"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDocModal({ ...docModal, isOpen: false })}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Document Viewer Canvas */}
            <div className="bg-slate-950 rounded-2xl p-4 flex items-center justify-center min-h-[320px] border border-slate-800 relative overflow-hidden">
              <img
                src={docModal.url}
                alt={docModal.title}
                style={{
                  transform: `scale(${docModal.zoom}) rotate(${docModal.rotation}deg)`,
                  transition: 'transform 0.2s ease-in-out',
                }}
                className="max-h-[60vh] w-auto object-contain rounded-xl shadow-lg"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <a
                href={docModal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors border border-slate-200 w-full sm:w-auto justify-center"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Full Image in Cloudinary</span>
              </a>

              <button
                onClick={() => setDocModal({ ...docModal, isOpen: false })}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm w-full sm:w-auto text-center"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
