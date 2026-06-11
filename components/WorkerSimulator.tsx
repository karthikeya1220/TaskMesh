'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from './Toast';

interface WorkerData {
  id: string;
  name: string;
  status: 'IDLE' | 'BUSY' | 'OFFLINE';
  jobName?: string;
  isKilled: boolean;
}

function SimulatedWorker({ worker, onUpdate }: { 
  worker: WorkerData; 
  onUpdate: (worker: WorkerData) => void;
}) {
  const workerRef = useRef(worker);
  const { addToast } = useToast();
  
  useEffect(() => {
    workerRef.current = worker;
  }, [worker]);

  useEffect(() => {
    if (workerRef.current.isKilled) return;

    const heartbeatInterval = setInterval(() => {
      fetch(`/api/workers/${workerRef.current.id}/heartbeat`, { method: 'POST' }).catch(() => {});
    }, 10000);

    const pollInterval = setInterval(async () => {
      if (workerRef.current.status === 'BUSY' || workerRef.current.isKilled) return;

      try {
        const res = await fetch(`/api/workers/${workerRef.current.id}/poll`);
        const data = await res.json();
        
        if (data.job) {
          const job = data.job;
          onUpdate({ ...workerRef.current, status: 'BUSY', jobName: job.name });

          const duration = job.payload?.duration || Math.floor(Math.random() * 3000) + 1000;
          
          setTimeout(async () => {
            if (workerRef.current.isKilled) return;
            
            const failChance = Math.random();
            if (job.payload?.fail || failChance < 0.1) {
              await fetch(`/api/workers/${workerRef.current.id}/fail`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ job_id: job.id, error_message: 'Simulated random failure' })
              });
              addToast(`Worker ${workerRef.current.name} failed job ${job.name}`, 'error');
            } else {
              await fetch(`/api/workers/${workerRef.current.id}/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ job_id: job.id, result: { success: true, duration } })
              });
              addToast(`Worker ${workerRef.current.name} completed job ${job.name}`, 'success');
            }
            onUpdate({ ...workerRef.current, status: 'IDLE', jobName: undefined });
          }, duration);
        }
      } catch (err) {
        console.error('Poll failed for worker', workerRef.current.name, err);
      }
    }, 2000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(pollInterval);
    };
  }, []); // Run only once on mount

  return (
    <div className={`border p-4 rounded-xl mb-3 flex flex-col md:flex-row md:items-center justify-between shadow-sm transition-colors ${worker.isKilled ? 'border-error/20 bg-error-container/5' : 'border-outline-variant bg-surface-container'}`}>
      <div className="mb-3 md:mb-0">
        <p className={`font-body-md font-semibold flex items-center gap-2 ${worker.isKilled ? 'text-error' : 'text-on-surface'}`}>
          <div className={`w-2 h-2 rounded-full ${worker.isKilled ? 'bg-error' : worker.status === 'BUSY' ? 'bg-orange-500 status-pulse' : 'bg-primary'}`}></div>
          {worker.name}
        </p>
        <p className="text-body-sm text-on-surface-variant font-label-mono mt-1 flex items-center gap-2">
          Status: <span className={`px-1.5 py-0.5 rounded text-[10px] border ${
            worker.isKilled ? 'text-error border-error bg-error/10' : 
            worker.status === 'BUSY' ? 'text-orange-500 border-orange-500/30 bg-orange-500/10' : 
            'text-primary border-primary/30 bg-primary/10'
          }`}>
            {worker.isKilled ? 'KILLED' : worker.status}
          </span>
          {worker.status === 'BUSY' && worker.jobName && <span className="opacity-80">| Job: {worker.jobName}</span>}
        </p>
      </div>
      <button 
        onClick={() => {
          onUpdate({ ...worker, isKilled: true, status: 'OFFLINE' });
          addToast(`Killed worker ${worker.name}`, 'info');
        }}
        disabled={worker.isKilled}
        className="px-3 py-1.5 bg-error/10 hover:bg-error/20 border border-error/30 transition-colors text-error rounded-lg text-body-sm disabled:opacity-50 font-medium"
      >
        Kill Worker
      </button>
    </div>
  );
}

export default function WorkerSimulator() {
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const { addToast } = useToast();

  const spawnWorker = async () => {
    const name = `SimWorker-${Math.floor(Math.random() * 1000)}`;
    try {
      const res = await fetch('/api/workers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      
      if (data.id) {
        setWorkers(prev => [...prev, { id: data.id, name, status: 'IDLE', isKilled: false }]);
        addToast(`Spawned worker ${name}`, 'success');
      }
    } catch (e) {
      console.error("Failed to spawn worker", e);
      addToast('Failed to spawn worker', 'error');
    }
  };

  return (
    <div className="bg-surface-container border border-outline-variant p-6 rounded-xl shadow-inner">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-h2 text-h2 text-on-surface">Browser Simulator</h3>
        <button 
          onClick={spawnWorker}
          className="px-4 py-2 bg-primary hover:bg-primary-container transition-colors text-on-primary rounded-lg font-semibold shadow-sm text-body-md"
        >
          Spawn Worker
        </button>
      </div>
      
      {workers.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant italic">No simulated workers running in browser. Click 'Spawn Worker' to start.</p>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
          {workers.map(w => (
            <SimulatedWorker 
              key={w.id} 
              worker={w} 
              onUpdate={(updated) => setWorkers(ws => ws.map(ow => ow.id === updated.id ? updated : ow))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
