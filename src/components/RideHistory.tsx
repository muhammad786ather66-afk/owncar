import React, { useState, useEffect } from 'react';
import { Trip, Role } from '../types';
import { api } from '../api/client';
import { MapPin, Calendar, CheckCircle2, XCircle, Clock, Star, Download, ArrowLeft } from 'lucide-react';

interface Props {
  userId: string;
  role: Role;
  onBack: () => void;
}

export const RideHistory: React.FC<Props> = ({ userId, role, onBack }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [userId, role]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.getTripHistory(userId, role);
      setTrips(res.trips || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors text-slate-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Trip History</h2>
          <p className="text-xs text-slate-500">View past completed and cancelled rides</p>
        </div>
      </div>

      <div className="space-y-4">
        {trips.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 p-6 text-slate-400">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="font-semibold text-sm">No trip history found</p>
          </div>
        ) : (
          trips.map((t) => (
            <div key={t.id} className="p-5 bg-white rounded-3xl shadow-sm border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                    t.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : t.status === 'cancelled'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {t.status}
                </span>

                <div className="text-right">
                  <span className="text-lg font-black text-slate-900">PKR {t.fare_amount}</span>
                  <span className="text-[10px] text-slate-400 block">{new Date(t.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-700 bg-slate-50 p-3 rounded-2xl">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="font-semibold">{t.pickup_address}</span>
                </div>
                <div className="flex items-start gap-2 pt-1 border-t border-slate-200/60">
                  <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="font-semibold">{t.dropoff_address}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Distance: {t.distance_km} km ({t.vehicle_type})</span>
                {t.driver_rating && (
                  <span className="flex items-center gap-1 font-bold text-amber-600">
                    <Star className="w-3.5 h-3.5 fill-amber-400" /> {t.driver_rating} Stars
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
