import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import { join } from 'path'
import { LANGUAGE_NAMES_EN } from '../../../../lib/languages'

const API = 'https://linguaxchange-backend-production.up.railway.app'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'LinguaXchange study guide'

const mascot = `data:image/png;base64,${readFileSync(
  join(process.cwd(), 'public/icons/icon-512.png'),
).toString('base64')}`

// System fonts only, matching app/opengraph-image.js. Loading Baloo 2 here
// would ship a font file into every image render for a card most people see at
// thumbnail size.
export default async function Image({ params }) {
  const { language, level } = await params

  // The description, not the title: the header already says "Spanish B1", and
  // the title only repeats it. What sells the click is what is actually in the
  // guide — the subjunctive, the past tenses, the plateau nobody warns you
  // about.
  let blurb = null
  try {
    const res = await fetch(`${API}/api/resources/${language}/${level}`, {
      next: { revalidate: 3600 },
    })
    if (res.ok) {
      const data = await res.json()
      if (!data?.error) {
        // The descriptions end with "Free PDF, no account needed" — right for a
        // search result, redundant here because the pill below says it. Drop
        // that closing sentence and keep the substance.
        blurb = (data.description?.trim() || data.title || '')
          .replace(/\s*Free PDF[^.]*\.?\s*$/i, '')
          .trim() || null
      }
    }
  } catch (e) {
    // Falls back to the level and language below, which come from the URL and
    // are always present — a card without the title still says what it is.
  }

  const code = String(language).toUpperCase()
  const lvl = String(level).toUpperCase()
  const languageName = LANGUAGE_NAMES_EN[code] || code

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          backgroundColor: '#fdf3e7',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {/* The level reads first and largest: it is what somebody searching
              "Spanish B1" is actually looking for. */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 132,
              height: 132,
              borderRadius: 32,
              backgroundColor: '#1a1a2e',
              color: '#fdf3e7',
              fontSize: 62,
              fontWeight: 800,
              letterSpacing: -1,
            }}
          >
            {lvl}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 30, color: '#5a5a6e', fontWeight: 600 }}>
              Free study guide
            </div>
            <div
              style={{
                fontSize: 60,
                fontWeight: 800,
                color: '#1a1a2e',
                letterSpacing: -1.5,
              }}
            >
              {/* One string, not two nodes: Satori rejects a div with more
                  than one child unless it declares a display mode. */}
              {`${languageName} ${lvl}`}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: blurb && blurb.length > 90 ? 38 : 46,
            fontWeight: 700,
            color: '#1a1a2e',
            lineHeight: 1.2,
            letterSpacing: -1,
          }}
        >
          {blurb || `What to study at ${languageName} ${lvl}`}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div
            style={{
              display: 'flex',
              padding: '16px 32px',
              borderRadius: 999,
              backgroundColor: '#e0263a',
              fontSize: 26,
              fontWeight: 700,
              color: '#fdf3e7',
            }}
          >
            Free PDF · No account needed
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ display: 'flex', fontSize: 34, fontWeight: 800, color: '#1a1a2e' }}>
              <span>Lingua</span>
              <span style={{ color: '#e0263a' }}>Xchange</span>
            </div>
            <img src={mascot} width={72} height={72} style={{ borderRadius: 18 }} />
          </div>
        </div>
      </div>
    ),
    size,
  )
}
