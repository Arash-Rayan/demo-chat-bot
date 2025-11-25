import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://172.16.100.22:80'
const RESET_ENDPOINT =
  process.env.BACKEND_RESET_ENDPOINT || '/reset_chat/'

const buildBackendUrl = () => {
  const trimmedBase = BACKEND_URL.replace(/\/$/, '')
  const normalizedPath = RESET_ENDPOINT.startsWith('/')
    ? RESET_ENDPOINT
    : `/${RESET_ENDPOINT}`
  return `${trimmedBase}${normalizedPath}`
}

export async function POST(req: NextRequest) {
  try {
    const backendResponse = await fetch(buildBackendUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      throw new Error(
        `Backend reset failed with status ${backendResponse.status}: ${errorText}`
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error resetting chat history:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reset chat history' },
      { status: 500 }
    )
  }
}


