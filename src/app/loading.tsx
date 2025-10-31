export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-gray-600 dark:text-gray-300">
        <svg
          className="h-6 w-6 animate-spin text-gray-500 dark:text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
        <p className="text-sm font-medium">로딩 중입니다</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          잠시만 기다려주세요. 곧 준비됩니다.
        </p>
      </div>
    </div>
  )
}
