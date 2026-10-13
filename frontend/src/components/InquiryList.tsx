import { formatCreatedAt } from '../lib/formatCreatedAt'
import type { Inquiry } from '../types/inquiry'

type InquiryListProps = {
  items: Inquiry[]
  isLoading: boolean
  errorMessage: string | null
  deletingId: string | null
  onDelete: (id: string) => void
}

export function InquiryList({
  items,
  isLoading,
  errorMessage,
  deletingId,
  onDelete,
}: InquiryListProps) {
  function handleDeleteClick(id: string) {
    const confirmed = window.confirm('このお問い合わせを削除しますか？')
    if (!confirmed) {
      return
    }
    onDelete(id)
  }

  return (
    <section className="inquiry-list" aria-labelledby="inquiry-list-heading">
      <h2 id="inquiry-list-heading">お問い合わせ一覧</h2>

      {errorMessage ? (
        <p className="form-message form-message--error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {isLoading ? <p className="list-status">読み込み中…</p> : null}

      {!isLoading && items.length === 0 ? (
        <p className="list-status">お問い合わせはまだありません</p>
      ) : null}

      {!isLoading && items.length > 0 ? (
        <ul className="inquiry-list__items">
          {items.map((item) => {
            const isDeleting = deletingId === item.id
            return (
              <li key={item.id} className="inquiry-list__item">
                <div className="inquiry-list__meta">
                  <span className="inquiry-list__name">{item.name}</span>
                  <span className="inquiry-list__email">{item.email}</span>
                  <time dateTime={item.created_at}>
                    {formatCreatedAt(item.created_at)}
                  </time>
                </div>
                <p className="inquiry-list__message">{item.message}</p>
                <button
                  type="button"
                  className="inquiry-list__delete"
                  onClick={() => handleDeleteClick(item.id)}
                  disabled={isDeleting || deletingId !== null}
                  aria-busy={isDeleting}
                >
                  {isDeleting ? '削除中…' : '削除'}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}
