import React, { useState, useEffect } from 'react';
import { Driver } from '../types';
import { api } from '../api/client';
import { ShieldCheck, CheckCircle, XCircle, FileText, Car, DollarSign, Users, Activity, Eye, RefreshCw } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [viewingDocModal, setViewingDocModal] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const drvRes = await api.getAdminDrivers();
      setDrivers(drvRes.drivers || []);

      const statsRes = await api.getAdminStats();
      setStats(statsRes.stats || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveToggle = async (driverId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      await api.approveDriver(driverId, newStatus);
      setActionMessage(newStatus ? 'Driver approved successfully!' : 'Driver status updated.');
      fetchAdminData();
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-slate-900 text-white rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Cloudflare D1 Management</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Admin Console</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Review driver registrations, verify uploaded documents, approve accounts, and view platform metrics.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" /> Refresh D1 Data
        </button>
      </div>

      {actionMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex justify-between items-center">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage('')}>✕</button>
        </div>
      )}

      {/* Metrics Grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Drivers</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{stats.totalDrivers}</span>
            <span className="text-[10px] text-amber-600 font-bold mt-1 block">{stats.pendingDrivers} Pending Approval</span>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Riders</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{stats.totalRiders}</span>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Completed Rides</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">{stats.completedTrips}</span>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pass Revenue</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">PKR {stats.subscriptionRevenue}</span>
          </div>
        </div>
      )}

      {/* Driver Approvals Table */}
      <div className="p-6 bg-white rounded-3xl shadow-xl border border-slate-100 space-y-4">
        <h3 className="text-lg font-black text-slate-900">Registered Driver Accounts</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
              <tr>
                <th className="p-3">Driver Name & Username</th>
                <th className="p-3">CNIC & Licence</th>
                <th className="p-3">Vehicle Info</th>
                <th className="p-3">Documents</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drivers.map((drv) => (
                <tr key={drv.id} className="hover:bg-slate-50/60">
                  <td className="p-3 font-semibold text-slate-900">
                    <div>{drv.user?.full_name || 'Driver'}</div>
                    <div className="text-[10px] text-slate-400">@{drv.user?.username} • {drv.user?.mobile_number}</div>
                  </td>
                  <td className="p-3 font-mono">
                    <div>CNIC: {drv.cnic}</div>
                    <div className="text-slate-500 text-[10px]">Licence: {drv.driving_licence}</div>
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-slate-900">{drv.vehicle_brand} {drv.vehicle_model}</span>
                    <div className="text-[10px] text-slate-500">Reg: {drv.vehicle_reg_number} ({drv.vehicle_type})</div>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => setViewingDocModal(drv.cnic_front_url || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400')}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> View Docs
                    </button>
                  </td>
                  <td className="p-3">
                    {drv.is_approved ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">
                        Approved
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full">
                        Pending Admin
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleApproveToggle(drv.id, drv.is_approved)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                        drv.is_approved
                          ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                      }`}
                    >
                      {drv.is_approved ? 'Revoke Approval' : 'Approve Driver'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {viewingDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white p-4 rounded-3xl shadow-2xl max-w-lg w-full space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-slate-900">Driver Document Preview</h4>
              <button onClick={() => setViewingDocModal(null)} className="font-bold text-slate-400">✕</button>
            </div>
            <img src={viewingDocModal} alt="Document" className="w-full h-64 object-cover rounded-2xl border border-slate-200" />
            <button
              onClick={() => setViewingDocModal(null)}
              className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
