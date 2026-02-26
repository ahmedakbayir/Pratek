import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="tickets" element={<TicketList />} />
          <Route path="tickets/new" element={<CreateTicket />} />
          <Route path="tickets/:id" element={<TicketDetail />} />
          <Route path="tickets/:id/edit" element={<EditTicket />} />
          <Route path="users" element={<UserList />} />
          <Route path="firms" element={<FirmList />} />
          <Route path="products" element={<ProductList />} />
          <Route path="product-firm-matrix" element={<ProductFirmMatrix />} />
          <Route path="labels" element={<TagList />} />
          <Route path="ticket-priorities" element={<TicketPriorityList />} />
          <Route path="ticket-statuses" element={<TicketStatusList />} />
          <Route path="privileges" element={<PrivilegeList />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
