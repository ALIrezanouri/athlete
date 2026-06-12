export default function ExerciseDetailLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 animate-pulse">
      {/* Hero image */}
      <div className="w-full h-56 bg-gray-800" />

      {/* Back button */}
      <div className="px-4 -mt-8 relative">
        <div className="w-10 h-10 rounded-full bg-gray-800 mb-4" />
      </div>

      {/* Exercise name */}
      <div className="px-4 mb-4">
        <div className="w-3/5 h-7 rounded-full bg-gray-800 mb-2" />
        <div className="flex gap-2">
          <div className="w-16 h-6 rounded-full bg-gray-800/60" />
          <div className="w-20 h-6 rounded-full bg-gray-800/60" />
        </div>
      </div>

      {/* Quick stats */}
      <div className="px-4 mb-6 flex gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex-1 h-16 rounded-2xl bg-gray-800/50" />
        ))}
      </div>

      {/* Instructions */}
      <div className="px-4 mb-6 space-y-2">
        <div className="w-24 h-5 rounded bg-gray-800 mb-2" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-700 shrink-0" />
            <div className="flex-1 h-4 rounded bg-gray-700" />
          </div>
        ))}
      </div>

      {/* Related exercises */}
      <div className="px-4 pb-8">
        <div className="w-28 h-5 rounded bg-gray-800 mb-3" />
        <div className="flex gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="min-w-[100px] bg-gray-800/50 rounded-xl p-3 space-y-2">
              <div className="w-full h-16 rounded-lg bg-gray-700" />
              <div className="w-16 h-3 rounded bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
