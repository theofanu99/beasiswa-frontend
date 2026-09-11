import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getPendaftaran,
  getPendaftaranById,
  submitHasilSeleksi,
  submitSeleksiWawancara,
  type Pendaftaran,
} from '../../api/transaction'
import { getPrograms, type Program } from '../../api/master'
import { logout } from '../../auth/auth'

type InterviewStatus =
  | 'Menunggu Wawancara'
  | 'Dijadwalkan'
  | 'Selesai'
  | 'Tidak Hadir'

interface InterviewApplicant {
  id: string
  nama: string
  program: string
  tanggal: string
  jadwal: string
  status: InterviewStatus
  pendaftaran: Pendaftaran
}

export default function InterviewPage() {
  const navigate = useNavigate()

  const [applicants, setApplicants] = useState<InterviewApplicant[]>([])
  const [selected, setSelected] = useState<InterviewApplicant | null>(null)
  const [search, setSearch] = useState('')
  const [score, setScore] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadApplicants() {
    try {
      setLoading(true)
      setError('')
      const [data, programs] = await Promise.all([getPendaftaran(), getPrograms()])
      const programMap = new Map<number, string>()
      programs.forEach((program: Program) => programMap.set(program.id, program.nama))

      setApplicants(
        data
          .filter((item) => item.status === 'INTERVIEW')
          .map((item) => ({
            id: String(item.id),
            nama: item.namaLengkap || '-',
            program: programMap.get(item.beasiswaId) || '-',
            tanggal: new Date(item.createdAt).toLocaleDateString('id-ID', {
              day: '2-digit', month: 'short', year: 'numeric',
            }),
            jadwal: item.seleksiWawancara?.tanggal
              ? new Date(item.seleksiWawancara.tanggal).toLocaleString('id-ID', {
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })
              : 'Belum dijadwalkan',
            status: item.seleksiWawancara ? 'Selesai' : 'Menunggu Wawancara',
            pendaftaran: item,
          })),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat peserta wawancara.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadApplicants()
  }, [])

  const filteredApplicants = applicants.filter((applicant) => {
    const keyword = search.toLowerCase()

    return (
      applicant.nama.toLowerCase().includes(keyword) ||
      applicant.id.toLowerCase().includes(keyword) ||
      applicant.program.toLowerCase().includes(keyword)
    )
  })

  const statusBadge = (status: InterviewStatus) => {
    switch (status) {
      case 'Selesai':
        return 'bg-success'

      case 'Dijadwalkan':
        return 'bg-primary'

      case 'Tidak Hadir':
        return 'bg-danger'

      default:
        return 'bg-warning text-dark'
    }
  }

  async function saveInterview() {
    if (!selected || saving) return

    const numericScore = Number(score)
    if (!score || !Number.isFinite(numericScore) || numericScore < 0 || numericScore > 100) {
      alert('Nilai wawancara wajib diisi dengan angka 0 - 100.')
      return
    }

    try {
      setSaving(true)
      setError('')
      await submitSeleksiWawancara(selected.pendaftaran.id, {
        status: 'SELESAI',
        score: numericScore,
        catatan: notes.trim() || undefined,
        tanggal: new Date().toISOString(),
      })
      const fresh = await getPendaftaranById(selected.pendaftaran.id)
      setSelected({ ...selected, pendaftaran: fresh, status: 'Selesai', jadwal: fresh.seleksiWawancara?.tanggal ? new Date(fresh.seleksiWawancara.tanggal).toLocaleString('id-ID') : selected.jadwal })
      await loadApplicants()
      alert('Hasil wawancara berhasil disimpan. Anda dapat menetapkan hasil akhir.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan hasil wawancara.')
    } finally {
      setSaving(false)
    }
  }

  async function finalizeResult(hasil: 'LULUS' | 'TIDAK_LULUS') {
    if (!selected || saving) return
    if (!selected.pendaftaran.seleksiWawancara) {
      alert('Selesaikan wawancara terlebih dahulu.')
      return
    }

    const label = hasil === 'LULUS' ? 'LULUS' : 'TIDAK LULUS'
    if (!window.confirm(`Tetapkan hasil akhir peserta sebagai ${label}?`)) return

    try {
      setSaving(true)
      setError('')
      await submitHasilSeleksi(selected.pendaftaran.id, {
        hasil,
        catatan: selected.pendaftaran.seleksiWawancara.catatan || undefined,
      })
      await loadApplicants()
      setSelected(null)
      setScore('')
      setNotes('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menetapkan hasil akhir.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="bg-light d-flex flex-column"
      style={{ minHeight: '100vh' }}
    >

      {/* NAVBAR */}
      <nav className="navbar navbar-dark bg-primary shadow-sm">

        <div className="container-fluid px-4">

          <a
            href="/"
            className="navbar-brand fw-bold"
          >
            <i className="bi bi-mortarboard-fill me-2"></i>
            BeasiswaApp
          </a>

          <div className="d-flex align-items-center gap-2">

            <span className="text-white d-none d-sm-inline">
              <i className="bi bi-person-badge me-1"></i>
              Lembaga Seleksi
            </span>

            <button
              type="button"
              className="btn btn-outline-light btn-sm"
              onClick={async () => {
                try {
                  await logout()
                } finally {
                  navigate('/internal/login', { replace: true })
                }
              }}
            >
              <i className="bi bi-box-arrow-right me-1"></i>
              Logout
            </button>

          </div>

        </div>

      </nav>

      {/* MAIN */}
      <main className="container-fluid px-4 py-4 flex-grow-1">

        {/* HEADER */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4">

          <div>

            <h3 className="fw-bold mb-1">
              Seleksi Wawancara
            </h3>

            <p className="text-muted mb-0">
              Catat hasil wawancara peserta yang telah dilakukan di luar website.
            </p>

          </div>

          {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}

          <div className="mt-3 mt-md-0">

            <span className="badge bg-primary fs-6 px-3 py-2">

              <i className="bi bi-person-video3 me-1"></i>

              Lembaga Seleksi

            </span>

          </div>

        </div>

        <div className="alert alert-info border-0 shadow-sm d-flex align-items-start gap-3 mb-4">
          <i className="bi bi-info-circle-fill fs-5 mt-1"></i>
          <div>
            <div className="fw-bold">Wawancara dilakukan di luar website</div>
            <div className="small">
              Halaman ini hanya digunakan untuk mencatat nilai dan catatan hasil
              wawancara setelah proses wawancara selesai dilakukan.
            </div>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="row g-3 mb-4">

          <div className="col-md-3">

            <div className="card border-0 shadow-sm h-100">

              <div className="card-body">

                <div className="d-flex justify-content-between">

                  <div>

                    <div className="text-muted small">
                      Total Peserta
                    </div>

                    <div className="fs-3 fw-bold">
                      {applicants.length}
                    </div>

                  </div>

                  <i className="bi bi-people fs-2 text-primary"></i>

                </div>

              </div>

            </div>

          </div>

          <div className="col-md-3">

            <div className="card border-0 shadow-sm h-100">

              <div className="card-body">

                <div className="d-flex justify-content-between">

                  <div>

                    <div className="text-muted small">
                      Menunggu Wawancara
                    </div>

                    <div className="fs-3 fw-bold">
                      {
                        applicants.filter(
                          (item) =>
                            item.status ===
                            'Menunggu Wawancara',
                        ).length
                      }
                    </div>

                  </div>

                  <i className="bi bi-hourglass-split fs-2 text-warning"></i>

                </div>

              </div>

            </div>

          </div>

          <div className="col-md-3">

            <div className="card border-0 shadow-sm h-100">

              <div className="card-body">

                <div className="d-flex justify-content-between">

                  <div>

                    <div className="text-muted small">
                      Dijadwalkan
                    </div>

                    <div className="fs-3 fw-bold">
                      {
                        applicants.filter(
                          (item) =>
                            item.status ===
                            'Dijadwalkan',
                        ).length
                      }
                    </div>

                  </div>

                  <i className="bi bi-calendar-check fs-2 text-primary"></i>

                </div>

              </div>

            </div>

          </div>

          <div className="col-md-3">

            <div className="card border-0 shadow-sm h-100">

              <div className="card-body">

                <div className="d-flex justify-content-between">

                  <div>

                    <div className="text-muted small">
                      Selesai
                    </div>

                    <div className="fs-3 fw-bold">
                      {
                        applicants.filter(
                          (item) =>
                            item.status ===
                            'Selesai',
                        ).length
                      }
                    </div>

                  </div>

                  <i className="bi bi-check-circle fs-2 text-success"></i>

                </div>

              </div>

            </div>

          </div>

        </div>

        {/* TABLE */}
        <section className="card border-0 shadow-sm">

          <div className="card-header bg-white py-3">

            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">

              <h5 className="mb-0 fw-bold">
                Daftar Peserta Wawancara
              </h5>

              <div className="input-group verifier-search">

                <span className="input-group-text">

                  <i className="bi bi-search"></i>

                </span>

                <input
                  type="text"
                  className="form-control"
                  placeholder="Cari peserta..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />

              </div>

            </div>

          </div>

          <div className="card-body p-0">

            <div className="table-responsive">

              <table className="table table-hover align-middle mb-0">

                <thead className="table-light">

                  <tr>

                    <th className="px-3">
                      Kode Pendaftaran
                    </th>

                    <th>
                      Peserta
                    </th>

                    <th>
                      Program
                    </th>

                    <th>
                      Jadwal Wawancara
                    </th>

                    <th>
                      Status
                    </th>

                    <th className="text-end px-3">
                      Aksi
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-5">Memuat peserta wawancara...</td></tr>
                  ) : filteredApplicants.map(
                    (applicant) => (

                      <tr key={applicant.id}>

                        <td className="px-3 fw-semibold">
                          {applicant.id}
                        </td>

                        <td>
                          {applicant.nama}
                        </td>

                        <td>
                          {applicant.program}
                        </td>

                        <td>
                          {applicant.jadwal}
                        </td>

                        <td>

                          <span
                            className={`badge ${statusBadge(
                              applicant.status,
                            )}`}
                          >
                            {applicant.status}
                          </span>

                        </td>

                        <td className="text-end px-3">

                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={async () => {
                              try {
                                const fresh = await getPendaftaranById(applicant.pendaftaran.id)
                                setSelected({ ...applicant, pendaftaran: fresh, status: fresh.seleksiWawancara ? 'Selesai' : 'Menunggu Wawancara' })
                                setScore(fresh.seleksiWawancara?.score != null ? String(fresh.seleksiWawancara.score) : '')
                                setNotes(fresh.seleksiWawancara?.catatan || '')
                              } catch (err) {
                                setError(err instanceof Error ? err.message : 'Gagal memuat detail peserta.')
                              }
                            }}
                          >

                            <i className="bi bi-pencil-square me-1"></i>

                            {applicant.status ===
                            'Selesai'
                              ? 'Lihat Hasil'
                              : 'Input Hasil'}

                          </button>

                        </td>

                      </tr>

                    ),
                  )}

                  {filteredApplicants.length === 0 && (

                    <tr>

                      <td
                        colSpan={6}
                        className="text-center text-muted py-5"
                      >

                        <i className="bi bi-search fs-2 d-block mb-2"></i>

                        Data peserta tidak ditemukan.

                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>

          </div>

        </section>

      </main>

      {/* INTERVIEW MODAL */}
      {selected && (

        <div className="custom-modal-backdrop">

          <div className="custom-modal custom-modal-xl">

            <div className="card border-0">

              {/* MODAL HEADER */}
              <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">

                <div>

                  <h5 className="mb-0">
                    {selected.status === 'Selesai'
                      ? 'Hasil Wawancara'
                      : 'Input Hasil Wawancara'}
                  </h5>

                  <small>
                    {selected.id}
                  </small>

                </div>

                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() =>
                    setSelected(null)
                  }
                ></button>

              </div>

              {/* MODAL BODY */}
              <div className="card-body">

                {/* DATA PESERTA */}
                <div className="row g-3 mb-4">

                  <div className="col-md-6">

                    <label className="form-label text-muted small">
                      Nama Peserta
                    </label>

                    <input
                      type="text"
                      className="form-control"
                      value={selected.nama}
                      disabled
                    />

                  </div>

                  <div className="col-md-6">

                    <label className="form-label text-muted small">
                      Program Pelatihan
                    </label>

                    <input
                      type="text"
                      className="form-control"
                      value={selected.program}
                      disabled
                    />

                  </div>

                  <div className="col-md-6">

                    <label className="form-label text-muted small">
                      Jadwal Wawancara
                    </label>

                    <input
                      type="text"
                      className="form-control"
                      value={selected.jadwal}
                      disabled
                    />

                  </div>

                  <div className="col-md-6">

                    <label className="form-label text-muted small">
                      Status
                    </label>

                    <div className="pt-2">

                      <span
                        className={`badge ${statusBadge(
                          selected.status,
                        )}`}
                      >
                        {selected.status}
                      </span>

                    </div>

                  </div>

                </div>

                {/* INTERVIEW FORM */}
                <div className="border-top pt-4">

                  <h6 className="fw-bold mb-3">
                    <i className="bi bi-clipboard-data me-2"></i>
                    Penilaian Wawancara
                  </h6>

                  <div className="mb-3">

                    <label
                      htmlFor="score"
                      className="form-label fw-semibold"
                    >
                      Nilai Wawancara
                    </label>

                    <input
                      id="score"
                      type="number"
                      min="0"
                      max="100"
                      className="form-control"
                      placeholder="Masukkan nilai 0 - 100"
                      value={score}
                      onChange={(event) =>
                        setScore(event.target.value)
                      }
                      disabled={
                        selected.status ===
                        'Selesai'
                      }
                    />

                  </div>

                  <div className="mb-3">

                    <label
                      htmlFor="notes"
                      className="form-label fw-semibold"
                    >
                      Catatan / Hasil Wawancara
                    </label>

                    <textarea
                      id="notes"
                      className="form-control"
                      rows={5}
                      placeholder="Masukkan catatan hasil wawancara..."
                      value={notes}
                      onChange={(event) =>
                        setNotes(event.target.value)
                      }
                      disabled={
                        selected.status ===
                        'Selesai'
                      }
                    />

                  </div>

                </div>

              </div>

              {/* MODAL FOOTER */}
              <div className="card-footer bg-white">

                <div className="d-flex flex-column flex-md-row justify-content-between gap-2">

                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() =>
                      setSelected(null)
                    }
                  >
                    Tutup
                  </button>

                  {selected.status !== 'Selesai' && (
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={() => void saveInterview()}
                      disabled={saving}
                    >
                      <i className="bi bi-check-circle me-1"></i>
                      Simpan Hasil
                    </button>
                  )}

                  {selected.status === 'Selesai' && (
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => void finalizeResult('TIDAK_LULUS')}
                        disabled={saving}
                      >
                        Tetapkan Tidak Lulus
                      </button>
                      <button
                        type="button"
                        className="btn btn-success"
                        onClick={() => void finalizeResult('LULUS')}
                        disabled={saving}
                      >
                        Tetapkan Lulus
                      </button>
                    </div>
                  )}

                </div>

              </div>

            </div>

          </div>

        </div>

      )}

      {/* FOOTER */}
      <footer className="bg-dark text-white py-3 mt-auto">

        <div className="container-fluid text-center">

          <small className="text-white-50">
            © 2026 BeasiswaApp
          </small>

        </div>

      </footer>

    </div>
  )
}