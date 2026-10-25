import { ChevronLeft, ChevronRight, FlaskConical, FolderKanban, Home, Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';

const navigation = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/experiments', label: 'Experiments', icon: FlaskConical },
];

export function AppShell() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('openbench-nav-collapsed') === 'true');
  const [mobileOpen, setMobileOpen] = useState(false);
  const { saveState, storageError, clearError } = useWorkspace();
  useEffect(() => localStorage.setItem('openbench-nav-collapsed', String(collapsed)), [collapsed]);
  return <div className={`app-shell ${collapsed ? 'nav-collapsed' : ''}`}>
    <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu /></button>
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="brand-lockup"><span className="brand-mark"><img src="/images/openbench-mark.svg" alt="" /></span><span className="brand-text">OpenBench<small>by SpudLab</small></span><button className="sidebar-toggle icon-button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} title={collapsed ? 'Expand navigation' : 'Collapse navigation'}>{collapsed ? <ChevronRight /> : <ChevronLeft />}</button></div>
      <nav aria-label="Primary navigation">
        {navigation.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => setMobileOpen(false)} title={collapsed ? label : undefined}><Icon /><span>{label}</span></NavLink>)}
      </nav>
    </aside>
    {mobileOpen && <div className="nav-scrim" onClick={() => setMobileOpen(false)} />}
    <main className="workspace">
      {storageError && <div className="error-banner" role="alert"><strong>Changes were not saved.</strong> {storageError}<button onClick={clearError}>Dismiss</button></div>}
      <Outlet />
      <div className={`save-indicator save-${saveState}`}>{saveState === 'saving' ? 'Saving in this browser…' : saveState === 'saved' ? 'Saved in this browser' : saveState === 'error' ? 'Not saved' : ''}</div>
    </main>
  </div>;
}
