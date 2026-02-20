import { Construction } from 'lucide-react';
import Header from '../components/Header';

export default function Placeholder({ title }) {
  return (
    <div>
      <Header title={title} />
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-5">
          <Construction className="w-8 h-8 text-surface-400" />
        </div>
        <h2 className="text-lg font-semibold text-surface-900">Yapım Aşamasında</h2>
        <p className="mt-2 text-sm text-surface-500 max-w-md">
          Bu sayfa henüz hazır değil. Yakında eklenecek.
        </p>
      </div>
    </div>
  );
}
