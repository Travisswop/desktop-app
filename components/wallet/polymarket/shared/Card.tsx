interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({
  children,
  className = '',
  hover = false,
}: CardProps) {
  const baseStyles = 'bg-white rounded-xl border border-gray-100 shadow-sm';
  const hoverStyles = hover
    ? 'hover:shadow-md hover:border-gray-200 transition-all duration-200'
    : '';

  return (
    <div className={`${baseStyles} ${hoverStyles} ${className}`}>
      {children}
    </div>
  );
}
