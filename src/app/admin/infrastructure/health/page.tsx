"use client";

import { useEffect, useState } from "react";
import { HealthStateV2 } from "@/utils/diagnostics";

export default function HealthPage() {
  const [health, setHealth] = useState<HealthStateV2 | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const fetchHealth = async (runAll = false) => {
    setRunning(runAll);
    try {
      const res = await fetch(`/api/admin/health?force=true${runAll ? "&runAll=true" : ""}`);
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRunning(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const getStatusIcon = (status: string) => {
    switch(status) {
      case "OK": return "🟢";
      case "ERROR": return "🔴";
      case "WARNING": return "🟡";
      default: return "⚪";
    }
  };

  const timeAgo = (ms: number) => {
    const diff = Math.floor((Date.now() - ms) / 1000);
    if (diff < 60) return `${diff} sec ago`;
    if (diff < 3600) return `${Math.floor(diff/60)} min ago`;
    return "long ago";
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Diagnostics...</div>;
  if (!health) return <div className="p-8 text-center text-red-500">Failed to load diagnostics</div>;

  const renderTable = (title: string, data: any, detailsKeySuffix: string) => (
    <div className="border rounded-lg overflow-hidden bg-white mb-6">
      <div className="bg-slate-100 px-4 py-3 font-semibold border-b">{title}</div>
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 border-b">
          <tr>
            <th className="px-4 py-3 font-medium">Component</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Details / Latency</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {Object.entries(data).filter(([k]) => !k.endsWith('Details')).map(([key, status]) => {
            const details = data[`${key}${detailsKeySuffix}`] || {};
            return (
              <tr key={key} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium capitalize">{key}</td>
                <td className="px-4 py-3">
                  {getStatusIcon(status as string)} {status as string}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {details.message || "OK"} 
                  {details.latencyMs ? ` (${details.latencyMs}ms)` : ""}
                  {details.missing && (
                    <div className="text-xs text-red-500 mt-1">
                      Missing: {details.missing.join(", ")}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Diagnostics</h1>
          <p className="text-sm text-slate-500 mt-1">
            Application Version: {health.appVersion} | Last Checked: {timeAgo(health.lastChecked)}
          </p>
        </div>
        <button 
          onClick={() => fetchHealth(true)} 
          disabled={running}
          className="bg-black text-white px-4 py-2 rounded-md hover:bg-slate-800 disabled:opacity-50"
        >
          {running ? "Running Tests..." : "Run All Tests"}
        </button>
      </div>

      {renderTable("Infrastructure Health", health.infrastructure, "Details")}
      {renderTable("Provider Health", health.providers, "Details")}

    </div>
  );
}
