import { useCallback, useEffect, useState } from 'react'
import {
  ApiClientError,
  deleteInquiry,
  listInquiries,
} from '../api/client'
import { InquiryList } from '../components/InquiryList'
import type { Inquiry } from '../types/inquiry'

export function AdminInquiryPage() {
  const [items, setItems] = useState<Inquiry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const refreshList = useCallback(async () => {
    setIsLoading(true)
    setListError(null)
    try {
      const result = await listInquiries()
      setItems(result.items)
    } catch (err) {
      if (err instanceof ApiClientError) {
        setListError(err.message)
      } else {
        setListError('サーバーに接続できませんでした')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshList()
  }, [refreshList])

  async function handleDelete(id: string) {
    setDeletingId(id)
    setListError(null)
    try {
      await deleteInquiry(id)
      await refreshList()
    } catch (err) {
      if (err instanceof ApiClientError) {
        setListError(err.message)
      } else {
        setListError('サーバーに接続できませんでした')
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <main className="app app--admin">
      <h1 className="admin-page-title">お問い合わせ管理</h1>
      <InquiryList
        items={items}
        isLoading={isLoading}
        errorMessage={listError}
        deletingId={deletingId}
        onDelete={(id) => void handleDelete(id)}
      />
    </main>
  )
}
