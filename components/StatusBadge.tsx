export function StatusBadge({ status }: { status: string }) {
  if (status === 'RUNNING') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">RUNNING</span>
    );
  }
  if (status === 'COMPLETED') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-secondary-container/20 text-on-secondary-container border border-secondary-container/40">COMPLETED</span>
    );
  }
  if (status === 'FAILED') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-error-container/20 text-error border border-error/20">FAILED</span>
    );
  }
  if (status === 'QUEUED') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-surface-variant text-on-surface-variant border border-outline-variant">QUEUED</span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-surface-variant text-on-surface-variant border border-outline-variant">{status}</span>
  );
}
