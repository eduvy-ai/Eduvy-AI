// ─── Router Configuration ─────────────────────────────────────
// Main routing setup with React Router v6

import React, { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import PrivateRoute from './PrivateRoute'
import PublicRoute from './PublicRoute'
import DashboardLayout from '../layouts/DashboardLayout'
import AdminLayout from '../layouts/AdminLayout'
import Loader from '../shared/components/Loader'

// ── Lazy-loaded Pages ──
// Auth pages
const Login = lazy(() => import('../modules/auth/pages/Login'))
const Register = lazy(() => import('../modules/auth/pages/Register'))

// Public pages
const LandingPage = lazy(() => import('../components/LandingPage'))
const ParentDashboard = lazy(() => import('../components/ParentDashboard'))
const AdminPanelLegacy = lazy(() => import('../components/admin'))
const HelperPortal = lazy(() => import('../components/HelperPortal'))
const SharedVideoPage = lazy(() => import('../components/video/SharedVideoPage'))

// Admin pages (new Redux-connected module)
const AdminLogin = lazy(() => import('../modules/admin/pages/Login'))
const AdminChangePassword = lazy(() => import('../modules/admin/pages/ChangePassword'))
const AdminDashboard = lazy(() => import('../modules/admin/pages/Dashboard'))

// Admin academics pages
const AdminBoardsPage = lazy(() => import('../modules/admin/pages/academics/BoardsPage'))
const AdminStandardsPage = lazy(() => import('../modules/admin/pages/academics/StandardsPage'))
const AdminMediumsPage = lazy(() => import('../modules/admin/pages/academics/MediumsPage'))
const AdminSubjectsPage = lazy(() => import('../modules/admin/pages/academics/SubjectsPage'))
const AdminChaptersPage = lazy(() => import('../modules/admin/pages/academics/ChaptersPage'))

// Admin users pages
const AdminStudentsPage = lazy(() => import('../modules/admin/pages/users/StudentsPage'))
const AdminParentsPage = lazy(() => import('../modules/admin/pages/users/ParentsPage'))

// Admin schools pages (B2B)
const AdminSchoolsPage = lazy(() => import('../modules/admin/pages/schools/SchoolsPage'))

// Admin teachers pages (new sub-pages)
const AdminTeachersListPage = lazy(() => import('../modules/admin/pages/teachers/TeachersPageRouter'))
const AdminTeacherAssignmentsPage = lazy(() => import('../modules/admin/pages/teachers/AssignmentsPage'))
const AdminTeacherPerformancePage = lazy(() => import('../modules/admin/pages/teachers/PerformancePage'))

// Admin community pages
const AdminSquadsPage = lazy(() => import('../modules/admin/pages/community/SquadsPage'))
const AdminModerationPage = lazy(() => import('../modules/admin/pages/community/ModerationPage'))

// Admin analytics pages
const AdminAnalyticsOverviewPage = lazy(() => import('../modules/admin/pages/analytics/OverviewPage'))
const AdminStudentsAnalyticsPage = lazy(() => import('../modules/admin/pages/analytics/StudentsAnalyticsPage'))
const AdminRevenuePage = lazy(() => import('../modules/admin/pages/analytics/RevenuePage'))

// Admin operations pages
const AdminJobsPage = lazy(() => import('../modules/admin/pages/operations/JobsPage'))
const AdminLogsPage = lazy(() => import('../modules/admin/pages/operations/LogsPage'))
const AdminStoragePage = lazy(() => import('../modules/admin/pages/operations/StoragePage'))

// Admin settings pages
const AdminRolesPage = lazy(() => import('../modules/admin/pages/settings/RolesPage'))
const AdminPermissionsPage = lazy(() => import('../modules/admin/pages/settings/PermissionsPage'))
const AdminFeaturesPage = lazy(() => import('../modules/admin/pages/settings/FeaturesPage'))

// Admin AI pages
const AdminProvidersPage = lazy(() => import('../modules/admin/pages/ai/ProvidersPage'))
const AdminUsagePage = lazy(() => import('../modules/admin/pages/ai/UsagePage'))
const AdminPromptsPage = lazy(() => import('../modules/admin/pages/ai/PromptsPage'))
const AdminCostsPage = lazy(() => import('../modules/admin/pages/ai/CostsPage'))

// Admin content pages
const AdminContentChaptersPage = lazy(() => import('../modules/admin/pages/content/ChaptersPage'))
const AdminQuestionsPage = lazy(() => import('../modules/admin/pages/content/QuestionsPage'))
const AdminMediaPage = lazy(() => import('../modules/admin/pages/content/MediaPage'))

// Admin assessments page
const AdminAssessmentsPage = lazy(() => import('../modules/admin/pages/academics/AssessmentsPage'))

// Admin community leaderboard
const AdminLeaderboardPage = lazy(() => import('../modules/admin/pages/community/LeaderboardPage'))

// Module pages (Redux-connected)
const HomePage = lazy(() => import('../modules/home/pages/HomePage'))
const NotebookPage = lazy(() => import('../modules/notebook/pages/NotebookPage'))
const VideosPage = lazy(() => import('../modules/videos/pages/VideosPage'))
const LearnTVPage = lazy(() => import('../modules/learntv/pages/LearnTVPage'))
const SathiPage = lazy(() => import('../modules/sathi/pages/SathiPage'))
const BhoolPage = lazy(() => import('../modules/bhool/pages/BhoolPage'))
const MuqablaPage = lazy(() => import('../modules/muqabla/pages/MuqablaPage'))
const LabsPage = lazy(() => import('../modules/labs/pages/LabsPage'))
const VideoCreatorPage = lazy(() => import('../modules/videocreator/pages/VideoCreatorPage'))
const StudyCoachPage = lazy(() => import('../modules/studycoach/pages/StudyCoachPage'))
const LearnPage = lazy(() => import('../modules/chapters/pages/LearnPage'))
const ChapterPage = lazy(() => import('../modules/chapters/pages/ChapterPage'))
const PracticePage = lazy(() => import('../modules/practice/pages/PracticePage'))
const ProfilePage = lazy(() => import('../modules/profile/pages/ProfilePage'))

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

        {/* Shared video - public, no auth */}
        <Route path="/share/video/:token" element={<SharedVideoPage />} />

        {/* Admin login - public */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/change-password" element={<AdminChangePassword />} />
        
        {/* Legacy admin panel (kept for backwards compatibility) */}
        <Route path="/admin-legacy" element={<AdminPanelLegacy />} />
        <Route path="/admin-legacy/:section" element={<AdminPanelLegacy />} />

        {/* New Admin Panel with layout */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          
          {/* Academics */}
          <Route path="academics" element={<Navigate to="/admin/academics/boards" replace />} />
          <Route path="academics/boards" element={<AdminBoardsPage />} />
          <Route path="academics/standards" element={<AdminStandardsPage />} />
          <Route path="academics/mediums" element={<AdminMediumsPage />} />
          <Route path="academics/subjects" element={<AdminSubjectsPage />} />
          <Route path="academics/chapters" element={<AdminChaptersPage />} />
          
          {/* Content Studio */}
          <Route path="content" element={<Navigate to="/admin/content/chapters" replace />} />
          <Route path="content/chapters" element={<AdminContentChaptersPage />} />
          <Route path="content/questions" element={<AdminQuestionsPage />} />
          <Route path="content/media" element={<AdminMediaPage />} />
          
          {/* Users */}
          <Route path="students" element={<AdminStudentsPage />} />
          <Route path="parents" element={<AdminParentsPage />} />
          
          {/* Schools (B2B) */}
          <Route path="schools" element={<AdminSchoolsPage />} />
          
          {/* Teachers */}
          <Route path="teachers" element={<Navigate to="/admin/teachers/list" replace />} />
          <Route path="teachers/list" element={<AdminTeachersListPage />} />
          <Route path="teachers/assignments" element={<AdminTeacherAssignmentsPage />} />
          <Route path="teachers/performance" element={<AdminTeacherPerformancePage />} />
          
          {/* Community */}
          <Route path="community" element={<Navigate to="/admin/community/squads" replace />} />
          <Route path="community/squads" element={<AdminSquadsPage />} />
          <Route path="community/moderation" element={<AdminModerationPage />} />
          <Route path="community/leaderboard" element={<AdminLeaderboardPage />} />
          
          {/* Assessments */}
          <Route path="assessments" element={<AdminAssessmentsPage />} />
          
          {/* AI Studio */}
          <Route path="ai" element={<Navigate to="/admin/ai/providers" replace />} />
          <Route path="ai/providers" element={<AdminProvidersPage />} />
          <Route path="ai/prompts" element={<AdminPromptsPage />} />
          <Route path="ai/usage" element={<AdminUsagePage />} />
          <Route path="ai/costs" element={<AdminCostsPage />} />
          
          {/* Analytics */}
          <Route path="analytics" element={<Navigate to="/admin/analytics/overview" replace />} />
          <Route path="analytics/overview" element={<AdminAnalyticsOverviewPage />} />
          <Route path="analytics/students" element={<AdminStudentsAnalyticsPage />} />
          <Route path="analytics/revenue" element={<AdminRevenuePage />} />
          
          {/* Operations */}
          <Route path="operations" element={<Navigate to="/admin/operations/jobs" replace />} />
          <Route path="operations/jobs" element={<AdminJobsPage />} />
          <Route path="operations/logs" element={<AdminLogsPage />} />
          <Route path="operations/storage" element={<AdminStoragePage />} />
          
          {/* Settings */}
          <Route path="settings" element={<Navigate to="/admin/settings/roles" replace />} />
          <Route path="settings/roles" element={<AdminRolesPage />} />
          <Route path="settings/permissions" element={<AdminPermissionsPage />} />
          <Route path="settings/features" element={<AdminFeaturesPage />} />
        </Route>
        
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
          <Route path="learn" element={<LearnPage />} />
          <Route path="learn/:chapterId" element={<ChapterPage />} />
          <Route path="practice" element={<PracticePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="notebook" element={<NotebookPage />} />
          <Route path="videos" element={<VideosPage />} />
          <Route path="learntv" element={<LearnTVPage />} />
          <Route path="squads" element={<SathiPage />} />
          <Route path="mistakes" element={<BhoolPage />} />
          <Route path="battles" element={<MuqablaPage />} />
          <Route path="labs" element={<LabsPage />} />
          <Route path="videocreator" element={<VideoCreatorPage />} />
          <Route path="coach" element={<StudyCoachPage />} />
        </Route>

        {/* ── Catch-all Redirect ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes
