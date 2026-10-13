export type CreateInquiryRequest = {
  name: string
  email: string
  message: string
}

export type Inquiry = {
  id: string
  created_at: string
  name: string
  email: string
  message: string
}

export type ListResponse = {
  items: Inquiry[]
}

export type ApiError = {
  error: string
  message: string
}
