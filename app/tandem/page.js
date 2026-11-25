'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import { SwitchButton, setTandemOpen } from '../../components/TandemSwitch'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import { languageOptions, levelLabel } from '../../lib/languages'
import { formatInTimezone } from '../../lib/timezone'
import { userCode } from '../../lib/userCode'
import SegmentedTabs from '../../components/SegmentedTabs'

const CARD = 'bg-white rounded-2xl border-2 border-navy shadow-[4px_4px_0_var(--color-navy)] p-4'
const PRIMARY = 'inline-flex items-center gap-1.5 border-2 border-navy rounded-full px-4 py-1.5 text-sm font-bold text-white bg-brand-red hover:bg-brand-red-dark transition-colors disabled:opacity-40'
const BUTTON = 'inline-flex items-center gap-1.5 border-2 border-navy rounded-full px-4 py-1.5 text-sm font-bold text-navy bg-white hover:bg-cream transition-colors disabled:opacity-40'
const EMPTY = 'border-2 border-dashed border-navy rounded-2xl p-4 bg-[#fff8e6] text-sm text-navy'
const INPUT = 'border-2 border-navy/20 rounded-xl px-3 py-2 text-sm text-navy bg-white focus:border-brand-red focus:outline-none'

const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` })

async function post(url, body) {
  try {
    const res = await fetch(url, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body || {}) })
    const d = await res.json().catch(() => ({}))
    return res.ok ? { ok: true, data: d } : { ok: false, error: d.error || 'tandem.failed' }
  } catch { return { ok: false, error: 'tandem.failed' } }
}

function Avatar({ user, size = 'w-14 h-14 text-xl' }) {
  return (
    <span className={`${size} rounded-full border-2 border-navy bg-brand-yellow/30 overflow-hidden flex items-center justify-center font-display font-extrabold text-navy shrink-0`}>
      {user?.photo_url ? <img src={user.photo_url} alt="" className="w-full h-full object-cover"/> : (user?.first_name || '?')[0]}
    </span>
  )
}

// Tandem (backend routes/tandems.js and routes/tandemGroups.js). Two tabs:
// 1-to-1 partners (opt-in list, hello, temporary chat) and groups (a free
// conversation swap, half the seats per language). Free, no bananas.
export default function TandemPage() {
  return <Suspense><Tandem/></Suspense>
}

// The signed-in member, read when a tab renders its data (client only).
const readMe = () => { try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null } }

function Tandem() {
  const router = useRouter()
  const { t } = useLanguage()
  const [tab, setTab] = useState(useSearchParams().get('tab') === 'groups' ? 'groups' : 'partners')

  useEffect(() => {
    if (!localStorage.getItem('token')) router.push('/auth/login')
  }, [router])

  const langs = Object.fromEntries(languageOptions(t).map(l => [l.code, l]))
  const lang = code => (langs[code] ? `${langs[code].flag} ${langs[code].name}` : code)

  const pick = key => {
    setTab(key)
    window.history.replaceState(null, '', key === 'groups' ? '/tandem?tab=groups' : '/tandem')
  }

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        <header>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-navy">🤝 {t('tandem.title')}</h1>
          <p className="text-navy/65 text-sm md:text-base mt-1">{t('tandem.subtitle')}</p>
          <SegmentedTabs active={tab} onChange={pick} className="mt-4" tabs={[
            { key: 'partners', label: t('tandem.tabPartners') },
            { key: 'groups', label: `👥 ${t('tandem.tabGroups')}` },
          ]} />
        </header>
        {tab === 'partners' ? <Partners t={t} lang={lang} router={router}/> : <Groups t={t} lang={lang}/>}
      </div>
    </main>
  )
}

function Partners({ t, lang, router }) {
  const [data, setData] = useState(null)
  const [asking, setAsking] = useState(null)
  const [hello, setHello] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = useCallback(() => {
    fetch('/api/tandems', { headers: authHeaders() })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setData({ failed: true }))
  }, [])
  useEffect(() => { load() }, [load])

  const run = async (fn) => {
    setBusy(true); setError('')
    const r = await fn()
    setBusy(false)
    if (r && !r.ok) setError(r.error)
    return r
  }
  const toggle = () => run(async () => {
    const r = await setTandemOpen(!data.open)
    if (r.ok) load()
    return r
  })
  const sendHello = () => run(async () => {
    const r = await post('/api/tandems', { partner_id: asking.id, message: hello })
    if (r.ok) { setAsking(null); setHello(''); load() }
    return r
  })
  const respond = (id, accept) => run(async () => {
    const r = await post(`/api/tandems/${id}/respond`, { accept })
    if (r.ok) { if (accept) router.push(`/tandem/${id}`); else load() }
    return r
  })
  const withdraw = id => run(async () => {
    const r = await post(`/api/tandems/${id}/end`)
    if (r.ok) load()
    return r
  })
  const invite = async () => {
    const me = readMe()
    const link = `https://gongbuleng.com/?invite=${userCode(me?.id)}`
    try {
      if (navigator.share) await navigator.share({ url: link, text: t('tandem.inviteText') })
      else { await navigator.clipboard.writeText(link); setCopied(true) }
    } catch {}
  }

  if (!data) return null
  if (data.failed) return <p className="text-brand-red text-sm font-bold">{t('tandem.failed')}</p>
  const me = readMe()

  const tandems = data.tandems || []
  const incoming = tandems.filter(x => x.status === 'pending' && x.incoming)
  const waiting = tandems.filter(x => x.status === 'pending' && !x.incoming)
  const partners = tandems.filter(x => x.status === 'accepted')
  const learnList = u => (u.learn_languages || []).filter(Boolean)
  const myLearn = data.learn_languages || []
  const when = iso => formatInTimezone(iso, me?.timezone, me?.time_format)

  return (
    <>
      <ol className="grid sm:grid-cols-3 gap-2.5">
        {[1, 2, 3].map(n => (
          <li key={n} className="bg-white border-2 border-navy rounded-xl p-3">
            <p className="flex items-center gap-2 font-bold text-navy text-sm">
              <span className="w-6 h-6 shrink-0 rounded-full bg-navy text-white text-xs flex items-center justify-center">{n}</span>{t(`tandem.step${n}`)}
            </p>
            <p className="hidden sm:block text-navy/75 text-xs mt-1.5 leading-relaxed">{t(`tandem.step${n}Note`)}</p>
          </li>
        ))}
      </ol>

      <section className={CARD}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-bold text-navy">{t('tandem.switchLabel')}</p>
            <p className="text-sm mt-0.5">
              {data.open
                ? <><span className="font-bold text-brand-teal-dark">✅ {t('tandem.onState')}</span> <span className="text-navy/75">{t('tandem.onNote', { lang: lang(data.teach_language) })}</span></>
                : <span className="text-navy/75">{t('tandem.offNote')}</span>}
            </p>
          </div>
          <SwitchButton checked={data.open} onClick={toggle} disabled={busy} label={t('tandem.switchLabel')}/>
        </div>
        {data.has_languages && (
          <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t-2 border-dashed border-navy/10 text-sm text-navy">
            <span className="text-navy/65">{t('tandem.matchingOn')}</span>
            <span className="border-2 border-navy rounded-full px-2.5 py-0.5 text-xs font-bold">{t('tandem.youTeach')} {lang(data.teach_language)}</span>
            <span className="border-2 border-navy rounded-full px-2.5 py-0.5 text-xs font-bold">{t('tandem.youLearn')} {myLearn.map(lang).join(', ')}</span>
            <Link href="/profile" className="text-xs font-bold underline">{t('tandem.change')}</Link>
          </div>
        )}
      </section>
      {error && <p className="text-brand-red text-sm font-bold">{t(error)}</p>}

      {incoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display font-extrabold text-xl text-navy">👋 {t('tandem.incoming')}</h2>
          {incoming.map(x => (
            <div key={x.id} className={CARD}>
              <div className="flex items-center gap-3">
                <Avatar user={x.other}/>
                <div className="min-w-0">
                  <a href={`/teachers/${x.other.id}`} className="font-display font-extrabold text-navy text-lg hover:text-brand-red">{t('tandem.wantsTandem', { name: x.other.first_name })}</a>
                  <p className="text-navy/65 text-xs">{lang(x.other.teach_language)} ⇄ {learnList(x.other).map(lang).join(', ')}</p>
                </div>
              </div>
              <p className="mt-3 bg-cream border-2 border-navy/10 rounded-xl px-3 py-2 text-sm text-navy whitespace-pre-line break-words">{x.message}</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => respond(x.id, true)} disabled={busy} className={PRIMARY}>✓ {t('tandem.accept')}</button>
                <button onClick={() => respond(x.id, false)} disabled={busy} className={BUTTON}>{t('tandem.notNow')}</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {partners.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display font-extrabold text-xl text-navy">💬 {t('tandem.partners')}</h2>
          {partners.map(x => (
            <Link key={x.id} href={`/tandem/${x.id}`} className={`${CARD} flex items-center gap-3 hover:bg-cream transition-colors`}>
              <Avatar user={x.other}/>
              <span className="min-w-0 flex-1">
                <span className="block font-display font-extrabold text-navy text-lg">{x.other.first_name}</span>
                <span className="block text-navy/65 text-xs">
                  {x.agreed_time && new Date(x.agreed_time) > new Date() ? `🗓️ ${t('tandem.callAt', { time: when(x.agreed_time) })}` : x.chat_open ? `💬 ${t('tandem.chatOpenShort')}` : `🔒 ${t('tandem.chatClosedShort')}`}
                </span>
              </span>
              <span className={BUTTON}>{t('tandem.openChat')} →</span>
            </Link>
          ))}
        </section>
      )}

      {waiting.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display font-extrabold text-lg text-navy">⏳ {t('tandem.waiting')}</h2>
          {waiting.map(x => (
            <div key={x.id} className="flex items-center justify-between gap-3 bg-white border-2 border-navy/15 rounded-xl px-3 py-2">
              <span className="text-sm text-navy">{t('tandem.waitingFor', { name: x.other.first_name })}</span>
              <button onClick={() => withdraw(x.id)} disabled={busy} className="text-navy/65 text-xs font-bold hover:text-brand-red">{t('tandem.withdraw')}</button>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-display font-extrabold text-xl text-navy">🔎 {t('tandem.matches')}</h2>
        {!data.has_languages ? (
          <div className={EMPTY}>{t('tandem.needLanguages')} <Link href="/profile" className="font-bold underline">{t('tandem.setLanguages')} →</Link></div>
        ) : !data.open ? (
          <div className={EMPTY}><b className="block mb-0.5">{t('tandem.switchOnTitle')}</b>{t('tandem.switchOnNote', { n: data.open_count })}</div>
        ) : data.matches.length === 0 ? (
          <div className={EMPTY}>
            <b className="block mb-0.5">{t('tandem.nobodyTitle', { lang: myLearn.map(lang).join(' / ') })}</b>
            {t('tandem.nobodyNote', { n: data.open_count })}
            <div className="mt-3">
              <button onClick={invite} className={BUTTON}>📨 {copied ? t('tandem.inviteCopied') : t('tandem.invite')}</button>
            </div>
          </div>
        ) : data.matches.map(m => (
          <div key={m.id} className={CARD}>
            <div className="flex items-center gap-3">
              <Avatar user={m}/>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <a href={`/teachers/${m.id}`} className="font-display font-extrabold text-navy text-lg hover:text-brand-red">{m.first_name}</a>
                  <span className={`text-[11px] font-bold border-2 border-navy rounded-full px-2 ${m.perfect ? 'bg-brand-green/40' : 'bg-white'}`}>
                    {m.perfect ? `⇄ ${t('tandem.perfect')}` : t('tandem.oneWay')}
                  </span>
                </div>
                <p className="text-navy/65 text-xs mt-0.5">
                  {t('tandem.teaches')} {lang(m.teach_language)}
                  {learnList(m).length > 0 && <> · {t('tandem.learns')} {learnList(m).map(c => `${lang(c)}${m.learn_details?.[c]?.level ? ` ${levelLabel(c, m.learn_details[c].level, t)}` : ''}`).join(', ')}</>}
                  {m.sharedTimes > 0 && <> · 🕒 {t('tandem.sharedTimes')}</>}
                </p>
              </div>
            </div>
            {asking?.id === m.id ? (
              <form className="mt-3 space-y-2" onSubmit={e => { e.preventDefault(); sendHello() }}>
                <textarea value={hello} onChange={e => setHello(e.target.value)} maxLength={300} rows={3} autoFocus
                  aria-label={t('tandem.helloLabel')} placeholder={t('tandem.helloPlaceholder', { name: m.first_name })}
                  className={`w-full ${INPUT}`}/>
                <p className="text-navy/65 text-xs">🔒 {t('tandem.helloPrivacy', { name: m.first_name })}</p>
                <div className="flex gap-2">
                  <button type="submit" disabled={!hello.trim() || busy} className={PRIMARY}>{t('tandem.send')}</button>
                  <button type="button" onClick={() => setAsking(null)} className={BUTTON}>{t('tandem.cancel')}</button>
                </div>
              </form>
            ) : (
              <button onClick={() => { setAsking(m); setHello('') }} className={`${m.perfect ? PRIMARY : BUTTON} mt-3`}>
                👋 {t(m.perfect ? 'tandem.ask' : 'tandem.askAnyway')}
              </button>
            )}
          </div>
        ))}
        <div className="flex gap-x-5 gap-y-1.5 flex-wrap text-xs text-navy/75">
          <span><span className="font-bold border-2 border-navy rounded-full px-2 mr-1 bg-brand-green/40">⇄ {t('tandem.perfect')}</span>{t('tandem.perfectNote')}</span>
          <span><span className="font-bold border-2 border-navy rounded-full px-2 mr-1 bg-white">{t('tandem.oneWay')}</span>{t('tandem.oneWayNote')}</span>
        </div>
      </section>
    </>
  )
}

function Groups({ t, lang }) {
  const [groups, setGroups] = useState(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ lang_a: '', lang_b: '', starts_at: '', duration_minutes: 60, size: 4, topic: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    fetch('/api/tandem-groups', { headers: authHeaders() })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setGroups)
      .catch(() => setGroups('failed'))
  }, [])
  useEffect(() => { load() }, [load])

  const codes = languageOptions(t).map(l => l.code)
  const startCreate = () => {
    const me = readMe()
    setForm(f => ({ ...f, lang_a: f.lang_a || me?.teach_language || '' }))
    setCreating(true)
  }

  const act = async (url, body) => {
    setBusy(true); setError('')
    const r = await post(url, body)
    setBusy(false)
    if (!r.ok) setError(r.error)
    else load()
    return r
  }
  const create = async () => {
    const r = await act('/api/tandem-groups', { ...form, starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : '' })
    if (r.ok) { setCreating(false); setForm(f => ({ ...f, starts_at: '', topic: '' })) }
  }

  if (groups === null) return null
  if (groups === 'failed') return <p className="text-brand-red text-sm font-bold">{t('tandem.failed')}</p>
  const me = readMe()
  const when = iso => formatInTimezone(iso, me?.timezone, me?.time_format)

  const chip = on => `border-2 rounded-full px-3 py-1 text-xs font-bold ${on ? 'border-navy bg-navy text-white' : 'border-navy/20 bg-white text-navy'}`

  return (
    <>
      <p className="text-navy/75 text-sm">{t('tandem.groupsIntro')}</p>
      {error && <p className="text-brand-red text-sm font-bold">{t(error)}</p>}

      {creating ? (
        <form className={`${CARD} space-y-3`} onSubmit={e => { e.preventDefault(); create() }}>
          <h2 className="font-display font-extrabold text-xl text-navy">{t('tandem.createTitle')}</h2>
          {['lang_a', 'lang_b'].map((key, i) => (
            <div key={key}>
              <p className="text-xs font-extrabold text-navy mb-1">{t(i === 0 ? 'tandem.createYourLang' : 'tandem.createOtherLang')}</p>
              <div className="flex gap-1.5 flex-wrap">
                {codes.map(c => (
                  <button type="button" key={c} onClick={() => setForm(f => ({ ...f, [key]: c }))} disabled={i === 1 && c === form.lang_a}
                    className={`${chip(form[key] === c)} disabled:opacity-30`}>{lang(c)}</button>
                ))}
              </div>
            </div>
          ))}
          <label className="block">
            <span className="block text-xs font-extrabold text-navy mb-1">{t('tandem.createWhen')}</span>
            <input type="datetime-local" required value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} className={INPUT}/>
          </label>
          <div className="flex gap-6 flex-wrap">
            <div>
              <p className="text-xs font-extrabold text-navy mb-1">{t('tandem.createLength')}</p>
              <div className="flex gap-1.5">{[45, 60, 90].map(n => <button type="button" key={n} onClick={() => setForm(f => ({ ...f, duration_minutes: n }))} className={chip(form.duration_minutes === n)}>{n} min</button>)}</div>
            </div>
            <div>
              <p className="text-xs font-extrabold text-navy mb-1">{t('tandem.createSize')}</p>
              <div className="flex gap-1.5">{[4, 6, 8].map(n => <button type="button" key={n} onClick={() => setForm(f => ({ ...f, size: n }))} className={chip(form.size === n)}>{n} ({n / 2} + {n / 2})</button>)}</div>
            </div>
          </div>
          <label className="block">
            <span className="block text-xs font-extrabold text-navy mb-1">{t('tandem.createTopic')}</span>
            <input value={form.topic} maxLength={120} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} placeholder={t('tandem.createTopicPlaceholder')} className={`w-full ${INPUT}`}/>
          </label>
          <p className="text-navy/65 text-xs">{t('tandem.createRules')}</p>
          <div className="flex gap-2">
            <button type="submit" disabled={busy || !form.lang_a || !form.lang_b || !form.starts_at} className={PRIMARY}>{t('tandem.createSubmit')}</button>
            <button type="button" onClick={() => setCreating(false)} className={BUTTON}>{t('tandem.cancel')}</button>
          </div>
        </form>
      ) : (
        <button onClick={startCreate} className={PRIMARY}>+ {t('tandem.createButton')}</button>
      )}

      {groups.length === 0 ? (
        <div className={EMPTY}><b className="block mb-0.5">{t('tandem.noGroupsTitle')}</b>{t('tandem.noGroupsNote')}</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {groups.map(g => (
            <div key={g.id} className={CARD}>
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display font-extrabold text-navy text-lg leading-tight">{lang(g.lang_a)} ⇄ {lang(g.lang_b)}</p>
                  <p className="text-navy/65 text-xs mt-0.5">{t('tandem.hostedBy', { name: g.host_first_name })} · {g.duration_minutes} min</p>
                  {g.topic && <p className="text-navy text-sm mt-1 break-words">{g.topic}</p>}
                </div>
                <p className="text-right text-navy text-xs font-bold shrink-0 max-w-[40%]">{when(g.starts_at)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {[['a', g.side_a, g.lang_a], ['b', g.side_b, g.lang_b]].map(([k, people, code]) => (
                  <div key={k} className="border-2 border-navy/15 rounded-xl px-2 py-1.5">
                    <p className="text-[11px] font-bold text-navy">{t('tandem.speakers', { lang: lang(code), n: people.length, max: g.half })}</p>
                    <span className="flex gap-1 mt-1.5">
                      {Array.from({ length: g.half }, (_, i) => people[i]
                        ? <Avatar key={i} user={people[i]} size="w-6 h-6 text-[10px]"/>
                        : <span key={i} className="w-6 h-6 rounded-full border-2 border-dashed border-navy/40 bg-white"/>)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap mt-3 text-xs">
                {g.joined ? (
                  <>
                    <span className="font-bold text-brand-teal-dark">✓ {t(g.is_host ? 'tandem.youHost' : 'tandem.youJoined')}</span>
                    <Link href={`/tandem/group/${g.id}`} className={PRIMARY}>💬 {t('tandem.openGroup')}</Link>
                  </>
                ) : g.can_join ? (
                  <>
                    <span className="text-navy/75">{t('tandem.youdJoinAs', { lang: lang(g.my_side === 'a' ? g.lang_a : g.lang_b) })}</span>
                    <button onClick={() => act(`/api/tandem-groups/${g.id}/join`)} disabled={busy} className={PRIMARY}>{t('tandem.joinFree')}</button>
                  </>
                ) : (
                  <span className="text-navy/65">{t(g.full ? 'tandem.sideFull' : 'tandem.notForYou')}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
