export default function StatsCard({ icon: Icon, label, value, trend, trendUp }) {
  return (
    <div className="bg-surface-0 rounded-xl border border-surface-200 p-5">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary-600" />
        </div>
        {trend && (
          <span
            className={`text-xs font-medium ${trendUp ? 'text-success' : 'text-danger'}`}
          >
            {trend}
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-semibold text-surface-900">{value}</p>
        <p className="text-sm text-surface-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}
