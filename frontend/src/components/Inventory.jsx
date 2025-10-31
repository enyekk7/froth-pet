export default function Inventory({ burger, ayam }) {
  return (
    <div className="bg-white rounded-lg p-2 shadow-sm border border-green-100">
      <h3 className="text-sm font-bold mb-2 text-green-800">Bag (Inventory)</h3>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🍔</span>
            <span className="font-semibold text-green-800 text-xs">Burger</span>
          </div>
          <span className="font-bold text-green-600 bg-green-200 px-2 py-0.5 rounded text-xs">x{Number(burger || 0n)}</span>
        </div>
        <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🍗</span>
            <span className="font-semibold text-emerald-800 text-xs">Grilled Chicken</span>
          </div>
          <span className="font-bold text-emerald-600 bg-emerald-200 px-2 py-0.5 rounded text-xs">x{Number(ayam || 0n)}</span>
        </div>
      </div>
    </div>
  );
}

