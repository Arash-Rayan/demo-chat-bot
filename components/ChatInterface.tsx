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

interface RoleOption {
  key: string
  label: string
}

const DEFAULT_WELCOME =
  'سلام! من MOBIN هستم. قبل از شروع لطفاً نقش خود را مشخص کنید.'

// All available roles and their Persian labels
const ROLE_OPTIONS: RoleOption[] = [
  { key: 'GENERAL_ADMIN', label: 'مدیر کل' },
  { key: 'CENTER_ADMIN', label: 'مدیر مرکز' },
  { key: 'PLAN_PROGRAM', label: 'طرح و برنامه' },
  { key: 'PLAN_PROGRAM_EXPERT', label: 'کارشناس طرح و برنامه' },
  { key: 'FINANCIAL', label: 'مالی' },
  { key: 'MANAGEMENT_REPORTS', label: 'گزارشات مدیریتی' },
  { key: 'CENTRAL_KASHEF', label: 'کاشف مرکزی' },
  { key: 'BROKER', label: 'کارگزار کاشف' },
  { key: 'APPROVAL_COMMISSION', label: 'کمیسیون تصویب' },
  { key: 'EVALUATOR', label: 'ارزیاب' },
  { key: 'SUPERVISOR', label: 'ناظر' },
  { key: 'BENEFICIARY', label: 'بهره‌بردار' },
  { key: 'JOB_SEEKER', label: 'کارجو' },
  { key: 'PARDIS_HEAD', label: 'مسئول پردیس' },
  { key: 'PARDIS_EXPERT', label: 'کارشناس پردیس' },
  { key: 'TEAM_LEADER', label: 'مسئول تیم' },
  { key: 'TEAM_MEMBER', label: 'عضو تیم' },
  { key: 'TEAM_FINDER', label: 'تیم‌یاب' },
  { key: 'DEFENSE_EXPERT', label: 'کارشناس دفاع' },
  { key: 'CENTER_EXPERT', label: 'کارشناس ارشد مرکز' },
  { key: 'PUBLIC', label: 'کاربر عادی' },
]

