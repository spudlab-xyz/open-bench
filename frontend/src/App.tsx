import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { useWorkspace } from './context/WorkspaceContext';
import { ExperimentsPage } from './pages/ExperimentsPage';
import { HomePage } from './pages/HomePage';
import { NewExperimentPage } from './pages/NewExperimentPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { ExperimentPage } from './pages/experiment/ExperimentPage';
import { RunDetailPage } from './pages/experiment/RunDetailPage';

const router = createBrowserRouter([{
  path: '/',
  element: <AppShell />,
  children: [
    { index: true, element: <HomePage /> },
    { path: 'projects', element: <ProjectsPage /> },
    { path: 'projects/:projectId', element: <ProjectDetailPage /> },
    { path: 'experiments', element: <ExperimentsPage /> },
    { path: 'experiments/new', element: <NewExperimentPage /> },
    { path: 'experiments/:id/runs/:runId', element: <RunDetailPage /> },
    { path: 'experiments/:id/:tab?', element: <ExperimentPage /> },
    { path: 'settings', element: <SettingsPage /> },
    { path: '*', element: <Navigate to="/" replace /> },
  ],
}]);

export default function App() {
  const { loading, storageError, workspace } = useWorkspace();
  if (loading) return <div className="loading-screen"><span className="loading-mark">◒</span><strong>Opening OpenBench…</strong><small>Reading this browser’s workspace</small></div>;
  if (!workspace && storageError) return <div className="fatal-storage"><h1>OpenBench cannot open browser storage</h1><p>{storageError}</p><p>Storage is required for this prototype. It will not silently use temporary memory.</p></div>;
  return <RouterProvider router={router} />;
}
