// ─── Teachers Page Router ──────────────────────────────────
// Conditionally renders the appropriate teachers page based on admin type

import React from 'react'
import { useAdminAuth } from '../../hooks'
import TeachersListPage from './TeachersListPage'
import SchoolTeachersListPage from './SchoolTeachersListPage'

const TeachersPageRouter: React.FC = () => {
  const { user } = useAdminAuth()
  
  // School admins use school-specific teachers
  // Superadmins use Drishti helpers (original teachers)
  if (user?.school_id != null) {
    return <SchoolTeachersListPage />
  }
  
  return <TeachersListPage />
}

export default TeachersPageRouter
