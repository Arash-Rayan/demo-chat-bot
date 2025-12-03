import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://172.16.100.22:80'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const role = body?.role?.toString().trim()
    const roles = body?.roles // Get the roles array from frontend

    if (!role) {
      return NextResponse.json(
        { error: 'Role is required' },
        { status: 400 }
      )
    }

    if (!roles || !Array.isArray(roles)) {
      return NextResponse.json(
        { error: 'Roles array is required' },
        { status: 400 }
      )
    }

    const backendResponse = await fetch(`${BACKEND_URL}/set_role/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role,
        roles, // Forward roles array to backend
      }),
    })

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      throw new Error(
        `Role sync failed with status ${backendResponse.status}: ${errorText}`
      )
    }

    const data = await backendResponse.json()
    return NextResponse.json({
      success: true,
      role: data.role,
    })
  } catch (error: any) {
    console.error('Error forwarding role to backend:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync role with backend' },
      { status: 500 }
    )
  }
}


