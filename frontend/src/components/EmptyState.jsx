import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-xl bg-surface-100 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-surface-400" />
      </div>
      <h3 className="text-sm font-semibold text-surface-900">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-surface-500 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
