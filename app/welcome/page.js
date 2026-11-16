'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import { languageOptions } from '../../lib/languages'
import { nextSessionDate } from '../../lib/classSchedule'
import { formatInTimezone } from '../../lib/timezone'

const TEACH_LEVELS = ['Native', 'C2', 'C1']
const LEARN_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']
const CHIP = 'border-2 border-navy rounded-full px-3 py-1.5 text-sm font-bold transition-colors'
const LEVEL = 'border-2 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors'
const NEXT = 'w-full mt-6 bg-brand-red text-white border-2 border-navy rounded-full py-3 font-extrabold disabled:opacity-40'

const readAsDataUrl = file => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = reject
  reader.readAsDataURL(file)
})

function Progress({ step, t }) {
  return (
    <div className="mb-5">
      <div className="flex gap-1.5 mb-3">{[1, 2, 3].map(n => <span key={n} className={`flex-1 h-1.5 rounded-full ${n <= step ? 'bg-brand-red' : 'bg-navy/15'}`}/>)}</div>
      <p className="text-xs font-bold text-navy/55">{t('welcome.stepOf', { n: step })}</p>
    </div>
  )
}

// Three questions after sign-up, one per screen: what you teach, what you
// learn, a photo. Google sign-ups never see the registration form that asks
// these, so they landed on the dashboard with an empty profile (15 of 16 in
// November 2026). The dashboard sends anyone without languages here; the
// photo can be skipped, the languages can't.
export default function WelcomePage() {
  const router = useRouter()
  const { t } = useLanguage()
  const LANGS = languageOptions(t)
  const [me, setMe] = useState(null)
  const [step, setStep] = useState(1)
  const [teach, setTeach] = useState({ code: '', level: 'Native' })
  const [learn, setLearn] = useState({}) // { KO: 'A1', EN: 'B1' }
  const [googlePhoto, setGooglePhoto] = useState(null)
  const [photoChoice, setPhotoChoice] = useState(null) // 'keep' | 'google' | 'upload'
  const [upload, setUpload] = useState(null) // data URL
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [classes, setClasses] = useState([])
  const [bananas, setBananas] = useState(null)

  const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })

  useEffect(() => {
    if (!localStorage.getItem('token')) { router.replace('/auth/login'); return }
    fetch('/api/users/me', { headers: auth() }).then(r => (r.ok ? r.json() : null)).then(p => {
      if (!p) return
      setMe(p)
      if (p.teach_language?.trim()) setTeach({ code: p.teach_language, level: TEACH_LEVELS.includes(p.teach_level) ? p.teach_level : 'Native' })
      const picked = {}
      for (const code of (p.learn_languages || []).filter(Boolean)) picked[code] = p.learn_details?.[code]?.level || 'A1'
      setLearn(picked)
      if (p.photo_url) setPhotoChoice('keep')
    }).catch(() => {})
    fetch('/api/users/me/google-photo', { headers: auth() }).then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.url) { setGooglePhoto(d.url); setPhotoChoice(c => c || 'google') } }).catch(() => {})
  }, [router])

  if (!me) return <main className="min-h-screen bg-cream"><Navbar /></main>

  const learnCodes = Object.keys(learn)
  const toggleLearn = code => setLearn(l => {
    const next = { ...l }
    if (next[code]) delete next[code]; else next[code] = 'A1'
    return next
  })

  const saveLanguages = async () => {
    setBusy(true); setError('')
    try {
      const res = await fetch(`/api/users/${me.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', ...auth() },
        body: JSON.stringify({
          teach_language: teach.code, teach_level: teach.level,
          learn_languages: learnCodes,
          learn_details: Object.fromEntries(learnCodes.map(code => [code, { level: learn[code], note: me.learn_details?.[code]?.note || '' }])),
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || 'welcome.saveFailed'); return }
      setStep(3)
    } catch { setError('welcome.saveFailed') } finally { setBusy(false) }
  }

  const finish = async (skipPhoto) => {
    setBusy(true); setError('')
    try {
      let saved = null
      if (!skipPhoto && photoChoice === 'google') {
        const res = await fetch('/api/users/me/google-photo', { method: 'POST', headers: auth() })
        saved = res.ok ? await res.json() : null
        if (!res.ok) { setError('welcome.photoFailed'); return }
      } else if (!skipPhoto && photoChoice === 'upload' && upload) {
        const res = await fetch(`/api/users/${me.id}/avatar`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...auth() }, body: JSON.stringify({ image: upload }),
        })
        saved = res.ok ? await res.json() : null
        if (!res.ok) { setError('welcome.photoFailed'); return }
      }
      if (saved?.photo_url) {
        try {
          const stored = JSON.parse(localStorage.getItem('user') || '{}')
          localStorage.setItem('user', JSON.stringify({ ...stored, photo_url: saved.photo_url }))
        } catch {}
      }
      // The done screen: real classes in the languages they picked.
      fetch('/api/classes').then(r => r.json()).then(list => setClasses(Array.isArray(list) ? list : [])).catch(() => {})
      fetch('/api/credits', { headers: auth() }).then(r => r.json()).then(d => setBananas(d?.balance ?? null)).catch(() => {})
      setStep(4)
    } finally { setBusy(false) }
  }

  const name = code => LANGS.find(l => l.code === code)
  const forMe = classes
    .filter(c => learnCodes.includes(c.language_code) && c.teacher_id !== me.id && nextSessionDate(c))
    .sort((a, b) => nextSessionDate(a) - nextSessionDate(b))
  const missing = learnCodes.filter(code => !forMe.some(c => c.language_code === code))

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl border-2 border-navy shadow-[4px_4px_0_var(--color-navy)] p-5 sm:p-6">
          {step === 1 && (<>
            <Progress step={step} t={t} />
            <h1 className="font-display font-extrabold text-2xl text-navy leading-tight">{t('welcome.teachTitle')}</h1>
            <p className="text-navy/65 text-sm mt-1 mb-4">{t('welcome.teachNote')}</p>
            <div className="flex flex-wrap gap-2">
              {LANGS.map(l => (
                <button key={l.code} type="button" onClick={() => setTeach(x => ({ ...x, code: l.code }))} aria-pressed={teach.code === l.code}
                  className={`${CHIP} ${teach.code === l.code ? 'bg-navy text-white' : 'bg-white text-navy hover:bg-cream'}`}>{l.flag} {l.name}</button>
              ))}
            </div>
            {teach.code && (<>
              <p className="text-sm font-bold text-navy mt-5 mb-2">{t('welcome.teachLevel', { lang: name(teach.code)?.name })}</p>
              <div className="flex gap-1.5">
                {TEACH_LEVELS.map(lv => (
                  <button key={lv} type="button" onClick={() => setTeach(x => ({ ...x, level: lv }))} aria-pressed={teach.level === lv}
                    className={`${LEVEL} ${teach.level === lv ? 'border-navy bg-brand-yellow/40 text-navy' : 'border-navy/20 bg-white text-navy'}`}>{lv === 'Native' ? t('welcome.native') : lv}</button>
                ))}
              </div>
            </>)}
            <button type="button" disabled={!teach.code} onClick={() => {
              // You don't learn the language you teach.
              setLearn(l => { const next = { ...l }; delete next[teach.code]; return next })
              setStep(2)
            }} className={NEXT}>{t('welcome.next')}</button>
          </>)}

          {step === 2 && (<>
            <Progress step={step} t={t} />
            <h1 className="font-display font-extrabold text-2xl text-navy leading-tight">{t('welcome.learnTitle')}</h1>
            <p className="text-navy/65 text-sm mt-1 mb-4">{t('welcome.learnNote')}</p>
            <div className="flex flex-wrap gap-2">
              {LANGS.filter(l => l.code !== teach.code).map(l => (
                <button key={l.code} type="button" onClick={() => toggleLearn(l.code)} aria-pressed={Boolean(learn[l.code])}
                  className={`${CHIP} ${learn[l.code] ? 'bg-navy text-white' : 'bg-white text-navy hover:bg-cream'}`}>{l.flag} {l.name}</button>
              ))}
            </div>
            {learnCodes.map(code => (
              <div key={code} className="mt-4">
                <p className="text-sm font-bold text-navy mb-2">{t('welcome.learnLevel', { lang: name(code)?.name })}</p>
                <div className="flex flex-wrap gap-1.5">
                  {LEARN_LEVELS.map(lv => (
                    <button key={lv} type="button" onClick={() => setLearn(l => ({ ...l, [code]: lv }))} aria-pressed={learn[code] === lv}
                      className={`${LEVEL} ${learn[code] === lv ? 'border-navy bg-brand-yellow/40 text-navy' : 'border-navy/20 bg-white text-navy'}`}>{lv}</button>
                  ))}
                </div>
              </div>
            ))}
            {error && <p className="text-brand-red text-sm font-bold mt-3">{t(error)}</p>}
            <button type="button" disabled={!learnCodes.length || busy} onClick={saveLanguages} className={NEXT}>{t('welcome.next')}</button>
            <button type="button" onClick={() => setStep(1)} className="w-full mt-2 text-sm text-navy/65 underline">{t('welcome.back')}</button>
          </>)}

          {step === 3 && (<>
            <Progress step={step} t={t} />
            <h1 className="font-display font-extrabold text-2xl text-navy leading-tight">{t('welcome.photoTitle')}</h1>
            <p className="text-navy/65 text-sm mt-1 mb-4">{t('welcome.photoNote')}</p>
            {(() => {
              const preview = photoChoice === 'upload' ? upload : photoChoice === 'google' ? googlePhoto : photoChoice === 'keep' ? me.photo_url : null
              return (
                <div className="w-28 h-28 mx-auto mb-4 rounded-full border-[3px] border-navy bg-cream overflow-hidden flex items-center justify-center text-4xl">
                  {preview ? <img src={preview} alt="" className="w-full h-full object-cover"/> : '🙂'}
                </div>
              )
            })()}
            <div className="space-y-2">
              {me.photo_url && (
                <button type="button" onClick={() => setPhotoChoice('keep')}
                  className={`w-full text-left border-2 border-navy rounded-xl px-3 py-2.5 text-sm font-bold text-navy ${photoChoice === 'keep' ? 'bg-brand-yellow/25' : 'bg-white'}`}>
                  {photoChoice === 'keep' ? '✅' : '◻️'} {t('welcome.keepPhoto')}
                </button>
              )}
              {googlePhoto && (
                <button type="button" onClick={() => setPhotoChoice('google')}
                  className={`w-full text-left border-2 border-navy rounded-xl px-3 py-2.5 text-sm font-bold text-navy ${photoChoice === 'google' ? 'bg-brand-yellow/25' : 'bg-white'}`}>
                  {photoChoice === 'google' ? '✅' : '◻️'} {t('welcome.googlePhoto')}
                </button>
              )}
              <label className={`block w-full border-2 border-navy rounded-xl px-3 py-2.5 text-sm font-bold text-navy cursor-pointer ${photoChoice === 'upload' ? 'bg-brand-yellow/25' : 'bg-white'}`}>
                {photoChoice === 'upload' ? '✅' : '📷'} {t('welcome.uploadPhoto')}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={async e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setUpload(await readAsDataUrl(file)); setPhotoChoice('upload')
                }}/>
              </label>
            </div>
            {error && <p className="text-brand-red text-sm font-bold mt-3">{t(error)}</p>}
            <button type="button" disabled={busy || !photoChoice || (photoChoice === 'upload' && !upload)} onClick={() => finish(photoChoice === 'keep')} className={NEXT}>
              {busy ? t('welcome.saving') : t('welcome.finish')}
            </button>
            <button type="button" disabled={busy} onClick={() => finish(true)} className="w-full mt-2 text-sm text-navy/65 underline">{t('welcome.skipPhoto')}</button>
          </>)}

          {step === 4 && (<>
            <h1 className="font-display font-extrabold text-2xl text-navy leading-tight text-center">{t('welcome.doneTitle', { name: me.first_name || '' })}</h1>
            {me.phone_verified === false ? (
              // A Google sign-up has no bananas until the phone is verified;
              // "🍌 0" with no reason was a dead end.
              <div className="bg-brand-yellow/20 border-2 border-navy rounded-xl p-3 mt-4">
                <p className="font-bold text-navy">📱 {t('welcome.phoneCtaTitle')}</p>
                <p className="text-navy/65 text-sm mt-0.5 mb-3">{t('welcome.phoneCtaNote')}</p>
                <Link href="/auth/verify-phone" className="block text-center bg-brand-red text-white border-2 border-navy rounded-full py-2 font-bold">{t('welcome.phoneCtaBtn')}</Link>
              </div>
            ) : bananas !== null && (<>
              <p className="font-display font-extrabold text-5xl text-navy text-center mt-3">🍌 {bananas}</p>
              <p className="text-navy/65 text-sm text-center">{t('welcome.doneBananas')}</p>
            </>)}
            {forMe.length > 0 && <p className="text-sm font-bold text-navy mt-5 mb-2">{t('welcome.classesForYou')}</p>}
            <div className="space-y-2">
              {forMe.slice(0, 3).map(c => (
                <Link key={c.id} href={`/classes/${c.id}`} className="block bg-white border-2 border-navy rounded-xl px-3 py-2.5 hover:bg-cream">
                  <p className="font-bold text-navy text-sm">{name(c.language_code)?.flag} {c.title}</p>
                  <p className="text-navy/65 text-xs">{formatInTimezone(nextSessionDate(c).toISOString(), me.timezone, me.time_format)}</p>
                </Link>
              ))}
              {missing.map(code => (
                <Link key={code} href={`/classes?tab=requests&language=${code}`} className="block bg-brand-blue/10 border-2 border-navy rounded-xl px-3 py-2.5 hover:bg-brand-blue/20">
                  <p className="font-bold text-navy text-sm">🙋 {t('welcome.noClassYet', { lang: name(code)?.name })}</p>
                  <p className="text-navy/65 text-xs">{t('welcome.requestOne')}</p>
                </Link>
              ))}
            </div>
            <Link href="/dashboard" className={`${NEXT} block text-center`}>{t('welcome.toDashboard')}</Link>
          </>)}
        </div>
      </div>
    </main>
  )
}
