import React, { useState } from 'react';
import { SubscriptionPlan } from '../types';
import { api } from '../api/client';
import { Sparkles, CheckCircle2, ShieldCheck, Zap, X, CreditCard, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  driverId: string;
  isApproved?: boolean;
  onSuccess: () => void;
}

export const SubscriptionModal: React.FC<Props> = ({ isOpen, onClose, driverId, isApproved = true, onSuccess }) => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('weekly');
  const [paymentMethod, setPaymentMethod] = useState<'JazzCash' | 'Easypaisa' | 'Card'>('Easypaisa');
  const [mobileNumber, setMobileNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const plans = [
    {
      id: 'daily' as SubscriptionPlan,
      name: 'Daily Pass',
      price: 'PKR 30',
      amount: 30,
      period: '24 Hours Unlimited',
      description: 'Ideal for occasional drivers testing the waters',
      badge: 'Flexible',
    },
    {
      id: 'weekly' as SubscriptionPlan,
      name: 'Weekly Pass',
      price: 'PKR 200',
      amount: 200,
      period: '7 Days Unlimited',
      description: 'Save 5% compared to daily pass',
      badge: 'Popular',
    },
    {
      id: 'monthly' as SubscriptionPlan,
      name: 'Monthly Pass',
      price: 'PKR 500',
      amount: 500,
      period: '30 Days Unlimited',
      description: 'Best Value! Pure profit with 0% ride commissions',
      badge: 'Best Value',
    },
  ];

  const handlePurchase = async () => {
    if (!isApproved) {
      alert('Your driver account is pending approval by Admin. You can purchase a plan once your account is approved.');
      setError('Account Pending Approval: Admin approval required before pass purchase.');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Payment Gateway Callback
      const txRef = `TXN-${paymentMethod.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;

      await api.purchaseSubscription(driverId, selectedPlan, paymentMethod, txRef);

      // Trigger celebrate confetti
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> 100% Zero Ride Commission
          </div>
          <h2 className="text-2xl font-black tracking-tight">Activate Driver Subscription</h2>
          <p className="text-sm text-slate-400 mt-1">
            Pay a low fixed pass fee and keep 100% of all cash fares from riders!
          </p>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {!isApproved && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs font-bold text-amber-900 flex items-start gap-2.5">
              <span className="text-base leading-none">⚠️</span>
              <div>
                <p className="font-black text-sm text-amber-950">Driver Account Pending Admin Approval</p>
                <p className="font-medium text-amber-800 mt-0.5">
                  Your driver registration details and verification documents are currently under review by Admin. You will be able to purchase a subscription pass once your account is approved.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Select Plan Cards */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Choose Your Subscription Plan
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {plans.map((p) => {
                const isSelected = selectedPlan === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlan(p.id)}
                    className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {p.badge && (
                      <span
                        className={`absolute -top-2.5 right-3 px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {p.badge}
                      </span>
                    )}

                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{p.name}</h4>
                      <p className="text-2xl font-black text-slate-900 my-1">{p.price}</p>
                      <p className="text-xs font-semibold text-emerald-700">{p.period}</p>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100 leading-tight">
                      {p.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Select Payment Method
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['Easypaisa', 'JazzCash', 'Card'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-3 px-3 rounded-xl font-bold text-xs border-2 transition-all flex items-center justify-center gap-2 ${
                    paymentMethod === method
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  {method}
                </button>
              ))}
            </div>

            {(paymentMethod === 'Easypaisa' || paymentMethod === 'JazzCash') && (
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  {paymentMethod} Account Mobile Number
                </label>
                <input
                  type="tel"
                  placeholder="0300 1234567"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="pt-2">
            <button
              onClick={handlePurchase}
              disabled={isProcessing}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base rounded-2xl shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all transform active:scale-98 disabled:opacity-50"
            >
              <Lock className="w-5 h-5" />
              {isProcessing
                ? 'Processing Payment Callback...'
                : `Pay ${plans.find((p) => p.id === selectedPlan)?.price} & Go Online`}
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Protected by SSL. Instant activation with zero percentage commissions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
