export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-cream">
      <nav className="flex items-center px-4 md:px-8 py-4 border-b border-navy/10">
        <a href="/" className="font-display font-bold text-lg text-navy">Lingua<span className="text-brand-red">Xchange</span></a>
      </nav>

      <div className="max-w-2xl mx-auto px-4 md:px-8 py-12">
        <h1 className="font-display font-extrabold text-3xl text-navy mb-2">Privacy Policy</h1>
        <p className="text-navy/50 text-sm mb-8">Last updated: July 31, 2026</p>

        <div className="space-y-6 text-navy/80 leading-relaxed">
          <p>LinguaXchange ("we", "us") connects people to teach and learn languages with each other. This policy explains what personal data we collect, why, and how it's handled.</p>

          <section>
            <h2 className="font-display font-bold text-xl text-navy mb-2">1. What we collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Account info: name, email, password (stored hashed, never in plain text), nationality</li>
              <li>Phone number, verified by SMS code — required to create an account and limited to one account per number</li>
              <li>Profile: photo, bio, languages taught/learned, level, certificate info</li>
              <li>Class activity: classes created, sessions joined, reviews, credit balance and transaction history</li>
              <li>Timezone, detected automatically to show class times correctly</li>
              <li>If you sign in with Google: your name and email as provided by Google</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-navy mb-2">2. Why we collect it</h2>
            <p>To create your account, match you with classes, run the credit system, verify you're a real person with a real phone number (to prevent fake/duplicate accounts), send you class and account emails, and let admins review new teacher accounts before they can post classes.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-navy mb-2">3. Who we share it with</h2>
            <p>We use a small number of service providers to run LinguaXchange, and don't sell your data to anyone:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Supabase</strong> — database, file storage, and Google sign-in</li>
              <li><strong>Twilio</strong> — sends the SMS verification code to your phone</li>
              <li><strong>Resend</strong> — sends account and notification emails</li>
              <li><strong>Railway</strong> and <strong>Vercel</strong> — host our backend and website</li>
              <li><strong>Jitsi</strong> — powers video class calls, on a shared public server</li>
            </ul>
            <p className="mt-2">Other users can see your profile photo, bio, and the languages/levels you teach or learn. Your email, phone number, and password are never shown to other users.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-navy mb-2">4. Your choices</h2>
            <p>You can update your profile at any time from your account settings. To request that we delete your account and associated data, email us at <a href="mailto:linguaxchange.app@gmail.com" className="text-brand-red font-medium underline">linguaxchange.app@gmail.com</a>.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-navy mb-2">5. Who can use LinguaXchange</h2>
            <p>You must be at least 16 years old to create an account.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-navy mb-2">6. Contact</h2>
            <p>Questions about this policy? Email <a href="mailto:linguaxchange.app@gmail.com" className="text-brand-red font-medium underline">linguaxchange.app@gmail.com</a>.</p>
          </section>
        </div>

        <a href="/" className="inline-block mt-10 text-navy/60 font-medium hover:text-navy">← Back to LinguaXchange</a>
      </div>
    </main>
  )
}
