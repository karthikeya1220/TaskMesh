export function TopNavBar() {
  return (
    <header className="h-header_height w-full sticky top-0 z-40 bg-surface border-b border-outline-variant flex items-center justify-between px-page_padding gap-component_gap">
      <div className="flex items-center gap-6">
        <span className="font-h2 text-h2 font-black text-on-surface">JobFlow</span>
        <div className="flex gap-4">
          <span className="font-body-md text-body-md text-primary border-b-2 border-primary pb-1 cursor-pointer">Status</span>
          <span className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface cursor-pointer">Alerts</span>
        </div>
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-on-surface-variant" data-icon="search">search</span>
          <input className="bg-surface-container-low border border-outline-variant rounded-lg pl-10 pr-4 py-1 text-body-sm font-body-sm focus:ring-2 focus:ring-primary focus:outline-none w-64" placeholder="Search systems..." type="text"/>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="px-4 py-1.5 bg-outline-variant text-on-surface font-body-md text-body-md rounded-lg hover:bg-surface-variant transition-colors">Export</button>
        <div className="flex items-center gap-2 border-l border-outline-variant pl-4">
          <button className="p-1.5 text-on-surface-variant hover:text-on-surface transition-colors"><span className="material-symbols-outlined" data-icon="notifications">notifications</span></button>
          <button className="p-1.5 text-on-surface-variant hover:text-on-surface transition-colors"><span className="material-symbols-outlined" data-icon="settings_suggest">settings_suggest</span></button>
          <img alt="User Profile" className="w-8 h-8 rounded-full border border-outline-variant" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB27MMbGLZ4RYyIdeKmI-u0ZEqli0asSGXlSAZ-dJSZdKSuN7yD3C_LuhI2iUljOalVFAiqUbs7CeJ1B63OF8DS4xJme-UWvJCsz1sGj9xhWpcbviAyNl_vhfh3bKatYMIh4mjRD6r1SY5yBdLI3ADrRei7DFXPacbjpIo7us71DV9YZNpH80H-NE_A5zVKHS0QgF_l5uaT_o4IwgDxujhHywOwGbfeRPtwLJ0ZgSH13NeNmU__qGZXl5weBjh-uJKHBCc4oZtqOKQ"/>
        </div>
      </div>
    </header>
  );
}
