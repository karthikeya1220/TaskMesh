'use client';

import { useState, useEffect } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import { JobSubmitForm } from '@/components/JobSubmitForm';
import Link from 'next/link';

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async (optimisticJob?: any) => {
    if (optimisticJob) {
      setJobs((prev) => [optimisticJob, ...prev]);
      return; // Return early, don't fetch right now since we are optimistic
    }
    
    try {
      const res = await fetch('/api/jobs');
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const data = await res.json();
      setJobs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-page_padding flex flex-col gap-section_gap max-w-[1600px] w-full">
      <div className="flex justify-between items-center">
        <h1 className="font-h1 text-h1">Jobs Management</h1>
      </div>

      <div className="grid grid-cols-12 gap-component_gap">
        <div className="col-span-12 xl:col-span-8 bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
          <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
            <h2 className="font-h2 text-h2">All Jobs</h2>
            <button onClick={fetchJobs} className="text-body-sm text-primary hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">refresh</span> Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="px-6 py-3 font-label-mono text-label-mono text-on-surface-variant">JOB ID</th>
                  <th className="px-6 py-3 font-label-mono text-label-mono text-on-surface-variant">NAME</th>
                  <th className="px-6 py-3 font-label-mono text-label-mono text-on-surface-variant">PRIORITY</th>
                  <th className="px-6 py-3 font-label-mono text-label-mono text-on-surface-variant">STATUS</th>
                  <th className="px-6 py-3 font-label-mono text-label-mono text-on-surface-variant">ATTEMPTS</th>
                  <th className="px-6 py-3 font-label-mono text-label-mono text-on-surface-variant">CREATED</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-surface-variant/50 transition-colors group">
                    <td className="px-6 py-3 font-label-mono text-label-mono text-primary">
                      <Link href={`/jobs/${job.id}`} className="hover:underline">#{job.id.substring(0,8)}</Link>
                    </td>
                    <td className="px-6 py-3 font-body-md text-body-md">{job.name}</td>
                    <td className="px-6 py-3 font-label-mono text-label-mono">
                      <span className={job.priority <= 3 ? 'text-error' : job.priority <= 6 ? 'text-orange-400' : 'text-green-500'}>
                        {job.priority}
                      </span>
                    </td>
                    <td className="px-6 py-3"><StatusBadge status={job.status} /></td>
                    <td className="px-6 py-3 font-label-mono text-label-mono text-on-surface-variant">{job.attempt}/{job.max_attempts}</td>
                    <td className="px-6 py-3 font-body-sm text-body-sm text-on-surface-variant">
                      {new Date(job.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant">No jobs found. Create one to get started.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-12 xl:col-span-4 flex flex-col gap-component_gap">
          <JobSubmitForm onSuccess={fetchJobs} />
        </div>
      </div>
    </div>
  );
}
