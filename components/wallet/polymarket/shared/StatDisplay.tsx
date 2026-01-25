interface StatDisplayProps {
  label: string;
  value: string;
  highlight?: boolean;
  highlightColor?: "green" | "red" | "blue" | "yellow";
}

const highlightColors = {
  green: "text-green-400",
  red: "text-red-400",
  blue: "text-blue-400",
  yellow: "text-yellow-400",
};

export default function StatDisplay({
  label,
  value,
  highlight = false,
  highlightColor = "green",
}: StatDisplayProps) {
  return (
    <div>
      <p className="text-gray-400 text-xs mb-0.5">{label}</p>
      <p
        className={`font-medium ${highlight ? highlightColors[highlightColor] : "text-white"}`}
      >
        {value}
      </p>
    </div>
  );
}
