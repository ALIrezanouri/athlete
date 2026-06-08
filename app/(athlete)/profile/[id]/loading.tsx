export default function PublicProfileLoading() {
  return (
    <div className="min-h-screen gradient-mesh text-foreground pb-24 animate-pulse" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-30 glass-card rounded-none border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <div className="w-5 h-5 rounded bg-gray-700" />
        <div className="w-16 h-5 rounded bg-gray-700" />
      </div>

      {/* Profile Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gray-800 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="w-28 h-5 rounded bg-gray-800" />
            <div className="w-40 h-3 rounded bg-gray-700" />
            <div className="w-32 h-3 rounded bg-gray-700" />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-around mt-6 py-4 glass-card rounded-2xl">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-8 h-5 rounded bg-gray-700" />
              <div className="w-12 h-3 rounded bg-gray-700" />
            </div>
          ))}
        </div>

        {/* Follow Button */}
        <div className="w-full mt-4 py-3 rounded-2xl bg-gray-800" />
      </div>

      {/* Shared Workouts */}
      <div className="px-4">
        <div className="w-28 h-5 rounded bg-gray-700 mb-3" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card p-4 space-y-2">
              <div className="w-24 h-4 rounded bg-gray-700" />
              <div className="flex gap-3">
                <div className="w-14 h-3 rounded bg-gray-700" />
                <div className="w-10 h-3 rounded bg-gray-700" />
                <div className="w-8 h-3 rounded bg-gray-700" />
              </div>
              <div className="space-y-1">
                {Array.from({ length: 2 }).map((_, j) => (
                  <div key={j} className="h-7 rounded-lg bg-gray-700/50" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
