export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          CharacterChat Platform
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          Phase 0 MVP - BYOK 기반 캐릭터 채팅 플랫폼
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/auth/login"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            로그인
          </a>
          <a
            href="/auth/signup"
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            회원가입
          </a>
        </div>
      </div>
    </main>
  );
}
