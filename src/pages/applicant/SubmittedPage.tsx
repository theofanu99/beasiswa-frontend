import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  getPendaftaran,
  getPendaftaranById,
  type Pendaftaran,
} from '../../api/transaction'

function badgeClass(status?: string | null) {
  const value = (status ?? '').toUpperCase()

  if (['PASSED', 'APPROVED', 'LULUS', 'DITERIMA'].includes(value)) {
    return 'bg-success'
  }

  if (['REJECTED', 'FAILED', 'DITOLAK', 'TIDAK_LULUS'].includes(value)) {
    return 'bg-danger'
  }

  if (['REVISION', 'REVISI'].includes(value)) {
    return 'bg-warning text-dark'
  }

  return 'bg-secondary'
}


function administrationNote(status?: string | null, catatan?: string | null) {
  if (catatan) return catatan

  switch ((status ?? '').toUpperCase()) {
    case 'LULUS':
      return 'Seleksi administrasi berhasil. Peserta lanjut ke tahap wawancara.'
    case 'REVISI':
      return 'Pendaftaran perlu diperbaiki sesuai catatan verifikator.'
    case 'TIDAK_LULUS':
      return 'Peserta tidak lulus seleksi administrasi.'
    default:
      return 'Menunggu pemeriksaan verifikator.'
  }
}

function interviewNote(status?: string | null, catatan?: string | null, overall?: string | null) {
  if (catatan) return catatan

  switch ((status ?? '').toUpperCase()) {
    case 'SELESAI':
      return 'Wawancara telah selesai dan hasilnya sudah dicatat.'
    default:
      if ((overall ?? '').toUpperCase() === 'INTERVIEW') {
        return 'Peserta telah lulus administrasi dan masuk tahap wawancara.'
      }
      if ((overall ?? '').toUpperCase() === 'PASSED') {
        return 'Wawancara telah selesai.'
      }
      return 'Tahap wawancara akan aktif setelah administrasi dinyatakan lulus.'
  }
}

function finalNote(hasil?: string | null, catatan?: string | null) {
  if (catatan) return catatan

  switch ((hasil ?? '').toUpperCase()) {
    case 'LULUS':
      return 'Selamat! Peserta dinyatakan lulus seluruh proses seleksi.'
    case 'TIDAK_LULUS':
      return 'Peserta dinyatakan tidak lulus pada hasil akhir seleksi.'
    default:
      return 'Hasil akhir belum ditetapkan.'
  }
}

export default function SubmittedPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = Number(searchParams.get('pendaftaranId'))

  const [data, setData] = useState<Pendaftaran | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError('')

        if (Number.isInteger(id) && id > 0) {
          setData(await getPendaftaranById(id))
          return
        }

        const list = await getPendaftaran()
        setData(list[0] ?? null)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Gagal memuat status pendaftaran.',
        )
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id])

  const overall = data?.status ?? 'SUBMITTED'

  const steps = useMemo(
    () => [
      {
        title: 'Pendaftaran',
        value: overall,
        note:
          overall === 'PASSED'
            ? 'Pendaftaran dan seluruh proses seleksi telah selesai.'
            : overall === 'FAILED'
              ? 'Pendaftaran telah selesai diproses.'
              : 'Form dan dokumen telah dikirim.',
      },
      {
        title: 'Seleksi Administrasi',
        value: data?.seleksiAdministrasi?.status ?? 'MENUNGGU',
        note: administrationNote(
          data?.seleksiAdministrasi?.status,
          data?.seleksiAdministrasi?.catatan,
        ),
      },
      {
        title: 'Wawancara',
        value: data?.seleksiWawancara?.status ?? 'MENUNGGU',
        note: interviewNote(
          data?.seleksiWawancara?.status,
          data?.seleksiWawancara?.catatan,
          overall,
        ),
      },
      {
        title: 'Hasil Akhir',
        value: data?.hasilSeleksi?.hasil ?? 'MENUNGGU',
        note: finalNote(
          data?.hasilSeleksi?.hasil,
          data?.hasilSeleksi?.catatan,
        ),
      },
    ],
    [data, overall],
  )

  if (loading) {
    return (
      <main className="bg-light min-vh-100 d-flex align-items-center">
        <div className="container text-center">
          <div className="spinner-border text-primary" />
          <p className="mt-3 text-muted">Memuat status pendaftaran...</p>
        </div>
      </main>
    )
  }

  return (
    <>
      <nav className="navbar navbar-dark bg-primary shadow-sm">
        <div className="container">
          <span className="navbar-brand fw-bold">
            <i className="bi bi-mortarboard-fill me-2" />
            Portal Beasiswa
          </span>

          <button
            className="btn btn-light"
            onClick={() => navigate('/')}
          >
            <i className="bi bi-house me-2" />
            Beranda
          </button>
        </div>
      </nav>

      <main className="bg-light min-vh-100 py-3 py-lg-4">
        <div className="container" style={{ maxWidth: 1180 }}>
          <div className="card border-0 shadow-sm mb-3 mb-lg-4">
            <div className="card-body p-3 p-lg-4 text-center">
              <i className="bi bi-check-circle-fill text-success display-4" />
              <h2 className="fw-bold mt-2 mb-2">Monitoring Proses Pendaftaran</h2>
              <p className="text-muted mb-2">
                Pantau perkembangan seleksi administrasi, wawancara, dan hasil akhir.
              </p>

              {data && (
                <div className="d-flex justify-content-center gap-2 flex-wrap">
                  <span className="badge bg-primary">
                    Pendaftaran #{data.id}
                  </span>
                  <span className={`badge ${badgeClass(data.status)}`}>
                    {data.status}
                  </span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="alert alert-danger">
              <i className="bi bi-exclamation-triangle me-2" />
              {error}
            </div>
          )}

          {!data && !error && (
            <div className="alert alert-info">
              Belum ada pendaftaran yang dapat dipantau.
            </div>
          )}

          {data && (
            <div className="row g-2 g-lg-3">
              {steps.map((step, index) => (
                <div className="col-12 col-md-6 col-xl-3" key={step.title}>
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body d-flex align-items-start gap-2 p-3">
                      <div
                        className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                        style={{ width: 38, height: 38 }}
                      >
                        {index + 1}
                      </div>

                      <div className="flex-grow-1 min-w-0">
                        <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
                          <h6 className="fw-bold mb-1">{step.title}</h6>
                          <span className={`badge ${badgeClass(step.value)}`}>
                            {step.value}
                          </span>
                        </div>
                        <p className="text-muted small mb-0">{step.note}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-3 mt-lg-4">
            <button
              className="btn btn-outline-primary"
              onClick={() => window.location.reload()}
            >
              <i className="bi bi-arrow-clockwise me-2" />
              Perbarui Status
            </button>
          </div>
        </div>
      </main>
    </>
  )
}
