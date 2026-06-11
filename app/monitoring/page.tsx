import { TopNavBar } from '@/components/TopNavBar';

export default function MonitoringPage() {
  return (
    <div className="flex flex-col h-full bg-surface">
      <TopNavBar />
      <div className="flex-1 p-8">
        <div className="bg-surface-container border border-outline-variant rounded-xl p-8 text-center max-w-2xl mx-auto mt-12">
          <span className="material-symbols-outlined text-6xl text-primary mb-4">monitor_heart</span>
          <h2 className="text-h2 font-h2 text-on-surface mb-2">System Monitoring</h2>
          <p className="text-on-surface-variant mb-6">
            Advanced metrics (CPU/Memory per worker, DB connection pool) will be added here in the future.
          </p>
        </div>
      </div>
    </div>
  );
}
