import { ImageResponse } from 'next/og'
import { LANGUAGE_NAMES_EN as LANGUAGE_NAMES } from '../../../lib/languages'

// The preview card WhatsApp, Instagram DMs, Telegram and search show for a
// class link (owner plan 5, 2026-11-19): title, language and level, the next
// date in Madrid time (most members are in Madrid; the page itself shows the
// viewer's own zone), teacher, and spots left. Re-rendered at most every 5
// minutes, like the page, so the spots count stays roughly honest.
export const revalidate = 300
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'A live language class on GongbuLeng'

const API = 'https://linguaxchange-backend-production.up.railway.app'
const FLAGS = { KO: '🇰🇷', ES: '🇪🇸', DE: '🇩🇪', EN: '🇬🇧', PT: '🇧🇷', FR: '🇫🇷', IT: '🇮🇹' }
const NAVY = '#1a1a2e', RED = '#da1f33', CREAM = '#fdf3e7'

async function getClass(id) {
  try {
    const res = await fetch(`${API}/api/classes/${id}`, { next: { revalidate: 300 } })
    const data = res.ok ? await res.json() : null
    return data?.error ? null : data
  } catch { return null }
}

// The teacher photo as a data URL, or null: a photo that fails to load must
// not break the whole card.
async function photoData(url) {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const type = res.headers.get('content-type') || 'image/jpeg'
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`
  } catch { return null }
}

// Inter regular and extra-bold for the card (the built-in font has no bold).
// Google Fonts serves TTF to a request without a browser user agent, which
// is what the image renderer needs. On any failure the card falls back to
// the built-in font rather than breaking.
async function inter(weight) {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Inter:wght@${weight}`)).text()
    const url = css.match(/src: url\((.+?)\)/)?.[1]
    return url ? { name: 'Inter', data: await (await fetch(url)).arrayBuffer(), weight, style: 'normal' } : null
  } catch { return null }
}

export default async function Image({ params }) {
  const { id } = await params
  const cls = await getClass(id)
  const now = Date.now()
  const next = (cls?.class_sessions || [])
    .filter(s => s.status === 'scheduled' && new Date(s.session_date).getTime() > now)
    .sort((a, b) => new Date(a.session_date) - new Date(b.session_date))[0]
  const spots = next ? Math.max(0, (cls.max_students || 0) - (next.taken || 0)) : null
  const when = next && new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(next.session_date)).replace(',', ' ·')
  const [photo, ...fonts] = await Promise.all([photoData(cls?.teacher?.photo_url), inter(400), inter(800)])
  const language = cls ? LANGUAGE_NAMES[cls.language_code] || cls.language_code : ''
  const title = cls ? (cls.title.length > 48 ? `${cls.title.slice(0, 46)}…` : cls.title) : 'Live language classes'

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', backgroundColor: CREAM, color: NAVY, fontFamily: 'Inter' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '56px 60px' }}>
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 700 }}>
            {cls ? `${FLAGS[cls.language_code] || ''} ${language} · ${cls.level} · ${cls.duration_minutes} min` : 'GongbuLeng'}
          </div>
          <div style={{ display: 'flex', fontSize: 76, fontWeight: 800, lineHeight: 1.05, marginTop: 18, letterSpacing: -1 }}>{title}</div>
          {when && <div style={{ display: 'flex', fontSize: 42, fontWeight: 800, color: RED, marginTop: 20 }}>{`${when} (Madrid)`}</div>}
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 'auto' }}>
            {cls?.teacher && (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 104, height: 104, borderRadius: 999, border: `6px solid ${NAVY}`, backgroundColor: '#f4dcae', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', fontSize: 48, fontWeight: 800 }}>
                  {photo ? <img src={photo} width={104} height={104} style={{ objectFit: 'cover' }}/> : (cls.teacher.first_name || '?')[0]}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 22 }}>
                  <div style={{ display: 'flex', fontSize: 36, fontWeight: 800 }}>{cls.teacher.first_name}</div>
                  <div style={{ display: 'flex', fontSize: 26, color: '#5a5a6e' }}>{`teaches ${language}`}</div>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', marginLeft: 'auto', fontSize: 40, fontWeight: 800 }}>
              <span>Gongbu</span><span style={{ color: RED }}>Leng</span>
            </div>
          </div>
        </div>
        <div style={{ width: 300, backgroundColor: RED, color: '#fff', borderLeft: `6px solid ${NAVY}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          {spots !== null && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 58, fontWeight: 800, lineHeight: 1 }}>
              <span>{spots > 0 ? `${spots} ${spots === 1 ? 'spot' : 'spots'}` : 'Full'}</span>
              {spots > 0 && <span>left</span>}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 26, fontWeight: 700, marginTop: 28, lineHeight: 1.3 }}>
            <span>No money.</span><span>New members</span><span>get 3 free 🍌</span>
          </div>
        </div>
      </div>
    ),
    { ...size, emoji: 'twemoji', ...(fonts.every(Boolean) ? { fonts } : {}) },
  )
}
