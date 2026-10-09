import { Route, Routes } from 'react-router-dom'

import { AppLayout } from '@/components/layout/AppLayout'
import { CategoryPage } from '@/pages/CategoryPage'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ToolPage } from '@/pages/ToolPage'

export function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/tools" element={<HomePage />} />
        <Route path="/tools/:toolId" element={<ToolPage />} />
        <Route path="/category/:categoryId" element={<CategoryPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppLayout>
  )
}

export default App