export default function RoutineEditLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 p-4 pb-24 space-y-4 animate-pulse">
      {/* Header with back + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gray-800" />
          <div className="w-28 h-6 rounded-full bg-gray-800" />
        </div>
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-lg bg-gray-800" />
          <div className="w-8 h-8 rounded-lg bg-gray-800" />
        </div>
      </div>

      {/* Routine name input */}
      <div className="space-y-2">
        <div className="w-20 h-4 rounded-full bg-gray-800" />
        <div className="w-full h-12 rounded-xl bg-gray-800/50" />
      </div>

      {/* Routine meta */}
      <div className="flex gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex-1 space-y-2">
            <div className="w-16 h-3 rounded-full bg-gray-800/60" />
            <div className="w-full h-10 rounded-lg bg-gray-800/40" />
          </div>
        ))}
      </div>

      {/* Exercise list */}
      <div className="space-y-2">
        <div className="w-28 h-5 rounded-full bg-gray-800" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-800/30 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-gray-800" />
                <div className="w-24 h-4 rounded-full bg-gray-800" />
              </div>
              <div className="w-6 h-6 rounded bg-gray-800" />
            </div>
            <div className="flex gap-3 pl-8">
              <div className="w-16 h-3 rounded-full bg-gray-800/40" />
              <div className="w-20 h-3 rounded-full bg-gray-800/40" />
              <div className="w-14 h-3 rounded-full bg-gray-800/40" />
            </div>
          </div>
        ))}
      </div>

      {/* Add exercise button */}
      <div className="w-full h-12 rounded-xl bg-gray-800/30 border border-dashed border-gray-700" />

      {/* Save button */}
      <div className="w-full h-14 rounded-2xl bg-emerald-900/30" />
    </div>
  );
}
