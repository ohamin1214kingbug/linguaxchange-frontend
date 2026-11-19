import SlidesGuideClient from './SlidesGuideClient'

// "Make your class slides" (owner request, 2026-11-19): how a member
// prepares their own class presentation, with a 10-slide template to
// download (public/teach, built by docs/teach/build-class-template.js).
// English metadata because this runs on the server; the page itself is in
// the visitor's language.
export const metadata = {
  title: 'Make your class slides · GongbuLeng',
  description: 'A simple plan for a 60-minute language class: introductions, goal, words, one pattern, speaking practice and recap, with a free slide template to download.',
  alternates: { canonical: 'https://gongbuleng.com/teach/slides' },
}

export default function SlidesGuidePage() {
  return <SlidesGuideClient />
}
