import { useNavigate } from 'react-router-dom'

export default function ClosedPage() {
  const navigate = useNavigate()

  return (
    <main className="bg-light min-vh-100 py-5">
      <div className="container" style={{ maxWidth: 820 }}>
        <div className="card border-0 shadow-sm text-center">
          <div className="card-body p-5">
            <i className="bi bi-lock-fill text-secondary display-1" />
            <h2 className="fw-bold mt-4">Pendaftaran Tidak Dapat Diubah</h2>
            <p className="text-muted">
              Status pendaftaran sudah dikunci atau proses seleksi telah selesai.
            </p>

            <button
              className="btn btn-primary"
              onClick={() => navigate('/')}
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
