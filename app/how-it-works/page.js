import HowItWorksClient from './HowItWorksClient'

// The page the poster QR codes open (owner request, 2026-11-13): what makes
// GongbuLeng different, request-a-class first. English metadata because this
// runs on the server, where the translation context does not exist; the
// visitor reads the page itself in their language (?lang=es on the poster).
export const metadata = {
  title: 'How GongbuLeng works · Learn languages with other students, free',
  description: 'Small live video classes taught by students. Ask for the class you want, pay with bananas you earn by teaching, and use free A1 to B2 guides in seven languages.',
  alternates: { canonical: 'https://gongbuleng.com/how-it-works' },
}

export default function HowItWorksPage() {
  return <HowItWorksClient />
}
