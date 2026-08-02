import React, { useState } from 'react';
import { X, ShieldCheck, FileText, Info, Mail, Phone, MapPin, Home, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'about' | 'terms' | 'privacy' | 'contact';
}

export const InfoPagesModal: React.FC<Props> = ({ isOpen, onClose, defaultTab = 'about' }) => {
  const [activeTab, setActiveTab] = useState<'about' | 'terms' | 'privacy' | 'contact'>(defaultTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 my-6 flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="bg-slate-900 p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-2xl flex items-center justify-center text-slate-950 font-black text-xl italic shadow-sm">
              AC
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                Apni Car Punjab
                <span className="text-[10px] bg-yellow-400 text-slate-950 font-bold px-2 py-0.5 rounded-full uppercase">
                  Official Policy
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Punjab's Premier Zero-Commission Ride Hailing Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
              title="Return to Dashboard"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-slate-100 p-2 border-b border-slate-200 overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('about')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'about'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>About Us</span>
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'terms'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Terms & Conditions</span>
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'privacy'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Privacy Policy</span>
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'contact'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Contact Us</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-700 text-sm leading-relaxed flex-1">
          {/* ABOUT US */}
          {activeTab === 'about' && (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-400/15 border border-yellow-400/30 rounded-2xl">
                <h3 className="text-lg font-black text-slate-900 mb-1">
                  Apni Car — Punjab's Dedicated Transport Network
                </h3>
                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                  Apni Car is engineered specifically for the province of Punjab, Pakistan. Connecting riders directly with verified drivers across Lahore, Faisalabad, Rawalpindi, Multan, Gujranwala, Sargodha, Sialkot, and all 30+ Punjab districts with zero percentage commissions.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 text-yellow-400 font-black flex items-center justify-center text-sm">
                    0%
                  </div>
                  <h4 className="font-bold text-slate-900">Zero Commission for Drivers</h4>
                  <p className="text-xs text-slate-600">
                    Drivers keep 100% of cash fares collected from passengers. Fixed affordable daily, weekly, or monthly subscription passes replace high percentage cuts.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 text-yellow-400 font-black flex items-center justify-center text-sm">
                    PK
                  </div>
                  <h4 className="font-bold text-slate-900">Punjab-Wide Availability</h4>
                  <p className="text-xs text-slate-600">
                    Operating seamlessly in all major urban hubs and district headquarters of Punjab including bikes, auto-rickshaws, mini cars, and luxury sedans.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-base">Key Highlights & Mission</h4>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Manual Verification:</strong> Every driver’s CNIC, Driving Licence, and Vehicle Registration are verified before account activation.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Direct Passenger Cash:</strong> Transparent cash fare payments with zero hidden service markups.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Modern Web Experience:</strong> Fast, responsive experience that works directly on all mobile and desktop browsers.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TERMS & CONDITIONS */}
          {activeTab === 'terms' && (
            <div className="space-y-4 text-xs space-y-3">
              <h3 className="text-base font-black text-slate-900 border-b pb-2 border-slate-200">
                Terms of Service & Operational Rules (Punjab, Pakistan)
              </h3>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">1. User Eligibility</h4>
                <p className="text-slate-600">
                  By accessing or using Apni Car in Punjab, you agree to comply with all local laws and transport regulations. Riders and drivers must provide accurate personal credentials including verified Pakistani phone numbers (+92) and valid CNIC numbers.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">2. Driver Obligations & Verification</h4>
                <p className="text-slate-600">
                  All drivers must possess a valid driving licence issued by the Punjab Transport Authority or relevant Pakistani authority, along with vehicle registration docs and a clear CNIC photo. Providing fraudulent, altered, or expired documents will result in immediate permanent account termination.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">3. Fare Structure & Zero Commission</h4>
                <p className="text-slate-600">
                  Apni Car operates on a zero-commission model. Drivers do not pay per-ride percentages. Instead, drivers subscribe to flat daily, weekly, or monthly access passes. Fares calculated on the platform are paid directly by the rider to the driver in cash upon trip completion.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">4. Safety & Conduct</h4>
                <p className="text-slate-600">
                  Zero tolerance for misconduct, harassment, reckless driving, or intoxication. Riders and drivers may rate each trip, and accounts falling below safety or rating thresholds will be reviewed by Apni Car admins in Lahore.
                </p>
              </div>
            </div>
          )}

          {/* PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <div className="space-y-4 text-xs space-y-3">
              <h3 className="text-base font-black text-slate-900 border-b pb-2 border-slate-200">
                Privacy Policy & Document Data Security
              </h3>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">1. Information Collection</h4>
                <p className="text-slate-600">
                  We collect user account information (full name, email, mobile number), location data (GPS coordinates for matching rides and live map rendering), and driver verification documents (CNIC front/back, driving licence, vehicle registration).
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">2. Secure Encrypted Document Storage</h4>
                <p className="text-slate-600">
                  Uploaded verification images are processed and securely stored in encrypted cloud vaults with metadata stored in secure database records. Documents are strictly accessible for verification and administrative compliance.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">3. Location Data Usage</h4>
                <p className="text-slate-600">
                  GPS location is collected only when the app is active or when a driver is marked 'Online'. Location data is used strictly to calculate trip distances, estimated fares, and render nearby available drivers on the Punjab map interface.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">4. Data Sharing & Third Parties</h4>
                <p className="text-slate-600">
                  We do not sell, trade, or rent personal information or CNIC details to third-party advertisers. Information may only be disclosed if required by law enforcement or transport authorities of Punjab, Pakistan.
                </p>
              </div>
            </div>
          )}

          {/* CONTACT US */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
                <h3 className="text-base font-black text-yellow-400">
                  Apni Car Punjab Support Center
                </h3>
                <p className="text-xs text-slate-300">
                  Have questions, need help with driver document verification, or require assistance with subscriptions? Our team in Lahore is here to assist you.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="flex items-center gap-2.5 p-3 bg-slate-800 rounded-xl">
                    <MapPin className="w-5 h-5 text-yellow-400 shrink-0" />
                    <div>
                      <p className="font-bold text-white">Main Headquarters</p>
                      <p className="text-[11px] text-slate-400">Main Boulevard, Gulberg III, Lahore, Punjab</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-3 bg-slate-800 rounded-xl">
                    <Phone className="w-5 h-5 text-yellow-400 shrink-0" />
                    <div>
                      <p className="font-bold text-white">Punjab Helpline</p>
                      <p className="text-[11px] text-slate-400">+92 42 35789000 / 0300-APNICAR</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-3 bg-slate-800 rounded-xl">
                    <Mail className="w-5 h-5 text-yellow-400 shrink-0" />
                    <div>
                      <p className="font-bold text-white">Support Email</p>
                      <p className="text-[11px] text-slate-400">support@apnicar.pk</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-3 bg-slate-800 rounded-xl">
                    <Info className="w-5 h-5 text-yellow-400 shrink-0" />
                    <div>
                      <p className="font-bold text-white">Operational Region</p>
                      <p className="text-[11px] text-slate-400">All 30+ Punjab Districts & Major Cities</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50 text-xs space-y-2">
                <h4 className="font-bold text-slate-900">Driver Document Verification Escalation</h4>
                <p className="text-slate-600">
                  If your driver account registration or document upload is pending admin review, please send your username and driver CNIC to <strong>verify@apnicar.pk</strong> or WhatsApp <strong>+92 300 1234567</strong> for immediate expedited approval.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Home Button */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500 font-medium">
            Apni Car Punjab • Zero Commission Transport Platform
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Home className="w-4 h-4 text-yellow-400" />
            <span>Return to App</span>
          </button>
        </div>
      </div>
    </div>
  );
};
