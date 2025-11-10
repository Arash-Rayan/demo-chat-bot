import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://172.16.100.22:4000'
const USERNAME = process.env.USERNAME || 'guest'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, file_path } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Prepare request body matching backend format
    const requestBody: any = {
      prompt: message,
      username: USERNAME,
      file_path: file_path || '', // Always include file_path, empty string if not provided
    }

    // Forward the message to the backend
    const response = await fetch(`${BACKEND_URL}/process_request/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const data = await response.json()

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error forwarding message to backend:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    )
  }
}

