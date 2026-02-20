import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TicketList from './pages/TicketList';
import TicketDetail from './pages/TicketDetail';
import CreateTicket from './pages/CreateTicket';
import Placeholder from './pages/Placeholder';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="tickets" element={<TicketList />} />
          <Route path="tickets/new" element={<CreateTicket />} />
          <Route path="tickets/:id" element={<TicketDetail />} />
          <Route path="users" element={<Placeholder title="Kullanıcılar" />} />
          <Route path="firms" element={<Placeholder title="Firmalar" />} />
          <Route path="tags" element={<Placeholder title="Etiketler" />} />
          <Route path="settings" element={<Placeholder title="Ayarlar" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
