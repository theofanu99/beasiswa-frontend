import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import {
  createPendaftaran,
  getPendaftaran,
  getPendaftaranById,
  updatePendaftaran,
  submitPendaftaran,
  type Pendaftaran,
} from '../../api/transaction'

import { getActivePrograms } from '../../api/master'
import { getAuthUser } from '../../auth/auth'
import {
  deleteDokumen,
  getDokumenByPendaftaran,
  uploadDokumen,
} from '../../api/document'
import type { Dokumen } from '../../api/document'

const TOTAL_STEPS = 4

type RegionData = Record<string, Record<string, Record<string, string[]>>>

const wilayah: RegionData = {
  'Jawa Barat': {
    'Kota Bandung': {
      Coblong: ['Dago', 'Lebak Gede', 'Sadang Serang'],
      Cicendo: ['Arjuna', 'Husein Sastranegara', 'Pajajaran'],
      Sukajadi: ['Pasteur', 'Sukabungah', 'Sukagalih'],
    },
    'Kabupaten Bogor': {
      Cibinong: ['Cibinong', 'Nanggewer', 'Pakansari'],
      Citeureup: ['Citeureup', 'Karang Asem Barat'],
    },
    'Kota Bogor': {
      'Bogor Tengah': ['Babakan', 'Cibogor', 'Gudang'],
      'Bogor Barat': ['Bubulak', 'Curug', 'Menteng'],
    },
  },
  'DKI Jakarta': {
    'Jakarta Selatan': {
      'Kebayoran Baru': ['Senayan', 'Selong', 'Gunung'],
      Tebet: ['Tebet Barat', 'Tebet Timur'],
    },
    'Jakarta Timur': {
      Jatinegara: ['Bali Mester', 'Kampung Melayu'],
      'Duren Sawit': ['Duren Sawit', 'Klender'],
    },
  },
  'Jawa Tengah': {
    'Kota Semarang': {
      'Semarang Tengah': ['Brumbungan', 'Miroto'],
      Tembalang: ['Bulusan', 'Kramas'],
    },
    'Kabupaten Semarang': {
      'Ungaran Barat': ['Bandarjo', 'Candirejo'],
      Bergas: ['Bergas Lor', 'Wujil'],
    },
  },
}

const provinsiList = Object.keys(wilayah)


type FormState = {
  nik: string
  namaLengkap: string
  tempatLahir: string
  tanggalLahir: string
  jenisKelamin: string
  alamat: string
  provinsi: string
  kabupaten: string
  kecamatan: string
  kelurahan: string
  noHp: string
  email: string

  pendidikan: string
  instansi: string
  jurusan: string
  pekerjaan: string

  ktp: File | null
  kk: File | null
  ijazah: File | null
  rekomendasi: File | null

  persetujuan: boolean
}

type Errors = Record<string, string>

