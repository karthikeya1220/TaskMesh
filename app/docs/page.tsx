import { TopNavBar } from '@/components/TopNavBar';

export default function DocsPage() {
  return (
    <div className="flex flex-col h-full bg-surface">
      <TopNavBar title="Documentation" breadcrumbs={['Home', 'Docs']} />
      <div className="flex-1 p-8">
        <div className="bg-surface-container border border-outline-variant rounded-xl p-8 max-w-2xl mx-auto mt-12">
          <div className="flex items-center gap-4 mb-8 border-b border-outline-variant pb-4">
            <span className="material-symbols-outlined text-4xl text-primary">description</span>
            <h2 className="text-h2 font-h2 text-on-surface">Documentation</h2>
          </div>
          
          <div className="space-y-4 text-on-surface-variant">
            <p>Welcome to the JobFlow documentation.</p>
            <p><strong>To get started:</strong></p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Navigate to the <strong>Jobs</strong> tab to submit new distributed tasks.</li>
              <li>Navigate to the <strong>Workers</strong> tab to view connected processes.</li>
              <li>You can simulate a worker directly in the browser by clicking "Spawn Worker" on the Dashboard.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
