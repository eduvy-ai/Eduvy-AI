// ─── Router Configuration ─────────────────────────────────────
// Main routing setup with React Router v6

import React, { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import PrivateRoute from './PrivateRoute'
import PublicRoute from './PublicRoute'
import DashboardLayout from '../layouts/DashboardLayout'
import Loader from '../shared/components/Loader'

// ── Lazy-loaded Pages ──
// Auth pages
const Login = lazy(() => import('../modules/auth/pages/Login'))
const Register = lazy(() => import('../modules/auth/pages/Register'))

// Public pages
const LandingPage = lazy(() => import('../components/LandingPage'))
const ParentDashboard = lazy(() => import('../components/ParentDashboard'))
const AdminPanel = lazy(() => import('../components/AdminPanel'))
const HelperPortal = lazy(() => import('../components/HelperPortal'))

// Module pages (Redux-connected)
const HomePage = lazy(() => import('../modules/home/pages/HomePage'))
const NotebookPage = lazy(() => import('../modules/notebook/pages/NotebookPage'))
const TutorPage = lazy(() => import('../modules/tutor/pages/TutorPage'))
const VideosPage = lazy(() => import('../modules/videos/pages/VideosPage'))
const LearnTVPage = lazy(() => import('../modules/learntv/pages/LearnTVPage'))
const SathiPage = lazy(() => import('../modules/sathi/pages/SathiPage'))
const BhoolPage = lazy(() => import('../modules/bhool/pages/BhoolPage'))
const MuqablaPage = lazy(() => import('../modules/muqabla/pages/MuqablaPage'))
const LabsPage = lazy(() => import('../modules/labs/pages/LabsPage'))

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-app-bg flex items-center justify-center">
    <Loader size="lg" />
  </div>
)

const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Public Routes ── */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Auth routes - redirect if already logged in */}
        <Route
          path="/auth"
          element={
            <PublicRoute restricted>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/auth/register"
          element={
            <PublicRoute restricted>
              <Register />
            </PublicRoute>
          }
        />

        {/* Parent dashboard - public with PIN */}
        <Route path="/parent/:pin" element={<ParentDashboard />} />

        {/* Admin panel */}
        <Route path="/admin" element={<AdminPanel />} />
        
        {/* Helper portal */}
        <Route path="/helper" element={<HelperPortal />} />

        {/* ── Protected App Routes ── */}
        <Route
          path="/app"
          element={
            <PrivateRoute>
              <DashboardLayout />
            </PrivateRoute>
          }
        >
          {/* Default redirect to home */}
          <Route index element={<Navigate to="home" replace />} />
          
          {/* All module pages (Redux-connected) */}
          <Route path="home" element={<HomePage />} />
          <Route path="notebook" element={<NotebookPage />} />
          <Route path="tutor" element={<TutorPage />} />
          <Route path="videos" element={<VideosPage />} />
          <Route path="learntv" element={<LearnTVPage />} />
          <Route path="sathi" element={<SathiPage />} />
          <Route path="bhool" element={<BhoolPage />} />
          <Route path="muqabla" element={<MuqablaPage />} />
          <Route path="labs" element={<LabsPage />} />
        </Route>

        {/* ── Catch-all Redirect ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes
