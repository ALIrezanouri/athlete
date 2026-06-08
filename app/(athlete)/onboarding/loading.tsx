export default function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 p-4 pb-24 space-y-6 animate-pulse">
      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-gray-800">
        <div className="w-1/3 h-full rounded-full bg-gray-700" />
      </div>

      {/* Step indicator */}
      <div className="flex justify-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-3 h-3 rounded-full bg-gray-800" />
        ))}
      </div>

      {/* Title */}
      <div className="text-center space-y-2">
        <div className="w-48 h-7 rounded-full bg-gray-800 mx-auto" />
        <div className="w-64 h-4 rounded-full bg-gray-800/60 mx-auto" />
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="w-24 h-4 rounded-full bg-gray-800" />
            <div className="w-full h-12 rounded-xl bg-gray-800/50" />
          </div>
        ))}
      </div>

      {/* Selection chips */}
      <div className="space-y-2">
        <div className="w-32 h-4 rounded-full bg-gray-800" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-20 h-10 rounded-full bg-gray-800/40" />
          ))}
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-3 pt-4">
        <div className="flex-1 h-12 rounded-xl bg-gray-800/40" />
        <div className="flex-1 h-12 rounded-xl bg-emerald-900/30" />
      </div>
    </div>
  );
}
