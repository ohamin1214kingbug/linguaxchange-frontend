// Builds docs/marketing/email-samples.html: every email the site sends, drawn
// in one shared design. renderEmailHtml is written as real email HTML (tables,
// inline styles) so it can move into the backend unchanged if approved.
const fs = require('fs')
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const NAVY = '#1a1a2e', RED = '#da1f33', CREAM = '#fdf3e7'
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

function renderEmailHtml({ heading, paragraphs = [], box, button, footnote, headerUrl }) {
  const p = t => `<p style="margin:0 0 16px; font-size:16px; line-height:1.6; color:${NAVY};">${esc(t)}</p>`
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM}; font-family:${FONT};">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background:#ffffff; border:2px solid ${NAVY}; border-radius:16px; overflow:hidden;">
    <tr><td><img src="${headerUrl}" width="600" alt="GongbuLeng" style="display:block; width:100%; height:auto; border:0;"></td></tr>
    <tr><td style="padding:32px 32px 8px;">
      <h1 style="margin:0 0 16px; font-size:26px; line-height:1.25; font-weight:800; color:${NAVY};">${esc(heading)}</h1>
      ${paragraphs.map(p).join('\n      ')}
      ${box ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px; background:${CREAM}; border:2px solid ${NAVY}; border-radius:12px;"><tr><td style="padding:14px 18px; font-size:15px; line-height:1.6; color:${NAVY};">${box.map(([k, v]) => `<strong>${esc(k)}</strong> ${esc(v)}`).join('<br>')}</td></tr></table>` : ''}
      ${button ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td style="background:${RED}; border:2px solid ${NAVY}; border-radius:999px;"><a href="${esc(button.url)}" style="display:inline-block; padding:13px 28px; font-size:16px; font-weight:700; color:#ffffff; text-decoration:none;">${esc(button.label)}</a></td></tr></table>` : ''}
    </td></tr>
    <tr><td style="padding:16px 32px 24px; border-top:2px solid ${CREAM}; font-size:13px; line-height:1.6; color:#5a5a6e;">
      ${footnote ? `${esc(footnote)}<br>` : ''}GongbuLeng · <a href="https://gongbuleng.com" style="color:#5a5a6e;">gongbuleng.com</a> · Questions? gongbuleng.team@gmail.com
    </td></tr>
  </table>
</td></tr></table>`
}

const SITE = 'https://gongbuleng.com'
// Example member, class and times; the real emails fill these in.
const emails = [
  { when: 'Someone signs up', subject: 'Welcome to GongbuLeng!', heading: 'Welcome, Ana!',
    paragraphs: ['You start with 3 bananas. Joining a class costs 1, and you earn 1 for every student who attends a class you teach.', "You can already browse classes and request the one you want. Teaching your own classes opens once your account is approved. We'll email you when it is."],
    button: { label: 'Browse classes', url: `${SITE}/classes` } },
  { when: 'An admin approves the member', subject: 'Your GongbuLeng account is approved', heading: "You're approved to teach",
    paragraphs: ['Good news, Ana: your account is approved, so you can now create and teach your own classes.', 'You earn 1 banana for every student who attends.'],
    button: { label: 'Create a class', url: `${SITE}/classes/create` } },
  { when: 'A member asks to reset their password', subject: 'Reset your GongbuLeng password', heading: 'Reset your password',
    paragraphs: ['Hi Ana, use the button below to choose a new password.', "This link expires in 1 hour. If you didn't request this, you can ignore this email."],
    button: { label: 'Reset password', url: `${SITE}/auth/reset-password` } },
  { when: 'A member adds a university email', subject: 'Confirm your university email — GongbuLeng', heading: 'Confirm your university email',
    paragraphs: ['Confirm that this address belongs to you.', "This link expires in 24 hours. If you didn't ask for this, you can ignore this email."],
    button: { label: 'Confirm email', url: `${SITE}/university/confirm` } },
  { when: "An admin approves a teacher's class", subject: "Your class 'Korean conversation for beginners' has been approved!", heading: 'Your class is live',
    paragraphs: ["Hi Ana, 'Korean conversation for beginners' is approved. Students can join it now."],
    button: { label: 'Open your dashboard', url: `${SITE}/dashboard` } },
  { when: 'A student joins a class (to the teacher)', subject: "A student joined 'Korean conversation for beginners'", heading: 'A student joined your class',
    paragraphs: ["Hi Ana, Lucas has joined 'Korean conversation for beginners'."],
    button: { label: 'Open your dashboard', url: `${SITE}/dashboard` } },
  { when: '1 hour before class (teacher and students)', subject: 'Your class starts in 1 hour', heading: 'Your class starts in 1 hour',
    paragraphs: ['Hi Lucas, your class with Ana starts in about 1 hour.'],
    box: [['Class:', 'Korean conversation for beginners'], ['Starts:', 'Nov 12, 2026, 6:00 PM']],
    button: { label: 'Join the class', url: `${SITE}/classroom/123` } },
  { when: 'A class is cancelled (to each student)', subject: "'Korean conversation for beginners' has been cancelled", heading: 'Your class was cancelled',
    paragraphs: ["Hi Lucas, the class 'Korean conversation for beginners' has been cancelled by the teacher.", 'Your banana has been refunded.'],
    button: { label: 'Find another class', url: `${SITE}/classes` } },
  { when: "A member's balance gets low", subject: "You're down to 1 banana", heading: "You're down to 1 banana",
    paragraphs: ["Hi Ana, you're down to 1 banana on GongbuLeng, enough for one more class.", 'Teach a class to earn more: 1 banana for every student who attends.'],
    button: { label: 'Create a class', url: `${SITE}/classes/create` } },
  { when: 'A new class in a language the member follows', subject: 'New Korean A1 class: Korean conversation for beginners', heading: 'New Korean A1 class',
    paragraphs: ['Hi Lucas, a new Korean A1 class was just posted: "Korean conversation for beginners".'],
    button: { label: 'See it and join', url: `${SITE}/classes?language=KO&level=A1` },
    footnote: 'You get this because you asked to hear about new Korean classes. Turn it off on the same page.' },
  { when: 'A student requests a class (to teachers of that language)', subject: 'A student wants a Korean A1 class: Ordering food', heading: 'A student wants a Korean A1 class',
    paragraphs: ['Hi Ana, someone asked for a class you could teach.', 'Answer it and every student who joins earns you a banana.'],
    box: [['Topic:', 'Ordering food'], ['Preferred time:', 'Nov 14, 2026, 7:00 PM (flexible)']],
    button: { label: 'See the request', url: `${SITE}/classes?tab=requests&language=KO` },
    footnote: 'You get this because you teach this language. Turn these emails off in Settings.' },
  { when: 'An admin suspends an account', subject: 'Your GongbuLeng account has been suspended', heading: 'Your account has been suspended',
    paragraphs: ['Hi Ana, your GongbuLeng account has been suspended.', '1 of your upcoming classes has been cancelled and the students refunded.', 'If you believe this is a mistake, write to gongbuleng.team@gmail.com.'],
    box: [['Until:', 'Wed, 18 Nov 2026 12:00:00 GMT'], ['Reason:', '(the reason the admin typed)']] },
  { when: 'A member deletes their account', subject: 'Your GongbuLeng account has been deleted', heading: 'Your account has been deleted',
    paragraphs: ['Hi Ana, your GongbuLeng account has been deleted and your personal details have been removed.', "Classes you had scheduled were cancelled and the students enrolled in them were refunded. Records of past classes and banana transactions are kept without your name attached, because other members' history and our financial records depend on them.", "If you didn't request this, write to gongbuleng.team@gmail.com immediately."] },
  { when: 'Someone signs up (to you, the admin)', subject: 'New user waiting for approval', heading: 'New member waiting for approval',
    paragraphs: ['Ana (ana@example.com) just signed up and is waiting for approval.'],
    button: { label: 'Review in admin', url: `${SITE}/admin` } },
]

module.exports = { renderEmailHtml, emails }
if (require.main !== module) return

const page = `<!doctype html>
<!-- Sample only: how every email the site sends would look with a picture
     header. Nothing here is live; the backend still sends plain text.
     Rebuild: node docs/marketing/brand/make-email-samples.js docs/marketing/email-samples.html
     Header picture: brand/email-header.png. -->
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>GongbuLeng email samples</title>
<style>
  body { margin:0; background:#ecebe7; font-family:${FONT}; color:${NAVY}; }
  header { max-width:1320px; margin:0 auto; padding:32px 16px 8px; }
  header h1 { font-size:28px; margin:0 0 8px; }
  header p { margin:0; font-size:15px; line-height:1.5; max-width:70ch; }
  .grid { max-width:1320px; margin:0 auto; padding:16px; display:grid; grid-template-columns:repeat(auto-fill, minmax(min(100%, 420px), 1fr)); gap:24px; align-items:start; }
  .mail { min-width:0; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,.15); }
  .meta { padding:12px 16px; border-bottom:1px solid #ddd; font-size:13px; line-height:1.5; }
  .meta b { display:block; font-size:15px; }
  .meta span { color:#5a5a6e; }
</style></head><body>
<header><h1>GongbuLeng email samples</h1>
<p>All ${emails.length} emails the site sends, in one design. Names, classes and times are examples. This is a sample: the live site still sends plain text until you approve the design.</p></header>
<div class="grid">
${emails.map((e, i) => `<div class="mail"><div class="meta"><span>${i + 1}. ${esc(e.when)}</span><b>${esc(e.subject)}</b><span>GongbuLeng &lt;notifications@gongbuleng.com&gt;</span></div>
${renderEmailHtml({ ...e, headerUrl: 'brand/email-header.png' })}</div>`).join('\n')}
</div></body></html>`
fs.writeFileSync(process.argv[2], page)
console.log(emails.length, 'emails')
