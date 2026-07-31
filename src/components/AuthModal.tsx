import React, { useState } from 'react';
import { api } from '../api/client';
import { compressImage } from '../utils/imageCompressor';
import { User, Driver, VehicleType } from '../types';
import { X, UserCheck, ShieldCheck, Upload, Mail, Lock, Phone, User as UserIcon, Car, Key, Sparkles, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User, driver?: Driver | null, token?: string) => void;
}

export const AuthModal: React.FC<Props> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register_rider' | 'register_driver' | 'verify'>('login');
  const [role, setRole] = useState<'rider' | 'driver'>('rider');

  // Login Form
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');

  // Common Register Form
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  // Driver Register Form
  const [cnic, setCnic] = useState('');
  const [drivingLicence, setDrivingLicence] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('Mini');
  const [vehicleBrand, setVehicleBrand] = useState('Suzuki');
  const [vehicleModel, setVehicleModel] = useState('Alto');
  const [vehicleColour, setVehicleColour] = useState('White');
  const [vehicleRegNumber, setVehicleRegNumber] = useState('');

  // Uploaded Document URLs
  const [cnicFrontUrl, setCnicFrontUrl] = useState('');
  const [cnicBackUrl, setCnicBackUrl] = useState('');
  const [licenceDocUrl, setLicenceDocUrl] = useState('');
  const [regDocUrl, setRegDocUrl] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  // Email Verification Code
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [demoCodeNotice, setDemoCodeNotice] = useState('');

  // Status & Error
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: 'cnic_front' | 'cnic_back' | 'licence' | 'reg') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(targetField);
    setError('');
    try {
      // Compress image client side before sending to Cloudflare R2 proxy
      const compressed = await compressImage(file, 1280, 1280, 0.8);
      const url = await api.uploadFile(compressed);

      if (targetField === 'cnic_front') setCnicFrontUrl(url);
      if (targetField === 'cnic_back') setCnicBackUrl(url);
      if (targetField === 'licence') setLicenceDocUrl(url);
      if (targetField === 'reg') setRegDocUrl(url);
    } catch (err: any) {
      setError(`Failed to upload document: ${err.message}`);
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.login(usernameOrEmail, password);
      localStorage.setItem('apnicar_token', res.token);
      onLoginSuccess(res.user, res.driver, res.token);
      onClose();
    } catch (err: any) {
      if (err.data?.requires_verification) {
        setVerifyEmail(err.data.email || usernameOrEmail);
        setActiveTab('verify');
        setError('Email not verified yet. Please enter your verification code.');
      } else {
        setError(err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterRider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.registerRider({
        username,
        full_name: fullName,
        email,
        password: regPassword,
        mobile_number: mobileNumber,
      });
      setVerifyEmail(email);
      if (res.verification_code_demo) {
        setVerifyCode(res.verification_code_demo);
        setDemoCodeNotice(`Verification Code generated: ${res.verification_code_demo}`);
      }
      setActiveTab('verify');
      setSuccessMsg('Registration successful! Please verify your email code.');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.registerDriver({
        username,
        full_name: fullName,
        email,
        password: regPassword,
        mobile_number: mobileNumber,
        cnic,
        driving_licence: drivingLicence,
        vehicle_type: vehicleType,
        vehicle_brand: vehicleBrand,
        vehicle_model: vehicleModel,
        vehicle_colour: vehicleColour,
        vehicle_reg_number: vehicleRegNumber,
        cnic_front_url: cnicFrontUrl,
        cnic_back_url: cnicBackUrl,
        licence_doc_url: licenceDocUrl,
        registration_doc_url: regDocUrl,
      });
      setVerifyEmail(email);
      if (res.verification_code_demo) {
        setVerifyCode(res.verification_code_demo);
        setDemoCodeNotice(`Verification Code generated: ${res.verification_code_demo}`);
      }
      setActiveTab('verify');
      setSuccessMsg('Driver registered! Verify email code to proceed (Requires Admin Approval).');
    } catch (err: any) {
      setError(err.message || 'Driver registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.verifyEmail(verifyEmail, verifyCode);
      setSuccessMsg('Email verified successfully! Please log in now.');
      setActiveTab('login');
      setUsernameOrEmail(verifyEmail);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 my-8">
        {/* Top Header */}
        <div className="bg-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Apni Car Auth</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            {activeTab === 'login' && 'Welcome Back'}
            {activeTab === 'register_rider' && 'Register as Rider'}
            {activeTab === 'register_driver' && 'Register as Driver'}
            {activeTab === 'verify' && 'Verify Email Address'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {activeTab === 'login' && 'Sign in using your Username or Email address'}
            {activeTab === 'register_rider' && 'Book 0% commission rides across Pakistan'}
            {activeTab === 'register_driver' && 'Earn 100% of your cash fares with flat subscriptions'}
            {activeTab === 'verify' && 'Enter 6-digit verification pin sent to your email'}
          </p>

          {/* Tab Selector */}
          {activeTab !== 'verify' && (
            <div className="grid grid-cols-3 gap-1 bg-slate-800/90 p-1 rounded-xl mt-4 border border-slate-700">
              <button
                onClick={() => { setActiveTab('login'); setError(''); }}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'login' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => { setActiveTab('register_rider'); setError(''); }}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'register_rider' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign Up Rider
              </button>
              <button
                onClick={() => { setActiveTab('register_driver'); setError(''); }}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'register_driver' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign Up Driver
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {successMsg}
            </div>
          )}

          {/* LOGIN TAB */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Username or Email</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. hassan_rider or hassan@gmail.com"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Sign In'}
              </button>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-800 mb-1">Demo Quick Accounts:</p>
                <p>• <strong>Rider:</strong> hassan_rider / rider123</p>
                <p>• <strong>Driver:</strong> tariq_driver / driver123</p>
                <p>• <strong>Admin:</strong> admin / admin123</p>
              </div>
            </form>
          )}

          {/* REGISTER RIDER TAB */}
          {activeTab === 'register_rider' && (
            <form onSubmit={handleRegisterRider} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="hassan_rider"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Hassan Ahmed"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="hassan@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="+923001234567"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Confirm Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 mt-2"
              >
                {loading ? 'Creating Rider Account...' : 'Register as Rider'}
              </button>
            </form>
          )}

          {/* REGISTER DRIVER TAB */}
          {activeTab === 'register_driver' && (
            <form onSubmit={handleRegisterDriver} className="space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                <span className="font-bold">Note for Drivers:</span> Driver accounts require CNIC & Licence details and will undergo manual Admin approval.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="tariq_driver"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Tariq Mehmood"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="tariq@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="+923019876543"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">CNIC Number</label>
                  <input
                    type="text"
                    required
                    placeholder="35202-1234567-1"
                    value={cnic}
                    onChange={(e) => setCnic(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Licence Number</label>
                  <input
                    type="text"
                    required
                    placeholder="LHR-987654"
                    value={drivingLicence}
                    onChange={(e) => setDrivingLicence(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Vehicle Specs */}
              <div className="pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-900 block mb-2">Vehicle Information</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Vehicle Type</label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Bike">Bike (Apni Bike)</option>
                      <option value="Rickshaw">Auto Rickshaw</option>
                      <option value="Mini">Mini Car (Alto/Cultus)</option>
                      <option value="Go">Go Comfort (City/WagonR)</option>
                      <option value="Business">Business Executive</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Reg Number</label>
                    <input
                      type="text"
                      required
                      placeholder="LEA-5678"
                      value={vehicleRegNumber}
                      onChange={(e) => setVehicleRegNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Brand (Suzuki)"
                    value={vehicleBrand}
                    onChange={(e) => setVehicleBrand(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                  <input
                    type="text"
                    placeholder="Model (Alto 2022)"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                  <input
                    type="text"
                    placeholder="Colour (White)"
                    value={vehicleColour}
                    onChange={(e) => setVehicleColour(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              {/* Compressed Document Uploads */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="text-xs font-bold text-slate-900 block">
                  Upload Documents (Auto-Compressed for R2 Bucket)
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="p-2 border border-dashed border-slate-300 hover:border-emerald-500 rounded-xl flex items-center gap-2 cursor-pointer bg-slate-50">
                    <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{uploadingDoc === 'cnic_front' ? 'Compressing...' : cnicFrontUrl ? '✓ CNIC Front' : 'CNIC Front'}</span>
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'cnic_front')} className="hidden" />
                  </label>
                  <label className="p-2 border border-dashed border-slate-300 hover:border-emerald-500 rounded-xl flex items-center gap-2 cursor-pointer bg-slate-50">
                    <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{uploadingDoc === 'cnic_back' ? 'Compressing...' : cnicBackUrl ? '✓ CNIC Back' : 'CNIC Back'}</span>
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'cnic_back')} className="hidden" />
                  </label>
                  <label className="p-2 border border-dashed border-slate-300 hover:border-emerald-500 rounded-xl flex items-center gap-2 cursor-pointer bg-slate-50">
                    <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{uploadingDoc === 'licence' ? 'Compressing...' : licenceDocUrl ? '✓ Licence Doc' : 'Licence Photo'}</span>
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'licence')} className="hidden" />
                  </label>
                  <label className="p-2 border border-dashed border-slate-300 hover:border-emerald-500 rounded-xl flex items-center gap-2 cursor-pointer bg-slate-50">
                    <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{uploadingDoc === 'reg' ? 'Compressing...' : regDocUrl ? '✓ Reg Book' : 'Vehicle Reg Book'}</span>
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'reg')} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Confirm Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 mt-2"
              >
                {loading ? 'Creating Driver Profile...' : 'Register Driver & Upload Docs'}
              </button>
            </form>
          )}

          {/* VERIFY EMAIL TAB */}
          {activeTab === 'verify' && (
            <form onSubmit={handleVerifyEmail} className="space-y-4">
              {demoCodeNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-bold">
                  {demoCodeNotice}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={verifyEmail}
                  onChange={(e) => setVerifyEmail(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">6-Digit Verification Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xl font-mono font-bold tracking-widest text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify Email Address'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
