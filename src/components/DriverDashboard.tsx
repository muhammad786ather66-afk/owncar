import React, { useState, useEffect } from 'react';
import { User, Driver, Trip, Subscription } from '../types';
import { api } from '../api/client';
import { SubscriptionModal } from './SubscriptionModal';
import { LeafletMap } from './LeafletMap';
import { Power, Sparkles, AlertCircle, ShieldCheck, CheckCircle2, Clock, MapPin, Navigation, Phone, DollarSign, Calendar, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props {
  user: User;
  driver: Driver;
  onUpdateDriver: (updatedDriver: Driver) => void;
  onOpenRideHistory: () => void;
}

export const DriverDashboard: React.FC<Props> = ({
  user,
  driver,
  onUpdateDriver,
  onOpenRideHistory,
}) => {
  const [isOnline, setIsOnline] = useState(driver.is_online);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [pendingRequest, setPendingRequest] = useState<Trip | null>(null);
  const [showSubModal, setShowSubModal] = useState(false);

  const [togglingOnline, setTogglingOnline] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Audio alert synth for incoming ride
  const playBeepSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    checkDriverStatus();
    const interval = setInterval(() => {
      checkDriverStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, [driver.id]);

  const checkDriverStatus = async () => {
    try {
      const res = await api.getActiveTrip(user.id, 'driver');
      if (res.active_trip) {
        setActiveTrip(res.active_trip);
        setPendingRequest(null);
      } else if (res.pending_request) {
        if (!pendingRequest || pendingRequest.id !== res.pending_request.id) {
          playBeepSound();
        }
        setPendingRequest(res.pending_request);
        setActiveTrip(null);
      } else {
        setActiveTrip(null);
        setPendingRequest(null);
      }
    } catch (e) {
      // silent
    }
  };

  const handleToggleOnline = async () => {
    setTogglingOnline(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.toggleDriverOnline(driver.id, !isOnline);
      setIsOnline(res.is_online);
      setSuccessMsg(res.message);
      onUpdateDriver({ ...driver, is_online: res.is_online });
    } catch (err: any) {
      if (err.data?.subscription_required) {
        setShowSubModal(true);
      } else {
        setErrorMsg(err.message || 'Failed to toggle online status');
      }
    } finally {
      setTogglingOnline(false);
    }
  };

  const handleAcceptRide = async (tripId: string) => {
    try {
      const res = await api.acceptRide(tripId, driver.id);
      setActiveTrip(res.trip);
      setPendingRequest(null);
      confetti({ particleCount: 40 });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to accept ride');
    }
  };

  const handleStartTrip = async () => {
    if (!activeTrip) return;
    try {
      const res = await api.startTrip(activeTrip.id);
      setActiveTrip(res.trip);
    } catch (err: any) {
      setErrorMsg('Failed to start trip');
    }
  };

  const handleCompleteTrip = async () => {
    if (!activeTrip) return;
    try {
      const res = await api.completeTrip(activeTrip.id);
      setActiveTrip(null);
      setSuccessMsg('Trip completed! Cash collected.');
      confetti({ particleCount: 70 });
    } catch (err: any) {
      setErrorMsg('Failed to complete trip');
    }
  };

  // Check subscription validity
  const activeSub = driver.active_subscription;
  const isSubActive = activeSub && new Date(activeSub.expires_at).getTime() > Date.now();
  const expiresDate = activeSub ? new Date(activeSub.expires_at).toLocaleDateString() : 'No active pass';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
      {/* Top Driver Status Banner (Bento Slate-900 Card) */}
      <div className="p-6 bg-slate-900 text-white rounded-[32px] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-yellow-400 text-slate-950 flex items-center justify-center font-black text-2xl shadow-md">
            {user.full_name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">{user.full_name}</h2>
              {driver.is_approved ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                  <CheckCircle2 className="w-3 h-3" /> Approved Driver
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                  <Clock className="w-3 h-3" /> Pending Approval
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              {driver.vehicle_brand} {driver.vehicle_model} • <span className="font-mono text-yellow-400 font-bold">{driver.vehicle_reg_number}</span> ({driver.vehicle_type})
            </p>
          </div>
        </div>

        {/* Online Toggle & Pass Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSubModal(true)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-yellow-400 rounded-full text-xs font-bold transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-yellow-400" />
            {isSubActive ? `Pass Active (${expiresDate})` : 'Buy Driver Pass'}
          </button>

          <button
            onClick={handleToggleOnline}
            disabled={togglingOnline || !driver.is_approved}
            className={`px-6 py-3 rounded-full font-black text-xs tracking-wider uppercase flex items-center gap-2 transition-all shadow-md ${
              isOnline
                ? 'bg-yellow-400 text-slate-950 shadow-yellow-400/20 hover:bg-yellow-300'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
            }`}
          >
            <Power className="w-4 h-4" />
            {togglingOnline ? 'Updating...' : isOnline ? 'ONLINE (ON)' : 'OFFLINE (OFF)'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="font-bold">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-medium">
          {successMsg}
        </div>
      )}

      {/* Main Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Leaflet Map Bento Card */}
        <div className="lg:col-span-7 space-y-4 bg-white border border-slate-200 rounded-[32px] p-3 shadow-sm overflow-hidden">
          <LeafletMap
            center={[driver.current_lat || 31.5204, driver.current_lng || 74.3587]}
            zoom={14}
            pickup={activeTrip ? { lat: activeTrip.pickup_lat, lng: activeTrip.pickup_lng, address: activeTrip.pickup_address } : null}
            dropoff={activeTrip ? { lat: activeTrip.dropoff_lat, lng: activeTrip.dropoff_lng, address: activeTrip.dropoff_address } : null}
            heightClass="h-[380px] sm:h-[480px] lg:h-[530px]"
          />
        </div>

        {/* Right Column: Execution & Subscription Bento Cards */}
        <div className="lg:col-span-5 space-y-5">
          {/* PENDING REQUEST POPUP */}
          {pendingRequest && (
            <div className="p-6 bg-slate-900 text-white rounded-[32px] shadow-2xl border-2 border-yellow-400 animate-bounce-short space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 bg-yellow-400 text-slate-950 text-xs font-black rounded-full uppercase tracking-wider">
                  New Ride Request!
                </span>
                <span className="text-xl font-black text-yellow-400">PKR {pendingRequest.fare_amount}</span>
              </div>

              <div className="space-y-2 text-xs text-slate-300 bg-slate-800/80 p-4 rounded-2xl">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-widest">PICKUP</span>
                  <span className="font-bold text-white">{pendingRequest.pickup_address}</span>
                </div>
                <div className="pt-2 border-t border-slate-700">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-widest">DROPOFF</span>
                  <span className="font-bold text-white">{pendingRequest.dropoff_address}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setPendingRequest(null)}
                  className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-full"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleAcceptRide(pendingRequest.id)}
                  className="py-3 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-full shadow-md"
                >
                  Accept Ride
                </button>
              </div>
            </div>
          )}

          {/* ACTIVE TRIP CONTROLS */}
          {activeTrip ? (
            <div className="p-6 bg-white rounded-[32px] shadow-sm border border-slate-200 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="px-3 py-1 bg-yellow-400/20 text-slate-900 border border-yellow-400/40 text-[10px] font-black rounded-full uppercase tracking-wider">
                  {activeTrip.status}
                </span>
                <span className="text-2xl font-black text-slate-900">PKR {activeTrip.fare_amount}</span>
              </div>

              {activeTrip.rider_info && (
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{activeTrip.rider_info.full_name}</h4>
                    <p className="text-xs text-slate-500">Passenger</p>
                  </div>
                  <a
                    href={`tel:${activeTrip.rider_info.mobile_number}`}
                    className="p-2.5 bg-slate-900 text-white font-bold text-xs rounded-full flex items-center gap-1.5 px-4"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call Rider
                  </a>
                </div>
              )}

              <div className="space-y-2 text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-400 block text-[10px] uppercase tracking-widest">PICKUP</span>
                    <span className="font-semibold">{activeTrip.pickup_address}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 pt-2 border-t border-slate-200">
                  <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-400 block text-[10px] uppercase tracking-widest">DROPOFF</span>
                    <span className="font-semibold">{activeTrip.dropoff_address}</span>
                  </div>
                </div>
              </div>

              {/* Driver Action Workflow */}
              <div className="space-y-2">
                {activeTrip.status === 'accepted' && (
                  <button
                    onClick={handleStartTrip}
                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-base rounded-full shadow-md transition-all"
                  >
                    Start Trip (Passenger Onboard)
                  </button>
                )}

                {activeTrip.status === 'in_progress' && (
                  <button
                    onClick={handleCompleteTrip}
                    className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-base rounded-full shadow-md transition-all"
                  >
                    Complete Trip & Collect Cash (PKR {activeTrip.fare_amount})
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* BENTO METRICS & SUBSCRIPTION STACK */
            <div className="space-y-5">
              {/* Yellow Bento Subscription Card */}
              <div className="bg-yellow-400 rounded-[32px] p-6 text-slate-950 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <span className="bg-black/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-900">
                    Driver Pass Status
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider bg-black/10 px-2.5 py-0.5 rounded-full">
                    {isSubActive ? 'ACTIVE' : 'EXPIRED'}
                  </span>
                </div>
                <div>
                  <h3 className="text-3xl font-black italic uppercase tracking-tight">
                    {activeSub ? activeSub.plan_type : 'NO ACTIVE PASS'}
                  </h3>
                  <p className="text-xs font-bold text-slate-800 mt-1">
                    {isSubActive
                      ? `Valid until ${expiresDate} • 0% Ride Commission`
                      : 'Buy a Daily (PKR 30), Weekly (PKR 200), or Monthly (PKR 500) pass.'}
                  </p>
                </div>

                {!isSubActive && (
                  <button
                    onClick={() => setShowSubModal(true)}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-full shadow-md transition-all mt-1"
                  >
                    Buy Pass Now →
                  </button>
                )}
              </div>

              {/* White Metrics Bento Box */}
              <div className="p-6 bg-white border border-slate-200 rounded-[32px] shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-black text-slate-900">Driver Performance</h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Stats</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Total Rides</span>
                    <span className="text-2xl font-black text-slate-900 mt-1 block">{driver.total_rides || 0}</span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Driver Rating</span>
                    <span className="text-2xl font-black text-slate-900 mt-1 block">⭐ {driver.rating || 5.0}</span>
                  </div>
                </div>

                <button
                  onClick={onOpenRideHistory}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-full transition-all"
                >
                  View Trip Earnings History
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <SubscriptionModal
        isOpen={showSubModal}
        onClose={() => setShowSubModal(false)}
        driverId={driver.id}
        onSuccess={() => {
          checkDriverStatus();
          setSuccessMsg('Subscription active! You can now go online.');
        }}
      />
    </div>
  );
};
