interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'closed';
}

const variantStyles = {
  default: 'bg-gray-100 text-gray-700 border border-gray-200',
  success: 'bg-green-100 text-green-700 border border-green-200',
  warning: 'bg-amber-100 text-amber-700 border border-amber-200',
  error: 'bg-red-100 text-red-700 border border-red-200',
  closed: 'bg-gray-100 text-gray-500 border border-gray-200',
};

export default function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded-full ${variantStyles[variant]}`}
    >
      {children}
    </span>
  );
}
