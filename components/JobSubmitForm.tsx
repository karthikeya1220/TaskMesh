'use client';

import { useState } from 'react';
import { useToast } from './Toast';

export function JobSubmitForm({ onSuccess }: { onSuccess: (optimisticJob?: any) => void }) {
  const [name, setName] = useState('');
  const [payload, setPayload] = useState('{"duration": 5000}');
  const [priority, setPriority] = useState('5');
  const [maxAttempts, setMaxAttempts] = useState('3');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let parsedPayload;
    try {
      parsedPayload = JSON.parse(payload);
    } catch (err) {
      addToast('Invalid JSON payload format.', 'error');
      setLoading(false);
      return;
    }

    try {
      // Optimistic update
      const optimisticJob = {
        id: `optimistic-${Date.now()}`,
        name,
        priority: parseInt(priority, 10),
        status: 'QUEUED',
        attempt: 0,
        max_attempts: parseInt(maxAttempts, 10),
        created_at: new Date().toISOString(),
      };
      onSuccess(optimisticJob);

      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          payload: parsedPayload,
          priority: parseInt(priority, 10),
          max_attempts: parseInt(maxAttempts, 10)
        })
      });
      if (res.ok) {
        addToast(`Job "${name}" submitted successfully!`, 'success');
        onSuccess();
        setName('');
      } else {
        const errorData = await res.json();
        addToast(`Failed to submit job: ${errorData.error || 'Unknown error'}`, 'error');
        onSuccess(); // Revert optimistic update by fetching again
      }
    } catch (err) {
      addToast('Network error while submitting job.', 'error');
      onSuccess(); // Revert
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface-container border border-outline-variant p-6 rounded-xl flex flex-col gap-4">
      <h3 className="font-h2 text-h2">Submit New Job</h3>
      <div>
        <label className="block text-body-sm mb-1 text-on-surface-variant">Job Name</label>
        <input 
          required
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          className="w-full bg-surface-container-low border border-outline-variant rounded p-2 text-on-surface" 
          placeholder="e.g. DataSyncWorker"
        />
      </div>
      <div>
        <label className="block text-body-sm mb-1 text-on-surface-variant">Payload (JSON)</label>
        <textarea 
          required
          value={payload} 
          onChange={(e) => setPayload(e.target.value)} 
          className="w-full h-24 bg-surface-container-low border border-outline-variant rounded p-2 text-on-surface font-label-mono text-sm" 
        />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-body-sm mb-1 text-on-surface-variant">Priority (1-10)</label>
          <input 
            type="number" min="1" max="10" 
            value={priority} onChange={(e) => setPriority(e.target.value)} 
            className="w-full bg-surface-container-low border border-outline-variant rounded p-2 text-on-surface" 
          />
        </div>
        <div className="flex-1">
          <label className="block text-body-sm mb-1 text-on-surface-variant">Max Attempts</label>
          <input 
            type="number" min="1" max="10" 
            value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} 
            className="w-full bg-surface-container-low border border-outline-variant rounded p-2 text-on-surface" 
          />
        </div>
      </div>
      <button 
        type="submit" 
        disabled={loading}
        className="bg-primary text-on-primary py-2 rounded font-semibold mt-2 hover:bg-primary-container disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit Job'}
      </button>
    </form>
  );
}
