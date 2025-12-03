import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import mammoth from 'mammoth'

const BACKEND_URL = process.env.BACKEND_URL || 'http://172.16.100.22:80'
const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads', 'guest')

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    const allowedExtensions = ['.doc', '.docx']
    const fileExtension = file.name
      .substring(file.name.lastIndexOf('.'))
      .toLowerCase()

    if (
      !allowedTypes.includes(file.type) &&
      !allowedExtensions.includes(fileExtension)
    ) {
      return NextResponse.json(
        { error: 'Only Word documents (.doc, .docx) are allowed' },
        { status: 400 }
      )
    }

    // Read file buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Ensure upload directory exists
    try {
      await mkdir(UPLOAD_DIR, { recursive: true })
    } catch (error: any) {
      // Directory might already exist, that's okay
      if (error.code !== 'EEXIST') {
        console.error('Error creating upload directory:', error)
      }
    }

    // Save file to the specified path
    const filePath = join(UPLOAD_DIR, file.name)
    await writeFile(filePath, buffer)

    // Extract text from Word document
    let extractedText = ''
    try {
      if (fileExtension === '.docx') {
        const result = await mammoth.extractRawText({ buffer })
        extractedText = result.value
      } else {
        // For .doc files, mammoth might not work well
        // You may need to add additional library for .doc support
        extractedText = `[File uploaded: ${file.name}. Text extraction for .doc files may require additional processing.]`
      }
    } catch (error) {
      console.error('Error extracting text from document:', error)
      extractedText = `[File uploaded: ${file.name}. Could not extract text content.]`
    }

    // Send file + prompt to backend using multipart form data
    // Note: Role is set separately via /set_role/ endpoint, so we don't send it here
    const backendForm = new FormData()
    const promptText = formData.get('prompt')?.toString().trim()
    const fallbackPrompt = `File uploaded: ${file.name}.`
    backendForm.append('prompt', promptText || fallbackPrompt)
    backendForm.append('file', file, file.name)

    const backendResponse = await fetch(`${BACKEND_URL}/process_request/`, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream, text/plain;q=0.9',
      },
      body: backendForm,
    })

    if (!backendResponse.ok || !backendResponse.body) {
      throw new Error(
        `Backend responded with status: ${backendResponse.status}`
      )
    }

    // Collect streaming response from backend into a single string
    const reader = backendResponse.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let backendText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        backendText += decoder.decode(value, { stream: true })
      }
    }
    backendText += decoder.decode()

    const extractedPreview = extractedText
      ? `${extractedText.substring(0, 200)}...`
      : ''

    return NextResponse.json({
      success: true,
      message: `File "${file.name}" uploaded and processed successfully`,
      filename: file.name,
      filepath: filePath,
      extractedText: extractedPreview, // Preview
      text_response: backendText || 'پاسخی دریافت نشد.',
    })
  } catch (error: any) {
    console.error('Error processing file upload:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process file upload' },
      { status: 500 }
    )
  }
}

