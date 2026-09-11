import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  getPendaftaran,
  getPendaftaranById,
  type Pendaftaran,
} from '../../api/transaction'

export default function RevisionPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const pendaftaranIdParam = searchParams.get('pendaftaranId')
  const pendaftaranId = Number(pendaftaranIdParam)

  const [data, setData] = useState<Pendaftaran | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError('')

        let result: Pendaftaran | null = null

        if (
          pendaftaranIdParam &&
          Number.isInteger(pendaftaranId) &&
          pendaftaranId > 0
        ) {
          result = await getPendaftaranById(pendaftaranId)
        } else {
          const registrations = await getPendaftaran()
          result = registrations.find(
            (item) => item.status === 'REVISION',
          ) ?? null
        }

        if (!mounted) return

        if (!result) {
          setError('Pendaftaran revisi tidak ditemukan.')
          return
        }

        if (result.status !== 'REVISION') {
          setError(
            `Pendaftaran #${result.id} tidak sedang dalam status revisi.`,
          )
          return
        }

        setData(result)
      } catch (err) {
        if (!mounted) return

        setError(
          err instanceof Error
            ? err.message
            : 'Gagal memuat pendaftaran revisi.',
        )
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [pendaftaranId, pendaftaranIdParam])

  function handleRevision() {
    if (!data) return

    const targetUrl =
      `/pendaftaran?beasiswaId=${data.beasiswaId}` +
      `&pendaftaranId=${data.id}`

    /*
     * Gunakan replace agar browser benar-benar pindah ke
     * FormPage dengan ID pendaftaran yang sedang direvisi.
     */
    navigate(targetUrl, { replace: true })
  }

  return (
    <main className="bg-light min-vh-100 py-5">
      <div className="container" style={{ maxWidth: 850 }}>
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4 p-lg-5">
            <div className="text-center mb-4">
              <i className="bi bi-pencil-square text-warning display-3"></i>

              <h2 className="fw-bold mt-3">
                Perbaikan Pendaftaran
              </h2>

              <p className="text-muted">
                Verifikator meminta Anda memperbaiki
                data atau dokumen pendaftaran.
              </p>
            </div>

            {loading && (
              <div className="text-center py-4">
                <div
                  className="spinner-border text-primary"
                  role="status"
                >
                  <span className="visually-hidden">
                    Memuat...
                  </span>
                </div>

                <div className="text-muted mt-3">
                  Memuat data pendaftaran...
                </div>
              </div>
            )}

            {!loading && error && (
              <div className="alert alert-danger">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {error}
              </div>
            )}

            {!loading && data && (
              <>
                <div className="alert alert-warning">
                  <div className="fw-bold">
                    <i className="bi bi-chat-left-text me-2"></i>
                    Catatan Verifikator
                  </div>

                  <div className="mt-2">
                    {data.seleksiAdministrasi?.catatan ||
                      'Silakan periksa kembali seluruh data dan dokumen pendaftaran.'}
                  </div>
                </div>

                <div className="card bg-light border-0 mb-4">
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="small text-muted">
                          Nomor Pendaftaran
                        </div>

                        <div className="fw-semibold">
                          #{data.id}
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="small text-muted">
                          Status
                        </div>

                        <div>
                          <span className="badge text-bg-warning">
                            REVISION
                          </span>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="small text-muted">
                          Nama Peserta
                        </div>

                        <div className="fw-semibold">
                          {data.namaLengkap || '-'}
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="small text-muted">
                          Program
                        </div>

                        <div className="fw-semibold">
                          {`Program #${data.beasiswaId}`}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="d-flex flex-column flex-sm-row gap-2 justify-content-center">
                  <button
                    type="button"
                    className="btn btn-warning fw-semibold px-4"
                    onClick={handleRevision}
                  >
                    <i className="bi bi-pencil-square me-2"></i>
                    Perbaiki &amp; Kirim Ulang
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary px-4"
                    onClick={() => navigate('/')}
                  >
                    <i className="bi bi-house me-2"></i>
                    Beranda
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
