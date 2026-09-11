import { apiRequest } from './client'

export type PendaftaranStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'REVISION'
  | 'INTERVIEW'
  | 'PASSED'
  | 'FAILED'

export type Pendaftaran = {
  id: number
  userId: number
  beasiswaId: number
  status: PendaftaranStatus | string

  // Data diri
  nik?: string | null
  namaLengkap?: string | null
  tempatLahir?: string | null
  tanggalLahir?: string | null
  jenisKelamin?: string | null
  alamat?: string | null
  provinsi?: string | null
  kabupatenKota?: string | null
  kecamatan?: string | null
  kelurahan?: string | null
  noHp?: string | null
  email?: string | null

  // Pendidikan & pekerjaan
  pendidikan?: string | null
  instansi?: string | null
  jurusan?: string | null
  pekerjaan?: string | null

  createdAt: string
  updatedAt: string

  seleksiAdministrasi?: SeleksiAdministrasi | null
  seleksiWawancara?: SeleksiWawancara | null
  hasilSeleksi?: HasilSeleksi | null
}

/*
|--------------------------------------------------------------------------
| SELEKSI ADMINISTRASI
|--------------------------------------------------------------------------
*/

export type SeleksiAdministrasiStatus =
  | 'LULUS'
  | 'REVISI'
  | 'TIDAK_LULUS'

export type SeleksiAdministrasi = {
  id: number
  pendaftaranId: number
  status:
    | SeleksiAdministrasiStatus
    | string
  catatan?: string | null
  createdAt: string
  updatedAt: string
}

export type SeleksiAdministrasiPayload = {
  status: SeleksiAdministrasiStatus
  catatan?: string
}

/*
|--------------------------------------------------------------------------
| SELEKSI WAWANCARA
|--------------------------------------------------------------------------
*/

export type SeleksiWawancaraStatus =
  | 'SELESAI'
  | string

export type SeleksiWawancara = {
  id: number
  pendaftaranId: number
  status: SeleksiWawancaraStatus
  catatan?: string | null
  tanggal?: string | null
  score?: number | null
  createdAt: string
  updatedAt: string
}

export type SeleksiWawancaraPayload = {
  status: 'SELESAI'
  catatan?: string
  tanggal?: string
  score: number
}

/*
|--------------------------------------------------------------------------
| HASIL SELEKSI
|--------------------------------------------------------------------------
*/

export type HasilSeleksiStatus =
  | 'LULUS'
  | 'TIDAK_LULUS'

export type HasilSeleksi = {
  id: number
  pendaftaranId: number
  hasil:
    | HasilSeleksiStatus
    | string
  catatan?: string | null
  createdAt: string
  updatedAt: string
}

export type HasilSeleksiPayload = {
  hasil: HasilSeleksiStatus
  catatan?: string
}

/*
|--------------------------------------------------------------------------
| PENDAFTARAN
|--------------------------------------------------------------------------
*/

export type CreatePendaftaranPayload = {
  beasiswaId: number
}

export type UpdatePendaftaranPayload = {
  beasiswaId?: number

  // Data diri
  nik?: string
  namaLengkap?: string
  tempatLahir?: string
  tanggalLahir?: string
  jenisKelamin?: string

  // Alamat
  alamat?: string
  provinsi?: string
  kabupatenKota?: string
  kecamatan?: string
  kelurahan?: string

  // Kontak
  noHp?: string
  email?: string

  // Pendidikan & pekerjaan
  pendidikan?: string
  instansi?: string
  jurusan?: string
  pekerjaan?: string
}

/*
|--------------------------------------------------------------------------
| API RESPONSE TYPES
|--------------------------------------------------------------------------
*/

type ListResponse = {
  data: Pendaftaran[]
}

type SingleResponse = {
  data: Pendaftaran
}

type MutationResponse = {
  message: string
  data: Pendaftaran
}

/*
|--------------------------------------------------------------------------
| GET ALL PENDAFTARAN
|--------------------------------------------------------------------------
*/

export async function getPendaftaran(): Promise<
  Pendaftaran[]
> {
  const response =
    await apiRequest<ListResponse>(
      '/api/pendaftaran',
      {
        method: 'GET',
      },
    )

  return response.data
}

/*
|--------------------------------------------------------------------------
| GET PENDAFTARAN BY ID
|--------------------------------------------------------------------------
*/

export async function getPendaftaranById(
  id: number,
): Promise<Pendaftaran> {
  const response =
    await apiRequest<SingleResponse>(
      `/api/pendaftaran/${id}`,
      {
        method: 'GET',
      },
    )

  return response.data
}

/*
|--------------------------------------------------------------------------
| CREATE PENDAFTARAN
|--------------------------------------------------------------------------
*/

export async function createPendaftaran(
  beasiswaId: number,
): Promise<Pendaftaran> {
  const response =
    await apiRequest<MutationResponse>(
      '/api/pendaftaran',
      {
        method: 'POST',
        body: JSON.stringify({
          beasiswaId,
        }),
      },
    )

  return response.data
}

/*
|--------------------------------------------------------------------------
| UPDATE PENDAFTARAN
|--------------------------------------------------------------------------
*/

export async function updatePendaftaran(
  id: number,
  payload: UpdatePendaftaranPayload,
): Promise<Pendaftaran> {
  const response =
    await apiRequest<MutationResponse>(
      `/api/pendaftaran/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    )

  return response.data
}

/*
|--------------------------------------------------------------------------
| SUBMIT PENDAFTARAN
|--------------------------------------------------------------------------
*/

export async function submitPendaftaran(
  id: number,
): Promise<Pendaftaran> {
  const response =
    await apiRequest<MutationResponse>(
      `/api/pendaftaran/${id}/submit`,
      {
        method: 'POST',
      },
    )

  return response.data
}

/*
|--------------------------------------------------------------------------
| SELEKSI ADMINISTRASI
|--------------------------------------------------------------------------
*/

export async function submitSeleksiAdministrasi(
  pendaftaranId: number,
  payload: SeleksiAdministrasiPayload,
): Promise<Pendaftaran> {
  const response =
    await apiRequest<MutationResponse>(
      `/api/pendaftaran/${pendaftaranId}/seleksi-administrasi`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    )

  return response.data
}

/*
|--------------------------------------------------------------------------
| SELEKSI WAWANCARA
|--------------------------------------------------------------------------
*/

export async function submitSeleksiWawancara(
  pendaftaranId: number,
  payload: SeleksiWawancaraPayload,
): Promise<Pendaftaran> {
  const response =
    await apiRequest<MutationResponse>(
      `/api/pendaftaran/${pendaftaranId}/seleksi-wawancara`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    )

  return response.data
}

/*
|--------------------------------------------------------------------------
| HASIL SELEKSI
|--------------------------------------------------------------------------
*/

export async function submitHasilSeleksi(
  pendaftaranId: number,
  payload: HasilSeleksiPayload,
): Promise<Pendaftaran> {
  const response =
    await apiRequest<MutationResponse>(
      `/api/pendaftaran/${pendaftaranId}/hasil-seleksi`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    )

  return response.data
}