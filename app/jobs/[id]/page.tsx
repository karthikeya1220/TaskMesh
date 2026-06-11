'use client';

import { useState, useEffect } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function JobDetailsPage() {
  const params = useParams();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchJob = async () => {
    try {
      const res = await fetch(`/api/jobs/${params.id}`);
      const data = await res.json();
      setJob(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
    const interval = setInterval(fetchJob, 3000);
    return () => clearInterval(interval);
  }, [params.id]);

  if (loading && !job) return <div className="p-8">Loading job...</div>;
  if (!job) return <div className="p-8">Job not found.</div>;

  return (
    <div className="p-page_padding flex flex-col gap-section_gap max-w-[1600px] w-full">
      <div className="flex justify-between items-center">
        <div>
          <Link href="/jobs" className="text-body-sm text-primary hover:underline mb-2 block">← Back to Jobs</Link>
          <h1 className="font-h1 text-h1 flex items-center gap-4">
            {job.name}
            <StatusBadge status={job.status} />
          </h1>
          <p className="text-body-sm font-label-mono text-on-surface-variant mt-1">ID: {job.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-component_gap">
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-component_gap">
          {/* Metadata Card */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-6">
            <h2 className="font-h2 text-h2 mb-4">Execution Metadata</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-label-mono text-on-surface-variant mb-1">CREATED AT</p>
                <p className="font-body-md text-body-md">{new Date(job.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-label-mono text-on-surface-variant mb-1">PRIORITY</p>
                <p className="font-body-md text-body-md">{job.priority}</p>
              </div>
              <div>
                <p className="text-label-mono text-on-surface-variant mb-1">WORKER NODE</p>
                <p className="font-body-md text-body-md">{job.worker?.name || 'Unassigned'}</p>
              </div>
              <div>
                <p className="text-label-mono text-on-surface-variant mb-1">ATTEMPTS</p>
                <p className="font-body-md text-body-md">{job.attempt} / {job.max_attempts}</p>
              </div>
            </div>
          </div>

          {/* Payload Card */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-6">
            <h2 className="font-h2 text-h2 mb-4">Job Payload</h2>
            <pre className="bg-surface-container-lowest p-4 rounded border border-outline-variant/30 text-body-sm font-label-mono overflow-x-auto">
              {JSON.stringify(job.payload, null, 2)}
            </pre>
            
            {job.result && (
              <>
                <h2 className="font-h2 text-h2 mb-4 mt-6">Execution Result</h2>
                <pre className="bg-surface-container-lowest p-4 rounded border border-outline-variant/30 text-body-sm font-label-mono overflow-x-auto text-green-400">
                  {JSON.stringify(job.result, null, 2)}
                </pre>
              </>
            )}
            
            {job.error_message && (
              <>
                <h2 className="font-h2 text-h2 mb-4 mt-6 text-error">Execution Error</h2>
                <pre className="bg-error-container/10 p-4 rounded border border-error/30 text-body-sm font-label-mono overflow-x-auto text-error">
                  {job.error_message}
                </pre>
              </>
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-6">
            <h2 className="font-h2 text-h2 mb-6">Execution Timeline</h2>
            <div className="space-y-4 border-l-2 border-outline-variant ml-2 pl-4">
              {job.logs.map((log: any) => (
                <div key={log.id} className="relative">
                  <div className={`absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 border-surface-container ${log.event === 'ERROR' || log.event === 'RETRY' ? 'bg-error' : log.event === 'COMPLETE' ? 'bg-green-500' : 'bg-primary'}`}></div>
                  <p className="text-label-mono text-on-surface-variant text-[10px]">{new Date(log.created_at).toLocaleTimeString()}</p>
                  <p className="font-body-md text-body-md font-semibold mt-1">{log.event}</p>
                  <p className="text-body-sm text-on-surface-variant mt-1">{log.message}</p>
                </div>
              ))}
              {job.logs.length === 0 && <p className="text-body-sm text-on-surface-variant">No logs recorded.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
