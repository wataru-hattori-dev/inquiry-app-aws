import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminInquiryPage } from './pages/AdminInquiryPage'
import { UserInquiryPage } from './pages/UserInquiryPage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<UserInquiryPage />} />
      <Route path="/admin" element={<AdminInquiryPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
