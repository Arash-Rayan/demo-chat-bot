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

    // Backend expects: { "prompt": "..." }
    const requestBody = { prompt: message }

    const backendResponse = await fetch(`${BACKEND_URL}/process_request/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(requestBody),
    })

    if (!backendResponse.ok || !backendResponse.body) {
      throw new Error(
        `Backend responded with status: ${backendResponse.status}`
      )
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = backendResponse.body!.getReader()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              controller.close()
              break
            }
            if (value) {
              controller.enqueue(value)
            }
          }
        } catch (error) {
          controller.error(error)
        } finally {
          reader.releaseLock()
        }
      },
      cancel() {
        backendResponse.body?.cancel().catch(() => {
          // Ignore cancel errors
        })
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('Error forwarding message to backend:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    )
  }
}

