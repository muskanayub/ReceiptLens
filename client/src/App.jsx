import { useAuth } from './context/AuthContext.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Workspace from './pages/Workspace.jsx';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid h-dvh place-items-center" role="status" aria-label="Loading">
        <div className="size-6 animate-spin rounded-full border-2 border-line border-t-brand" />
      </div>
    );
  }
  return user ? <Workspace /> : <AuthPage />;
}
