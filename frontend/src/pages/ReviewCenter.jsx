import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Clock,
  Search,
  CheckCircle2,
  AlertOctagon,
  Eye,
  FileText,
  UserCheck,
  X,
  History,
  ShieldAlert,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export const ReviewCenter = () => {
  const [activeTab, setActiveTab] = useState('Pending Review');
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({});

  // Review Modal
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);

  const statuses = [
    'Pending Review',
    'Under Investigation',
    'Confirmed Issue',
    'Dismissed',
    'Resolved',
  ];

  const fetchFindingsByTab = async (statusTab) => {
    try {
      setLoading(true);
      const res = await api.get(`/findings?reviewStatus=${encodeURIComponent(statusTab)}&limit=50`);
      if (res.data.success) {
        setFindings(res.data.findings);
        // Build counts map
        const countMap = {};
        res.data.statusCounts?.forEach((sc) => {
          countMap[sc._id] = sc.count;
        });
        setCounts(countMap);
      }
    } catch (err) {
      toast.error('Failed to load review items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFindingsByTab(activeTab);
  }, [activeTab]);

  const openReviewModal = async (finding) => {
    setSelectedFinding(finding);
    setStatus(finding.reviewStatus);
    setNotes(finding.reviewNotes || '');
    setReason(finding.resolutionReason || '');

    try {
      const res = await api.get(`/reviews/findings/${finding._id}/history`);
      if (res.data.success) {
        setHistory(res.data.history);
      }
    } catch (e) {
      setHistory([]);
    }
  };

  const handleSaveDecision = async () => {
    if (!selectedFinding) return;
    setSaving(true);
    const toastId = toast.loading('Recording review decision in permanent audit log...');

    try {
      const res = await api.put(`/reviews/findings/${selectedFinding._id}`, {
        status,
        notes,
        reason,
      });

      if (res.data.success) {
        toast.success(`Finding transitioned to "${status}"`, { id: toastId });
        setSelectedFinding(null);
        fetchFindingsByTab(activeTab);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update review status', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Review Center</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Dedicated forensic auditor workbench to inspect supporting records and record official decisions
        </p>
      </div>

      {/* Status Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        {statuses.map((st) => {
          const isActive = activeTab === st;
          const count = counts[st] || 0;
          return (
            <button
              key={st}
              onClick={() => setActiveTab(st)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{st}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Review Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 bg-white rounded-2xl border border-slate-200 animate-pulse"></div>
          ))}
        </div>
      ) : findings.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
          <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700 mb-1">No Findings in "{activeTab}"</h3>
          <p className="text-xs max-w-sm mx-auto">
            All candidate items under this classification have been reviewed or none were flagged.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {findings.map((f) => (
            <div
              key={f._id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-slate-900">{f.findingId}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      f.severity === 'critical'
                        ? 'bg-rose-100 text-rose-800'
                        : f.severity === 'high'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {f.severity}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-1 mb-1">
                  {f.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                  {f.explanation}
                </p>

                <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between text-slate-500">
                    <span>Disbursement:</span>
                    <span className="font-bold text-slate-900">
                      {f.amountInvolved ? `₹${Number(f.amountInvolved).toLocaleString('en-IN')}` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Source Rows:</span>
                    <span className="font-mono text-[11px] text-slate-700">
                      [{(f.sourceRowReferences || []).join(', ')}]
                    </span>
                  </div>
                </div>

                {f.reviewNotes && (
                  <div className="mt-2 text-[11px] text-slate-600 bg-teal-50/50 p-2 rounded-lg border border-teal-100 italic">
                    Note: "{f.reviewNotes}"
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">
                  {new Date(f.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => openReviewModal(f)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
                >
                  Review Decision
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal Workbench */}
      {selectedFinding && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8 flex flex-col">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                  {selectedFinding.findingId}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{selectedFinding.title}</h3>
              </div>
              <button
                onClick={() => setSelectedFinding(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs text-slate-700 overflow-y-auto max-h-[60vh]">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block mb-1">
                  Evidence Background
                </span>
                <p className="leading-relaxed">{selectedFinding.explanation}</p>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Target Review Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none font-semibold"
                >
                  {statuses.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Justification / Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Reason for Confirmation or Dismissal
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Verified measurement book signed by executive engineer"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none"
                />
              </div>

              {/* Auditor Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Official Auditor Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter detailed review commentary for the audit dossier..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none resize-none"
                ></textarea>
              </div>

              {/* History trail */}
              {history.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <h4 className="font-bold text-slate-900 mb-2 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>Prior Review History</span>
                  </h4>
                  <div className="space-y-2">
                    {history.map((h, i) => (
                      <div key={i} className="p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-600">
                        <div className="flex justify-between font-semibold text-slate-900">
                          <span>
                            {h.previousStatus} → {h.newStatus}
                          </span>
                          <span className="text-slate-400 font-mono">
                            {new Date(h.actionTimestamp).toLocaleString()}
                          </span>
                        </div>
                        {h.notes && <div className="mt-1 text-slate-700 italic">"{h.notes}"</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedFinding(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDecision}
                disabled={saving}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs transition disabled:opacity-50"
              >
                {saving ? 'Recording...' : 'Commit Review Decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
