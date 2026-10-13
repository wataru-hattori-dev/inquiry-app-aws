import { useState, type FormEvent } from 'react'
import { ApiClientError, createInquiry } from '../api/client'
import { validateInquiryForm, type FieldErrors } from '../lib/validation'

type FormMessage = {
  type: 'success' | 'error'
  text: string
}

const INITIAL_FIELDS = {
  name: '',
  email: '',
  message: '',
}

type InquiryFormProps = {
  onSuccess?: () => void
}

export function InquiryForm({ onSuccess }: InquiryFormProps) {
  const [name, setName] = useState(INITIAL_FIELDS.name)
  const [email, setEmail] = useState(INITIAL_FIELDS.email)
  const [message, setMessage] = useState(INITIAL_FIELDS.message)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formMessage, setFormMessage] = useState<FormMessage | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const result = validateInquiryForm({ name, email, message })
    if (!result.ok) {
      setFieldErrors(result.errors)
      setFormMessage(null)
      return
    }

    setFieldErrors({})
    setFormMessage(null)
    setIsSubmitting(true)

    try {
      await createInquiry(result.value)
      setName('')
      setEmail('')
      setMessage('')
      setFieldErrors({})
      setFormMessage({
        type: 'success',
        text: 'お問い合わせを受け付けました',
      })
      onSuccess?.()
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFormMessage({ type: 'error', text: err.message })
      } else {
        setFormMessage({
          type: 'error',
          text: 'サーバーに接続できませんでした',
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="inquiry-form" onSubmit={handleSubmit} noValidate>
      <h1>お問い合わせ</h1>

      {formMessage ? (
        <p
          className={
            formMessage.type === 'success'
              ? 'form-message form-message--success'
              : 'form-message form-message--error'
          }
          role={formMessage.type === 'error' ? 'alert' : 'status'}
        >
          {formMessage.text}
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="inquiry-name">名前</label>
        <input
          id="inquiry-name"
          name="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSubmitting}
          aria-invalid={fieldErrors.name ? true : undefined}
          aria-describedby={fieldErrors.name ? 'inquiry-name-error' : undefined}
        />
        {fieldErrors.name ? (
          <p id="inquiry-name-error" className="field-error" role="alert">
            {fieldErrors.name}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="inquiry-email">メールアドレス</label>
        <input
          id="inquiry-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          aria-invalid={fieldErrors.email ? true : undefined}
          aria-describedby={
            fieldErrors.email ? 'inquiry-email-error' : undefined
          }
        />
        {fieldErrors.email ? (
          <p id="inquiry-email-error" className="field-error" role="alert">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="inquiry-message">お問い合わせ内容</label>
        <textarea
          id="inquiry-message"
          name="message"
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={isSubmitting}
          aria-invalid={fieldErrors.message ? true : undefined}
          aria-describedby={
            fieldErrors.message ? 'inquiry-message-error' : undefined
          }
        />
        {fieldErrors.message ? (
          <p id="inquiry-message-error" className="field-error" role="alert">
            {fieldErrors.message}
          </p>
        ) : null}
      </div>

      <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? '送信中…' : '送信'}
      </button>
    </form>
  )
}
