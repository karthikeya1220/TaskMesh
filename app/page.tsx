'use client';

import { useState, useEffect } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard/stats');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, []);

  if (!stats) return <div className="p-8">Loading dashboard...</div>;

  return (
    <div className="p-page_padding flex flex-col gap-section_gap max-w-[1600px] w-full">
      {/* Top Metrics Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-component_gap">
        <div className="bg-surface-container border border-outline-variant p-4 rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-on-surface-variant font-label-mono text-label-mono">TOTAL JOBS</span>
            <span className="material-symbols-outlined text-primary" data-icon="list">list</span>
          </div>
          <div className="mt-4">
            <h3 className="font-display text-display data-tabular">{stats.jobs.total}</h3>
          </div>
        </div>

        <div className="bg-surface-container border border-primary/30 p-4 rounded-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="flex justify-between items-start relative z-10">
            <span className="text-on-surface-variant font-label-mono text-label-mono">RUNNING JOBS</span>
            <div className="w-2 h-2 rounded-full bg-primary status-pulse"></div>
          </div>
          <div className="mt-4 relative z-10">
            <h3 className="font-display text-display text-primary data-tabular">{stats.jobs.running}</h3>
          </div>
        </div>

        <div className="bg-surface-container border border-outline-variant p-4 rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-on-surface-variant font-label-mono text-label-mono">QUEUED JOBS</span>
            <span className="material-symbols-outlined text-tertiary" data-icon="hourglass_empty">hourglass_empty</span>
          </div>
          <div className="mt-4">
            <h3 className="font-display text-display data-tabular">{stats.jobs.queued + stats.jobs.pending}</h3>
          </div>
        </div>

        <div className="bg-surface-container border border-error/20 p-4 rounded-xl flex flex-col justify-between bg-error-container/5">
          <div className="flex justify-between items-start">
            <span className="text-on-surface-variant font-label-mono text-label-mono">FAILED JOBS</span>
            <span className="material-symbols-outlined text-error" data-icon="error">error</span>
          </div>
          <div className="mt-4">
            <h3 className="font-display text-display text-error data-tabular">{stats.jobs.failed}</h3>
          </div>
        </div>

        <div className="bg-surface-container border border-outline-variant p-4 rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-on-surface-variant font-label-mono text-label-mono">ACTIVE WORKERS</span>
            <span className="material-symbols-outlined text-on-surface-variant" data-icon="groups">groups</span>
          </div>
          <div className="mt-4">
            <h3 className="font-display text-display data-tabular">{stats.workers.active}</h3>
          </div>
        </div>
      </section>

      {/* Bottom Section: Tables and Status */}
      <section className="grid grid-cols-12 gap-component_gap">
        <div className="col-span-12 xl:col-span-8 bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
          <div className="p-4 border-b border-outline-variant flex justify-between items-center">
            <h2 className="font-h2 text-h2">Recent Job Executions</h2>
            <Link href="/jobs" className="text-body-sm text-primary hover:underline">View all jobs</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="px-6 py-3 font-label-mono text-label-mono text-on-surface-variant">JOB ID</th>
                  <th className="px-6 py-3 font-label-mono text-label-mono text-on-surface-variant">NAME</th>
                  <th className="px-6 py-3 font-label-mono text-label-mono text-on-surface-variant">STATUS</th>
                  <th className="px-6 py-3 font-label-mono text-label-mono text-on-surface-variant">UPDATED</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {stats.recent_jobs?.map((job: any) => (
                  <tr key={job.id} className="hover:bg-surface-variant/50 transition-colors cursor-pointer group">
                    <td className="px-6 py-3 font-label-mono text-label-mono text-primary">#{job.id.substring(0,8)}</td>
                    <td className="px-6 py-3 font-body-md text-body-md">{job.name}</td>
                    <td className="px-6 py-3"><StatusBadge status={job.status} /></td>
                    <td className="px-6 py-3 font-body-sm text-body-sm text-on-surface-variant">
                      {new Date(job.updated_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Worker Status Panel */}
        <div className="col-span-12 xl:col-span-4 bg-surface-container border border-outline-variant rounded-xl p-4 flex flex-col">
          <h2 className="font-h2 text-h2 mb-4">Worker Health</h2>
          <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            {stats.recent_workers?.map((worker: any) => (
              <div key={worker.id} className={`flex items-center justify-between p-2 rounded ${worker.status === 'OFFLINE' ? 'bg-error-container/10 border border-error/10' : 'hover:bg-surface-variant/30'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${worker.status === 'OFFLINE' ? 'bg-error' : worker.status === 'BUSY' ? 'bg-orange-500' : 'bg-primary'}`}></div>
                  <div className="flex flex-col">
                    <span className={`font-body-md text-body-md ${worker.status === 'OFFLINE' ? 'text-error' : ''}`}>{worker.name}</span>
                    <span className={`text-label-mono text-[10px] ${worker.status === 'OFFLINE' ? 'text-error' : 'text-on-surface-variant'}`}>{worker.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
