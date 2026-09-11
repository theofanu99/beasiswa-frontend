const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL belum diatur')
}

type ApiRequestOptions = RequestInit & {
  token?: string
  retry?: boolean
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/auth/refresh`,
      {
        method: 'POST',
        credentials: 'include',
      },
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    if (!data.accessToken) {
      return null
    }

    localStorage.setItem(
      'accessToken',
      data.accessToken,
    )

    return data.accessToken
  } catch {
    return null
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    token,
    retry = true,
    ...fetchOptions
  } = options

  const accessToken =
    token ??
    localStorage.getItem('accessToken')

  const headers = new Headers(
    fetchOptions.headers,
  )

  if (
    fetchOptions.body &&
    !(fetchOptions.body instanceof FormData)
  ) {
    headers.set(
      'Content-Type',
      'application/json',
    )
  }

  if (accessToken) {
    headers.set(
      'Authorization',
      `Bearer ${accessToken}`,
    )
  }

  let response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...fetchOptions,
      headers,
      credentials: 'include',
    },
  )

  const canRefresh =
    response.status === 401 &&
    retry &&
    path !== '/api/auth/refresh' &&
    path !== '/api/auth/login' &&
    path !== '/api/auth/logout'

  if (canRefresh) {
    const newAccessToken =
      await refreshAccessToken()

    if (newAccessToken) {
      headers.set(
        'Authorization',
        `Bearer ${newAccessToken}`,
      )

      response = await fetch(
        `${API_BASE_URL}${path}`,
        {
          ...fetchOptions,
          headers,
          credentials: 'include',
        },
      )
    }
  }

  let data: unknown = null

  const contentType =
    response.headers.get('content-type')

  if (
    contentType?.includes(
      'application/json',
    )
  ) {
    data = await response.json()
  }

  if (!response.ok) {
    let message =
      `Request gagal (${response.status})`

    if (
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof data.message === 'string'
    ) {
      message = data.message
    }

    throw new Error(message)
  }

  return data as T
}