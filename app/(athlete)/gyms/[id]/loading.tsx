export default function GymDetailLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 animate-pulse">
      {/* Hero image */}
      <div className="w-full h-56 bg-gray-800" />

      {/* Back button + title overlay */}
      <div className="px-4 -mt-8 relative">
        <div className="w-10 h-10 rounded-full bg-gray-800 mb-4" />
      </div>

      {/* Gym name + rating */}
      <div className="px-4 mb-4">
        <div className="w-3/5 h-7 rounded-full bg-gray-800 mb-3" />
        <div className="flex gap-3 items-center">
          <div className="w-24 h-5 rounded-full bg-gray-800/60" />
          <div className="w-20 h-5 rounded-full bg-gray-800/60" />
        </div>
      </div>

      {/* Quick stats row */}
      <div className="px-4 mb-6 flex gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex-1 h-20 rounded-2xl bg-gray-800/50" />
        ))}
      </div>

      {/* Description */}
      <div className="px-4 mb-6 space-y-2">
        <div className="w-full h-4 rounded-full bg-gray-800/60" />
        <div className="w-5/6 h-4 rounded-full bg-gray-800/60" />
        <div className="w-2/3 h-4 rounded-full bg-gray-800/40" />
      </div>

      {/* Amenities section */}
      <div className="px-4 mb-6">
        <div className="w-28 h-5 rounded-full bg-gray-800 mb-3" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-24 h-8 rounded-full bg-gray-800/40" />
          ))}
        </div>
      </div>

      {/* Time slots section */}
      <div className="px-4 mb-6">
        <div className="w-32 h-5 rounded-full bg-gray-800 mb-3" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-800/40" />
          ))}
        </div>
      </div>

      {/* Book button placeholder */}
      <div className="px-4 pb-8">
        <div className="w-full h-14 rounded-2xl bg-emerald-900/30" />
      </div>
    </div>
  );
}
