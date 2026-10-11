import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileText,
  Download,
  Plus,
  Database,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export const Reports = () => {
  const [searchParams] = useSearchParams();
  const preselectedDatasetId = searchParams.get('datasetId') || '';

  const [datasets, setDatasets] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Form State
  const [selectedDatasetId, setSelectedDatasetId] = useState(preselectedDatasetId);
  const [reportType, setReportType] = useState('Comprehensive Audit');
  const [customTitle, setCustomTitle] = useState('');

  const fetchDatasetsAndReports = async () => {
    try {
      setLoading(true);
      const [dsRes, repRes] = await Promise.all([
        api.get('/datasets'),
        api.get('/reports'),
      ]);

      if (dsRes.data.success) {
        setDatasets(dsRes.data.datasets);
        if (!selectedDatasetId && dsRes.data.datasets.length > 0) {
          setSelectedDatasetId(dsRes.data.datasets[0]._id);
        }
      }

      if (repRes.data.success) {
        setReports(repRes.data.reports);
      }
    } catch (err) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasetsAndReports();
  }, [preselectedDatasetId]);

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    if (!selectedDatasetId) {
      toast.error('Please select an analyzed dataset');
      return;
    }

    setGenerating(true);
    const toastId = toast.loading('Compiling multi-page PDF audit report with PDFKit...');

    try {
      const res = await api.post('/reports/generate', {
        datasetId: selectedDatasetId,
        reportType,
        title: customTitle,
      });

      if (res.data.success) {
        toast.success('Official PDF audit report generated successfully!', { id: toastId });
        fetchDatasetsAndReports();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Report generation failed', { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (reportId, fileName) => {
    const toastId = toast.loading('Downloading authenticated PDF audit dossier...');
    try {
      const response = await api.get(`/reports/${reportId}/download`, {
        responseType: 'blob',
      });

      // Create blob download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', fileName || 'fiscora_audit_report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('Download complete!', { id: toastId });
    } catch (err) {
      toast.error('Failed to download report', { id: toastId });
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Audit Intelligence Reports</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Generate and download executive PDF audit dossiers with methodology disclosures and findings evidence
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generate Report Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5 lg:col-span-1">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-teal-600" />
            <span>Generate New PDF Report</span>
          </h3>

          <form onSubmit={handleGenerateReport} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Select Analyzed Dataset
              </label>
              <select
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-600 outline-none"
              >
                <option value="">-- Choose Dataset --</option>
                {datasets.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.totalRows} rows)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Report Format
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white outline-none"
              >
                <option value="Comprehensive Audit">Comprehensive Audit (All Sections)</option>
                <option value="Reconciliation Summary">Reconciliation Summary Report</option>
                <option value="Anomaly & Duplicates">Anomaly & Duplicate Disclosures</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Custom Dossier Title (Optional)
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g. State Treasury Q4 Capital Works Audit Dossier"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none"
              />
            </div>

            <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200 text-[11px] text-teal-900 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                Audit Report Standard
              </div>
              <p>
                PDF reports generated include executive summary KPI cards, data validation metrics, reconciliation discrepancies, findings tables with source row references, and formal audit disclaimers.
              </p>
            </div>

            <button
              type="submit"
              disabled={generating || !selectedDatasetId}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs transition disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              <span>{generating ? 'Compiling PDF Dossier...' : 'Generate Official PDF'}</span>
            </button>
          </form>
        </div>

        {/* Generated Reports Table */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            Generated Audit Dossiers
          </h3>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-700 mb-1">No Reports Generated Yet</h4>
              <p className="text-xs max-w-sm mx-auto">
                Use the generator panel to create your first official PDF audit report.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Report ID</th>
                    <th className="py-3 px-4">Dossier Title & Dataset</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {reports.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {r.reportId}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 truncate">{r.title}</div>
                        <div className="text-[11px] text-slate-400 truncate">{r.datasetName}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">
                          {r.reportType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono whitespace-nowrap">
                        {(r.fileSize / 1024).toFixed(1)} KB
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDownload(r._id, r.fileName)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
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
  );
};
