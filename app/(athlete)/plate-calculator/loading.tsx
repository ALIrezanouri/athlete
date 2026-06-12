export default function PlateCalculatorLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 p-4 pb-24 space-y-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="w-36 h-7 rounded-full bg-gray-800" />
        <div className="w-8 h-8 rounded-lg bg-gray-800" />
      </div>

      {/* Weight input */}
      <div className="bg-gray-800/30 rounded-2xl p-6 space-y-4">
        <div className="w-24 h-4 rounded-full bg-gray-800 mx-auto" />
        <div className="w-32 h-12 rounded-xl bg-gray-800 mx-auto" />
        <div className="flex gap-2 justify-center">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-14 h-10 rounded-lg bg-gray-800/60" />
          ))}
        </div>
      </div>

      {/* Barbell visualization */}
      <div className="bg-gray-800/30 rounded-2xl p-4 space-y-3">
        <div className="w-full h-4 rounded-full bg-gray-800" />
        <div className="flex justify-between items-center px-4">
          <div className="flex flex-col gap-1 items-center">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="w-8 h-6 rounded bg-gray-700" />
            ))}
          </div>
          <div className="w-40 h-3 rounded-full bg-gray-700" />
          <div className="flex flex-col gap-1 items-center">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="w-8 h-6 rounded bg-gray-700" />
            ))}
          </div>
        </div>
      </div>

      {/* Plate breakdown */}
      <div className="bg-gray-800/30 rounded-2xl p-4 space-y-2">
        <div className="w-28 h-4 rounded-full bg-gray-800 mb-2" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="w-16 h-4 rounded-full bg-gray-800/60" />
            <div className="w-8 h-4 rounded-full bg-gray-800/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
