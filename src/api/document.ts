import { apiRequest } from './client'

export type Dokumen = {
  id: number
  pendaftaranId: number
  namaFileAsli: string
  namaFileStorage: string
  storagePath: string
  mimeType: string
  ukuran: number
  statusScan: string
  createdAt: string
  updatedAt: string
}

type UploadDokumenResponse = {
  message: string
  data: Dokumen
}

type GetDokumenResponse = {
  message: string
  data: Dokumen[]
}

export async function uploadDokumen(
  pendaftaranId: number,
  file: File,
): Promise<Dokumen> {
  const formData = new FormData()

  formData.append('pendaftaranId', String(pendaftaranId))
  formData.append('file', file)

  const response = await apiRequest<UploadDokumenResponse>(
    '/api/dokumen/upload',
    {
      method: 'POST',
      body: formData,
    },
  )

  return response.data
}

export async function getDokumenByPendaftaran(
  pendaftaranId: number,
): Promise<Dokumen[]> {
  const response = await apiRequest<GetDokumenResponse>(
    `/api/dokumen/pendaftaran/${pendaftaranId}`,
    {
      method: 'GET',
    },
  )

  return response.data
}

export async function deleteDokumen(
  id: number,
): Promise<void> {
  await apiRequest(`/api/dokumen/${id}`, {
    method: 'DELETE',
  })
}

export async function getDokumenFile(
  id: number,
): Promise<Blob> {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL belum diatur')
  }

  const token = localStorage.getItem('accessToken')

  const response = await fetch(
    `${apiBaseUrl}/api/dokumen/${id}`,
    {
      method: 'GET',
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : undefined,
      credentials: 'include',
    },
  )

  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? 'Sesi login sudah berakhir. Silakan login kembali.'
        : `Gagal membuka dokumen (${response.status})`,
    )
  }

  return response.blob()
}
