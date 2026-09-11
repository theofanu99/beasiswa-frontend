import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getPendaftaran,
  submitSeleksiAdministrasi,
  type Pendaftaran,
} from '../../api/transaction'
import { getPrograms, type Program } from '../../api/master'
import { getDokumenByPendaftaran, getDokumenFile, type Dokumen } from '../../api/document'
import { logout } from '../../auth/auth'

const DOCUMENT_LABELS = [
  'KTP',
  'Kartu Keluarga',
  'Ijazah',
  'Surat Rekomendasi',
] as const

type Status =
  | 'Menunggu Verifikasi'
  | 'Disetujui'
  | 'Perlu Revisi'
  | 'Ditolak'

interface Applicant {
  id: string
  nama: string
  program: string
  tanggal: string
  status: Status
  pendaftaran: Pendaftaran
}

export default function VerifierPage() {
  const navigate = useNavigate()

  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [selected, setSelected] = useState<Applicant | null>(null)
  const [search, setSearch] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [documents, setDocuments] = useState<Dokumen[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [openingDocumentId, setOpeningDocumentId] = useState<number | null>(null)
  const [decision, setDecision] = useState<'LULUS' | 'REVISI' | 'TIDAK_LULUS' | null>(null)
  const [catatan, setCatatan] = useState('')

  /*
   * Ambil data pendaftaran asli dari backend.
   *
   * Backend:
   * GET /api/pendaftaran
   *
   * Untuk role VERIFIKATOR, backend mengembalikan
   * seluruh pendaftaran.
   */
  useEffect(() => {
    const loadApplicants = async () => {
      try {
        setLoading(true)
        setError('')

        const [pendaftaranData, programs] = await Promise.all([
          getPendaftaran(),
          getPrograms(),
        ])

        /*
         * Buat mapping:
         *
         * beasiswaId -> nama program
         *
         * Supaya kita tidak hardcode nama program.
         */
        const programMap = new Map<number, string>()

        programs.forEach((program: Program) => {
          programMap.set(program.id, program.nama)
        })

        /*
         * Verifikator hanya melihat pendaftaran
         * yang sudah dikirim.
         *
         * DRAFT belum masuk tahap verifikasi.
         */
        const submitted = pendaftaranData
          .filter((item) => item.status === 'SUBMITTED')
          .map((item) => ({
            id: String(item.id),
            nama: item.namaLengkap || '-',
            program: programMap.get(item.beasiswaId) || '-',
            tanggal: new Date(item.createdAt).toLocaleDateString(
              'id-ID',
              {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              },
            ),
            status: 'Menunggu Verifikasi' as Status,
            pendaftaran: item,
          }))

        setApplicants(submitted)
      } catch (err) {
        console.error('Gagal mengambil data pendaftaran:', err)

        setError(
          err instanceof Error
            ? err.message
            : 'Gagal mengambil data pendaftaran.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadApplicants()
  }, [])

  useEffect(() => {
    if (!selected) {
      setDocuments([])
      return
    }

    let mounted = true

    async function loadDocuments() {
      try {
        setDocumentsLoading(true)
        if (!selected) {return}
        const pendaftaranId = selected.pendaftaran.id
        const result = await getDokumenByPendaftaran(pendaftaranId)
        if (mounted) setDocuments(result)
      } catch (err) {
        if (mounted) {
          setDocuments([])
          setError(err instanceof Error ? err.message : 'Gagal mengambil dokumen.')
        }
      } finally {
        if (mounted) setDocumentsLoading(false)
      }
    }

    void loadDocuments()
    return () => { mounted = false }
  }, [selected])

  async function openDocument(document: Dokumen) {
    if (openingDocumentId !== null) return

    try {
      setOpeningDocumentId(document.id)
      setError('')
      const blob = await getDokumenFile(document.id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuka dokumen.')
    } finally {
      setOpeningDocumentId(null)
    }
  }

  const filteredApplicants = applicants.filter((applicant) => {
    const keyword = search.toLowerCase()

    return (
      applicant.nama.toLowerCase().includes(keyword) ||
      applicant.id.toLowerCase().includes(keyword) ||
      applicant.program.toLowerCase().includes(keyword)
    )
  })

  function openDecision(decisionValue: 'LULUS' | 'REVISI' | 'TIDAK_LULUS') {
    setDecision(decisionValue)
    setCatatan('')
  }

  async function updateStatus() {
    if (!selected || !decision || saving) return

    try {
      setSaving(true)
      setError('')

      await submitSeleksiAdministrasi(selected.pendaftaran.id, {
        status: decision,
        catatan: catatan.trim() || undefined,
      })

      setApplicants((current) =>
        current.filter((applicant) => applicant.id !== selected.id),
      )
      setSelected(null)
      setDecision(null)
      setCatatan('')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan hasil verifikasi.',
      )
    } finally {
      setSaving(false)
    }
  }

  const statusBadge = (status: Status) => {
    switch (status) {
      case 'Disetujui':
        return 'bg-success'

      case 'Perlu Revisi':
        return 'bg-warning text-dark'

      case 'Ditolak':
        return 'bg-danger'

      default:
        return 'bg-secondary'
    }
  }

  return (
    <>
      <style>{`
        .custom-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1050;
          background: rgba(0, 0, 0, .5);
          overflow-y: auto;
          padding: 1.5rem;
        }

        .custom-modal {
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
        }

        .custom-modal-xl {
          min-height: calc(100vh - 3rem);
          display: flex;
          align-items: center;
        }

        .custom-modal-xl > .card {
          width: 100%;
          max-height: calc(100vh - 3rem);
          overflow: hidden;
        }

        .custom-modal-xl > .card > .card-body {
          overflow-y: auto;
        }

        .verifier-search {
          max-width: 320px;
        }

        @media (max-width: 768px) {
          .custom-modal-backdrop {
            padding: .75rem;
          }

          .custom-modal-xl {
            min-height: calc(100vh - 1.5rem);
          }

          .custom-modal-xl > .card {
            max-height: calc(100vh - 1.5rem);
          }

          .verifier-search {
            max-width: none;
          }
        }
      `}</style>

    <div
      className="bg-light d-flex flex-column"
      style={{ minHeight: '100vh' }}
    >
      {/* NAVBAR */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
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
              Verifikator
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
      <main className="container-fluid px-4 py-4">
        {/* PAGE HEADER */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4">
          <div>
            <h3 className="fw-bold mb-1">
              Verifikasi Pendaftaran
            </h3>

            <p className="text-muted mb-0">
              Kelola dan verifikasi dokumen pendaftaran peserta.
            </p>
          </div>

          <div className="mt-3 mt-md-0">
            <span className="badge bg-primary fs-6 px-3 py-2">
              <i className="bi bi-shield-check me-1"></i>
              Verifikator
            </span>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div
            className="alert alert-danger d-flex align-items-center"
            role="alert"
          >
            <i className="bi bi-exclamation-triangle me-2"></i>
            <div>{error}</div>
          </div>
        )}

        {/* SUMMARY */}
        <div className="row g-3 mb-4">
          {/* TOTAL */}
          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <div className="text-muted small">
                      Perlu Verifikasi
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

          {/* MENUNGGU */}
          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <div className="text-muted small">
                      Menunggu Verifikasi
                    </div>

                    <div className="fs-3 fw-bold">
                      {
                        applicants.filter(
                          (item) =>
                            item.status === 'Menunggu Verifikasi',
                        ).length
                      }
                    </div>
                  </div>

                  <i className="bi bi-hourglass-split fs-2 text-warning"></i>
                </div>
              </div>
            </div>
          </div>

          {/* DISETUJUI */}
          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <div className="text-muted small">
                      Disetujui
                    </div>

                    <div className="fs-3 fw-bold">
                      {
                        applicants.filter(
                          (item) =>
                            item.status === 'Disetujui',
                        ).length
                      }
                    </div>
                  </div>

                  <i className="bi bi-check-circle fs-2 text-success"></i>
                </div>
              </div>
            </div>
          </div>

          {/* REVISI */}
          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <div className="text-muted small">
                      Perlu Revisi
                    </div>

                    <div className="fs-3 fw-bold">
                      {
                        applicants.filter(
                          (item) =>
                            item.status === 'Perlu Revisi',
                        ).length
                      }
                    </div>
                  </div>

                  <i className="bi bi-exclamation-circle fs-2 text-warning"></i>
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
                Daftar Pendaftaran
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
                      Tanggal
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
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-5"
                      >
                        <div
                          className="spinner-border text-primary mb-3"
                          role="status"
                        >
                          <span className="visually-hidden">
                            Loading...
                          </span>
                        </div>

                        <div className="text-muted">
                          Memuat data pendaftaran...
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {filteredApplicants.map((applicant) => (
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
                            {applicant.tanggal}
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
                              onClick={() =>
                                setSelected(applicant)
                              }
                            >
                              <i className="bi bi-eye me-1"></i>
                              Periksa
                            </button>
                          </td>
                        </tr>
                      ))}

                      {filteredApplicants.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="text-center text-muted py-5"
                          >
                            <i className="bi bi-search fs-2 d-block mb-2"></i>

                            {search
                              ? 'Data pendaftaran tidak ditemukan.'
                              : 'Belum ada pendaftaran yang menunggu verifikasi.'}
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {/* DETAIL MODAL */}
      {selected && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal custom-modal-xl">
            <div className="card border-0">
              <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="mb-0">
                    Detail Pendaftaran
                  </h5>

                  <small>
                    {selected.id}
                  </small>
                </div>

                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setSelected(null)}
                ></button>
              </div>

              <div className="card-body">
                {/* APPLICANT INFO */}
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label text-muted small">
                      Nama Peserta
                    </label>

                    <input
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
                      className="form-control"
                      value={selected.program}
                      disabled
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-muted small">
                      Kode Pendaftaran
                    </label>

                    <input
                      className="form-control"
                      value={selected.id}
                      disabled
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-muted small">
                      Tanggal Pendaftaran
                    </label>

                    <input
                      className="form-control"
                      value={selected.tanggal}
                      disabled
                    />
                  </div>
                </div>

                {/* DATA DIRI */}
                <h6 className="fw-bold mb-3">
                  <i className="bi bi-person-vcard me-2"></i>
                  Data Peserta
                </h6>

                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label text-muted small">
                      NIK
                    </label>

                    <input
                      className="form-control"
                      value={selected.pendaftaran.nik || '-'}
                      disabled
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-muted small">
                      Jenis Kelamin
                    </label>

                    <input
                      className="form-control"
                      value={
                        selected.pendaftaran.jenisKelamin || '-'
                      }
                      disabled
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-muted small">
                      Tempat Lahir
                    </label>

                    <input
                      className="form-control"
                      value={
                        selected.pendaftaran.tempatLahir || '-'
                      }
                      disabled
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-muted small">
                      Tanggal Lahir
                    </label>

                    <input
                      className="form-control"
                      value={
                        selected.pendaftaran.tanggalLahir
                          ? new Date(
                              selected.pendaftaran.tanggalLahir,
                            ).toLocaleDateString('id-ID')
                          : '-'
                      }
                      disabled
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label text-muted small">
                      Alamat
                    </label>

                    <textarea
                      className="form-control"
                      value={
                        selected.pendaftaran.alamat || '-'
                      }
                      disabled
                      rows={2}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-muted small">
                      Provinsi
                    </label>

                    <input
                      className="form-control"
                      value={
                        selected.pendaftaran.provinsi || '-'
                      }
                      disabled
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-muted small">
                      Kabupaten/Kota
                    </label>

                    <input
                      className="form-control"
                      value={
                        selected.pendaftaran.kabupatenKota || '-'
                      }
                      disabled
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-muted small">
                      Kecamatan
                    </label>

                    <input
                      className="form-control"
                      value={
                        selected.pendaftaran.kecamatan || '-'
                      }
                      disabled
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-muted small">
                      Kelurahan
                    </label>

                    <input
                      className="form-control"
                      value={
                        selected.pendaftaran.kelurahan || '-'
                      }
                      disabled
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-muted small">
                      No. HP
                    </label>

                    <input
                      className="form-control"
                      value={
                        selected.pendaftaran.noHp || '-'
                      }
                      disabled
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-muted small">
                      Email
                    </label>

                    <input
                      className="form-control"
                      value={
                        selected.pendaftaran.email || '-'
                      }
                      disabled
                    />
                  </div>
                </div>

                {/* EDUCATION */}
                <h6 className="fw-bold mb-3">
                  <i className="bi bi-mortarboard me-2"></i>
                  Pendidikan & Pekerjaan
                </h6>

                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label text-muted small">
                      Pendidikan
                    </label>

                    <input
                      className="form-control"
                      value={
                        selected.pendaftaran.pendidikan || '-'
                      }
                      disabled
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-muted small">
                      Instansi
                    </label>

                    <input
                      className="form-control"
                      value={
                        selected.pendaftaran.instansi || '-'
                      }
                      disabled
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-muted small">
                      Jurusan
                    </label>

                    <input
                      className="form-control"
                      value={
                        selected.pendaftaran.jurusan || '-'
                      }
                      disabled
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-muted small">
                      Pekerjaan
                    </label>

                    <input
                      className="form-control"
                      value={
                        selected.pendaftaran.pekerjaan || '-'
                      }
                      disabled
                    />
                  </div>
                </div>

                {/* DOCUMENTS */}
                <h6 className="fw-bold mb-3">
                  <i className="bi bi-file-earmark-text me-2"></i>
                  Dokumen Pendukung
                </h6>

                <div className="list-group mb-4">
                  {documentsLoading ? (
                    <div className="list-group-item text-muted">
                      <span className="spinner-border spinner-border-sm me-2" role="status" />
                      Memuat dokumen...
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="list-group-item text-muted">
                      Belum ada dokumen yang tersimpan untuk pendaftaran ini.
                    </div>
                  ) : (
                    documents.map((document, index) => (
                      <div key={document.id} className="list-group-item d-flex justify-content-between align-items-center gap-3">
                        <div className="d-flex align-items-center min-w-0">
                          <i className={`bi ${document.mimeType === 'application/pdf' ? 'bi-file-earmark-pdf' : 'bi-file-earmark-image'} fs-5 me-2 text-primary`} />
                          <div className="min-w-0">
                            <div className="fw-semibold">
                              {DOCUMENT_LABELS[index] || `Dokumen ${index + 1}`}
                            </div>
                            <div className="small text-muted text-truncate">
                              {document.namaFileAsli}
                            </div>
                            <div className="small text-muted">
                              {document.mimeType} · {(document.ukuran / 1024 / 1024).toFixed(2)} MB · {document.statusScan}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary flex-shrink-0"
                          onClick={() => void openDocument(document)}
                          disabled={openingDocumentId !== null}
                        >
                          {openingDocumentId === document.id ? (
                            <><span className="spinner-border spinner-border-sm me-1" role="status" />Membuka...</>
                          ) : (
                            <><i className="bi bi-eye me-1" />Lihat Dokumen</>
                          )}
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* CURRENT STATUS */}
                <div className="alert alert-light border">
                  <div className="small text-muted">
                    Status Saat Ini
                  </div>

                  <span
                    className={`badge ${statusBadge(
                      selected.status,
                    )} mt-1`}
                  >
                    {selected.status}
                  </span>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="card-footer bg-white">
                <div className="d-flex flex-column flex-md-row justify-content-between gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setSelected(null)}
                  >
                    Tutup
                  </button>

                  <div className="d-flex flex-wrap justify-content-end gap-2">
                    <button
                      type="button"
                      className="btn btn-warning"
                      onClick={() =>
                        openDecision('REVISI')
                      }
                      disabled={saving}
                    >
                      <i className="bi bi-arrow-repeat me-1"></i>
                      Minta Revisi
                    </button>

                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() =>
                        openDecision('TIDAK_LULUS')
                      }
                      disabled={saving}
                    >
                      <i className="bi bi-x-circle me-1"></i>
                      Tolak
                    </button>

                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={() =>
                        openDecision('LULUS')
                      }
                      disabled={saving}
                    >
                      <i className="bi bi-check-circle me-1"></i>
                      Setujui
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DECISION MODAL */}
      {selected && decision && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          style={{ background: 'rgba(0,0,0,.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-primary text-white">
                <div>
                  <h5 className="modal-title mb-1">
                    Verifikasi Berkas Seleksi Administrasi
                  </h5>
                  <small>
                    {selected.nama} · Pendaftaran #{selected.id}
                  </small>
                </div>

                <button
                  type="button"
                  className="btn-close btn-close-white"
                  aria-label="Tutup"
                  onClick={() => {
                    setDecision(null)
                    setCatatan('')
                  }}
                  disabled={saving}
                />
              </div>

              <div className="modal-body">
                <div className="alert alert-light border mb-3">
                  <div className="small text-muted">Keputusan</div>
                  <div className="fw-bold mt-1">
                    {decision === 'LULUS'
                      ? 'Disetujui'
                      : decision === 'REVISI'
                        ? 'Perlu Revisi'
                        : 'Ditolak'}
                  </div>
                </div>

                <label htmlFor="verification-note" className="form-label fw-semibold">
                  Catatan Verifikator
                </label>
                <textarea
                  id="verification-note"
                  className="form-control"
                  rows={5}
                  value={catatan}
                  onChange={(event) => setCatatan(event.target.value)}
                  placeholder={
                    decision === 'REVISI'
                      ? 'Jelaskan data atau dokumen yang harus diperbaiki peserta...'
                      : 'Tambahkan catatan verifikasi (opsional)...'
                  }
                  disabled={saving}
                />

                {decision === 'REVISI' && (
                  <div className="form-text">
                    Catatan revisi akan ditampilkan kepada peserta agar dapat
                    memperbaiki pendaftarannya.
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setDecision(null)
                    setCatatan('')
                  }}
                  disabled={saving}
                >
                  Batal
                </button>

                <button
                  type="button"
                  className={`btn ${
                    decision === 'LULUS'
                      ? 'btn-success'
                      : decision === 'REVISI'
                        ? 'btn-warning'
                        : 'btn-danger'
                  }`}
                  onClick={() => void updateStatus()}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2-circle me-2" />
                      Konfirmasi Keputusan
                    </>
                  )}
                </button>
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
    </>
  )
}