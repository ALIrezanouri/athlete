export default function ToolsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 p-4 pb-24 space-y-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="w-20 h-7 rounded-full bg-gray-800" />
        <div className="w-8 h-8 rounded-lg bg-gray-800" />
      </div>

      {/* Tool cards grid */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-gray-800/30 rounded-2xl p-4 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-gray-800" />
            <div className="w-20 h-4 rounded-full bg-gray-800" />
            <div className="w-full h-3 rounded-full bg-gray-800/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
