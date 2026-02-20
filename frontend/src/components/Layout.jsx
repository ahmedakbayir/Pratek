import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-surface-50">
      <Sidebar />
      <main className="ml-60">
        <Outlet />
      </main>
    </div>
  );
}
