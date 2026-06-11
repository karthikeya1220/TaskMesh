'use client';

import { useState, useEffect } from 'react';
import WorkerSimulator from '@/components/WorkerSimulator';
import Link from 'next/link';

export default function WorkersPage() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkers = async () => {
    try {
      const res = await fetch('/api/workers');
      const data = await res.json();
      setWorkers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
    const interval = setInterval(fetchWorkers, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-page_padding flex flex-col gap-section_gap max-w-[1600px] w-full">
      <div className="flex justify-between items-center">
        <h1 className="font-h1 text-h1">Workers Management</h1>
      </div>

      <div className="grid grid-cols-12 gap-component_gap">
        <div className="col-span-12 xl:col-span-8 bg-surface-container border border-outline-variant rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-h2 text-h2">Connected Worker Nodes</h2>
            <button onClick={fetchWorkers} className="text-body-sm text-primary hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">refresh</span> Refresh
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workers.map((worker) => (
              <div key={worker.id} className={`border rounded-lg p-4 ${worker.status === 'OFFLINE' ? 'border-error/20 bg-error-container/5' : 'border-outline-variant bg-surface-container-low'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${worker.status === 'OFFLINE' ? 'bg-error' : worker.status === 'BUSY' ? 'bg-orange-500 status-pulse' : 'bg-primary'}`}></div>
                    <span className="font-body-md font-semibold">{worker.name}</span>
                  </div>
                  <span className={`text-label-mono text-[10px] px-2 py-1 rounded border ${worker.status === 'OFFLINE' ? 'border-error text-error bg-error/10' : 'border-outline-variant text-on-surface-variant'}`}>
                    {worker.status}
                  </span>
                </div>
                <div className="text-body-sm text-on-surface-variant mt-3 space-y-1">
                  <p>ID: <span className="font-label-mono text-on-surface">{worker.id.substring(0,8)}</span></p>
                  <p>Heartbeat: <span className="font-label-mono text-on-surface">{new Date(worker.last_heartbeat).toLocaleTimeString()}</span></p>
                  {worker.current_job_id && (
                    <p>Executing Job: <Link href={`/jobs/${worker.current_job_id}`} className="font-label-mono text-primary cursor-pointer hover:underline">#{worker.current_job_id.substring(0,8)}</Link></p>
                  )}
                </div>
              </div>
            ))}
            {workers.length === 0 && !loading && (
              <div className="col-span-full py-8 text-center text-on-surface-variant">
                No active workers connected. Spawn one to the right or run the CLI script.
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12 xl:col-span-4 flex flex-col gap-component_gap">
          <WorkerSimulator />
        </div>
      </div>
    </div>
  );
}
