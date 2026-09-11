import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import HomePage from './pages/applicant/HomePage'
import FormPage from './pages/applicant/FormPage'
import SubmittedPage from './pages/applicant/SubmittedPage'
import RevisionPage from './pages/applicant/RevisionPage'
import ClosedPage from './pages/applicant/ClosedPage'
import PassedPage from './pages/applicant/PassedPage'

import LoginPage from './pages/internal/LoginPage'
import VerifierPage from './pages/internal/VerifierPage'
import InterviewPage from './pages/internal/InterviewPage'
import AdminPage from './pages/internal/AdminPage'

import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Applicant */}
        <Route
          path="/"
          element={<HomePage />}
        />

        <Route
          path="/pendaftaran"
          element={<FormPage />}
        />

        <Route
          path="/pendaftaran/terkirim"
          element={<SubmittedPage />}
        />

        <Route
          path="/pendaftaran/revisi"
          element={<RevisionPage />}
        />

        <Route
          path="/pendaftaran/ditutup"
          element={<ClosedPage />}
        />

        <Route
          path="/pendaftaran/lulus"
          element={<PassedPage />}
        />

        {/* Internal login */}
        <Route
          path="/internal/login"
          element={<LoginPage />}
        />

        {/* Compatibility route
            Redirect route lama ke login internal */}
        <Route
          path="/auth/login"
          element={
            <Navigate
              to="/internal/login"
              replace
            />
          }
        />

        {/* Verifikator */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={['VERIFIKATOR']}
            />
          }
        >
          <Route
            path="/internal/verifikator"
            element={<VerifierPage />}
          />
        </Route>

        {/* Lembaga Seleksi */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={['LEMBAGA SELEKSI']}
            />
          }
        >
          <Route
            path="/internal/wawancara"
            element={<InterviewPage />}
          />
        </Route>

        {/* Admin */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={['ADMIN']}
            />
          }
        >
          <Route
            path="/internal/admin"
            element={<AdminPage />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App