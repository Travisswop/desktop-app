interface StatDisplayProps {
  label: string;
  value: string;
  highlight?: boolean;
  highlightColor?: 'green' | 'red' | 'blue' | 'yellow';
}

const highlightColors = {
  green: 'text-green-600',
  red: 'text-red-600',
  blue: 'text-blue-600',
  yellow: 'text-amber-600',
};

export default function StatDisplay({
  label,
  value,
  highlight = false,
  highlightColor = 'green',
}: StatDisplayProps) {
  return (
    <div>
      <p className="text-gray-500 text-xs mb-0.5">{label}</p>
      <p
        className={`font-medium ${highlight ? highlightColors[highlightColor] : 'text-gray-900'}`}
      >
        {value}
      </p>
    </div>
  );
}
