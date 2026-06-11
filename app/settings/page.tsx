import { TopNavBar } from '@/components/TopNavBar';

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full bg-surface">
      <TopNavBar title="Settings" breadcrumbs={['Home', 'Settings']} />
      <div className="flex-1 p-8">
        <div className="bg-surface-container border border-outline-variant rounded-xl p-8 max-w-2xl mx-auto mt-12">
          <div className="flex items-center gap-4 mb-8 border-b border-outline-variant pb-4">
            <span className="material-symbols-outlined text-4xl text-primary">settings</span>
            <h2 className="text-h2 font-h2 text-on-surface">Platform Settings</h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-on-surface mb-2">General Configuration</h3>
              <p className="text-body-sm text-on-surface-variant">Update the global platform settings (Coming Soon).</p>
            </div>
            <hr className="border-outline-variant" />
            <div>
              <h3 className="font-semibold text-on-surface mb-2">Notification Preferences</h3>
              <p className="text-body-sm text-on-surface-variant">Configure email or slack alerts for job failures (Coming Soon).</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
