import { Outlet } from 'react-router-dom';
import { Eye } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { isImpersonating, user, stopImpersonating } = useAuth();

  return (
    <div className="min-h-screen bg-surface-50">
      {isImpersonating && (
        <div className="impersonation-banner">
          <Eye className="w-4 h-4" />
          <span><strong>{user?.name}</strong> olarak görüntülüyorsunuz</span>
          <button onClick={stopImpersonating}>
            Kendi Görünümüme Dön
          </button>
        </div>
      )}
      <Sidebar />
      <main className={`ml-60 ${isImpersonating ? '' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
}
