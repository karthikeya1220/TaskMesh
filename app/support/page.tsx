import { TopNavBar } from '@/components/TopNavBar';

export default function SupportPage() {
  return (
    <div className="flex flex-col h-full bg-surface">
      <TopNavBar title="Support" breadcrumbs={['Home', 'Support']} />
      <div className="flex-1 p-8">
        <div className="bg-surface-container border border-outline-variant rounded-xl p-8 text-center max-w-2xl mx-auto mt-12">
          <span className="material-symbols-outlined text-6xl text-primary mb-4">help</span>
          <h2 className="text-h2 font-h2 text-on-surface mb-2">Need Help?</h2>
          <p className="text-on-surface-variant mb-6">
            If you're experiencing issues with JobFlow, please contact the platform administration team or check the internal wiki.
          </p>
          <button className="px-4 py-2 bg-primary hover:bg-primary-container transition-colors text-on-primary rounded-lg font-semibold shadow-sm text-body-md">
            Open a Ticket
          </button>
        </div>
      </div>
    </div>
  );
}