// Available roles that can be selected (for now)
const AVAILABLE_ROLES = [
  'TEAM_LEADER',
  'TEAM_MEMBER',
  'CENTRAL_KASHEF',
  'BROKER',
  'PARDIS_HEAD',
  'PUBLIC',
]

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: DEFAULT_WELCOME,
      sender: 'bot',
      timestamp: new Date(),
    },
  ])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [showRoleModal, setShowRoleModal] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/reset', {
      method: 'POST',
      signal: controller.signal,
    }).catch((error) => {
      console.error('Failed to reset chat history:', error)
    })

    return () => {
      controller.abort()
    }
  }, [])

  const getRoleLabel = (roleKey?: string | null) => {
    if (!roleKey) return ''
    return ROLE_OPTIONS.find((option) => option.key === roleKey)?.label || ''
  }

  const getWelcomeMessage = (roleKey?: string | null) => {
    const label = getRoleLabel(roleKey)
    if (!label) return DEFAULT_WELCOME
    return `سلام ${label} محترم خوش آمدید، سوالی داشتید در خدمتم.`
  }

  const updateWelcomeMessage = (text: string) => {
    setMessages((prev) => {
      if (!prev.length) {
        return [
          {
            id: 'welcome',
            text,
            sender: 'bot',
            timestamp: new Date(),
          },
        ]
      }
      const [first, ...rest] = prev
      if (first.sender !== 'bot') {
        return [
          {
            id: 'welcome',
            text,
            sender: 'bot',
            timestamp: new Date(),
          },
          ...prev,
        ]
      }
      return [{ ...first, text, timestamp: new Date() }, ...rest]
    })
  }

  const notifyBackendRole = async (roleKey: string) => {
    try {
      console.log('Sending role to backend:', { role: roleKey, roles: AVAILABLE_ROLES })
      const response = await fetch('/api/role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: roleKey, roles: AVAILABLE_ROLES }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Role sync failed:', errorData)
        throw new Error(errorData.error || 'Failed to sync role')
      }
      
      const data = await response.json()
      console.log('Role synced successfully:', data)
    } catch (error) {
      console.error('Failed to sync role with backend:', error)
    }
  }

  const handleRoleSelect = async (option: RoleOption) => {
    const isAvailable = AVAILABLE_ROLES.includes(option.key)
    if (!isAvailable) {
      console.warn('Attempted to select disabled role:', option.key)
      return
    }
    
    console.log('Role selected:', option.key)
    setUserRole(option.key)
    updateWelcomeMessage(getWelcomeMessage(option.key))
    setShowRoleModal(false)
    await notifyBackendRole(option.key)
  }

  const ensureRoleSelected = () => {
    if (userRole) return true
    setShowRoleModal(true)
    return false
  }

  const interactionLocked = !userRole
  const textPlaceholder = userRole
    ? 'پیام خود را بنویسید...'
    : 'برای شروع لطفاً نقش خود را انتخاب کنید.'

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!ensureRoleSelected()) {
      e.target.value = ''
      return
    }

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
      // Note: Role is set separately via /api/role endpoint
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

  const updateMessageText = (id: string, updater: (prev: string) => string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id ? { ...message, text: updater(message.text) } : message
      )
    )
  }

  const handleSendMessage = async () => {
    if (!inputText.trim()) return
    if (!ensureRoleSelected()) return

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

    const botMessageId = `${Date.now()}-bot`
    setMessages((prev) => [
      ...prev,
      {
        id: botMessageId,
        text: '',
        sender: 'bot',
        timestamp: new Date(),
      },
    ])

    try {
      // Send message to API
      // Note: Role is set separately via /api/role endpoint, so we only send message
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: messageText }),
      })

      const contentType = response.headers.get('content-type') || ''
      const isJsonResponse = contentType.includes('application/json')
      const canStream = !!response.body && !isJsonResponse

      if (!response.ok) {
        // Try to parse JSON error if available
        let errorMessage = 'ارسال پیام با مشکل مواجه شد'
        if (isJsonResponse) {
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } catch {
            // ignore
          }
        }
        throw new Error(errorMessage)
      }

      // Non-streaming JSON response path
      if (!canStream) {
        try {
          const data = await response.json()
          const responseText =
            data.text_response ||
            data.response ||
            data.message ||
            data.answer ||
            ''

          if (responseText && typeof responseText === 'string') {
            updateMessageText(botMessageId, () => responseText)
          } else {
            updateMessageText(botMessageId, () => 'پاسخی دریافت نشد.')
          }
        } catch {
          // Fallback to text
          const text = await response.text()
          updateMessageText(
            botMessageId,
            () => (text && text.trim() ? text : 'پاسخی دریافت نشد.')
          )
        }
        return
      }

      // Streaming path - backend sends raw text chunks (FastAPI StreamingResponse)
      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let hasContent = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        if (value) {
          const chunk = decoder.decode(value, { stream: true })
          if (chunk) {
            hasContent = true
            updateMessageText(botMessageId, (prevText) => prevText + chunk)
          }
        }
      }

      // Flush any remaining decoded text
      const remaining = decoder.decode()
      if (remaining) {
        hasContent = true
        updateMessageText(botMessageId, (prevText) => prevText + remaining)
      }

      if (!hasContent) {
        updateMessageText(botMessageId, () => 'پاسخی دریافت نشد.')
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      updateMessageText(
        botMessageId,
        () =>
          `خطا: ${
            error.message ||
            'ارسال پیام با مشکل مواجه شد. لطفاً بررسی کنید که بک‌اند روی 172.16.100.22:4000 در حال اجرا باشد.'
          }`
      )
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
            disabled={interactionLocked}
          />
          <label htmlFor="file-input" className={styles.fileButton}>
            📎
          </label>
          <textarea
            disabled={interactionLocked}
            className={styles.textInput}
            placeholder={textPlaceholder}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={1}
          />
          <button
            className={styles.sendButton}
            onClick={handleSendMessage}
            disabled={!inputText.trim() || interactionLocked}
          >
            →
          </button>
        </div>
      </div>

      {showRoleModal && (
        <div className={styles.roleModalOverlay}>
          <div className={styles.roleModal}>
            <h2>سلام به چت‌بات مبین خوش آمدید</h2>
            <p>لطفاً نقش خود را از میان گزینه‌های زیر انتخاب کنید:</p>
            <div className={styles.roleOptions}>
              {ROLE_OPTIONS.sort((a, b) => {
                const aAvailable = AVAILABLE_ROLES.includes(a.key)
                const bAvailable = AVAILABLE_ROLES.includes(b.key)
                // Available roles first
                if (aAvailable && !bAvailable) return -1
                if (!aAvailable && bAvailable) return 1
                // Then sort by label alphabetically
                return a.label.localeCompare(b.label, 'fa')
              }).map((option) => {
                const isAvailable = AVAILABLE_ROLES.includes(option.key)
                return (
                  <button
                    key={option.key}
                    className={`${styles.roleOptionButton} ${
                      !isAvailable ? styles.roleOptionButtonDisabled : ''
                    }`}
                    onClick={() => isAvailable && handleRoleSelect(option)}
                    disabled={!isAvailable}
                  >
                    <span className={styles.roleOptionLabel}>{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

