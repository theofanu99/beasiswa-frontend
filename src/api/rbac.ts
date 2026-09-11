import { apiRequest } from './client'

export type InternalUserRole = {
  id: number
  name: string
  description?: string | null
}

export type InternalUser = {
  id: number
  username: string
  email: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
  roles?: InternalUserRole[]
}

export type Permission = {
  id: number
  name: string
  description?: string | null
}

export type Role = {
  id: number
  name: string
  description?: string | null
  permissions?: Permission[]
  createdAt?: string
  updatedAt?: string
}

type ListResponse<T> = {
  data: T[]
}

type UserResponse = {
  message: string
  data: InternalUser
}

type RoleResponse = {
  message: string
  data: Role
}

export type CreateUserPayload = {
  username: string
  email: string
  password: string
  roleId: number
  isActive?: boolean
}

export type UpdateUserPayload = {
  email?: string
  password?: string
  roleId?: number
  isActive?: boolean
}

export type CreateRolePayload = {
  name: string
  description?: string
}

export type UpdateRolePayload = {
  name?: string
  description?: string
}

export type UpdateRolePermissionsPayload = {
  permissionIds: number[]
}

/* =========================================================
   USERS
========================================================= */

export async function getUsers(): Promise<InternalUser[]> {
  const response = await apiRequest<ListResponse<InternalUser>>(
    '/api/users',
    {
      method: 'GET',
    },
  )

  return response.data
}

export async function createUser(
  payload: CreateUserPayload,
): Promise<InternalUser> {
  const response = await apiRequest<UserResponse>(
    '/api/users',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )

  return response.data
}

export async function updateUser(
  id: number,
  payload: UpdateUserPayload,
): Promise<InternalUser> {
  const response = await apiRequest<UserResponse>(
    `/api/users/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )

  return response.data
}

export async function deleteUser(id: number): Promise<void> {
  await apiRequest(`/api/users/${id}`, {
    method: 'DELETE',
  })
}

/* =========================================================
   ROLES
========================================================= */

export async function getRoles(): Promise<Role[]> {
  const response = await apiRequest<ListResponse<Role>>(
    '/api/roles',
    {
      method: 'GET',
    },
  )

  return response.data
}

export async function createRole(
  payload: CreateRolePayload,
): Promise<Role> {
  const response = await apiRequest<RoleResponse>(
    '/api/roles',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )

  return response.data
}

export async function updateRole(
  id: number,
  payload: UpdateRolePayload,
): Promise<Role> {
  const response = await apiRequest<RoleResponse>(
    `/api/roles/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )

  return response.data
}

export async function deleteRole(id: number): Promise<void> {
  await apiRequest(`/api/roles/${id}`, {
    method: 'DELETE',
  })
}

export async function updateRolePermissions(
  id: number,
  payload: UpdateRolePermissionsPayload,
): Promise<Role> {
  const response = await apiRequest<RoleResponse>(
    `/api/roles/${id}/permissions`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  )

  return response.data
}

/* =========================================================
   PERMISSIONS
========================================================= */

export async function getPermissions(): Promise<Permission[]> {
  const response = await apiRequest<ListResponse<Permission>>(
    '/api/permissions',
    {
      method: 'GET',
    },
  )

  return response.data
}