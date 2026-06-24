import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { trackerId } = await request.json()
  const res = NextResponse.json({ ok: true })
  res.cookies.set('miyucash_tracker_id', trackerId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    httpOnly: false,
  })
  return res
}
