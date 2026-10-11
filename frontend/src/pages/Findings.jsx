import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  UserCheck,
  X,
  ExternalLink,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export const Findings = () => {
  const [searchParams] = useSearchParams();
  const initialDatasetId = searchParams.get('datasetId') || '';
  const initialFindingId = searchParams.get('id') || '';

  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState([]);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFindings, setTotalFindings] = useState(0);
  const [search, setSearch] = useState('');
  const [datasetId, setDatasetId] = useState(initialDatasetId);
  const [findingType, setFindingType] = useState('');
  const [severity, setSeverity] = useState('');
  const [reviewStatus, setReviewStatus] = useState('');

  // Finding Detail Modal
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [modalReviewStatus, setModalReviewStatus] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [modalReason, setModalReason] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Fetch datasets for filter
  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const res = await api.get('/datasets');
        if (res.data.success) {
          setDatasets(res.data.datasets);
        }
      } catch (err) {}
    };
    fetchDatasets();
  }, []);

  // Fetch findings
  const fetchFindings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 20,
        search,
        datasetId,
        findingType,
        severity,
        reviewStatus,
      });

      const res = await api.get(`/findings?${params.toString()}`);
      if (res.data.success) {
        setFindings(res.data.findings);
        setTotalPages(res.data.totalPages);
        setTotalFindings(res.data.total);

        // If specific ID requested in URL
        if (initialFindingId && !selectedFinding) {
          const match = res.data.findings.find((f) => f._id === initialFindingId);
          if (match) openFindingDetails(match._id);
        }
      }
    } catch (err) {
      toast.error('Failed to load audit findings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFindings();
  }, [page, search, datasetId, findingType, severity, reviewStatus]);

  const openFindingDetails = async (id) => {
    try {
      setModalLoading(true);
      const res = await api.get(`/findings/${id}`);
      if (res.data.success) {
        setSelectedFinding(res.data.finding);
        setModalReviewStatus(res.data.finding.reviewStatus);
        setModalNotes(res.data.finding.reviewNotes || '');
        setModalReason(res.data.finding.resolutionReason || '');
      }
    } catch (err) {
      toast.error('Failed to load finding details');
    } finally {
      setModalLoading(false);
    }
  };

  const handleUpdateReview = async () => {
    if (!selectedFinding) return;
    setUpdatingStatus(true);
    const toastId = toast.loading('Recording reviewer decision in audit trail...');

    try {
      const res = await api.put(`/reviews/findings/${selectedFinding._id}`, {
        status: modalReviewStatus,
        notes: modalNotes,
        reason: modalReason,
      });

      if (res.data.success) {
        toast.success(`Finding status updated to "${modalReviewStatus}"`, { id: toastId });
        setSelectedFinding(res.data.finding);
        fetchFindings();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update review status', { id: toastId });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleFetchAiExplanation = async () => {
    if (!selectedFinding) return;
    setAiLoading(true);
    const toastId = toast.loading('Generating AI audit intelligence briefing...');

    try {
      const res = await api.get(`/findings/${selectedFinding._id}/ai-explanation`);
      if (res.data.success) {
        toast.success('Audit intelligence briefing generated', { id: toastId });
        setSelectedFinding((prev) => ({ ...prev, aiExplanation: res.data.explanation }));
      }
    } catch (err) {
      toast.error('Failed to generate briefing', { id: toastId });
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Audit Findings & Irregularities</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Candidate duplicate disbursements, statistical anomalies, and evidence-linked procedural exceptions
        </p>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[200px] flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search findings by ID, title, explanation..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 outline-none"
            />
          </div>

          <select
            value={datasetId}
            onChange={(e) => {
              setDatasetId(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-none"
          >
            <option value="">All Datasets</option>
            {datasets.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={findingType}
            onChange={(e) => {
              setFindingType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-none"
          >
            <option value="">All Finding Types</option>
            <option value="duplicate_exact">Exact Duplicate Candidate</option>
            <option value="duplicate_possible">Possible Near-Date Duplicate</option>
            <option value="unusual_amount_outlier">Statistical Outlier (IQR)</option>
            <option value="rapid_payments">Rapid Frequent Payments</option>
            <option value="negative_reversal">Negative / Journal Reversal</option>
            <option value="missing_critical_data">Missing Critical Reference</option>
          </select>

          <select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-none"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={reviewStatus}
            onChange={(e) => {
              setReviewStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-none"
          >
            <option value="">All Review Statuses</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Under Investigation">Under Investigation</option>
            <option value="Confirmed Issue">Confirmed Issue</option>
            <option value="Dismissed">Dismissed</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          {totalFindings} findings identified
        </div>
      </div>

      {/* Findings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Finding ID</th>
                <th className="py-3 px-4">Title & Detection Method</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Dataset</th>
                <th className="py-3 px-4">Amount (₹)</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Review Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="py-4 px-4 bg-slate-50/50"></td>
                  </tr>
                ))
              ) : findings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs text-slate-400">
                    No findings match the current filter criteria.
                  </td>
                </tr>
              ) : (
                findings.map((f) => (
                  <tr key={f._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {f.findingId}
                    </td>
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="font-bold text-slate-900 truncate">{f.title}</div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        Method: {f.detectionMethod}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium">
                        {f.findingType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-[120px] truncate">
                      {f.datasetId?.name || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {f.amountInvolved ? `₹${Number(f.amountInvolved).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          f.severity === 'critical'
                            ? 'bg-rose-100 text-rose-800'
                            : f.severity === 'high'
                            ? 'bg-orange-100 text-orange-800'
                            : f.severity === 'medium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {f.severity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          f.reviewStatus === 'Confirmed Issue'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : f.reviewStatus === 'Under Investigation'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : f.reviewStatus === 'Resolved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : f.reviewStatus === 'Dismissed'
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {f.reviewStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => openFindingDetails(f._id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-md transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL INVESTIGATION MODAL */}
      {selectedFinding && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-extrabold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                    {selectedFinding.findingId}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      selectedFinding.severity === 'critical'
                        ? 'bg-rose-100 text-rose-800'
                        : selectedFinding.severity === 'high'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedFinding.severity}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{selectedFinding.title}</h3>
                <p className="text-xs text-slate-500 font-mono">
                  Method: {selectedFinding.detectionMethod} • Source Rows: [
                  {(selectedFinding.sourceRowReferences || []).join(', ')}]
                </p>
              </div>

              <button
                onClick={() => setSelectedFinding(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto py-5 space-y-5 text-xs text-slate-700">
              {/* Finding Narrative Explanation */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 block text-xs uppercase tracking-wider">
                  Detection Summary
                </span>
                <p className="leading-relaxed">{selectedFinding.explanation}</p>
                {selectedFinding.amountInvolved && (
                  <div className="pt-2 text-sm font-extrabold text-slate-900">
                    Expenditure Under Audit: ₹
                    {Number(selectedFinding.amountInvolved).toLocaleString('en-IN')}
                  </div>
                )}
              </div>

              {/* Supporting Transaction Records Table */}
              {selectedFinding.affectedTransactions?.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 mb-2 uppercase tracking-wider text-[11px]">
                    Supporting Transaction Evidence (Source Rows)
                  </h4>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Row</th>
                          <th className="py-2 px-3">Txn ID</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Payee / Vendor</th>
                          <th className="py-2 px-3">Amount</th>
                          <th className="py-2 px-3">Reference (UTR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {selectedFinding.affectedTransactions.map((tx) => (
                          <tr key={tx._id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-400">
                              {tx.sourceRowNumber || '—'}
                            </td>
                            <td className="py-2 px-3 font-mono">{tx.transactionId || '—'}</td>
                            <td className="py-2 px-3 whitespace-nowrap">{tx.date || '—'}</td>
                            <td className="py-2 px-3 font-medium">{tx.vendor}</td>
                            <td className="py-2 px-3 font-bold">
                              ₹{Number(tx.amount || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                              {tx.paymentReference || 'None'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* AI Audit Intelligence Briefing */}
              <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-teal-950 text-xs">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    <span>Audit Intelligence Briefing</span>
                  </div>
                  <button
                    onClick={handleFetchAiExplanation}
                    disabled={aiLoading}
                    className="text-[11px] font-bold text-teal-700 hover:text-teal-800 underline disabled:opacity-50"
                  >
                    {aiLoading ? 'Synthesizing...' : 'Re-generate Questions'}
                  </button>
                </div>

                <div className="text-slate-800 leading-relaxed whitespace-pre-line text-xs font-sans">
                  {selectedFinding.aiExplanation ||
                    'Click "Re-generate Questions" to generate targeted investigative questions for the departmental auditor.'}
                </div>
              </div>

              {/* Reviewer Action Center */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-slate-600" />
                  <span>Record Human Audit Decision</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Review Status
                    </label>
                    <select
                      value={modalReviewStatus}
                      onChange={(e) => setModalReviewStatus(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none"
                    >
                      <option value="Pending Review">Pending Review</option>
                      <option value="Under Investigation">Under Investigation</option>
                      <option value="Confirmed Issue">Confirmed Issue</option>
                      <option value="Dismissed">Dismissed (False Positive / Procedural)</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Reason / Resolution Summary
                    </label>
                    <input
                      type="text"
                      value={modalReason}
                      onChange={(e) => setModalReason(e.target.value)}
                      placeholder="e.g. Verified against separate work orders"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Auditor Reviewer Notes
                  </label>
                  <textarea
                    rows={2}
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    placeholder="Enter audit notes for the permanent record..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none resize-none bg-white"
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400">
                Action recorded in immutable audit log
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedFinding(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition"
                >
                  Close
                </button>
                <button
                  onClick={handleUpdateReview}
                  disabled={updatingStatus}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs transition disabled:opacity-50"
                >
                  {updatingStatus ? 'Saving...' : 'Save Audit Decision'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
