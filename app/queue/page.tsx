import { TopNavBar } from '@/components/TopNavBar';

export default function QueuePage() {
  return (
    <div className="flex flex-col h-full bg-surface">
      <TopNavBar />
      <div className="flex-1 p-8">
        <div className="bg-surface-container border border-outline-variant rounded-xl p-8 text-center max-w-2xl mx-auto mt-12">
          <span className="material-symbols-outlined text-6xl text-primary mb-4">reorder</span>
          <h2 className="text-h2 font-h2 text-on-surface mb-2">Queue Management</h2>
          <p className="text-on-surface-variant mb-6">
            Detailed queue configuration and priority management is currently under development. 
            For now, you can view queued jobs from the Jobs tab.
          </p>
        </div>
      </div>
    </div>
  );
}
