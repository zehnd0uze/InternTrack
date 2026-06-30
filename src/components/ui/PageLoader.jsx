export default function PageLoader() {
  return (
    <div className="p-6 md:p-8 space-y-6 min-h-screen bg-surface animate-fade-in max-w-7xl mx-auto w-full pt-20 lg:pt-8">
      {/* Skeleton Header */}
      <div className="space-y-3">
        <div className="h-8 w-48 sm:w-64 bg-gray-200 dark:bg-gray-700/50 rounded-lg animate-pulse" />
        <div className="h-4 w-32 sm:w-48 bg-gray-200 dark:bg-gray-700/50 rounded-lg animate-pulse" />
      </div>

      {/* Skeleton Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="h-28 bg-gray-200 dark:bg-gray-700/50 rounded-xl animate-pulse" />
        <div className="h-28 bg-gray-200 dark:bg-gray-700/50 rounded-xl animate-pulse" />
        <div className="h-28 bg-gray-200 dark:bg-gray-700/50 rounded-xl animate-pulse" />
      </div>

      {/* Skeleton Main Content area */}
      <div className="h-[400px] bg-gray-200 dark:bg-gray-700/50 rounded-xl animate-pulse" />
    </div>
  )
}
