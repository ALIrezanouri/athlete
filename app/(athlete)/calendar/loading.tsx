export default function CalendarLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 p-4 pb-24 space-y-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="w-28 h-6 rounded bg-gray-800" />
        <div className="w-8 h-8 rounded-lg bg-gray-800" />
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-lg bg-gray-800" />
        <div className="w-32 h-5 rounded bg-gray-800" />
        <div className="w-8 h-8 rounded-lg bg-gray-800" />
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="w-8 h-4 mx-auto rounded bg-gray-700" />
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-gray-800/50" />
        ))}
      </div>

      {/* Events section */}
      <div className="space-y-2">
        <div className="w-24 h-5 rounded bg-gray-800" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 bg-gray-800/50 rounded-xl p-3">
            <div className="w-10 h-10 rounded-xl bg-gray-700" />
            <div className="flex-1 space-y-1.5">
              <div className="w-24 h-3.5 rounded bg-gray-700" />
              <div className="w-32 h-3 rounded bg-gray-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
