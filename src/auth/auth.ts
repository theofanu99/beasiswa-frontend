import { apiRequest } from '../api/client'

export type AuthUser = {
  id: number
  username: string
  email: string
  roles: string[]
  permissions: string[]
}

type LoginResponse = {
  accessToken: string
  user: AuthUser
}

export type RegisterApplicantPayload = {
  nik: string
  namaLengkap: string
  email: string
}

export type RegisterApplicantResponse = {
  message: string
  data: {
    id: number
    username: string
    email: string
  }
}

/**
 * Register applicant
 */
export async function registerApplicant(
  payload: RegisterApplicantPayload,
): Promise<RegisterApplicantResponse> {
  const result =
    await apiRequest<RegisterApplicantResponse>(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    )

  return result
}

/**
 * Login
 */
export async function login(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const result =
    await apiRequest<LoginResponse>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({
          username,
          password,
        }),
      },
    )

  localStorage.setItem(
    'accessToken',
    result.accessToken,
  )

  localStorage.setItem(
    'authUser',
    JSON.stringify(result.user),
  )

  return result
}

/**
 * Refresh access token
 *
 * Refresh token berada di HttpOnly cookie,
 * sehingga frontend tidak perlu membaca token tersebut.
 */
export async function refreshAccessToken(): Promise<string> {
  const result =
    await apiRequest<{
      accessToken: string
    }>(
      '/api/auth/refresh',
      {
        method: 'POST',
      },
    )

  localStorage.setItem(
    'accessToken',
    result.accessToken,
  )

  return result.accessToken
}

/**
 * Logout
 *
 * Backend akan revoke refresh token.
 * Frontend kemudian membersihkan session lokal.
 */
export async function logout(): Promise<void> {
  try {
    await apiRequest(
      '/api/auth/logout',
      {
        method: 'POST',
      },
    )
  } finally {
    localStorage.removeItem(
      'accessToken',
    )

    localStorage.removeItem(
      'authUser',
    )
  }
}

/**
 * Get access token
 */
export function getAccessToken():
  | string
  | null {
  return localStorage.getItem(
    'accessToken',
  )
}

/**
 * Get authenticated user
 */
export function getAuthUser():
  | AuthUser
  | null {
  const user =
    localStorage.getItem(
      'authUser',
    )

  if (!user) {
    return null
  }

  try {
    return JSON.parse(
      user,
    ) as AuthUser
  } catch {
    localStorage.removeItem(
      'authUser',
    )

    return null
  }
}

/**
 * Check whether user is logged in
 */
export function isAuthenticated(): boolean {
  return Boolean(
    getAccessToken() &&
      getAuthUser(),
  )
}

/**
 * Clear local authentication data.
 *
 * Dipakai jika access token sudah tidak valid
 * dan refresh token juga gagal.
 */
export function clearAuth(): void {
  localStorage.removeItem(
    'accessToken',
  )

  localStorage.removeItem(
    'authUser',
  )
}