export default function FormPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const beasiswaId = Number(searchParams.get('beasiswaId'))
  const revisionPendaftaranId = Number(
    searchParams.get('pendaftaranId'),
  )

  const [programName, setProgramName] =
    useState('Program Beasiswa')

  const [registrationStatus, setRegistrationStatus] =
    useState('DRAFT')

  const [pageError, setPageError] =
    useState('')

  const [currentStep, setCurrentStep] = useState(1)

  const [showWizard, setShowWizard] = useState(false)

  const [creatingPendaftaran, setCreatingPendaftaran] =
    useState(false)

  const [uploadingDokumen, setUploadingDokumen] =
    useState(false)

  const [autoSaveState, setAutoSaveState] =
    useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialDataLoaded = useRef(false)

  const [submitted, setSubmitted] = useState(false)

  const [pendaftaranId, setPendaftaranId] =
    useState<number | null>(null)

  const [errors, setErrors] = useState<Errors>({})

  // Dokumen lama pada pendaftaran revisi. Urutan slot: KTP, KK, Ijazah, Rekomendasi.
  const [existingDocuments, setExistingDocuments] = useState<(Dokumen | null)[]>([
    null,
    null,
    null,
    null,
  ])

  const [form, setForm] = useState<FormState>({
    nik: '',
    namaLengkap: '',
    tempatLahir: '',
    tanggalLahir: '',
    jenisKelamin: '',
    alamat: '',
    provinsi: '',
    kabupaten: '',
    kecamatan: '',
    kelurahan: '',
    noHp: '',
    email: '',

    pendidikan: '',
    instansi: '',
    jurusan: '',
    pekerjaan: '',

    ktp: null,
    kk: null,
    ijazah: null,
    rekomendasi: null,

    persetujuan: false,
  })

  const kabupatenList = form.provinsi
    ? Object.keys(wilayah[form.provinsi] ?? {})
    : []

  const kecamatanList = form.provinsi && form.kabupaten
    ? Object.keys(wilayah[form.provinsi]?.[form.kabupaten] ?? {})
    : []

  const kelurahanList = form.provinsi && form.kabupaten && form.kecamatan
    ? wilayah[form.provinsi]?.[form.kabupaten]?.[form.kecamatan] ?? []
    : []

  /*
  |--------------------------------------------------------------------------
  | LOAD PROGRAM + PENDAFTARAN AKTIF
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    async function loadRegistration() {
      try {
        setPageError('')

        const currentUser = getAuthUser()

        if (!currentUser) {
          setPageError(
            'Silakan login terlebih dahulu sebelum mengisi pendaftaran.',
          )
          return
        }

        if (!Number.isInteger(beasiswaId) || beasiswaId <= 0) {
          setPageError(
            'Program beasiswa belum dipilih. Silakan kembali ke beranda.',
          )
          return
        }

        const programs = await getActivePrograms()

        const program = programs.find(
          (item) =>
            item.id === beasiswaId &&
            item.status === 'AKTIF',
        )

        if (!program) {
          setPageError(
            'Program beasiswa tidak ditemukan atau sudah tidak aktif.',
          )
          return
        }

        setProgramName(program.nama)

        let existing: Pendaftaran | null = null

        /*
         * Jika halaman dibuka dari RevisionPage, gunakan
         * pendaftaranId yang dikirim melalui URL.
         * Jangan mengambil registrations[0], karena itu bisa
         * menunjuk ke pendaftaran lain.
         */
        if (
          Number.isInteger(revisionPendaftaranId) &&
          revisionPendaftaranId > 0
        ) {
          existing = await getPendaftaranById(
            revisionPendaftaranId,
          )

          if (existing.beasiswaId !== beasiswaId) {
            setPageError(
              'Pendaftaran tidak sesuai dengan program beasiswa yang dipilih.',
            )
            return
          }

          if (existing.status !== 'REVISION') {
            setPageError(
              'Pendaftaran ini tidak sedang dalam status revisi.',
            )
            return
          }
        } else {
          /*
           * Untuk pendaftaran normal, cari pendaftaran
           * milik program yang sedang dipilih.
           */
          const registrations = await getPendaftaran()

          existing =
            registrations.find(
              (item) => item.beasiswaId === beasiswaId,
            ) ?? null
        }

        if (!existing) {
          return
        }

        setPendaftaranId(existing.id)
        setRegistrationStatus(existing.status)

        // Ambil dokumen lama. Untuk data lama yang sudah terlanjur duplikat,
        // pertahankan 4 dokumen pertama (slot KTP/KK/Ijazah/Rekomendasi)
        // dan hapus sisanya agar revisi tidak terus menumpuk.
        if (existing.status === 'REVISION') {
          try {
            const docs = await getDokumenByPendaftaran(existing.id)
            const orderedDocs = [...docs].sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            )

            const keptDocs = orderedDocs.slice(0, 4)
            const duplicateDocs = orderedDocs.slice(4)

            if (duplicateDocs.length > 0) {
              await Promise.all(
                duplicateDocs.map((doc) => deleteDokumen(doc.id)),
              )
            }

            setExistingDocuments([
              keptDocs[0] ?? null,
              keptDocs[1] ?? null,
              keptDocs[2] ?? null,
              keptDocs[3] ?? null,
            ])
          } catch (documentError) {
            console.error(
              'Gagal memuat dokumen pendaftaran:',
              documentError,
            )
            setExistingDocuments([null, null, null, null])
          }
        }
        setSubmitted(
          !['DRAFT', 'REVISION'].includes(existing.status),
        )

        setForm((prev) => ({
          ...prev,
          nik: existing.nik ?? '',
          namaLengkap: existing.namaLengkap ?? '',
          tempatLahir: existing.tempatLahir ?? '',
          tanggalLahir: existing.tanggalLahir
            ? String(existing.tanggalLahir).slice(0, 10)
            : '',
          jenisKelamin: existing.jenisKelamin ?? '',
          alamat: existing.alamat ?? '',
          provinsi: existing.provinsi ?? '',
          kabupaten: existing.kabupatenKota ?? '',
          kecamatan: existing.kecamatan ?? '',
          kelurahan: existing.kelurahan ?? '',
          noHp: existing.noHp ?? '',
          email: existing.email ?? '',
          pendidikan: existing.pendidikan ?? '',
          instansi: existing.instansi ?? '',
          jurusan: existing.jurusan ?? '',
          pekerjaan: existing.pekerjaan ?? '',
        }))

        initialDataLoaded.current = true

        if (existing.status === 'SUBMITTED' ||
            existing.status === 'INTERVIEW') {
          navigate(
            `/pendaftaran/terkirim?pendaftaranId=${existing.id}`,
            { replace: true },
          )
          return
        }

        if (existing.status === 'PASSED') {
          navigate(
            `/pendaftaran/lulus?pendaftaranId=${existing.id}`,
            { replace: true },
          )
        }
      } catch (error) {
        console.error(
          'Gagal memuat program/pendaftaran:',
          error,
        )

        setPageError(
          error instanceof Error
            ? error.message
            : 'Gagal memuat data pendaftaran.',
        )
      }
    }

    loadRegistration()
  }, [beasiswaId, revisionPendaftaranId, navigate])

  /*
  |--------------------------------------------------------------------------
  | HANDLE INPUT
  |--------------------------------------------------------------------------
  */

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) {
    const { name, value, type } = event.target

    const checked =
      type === 'checkbox'
        ? (event.target as HTMLInputElement).checked
        : undefined

    setForm((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : value,
    }))

    setErrors((prev) => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }


  /*
  |--------------------------------------------------------------------------
  | AUTO SAVE DATA
  |--------------------------------------------------------------------------
  |
  | Data diri dan pendidikan disimpan otomatis setelah pengguna berhenti
  | mengetik/mengubah field selama 700ms. Tidak perlu menekan "Simpan Draft".
  |
  */

  useEffect(() => {
    if (
      !initialDataLoaded.current ||
      !pendaftaranId ||
      !['DRAFT', 'REVISION'].includes(registrationStatus)
    ) {
      return
    }

    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current)
    }

    setAutoSaveState('saving')

    autoSaveTimer.current = setTimeout(async () => {
      try {
        await updatePendaftaran(
          pendaftaranId,
          {
            nik: form.nik,
            namaLengkap: form.namaLengkap,
            tempatLahir: form.tempatLahir,
            tanggalLahir: form.tanggalLahir,
            jenisKelamin: form.jenisKelamin,
            alamat: form.alamat,
            provinsi: form.provinsi,
            kabupatenKota: form.kabupaten,
            kecamatan: form.kecamatan,
            kelurahan: form.kelurahan,
            noHp: form.noHp,
            email: form.email,
            pendidikan: form.pendidikan,
            instansi: form.instansi,
            jurusan: form.jurusan,
            pekerjaan: form.pekerjaan,
          },
        )

        setAutoSaveState('saved')
      } catch (error) {
        console.error('Auto-save gagal:', error)
        setAutoSaveState('error')
      }
    }, 700)

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current)
      }
    }
  }, [
    pendaftaranId,
    registrationStatus,
    form.nik,
    form.namaLengkap,
    form.tempatLahir,
    form.tanggalLahir,
    form.jenisKelamin,
    form.alamat,
    form.provinsi,
    form.kabupaten,
    form.kecamatan,
    form.kelurahan,
    form.noHp,
    form.email,
    form.pendidikan,
    form.instansi,
    form.jurusan,
    form.pekerjaan,
  ])

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
    field:
      | 'ktp'
      | 'kk'
      | 'ijazah'
      | 'rekomendasi',
  ) {
    const file = event.target.files?.[0] ?? null

    if (!file) {
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        [field]: 'Ukuran file maksimal 2 MB.',
      }))
      event.target.value = ''
      return
    }

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
    ]

    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        [field]: 'Format harus PDF, JPG/JPEG, atau PNG.',
      }))
      event.target.value = ''
      return
    }

    setForm((prev) => ({
      ...prev,
      [field]: file,
    }))

    setErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })

    /*
     * Dokumen langsung di-upload setelah dipilih.
     * Jadi pengguna tidak perlu menekan tombol "Simpan Draft".
     */
    if (pendaftaranId) {
      const documentIndex = {
        ktp: 0,
        kk: 1,
        ijazah: 2,
        rekomendasi: 3,
      }[field]

      try {
        setUploadingDokumen(true)

        // Pada revisi, ganti dokumen lama di slot yang sama.
        // Jangan membuat record baru di atas record lama.
        const oldDocument = existingDocuments[documentIndex]

        if (oldDocument) {
          await deleteDokumen(oldDocument.id)
        }

        const uploaded = await uploadDokumen(pendaftaranId, file)

        setExistingDocuments((prev) => {
          const next = [...prev]
          next[documentIndex] = uploaded
          return next
        })
      } catch (error) {
        console.error(`Gagal mengganti dokumen ${field}:`, error)

        setErrors((prev) => ({
          ...prev,
          [field]:
            error instanceof Error
              ? error.message
              : 'Gagal mengupload dokumen.',
        }))
      } finally {
        setUploadingDokumen(false)
      }
    }
  }

  /*
  |--------------------------------------------------------------------------
  | VALIDATION
  |--------------------------------------------------------------------------
  */

  function validateStep(step: number) {
    const newErrors: Errors = {}

    if (step === 1) {
      if (!form.nik.trim()) {
        newErrors.nik = 'NIK wajib diisi'
      }

      if (!form.namaLengkap.trim()) {
        newErrors.namaLengkap =
          'Nama lengkap wajib diisi'
      }

      if (!form.tempatLahir.trim()) {
        newErrors.tempatLahir =
          'Tempat lahir wajib diisi'
      }

      if (!form.tanggalLahir) {
        newErrors.tanggalLahir =
          'Tanggal lahir wajib diisi'
      }

      if (!form.jenisKelamin) {
        newErrors.jenisKelamin =
          'Jenis kelamin wajib dipilih'
      }

      if (!form.alamat.trim()) {
        newErrors.alamat =
          'Alamat wajib diisi'
      }

      if (!form.provinsi) {
        newErrors.provinsi =
          'Provinsi wajib dipilih'
      }

      if (!form.kabupaten) {
        newErrors.kabupaten =
          'Kabupaten/Kota wajib dipilih'
      }

      if (!form.kecamatan) {
        newErrors.kecamatan =
          'Kecamatan wajib diisi'
      }

      if (!form.kelurahan) {
        newErrors.kelurahan =
          'Kelurahan wajib diisi'
      }

      if (!form.noHp.trim()) {
        newErrors.noHp =
          'Nomor HP wajib diisi'
      }

      if (!form.email.trim()) {
        newErrors.email =
          'Email wajib diisi'
      }
    }

    if (step === 2) {
      if (!form.pendidikan) {
        newErrors.pendidikan =
          'Pendidikan wajib dipilih'
      }

      if (!form.instansi.trim()) {
        newErrors.instansi =
          'Instansi wajib diisi'
      }

      if (!form.jurusan.trim()) {
        newErrors.jurusan =
          'Jurusan wajib diisi'
      }

      if (!form.pekerjaan.trim()) {
        newErrors.pekerjaan =
          'Pekerjaan wajib diisi'
      }
    }

    if (step === 3) {
      if (!form.ktp && !existingDocuments[0]) {
        newErrors.ktp =
          'Dokumen KTP wajib diunggah'
      }

      if (!form.kk && !existingDocuments[1]) {
        newErrors.kk =
          'Dokumen KK wajib diunggah'
      }

      if (!form.ijazah && !existingDocuments[2]) {
        newErrors.ijazah =
          'Dokumen ijazah wajib diunggah'
      }

      if (!form.rekomendasi && !existingDocuments[3]) {
        newErrors.rekomendasi =
          'Dokumen rekomendasi wajib diunggah'
      }
    }

    if (step === 4) {
      if (!form.persetujuan) {
        newErrors.persetujuan =
          'Anda harus menyetujui pernyataan'
      }
    }

    setErrors(newErrors)

    return Object.keys(newErrors).length === 0
  }

  /*
  |--------------------------------------------------------------------------
  | START REGISTRATION
  |--------------------------------------------------------------------------
  */

  async function handleStartRegistration() {
    try {
      setCreatingPendaftaran(true)
      setPageError('')

      const currentUser = getAuthUser()

      if (!currentUser) {
        setPageError(
          'Silakan login terlebih dahulu.',
        )
        return
      }

      if (!Number.isInteger(beasiswaId) || beasiswaId <= 0) {
        setPageError(
          'Program beasiswa belum dipilih.',
        )
        return
      }

      /*
       * Jika draft/revisi sudah pernah dibuat,
       * jangan buat baris pendaftaran baru.
       * Langsung lanjutkan wizard yang ada.
       */
      if (pendaftaranId) {
        if (!['DRAFT', 'REVISION'].includes(registrationStatus)) {
          setPageError(
            'Pendaftaran sudah dikirim dan tidak dapat diubah.',
          )
          return
        }

        setCurrentStep(1)
        setShowWizard(true)
        return
      }

      const data = await createPendaftaran(
        beasiswaId,
      )

      setPendaftaranId(data.id)
      setRegistrationStatus(data.status)
      setSubmitted(false)
      setCurrentStep(1)
      setShowWizard(true)
    } catch (error) {
      console.error(
        'Gagal membuat pendaftaran:',
        error,
      )

      setPageError(
        error instanceof Error
          ? error.message
          : 'Gagal membuat pendaftaran.',
      )
    } finally {
      setCreatingPendaftaran(false)
    }
  }

  /*
  |--------------------------------------------------------------------------
  | NEXT STEP
  |--------------------------------------------------------------------------
  */

  async function handleNext() {
    if (!validateStep(currentStep)) {
      return
    }

    if (!pendaftaranId) {
      alert(
        'Pendaftaran belum dibuat. Silakan mulai kembali.',
      )
      return
    }

    /*
    |--------------------------------------------------------------------------
    | STEP 1
    |--------------------------------------------------------------------------
    */

    if (currentStep === 1) {
      try {
        const updatedPendaftaran =
          await updatePendaftaran(
            pendaftaranId,
            {
              nik: form.nik,
              namaLengkap: form.namaLengkap,
              tempatLahir: form.tempatLahir,
              tanggalLahir: form.tanggalLahir,
              jenisKelamin: form.jenisKelamin,
              alamat: form.alamat,
              provinsi: form.provinsi,
              kabupatenKota: form.kabupaten,
              kecamatan: form.kecamatan,
              kelurahan: form.kelurahan,
              noHp: form.noHp,
              email: form.email,
            },
          )

        setPendaftaranId(
          updatedPendaftaran.id,
        )
      } catch (error) {
        console.error(
          'Gagal menyimpan data diri:',
          error,
        )

        alert(
          error instanceof Error
            ? error.message
            : 'Gagal menyimpan data diri.',
        )

        return
      }
    }

    /*
    |--------------------------------------------------------------------------
    | STEP 2
    |--------------------------------------------------------------------------
    */

    if (currentStep === 2) {
      try {
        const updatedPendaftaran =
          await updatePendaftaran(
            pendaftaranId,
            {
              pendidikan: form.pendidikan,
              instansi: form.instansi,
              jurusan: form.jurusan,
              pekerjaan: form.pekerjaan,
            },
          )

        setPendaftaranId(
          updatedPendaftaran.id,
        )
      } catch (error) {
        console.error(
          'Gagal menyimpan data pendidikan dan pekerjaan:',
          error,
        )

        alert(
          error instanceof Error
            ? error.message
            : 'Gagal menyimpan data pendidikan dan pekerjaan.',
        )

        return
      }
    }

    /*
    |--------------------------------------------------------------------------
    | STEP 3
    |--------------------------------------------------------------------------
    |
    | Dokumen sudah di-upload langsung ketika pengguna memilih file.
    | Jangan upload ulang saat berpindah ke Step 4 agar tidak membuat
    | dokumen duplikat di database.
    */

    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(
        (prev) => prev + 1,
      )
    }
  }


  /*
  |--------------------------------------------------------------------------
  | PREVIOUS STEP
  |--------------------------------------------------------------------------
  */

  function handlePrev() {
    if (currentStep > 1) {
      setCurrentStep(
        (prev) => prev - 1,
      )
    }
  }

  /*
  |--------------------------------------------------------------------------
  | FINAL SUBMIT
  |--------------------------------------------------------------------------
  */

  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault()

    if (!validateStep(4)) {
      return
    }

    if (!pendaftaranId) {
      alert(
        'Pendaftaran belum dibuat. Silakan mulai kembali.',
      )
      return
    }

    try {
      /*
       * INI YANG SEBELUMNYA BELUM ADA.
       *
       * UI sebelumnya hanya menjalankan:
       *
       * setSubmitted(true)
       *
       * sehingga database tetap DRAFT.
       *
       * Sekarang benar-benar submit ke backend.
       */
      const result =
        await submitPendaftaran(
          pendaftaranId,
        )

      console.log(
        'Pendaftaran berhasil disubmit:',
        result,
      )

      setSubmitted(true)
      setRegistrationStatus(result.status)
      setShowWizard(false)
      setCurrentStep(1)

      navigate(
        `/pendaftaran/terkirim?pendaftaranId=${pendaftaranId}`,
      )
    } catch (error) {
      console.error(
        'Gagal submit pendaftaran:',
        error,
      )

      alert(
        error instanceof Error
          ? error.message
          : 'Gagal mengirim pendaftaran.',
      )
    }
  }

  /*
  |--------------------------------------------------------------------------
  | CLOSE WIZARD
  |--------------------------------------------------------------------------
  */

  function closeWizard() {
    setShowWizard(false)
    setCurrentStep(1)
    setErrors({})
  }

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <>
      {/* NAVBAR */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary sticky-top shadow-sm">
        <div className="container">
          <a
            className="navbar-brand fw-bold"
            href="/"
          >
            <i className="bi bi-mortarboard-fill me-2"></i>
            BeasiswaApp
          </a>

          <div className="ms-auto">
            <button
              type="button"
              className="btn btn-light"
              onClick={() =>
                navigate('/')
              }
            >
              <i className="bi bi-house me-2"></i>
              Beranda
            </button>
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <main className="bg-light min-vh-100">
        <div className="container py-4">

          {pageError && (
            <div className="alert alert-danger border-0 shadow-sm mb-4">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {pageError}
            </div>
          )}

          {/* WELCOME ALERT */}
          <div className="alert alert-primary border-0 shadow-sm d-flex align-items-center mb-4">
            <i className="bi bi-info-circle-fill fs-3 me-3"></i>

            <div>
              <strong className="fs-6">
                Selamat Datang! Silakan Lengkapi
                Formulir Pendaftaran
              </strong>

              <p className="mb-0 small">
                Anda memilih program{' '}
                <strong>
                  {programName}
                </strong>
                . Harap isi data diri dan unggah
                dokumen persyaratan dengan benar
                sebelum melakukan pengiriman final.
              </p>
            </div>
          </div>

          {/* ACTIVE REGISTRATION */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white py-3 fw-bold border-bottom d-flex justify-content-between align-items-center">
              <span>
                <i className="bi bi-file-earmark-text me-2 text-primary"></i>
                Pendaftaran Aktif Anda
              </span>

              <span
                className={`badge ${
                  submitted
                    ? 'bg-success'
                    : 'bg-secondary'
                }`}
              >
                {registrationStatus === 'REVISION'
                  ? 'Perlu Revisi'
                  : submitted
                    ? 'Sudah Dikirim'
                    : 'Draft Belum Dikirim'}
              </span>
            </div>

            <div className="card-body text-center py-5">

              {registrationStatus === 'REVISION' ? (
                <>
                  <i className="bi bi-pencil-square display-1 text-warning opacity-75 mb-3"></i>

                  <h5>
                    Pendaftaran Memerlukan Perbaikan
                  </h5>

                  <p className="text-muted small mb-4">
                    Data pendaftaran Anda dikembalikan oleh
                    verifikator. Silakan periksa dan perbaiki
                    data atau dokumen, kemudian kirim ulang.
                  </p>

                  <button
                    type="button"
                    className="btn btn-warning btn-lg px-4 fw-semibold"
                    onClick={handleStartRegistration}
                    disabled={creatingPendaftaran}
                  >
                    {creatingPendaftaran ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                        />
                        Membuka Formulir...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-pencil-square me-2"></i>
                        Perbaiki &amp; Kirim Ulang
                      </>
                    )}
                  </button>
                </>
              ) : !submitted ? (
                <>
                  <i className="bi bi-journal-plus display-1 text-primary opacity-50 mb-3"></i>

                  <h5>
                    Anda belum melengkapi formulir
                    pendaftaran
                  </h5>

                  <p className="text-muted small mb-4">
                    Silakan klik tombol di bawah
                    untuk mulai mengisi data diri,
                    latar belakang pendidikan, dan
                    berkas persyaratan.
                  </p>

                  <button
                    type="button"
                    className="btn btn-primary btn-lg px-4 fw-semibold"
                    onClick={handleStartRegistration}
                    disabled={creatingPendaftaran}
                  >
                    {creatingPendaftaran ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                        />
                        Menyiapkan Pendaftaran...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-pencil-square me-2"></i>
                        {pendaftaranId
                          ? 'Lanjutkan Formulir Pendaftaran'
                          : 'Mulai Isi Formulir Pendaftaran'}
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle-fill display-1 text-success opacity-75 mb-3"></i>

                  <h5>
                    Formulir Pendaftaran Berhasil
                    Dikirim
                  </h5>

                  <p className="text-muted small mb-0">
                    Data Anda telah berhasil
                    dikirim dan sedang menunggu
                    proses seleksi administrasi.
                  </p>
                </>
              )}

            </div>
          </div>

        </div>
      </main>

      {/* WIZARD MODAL */}
      {showWizard && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          role="dialog"
          style={{
            backgroundColor: 'rgba(0,0,0,.5)',
            overflowY: 'auto',
            padding: '20px 0',
          }}
        >
          <div
            className="modal-dialog modal-xl"
            role="document"
            style={{
              maxWidth: '1140px',
              height: 'calc(100vh - 40px)',
              margin: '0 auto',
            }}
          >
            <div
              className="modal-content"
              style={{
                height: '100%',
                maxHeight: 'calc(100vh - 40px)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >

            <div className="modal-header bg-primary text-white">
              <h5 className="modal-title fw-bold">
                Formulir Pendaftaran —{' '}
                {programName}
              </h5>

              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={closeWizard}
              ></button>
            </div>

            {/* WIZARD HEADER */}
            <ul className="nav nav-tabs nav-justified wizard-steps bg-white">
              {[1, 2, 3, 4].map((step) => (
                <li className="nav-item" key={step}>
                  <button
                    type="button"
                    className={`nav-link ${currentStep === step ? 'active' : ''} ${currentStep > step ? 'completed' : ''}`}
                    style={{ pointerEvents: 'none' }}
                  >
                    {step}.{' '}

                    {step === 1 &&
                      'Data Diri & Kontak'}

                    {step === 2 &&
                      'Pendidikan & Pekerjaan'}

                    {step === 3 &&
                      'Unggah Dokumen'}

                    {step === 4 &&
                      'Persetujuan & Submit'}
                  </button>
                </li>
              ))}
            </ul>

            <form
              onSubmit={handleSubmit}
              className="d-flex flex-column"
              style={{
                flex: 1,
                minHeight: 0,
              }}
            >
              <div
                className="modal-body p-4"
                style={{
                  overflowY: 'auto',
                  flex: 1,
                  minHeight: 0,
                }}
              >

                {/* ======================================================
                    STEP 1
                ====================================================== */}

                {currentStep === 1 && (
                  <div>
                    <h5 className="fw-bold mb-4">
                      Data Diri & Kontak
                    </h5>

                    <div className="row g-3">

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          NIK
                        </label>

                        <input
                          type="text"
                          name="nik"
                          required
                          className={`form-control ${
                            errors.nik
                              ? 'is-invalid'
                              : ''
                          }`}
                          value={form.nik}
                          onChange={
                            handleChange
                          }
                        />

                        {errors.nik && (
                          <div className="invalid-feedback">
                            {errors.nik}
                          </div>
                        )}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Nama Lengkap
                        </label>

                        <input
                          type="text"
                          name="namaLengkap"
                          required
                          className={`form-control ${
                            errors.namaLengkap
                              ? 'is-invalid'
                              : ''
                          }`}
                          value={
                            form.namaLengkap
                          }
                          onChange={
                            handleChange
                          }
                        />

                        {errors.namaLengkap && (
                          <div className="invalid-feedback">
                            {errors.namaLengkap}
                          </div>
                        )}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Tempat Lahir
                        </label>

                        <input
                          type="text"
                          name="tempatLahir"
                          required
                          className={`form-control ${
                            errors.tempatLahir
                              ? 'is-invalid'
                              : ''
                          }`}
                          value={
                            form.tempatLahir
                          }
                          onChange={
                            handleChange
                          }
                        />

                        {errors.tempatLahir && (
                          <div className="invalid-feedback">
                            {errors.tempatLahir}
                          </div>
                        )}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Tanggal Lahir
                        </label>

                        <input
                          type="date"
                          name="tanggalLahir"
                          required
                          className={`form-control ${
                            errors.tanggalLahir
                              ? 'is-invalid'
                              : ''
                          }`}
                          value={
                            form.tanggalLahir
                          }
                          onChange={
                            handleChange
                          }
                        />

                        {errors.tanggalLahir && (
                          <div className="invalid-feedback">
                            {errors.tanggalLahir}
                          </div>
                        )}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Jenis Kelamin
                        </label>

                        <select
                          name="jenisKelamin"
                          required
                          className={`form-select ${
                            errors.jenisKelamin
                              ? 'is-invalid'
                              : ''
                          }`}
                          value={
                            form.jenisKelamin
                          }
                          onChange={
                            handleChange
                          }
                        >
                          <option value="">
                            Pilih Jenis Kelamin
                          </option>

                          <option value="L">
                            Laki-laki
                          </option>

                          <option value="P">
                            Perempuan
                          </option>
                        </select>

                        {errors.jenisKelamin && (
                          <div className="invalid-feedback">
                            {errors.jenisKelamin}
                          </div>
                        )}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Nomor HP
                        </label>

                        <input
                          type="text"
                          name="noHp"
                          required
                          className={`form-control ${
                            errors.noHp
                              ? 'is-invalid'
                              : ''
                          }`}
                          value={form.noHp}
                          onChange={
                            handleChange
                          }
                        />

                        {errors.noHp && (
                          <div className="invalid-feedback">
                            {errors.noHp}
                          </div>
                        )}
                      </div>

                      <div className="col-12">
                        <label className="form-label fw-semibold">
                          Email
                        </label>

                        <input
                          type="email"
                          name="email"
                          required
                          className={`form-control ${
                            errors.email
                              ? 'is-invalid'
                              : ''
                          }`}
                          value={form.email}
                          onChange={
                            handleChange
                          }
                        />

                        {errors.email && (
                          <div className="invalid-feedback">
                            {errors.email}
                          </div>
                        )}
                      </div>

                      <div className="col-12">
                        <label className="form-label fw-semibold">
                          Alamat
                        </label>

                        <textarea
                          name="alamat"
                          required
                          rows={3}
                          className={`form-control ${
                            errors.alamat
                              ? 'is-invalid'
                              : ''
                          }`}
                          value={
                            form.alamat
                          }
                          onChange={
                            handleChange
                          }
                        />

                        {errors.alamat && (
                          <div className="invalid-feedback">
                            {errors.alamat}
                          </div>
                        )}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Provinsi
                        </label>
                        <select
                          name="provinsi"
                          required
                          className={`form-select ${errors.provinsi ? 'is-invalid' : ''}`}
                          value={form.provinsi}
                          onChange={(event) => {
                            const value = event.target.value
                            setForm((prev) => ({
                              ...prev,
                              provinsi: value,
                              kabupaten: '',
                              kecamatan: '',
                              kelurahan: '',
                            }))
                            setErrors((prev) => {
                              const next = { ...prev }
                              delete next.provinsi
                              delete next.kabupaten
                              delete next.kecamatan
                              delete next.kelurahan
                              return next
                            })
                          }}
                        >
                          <option value="">Pilih Provinsi</option>
                          {provinsiList.map((provinsi) => (
                            <option key={provinsi} value={provinsi}>{provinsi}</option>
                          ))}
                        </select>
                        {errors.provinsi && (
                          <div className="invalid-feedback">{errors.provinsi}</div>
                        )}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Kabupaten/Kota
                        </label>
                        <select
                          name="kabupaten"
                          required
                          className={`form-select ${errors.kabupaten ? 'is-invalid' : ''}`}
                          value={form.kabupaten}
                          disabled={!form.provinsi}
                          onChange={(event) => {
                            const value = event.target.value
                            setForm((prev) => ({
                              ...prev,
                              kabupaten: value,
                              kecamatan: '',
                              kelurahan: '',
                            }))
                            setErrors((prev) => {
                              const next = { ...prev }
                              delete next.kabupaten
                              delete next.kecamatan
                              delete next.kelurahan
                              return next
                            })
                          }}
                        >
                          <option value="">Pilih Kabupaten/Kota</option>
                          {kabupatenList.map((kabupaten) => (
                            <option key={kabupaten} value={kabupaten}>{kabupaten}</option>
                          ))}
                        </select>
                        {errors.kabupaten && (
                          <div className="invalid-feedback">{errors.kabupaten}</div>
                        )}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Kecamatan
                        </label>
                        <select
                          name="kecamatan"
                          required
                          className={`form-select ${errors.kecamatan ? 'is-invalid' : ''}`}
                          value={form.kecamatan}
                          disabled={!form.kabupaten}
                          onChange={(event) => {
                            const value = event.target.value
                            setForm((prev) => ({
                              ...prev,
                              kecamatan: value,
                              kelurahan: '',
                            }))
                            setErrors((prev) => {
                              const next = { ...prev }
                              delete next.kecamatan
                              delete next.kelurahan
                              return next
                            })
                          }}
                        >
                          <option value="">Pilih Kecamatan</option>
                          {kecamatanList.map((kecamatan) => (
                            <option key={kecamatan} value={kecamatan}>{kecamatan}</option>
                          ))}
                        </select>
                        {errors.kecamatan && (
                          <div className="invalid-feedback">{errors.kecamatan}</div>
                        )}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Kelurahan
                        </label>
                        <select
                          name="kelurahan"
                          required
                          className={`form-select ${errors.kelurahan ? 'is-invalid' : ''}`}
                          value={form.kelurahan}
                          disabled={!form.kecamatan}
                          onChange={handleChange}
                        >
                          <option value="">Pilih Kelurahan</option>
                          {kelurahanList.map((kelurahan) => (
                            <option key={kelurahan} value={kelurahan}>{kelurahan}</option>
                          ))}
                        </select>
                        {errors.kelurahan && (
                          <div className="invalid-feedback">{errors.kelurahan}</div>
                        )}
                      </div>

                    </div>
                  </div>
                )}

                {/* ======================================================
                    STEP 2
                ====================================================== */}

                {currentStep === 2 && (
                  <div>
                    <h5 className="fw-bold mb-4">
                      Pendidikan & Pekerjaan
                    </h5>

                    <div className="row g-3">

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Pendidikan Terakhir
                        </label>

                        <select
                          name="pendidikan"
                          required
                          className={`form-select ${
                            errors.pendidikan
                              ? 'is-invalid'
                              : ''
                          }`}
                          value={
                            form.pendidikan
                          }
                          onChange={
                            handleChange
                          }
                        >
                          <option value="">
                            Pilih Pendidikan
                          </option>

                          <option value="SMA / SMK">
                            SMA / SMK
                          </option>

                          <option value="D3 / D4">
                            D3 / D4
                          </option>

                          <option value="S1 (Sarjana)">
                            S1 (Sarjana)
                          </option>

                          <option value="S2 (Magister)">
                            S2 (Magister)
                          </option>

                          <option value="S3 (Doktor)">
                            S3 (Doktor)
                          </option>
                        </select>

                        {errors.pendidikan && (
                          <div className="invalid-feedback">
                            {errors.pendidikan}
                          </div>
                        )}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Instansi
                        </label>

                        <input
                          type="text"
                          name="instansi"
                          required
                          className={`form-control ${
                            errors.instansi
                              ? 'is-invalid'
                              : ''
                          }`}
                          value={
                            form.instansi
                          }
                          onChange={
                            handleChange
                          }
                        />

                        {errors.instansi && (
                          <div className="invalid-feedback">
                            {errors.instansi}
                          </div>
                        )}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Jurusan
                        </label>

                        <input
                          type="text"
                          name="jurusan"
                          required
                          className={`form-control ${
                            errors.jurusan
                              ? 'is-invalid'
                              : ''
                          }`}
                          value={
                            form.jurusan
                          }
                          onChange={
                            handleChange
                          }
                        />

                        {errors.jurusan && (
                          <div className="invalid-feedback">
                            {errors.jurusan}
                          </div>
                        )}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Pekerjaan
                        </label>

                        <input
                          type="text"
                          name="pekerjaan"
                          required
                          className={`form-control ${
                            errors.pekerjaan
                              ? 'is-invalid'
                              : ''
                          }`}
                          value={
                            form.pekerjaan
                          }
                          onChange={
                            handleChange
                          }
                        />

                        {errors.pekerjaan && (
                          <div className="invalid-feedback">
                            {errors.pekerjaan}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}

                {/* ======================================================
                    STEP 3
                ====================================================== */}

                {currentStep === 3 && (
                  <div>
                    <h5 className="fw-bold mb-4">
                      Unggah Dokumen
                    </h5>

                    <div className="row g-4">

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          KTP
                        </label>

                        <input
                          type="file"
                          className={`form-control ${
                            errors.ktp
                              ? 'is-invalid'
                              : ''
                          }`}
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(event) =>
                            handleFileChange(
                              event,
                              'ktp',
                            )
                          }
                        />

                        <div className="form-text">
                          Maksimal 2 MB.
                        </div>

                        {errors.ktp && (
                          <div className="invalid-feedback">
                            {errors.ktp}
                          </div>
                        )}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Kartu Keluarga
                        </label>

                        <input
                          type="file"
                          className={`form-control ${
                            errors.kk
                              ? 'is-invalid'
                              : ''
                          }`}
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(event) =>
                            handleFileChange(
                              event,
                              'kk',
                            )
                          }
                        />

                        <div className="form-text">
                          Maksimal 2 MB.
                        </div>

                        {errors.kk && (
                          <div className="invalid-feedback">
                            {errors.kk}
                          </div>
                        )}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Ijazah
                        </label>

                        <input
                          type="file"
                          className={`form-control ${
                            errors.ijazah
                              ? 'is-invalid'
                              : ''
                          }`}
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(event) =>
                            handleFileChange(
                              event,
                              'ijazah',
                            )
                          }
                        />

                        <div className="form-text">
                          Maksimal 2 MB.
                        </div>

                        {errors.ijazah && (
                          <div className="invalid-feedback">
                            {errors.ijazah}
                          </div>
                        )}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Surat Rekomendasi
                        </label>

                        <input
                          type="file"
                          className={`form-control ${
                            errors.rekomendasi
                              ? 'is-invalid'
                              : ''
                          }`}
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(event) =>
                            handleFileChange(
                              event,
                              'rekomendasi',
                            )
                          }
                        />

                        <div className="form-text">
                          Maksimal 2 MB.
                        </div>

                        {errors.rekomendasi && (
                          <div className="invalid-feedback">
                            {errors.rekomendasi}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}

                {/* ======================================================
                    STEP 4
                ====================================================== */}

                {currentStep === 4 && (
                  <div>
                    <h5 className="fw-bold mb-4">
                      Persetujuan & Submit
                    </h5>

                    <div className="alert alert-warning">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>

                      Pastikan seluruh data dan
                      dokumen yang Anda masukkan
                      sudah benar sebelum melakukan
                      submit.
                    </div>

                    <div className="form-check">
                      <input
                        type="checkbox"
                        id="persetujuan"
                        name="persetujuan"
                        required
                        className={`form-check-input ${
                          errors.persetujuan
                            ? 'is-invalid'
                            : ''
                        }`}
                        checked={
                          form.persetujuan
                        }
                        onChange={
                          handleChange
                        }
                      />

                      <label
                        htmlFor="persetujuan"
                        className="form-check-label"
                      >
                        Saya menyatakan bahwa
                        seluruh data yang saya
                        masukkan adalah benar dan
                        dapat dipertanggungjawabkan.
                      </label>

                      {errors.persetujuan && (
                        <div className="invalid-feedback">
                          {errors.persetujuan}
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* FOOTER */}
              <div
                className="modal-footer bg-light justify-content-between flex-shrink-0"
                style={{
                  minHeight: '76px',
                }}
              >
                <div className="d-flex align-items-center gap-2">
                  <small className="text-danger me-2">* Wajib diisi</small>
                  <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handlePrev}
                  disabled={currentStep === 1 || uploadingDokumen}
                >
                  <i className="bi bi-arrow-left me-1"></i>
                  Kembali
                  </button>

                  <small className="text-secondary d-none d-md-inline">
                    {autoSaveState === 'saving' && (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-1"
                          style={{ width: '0.8rem', height: '0.8rem' }}
                        />
                        Menyimpan otomatis...
                      </>
                    )}
                    {autoSaveState === 'saved' && (
                      <>
                        <i className="bi bi-check-circle-fill text-success me-1"></i>
                        Tersimpan otomatis
                      </>
                    )}
                    {autoSaveState === 'error' && (
                      <>
                        <i className="bi bi-exclamation-circle-fill text-danger me-1"></i>
                        Gagal menyimpan
                      </>
                    )}
                  </small>
                </div>

                <div className="d-flex gap-2">
                {currentStep < TOTAL_STEPS ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={
                      handleNext
                    }
                    disabled={
                      uploadingDokumen
                    }
                  >
                    {uploadingDokumen ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                        />

                        Mengunggah...
                      </>
                    ) : (
                      <>
                        Selanjutnya
                        <i className="bi bi-arrow-right ms-1"></i>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="btn btn-success"
                  >
                    <i className="bi bi-send-fill me-2"></i>
                    Submit Final
                  </button>
                )}

              </div>
            </div>

            </form>

            </div>
          </div>
        </div>
      )}
    </>
  )
} 