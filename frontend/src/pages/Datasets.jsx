import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Database,
  Search,
  Plus,
  Trash2,
  Play,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export const Datasets = () => {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [analyzingId, setAnalyzingId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const navigate = useNavigate();

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/datasets?search=${encodeURIComponent(search)}`);
      if (res.data.success) {
        setDatasets(res.data.datasets);
      }
    } catch (err) {
      toast.error('Failed to load datasets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, [search]);

  const handleRunAnalysis = async (datasetId) => {
    setAnalyzingId(datasetId);
    const toastId = toast.loading('Executing audit intelligence algorithms (IQR + Duplicates)...');
    try {
      const res = await api.post(`/datasets/${datasetId}/analyze`);
      if (res.data.success) {
        toast.success(res.data.message || 'Analysis complete!', { id: toastId });
        fetchDatasets();
        navigate(`/findings?datasetId=${datasetId}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Analysis execution failed', { id: toastId });
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleDelete = async (datasetId) => {
    try {
      const res = await api.delete(`/datasets/${datasetId}`);
      if (res.data.success) {
        toast.success('Dataset and associated records deleted permanently');
        setDeleteConfirmId(null);
        fetchDatasets();
      }
    } catch (err) {
      toast.error('Failed to delete dataset');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Expenditure Datasets</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage uploaded public spending files, review data validation health, and trigger audit screenings
          </p>
        </div>

        <Link
          to="/upload"
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-xs transition w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Dataset</span>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search datasets by name or filename..."
          className="block w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-600 outline-none"
        />
      </div>

      {/* Dataset Grid / Table */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-white rounded-2xl border border-slate-200 animate-pulse"></div>
          ))}
        </div>
      ) : datasets.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Database className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 mb-1">No Datasets Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Upload a financial CSV file or load the sample demonstration dataset to get started.
          </p>
          <Link
            to="/upload"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg inline-block transition"
          >
            Upload Now
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {datasets.map((d) => {
            const isAnalyzed = d.analysisStatus === 'analyzed';
            const isAnalyzing = analyzingId === d._id;
            const issuesCount = (d.validationSummary?.issues || []).length;

            return (
              <div
                key={d._id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs hover:border-slate-300 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700 shrink-0">
                      <Database className="w-5 h-5" />
                    </div>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isAnalyzed
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {d.analysisStatus}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1">
                    {d.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                    {d.originalFilename}
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-4 p-3 bg-slate-50 rounded-xl text-xs">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                        Recorded Spend
                      </span>
                      <span className="font-bold text-slate-900">
                        ₹{Number(d.totalRecordedAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                        Rows Validated
                      </span>
                      <span className="font-bold text-slate-900">
                        {d.validRows} / {d.totalRows}
                      </span>
                    </div>
                  </div>

                  {issuesCount > 0 && (
                    <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{issuesCount} data quality notices flagged</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/datasets/${d._id}`}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                    >
                      Inspect Data
                    </Link>

                    <button
                      onClick={() => handleRunAnalysis(d._id)}
                      disabled={isAnalyzing}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
                      title="Run duplicate and outlier detection"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isAnalyzing ? 'Analyzing...' : isAnalyzed ? 'Re-run' : 'Analyze'}</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setDeleteConfirmId(d._id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                    title="Delete Dataset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Delete Dataset Permanently?</h3>
            <p className="text-xs text-slate-500 mb-6">
              This action will cascade and delete all associated transaction rows, reconciliation records, flagged findings, review notes, and generated PDF reports.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
