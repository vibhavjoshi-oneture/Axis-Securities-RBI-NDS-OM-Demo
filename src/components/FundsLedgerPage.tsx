import React, { useState } from 'react';
import { Landmark, ArrowUpRight, ArrowDownRight, Coins, Plus, FileClock, ShieldAlert } from 'lucide-react';
import Modal from './Modal';
import type { FundsSummary, LedgerEntry } from '../types';

interface FundsLedgerPageProps {
  funds: FundsSummary;
  ledger: LedgerEntry[];
  onAddFunds: (amount: number) => Promise<void>;
}

export default function FundsLedgerPage({ funds, ledger, onAddFunds }: FundsLedgerPageProps) {
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState(1000000); // 10L Default
  const [depositLoading, setDepositLoading] = useState(false);

  function formatCurrency(val: number) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  }

  function formatTimestamp(timeStr: string) {
    try {
      return new Date(timeStr).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return timeStr;
    }
  }

  async function handleAddFundsSubmit() {
    setDepositLoading(true);
    try {
      await onAddFunds(depositAmount);
      setDepositOpen(false);
    } catch (err) {
      alert('Deposit simulation failed.');
    } finally {
      setDepositLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Balances Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Available G-Sec Balance</span>
            <strong className="text-2xl font-extrabold font-mono tracking-tight text-white block mt-2">
              {formatCurrency(funds.availableBalance)}
            </strong>
          </div>
          <button 
            onClick={() => setDepositOpen(true)}
            className="p-3 bg-blue-600 hover:bg-blue-700 rounded-2xl text-white transition-all shadow-md shadow-blue-500/20"
            title="Simulate Deposit"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Blocked Balance (Escrow)</span>
            <strong className="text-2xl font-extrabold text-slate-600 font-mono block mt-2">
              {formatCurrency(funds.blockedBalance)}
            </strong>
          </div>
          <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Utilized Balance Today</span>
            <strong className="text-2xl font-extrabold text-slate-850 font-mono block mt-2">
              {formatCurrency(funds.usedToday)}
            </strong>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl text-slate-400">
            <FileClock className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Split Ledger Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">Double-Entry Split Ledger</h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Sovereign settlement funds transaction history logs</p>
          </div>
          
          <button
            onClick={() => setDepositOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Simulate Add Funds
          </button>
        </div>

        {ledger.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Landmark className="w-12 h-12 text-slate-300 stroke-1 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">Ledger is Empty</h3>
            <p className="text-xs text-slate-400 font-semibold max-w-xs mx-auto">
              No transactions have been recorded on this ledger yet. Modify available balances using simulated tools.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="py-4 px-6">Transaction Date</th>
                  <th className="py-4 px-4">Classification</th>
                  <th className="py-4 px-4">Reference ID</th>
                  <th className="py-4 px-4 text-right">Amount</th>
                  <th className="py-4 px-4 text-right">Running Balance</th>
                  <th className="py-4 px-6 text-right">Sovereign Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm font-semibold text-slate-600">
                {ledger.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/40 transition-colors">
                    
                    <td className="py-4 px-6 text-xs text-slate-500 font-medium font-mono">
                      {formatTimestamp(entry.timestamp)}
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {['DEPOSIT', 'RELEASE'].includes(entry.type) ? (
                          <span className="p-1 bg-emerald-50 text-emerald-600 rounded-lg"><ArrowUpRight className="w-3.5 h-3.5" /></span>
                        ) : (
                          <span className="p-1 bg-rose-50 text-rose-600 rounded-lg"><ArrowDownRight className="w-3.5 h-3.5" /></span>
                        )}
                        <div>
                          <div className="font-bold text-slate-800 text-xs">{entry.type}</div>
                          <div className="text-[10px] text-slate-400 font-semibold">{entry.description}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono text-xs text-slate-400">
                      {entry.referenceId}
                    </td>

                    <td className={`py-4 px-4 text-right font-mono font-bold ${
                      ['DEPOSIT', 'RELEASE'].includes(entry.type) ? 'text-emerald-600' : 'text-slate-800'
                    }`}>
                      {['DEPOSIT', 'RELEASE'].includes(entry.type) ? '+' : '-'}{formatCurrency(entry.amount)}
                    </td>

                    <td className="py-4 px-4 text-right font-mono font-bold text-slate-700">
                      {formatCurrency(entry.balanceAfter)}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded">
                        {entry.status}
                      </span>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Demat Ledger alert footers */}
      <div className="flex items-start gap-3 bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
        <ShieldAlert className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-800 leading-relaxed font-medium">
          <strong>Sovereign Balance Reservation:</strong> In compliance with the Reserve Bank of India (RBI) securities matching code, G-Sec trading funds are maintained on a <strong>dedicated secure ledger</strong>. These balances are completely isolated from standard equity segments. Additions/Withdrawals must map directly to NDS-OM clearing corporations.
        </p>
      </div>

      {/* Deposit Simulation Modal */}
      <Modal title="Simulate G-Sec Funds Deposit" open={depositOpen} onClose={() => setDepositOpen(false)}>
        <div className="space-y-5">
          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
            Select a mock value to deposit into the G-Sec trading wallet. This allows testing validation controls in the place order form.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Deposit Amount (INR)</label>
            <input
              type="number"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold outline-none focus:bg-white focus:border-blue-500 transition-all font-mono"
              value={depositAmount}
              onChange={(e) => setDepositAmount(Number(e.target.value))}
            />
          </div>

          <div className="flex gap-2">
            {[100000, 500000, 1000000, 5000000].map((amt) => (
              <button
                key={amt}
                onClick={() => setDepositAmount(amt)}
                className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-[11px] font-bold text-slate-600 rounded-lg transition-all"
              >
                +{formatCurrency(amt)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleAddFundsSubmit}
              disabled={depositLoading}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-50"
            >
              {depositLoading ? 'Depositing...' : 'Simulate UPI/IMPS Deposit'}
            </button>
            <button
              onClick={() => setDepositOpen(false)}
              className="py-3 px-5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-bold transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
