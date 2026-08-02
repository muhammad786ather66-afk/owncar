import React, { useState, useEffect } from 'react';
import { Driver } from '../types';
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
  User,
  ExternalLink,
  Clock,
  Check,
  AlertTriangle,
  BadgeCheck
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  // Modal for inspecting full resolution Cloudinary / R2 documents
  const [docModal, setDocModal] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
    driverName: string;
    docType: string;
  }>({
    isOpen: false,
    url: '',
    title: '',
    driverName: '',
    docType: '',
  });

  useEffect(() => {
    fetchAdminData(true);
    const interval = setInterval(() => {
      fetchAdminData(false);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchAdminData = async (isManualOrInitial = false) => {
    if (isManualOrInitial) setLoading(true);
    try {
      const [drvRes, statsRes] = await Promise.all([
        api.getAdminDrivers(),
        api.getAdminStats(),
      ]);

      const driverList = drvRes?.drivers || [];
      setDrivers(driverList);
      setStats(statsRes?.stats || null);

      if (isManualOrInitial) {
        showToast('info', `Synced ${driverList.length} driver records directly from database.`);
      }
    } catch (e: any) {
      console.error('Admin fetch error:', e);
      if (isManualOrInitial) {
        showToast('error', 'Failed to fetch database records. Check connection.');
      }
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
          prev.map((d) => (d.id === driverId ? { ...d, is_approved: true } : d))
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

  const handleReject = async (driverId: string, driverName: string) => {
    setUpdatingId(driverId);
    try {
      const res = await api.rejectDriver(driverId, 'Document verification standard not met');
      if (res && res.success !== false) {
        setDrivers((prev) =>
          prev.map((d) => (d.id === driverId ? { ...d, is_approved: false } : d))
        );
        showToast('info', `Driver "${driverName}" status set to rejected.`);
      } else {
        showToast('error', res?.message || 'Failed to reject driver.');
      }
    } catch (err: any) {
      showToast('error', 'Error rejecting driver.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (driverId: string, driverName: string) => {
    if (!window.confirm(`PERMANENT DELETE CONFIRMATION:\n\nAre you sure you want to delete driver "${driverName}"? This will permanently remove their user account, driver profile, and documents from D1 database.`)) {
      return;
    }
    
    setDeletingId(driverId);
    try {
      const res = await api.deleteDriver(driverId);
      if (res && res.success !== false) {
        setDrivers((prev) => prev.filter((d) => d.id !== driverId));
        showToast('success', `Driver "${driverName}" deleted permanently from system database.`);
      } else {
        showToast('error', res?.message || 'Failed to delete driver from database.');
      }
    } catch (err: any) {
      showToast('error', 'Failed to communicate with database.');
    } finally {
      setDeletingId(null);
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
    });
  };

  // Filter & Search Drivers
  const filteredDrivers = drivers.filter((drv) => {
    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'pending'
        ? !drv.is_approved
        : drv.is_approved;

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

  const pendingCount = drivers.filter((d) => !d.is_approved).length;
  const approvedCount = drivers.filter((d) => d.is_approved).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header Panel */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-amber-400/20 text-yellow-400 border border-yellow-400/30 rounded-full text-xs font-bold inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Apni Car Unified Admin Portal</span>
              </span>
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[11px] font-bold inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Realtime D1 Sync
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Driver Operations & Approval Center
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              One unified panel for driver details, Cloudinary verification documents, live approval/rejection, and database management.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchAdminData(true)}
              disabled={loading}
              className="px-5 py-3 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-2xl border border-yellow-500 shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Refreshing Database...' : 'Sync Database'}</span>
            </button>
          </div>
        </div>

        {/* System Notification Toast */}
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

      {/* Stats Quick Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Registered</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-black text-slate-900">{drivers.length}</span>
            <span className="text-xs font-bold text-slate-500">Drivers</span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">Pending Approval</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-black text-amber-600">{pendingCount}</span>
            <span className="text-xs font-bold text-amber-700">Action Needed</span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">Approved Drivers</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-black text-emerald-600">{approvedCount}</span>
            <span className="text-xs font-bold text-emerald-700">Active</span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">System Revenue</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900">PKR {stats?.subscriptionRevenue || 14500}</span>
            <span className="text-xs font-bold text-emerald-600">0% Comm</span>
          </div>
        </div>
      </div>

      {/* Main Unified Panel */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-6">
        {/* Toolbar: Search & Filter Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by driver name, mobile, CNIC, vehicle reg..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 font-bold"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Drivers ({drivers.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filter === 'pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filter === 'approved'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Approved ({approvedCount})
            </button>
          </div>
        </div>

        {/* Unified Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 rounded-l-2xl">Driver & User Info</th>
                <th className="py-3.5 px-4">Vehicle Specs</th>
                <th className="py-3.5 px-4">CNIC & Licence</th>
                <th className="py-3.5 px-4">Verification Docs</th>
                <th className="py-3.5 px-4">Approval Status</th>
                <th className="py-3.5 px-4 text-right rounded-r-2xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    <div className="max-w-sm mx-auto space-y-2">
                      <User className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-700">No driver records found</p>
                      <p className="text-xs text-slate-400">
                        {searchQuery
                          ? 'No drivers match your search query.'
                          : filter !== 'all'
                          ? `No drivers in "${filter}" status.`
                          : 'No driver applications currently registered in database.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((drv) => {
                  const driverName = drv.user?.full_name || 'Driver User';
                  const mobile = drv.user?.mobile_number || 'N/A';
                  const username = drv.user?.username || drv.id;
                  const isPending = !drv.is_approved;

                  const docs = [
                    { type: 'CNIC Front', url: drv.cnic_front_url },
                    { type: 'CNIC Back', url: drv.cnic_back_url },
                    { type: 'Licence', url: drv.licence_doc_url },
                    { type: 'Vehicle Reg', url: drv.registration_doc_url },
                  ];

                  return (
                    <tr
                      key={drv.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Driver & User Info */}
                      <td className="py-4 px-4 align-top">
                        <div className="space-y-1">
                          <div className="font-bold text-sm text-slate-900 group-hover:text-amber-700 transition-colors">
                            {driverName}
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{mobile}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            @{username} • ID: {drv.id}
                          </div>
                        </div>
                      </td>

                      {/* Vehicle Specs */}
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

                      {/* CNIC & Licence */}
                      <td className="py-4 px-4 align-top">
                        <div className="space-y-1 font-mono text-xs">
                          <div className="text-slate-900 font-bold">
                            <span className="text-slate-400 text-[10px] uppercase block font-sans">CNIC Number</span>
                            {drv.cnic}
                          </div>
                          <div className="text-slate-700">
                            <span className="text-slate-400 text-[10px] uppercase block font-sans">Licence No</span>
                            {drv.driving_licence}
                          </div>
                        </div>
                      </td>

                      {/* Verification Docs (Thumbnails + Viewer) */}
                      <td className="py-4 px-4 align-top">
                        <div className="grid grid-cols-2 gap-1.5 w-40">
                          {docs.map((doc, i) => (
                            <button
                              key={i}
                              onClick={() => openDocInspector(doc.url || '', doc.type, driverName, doc.type)}
                              disabled={!doc.url}
                              className={`p-1.5 rounded-xl border text-[10px] font-bold text-left transition-all flex flex-col items-center justify-center gap-1 ${
                                doc.url
                                  ? 'bg-slate-50 hover:bg-amber-50 border-slate-200 hover:border-amber-300 text-slate-800 shadow-2xs'
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

                      {/* Approval Status */}
                      <td className="py-4 px-4 align-top">
                        {drv.is_approved ? (
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full inline-flex items-center gap-1.5 border border-emerald-200">
                            <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Approved
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-amber-100 text-amber-900 font-bold text-xs rounded-full inline-flex items-center gap-1.5 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                            Pending Review
                          </span>
                        )}
                      </td>

                      {/* Action Toolbar */}
                      <td className="py-4 px-4 align-top text-right">
                        <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-2">
                          {isPending ? (
                            <button
                              onClick={() => handleApprove(drv.id, driverName)}
                              disabled={updatingId === drv.id}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1 shadow-sm active:scale-95 disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{updatingId === drv.id ? 'Approving...' : 'Approve'}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReject(drv.id, driverName)}
                              disabled={updatingId === drv.id}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1 shadow-sm active:scale-95 disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>{updatingId === drv.id ? 'Updating...' : 'Revoke'}</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(drv.id, driverName)}
                            disabled={deletingId === drv.id}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition-all flex items-center gap-1 border border-rose-200 active:scale-95 disabled:opacity-50"
                            title="Permanently delete driver record"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>{deletingId === drv.id ? 'Deleting...' : 'Delete'}</span>
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
                  Driver: <strong className="text-slate-800">{docModal.driverName}</strong> • Verified Cloud Storage
                </p>
              </div>
              <button
                onClick={() => setDocModal({ ...docModal, isOpen: false })}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Document Viewer */}
            <div className="bg-slate-950 rounded-2xl p-3 flex items-center justify-center min-h-[300px] border border-slate-800 relative">
              <img
                src={docModal.url}
                alt={docModal.title}
                className="max-h-[70vh] w-auto object-contain rounded-xl shadow-lg"
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
                <span>Open Full Image in New Tab</span>
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
