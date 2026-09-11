import { apiRequest } from './client'

export type Persyaratan = {
  id: number
  beasiswaId: number
  nama: string
  deskripsi?: string | null
  wajib: boolean
}

export type Program = {
  id: number
  nama: string
  deskripsi?: string | null
  periode: string
  kuota: number
  status: string
  persyaratan?: Persyaratan[]
}

export type CreateProgramPayload = {
  nama: string
  deskripsi: string
  periode: string
  kuota: number
  status: string
}

export type PersyaratanPayload = {
  beasiswaId: number
  nama: string
  deskripsi?: string
  wajib: boolean
}

type GetProgramsResponse = {
  data: Program[]
}

type ProgramResponse = {
  message: string
  data: Program
}

type PersyaratanListResponse = {
  data: Persyaratan[]
}

type PersyaratanResponse = {
  message: string
  data: Persyaratan
}

export async function getActivePrograms(): Promise<Program[]> {
  const response = await apiRequest<GetProgramsResponse>(
    '/api/beasiswa/aktif',
    { method: 'GET' },
  )

  return response.data
}

export async function getPrograms(): Promise<Program[]> {
  const response = await apiRequest<GetProgramsResponse>(
    '/api/beasiswa',
    { method: 'GET' },
  )

  return response.data
}

export async function createProgram(
  payload: CreateProgramPayload,
): Promise<Program> {
  const response = await apiRequest<ProgramResponse>(
    '/api/beasiswa',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )

  return response.data
}

export async function updateProgram(
  id: number,
  payload: CreateProgramPayload,
): Promise<Program> {
  const response = await apiRequest<ProgramResponse>(
    `/api/beasiswa/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )

  return response.data
}

export async function deleteProgram(id: number): Promise<void> {
  await apiRequest(`/api/beasiswa/${id}`, {
    method: 'DELETE',
  })
}

export async function getPersyaratan(): Promise<Persyaratan[]> {
  const response = await apiRequest<PersyaratanListResponse>(
    '/api/persyaratan',
    { method: 'GET' },
  )

  return response.data
}

export async function createPersyaratan(
  payload: PersyaratanPayload,
): Promise<Persyaratan> {
  const response = await apiRequest<PersyaratanResponse>(
    '/api/persyaratan',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )

  return response.data
}

export async function updatePersyaratan(
  id: number,
  payload: PersyaratanPayload,
): Promise<Persyaratan> {
  const response = await apiRequest<PersyaratanResponse>(
    `/api/persyaratan/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )

  return response.data
}

export async function deletePersyaratan(
  id: number,
): Promise<void> {
  await apiRequest(`/api/persyaratan/${id}`, {
    method: 'DELETE',
  })
}
