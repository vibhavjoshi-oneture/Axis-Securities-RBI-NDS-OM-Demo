import React, { useState, useEffect, useMemo } from 'react';
import { Landmark, ShieldAlert, BadgeInfo, Coins, SendHorizontal, AlertCircle } from 'lucide-react';
import Modal from './Modal';
import ValidationChecklist from './ValidationChecklist';
import type { Security, FundsSummary, OrderSide } from '../types';

interface PlaceOrderPageProps {
  securities: Security[];
  selectedSecurity: Security;
  setSelectedSecurity: (security: Security) => void;
  funds: FundsSummary;
  positions: Array<{ isin: string; quantity: number }>;
  onPlaceOrder: (input: {
    isin: string;
    side: OrderSide;
    quantity: number;
    limitPrice: number;
  }) => Promise<{
    status: string;
    message: string;
    fixRequest?: string | null;
    fixResponse?: string | null;
  } | null>;
}

export default function PlaceOrderPage({
  securities,
  selectedSecurity,
  setSelectedSecurity,
  funds,
  positions,
  onPlaceOrder
}: PlaceOrderPageProps) {
  const [side, setSide] = useState<OrderSide>('BUY');
  const [quantity, setQuantity] = useState(100000);
  const [limitPrice, setLimitPrice] = useState(selectedSecurity.ask);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastFixRequest, setLastFixRequest] = useState<string | null>(null);
  const [lastFixResponse, setLastFixResponse] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [riskConfirmed, setRiskConfirmed] = useState(false);

  // Sync price when security or side changes
  useEffect(() => {
    setLimitPrice(side === 'BUY' ? selectedSecurity.ask : selectedSecurity.bid);
    setMessage(null);
  }, [selectedSecurity, side]);

  // Real-time Estimated Order Value (Face Value is ₹100, quoted price is per ₹100 face value)
  const estimatedValue = useMemo(() => {
    return Math.round((quantity * limitPrice) / 100);
  }, [quantity, limitPrice]);

  // Position quantity currently held by client for sell safety
  const heldQuantity = useMemo(() => {
    const pos = positions.find(p => p.isin === selectedSecurity.isin);
    return pos ? pos.quantity : 0;
  }, [positions, selectedSecurity]);

  // Validation Checks
  const checks = useMemo(() => {
    const isQtyMultiple = quantity % selectedSecurity.lotSize === 0;
    
    // Check price tick alignment (converting to integer units based on tick exponent to avoid JS floating point errors)
    const multiplier = 100000;
    const priceUnits = Math.round(limitPrice * multiplier);
    const tickUnits = Math.round(selectedSecurity.tickSize * multiplier);
    const isPriceTick = tickUnits > 0 ? (priceUnits % tickUnits === 0) : true;

    const isBelowLimit = estimatedValue <= 10000000;
    
    let hasSufficientFundsOrStock = false;
    if (side === 'BUY') {
      hasSufficientFundsOrStock = estimatedValue <= funds.availableBalance;
    } else {
      hasSufficientFundsOrStock = quantity <= heldQuantity;
    }

    return [
      { 
        ok: true, 
        label: 'Limit Order Only', 
        help: 'All retail orders on NDS-OM are routed as Limit orders for price security.' 
      },
      { 
        ok: isQtyMultiple, 
        label: `Quantity Multiple of Lot Size (${selectedSecurity.lotSize})`, 
        help: `The quantity must align with G-Sec multiples of ${selectedSecurity.lotSize.toLocaleString('en-IN')}.` 
      },
      { 
        ok: isPriceTick, 
        label: `Price Increments of Tick Size (${selectedSecurity.tickSize})`, 
        help: `Pricing must fit mandatory exchange ticks of ${selectedSecurity.tickSize.toFixed(4)}.` 
      },
      { 
        ok: isBelowLimit, 
        label: 'Retail Cap Check (< ₹1 Crore)', 
        help: 'Manual order validation limit strictly capped at 1 Crore INR for retail security.' 
      },
      { 
        ok: hasSufficientFundsOrStock, 
        label: side === 'BUY' ? 'Sufficient G-Sec Funds Available' : 'Sufficient Demat Portfolio Stock Available', 
        help: side === 'BUY' 
          ? `Requires ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(estimatedValue)} available G-Sec funds.`
          : `Requires at least ${quantity.toLocaleString('en-IN')} units of this G-Sec in your portfolio (Held: ${heldQuantity.toLocaleString('en-IN')} units).` 
      },
    ];
  }, [quantity, limitPrice, selectedSecurity, side, funds.availableBalance, heldQuantity, estimatedValue]);

  const allChecksPass = useMemo(() => {
    return checks.every(c => c.ok);
  }, [checks]);

  async function submit() {
    setLoading(true);
    setMessage(null);
    setLastFixRequest(null);
    setLastFixResponse(null);
    try {
      const response = await onPlaceOrder({
        isin: selectedSecurity.isin,
        side,
        quantity,
        limitPrice
      });
      if (response) {
        setIsSuccess(response.status === 'ACCEPTED');
        setMessage(`${response.status}: ${response.message}`);
        setLastFixRequest(response.fixRequest || null);
        setLastFixResponse(response.fixResponse || null);
      }
    } catch (err) {
      setIsSuccess(false);
      setMessage(err instanceof Error ? err.message : 'Order submission failed.');
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(val: number) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      
      {/* Col 1 & 2: Order Ticket Form */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Balance Status Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-slate-100 p-4 rounded-xl flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600"><Coins className="w-5.5 h-5.5" /></div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Available Balance</span>
              <strong className="text-base font-extrabold text-slate-700 font-mono">
                {formatCurrency(funds.availableBalance)}
              </strong>
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-4 rounded-xl flex items-center gap-3">
            <div className="p-2.5 bg-slate-50 rounded-xl text-slate-500"><Coins className="w-5.5 h-5.5" /></div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Blocked Balance</span>
              <strong className="text-base font-extrabold text-slate-600 font-mono">
                {formatCurrency(funds.blockedBalance)}
              </strong>
            </div>
          </div>
        </div>

        {/* The Ticket Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
          
          <div className="flex items-center justify-between pb-4 border-b border-slate-50">
            <div>
              <h2 className="text-base font-bold text-slate-800">Limit Order Ticket</h2>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Sovereign Debt manual allocation panel</p>
            </div>
            <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 border border-blue-100/50 rounded px-2.5 py-1 tracking-wider uppercase">
              LIMIT ONLY
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Security selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Sovereign G-Sec</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl py-3 px-4 text-sm font-semibold outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-700"
                value={selectedSecurity.isin}
                onChange={(e) => {
                  const sec = securities.find(s => s.isin === e.target.value);
                  if (sec) setSelectedSecurity(sec);
                }}
              >
                {securities.map((sec) => (
                  <option key={sec.isin} value={sec.isin}>
                    {sec.name} ({sec.isin})
                  </option>
                ))}
              </select>
            </div>

            {/* Buy / Sell side */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Allocation Side</label>
              <div className="grid grid-cols-2 p-1 bg-slate-50 rounded-xl border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setSide('BUY')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    side === 'BUY' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  BUY
                </button>
                <button
                  type="button"
                  onClick={() => setSide('SELL')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    side === 'SELL' 
                      ? 'bg-rose-600 text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  SELL
                </button>
              </div>
            </div>

            {/* Quantity Face Value */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Quantity (Face Value)</label>
                {side === 'SELL' && (
                  <span className="text-[10px] font-bold text-slate-400">Demat Stocks: {heldQuantity.toLocaleString('en-IN')} units</span>
                )}
              </div>
              <input
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl py-3 px-4 text-sm font-semibold outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-mono text-slate-700"
                type="number"
                step={selectedSecurity.lotSize}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
              
              {/* Presets */}
              <div className="flex gap-2">
                {[
                  { label: '+10K', val: 10000 },
                  { label: '+1L', val: 100000 },
                  { label: '+5L', val: 500000 },
                  { label: '+10L', val: 1000000 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setQuantity(prev => prev + item.val)}
                    className="px-3 py-1 bg-slate-50 hover:bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600 border border-slate-200/40 transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setQuantity(selectedSecurity.lotSize)}
                  className="px-3 py-1 bg-slate-50 hover:bg-slate-100 rounded-lg text-[10px] font-bold text-slate-400 border border-slate-200/40 transition-colors"
                >
                  Min Lot
                </button>
              </div>
            </div>

            {/* Price input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Limit Price (per ₹100 face)</label>
              <div className="relative">
                <input
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl py-3 px-4 text-sm font-semibold outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-mono text-slate-700"
                  type="number"
                  step={selectedSecurity.tickSize}
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(Number(e.target.value))}
                />
                
                {/* Tick Adjusters */}
                <div className="absolute right-2 top-1.5 flex gap-1">
                  <button
                    type="button"
                    onClick={() => setLimitPrice(prev => Number((prev - selectedSecurity.tickSize).toFixed(4)))}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm transition-colors"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => setLimitPrice(prev => Number((prev + selectedSecurity.tickSize).toFixed(4)))}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold block">
                NDS-OM Depth: Bid {selectedSecurity.bid.toFixed(4)} / Ask {selectedSecurity.ask.toFixed(4)}
              </span>
            </div>

          </div>

          {/* Real-time metrics summary */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimated Value</span>
              <strong className="text-lg font-extrabold text-blue-700 font-mono tracking-tight">{formatCurrency(estimatedValue)}</strong>
            </div>
            
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lot Multiplier</span>
              <strong className="text-sm font-bold text-slate-600 font-mono">{selectedSecurity.lotSize.toLocaleString('en-IN')} units</strong>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mandatory Tick Size</span>
              <strong className="text-sm font-bold text-slate-600 font-mono">{selectedSecurity.tickSize.toFixed(4)} INR</strong>
            </div>
          </div>

          {/* Action triggers */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              disabled={!allChecksPass}
              onClick={() => {
                setRiskConfirmed(false);
                setReviewOpen(true);
              }}
              className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none text-white rounded-xl text-sm font-bold shadow-md shadow-blue-50 transition-all flex items-center gap-2 hover:-translate-y-0.5"
            >
              <SendHorizontal className="w-4 h-4" /> Review G-Sec Order
            </button>
            <button
              type="button"
              onClick={() => {
                setQuantity(100000);
                setLimitPrice(side === 'BUY' ? selectedSecurity.ask : selectedSecurity.bid);
              }}
              className="px-5 py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-sm font-bold transition-all"
            >
              Reset Ticket
            </button>
          </div>
        </div>

        {/* Toast / Status banner */}
        {message ? (
          <div className={`p-4 border rounded-2xl flex items-start gap-3 animate-fade-in ${
            isSuccess 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
              : 'bg-rose-50 border-rose-100 text-rose-800'
          }`}>
            <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isSuccess ? 'text-emerald-500' : 'text-rose-500'}`} />
            <div>
              <h4 className="text-sm font-bold leading-none">{isSuccess ? 'Order Accepted!' : 'Submission Error'}</h4>
              <p className="text-xs font-semibold mt-1 leading-relaxed">{message}</p>
            </div>
          </div>
        ) : null}


      </div>

      {/* Col 3: Validation Panel Sidebar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm h-fit space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-blue-600" /> Pre-Submission Checks
          </h3>
          <p className="text-xs text-slate-400 font-semibold mt-1">Automatic G-Sec regulatory validations checklist</p>
        </div>

        <ValidationChecklist checks={checks} />

        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 flex items-start gap-2.5">
          <BadgeInfo className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-blue-800 leading-relaxed font-semibold">
            All manual limit checks are processed directly on our AppSync mock Matching engine before submission to prevent NDS-OM rejections.
          </p>
        </div>
      </div>

      {/* Review Modal */}
      <Modal title="Confirm Government Security Allocation" open={reviewOpen} onClose={() => setReviewOpen(false)}>
        <div className="space-y-6">
          <div className="text-center pb-4 border-b border-slate-50">
            <span className={`inline-block px-3 py-1 text-xs font-extrabold uppercase rounded-full mb-2 ${
              side === 'BUY' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
            }`}>
              {side === 'BUY' ? 'BUY LIMIT' : 'SELL LIMIT'}
            </span>
            <h3 className="text-xl font-bold text-slate-800">{selectedSecurity.name}</h3>
            <p className="text-xs font-mono text-slate-400 mt-1">{selectedSecurity.isin}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block text-[10px] uppercase">Face Value Qty</span>
              <strong className="text-slate-700 text-sm font-mono block mt-1">{quantity.toLocaleString('en-IN')} units</strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block text-[10px] uppercase">Limit Price</span>
              <strong className="text-slate-700 text-sm font-mono block mt-1">{limitPrice.toFixed(4)} ₹</strong>
            </div>

            <div className="col-span-2 p-4 bg-blue-50/40 rounded-xl border border-blue-100/50 text-center">
              <span className="text-blue-500 block text-[10px] uppercase font-bold">Estimated Order Capital</span>
              <strong className="text-blue-700 text-xl font-extrabold font-mono block mt-1">{formatCurrency(estimatedValue)}</strong>
            </div>
          </div>

          {/* Compliance risk check */}
          <div className="flex items-start gap-3 p-3.5 border border-slate-100 rounded-xl hover:bg-slate-50/50 transition-all">
            <input 
              type="checkbox" 
              id="risk-check" 
              checked={riskConfirmed}
              onChange={(e) => setRiskConfirmed(e.target.checked)}
              className="mt-1 h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
            />
            <label htmlFor="risk-check" className="text-[11px] text-slate-500 leading-relaxed font-semibold cursor-pointer">
              <strong>Demo Securities Risk Disclaimer:</strong> I acknowledge that prices on NDS-OM are indicative, this is a manual Limit order quoted per ₹100 face value, and settlement is on T+1.
            </label>
          </div>

          {/* Action submit button */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              disabled={!riskConfirmed || loading}
              onClick={async () => {
                setReviewOpen(false);
                await submit();
              }}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-50 transition-colors"
            >
              {loading ? 'Submitting to NDS-OM...' : 'Submit Sovereign Order'}
            </button>
            <button
              type="button"
              className="py-3 px-5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-sm font-bold transition-all"
              onClick={() => setReviewOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
