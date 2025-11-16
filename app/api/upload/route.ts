import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import mammoth from 'mammoth'

const BACKEND_URL = process.env.BACKEND_URL || 'http://172.16.100.22:4000'
const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads', 'guest')
const USERNAME = process.env.USERNAME || 'guest'

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

    // Prepare file path for backend (remote system path)
    // Note: This should match the actual backend upload directory
    const remoteFilePath = process.env.REMOTE_FILE_PATH || `/home/ubuntu2204/Desktop/arash/chat_bot_mobin/module/upload/guest/${file.name}`

    // Send file text to backend with the expected format
    const backendResponse = await fetch(`${BACKEND_URL}/process_request/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: extractedText || `لطفا این فایل من بررسی شود: ${file.name}`,
        file_path: remoteFilePath,
        username: USERNAME,
      }),
    })

    if (!backendResponse.ok) {
      throw new Error(
        `Backend responded with status: ${backendResponse.status}`
      )
    }

    const backendData = await backendResponse.json()

    return NextResponse.json({
      success: true,
      message: `File "${file.name}" uploaded and processed successfully`,
      filename: file.name,
      filepath: filePath,
      extractedText: extractedText.substring(0, 200) + '...', // Preview
      backendResponse: backendData,
    })
  } catch (error: any) {
    console.error('Error processing file upload:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process file upload' },
      { status: 500 }
    )
  }
}

