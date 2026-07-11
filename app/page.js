export default function Home() {
  return (
    <main className="min-h-screen bg-white">

      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-100">
        <span className="text-xl font-semibold text-indigo-600">LinguaXchange</span>
        <div className="flex gap-6 items-center">
          <a href="/classes" className="text-gray-500">Explore</a>
          <a href="/auth/login" className="text-gray-500">Login</a>
          <a href="/auth/register" className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Sign up free</a>
        </div>
      </nav>

      <section className="text-center py-24 px-8">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Learn by teaching, teach by learning
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Structured group classes in Korean, Spanish, German, English and Portuguese.
        </p>
        <a href="/auth/register" className="bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg">
          Get started free
        </a>
      </section>

      <section className="bg-gray-50 py-20 px-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">How it works</h2>
        <div className="grid grid-cols-3 gap-10 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="font-semibold text-lg mb-2">Register</h3>
            <p className="text-gray-500">Create your profile and get 1 free credit.</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">🎓</div>
            <h3 className="font-semibold text-lg mb-2">Teach</h3>
            <p className="text-gray-500">Host a class and earn 1 credit per student.</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">📚</div>
            <h3 className="font-semibold text-lg mb-2">Learn</h3>
            <p className="text-gray-500">Spend credits to join classes for free.</p>
          </div>
        </div>
      </section>

      <footer className="text-center py-8 text-gray-400 text-sm border-t border-gray-100">
        2024 LinguaXchange
      </footer>

    </main>
  )
}
