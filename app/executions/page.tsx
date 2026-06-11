import { TopNavBar } from '@/components/TopNavBar';

export default function ExecutionsPage() {
  return (
    <div className="flex flex-col h-full bg-surface">
      <TopNavBar title="Executions" breadcrumbs={['Home', 'Executions']} />
      <div className="flex-1 p-8">
        <div className="bg-surface-container border border-outline-variant rounded-xl p-8 text-center max-w-2xl mx-auto mt-12">
          <span className="material-symbols-outlined text-6xl text-primary mb-4">play_circle</span>
          <h2 className="text-h2 font-h2 text-on-surface mb-2">Live Executions</h2>
          <p className="text-on-surface-variant mb-6">
            The dedicated live executions tracker is coming soon.
            For now, you can view the execution history of a specific job by clicking on it in the Jobs tab.
          </p>
        </div>
      </div>
    </div>
  );
}
