import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../../auth/auth'

type InternalRole =
  | 'VERIFIKATOR'
  | 'LEMBAGA SELEKSI'
  | 'ADMIN'

function LoginPage() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<InternalRole>('VERIFIKATOR')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function getDashboardPath(selectedRole: InternalRole) {
    switch (selectedRole) {
      case 'VERIFIKATOR':
        return '/internal/verifikator'
      case 'LEMBAGA SELEKSI':
        return '/internal/wawancara'
      case 'ADMIN':
        return '/internal/admin'
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!username.trim() || !password) {
      setError('Username dan password wajib diisi.')
      return
    }

    try {
      setLoading(true)
      setError('')

      const result = await login(username.trim(), password)
      const roles = result.user.roles.map((item) => item.toUpperCase())

      const roleAllowed =
        role === 'ADMIN'
          ? roles.includes('ADMIN') || roles.includes('ADMINISTRATOR')
          : roles.includes(role)

      if (!roleAllowed) {
        setError(
          'Role yang dipilih tidak sesuai dengan akun. Silakan pilih role yang benar.',
        )
        return
      }

      if (rememberMe) {
        window.localStorage.setItem('internal_remember_me', 'true')
      } else {
        window.localStorage.removeItem('internal_remember_me')
      }

      navigate(getDashboardPath(role), { replace: true })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Username atau password salah.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        .internal-login-page {
          background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          padding: 24px;
        }

        .internal-login-card {
          border: none;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(13, 110, 253, .12);
          overflow: hidden;
          width: 100%;
          max-width: 440px;
          background: #fff;
        }

        .internal-login-header {
          background: linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%);
          color: #fff;
          padding: 35px 25px 25px;
          text-align: center;
        }

        .internal-icon-box {
          width: 65px;
          height: 65px;
          background: rgba(255, 255, 255, .2);
          backdrop-filter: blur(5px);
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .internal-login-page .form-control:focus,
        .internal-login-page .form-select:focus {
          border-color: #0d6efd;
          box-shadow: 0 0 0 .25rem rgba(13, 110, 253, .15);
        }

        .internal-btn-login {
          background: linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%);
          border: none;
          padding: 12px;
          font-weight: 600;
          border-radius: 8px;
          transition: all .3s ease;
        }

        .internal-btn-login:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 5px 15px rgba(13, 110, 253, .3);
        }
      `}</style>

      <main className="internal-login-page">
        <div className="internal-login-card">
          <div className="internal-login-header">
            <div className="internal-icon-box mb-3">
              <i className="bi bi-shield-lock-fill fs-2" />
            </div>

            <h3 className="fw-bold mb-1">Portal Internal</h3>
            <p className="mb-0 text-white-50">
              Sistem Pemrosesan Beasiswa Pelatihan
            </p>
          </div>

          <div className="p-4 p-md-4">
            <div className="alert alert-info border-0 small mb-4">
              <i className="bi bi-info-circle-fill me-2" />
              Area khusus pemroses data (Verifikator, Lembaga Seleksi, &amp;
              Admin).
            </div>

            {error && (
              <div className="alert alert-danger small" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="internal-username" className="form-label fw-semibold">
                  Username
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light">
                    <i className="bi bi-person-badge" />
                  </span>
                  <input
                    id="internal-username"
                    type="text"
                    className="form-control"
                    placeholder="Masukkan username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="internal-password" className="form-label fw-semibold">
                  Password
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light">
                    <i className="bi bi-key-fill" />
                  </span>
                  <input
                    id="internal-password"
                    type="password"
                    className="form-control"
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="internal-role" className="form-label fw-semibold">
                  Role Akses
                </label>
                <select
                  id="internal-role"
                  className="form-select"
                  value={role}
                  onChange={(event) =>
                    setRole(event.target.value as InternalRole)
                  }
                  disabled={loading}
                >
                  <option value="VERIFIKATOR">
                    Verifikator (Seleksi Administrasi)
                  </option>
                  <option value="LEMBAGA SELEKSI">
                    Lembaga Seleksi (Wawancara)
                  </option>
                  <option value="ADMIN">
                    Administrator System
                  </option>
                </select>
              </div>

              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="form-check">
                  <input
                    id="remember-me"
                    className="form-check-input"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    disabled={loading}
                  />
                  <label className="form-check-label small" htmlFor="remember-me">
                    Ingat Saya
                  </label>
                </div>

                <button
                  type="button"
                  className="btn btn-link btn-sm text-decoration-none p-0"
                  onClick={() =>
                    alert(
                      'Silakan hubungi administrator sistem untuk reset password.',
                    )
                  }
                  disabled={loading}
                >
                  Lupa Password?
                </button>
              </div>

              <button
                type="submit"
                className="btn btn-primary internal-btn-login w-100"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <i className="bi bi-box-arrow-in-right me-2" />
                    Masuk Dashboard
                  </>
                )}
              </button>
            </form>

            <div className="text-center mt-4">
              <div className="small text-muted">
                <i className="bi bi-lock-fill me-1" />
                Akses Terenkripsi &amp; Ter-autentikasi
              </div>

              <hr className="my-3" />

              <button
                type="button"
                className="btn btn-link text-decoration-none small"
                onClick={() => navigate('/')}
              >
                <i className="bi bi-arrow-left me-1" />
                Kembali ke Halaman Utama
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

export default LoginPage
