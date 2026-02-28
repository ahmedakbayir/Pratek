import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TicketList from './pages/TicketList';
import TicketDetail from './pages/TicketDetail';
import CreateTicket from './pages/CreateTicket';
import EditTicket from './pages/EditTicket';
import UserList from './pages/UserList';
import FirmList from './pages/FirmList';
import TagList from './pages/TagList';
import ProductList from './pages/ProductList';
import ProductFirmMatrix from './pages/ProductFirmMatrix';
import TicketPriorityList from './pages/TicketPriorityList';
import TicketStatusList from './pages/TicketStatusList';
import PrivilegeList from './pages/PrivilegeList';
import Settings from './pages/Settings';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginGuard />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="tickets" element={<TicketList />} />
            <Route path="tickets/new" element={<CreateTicket />} />
            <Route path="tickets/:id" element={<TicketDetail />} />
            <Route path="tickets/:id/edit" element={<EditTicket />} />
            <Route path="users" element={<AdminRoute><UserList /></AdminRoute>} />
            <Route path="firms" element={<AdminRoute><FirmList /></AdminRoute>} />
            <Route path="products" element={<AdminRoute><ProductList /></AdminRoute>} />
            <Route path="product-firm-matrix" element={<AdminRoute><ProductFirmMatrix /></AdminRoute>} />
            <Route path="labels" element={<AdminRoute><TagList /></AdminRoute>} />
            <Route path="ticket-priorities" element={<AdminRoute><TicketPriorityList /></AdminRoute>} />
            <Route path="ticket-statuses" element={<AdminRoute><TicketStatusList /></AdminRoute>} />
            <Route path="privileges" element={<AdminRoute><PrivilegeList /></AdminRoute>} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function LoginGuard() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}
