interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "closed";
}

const variantStyles = {
  default: "bg-gray-500/20 text-gray-300",
  success: "bg-green-500/20 text-green-300",
  warning: "bg-yellow-500/20 text-yellow-300",
  error: "bg-red-500/20 text-red-300",
  closed: "bg-gray-500/20 text-gray-400",
};

export default function Badge({ children, variant = "default" }: BadgeProps) {
  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded ${variantStyles[variant]}`}
    >
      {children}
    </span>
  );
}
