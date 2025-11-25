import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://172.16.100.22:80'
const BACKEND_ROLE_ENDPOINT =
  process.env.BACKEND_ROLE_ENDPOINT || '/role_selection/'

const buildBackendUrl = () => {
  const trimmedBase = BACKEND_URL.replace(/\/$/, '')
  const normalizedPath = BACKEND_ROLE_ENDPOINT.startsWith('/')
    ? BACKEND_ROLE_ENDPOINT
    : `/${BACKEND_ROLE_ENDPOINT}`
  return `${trimmedBase}${normalizedPath}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const role = body?.role?.toString().trim()
    const label = body?.label?.toString().trim()

    if (!role) {
      return NextResponse.json(
        { error: 'Role is required' },
        { status: 400 }
      )
    }

    const backendResponse = await fetch(buildBackendUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role,
        label,
      }),
    })

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      throw new Error(
        `Role sync failed with status ${backendResponse.status}: ${errorText}`
      )
    }

    const data = await backendResponse.text()
    return NextResponse.json({
      success: true,
      backendResponse: data,
    })
  } catch (error: any) {
    console.error('Error forwarding role to backend:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync role with backend' },
      { status: 500 }
    )
  }
}


