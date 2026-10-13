import type { CreateInquiryRequest } from '../types/inquiry'

export type FieldErrors = {
  name?: string
  email?: string
  message?: string
}

export type ValidationResult =
  | { ok: true; value: CreateInquiryRequest }
  | { ok: false; errors: FieldErrors }

const NAME_MAX_LEN = 100
const EMAIL_MAX_LEN = 254
const MESSAGE_MAX_LEN = 2000

/** Same pattern as backend create_inquiry.EMAIL_PATTERN */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateInquiryForm(input: {
  name: string
  email: string
  message: string
}): ValidationResult {
  const name = input.name.trim()
  const email = input.email.trim()
  const message = input.message.trim()
  const errors: FieldErrors = {}

  if (!name) {
    errors.name = '名前を入力してください'
  } else if (name.length > NAME_MAX_LEN) {
    errors.name = '名前は 100 文字以内で入力してください'
  }

  if (!email) {
    errors.email = 'メールアドレスを入力してください'
  } else if (email.length > EMAIL_MAX_LEN) {
    errors.email = 'メールアドレスは 254 文字以内で入力してください'
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'メールアドレスの形式が正しくありません'
  }

  if (!message) {
    errors.message = 'お問い合わせ内容を入力してください'
  } else if (message.length > MESSAGE_MAX_LEN) {
    errors.message = '本文は 2000 文字以内で入力してください'
  }

  if (errors.name || errors.email || errors.message) {
    return { ok: false, errors }
  }

  return { ok: true, value: { name, email, message } }
}
