export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-cream">
      <nav className="flex items-center px-4 md:px-8 py-4 border-b border-navy/10">
        <a href="/" className="font-display font-bold text-lg text-navy">Gongbu<span className="text-brand-red">Leng</span></a>
      </nav>

      <div className="max-w-2xl mx-auto px-4 md:px-8 py-12">
        <h1 className="font-display font-extrabold text-3xl text-navy mb-2">Privacy Policy</h1>
        <p className="text-navy/65 text-sm mb-8">Last updated: November 17, 2026</p>

        <div className="space-y-6 text-navy/80 leading-relaxed">
          <p>GongbuLeng ("we", "us") connects people to teach and learn languages with each other. This policy explains what personal data we collect, why, how long we keep it, and how it&apos;s handled.</p>

          <section>
            <h2 className="font-display font-bold text-xl text-navy mb-2">1. What we collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Account info: name, email (confirmed with a code we email you), password (stored hashed, never in plain text), nationality</li>
              <li>Phone number, verified by SMS code and limited to one account per number</li>
              <li>Profile: photo, bio, languages taught/learned, level, certificate info. Photos are saved without hidden data such as the location where they were taken. If you choose &quot;Use my Google photo&quot;, we copy your Google profile picture.</li>
              <li>Class activity: classes created, sessions joined, reviews, credit balance and transaction history, and when you entered a class video room (used for the no-show rules)</li>
              <li>Messages you write in class chats and class-request chats</li>
              <li>Reports you send us, with any screenshots or files you attach</li>
              <li>If you turn on notifications: a technical address your browser gives us so we can send them</li>
              <li>Timezone, detected automatically to show class times correctly</li>
              <li>If you sign in with Google: your name, email and profile picture as provided by Google</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-navy mb-2">2. Why we collect it</h2>
            <p>To create your account, match you with classes, run the credit system, verify you&apos;re a real person (to prevent fake or duplicate accounts), send you class and account emails, let class members talk to each other, apply the no-show rules, handle reports, and let admins review new teacher accounts before they can post classes.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-navy mb-2">3. Who we share it with</h2>
            <p>We use a small number of service providers to run GongbuLeng, and don&apos;t sell your data to anyone:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Supabase</strong>: database, file storage, and Google sign-in</li>
              <li><strong>Twilio</strong>: sends the SMS verification code to your phone</li>
              <li><strong>Resend</strong>: sends account and notification emails</li>
              <li><strong>ImprovMX</strong>: forwards emails sent to our own addresses (for example notifications@gongbuleng.com) to our inbox</li>
              <li><strong>Railway</strong> and <strong>Vercel</strong>: host our backend and website</li>
              <li><strong>8x8 (Jitsi as a Service)</strong>: powers video class calls in a private room for your class</li>
              <li><strong>Your browser&apos;s push service</strong> (for example Google, Apple or Mozilla): delivers notifications, only if you turn them on</li>
            </ul>
            <p className="mt-2">Other users can see your name, profile photo, bio and the languages and levels you teach or learn. Messages in a class or request chat are visible to the people in that chat. Your email, phone number and password are never shown to other users.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-navy mb-2">4. How long we keep it</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Chat messages are deleted 90 days after the chat closes (a class chat closes 24 hours after the class). Messages you delete yourself are removed for good after 30 days. Messages from a member with an open report against them are kept until the report is dealt with.</li>
              <li>When you delete your account, your profile, photo, certificate, phone number, chat messages and notification settings are removed straight away. Bookings and banana transactions stay attached to an anonymous &quot;Deleted&quot; account, so other members&apos; records still add up.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-navy mb-2">5. Your choices</h2>
            <p>You can update your profile at any time. In <a href="/settings" className="text-brand-red font-medium underline">Settings</a> you can download a copy of your data, turn emails off, and delete your account yourself. Questions: <a href="mailto:gongbuleng.team@gmail.com" className="text-brand-red font-medium underline">gongbuleng.team@gmail.com</a>.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-navy mb-2">6. Who can use GongbuLeng</h2>
            <p>You must be at least 16 years old to create an account.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-navy mb-2">7. Contact</h2>
            <p>Questions about this policy? Email <a href="mailto:gongbuleng.team@gmail.com" className="text-brand-red font-medium underline">gongbuleng.team@gmail.com</a>.</p>
          </section>
        </div>

        <a href="/" className="inline-block mt-10 text-navy/65 font-medium hover:text-navy">← Back to GongbuLeng</a>
      </div>
    </main>
  )
}
