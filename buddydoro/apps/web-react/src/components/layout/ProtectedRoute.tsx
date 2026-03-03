import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function ProtectedRoute() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: 'var(--color-cream)' }}>
        <div style={{ width: 36, height: 36, border: '3px solid var(--color-terracotta-muted)', borderTopColor: 'var(--color-terracotta)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}
