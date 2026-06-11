'use client';

import { useState, useEffect, useRef } from 'react';

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
            if (failChance < 0.1) {
              await fetch(`/api/workers/${workerRef.current.id}/fail`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ job_id: job.id, error_message: 'Simulated random failure' })
              });
            } else {
              await fetch(`/api/workers/${workerRef.current.id}/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ job_id: job.id, result: { success: true, duration } })
              });
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
    <div className="border p-4 rounded-md mb-2 flex items-center justify-between bg-white shadow-sm">
      <div>
        <p className="font-semibold text-gray-800">{worker.name}</p>
        <p className="text-sm font-mono mt-1">
          Status: <span className={
            worker.isKilled ? 'text-red-600 font-bold' : 
            worker.status === 'BUSY' ? 'text-amber-500 font-bold' : 
            'text-green-600 font-bold'
          }>
            {worker.isKilled ? 'KILLED' : worker.status}
          </span>
          {worker.status === 'BUSY' && worker.jobName && <span className="text-gray-500 ml-2">executing: {worker.jobName}</span>}
        </p>
      </div>
      <button 
        onClick={() => onUpdate({ ...worker, isKilled: true, status: 'OFFLINE' })}
        disabled={worker.isKilled}
        className="px-3 py-1 bg-red-500 hover:bg-red-600 transition-colors text-white rounded text-sm disabled:opacity-50 font-medium shadow-sm"
      >
        Kill Worker
      </button>
    </div>
  );
}

export default function WorkerSimulator() {
  const [workers, setWorkers] = useState<WorkerData[]>([]);

  const spawnWorker = async () => {
    const name = `BrowserWorker-${Math.floor(Math.random() * 1000)}`;
    try {
      const res = await fetch('/api/workers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      
      if (data.id) {
        setWorkers(prev => [...prev, { id: data.id, name, status: 'IDLE', isKilled: false }]);
      }
    } catch (e) {
      console.error("Failed to spawn worker", e);
    }
  };

  return (
    <div className="bg-slate-50 border p-5 rounded-lg shadow-inner">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg text-slate-800">Browser Simulator</h3>
        <button 
          onClick={spawnWorker}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white rounded font-medium shadow-sm"
        >
          Spawn Worker
        </button>
      </div>
      
      {workers.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No simulated workers running in browser. Click 'Spawn Worker' to start.</p>
      ) : (
        <div className="space-y-3">
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
