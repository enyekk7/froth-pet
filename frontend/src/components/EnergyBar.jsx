export default function EnergyBar({ energy, max = 100 }) {
  const percentage = Math.min((energy / max) * 100, 100);
  const getColor = () => {
    if (percentage > 70) return 'bg-green-500';
    if (percentage > 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-xs font-semibold text-green-800">Energy</span>
        <span className="text-xs font-semibold text-green-600">{Math.min(energy, max)}/{max}</span>
      </div>
      <div className="w-full bg-green-100 rounded-full h-3 overflow-hidden border border-green-200">
        <div
          className={`h-full ${getColor()} transition-all duration-300 rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

