export default function BodyMapLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 p-4 pb-24 space-y-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="w-28 h-6 rounded bg-gray-800" />
        <div className="w-8 h-8 rounded-lg bg-gray-800" />
      </div>

      {/* Body outline placeholder */}
      <div className="flex justify-center">
        <div className="w-48 h-80 rounded-3xl bg-gray-800/50" />
      </div>

      {/* Pain points legend */}
      <div className="space-y-2">
        <div className="w-24 h-4 rounded bg-gray-800" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-gray-700" />
              <div className="w-12 h-3 rounded bg-gray-700" />
            </div>
          ))}
        </div>
      </div>

      {/* Selected muscle info */}
      <div className="bg-gray-800/50 rounded-2xl p-4 space-y-3">
        <div className="w-24 h-5 rounded bg-gray-700" />
        <div className="w-full h-3 rounded bg-gray-700" />
        <div className="w-3/4 h-3 rounded bg-gray-700" />
      </div>
    </div>
  );
}
