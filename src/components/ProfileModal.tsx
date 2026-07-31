import React, { useState } from 'react';
import { User, Driver } from '../types';
import { api } from '../api/client';
import { compressImage } from '../utils/imageCompressor';
import { X, User as UserIcon, Mail, Phone, CheckCircle, Upload, Shield, Car, Sparkles, Smartphone } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  driver: Driver | null;
  onUpdateUser: (updatedUser: User) => void;
}

export const ProfileModal: React.FC<Props> = ({ isOpen, onClose, user, driver, onUpdateUser }) => {
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [msg, setMsg] = useState('');

  if (!isOpen) return null;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      // Compress image client side before uploading
      const compressed = await compressImage(file, 800, 800, 0.85);
      const avatarUrl = await api.uploadFile(compressed);

      const updatedUser = { ...user, avatar_url: avatarUrl };
      onUpdateUser(updatedUser);
      setMsg('Avatar updated successfully!');
    } catch (err: any) {
      setMsg(`Upload failed: ${err.message}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative w-20 h-20 mx-auto mb-3">
            <div className="w-full h-full rounded-2xl bg-emerald-500 text-slate-950 font-black text-3xl flex items-center justify-center overflow-hidden shadow-xl ring-4 ring-emerald-500/20">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
              ) : (
                user.full_name.charAt(0)
              )}
            </div>

            <label className="absolute -bottom-1 -right-1 p-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow-lg cursor-pointer transition-transform transform hover:scale-110">
              <Upload className="w-3.5 h-3.5" />
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
          </div>

          <h3 className="text-xl font-black text-white">{user.full_name}</h3>
          <p className="text-xs text-slate-400">@{user.username} • <span className="capitalize text-emerald-400 font-bold">{user.role}</span></p>
        </div>

        <div className="p-6 space-y-4">
          {msg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold">
              {msg}
            </div>
          )}

          <div className="space-y-3 text-xs text-slate-700">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="font-semibold text-slate-500">Email Address</span>
              <span className="font-bold text-slate-900 flex items-center gap-1">
                {user.email} {user.email_verified && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="font-semibold text-slate-500">Mobile Number</span>
              <span className="font-bold text-slate-900">{user.mobile_number}</span>
            </div>

            {driver && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                <span className="font-bold text-emerald-900 block">Driver Profile</span>
                <p>• Vehicle: {driver.vehicle_brand} {driver.vehicle_model} ({driver.vehicle_reg_number})</p>
                <p>• Category: {driver.vehicle_type}</p>
                <p>• CNIC: {driver.cnic}</p>
                <p>• Approval Status: {driver.is_approved ? '✓ Approved by Admin' : '⏳ Pending Manual Approval'}</p>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md hover:bg-slate-800 transition-all"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
