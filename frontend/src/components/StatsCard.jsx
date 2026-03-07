export default function StatsCard({ icon: Icon, label, value, change, subtitle, highlighted }) {
  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        highlighted
          ? 'bg-gradient-to-br from-primary-50 to-orange-50 border-primary-200'
          : 'bg-surface-0 border-surface-200 hover:border-surface-300'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${highlighted ? 'text-primary-600' : 'text-surface-400'}`} />
          <span className="text-xs font-medium text-surface-600">{label}</span>
        </div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-semibold text-surface-900">{value}</span>
        {change && (
          <span className="text-[11px] text-surface-400">{change}</span>
        )}
      </div>
      {subtitle && (
        <p className="text-[11px] text-surface-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
