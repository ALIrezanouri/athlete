export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 p-4 pb-24 space-y-6 animate-pulse">
      {/* Profile header */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-full bg-gray-800" />
        <div className="w-28 h-5 rounded bg-gray-800" />
        <div className="w-36 h-3 rounded bg-gray-700" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-800/50 rounded-2xl p-3 text-center space-y-1">
            <div className="w-8 h-5 mx-auto rounded bg-gray-700" />
            <div className="w-12 h-3 mx-auto rounded bg-gray-700" />
          </div>
        ))}
      </div>

      {/* Menu items */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 bg-gray-800/50 rounded-xl p-4">
            <div className="w-8 h-8 rounded-lg bg-gray-700" />
            <div className="flex-1 space-y-1.5">
              <div className="w-24 h-3.5 rounded bg-gray-700" />
              <div className="w-36 h-2.5 rounded bg-gray-700" />
            </div>
            <div className="w-4 h-4 rounded bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
}
