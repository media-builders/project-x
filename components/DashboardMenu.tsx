// components/DashboardMenu.tsx
// Minimal: add classes to reuse the table look; no functionality changes.

export default function DasboardMenu() {
  return (
    <div className="dashboard-menu">
      <ul className="menu-list">
        <li className="menu-item is-active">Leads</li>
        <li className="menu-item">Settings</li>
      </ul>
    </div>
  );
}
