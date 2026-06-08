export default function CommunityLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 p-4 pb-24 space-y-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="w-28 h-6 rounded bg-gray-800" />
        <div className="w-8 h-8 rounded-lg bg-gray-800" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex-1 h-10 rounded-xl bg-gray-800" />
        ))}
      </div>

      {/* Post cards */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-gray-800/50 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-700" />
            <div className="flex-1 space-y-1.5">
              <div className="w-24 h-4 rounded bg-gray-700" />
              <div className="w-16 h-3 rounded bg-gray-700" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="w-full h-3 rounded bg-gray-700" />
            <div className="w-3/4 h-3 rounded bg-gray-700" />
          </div>
          <div className="flex gap-4">
            <div className="w-12 h-4 rounded bg-gray-700" />
            <div className="w-12 h-4 rounded bg-gray-700" />
          </div>
        </div>
      ))}
    </div>
  );
}
