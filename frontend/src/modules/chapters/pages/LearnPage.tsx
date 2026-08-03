/**
 * Learn Module Page
 * Redux-connected page wrapper for Learn tab.
 */

import React from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '@/redux/store'
import LearnTab from '@/components/tabs/LearnTab'

const LearnPage: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user)

  return (
    <LearnTab
      profile={{
        board: user?.board,
        standard: user?.standard,
        subjects: user?.subjects,
      }}
    />
  )
}

export default LearnPage
