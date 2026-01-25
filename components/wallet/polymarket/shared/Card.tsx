interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({
  children,
  className = "",
  hover = false,
}: CardProps) {
  const baseStyles = "bg-white/5 backdrop-blur-md rounded-lg border border-white/10";
  const hoverStyles = hover ? "hover:bg-white/10 transition-colors" : "";

  return (
    <div className={`${baseStyles} ${hoverStyles} ${className}`}>
      {children}
    </div>
  );
}
