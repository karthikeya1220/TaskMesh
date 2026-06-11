'use client';

import { useState } from 'react';

export function JobSubmitForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [payload, setPayload] = useState('{"duration": 5000}');
  const [priority, setPriority] = useState('5');
  const [maxAttempts, setMaxAttempts] = useState('3');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          payload: JSON.parse(payload),
          priority: parseInt(priority, 10),
          max_attempts: parseInt(maxAttempts, 10)
        })
      });
      if (res.ok) {
        onSuccess();
        setName('');
      } else {
        alert('Failed to submit job');
      }
    } catch (err) {
      alert('Error formatting payload or network error');
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
