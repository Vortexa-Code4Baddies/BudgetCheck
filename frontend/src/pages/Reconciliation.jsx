import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Scale,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  History,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export const Reconciliation = () => {
  const [searchParams] = useSearchParams();
  const preselectedDatasetId = searchParams.get('datasetId') || '';

  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState(preselectedDatasetId);
  const [selectedDataset, setSelectedDataset] = useState(null);

  // Form inputs
  const [officialTotal, setOfficialTotal] = useState('');
  const [reportingPeriod, setReportingPeriod] = useState('FY 2025-26 Q4');
  const [department, setDepartment] = useState('All Departments');
  const [notes, setNotes] = useState('');
  const [reconciling, setReconciling] = useState(false);

  // Results
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Fetch all user datasets
  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const res = await api.get('/datasets');
        if (res.data.success) {
          setDatasets(res.data.datasets);
          if (preselectedDatasetId) {
            setSelectedDatasetId(preselectedDatasetId);
          } else if (res.data.datasets.length > 0 && !selectedDatasetId) {
            setSelectedDatasetId(res.data.datasets[0]._id);
          }
        }
      } catch (err) {
        toast.error('Failed to load datasets');
      }
    };
    fetchDatasets();
  }, [preselectedDatasetId]);

  // Update selectedDataset object when selectedDatasetId changes
  useEffect(() => {
    if (selectedDatasetId && datasets.length > 0) {
      const match = datasets.find((d) => d._id === selectedDatasetId);
      setSelectedDataset(match || null);
      if (match?.reportingPeriod) {
        setReportingPeriod(match.reportingPeriod);
      }
    }
  }, [selectedDatasetId, datasets]);

  // Fetch reconciliation history
  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const url = selectedDatasetId
        ? `/reconciliation?datasetId=${selectedDatasetId}`
        : '/reconciliation';
      const res = await api.get(url);
      if (res.data.success) {
        setHistory(res.data.reconciliations);
      }
    } catch (err) {
      // Ignore initial history failure
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedDatasetId]);

  const handleExecuteReconciliation = async (e) => {
    e.preventDefault();
    if (!selectedDatasetId) {
      toast.error('Please select an expenditure dataset');
      return;
    }

    if (!officialTotal || isNaN(Number(officialTotal))) {
      toast.error('Please enter a valid numeric official expenditure total');
      return;
    }

    setReconciling(true);
    const toastId = toast.loading('Calculating zero-drift financial reconciliation in integer paise...');

    try {
      const res = await api.post('/reconciliation/execute', {
        datasetId: selectedDatasetId,
        officialTotal: Number(officialTotal),
        reportingPeriod,
        department,
        notes,
      });

      if (res.data.success) {
        setResult(res.data);
        toast.success('Reconciliation executed successfully!', { id: toastId });
        fetchHistory();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reconciliation failed', { id: toastId });
    } finally {
      setReconciling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Reconciliation</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Benchmark recorded ledger disbursements against official state allocations with precise arithmetic
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Parameters */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5 lg:col-span-1">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            Reconciliation Parameters
          </h3>

          <form onSubmit={handleExecuteReconciliation} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Target Dataset
              </label>
              <select
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-600 outline-none"
              >
                <option value="">-- Select Dataset --</option>
                {datasets.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.totalRows} rows)
                  </option>
                ))}
              </select>
            </div>

            {selectedDataset && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="text-slate-500">Calculated Recorded Total:</div>
                <div className="text-lg font-extrabold text-slate-900">
                  ₹{Number(selectedDataset.totalRecordedAmount || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-teal-700 font-medium">
                  {selectedDataset.validRows} compliant vouchers ready
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Official Treasury Allocation (₹ INR) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={officialTotal}
                onChange={(e) => setOfficialTotal(e.target.value)}
                placeholder="e.g. 32000000"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 outline-none font-medium"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Official budget ceiling or treasury disbursement sanction
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Reporting Period
              </label>
              <input
                type="text"
                value={reportingPeriod}
                onChange={(e) => setReportingPeriod(e.target.value)}
                placeholder="FY 2025-26 Q4"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Department Scope
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none"
              >
                <option value="All Departments">All Departments (Consolidated)</option>
                <option value="Public Works & Infrastructure">Public Works & Infrastructure</option>
                <option value="Public Health & Family Welfare">Public Health & Family Welfare</option>
                <option value="School Education & Literacy">School Education & Literacy</option>
                <option value="Municipal Administration & Urban Development">Municipal Administration</option>
                <option value="Information Technology & e-Governance">IT & e-Governance</option>
                <option value="Water Resources & Sanitation">Water Resources & Sanitation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Auditor Notes / Reference
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. State Treasury Q4 Gazetted Allocation Sanction #4102"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={reconciling || !selectedDatasetId}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-xs transition disabled:opacity-50"
            >
              <Scale className="w-4 h-4" />
              <span>{reconciling ? 'Calculating Paired Totals...' : 'Execute Reconciliation'}</span>
            </button>
          </form>
        </div>

        {/* Right Section: Results & Department Breakdown */}
        <div className="space-y-6 lg:col-span-2">
          {result ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Reconciliation Analysis Result</h3>
                  <p className="text-xs text-slate-500">
                    Formula: <span className="font-mono font-semibold">Difference = Official Total − Recorded Total</span>
                  </p>
                </div>

                <span
                  className={`inline-flex px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                    result.reconciliation.status === 'matched'
                      ? 'bg-emerald-100 text-emerald-800'
                      : result.reconciliation.status === 'discrepancy'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {result.reconciliation.status.replace('_', ' ')}
                </span>
              </div>

              {/* 3 Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Official Figure</span>
                  <span className="text-lg font-extrabold text-slate-900">
                    ₹{Number(result.reconciliation.officialTotal).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Supplied benchmark</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Recorded Total</span>
                  <span className="text-lg font-extrabold text-teal-700">
                    ₹{Number(result.reconciliation.recordedTotal).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {result.reconciliation.transactionsCount} vouchers summed
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Variance (Difference)</span>
                  <span
                    className={`text-lg font-extrabold ${
                      result.reconciliation.difference !== 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    ₹{Number(result.reconciliation.difference).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {result.reconciliation.percentageDifference}% relative variance
                  </span>
                </div>
              </div>

              {/* Explanation Text */}
              <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 text-xs text-slate-800 space-y-1">
                <div className="font-bold text-teal-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  Audit Reconciliation Finding
                </div>
                <p className="leading-relaxed text-slate-700">{result.reconciliation.explanation}</p>
                <p className="text-[11px] text-slate-500 italic mt-2">
                  * Note: Discrepancies represent candidate accounting timing variances or unauthorized disbursements requiring documentary audit verification, not predetermined wrongdoing.
                </p>
              </div>

              {/* Department Breakdown Table */}
              {result.departmentBreakdown?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Department-wise Disbursement Sums
                  </h4>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Department</th>
                          <th className="py-2.5 px-3">Vouchers</th>
                          <th className="py-2.5 px-3 text-right">Disbursed Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {result.departmentBreakdown.map((row) => (
                          <tr key={row._id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-medium text-slate-900">{row._id || 'Unassigned'}</td>
                            <td className="py-2.5 px-3 text-slate-500">{row.count}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              ₹{Number(row.totalAmount).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
              <Scale className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700 mb-1">No Active Reconciliation Executed</h3>
              <p className="text-xs max-w-sm mx-auto">
                Supply official allocation totals on the left panel to execute comparative analysis against recorded disbursements.
              </p>
            </div>
          )}

          {/* Historical Reconciliation Runs */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              <span>Historical Reconciliation Runs</span>
            </h3>

            {loadingHistory ? (
              <div className="h-24 bg-slate-50 rounded-xl animate-pulse"></div>
            ) : history.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                No past reconciliation runs found for this dataset.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Scope</th>
                      <th className="py-2.5 px-3">Official</th>
                      <th className="py-2.5 px-3">Recorded</th>
                      <th className="py-2.5 px-3">Difference</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {history.map((h) => (
                      <tr key={h._id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">
                          {new Date(h.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">{h.department}</td>
                        <td className="py-2.5 px-3">₹{Number(h.officialTotal).toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          ₹{Number(h.recordedTotal).toLocaleString('en-IN')}
                        </td>
                        <td
                          className={`py-2.5 px-3 font-bold ${
                            h.difference !== 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          ₹{Number(h.difference).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              h.status === 'matched'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {h.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
