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

// Admin-only route (full access)
function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

// Admin + TKL Ürün Yönetim (view-only for TKL Ürün Yönetim, full for admin)
function ViewableRoute({ children }) {
  const { user, loading, canViewAdminPages } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!canViewAdminPages) return <Navigate to="/tickets" replace />;
  return children;
}

// Route for ticket editing (admin + TKL Ürün Yönetim only)
function TicketEditRoute({ children }) {
  const { user, loading, canEditTickets } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!canEditTickets) return <Navigate to="/tickets" replace />;
  return children;
}

// Route accessible by non-restricted users (admin, TKL Ürün Yönetim) — restricted users go to /tickets
function NonRestrictedRoute({ children }) {
  const { user, loading, isRestrictedUser } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (isRestrictedUser) return <Navigate to="/tickets" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginGuard />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<RestrictedRedirect><Dashboard /></RestrictedRedirect>} />
            <Route path="tickets" element={<TicketList />} />
            <Route path="tickets/new" element={<TicketEditRoute><CreateTicket /></TicketEditRoute>} />
            <Route path="tickets/:id" element={<TicketDetail />} />
            <Route path="tickets/:id/edit" element={<TicketEditRoute><EditTicket /></TicketEditRoute>} />
            <Route path="users" element={<ViewableRoute><UserList /></ViewableRoute>} />
            <Route path="firms" element={<ViewableRoute><FirmList /></ViewableRoute>} />
            <Route path="products" element={<ViewableRoute><ProductList /></ViewableRoute>} />
            <Route path="product-firm-matrix" element={<ViewableRoute><ProductFirmMatrix /></ViewableRoute>} />
            <Route path="labels" element={<ViewableRoute><TagList /></ViewableRoute>} />
            <Route path="ticket-priorities" element={<ViewableRoute><TicketPriorityList /></ViewableRoute>} />
            <Route path="ticket-statuses" element={<ViewableRoute><TicketStatusList /></ViewableRoute>} />
            <Route path="privileges" element={<ViewableRoute><PrivilegeList /></ViewableRoute>} />
            <Route path="settings" element={<NonRestrictedRoute><Settings /></NonRestrictedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

// Restricted users (GDF/TKL Kullanıcı) get redirected to /tickets from dashboard
function RestrictedRedirect({ children }) {
  const { isRestrictedUser, loading } = useAuth();
  if (loading) return null;
  if (isRestrictedUser) return <Navigate to="/tickets" replace />;
  return children;
}

function LoginGuard() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}
