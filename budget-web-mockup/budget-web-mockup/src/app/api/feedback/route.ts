import { NextRequest, NextResponse } from 'next/server';

// Server-only config (set in Vercel → Settings → Environment Variables):
//   FEEDBACK_GITHUB_TOKEN  – a GitHub token with Issues: write on the repo
//   FEEDBACK_GITHUB_REPO   – target repo as "owner/repo"
//   FEEDBACK_GITHUB_LABELS – optional comma-separated labels (must already
//                            exist in the repo, or GitHub rejects the request)
const GITHUB_TOKEN = process.env.FEEDBACK_GITHUB_TOKEN;
const GITHUB_REPO = process.env.FEEDBACK_GITHUB_REPO;
const GITHUB_LABELS = (process.env.FEEDBACK_GITHUB_LABELS || '')
  .split(',')
  .map((l) => l.trim())
  .filter(Boolean);

const TYPE_LABELS: Record<string, string> = {
  bug: 'Bug',
  feature: 'Feature request',
  general: 'General feedback',
};

const SUBJECT_MAX = 150;
const MESSAGE_MAX = 5000;

export async function POST(request: NextRequest) {
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    console.error('[feedback] Missing FEEDBACK_GITHUB_TOKEN or FEEDBACK_GITHUB_REPO');
    return NextResponse.json(
      { error: 'Feedback is not configured yet. Please try again later.' },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // Honeypot: real users never fill this hidden field; bots often do.
  if (typeof body.company === 'string' && body.company.trim() !== '') {
    return NextResponse.json({ ok: true }); // silently accept + drop
  }

  const type = typeof body.type === 'string' ? body.type : 'general';
  const subject = String(body.subject ?? '').trim();
  const message = String(body.message ?? '').trim();
  const email = String(body.email ?? '').trim();
  const name = String(body.name ?? '').trim();
  const pageUrl = String(body.pageUrl ?? '').trim();

  if (!subject || !message) {
    return NextResponse.json(
      { error: 'Please add a subject and a message.' },
      { status: 400 },
    );
  }
  if (subject.length > SUBJECT_MAX || message.length > MESSAGE_MAX) {
    return NextResponse.json({ error: 'Your feedback is too long.' }, { status: 400 });
  }

  const typeLabel = TYPE_LABELS[type] ?? TYPE_LABELS.general;

  const issueBody = [
    message,
    '',
    '---',
    `**Type:** ${typeLabel}`,
    name || email ? `**From:** ${name}${email ? ` (${email})` : ''}` : null,
    pageUrl ? `**Submitted from:** ${pageUrl}` : null,
    `**Submitted:** ${new Date().toISOString()}`,
    '',
    '_Created automatically from the in-app feedback form._',
  ]
    .filter((line) => line !== null)
    .join('\n');

  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        title: `[${typeLabel}] ${subject}`,
        body: issueBody,
        ...(GITHUB_LABELS.length > 0 ? { labels: GITHUB_LABELS } : {}),
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('[feedback] GitHub issue creation failed', res.status, detail);
      return NextResponse.json(
        { error: 'Could not submit feedback. Please try again later.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[feedback] Unexpected error creating GitHub issue', err);
    return NextResponse.json(
      { error: 'Could not submit feedback. Please try again later.' },
      { status: 502 },
    );
  }
}
