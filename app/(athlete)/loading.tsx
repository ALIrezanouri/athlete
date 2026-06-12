export default function AthleteLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        {/* Logo placeholder */}
        <div className="w-16 h-16 rounded-2xl bg-gray-800" />

        {/* Title placeholder */}
        <div className="w-32 h-4 rounded-full bg-gray-800" />

        {/* Subtitle placeholder */}
        <div className="w-24 h-3 rounded-full bg-gray-700" />

        {/* Spinner */}
        <div className="mt-4 w-8 h-8 border-2 border-gray-700 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    </div>
  );
}
