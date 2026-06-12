export default function WorkoutLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 animate-pulse">
      {/* Workout header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gray-800" />
          <div className="w-32 h-6 rounded-full bg-gray-800" />
        </div>
        <div className="flex gap-2">
          <div className="w-16 h-8 rounded-full bg-gray-800/60" />
          <div className="w-8 h-8 rounded-lg bg-gray-800" />
        </div>
      </div>

      {/* Timer + elapsed */}
      <div className="px-4 py-2 text-center space-y-1">
        <div className="w-24 h-8 rounded-full bg-gray-800 mx-auto" />
        <div className="w-16 h-3 rounded-full bg-gray-800/40 mx-auto" />
      </div>

      {/* Current exercise */}
      <div className="px-4 space-y-3">
        <div className="bg-gray-800/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="w-36 h-5 rounded-full bg-gray-800" />
              <div className="w-20 h-3 rounded-full bg-gray-800/40" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-gray-800" />
          </div>

          {/* Sets */}
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-1">
                <div className="w-6 h-6 rounded-full bg-gray-800" />
                <div className="w-16 h-4 rounded-full bg-gray-800/60" />
                <div className="w-12 h-4 rounded-full bg-gray-800/40" />
                <div className="flex-1" />
                <div className="w-8 h-8 rounded-lg bg-gray-800/40" />
              </div>
            ))}
          </div>

          {/* Add set button */}
          <div className="w-full h-10 rounded-xl bg-gray-800/20 border border-dashed border-gray-700" />
        </div>
      </div>

      {/* Rest timer */}
      <div className="px-4 py-3">
        <div className="w-full h-14 rounded-2xl bg-emerald-900/20" />
      </div>

      {/* Next up */}
      <div className="px-4 space-y-2">
        <div className="w-16 h-4 rounded-full bg-gray-800" />
        <div className="bg-gray-800/20 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-800" />
          <div className="space-y-1">
            <div className="w-28 h-4 rounded-full bg-gray-800/60" />
            <div className="w-20 h-3 rounded-full bg-gray-800/40" />
          </div>
        </div>
      </div>

      {/* Complete button */}
      <div className="px-4 pt-4 pb-8">
        <div className="w-full h-14 rounded-2xl bg-emerald-900/30" />
      </div>
    </div>
  );
}
