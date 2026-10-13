import type {
  ApiError,
  CreateInquiryRequest,
  Inquiry,
  ListResponse,
} from '../types/inquiry'

export class ApiClientError extends Error {
  readonly status: number
  readonly apiError: ApiError | null

  constructor(message: string, status: number, apiError: ApiError | null = null) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.apiError = apiError
  }
}

function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (raw === undefined || raw.trim() === '') {
    throw new ApiClientError('API の URL が設定されていません', 0)
  }
  return raw.replace(/\/+$/, '')
}

function requireBaseUrl(): string {
  try {
    return getApiBaseUrl()
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err
    }
    throw new ApiClientError('API の URL が設定されていません', 0)
  }
}

function isApiError(value: unknown): value is ApiError {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  return typeof record.error === 'string' && typeof record.message === 'string'
}

function isInquiry(value: unknown): value is Inquiry {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    typeof record.created_at === 'string' &&
    typeof record.name === 'string' &&
    typeof record.email === 'string' &&
    typeof record.message === 'string'
  )
}

function isListResponse(value: unknown): value is ListResponse {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  if (!Array.isArray(record.items)) {
    return false
  }
  return record.items.every((item) => isInquiry(item))
}

async function parseJsonBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) {
    return null
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new ApiClientError(
      '送信に失敗しました。時間をおいて再度お試しください',
      response.status,
    )
  }
}

function throwFromApiBody(body: unknown, status: number, fallback: string): never {
  if (isApiError(body)) {
    if (status === 500) {
      throw new ApiClientError(fallback, status, body)
    }
    throw new ApiClientError(body.message, status, body)
  }
  throw new ApiClientError(fallback, status)
}

/** POST /inquiries */
export async function createInquiry(
  request: CreateInquiryRequest,
): Promise<Inquiry> {
  const baseUrl = requireBaseUrl()

  let response: Response
  try {
    response = await fetch(`${baseUrl}/inquiries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })
  } catch {
    throw new ApiClientError('サーバーに接続できませんでした', 0)
  }

  const body = await parseJsonBody(response)

  if (response.status === 201) {
    if (!isInquiry(body)) {
      throw new ApiClientError(
        '送信に失敗しました。時間をおいて再度お試しください',
        response.status,
      )
    }
    return body
  }

  throwFromApiBody(
    body,
    response.status,
    '送信に失敗しました。時間をおいて再度お試しください',
  )
}

/** GET /inquiries */
export async function listInquiries(): Promise<ListResponse> {
  const baseUrl = requireBaseUrl()

  let response: Response
  try {
    response = await fetch(`${baseUrl}/inquiries`, {
      method: 'GET',
    })
  } catch {
    throw new ApiClientError('サーバーに接続できませんでした', 0)
  }

  const body = await parseJsonBody(response)

  if (response.status === 200) {
    if (!isListResponse(body)) {
      throw new ApiClientError(
        '一覧の取得に失敗しました。時間をおいて再度お試しください',
        response.status,
      )
    }
    return body
  }

  throwFromApiBody(
    body,
    response.status,
    '一覧の取得に失敗しました。時間をおいて再度お試しください',
  )
}

/** DELETE /inquiries/{id} */
export async function deleteInquiry(id: string): Promise<void> {
  const baseUrl = requireBaseUrl()

  let response: Response
  try {
    response = await fetch(`${baseUrl}/inquiries/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  } catch {
    throw new ApiClientError('サーバーに接続できませんでした', 0)
  }

  if (response.status === 204) {
    return
  }

  const body = await parseJsonBody(response)
  throwFromApiBody(
    body,
    response.status,
    '削除に失敗しました。時間をおいて再度お試しください',
  )
}
