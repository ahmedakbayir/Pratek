const variants = {
  open: 'bg-info/10 text-info ring-info/20',
  closed: 'bg-surface-100 text-surface-600 ring-surface-300/40',
  success: 'bg-success/10 text-success ring-success/20',
  warning: 'bg-warning/10 text-warning ring-warning/20',
  danger: 'bg-danger/10 text-danger ring-danger/20',
  info: 'bg-info/10 text-info ring-info/20',
  default: 'bg-surface-100 text-surface-700 ring-surface-300/40',
  primary: 'bg-primary-50 text-primary-700 ring-primary-200/60',
};

export default function Badge({ children, variant = 'default', dot = false }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ring-1 ring-inset ${variants[variant] || variants.default}`}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
