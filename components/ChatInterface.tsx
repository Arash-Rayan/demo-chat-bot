'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './ChatInterface.module.css'

interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
  file?: {
    name: string
    type: string
    size: number
  }
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'سلام! من MOBIN هستم. چطور می‌تونم کمکتون کنم؟',
      sender: 'bot',
      timestamp: new Date(),
    },
  ])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check if file is a Word document
    const allowedTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    const allowedExtensions = ['.doc', '.docx']
    const fileExtension = file.name
      .substring(file.name.lastIndexOf('.'))
      .toLowerCase()

    // Check if it's an image (reject images)
    if (file.type.startsWith('image/')) {
      alert('تصاویر مجاز نیستند. لطفاً فقط فایل Word (.doc یا .docx) آپلود کنید.')
      e.target.value = ''
      return
    }

    // Check if it's a Word document
    if (
      !allowedTypes.includes(file.type) &&
      !allowedExtensions.includes(fileExtension)
    ) {
      alert('لطفاً فقط فایل Word (.doc یا .docx) آپلود کنید.')
      e.target.value = ''
      return
    }

    // Add file as a message
    const newMessage: Message = {
      id: Date.now().toString(),
      text: `📄 ${file.name}`,
      sender: 'user',
      timestamp: new Date(),
      file: {
        name: file.name,
        type: file.type,
        size: file.size,
      },
    }

    setMessages((prev) => [...prev, newMessage])
    setIsTyping(true)

    try {
      // Upload file to API
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'آپلود فایل با مشکل مواجه شد')
      }

      const data = await response.json()

      // Extract response text (backend returns text_response)
      const responseText = data.text_response || data.backendResponse?.text_response || data.backendResponse?.response || data.backendResponse?.message || data.response || data.message || `فایل شما دریافت شد: ${file.name}. چطور می‌تونم کمکتون کنم؟`
      
      // Optionally include file_report if available
      const fileReport = data.file_report || data.backendResponse?.file_report
      const displayText = fileReport 
        ? `${responseText}\n\n📋 گزارش فایل:\n${fileReport}`
        : responseText

      // Add bot response
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: displayText,
          sender: 'bot',
          timestamp: new Date(),
        },
      ])
    } catch (error: any) {
      console.error('Error uploading file:', error)
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: `خطا: ${error.message || 'پردازش فایل با مشکل مواجه شد'}`,
          sender: 'bot',
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsTyping(false)
      e.target.value = ''
    }
  }

  const handleSendMessage = async () => {
    if (!inputText.trim()) return

    const messageText = inputText.trim()
    const newMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newMessage])
    setInputText('')
    setIsTyping(true)

    try {
      // Send message to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: messageText }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'ارسال پیام با مشکل مواجه شد')
      }

      const data = await response.json()

      // Extract response text (backend returns text_response)
      const responseText = data.text_response || data.response || data.message || data.answer || 'متوجه شدم. چطور دیگه می‌تونم کمکتون کنم؟'
      
      // Optionally include file_report if available
      const fileReport = data.file_report
      const displayText = fileReport 
        ? `${responseText}\n\n📋 گزارش فایل:\n${fileReport}`
        : responseText

      // Add bot response
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: displayText,
          sender: 'bot',
          timestamp: new Date(),
        },
      ])
    } catch (error: any) {
      console.error('Error sending message:', error)
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: `خطا: ${error.message || 'ارسال پیام با مشکل مواجه شد. لطفاً بررسی کنید که بک‌اند روی 172.16.100.22:4000 در حال اجرا باشد.'}`,
          sender: 'bot',
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatTime = (date: Date) => {
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    const displayMinutes = minutes.toString().padStart(2, '0')
    return `${displayHours}:${displayMinutes} ${ampm}`
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>MOBIN</h1>
        <p className={styles.subtitle}>دستیار هوشمند شما</p>
      </div>

      <div className={styles.chatContainer}>
        <div className={styles.messages}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`${styles.message} ${
                message.sender === 'user' ? styles.userMessage : styles.botMessage
              }`}
            >
              <div className={styles.messageContent}>
                <p>{message.text}</p>
                {message.file && (
                  <div className={styles.fileInfo}>
                    <span className={styles.fileName}>{message.file.name}</span>
                    <span className={styles.fileSize}>
                      {formatFileSize(message.file.size)}
                    </span>
                  </div>
                )}
              </div>
              <span className={styles.timestamp}>
                {formatTime(message.timestamp)}
              </span>
            </div>
          ))}
          {isTyping && (
            <div className={`${styles.message} ${styles.botMessage}`}>
              <div className={styles.typingIndicator}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className={styles.inputContainer}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileSelect}
            className={styles.fileInput}
            id="file-input"
          />
          <label htmlFor="file-input" className={styles.fileButton}>
            📎
          </label>
          <textarea
            className={styles.textInput}
            placeholder="پیام خود را بنویسید..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={1}
          />
          <button
            className={styles.sendButton}
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
          >
            →
          </button>
        </div>
      </div>
    </div>
  )
}

