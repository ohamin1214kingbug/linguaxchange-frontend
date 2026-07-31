export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-cream">
      <nav className="flex items-center px-4 md:px-8 py-4 border-b border-navy/10">
        <a href="/" className="font-display font-bold text-lg text-navy">Lingua<span className="text-brand-red">Xchange</span></a>
      </nav>

      <div className="max-w-2xl mx-auto px-4 md:px-8 py-12">
        <h1 className="font-display font-extrabold text-3xl text-navy mb-2">Terms of Service</h1>
        <p className="text-navy/50 text-sm mb-8">Last updated: July 31, 2026</p>

        <div className="space-y-6 text-navy/80 leading-relaxed">
          <p>These terms govern your use of LinguaXchange. By creating an account, you agree to them.</p>

          <section>
            <h2 className="font-display font-bold text-xl text-navy mb-2">1. Your account</h2>
            <p>You must be 18 or older, provide accurate information, and verify a real phone number you own. Each phone number may only be used for one account. You're responsible for keeping your login credentials secure.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-navy mb-2">2. Credits</h2>
            <p>LinguaXchange runs on credits, not money. New accounts start with a small credit grant. You earn credits by teaching a class and spend them by joining one. Credits have no cash value, cannot be bought, sold, or exchanged for money, and are not refundable.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-navy mb-2">3. Teaching a class</h2>
            <p>Classes from new teachers are reviewed before going live; classes from teachers who are already approved publish automatically. We may reject or remove a class or account at our discretion, including for misleading, inappropriate, or fraudulent content.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-navy mb-2">4. Conduct</h2>
            <p>Use a real photo of yourself. Don't harass, abuse, or discriminate against other users. Don't use LinguaXchange for anything illegal, or to solicit payment outside the platform in place of credits. We may suspend or terminate accounts that violate these terms.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-navy mb-2">5. Video classes</h2>
            <p>Classes are held over video call through a third-party video provider. We don't record, monitor, or moderate class calls, and aren't responsible for what happens during them. Report any issue to <a href="mailto:linguaxchange.app@gmail.com" className="text-brand-red font-medium underline">linguaxchange.app@gmail.com</a>.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-navy mb-2">6. No warranty</h2>
            <p>LinguaXchange is provided "as is". We don't guarantee the platform will be uninterrupted, error-free, or that any teacher's qualifications are accurate — has_certificate and similar fields are self-reported by users. We aren't liable for the quality of any class or the conduct of any user.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-navy mb-2">7. Changes</h2>
            <p>We may update these terms as the platform evolves. Continued use after a change means you accept the update.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-navy mb-2">8. Contact</h2>
            <p>Questions about these terms? Email <a href="mailto:linguaxchange.app@gmail.com" className="text-brand-red font-medium underline">linguaxchange.app@gmail.com</a>.</p>
          </section>
        </div>

        <a href="/" className="inline-block mt-10 text-navy/60 font-medium hover:text-navy">← Back to LinguaXchange</a>
      </div>
    </main>
  )
}
