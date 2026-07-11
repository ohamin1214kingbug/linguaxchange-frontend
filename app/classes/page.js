'use client'
export default function Classes() {
  return (
    <main className="min-h-screen bg-gray-50">

      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-white">
        <a href="/" className="text-xl font-semibold text-indigo-600">LinguaXchange</a>
        <div className="flex gap-6 items-center">
          <a href="/classes" className="text-indigo-600 font-medium">Explore</a>
          <a href="/auth/login" className="text-gray-500">Login</a>
          <a href="/auth/register" className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Sign up free</a>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Browse classes</h1>

        <div className="flex gap-3 mb-8 flex-wrap">
          <span className="bg-indigo-600 text-white px-4 py-2 rounded-full text-sm">All</span>
          <span className="bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded-full text-sm">🇰🇷 Korean</span>
          <span className="bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded-full text-sm">🇪🇸 Spanish</span>
          <span className="bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded-full text-sm">🇩🇪 German</span>
          <span className="bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded-full text-sm">🇬🇧 English</span>
          <span className="bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded-full text-sm">🇧🇷 Portuguese</span>
          <span className="bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded-full text-sm">A1-A2</span>
          <span className="bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded-full text-sm">B1-B2</span>
          <span className="bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded-full text-sm">C1-C2</span>
        </div>

        <div className="grid grid-cols-1 gap-4">

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold">JK</div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">Korean pronunciation for beginners</h3>
                  <p className="text-gray-500 text-sm">by Ji-woo Kim · ⭐ 4.8</p>
                  <p className="text-gray-500 text-sm mt-1">Pronunciation & accent · 60 min · 4/8 spots</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">🇰🇷 Korean</span>
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">A1</span>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <span className="text-amber-600 text-sm font-medium">⚡ 1 credit to join</span>
              <a href="/auth/register" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">Join class</a>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold">MC</div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">Spanish for travel — survival phrases</h3>
                  <p className="text-gray-500 text-sm">by María C. · ⭐ 4.6</p>
                  <p className="text-gray-500 text-sm mt-1">Travel & practical · 45 min · 2/6 spots</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-medium">🇪🇸 Spanish</span>
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">A2</span>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <span className="text-amber-600 text-sm font-medium">⚡ 1 credit to join</span>
              <a href="/auth/register" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">Join class</a>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 font-semibold">HS</div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">German verb tenses: Präteritum vs Perfekt</h3>
                  <p className="text-gray-500 text-sm">by Hans S. · ⭐ 4.9</p>
                  <p className="text-gray-500 text-sm mt-1">Grammar · 60 min · 6/8 spots</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-medium">🇩🇪 German</span>
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">B1</span>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <span className="text-amber-600 text-sm font-medium">⚡ 1 credit to join</span>
              <a href="/auth/register" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">Join class</a>
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}
