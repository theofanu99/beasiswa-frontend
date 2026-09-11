import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createProgram, getPrograms, updateProgram } from '../../api/master'
import { getPendaftaran, type Pendaftaran } from '../../api/transaction'
import { logout } from '../../auth/auth'
import { apiRequest } from '../../api/client'
import {
  createRole,
  createUser,
  deleteRole,
  deleteUser,
  getPermissions,
  getRoles,
  getUsers,
  updateRole,
  updateRolePermissions,
  updateUser,
  type InternalUser,
  type Permission,
  type Role,
} from '../../api/rbac'
import * as XLSX from 'xlsx'

type MenuKey = 'dashboard' | 'hasil' | 'master' | 'setting'
type MasterTab = 'beasiswa' | 'syarat'
type SettingTab = 'user' | 'role' | 'menu'

type SystemMenu = {
  id: number
  name: string
  route: string | null
  icon: string | null
  parentId: number | null
  sortOrder: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

type MenuResponse = {
  data: SystemMenu[]
  role?: {
    id: number
    name: string
  }
}

type UserModalMode = 'add' | 'edit'
type RoleModalMode = 'add' | 'edit'

type ProgramStatus = 'Aktif' | 'Ditutup'

type MasterProgram = {
  id: number
  nama: string
  deskripsi: string
  periode: string
  kuota: number
  status: ProgramStatus
}

type Persyaratan = {
  id: number
  beasiswaId: number
  nama: string
  deskripsi: string
  wajib: boolean
  beasiswa?: {
    id: number
    nama: string
  } | null
}

type PersyaratanResponse = {
  message?: string
  data: Persyaratan[]
}

type PersyaratanMutationResponse = {
  message?: string
  data: Persyaratan
}

function adminStatusBadge(status?: string | null) {
  switch ((status ?? '').toUpperCase()) {
    case 'LULUS':
    case 'PASSED':
      return 'bg-success'
    case 'TIDAK_LULUS':
    case 'FAILED':
      return 'bg-danger'
    case 'REVISI':
    case 'REVISION':
      return 'bg-warning text-dark'
    case 'INTERVIEW':
      return 'bg-primary'
    case 'SUBMITTED':
      return 'bg-info text-dark'
    default:
      return 'bg-secondary'
  }
}

function AdminPage() {
  const navigate = useNavigate()

  const [activeMenu, setActiveMenu] = useState<MenuKey>('dashboard')
  const [masterTab, setMasterTab] = useState<MasterTab>('beasiswa')
  const [settingTab, setSettingTab] = useState<SettingTab>('user')

  const [programs, setPrograms] = useState<MasterProgram[]>([])
  const [registrations, setRegistrations] = useState<Pendaftaran[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showProgramModal, setShowProgramModal] = useState(false)
  const [editingProgram, setEditingProgram] = useState<MasterProgram | null>(null)
  const [saving, setSaving] = useState(false)

  const [nama, setNama] = useState('')
  const [deskripsi, setDeskripsi] = useState('')
  const [periode, setPeriode] = useState('')
  const [kuota, setKuota] = useState('')
  const [status, setStatus] = useState<ProgramStatus>('Aktif')

  const [persyaratan, setPersyaratan] = useState<Persyaratan[]>([])
  const [loadingPersyaratan, setLoadingPersyaratan] = useState(false)
  const [showPersyaratanModal, setShowPersyaratanModal] = useState(false)
  const [editingPersyaratan, setEditingPersyaratan] =
    useState<Persyaratan | null>(null)
  const [persyaratanNama, setPersyaratanNama] = useState('')
  const [persyaratanDeskripsi, setPersyaratanDeskripsi] = useState('')
  const [persyaratanBeasiswaId, setPersyaratanBeasiswaId] = useState('')
  const [persyaratanWajib, setPersyaratanWajib] = useState(true)

  const [users, setUsers] = useState<InternalUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [userModalMode, setUserModalMode] = useState<UserModalMode>('add')
  const [editingUser, setEditingUser] = useState<InternalUser | null>(null)
  const [userUsername, setUserUsername] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [userRoleId, setUserRoleId] = useState('')
  const [userIsActive, setUserIsActive] = useState(true)
  const [savingUser, setSavingUser] = useState(false)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [savingRole, setSavingRole] = useState(false)

  const [menus, setMenus] = useState<SystemMenu[]>([])
  const [loadingMenus, setLoadingMenus] = useState(false)
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [editingMenu, setEditingMenu] = useState<SystemMenu | null>(null)
  const [menuNameInput, setMenuNameInput] = useState('')
  const [menuRouteInput, setMenuRouteInput] = useState('')
  const [menuIconInput, setMenuIconInput] = useState('')
  const [menuParentIdInput, setMenuParentIdInput] = useState('')
  const [menuSortOrderInput, setMenuSortOrderInput] = useState('0')
  const [menuIsActive, setMenuIsActive] = useState(true)
  const [savingMenu, setSavingMenu] = useState(false)

const [selectedMenuIds, setSelectedMenuIds] = useState<number[]>([])
const [loadingRoleMenus, setLoadingRoleMenus] = useState(false)

  const [showRoleModal, setShowRoleModal] = useState(false)
  const [roleModalMode, setRoleModalMode] = useState<RoleModalMode>('add')
  const [editingRole, setEditingRole] = useState<Role | null>(null)

  const [roleNameInput, setRoleNameInput] = useState('')
  const [roleDescriptionInput, setRoleDescriptionInput] = useState('')
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([])

  async function loadPersyaratan() {
    try {
      setLoadingPersyaratan(true)

      const response = await apiRequest<PersyaratanResponse>(
        '/api/persyaratan',
        {
          method: 'GET',
        },
      )

      setPersyaratan(Array.isArray(response.data) ? response.data : [])
    } catch (err) {
      console.error('Gagal mengambil persyaratan:', err)
      alert(
        err instanceof Error
          ? err.message
          : 'Gagal mengambil data persyaratan.',
      )
    } finally {
      setLoadingPersyaratan(false)
    }
  }

  async function loadData() {
    try {
      setError('')
      setLoading(true)

      const [programData, registrationData] = await Promise.all([
        getPrograms(),
        getPendaftaran(),
      ])

      setPrograms(
        programData.map((program) => {
          const raw = program as typeof program & { kuota?: number }

          return {
            id: program.id,
            nama: program.nama,
            deskripsi: program.deskripsi ?? '',
            periode: program.periode ?? '',
            kuota: Number(raw.kuota ?? 0),
            status: program.status === 'AKTIF' ? 'Aktif' : 'Ditutup',
          }
        }),
      )

      setRegistrations(registrationData)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat data administrator.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    if (masterTab === 'syarat') {
      void loadPersyaratan()
    }
  }, [masterTab])

  useEffect(() => {
  if (settingTab === 'user') {
    void loadUsersAndRoles()
  }

  if (settingTab === 'role') {
    void loadRolesAndPermissions()
  }

  if (settingTab === 'menu') {
    void loadMenus()
  }
}, [settingTab])

  async function loadUsersAndRoles() {
    try {
      setLoadingUsers(true)
      const [userData, roleData] = await Promise.all([
        getUsers(),
        getRoles(),
      ])
      setUsers(userData)
      setRoles(roleData)
    } catch (err) {
      console.error('Gagal mengambil data user internal:', err)
      alert(
        err instanceof Error
          ? err.message
          : 'Gagal mengambil data user internal.',
      )
    } finally {
      setLoadingUsers(false)
    }
  }

async function loadRolesAndPermissions() {
  try {
    setLoadingRoles(true)

    const [roleData, permissionData, menuResponse] = await Promise.all([
      getRoles(),
      getPermissions(),
      apiRequest<MenuResponse>('/api/menus', {
        method: 'GET',
      }),
    ])

    setRoles(roleData)
    setPermissions(permissionData)
    setMenus(Array.isArray(menuResponse.data) ? menuResponse.data : [])
  } catch (err) {
    console.error('Gagal mengambil data role, permission, dan menu:', err)
    alert(
      err instanceof Error
        ? err.message
        : 'Gagal mengambil data role, permission, dan menu.',
    )
  } finally {
    setLoadingRoles(false)
  }
}

async function loadMenus() {
  try {
    setLoadingMenus(true)

    const response = await apiRequest<MenuResponse>(
      '/api/menus',
      {
        method: 'GET',
      },
    )

    setMenus(Array.isArray(response.data) ? response.data : [])
  } catch (err) {
    console.error('Gagal mengambil data menu:', err)

    alert(
      err instanceof Error
        ? err.message
        : 'Gagal mengambil data menu.',
    )
  } finally {
    setLoadingMenus(false)
  }
}

function resetMenuForm() {
  setEditingMenu(null)
  setMenuNameInput('')
  setMenuRouteInput('')
  setMenuIconInput('')
  setMenuParentIdInput('')
  setMenuSortOrderInput('0')
  setMenuIsActive(true)
}

function openAddMenuModal() {
  resetMenuForm()
  setShowMenuModal(true)
}

function openEditMenuModal(menu: SystemMenu) {
  setEditingMenu(menu)
  setMenuNameInput(menu.name)
  setMenuRouteInput(menu.route ?? '')
  setMenuIconInput(menu.icon ?? '')
  setMenuParentIdInput(
    menu.parentId !== null ? String(menu.parentId) : '',
  )
  setMenuSortOrderInput(String(menu.sortOrder))
  setMenuIsActive(menu.isActive)
  setShowMenuModal(true)
}

function closeMenuModal() {
  if (savingMenu) return

  setShowMenuModal(false)
  resetMenuForm()
}

async function handleSaveMenu() {
  const name = menuNameInput.trim()

  if (!name) {
    alert('Nama menu wajib diisi.')
    return
  }

  const sortOrder = Number(menuSortOrderInput)

  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    alert('Urutan menu harus berupa angka bulat >= 0.')
    return
  }

  let parentId: number | null = null

  if (menuParentIdInput) {
    parentId = Number(menuParentIdInput)

    if (!Number.isInteger(parentId) || parentId <= 0) {
      alert('Parent menu tidak valid.')
      return
    }

    if (editingMenu && parentId === editingMenu.id) {
      alert('Menu tidak boleh menjadi parent dirinya sendiri.')
      return
    }
  }

  const payload = {
    name,
    route: menuRouteInput.trim() || null,
    icon: menuIconInput.trim() || null,
    parentId,
    sortOrder,
    isActive: menuIsActive,
  }

  try {
    setSavingMenu(true)

    if (editingMenu) {
      await apiRequest(`/api/menus/${editingMenu.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })

      alert('Menu berhasil diperbarui.')
    } else {
      await apiRequest('/api/menus', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      alert('Menu berhasil ditambahkan.')
    }

    closeMenuModal()
    await loadMenus()
  } catch (err) {
    console.error('Gagal menyimpan menu:', err)

    alert(
      err instanceof Error
        ? err.message
        : 'Gagal menyimpan menu.',
    )
  } finally {
    setSavingMenu(false)
  }
}

async function handleDeleteMenu(menu: SystemMenu) {
  if (
    !window.confirm(
      `Hapus menu "${menu.name}"? Tindakan ini tidak dapat dibatalkan.`,
    )
  ) {
    return
  }

  try {
    setSavingMenu(true)

    await apiRequest(`/api/menus/${menu.id}`, {
      method: 'DELETE',
    })

    alert('Menu berhasil dihapus.')

    await loadMenus()
  } catch (err) {
    console.error('Gagal menghapus menu:', err)

    alert(
      err instanceof Error
        ? err.message
        : 'Gagal menghapus menu.',
    )
  } finally {
    setSavingMenu(false)
  }
}
async function loadRoleMenus(roleId: number) {
  try {
    setLoadingRoleMenus(true)

    const response = await apiRequest<MenuResponse>(
      `/api/menus/role/${roleId}`,
      {
        method: 'GET',
      },
    )

    setSelectedMenuIds(
      Array.isArray(response.data)
        ? response.data.map((menu) => menu.id)
        : [],
    )
  } catch (err) {
    console.error('Gagal mengambil akses menu role:', err)

    setSelectedMenuIds([])

    alert(
      err instanceof Error
        ? err.message
        : 'Gagal mengambil akses menu role.',
    )
  } finally {
    setLoadingRoleMenus(false)
  }
}

function toggleMenu(menuId: number) {
  setSelectedMenuIds((current) =>
    current.includes(menuId)
      ? current.filter((id) => id !== menuId)
      : [...current, menuId],
  )
}

function openAddRoleModal() {
  setRoleModalMode('add')
  setEditingRole(null)
  setRoleNameInput('')
  setRoleDescriptionInput('')
  setSelectedPermissionIds([])
  setSelectedMenuIds([])
  setShowRoleModal(true)
}

async function openEditRoleModal(role: Role) {
  setRoleModalMode('edit')
  setEditingRole(role)
  setRoleNameInput(role.name)
  setRoleDescriptionInput(role.description ?? '')
  setSelectedPermissionIds(
    role.permissions?.map((permission) => permission.id) ?? [],
  )
  setSelectedMenuIds([])
  setShowRoleModal(true)

  await loadRoleMenus(role.id)
}

function closeRoleModal() {
  setShowRoleModal(false)
  setEditingRole(null)
  setRoleNameInput('')
  setRoleDescriptionInput('')
  setSelectedPermissionIds([])
  setSelectedMenuIds([])
}

function togglePermission(permissionId: number) {
  setSelectedPermissionIds((current) =>
    current.includes(permissionId)
      ? current.filter((id) => id !== permissionId)
      : [...current, permissionId],
  )
}

async function handleSaveRole() {
  const trimmedName = roleNameInput.trim()

  if (!trimmedName) {
    alert('Nama role wajib diisi.')
    return
  }

  try {
    setSavingRole(true)

    let savedRole: Role

    if (roleModalMode === 'add') {
      savedRole = await createRole({
        name: trimmedName,
        description: roleDescriptionInput.trim(),
      })
    } else {
      if (!editingRole) {
        alert('Role yang akan diperbarui tidak ditemukan.')
        return
      }

      savedRole = await updateRole(editingRole.id, {
        name: trimmedName,
        description: roleDescriptionInput.trim(),
      })
    }

await updateRolePermissions(
  savedRole.id,
  {
    permissionIds: selectedPermissionIds,
  },
)

    await apiRequest(`/api/menus/role/${savedRole.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        menuIds: selectedMenuIds,
      }),
    })

    closeRoleModal()

    await loadRolesAndPermissions()

    alert(
      roleModalMode === 'add'
        ? 'Role berhasil dibuat.'
        : 'Role berhasil diperbarui.',
    )
  } catch (err) {
    console.error('Gagal menyimpan role:', err)

    alert(
      err instanceof Error
        ? err.message
        : 'Gagal menyimpan role.',
    )
  } finally {
    setSavingRole(false)
  }
}

async function handleDeleteRole(role: Role) {
  if (
    !window.confirm(
      `Hapus role "${role.name}"? Tindakan ini tidak dapat dibatalkan.`,
    )
  ) {
    return
  }

  try {
    setSavingRole(true)

    await deleteRole(role.id)

    await loadRolesAndPermissions()

    alert('Role berhasil dihapus.')
  } catch (err) {
    console.error('Gagal menghapus role:', err)

    alert(
      err instanceof Error
        ? err.message
        : 'Gagal menghapus role.',
    )
  } finally {
    setSavingRole(false)
  }
}

  function roleName(user: InternalUser) {
    if (!user.roles?.length) return 'Tanpa Role'
    return user.roles.map((role) => role.name).join(', ')
  }

  function openAddUserModal() {
    setUserModalMode('add')
    setEditingUser(null)
    setUserUsername('')
    setUserEmail('')
    setUserPassword('')
    setUserRoleId(roles[0] ? String(roles[0].id) : '')
    setUserIsActive(true)
    setShowUserModal(true)
  }

  function openEditUserModal(user: InternalUser) {
    setUserModalMode('edit')
    setEditingUser(user)
    setUserUsername(user.username)
    setUserEmail(user.email)
    setUserPassword('')
    setUserRoleId(user.roles?.[0] ? String(user.roles[0].id) : '')
    setUserIsActive(user.isActive)
    setShowUserModal(true)
  }

  function closeUserModal() {
    setShowUserModal(false)
    setEditingUser(null)
    setUserUsername('')
    setUserEmail('')
    setUserPassword('')
    setUserRoleId('')
    setUserIsActive(true)
  }

  async function handleSaveUser() {
    if (!userEmail.trim() || !userRoleId) {
      alert('Email dan role wajib diisi.')
      return
    }

    if (userModalMode === 'add') {
      if (!userUsername.trim() || !userPassword) {
        alert('Username dan password wajib diisi.')
        return
      }
      if (userPassword.length < 8) {
        alert('Password minimal 8 karakter.')
        return
      }
    }

    try {
      setSavingUser(true)
      const roleId = Number(userRoleId)

      if (userModalMode === 'add') {
        const created = await createUser({
          username: userUsername.trim(),
          email: userEmail.trim(),
          password: userPassword,
          roleId,
          isActive: userIsActive,
        })
        setUsers((current) => [created, ...current])
        closeUserModal()
        alert('User internal berhasil dibuat.')
        return
      }

      if (!editingUser) return

      const updated = await updateUser(editingUser.id, {
        email: userEmail.trim(),
        ...(userPassword ? { password: userPassword } : {}),
        roleId,
        isActive: userIsActive,
      })

      setUsers((current) =>
        current.map((user) =>
          user.id === updated.id ? updated : user,
        ),
      )
      closeUserModal()
      alert('User internal berhasil diperbarui.')
    } catch (err) {
      console.error('Gagal menyimpan user:', err)
      alert(
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan user.',
      )
    } finally {
      setSavingUser(false)
    }
  }

  async function handleDeleteUser(user: InternalUser) {
    if (!window.confirm(`Hapus user ${user.username}?`)) return

    try {
      setSavingUser(true)
      await deleteUser(user.id)
      setUsers((current) =>
        current.filter((item) => item.id !== user.id),
      )
      alert('User internal berhasil dihapus.')
    } catch (err) {
      console.error('Gagal menghapus user:', err)
      alert(
        err instanceof Error
          ? err.message
          : 'Gagal menghapus user.',
      )
    } finally {
      setSavingUser(false)
    }
  }

  const stats = useMemo(() => {
    return {
      total: registrations.length,
      adminProcess: registrations.filter(
        (item) =>
          item.status === 'SUBMITTED' ||
          item.status === 'REVISION',
      ).length,
      adminPassed: registrations.filter(
        (item) => item.seleksiAdministrasi?.status === 'LULUS',
      ).length,
      adminFailed: registrations.filter(
        (item) => item.seleksiAdministrasi?.status === 'TIDAK_LULUS',
      ).length,
      interviewProcess: registrations.filter(
        (item) => item.status === 'INTERVIEW',
      ).length,
      interviewPassed: registrations.filter(
        (item) => item.hasilSeleksi?.hasil === 'LULUS',
      ).length,
      interviewFailed: registrations.filter(
        (item) => item.hasilSeleksi?.hasil === 'TIDAK_LULUS',
      ).length,
    }
  }, [registrations])

  const programMap = useMemo(() => {
    return new Map(programs.map((program) => [program.id, program.nama]))
  }, [programs])

  const finalResults = useMemo(() => {
    return [...registrations]
      .filter(
        (item) =>
          item.seleksiAdministrasi ||
          item.seleksiWawancara ||
          item.hasilSeleksi,
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      )
  }, [registrations])

  function resetPersyaratanForm() {
    setEditingPersyaratan(null)
    setPersyaratanNama('')
    setPersyaratanDeskripsi('')
    setPersyaratanBeasiswaId(programs[0] ? String(programs[0].id) : '')
    setPersyaratanWajib(true)
  }

  function openAddPersyaratan() {
    resetPersyaratanForm()
    setShowPersyaratanModal(true)
  }

  function openEditPersyaratan(item: Persyaratan) {
    setEditingPersyaratan(item)
    setPersyaratanNama(item.nama)
    setPersyaratanDeskripsi(item.deskripsi ?? '')
    setPersyaratanBeasiswaId(String(item.beasiswaId))
    setPersyaratanWajib(Boolean(item.wajib))
    setShowPersyaratanModal(true)
  }

  function closePersyaratanModal() {
    if (saving) return
    setShowPersyaratanModal(false)
    resetPersyaratanForm()
  }

  async function handleSavePersyaratan() {
    if (!persyaratanNama.trim()) {
      alert('Nama dokumen wajib diisi.')
      return
    }

    if (!persyaratanBeasiswaId) {
      alert('Program beasiswa wajib dipilih.')
      return
    }

    const payload = {
      beasiswaId: Number(persyaratanBeasiswaId),
      nama: persyaratanNama.trim(),
      deskripsi: persyaratanDeskripsi.trim(),
      wajib: persyaratanWajib,
    }

    try {
      setSaving(true)

      if (editingPersyaratan) {
        await apiRequest<PersyaratanMutationResponse>(
          `/api/persyaratan/${editingPersyaratan.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify(payload),
          },
        )
        alert('Persyaratan berhasil diperbarui.')
      } else {
        await apiRequest<PersyaratanMutationResponse>(
          '/api/persyaratan',
          {
            method: 'POST',
            body: JSON.stringify(payload),
          },
        )
        alert('Persyaratan berhasil ditambahkan.')
      }

      setShowPersyaratanModal(false)
      resetPersyaratanForm()
      await loadPersyaratan()
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan persyaratan.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDeletePersyaratan(item: Persyaratan) {
    if (
      !window.confirm(
        `Hapus persyaratan "${item.nama}"? Tindakan ini tidak dapat dibatalkan.`,
      )
    ) {
      return
    }

    try {
      setSaving(true)

      await apiRequest(`/api/persyaratan/${item.id}`, {
        method: 'DELETE',
      })

      alert('Persyaratan berhasil dihapus.')
      await loadPersyaratan()
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : 'Gagal menghapus persyaratan.',
      )
    } finally {
      setSaving(false)
    }
  }

  function resetProgramForm() {
    setNama('')
    setDeskripsi('')
    setPeriode('')
    setKuota('')
    setStatus('Aktif')
    setEditingProgram(null)
  }

  function openAddProgram() {
    resetProgramForm()
    setShowProgramModal(true)
  }

  function openEditProgram(program: MasterProgram) {
    setEditingProgram(program)
    setNama(program.nama)
    setDeskripsi(program.deskripsi)
    setPeriode(program.periode)
    setKuota(String(program.kuota))
    setStatus(program.status)
    setShowProgramModal(true)
  }

  function closeProgramModal() {
    if (saving) return
    setShowProgramModal(false)
    resetProgramForm()
  }

  async function handleSaveProgram() {
    if (!nama.trim() || !kuota.trim()) {
      alert('Nama beasiswa dan kuota wajib diisi.')
      return
    }

    const parsedKuota = Number(kuota)

    if (!Number.isInteger(parsedKuota) || parsedKuota <= 0) {
      alert('Kuota harus berupa angka lebih dari 0.')
      return
    }

    try {
      setSaving(true)

      const payload = {
        nama: nama.trim(),
        deskripsi: deskripsi.trim(),
        periode: periode.trim(),
        kuota: parsedKuota,
        status: status === 'Aktif' ? 'AKTIF' : 'DITUTUP',
      }

      if (editingProgram) {
        await updateProgram(editingProgram.id, payload)
        alert('Program berhasil diperbarui.')
      } else {
        await createProgram(payload)
        alert('Program berhasil ditambahkan.')
      }

      closeProgramModal()
      await loadData()
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan program beasiswa.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function toggleProgram(program: MasterProgram) {
    const nextStatus: ProgramStatus =
      program.status === 'Aktif' ? 'Ditutup' : 'Aktif'

    if (
      !window.confirm(
        `${nextStatus === 'Aktif' ? 'Aktifkan' : 'Tutup'} program "${program.nama}"?`,
      )
    ) {
      return
    }

    try {
      setSaving(true)

      await updateProgram(program.id, {
        nama: program.nama,
        deskripsi: program.deskripsi,
        periode: program.periode,
        kuota: program.kuota,
        status: nextStatus === 'Aktif' ? 'AKTIF' : 'DITUTUP',
      })

      await loadData()
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : 'Gagal mengubah status program.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    try {
      await logout()
    } finally {
      navigate('/internal/login', { replace: true })
    }
  }

  function selectMenu(menu: MenuKey) {
    setActiveMenu(menu)
  }

  return (
    <>
      <style>{`
        .admin-page {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f8f9fa;
          min-height: 100vh;
        }

        .admin-sidebar {
          width: 260px;
          min-height: 100vh;
          background: linear-gradient(180deg, #0d6efd 0%, #0a58ca 100%);
          color: white;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 100;
        }

        .admin-sidebar .nav-link {
          color: rgba(255, 255, 255, 0.85);
          border-radius: 8px;
          margin-bottom: 4px;
          padding: 10px 14px;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
        }

        .admin-sidebar .nav-link:hover,
        .admin-sidebar .nav-link.active {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.2);
        }

        .admin-main-content {
          margin-left: 260px;
          padding: 25px;
          min-height: 100vh;
        }

        .admin-card-stat {
          border: none;
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          transition: transform 0.2s;
        }

        .admin-card-stat:hover {
          transform: translateY(-3px);
        }

        .admin-topbar {
          border-bottom: 1px solid #dee2e6;
        }

        @media (max-width: 768px) {
          .admin-sidebar {
            width: 100%;
            min-height: auto;
            position: relative;
          }

          .admin-main-content {
            margin-left: 0;
          }
        }
      `}</style>

      <div className="admin-page">
        <aside className="admin-sidebar d-flex flex-column p-3">
          <div className="d-flex align-items-center mb-3 px-2 pt-2">
            <i className="bi bi-gear-wide-connected fs-2 me-2" />
            <div>
              <h6 className="fw-bold mb-0">ADMINISTRATOR</h6>
              <small className="text-white-50">Portal Beasiswa</small>
            </div>
          </div>

          <hr className="text-white-50 mt-0" />

          <ul className="nav nav-pills flex-column mb-auto">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link w-100 text-start ${
                  activeMenu === 'dashboard' ? 'active' : ''
                }`}
                onClick={() => selectMenu('dashboard')}
              >
                <i className="bi bi-speedometer2 me-2" />
                Dashboard
              </button>
            </li>

            <li className="nav-item">
              <button
                type="button"
                className={`nav-link w-100 text-start ${
                  activeMenu === 'hasil' ? 'active' : ''
                }`}
                onClick={() => selectMenu('hasil')}
              >
                <i className="bi bi-file-earmark-spreadsheet me-2" />
                Hasil Seleksi
              </button>
            </li>

            <li className="nav-item">
              <button
                type="button"
                className={`nav-link w-100 text-start ${
                  activeMenu === 'master' ? 'active' : ''
                }`}
                onClick={() => selectMenu('master')}
              >
                <i className="bi bi-database me-2" />
                Data Master
              </button>
            </li>

            <li className="nav-item">
              <button
                type="button"
                className={`nav-link w-100 text-start ${
                  activeMenu === 'setting' ? 'active' : ''
                }`}
                onClick={() => selectMenu('setting')}
              >
                <i className="bi bi-sliders me-2" />
                Setting System
              </button>
            </li>
          </ul>

          <hr className="text-white-50" />

          <div className="px-2">
            <button
              type="button"
              className="nav-link text-white bg-danger bg-opacity-75 w-100 text-start"
              onClick={() => void handleLogout()}
            >
              <i className="bi bi-box-arrow-right me-2" />
              Logout
            </button>
          </div>
        </aside>

        <main className="admin-main-content">
          <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom bg-white p-3 rounded shadow-sm admin-topbar">
            <div>
              <h4 className="fw-bold mb-0">Panel Administrator</h4>
              <small className="text-muted">
                Manajemen Sistem Pendaftaran &amp; Seleksi Beasiswa Pelatihan
              </small>
            </div>

            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-primary-subtle text-primary border border-primary px-3 py-2 fs-6">
                <i className="bi bi-person-fill-gear me-1" />
                Admin: Theofanu
              </span>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-triangle-fill" />
              {error}
            </div>
          )}

          {activeMenu === 'dashboard' && (
            <div>
              <h5 className="fw-bold mb-3">
                <i className="bi bi-bar-chart-line me-2 text-primary" />
                Ringkasan Statistik Pendaftaran
              </h5>

              <div className="row g-3 mb-4">
                <div className="col-md-3">
                  <div className="card admin-card-stat bg-primary text-white p-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <small className="text-white-50">
                          Total Calon Peserta
                        </small>
                        <h2 className="fw-bold mb-0">
                          {loading ? '—' : stats.total}
                        </h2>
                      </div>
                      <i className="bi bi-people-fill fs-1 opacity-50" />
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="card admin-card-stat bg-info text-white p-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <small className="text-white-50">
                          Proses Administrasi
                        </small>
                        <h2 className="fw-bold mb-0">
                          {loading ? '—' : stats.adminProcess}
                        </h2>
                      </div>
                      <i className="bi bi-hourglass-split fs-1 opacity-50" />
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="card admin-card-stat bg-success text-white p-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <small className="text-white-50">
                          Lulus Administrasi
                        </small>
                        <h2 className="fw-bold mb-0">
                          {loading ? '—' : stats.adminPassed}
                        </h2>
                      </div>
                      <i className="bi bi-check-circle-fill fs-1 opacity-50" />
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="card admin-card-stat bg-danger text-white p-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <small className="text-white-50">
                          Tidak Lulus Administrasi
                        </small>
                        <h2 className="fw-bold mb-0">
                          {loading ? '—' : stats.adminFailed}
                        </h2>
                      </div>
                      <i className="bi bi-x-circle-fill fs-1 opacity-50" />
                    </div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="card admin-card-stat bg-warning text-dark p-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <small className="text-dark-50">
                          Proses Wawancara
                        </small>
                        <h2 className="fw-bold mb-0">
                          {loading ? '—' : stats.interviewProcess}
                        </h2>
                      </div>
                      <i className="bi bi-chat-dots-fill fs-1 opacity-50" />
                    </div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="card admin-card-stat bg-success text-white p-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <small className="text-white-50">
                          Lulus Wawancara
                        </small>
                        <h2 className="fw-bold mb-0">
                          {loading ? '—' : stats.interviewPassed}
                        </h2>
                      </div>
                      <i className="bi bi-trophy-fill fs-1 opacity-50" />
                    </div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="card admin-card-stat bg-secondary text-white p-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <small className="text-white-50">
                          Tidak Lulus Wawancara
                        </small>
                        <h2 className="fw-bold mb-0">
                          {loading ? '—' : stats.interviewFailed}
                        </h2>
                      </div>
                      <i className="bi bi-person-x-fill fs-1 opacity-50" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeMenu === 'hasil' && (
            <div className="tab-pane fade show active">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                  <h5 className="fw-bold mb-0">
                    <i className="bi bi-trophy me-2 text-primary" />
                    Hasil Kelulusan Peserta (Wawancara &amp; Final)
                  </h5>

                  <button
                    type="button"
                    className="btn btn-success fw-bold"
                    onClick={() => {
                      if (finalResults.length === 0) {
                        alert('Belum ada data hasil seleksi untuk diekspor.')
                        return
                      }

                      const rows = finalResults.map((item, index) => ({
                        No: index + 1,
                        'NIK Peserta': item.nik || '-',
                        'Nama Peserta': item.namaLengkap || '-',
                        'Program Pelatihan':
                          programMap.get(item.beasiswaId) || '-',
                        'Status Administrasi':
                          item.seleksiAdministrasi?.status || 'MENUNGGU',
                        'Nilai Wawancara':
                          typeof item.seleksiWawancara?.score === 'number'
                            ? item.seleksiWawancara.score
                            : '',
                        'Status Wawancara':
                          item.seleksiWawancara?.status === 'SELESAI'
                            ? item.hasilSeleksi?.hasil === 'LULUS'
                              ? 'LULUS'
                              : item.hasilSeleksi?.hasil === 'TIDAK_LULUS'
                                ? 'TIDAK LULUS'
                                : 'SELESAI'
                            : 'BELUM DINILAI',
                        'Status Final':
                          item.hasilSeleksi?.hasil === 'LULUS'
                            ? 'DITERIMA'
                            : item.hasilSeleksi?.hasil === 'TIDAK_LULUS'
                              ? 'TIDAK LULUS'
                              : 'BELUM DITETAPKAN',
                      }))

                      const worksheet = XLSX.utils.json_to_sheet(rows)
                      worksheet['!cols'] = [
                        { wch: 6 },
                        { wch: 22 },
                        { wch: 28 },
                        { wch: 32 },
                        { wch: 22 },
                        { wch: 18 },
                        { wch: 22 },
                        { wch: 22 },
                      ]

                      const workbook = XLSX.utils.book_new()
                      XLSX.utils.book_append_sheet(
                        workbook,
                        worksheet,
                        'Hasil Seleksi',
                      )

                      XLSX.writeFile(
                        workbook,
                        `hasil-seleksi-${new Date()
                          .toISOString()
                          .slice(0, 10)}.xlsx`,
                      )
                    }}
                  >
                    <i className="bi bi-file-earmark-excel me-1" />
                    Export Excel
                  </button>
                </div>

                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>No</th>
                          <th>NIK &amp; Nama Peserta</th>
                          <th>Program Pelatihan</th>
                          <th>Status Administrasi</th>
                          <th>Nilai Wawancara</th>
                          <th>Status Wawancara</th>
                          <th>Status Final</th>
                        </tr>
                      </thead>

                      <tbody>
                        {finalResults.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center text-muted py-5">
                              Belum ada hasil seleksi.
                            </td>
                          </tr>
                        ) : (
                          finalResults.map((item, index) => {
                            const interviewScore =
                              item.seleksiWawancara?.score

                            return (
                              <tr key={item.id}>
                                <td>{index + 1}</td>
                                <td>
                                  <strong>
                                    {item.namaLengkap || 'Belum diisi'}
                                  </strong>
                                  <br />
                                  <small className="text-muted">
                                    NIK: {item.nik || '-'}
                                  </small>
                                </td>
                                <td>
                                  {programMap.get(item.beasiswaId) || '-'}
                                </td>
                                <td>
                                  <span
                                    className={`badge ${adminStatusBadge(
                                      item.seleksiAdministrasi?.status,
                                    )}`}
                                  >
                                    {item.seleksiAdministrasi?.status === 'LULUS'
                                      ? 'Lolos'
                                      : item.seleksiAdministrasi?.status ||
                                        'Menunggu'}
                                  </span>
                                </td>
                                <td>
                                  <strong>
                                    {typeof interviewScore === 'number'
                                      ? interviewScore.toFixed(2)
                                      : '-'}
                                  </strong>
                                </td>
                                <td>
                                  <span
                                    className={`badge ${adminStatusBadge(
                                      item.seleksiWawancara?.status,
                                    )}`}
                                  >
                                    {item.seleksiWawancara?.status === 'SELESAI'
                                      ? item.hasilSeleksi?.hasil === 'LULUS'
                                        ? 'Lulus Wawancara'
                                        : item.hasilSeleksi?.hasil ===
                                            'TIDAK_LULUS'
                                          ? 'Tidak Lulus'
                                          : 'Selesai'
                                      : 'Belum Dinilai'}
                                  </span>
                                </td>
                                <td>
                                  <span
                                    className={`badge ${adminStatusBadge(
                                      item.hasilSeleksi?.hasil,
                                    )}`}
                                  >
                                    {item.hasilSeleksi?.hasil ? (
                                      <>
                                        <i className="bi bi-award me-1" />
                                        {item.hasilSeleksi.hasil === 'LULUS'
                                          ? 'DITERIMA'
                                          : 'TIDAK LULUS'}
                                      </>
                                    ) : (
                                      'BELUM DITETAPKAN'
                                    )}
                                  </span>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeMenu === 'master' && (
            <div>
              <ul className="nav nav-tabs mb-3">
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${
                      masterTab === 'beasiswa' ? 'active' : ''
                    } fw-bold`}
                    onClick={() => setMasterTab('beasiswa')}
                  >
                    CRUD Beasiswa Pelatihan
                  </button>
                </li>

                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${
                      masterTab === 'syarat' ? 'active' : ''
                    } fw-bold`}
                    onClick={() => setMasterTab('syarat')}
                  >
                    CRUD Persyaratan
                  </button>
                </li>
              </ul>

              {masterTab === 'beasiswa' && (
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                    <h6 className="fw-bold mb-0">
                      Master Data Beasiswa Pelatihan
                    </h6>

                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={openAddProgram}
                    >
                      <i className="bi bi-plus-lg me-1" />
                      Tambah Beasiswa
                    </button>
                  </div>

                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Nama Beasiswa Pelatihan</th>
                            <th>Kuota</th>
                            <th>Metode</th>
                            <th>Status</th>
                            <th className="text-center">Aksi</th>
                          </tr>
                        </thead>

                        <tbody>
                          {programs.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center text-muted py-5">
                                {loading
                                  ? 'Memuat data...'
                                  : 'Belum ada program beasiswa.'}
                              </td>
                            </tr>
                          ) : (
                            programs.map((program) => (
                              <tr key={program.id}>
                                <td>
                                  <strong>{program.nama}</strong>
                                </td>
                                <td>{program.kuota} Peserta</td>
                                <td>Daring (Online)</td>
                                <td>
                                  <span
                                    className={`badge ${
                                      program.status === 'Aktif'
                                        ? 'bg-success'
                                        : 'bg-secondary'
                                    }`}
                                  >
                                    {program.status}
                                  </span>
                                </td>
                                <td className="text-center">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-warning me-1"
                                    onClick={() => openEditProgram(program)}
                                    disabled={saving}
                                  >
                                    <i className="bi bi-pencil" />
                                  </button>

                                  <button
                                    type="button"
                                    className="btn btn-sm btn-danger"
                                    onClick={() => void toggleProgram(program)}
                                    disabled={saving}
                                    title={
                                      program.status === 'Aktif'
                                        ? 'Tutup program'
                                        : 'Aktifkan program'
                                    }
                                  >
                                    <i
                                      className={
                                        program.status === 'Aktif'
                                          ? 'bi bi-toggle-off'
                                          : 'bi bi-toggle-on'
                                      }
                                    />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {masterTab === 'syarat' && (
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="fw-bold mb-1">
                        Master Data Persyaratan Dokumen
                      </h6>
                      <div className="small text-muted">
                        Persyaratan tersimpan di Master Service dan digunakan
                        sebagai acuan dokumen pendaftaran.
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={openAddPersyaratan}
                      disabled={loadingPersyaratan || saving || programs.length === 0}
                    >
                      <i className="bi bi-plus-lg me-1" />
                      Tambah Persyaratan
                    </button>
                  </div>

                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Nama Dokumen</th>
                            <th>Program Beasiswa</th>
                            <th>Format Allowed</th>
                            <th>Max Size</th>
                            <th>Mandatory</th>
                            <th className="text-center">Aksi</th>
                          </tr>
                        </thead>

                        <tbody>
                          {loadingPersyaratan ? (
                            <tr>
                              <td colSpan={6} className="text-center text-muted py-5">
                                <span className="spinner-border spinner-border-sm me-2" />
                                Memuat persyaratan...
                              </td>
                            </tr>
                          ) : persyaratan.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center text-muted py-5">
                                Belum ada persyaratan dokumen.
                              </td>
                            </tr>
                          ) : (
                            persyaratan.map((item) => (
                              <tr key={item.id}>
                                <td>
                                  <strong>{item.nama}</strong>
                                  {item.deskripsi && (
                                    <div className="small text-muted">
                                      {item.deskripsi}
                                    </div>
                                  )}
                                </td>
                                <td>
                                  {item.beasiswa?.nama ||
                                    programMap.get(item.beasiswaId) ||
                                    `Program #${item.beasiswaId}`}
                                </td>
                                <td>PDF / JPG / PNG</td>
                                <td>2 MB</td>
                                <td>
                                  {item.wajib ? (
                                    <span className="badge bg-danger">Wajib</span>
                                  ) : (
                                    <span className="badge bg-secondary">
                                      Opsional
                                    </span>
                                  )}
                                </td>
                                <td className="text-center">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-warning me-1"
                                    onClick={() => openEditPersyaratan(item)}
                                    disabled={saving}
                                    title="Edit persyaratan"
                                  >
                                    <i className="bi bi-pencil" />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-danger"
                                    onClick={() =>
                                      void handleDeletePersyaratan(item)
                                    }
                                    disabled={saving}
                                    title="Hapus persyaratan"
                                  >
                                    <i className="bi bi-trash" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeMenu === 'setting' && (
            <div>
              <ul className="nav nav-tabs mb-3">
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${
                      settingTab === 'user' ? 'active' : ''
                    } fw-bold`}
                    onClick={() => setSettingTab('user')}
                  >
                    CRUD Users Internal
                  </button>
                </li>

                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${
                      settingTab === 'role' ? 'active' : ''
                    } fw-bold`}
                    onClick={() => setSettingTab('role')}
                  >
                    CRUD Role &amp; Hak Akses
                  </button>
                </li>

                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${
                      settingTab === 'menu' ? 'active' : ''
                    } fw-bold`}
                    onClick={() => setSettingTab('menu')}
                  >
                    CRUD Menu System
                  </button>
                </li>
              </ul>

              {settingTab === 'user' && (
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                    <h6 className="fw-bold mb-0">
                      Manajemen Users Internal
                    </h6>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={openAddUserModal}
                      disabled={loadingUsers || roles.length === 0}
                    >
                      <i className="bi bi-person-plus me-1" />
                      Tambah User Internal
                    </button>
                  </div>

                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Nama User</th>
                            <th>Username / Email</th>
                            <th>Role System</th>
                            <th>Status</th>
                            <th className="text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loadingUsers ? (
                            <tr>
                              <td colSpan={5} className="text-center py-5">
                                <span className="spinner-border spinner-border-sm me-2" />
                                Memuat users internal...
                              </td>
                            </tr>
                          ) : users.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center text-muted py-5">
                                Belum ada user internal.
                              </td>
                            </tr>
                          ) : (
                            users.map((user) => (
                              <tr key={user.id}>
                                <td>
                                  <strong>{user.username}</strong>
                                </td>
                                <td>
                                  <div>{user.username}</div>
                                  <div className="small text-muted">{user.email}</div>
                                </td>
                                <td>
                                  <span className="badge bg-primary">
                                    {roleName(user)}
                                  </span>
                                </td>
                                <td>
                                  {user.isActive ? (
                                    <span className="badge bg-success">Active</span>
                                  ) : (
                                    <span className="badge bg-secondary">Inactive</span>
                                  )}
                                </td>
                                <td className="text-center">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-warning me-1"
                                    onClick={() => openEditUserModal(user)}
                                    disabled={savingUser}
                                    title="Edit user"
                                  >
                                    <i className="bi bi-pencil" />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-danger"
                                    onClick={() => void handleDeleteUser(user)}
                                    disabled={savingUser}
                                    title="Hapus user"
                                  >
                                    <i className="bi bi-trash" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              {settingTab === 'role' && (
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="fw-bold mb-1">
                        Manajemen Role &amp; Hak Akses Menu
                      </h6>
                      <small className="text-muted">
                        Atur role internal dan permission yang dimiliki setiap role.
                      </small>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={openAddRoleModal}
                      disabled={loadingRoles || savingRole}
                    >
                      <i className="bi bi-plus-lg me-1" />
                      Tambah Role
                    </button>
                  </div>

                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Nama Role</th>
                            <th>Deskripsi</th>
                            <th>Hak Akses</th>
                            <th className="text-center">Aksi</th>
                          </tr>
                        </thead>

                        <tbody>
                          {loadingRoles ? (
                            <tr>
                              <td
                                colSpan={4}
                                className="text-center text-muted py-5"
                              >
                                <span className="spinner-border spinner-border-sm me-2" />
                                Memuat role &amp; hak akses...
                              </td>
                            </tr>
                          ) : roles.length === 0 ? (
                            <tr>
                              <td
                                colSpan={4}
                                className="text-center text-muted py-5"
                              >
                                Belum ada role.
                              </td>
                            </tr>
                          ) : (
                            roles.map((role) => (
                              <tr key={role.id}>
                                <td>
                                  <strong>{role.name}</strong>
                                </td>

                                <td>
                                  {role.description || (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>

                                <td>
                                  {role.permissions?.length ? (
                                    <div className="d-flex flex-wrap gap-1">
                                      {role.permissions.map((permission) => (
                                        <span
                                          key={permission.id}
                                          className="badge bg-primary-subtle text-primary border border-primary-subtle"
                                        >
                                          {permission.name}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-muted">
                                      Belum ada permission
                                    </span>
                                  )}
                                </td>

                                <td className="text-center">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-info text-white me-1"
                                    onClick={() => void openEditRoleModal(role)}
                                    disabled={savingRole}
                                    title="Atur hak akses"
                                  >
                                    <i className="bi bi-shield-lock me-1" />
                                    Akses
                                  </button>

                                  <button
                                    type="button"
                                    className="btn btn-sm btn-warning me-1"
                                    onClick={() => void openEditRoleModal(role)}
                                    disabled={savingRole}
                                    title="Edit role"
                                  >
                                    <i className="bi bi-pencil" />
                                  </button>

                                  <button
                                    type="button"
                                    className="btn btn-sm btn-danger"
                                    onClick={() => void handleDeleteRole(role)}
                                    disabled={savingRole}
                                    title="Hapus role"
                                  >
                                    <i className="bi bi-trash" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {settingTab === 'menu' && (
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="fw-bold mb-1">Manajemen Struktur Menu System</h6>
                      <small className="text-muted">Kelola menu, route, parent, urutan, icon, dan status menu system.</small>
                    </div>
                    <button type="button" className="btn btn-primary btn-sm" onClick={openAddMenuModal} disabled={loadingMenus || savingMenu}>
                      <i className="bi bi-plus-lg me-1" />Tambah Menu
                    </button>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr><th>No</th><th>Nama Menu</th><th>URL / Route</th><th>Icon</th><th>Parent</th><th>Urutan</th><th>Status</th><th className="text-center">Aksi</th></tr>
                        </thead>
                        <tbody>
                          {loadingMenus ? (
                            <tr><td colSpan={8} className="text-center text-muted py-5"><span className="spinner-border spinner-border-sm me-2" />Memuat menu system...</td></tr>
                          ) : menus.length === 0 ? (
                            <tr><td colSpan={8} className="text-center text-muted py-5">Belum ada menu system.</td></tr>
                          ) : (
                            menus.slice().sort((a,b) => {
                              if (a.parentId === b.parentId) return a.sortOrder - b.sortOrder
                              if (a.parentId === null) return -1
                              if (b.parentId === null) return 1
                              return a.parentId - b.parentId
                            }).map((menu,index) => {
                              const parentMenu = menus.find(parent => parent.id === menu.parentId)
                              return (
                                <tr key={menu.id}>
                                  <td>{index + 1}</td>
                                  <td><div className="fw-semibold">{menu.parentId ? '↳ ' : ''}{menu.name}</div>{menu.parentId && <small className="text-muted">Sub Menu</small>}</td>
                                  <td>{menu.route ? <code>{menu.route}</code> : <span className="text-muted">-</span>}</td>
                                  <td>{menu.icon ? <span><i className={`${menu.icon} me-2`} /><code>{menu.icon}</code></span> : <span className="text-muted">-</span>}</td>
                                  <td>{parentMenu ? parentMenu.name : <span className="text-muted">Menu Utama</span>}</td>
                                  <td className="text-center">{menu.sortOrder}</td>
                                  <td>{menu.isActive ? <span className="badge bg-success">Aktif</span> : <span className="badge bg-secondary">Nonaktif</span>}</td>
                                  <td className="text-center">
                                    <button type="button" className="btn btn-sm btn-warning me-1" onClick={() => openEditMenuModal(menu)} disabled={savingMenu} title="Edit menu"><i className="bi bi-pencil" /></button>
                                    <button type="button" className="btn btn-sm btn-danger" onClick={() => void handleDeleteMenu(menu)} disabled={savingMenu} title="Hapus menu"><i className="bi bi-trash" /></button>
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

{showRoleModal && (
  <>
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content border-0 shadow">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title fw-bold">
              {roleModalMode === 'add'
                ? 'Tambah Role'
                : 'Edit Role & Hak Akses'}
            </h5>

            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={closeRoleModal}
              disabled={savingRole}
              aria-label="Tutup"
            />
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              void handleSaveRole()
            }}
          >
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Nama Role
                </label>

                <input
                  type="text"
                  className="form-control"
                  value={roleNameInput}
                  onChange={(event) =>
                    setRoleNameInput(event.target.value)
                  }
                  placeholder="Contoh: VERIFIKATOR"
                  disabled={savingRole}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="form-label fw-semibold">
                  Deskripsi
                </label>

                <textarea
                  className="form-control"
                  rows={2}
                  value={roleDescriptionInput}
                  onChange={(event) =>
                    setRoleDescriptionInput(event.target.value)
                  }
                  placeholder="Deskripsi role"
                  disabled={savingRole}
                />
              </div>

              <div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="form-label fw-semibold mb-0">
                    Hak Akses / Permission
                  </label>

                  <span className="badge bg-primary">
                    {selectedPermissionIds.length} dipilih
                  </span>
                </div>

                {permissions.length === 0 ? (
                  <div className="alert alert-warning mb-0">
                    Belum ada permission yang tersedia.
                  </div>
                ) : (
                  <div
                    className="border rounded p-3"
                    style={{
                      maxHeight: '320px',
                      overflowY: 'auto',
                    }}
                  >
                    <div className="row g-2">
                      {permissions.map((permission) => (
                        <div
                          key={permission.id}
                          className="col-md-6"
                        >
                          <div className="form-check border rounded p-2 ps-5">
                            <input
                              id={`role-permission-${permission.id}`}
                              type="checkbox"
                              className="form-check-input"
                              checked={selectedPermissionIds.includes(
                                permission.id,
                              )}
                              onChange={() =>
                                togglePermission(permission.id)
                              }
                              disabled={savingRole}
                            />

                            <label
                              htmlFor={`role-permission-${permission.id}`}
                              className="form-check-label"
                            >
                              <strong>{permission.name}</strong>

                              {permission.description && (
                                <div className="small text-muted">
                                  {permission.description}
                                </div>
                              )}
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
<div className="mt-4">
  <div className="d-flex justify-content-between align-items-center mb-2">
    <label className="form-label fw-semibold mb-0">
      Akses Menu System
    </label>

    <span className="badge bg-success">
      {selectedMenuIds.length} dipilih
    </span>
  </div>

  {loadingRoleMenus ? (
    <div className="text-center py-3">
      <span className="spinner-border spinner-border-sm me-2" />
      Memuat akses menu...
    </div>
  ) : menus.length === 0 ? (
    <div className="alert alert-warning mb-0">
      Belum ada menu system.
    </div>
  ) : (
    <div
      className="border rounded p-3"
      style={{
        maxHeight: '280px',
        overflowY: 'auto',
      }}
    >
      <div className="row g-2">
        {menus.map((menu) => (
          <div
            key={menu.id}
            className="col-md-6"
          >
            <div className="form-check border rounded p-2 ps-5">
              <input
                id={`role-menu-${menu.id}`}
                type="checkbox"
                className="form-check-input"
                checked={selectedMenuIds.includes(menu.id)}
                onChange={() => toggleMenu(menu.id)}
                disabled={savingRole || loadingRoleMenus}
              />

              <label
                htmlFor={`role-menu-${menu.id}`}
                className="form-check-label"
              >
                <strong>
                  {menu.parentId ? '↳ ' : ''}
                  {menu.name}
                </strong>

                {menu.route && (
                  <div className="small text-muted">
                    {menu.route}
                  </div>
                )}
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  )}
</div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeRoleModal}
                disabled={savingRole}
              >
                Batal
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  savingRole ||
                  !roleNameInput.trim()
                }
              >
                {savingRole ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg me-1" />
                    Simpan Role
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div className="modal-backdrop fade show" />
  </>
)}

        {showUserModal && (
          <>
            <div
              className="modal fade show d-block"
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
            >
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header bg-primary text-white">
                    <h5 className="modal-title fw-bold">
                      {userModalMode === 'add'
                        ? 'Tambah User Internal'
                        : 'Edit User Internal'}
                    </h5>
                    <button
                      type="button"
                      className="btn-close btn-close-white"
                      onClick={closeUserModal}
                      disabled={savingUser}
                      aria-label="Tutup"
                    />
                  </div>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault()
                      void handleSaveUser()
                    }}
                  >
                    <div className="modal-body">
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Username</label>
                        <input
                          type="text"
                          className="form-control"
                          value={userUsername}
                          onChange={(event) => setUserUsername(event.target.value)}
                          disabled={savingUser || userModalMode === 'edit'}
                          required={userModalMode === 'add'}
                          placeholder="username"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Email</label>
                        <input
                          type="email"
                          className="form-control"
                          value={userEmail}
                          onChange={(event) => setUserEmail(event.target.value)}
                          disabled={savingUser}
                          required
                          placeholder="nama@beasiswa.go.id"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">
                          {userModalMode === 'add' ? 'Password' : 'Password Baru'}
                        </label>
                        <input
                          type="password"
                          className="form-control"
                          value={userPassword}
                          onChange={(event) => setUserPassword(event.target.value)}
                          disabled={savingUser}
                          required={userModalMode === 'add'}
                          minLength={8}
                          placeholder={userModalMode === 'edit' ? 'Kosongkan jika tidak diganti' : 'Minimal 8 karakter'}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label fw-semibold">Role System</label>
                        <select
                          className="form-select"
                          value={userRoleId}
                          onChange={(event) => setUserRoleId(event.target.value)}
                          disabled={savingUser}
                          required
                        >
                          <option value="">Pilih role</option>
                          {roles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name || `Role #${role.id}`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-check">
                        <input
                          id="internal-user-active"
                          type="checkbox"
                          className="form-check-input"
                          checked={userIsActive}
                          onChange={(event) => setUserIsActive(event.target.checked)}
                          disabled={savingUser}
                        />
                        <label htmlFor="internal-user-active" className="form-check-label">
                          User aktif
                        </label>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={closeUserModal}
                        disabled={savingUser}
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={savingUser}
                      >
                        {savingUser ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" />
                            Menyimpan...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check-lg me-1" />
                            Simpan User
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
            <div className="modal-backdrop fade show" />
          </>
        )}

        {showProgramModal && (
          <>
            <div
              className="modal fade show d-block"
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
            >
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header bg-primary text-white">
                    <h5 className="modal-title fw-bold">
                      {editingProgram
                        ? 'Edit Program Beasiswa'
                        : 'Tambah Program Beasiswa'}
                    </h5>

                    <button
                      type="button"
                      className="btn-close btn-close-white"
                      onClick={closeProgramModal}
                      disabled={saving}
                      aria-label="Tutup"
                    />
                  </div>

                  <div className="modal-body">
                    <form
                      onSubmit={(event) => {
                        event.preventDefault()
                        void handleSaveProgram()
                      }}
                    >
                      <div className="mb-3">
                        <label className="form-label">
                          Nama Beasiswa Pelatihan
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={nama}
                          onChange={(event) => setNama(event.target.value)}
                          required
                          disabled={saving}
                        />
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Kuota Peserta</label>
                        <input
                          type="number"
                          className="form-control"
                          min={1}
                          value={kuota}
                          onChange={(event) => setKuota(event.target.value)}
                          required
                          disabled={saving}
                        />
                      </div>

                      <div className="mb-3">
                        <label className="form-label">
                          Metode Pelaksanaan
                        </label>
                        <select
                          className="form-select"
                          defaultValue="Daring (Online)"
                        >
                          <option>Daring (Online)</option>
                          <option>Hybrid</option>
                          <option>Luring (Offline)</option>
                        </select>
                      </div>

                      <div className="mb-3">
                        <label className="form-label">
                          Deskripsi Program
                        </label>
                        <textarea
                          className="form-control"
                          rows={3}
                          value={deskripsi}
                          onChange={(event) =>
                            setDeskripsi(event.target.value)
                          }
                          disabled={saving}
                        />
                      </div>

                      <div className="mb-3">
                        <label className="form-label">
                          Periode Pendaftaran
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={periode}
                          onChange={(event) =>
                            setPeriode(event.target.value)
                          }
                          disabled={saving}
                        />
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Status</label>
                        <select
                          className="form-select"
                          value={status}
                          onChange={(event) =>
                            setStatus(event.target.value as ProgramStatus)
                          }
                          disabled={saving}
                        >
                          <option value="Aktif">Aktif</option>
                          <option value="Ditutup">Ditutup</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary w-100"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" />
                            Menyimpan...
                          </>
                        ) : (
                          'Simpan Program Beasiswa'
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-backdrop fade show" />
          </>
        )}
      {showMenuModal && (
        <>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title fw-bold">{editingMenu ? 'Edit Menu System' : 'Tambah Menu System'}</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={closeMenuModal} disabled={savingMenu} aria-label="Tutup" />
                </div>
                <form onSubmit={(event) => { event.preventDefault(); void handleSaveMenu() }}>
                  <div className="modal-body">
                    <div className="mb-3"><label className="form-label fw-semibold">Nama Menu</label><input type="text" className="form-control" value={menuNameInput} onChange={(event) => setMenuNameInput(event.target.value)} placeholder="Contoh: Dashboard" disabled={savingMenu} required /></div>
                    <div className="mb-3"><label className="form-label fw-semibold">Route</label><input type="text" className="form-control" value={menuRouteInput} onChange={(event) => setMenuRouteInput(event.target.value)} placeholder="/internal/admin" disabled={savingMenu} /><div className="form-text">Kosongkan jika menu hanya digunakan sebagai parent menu.</div></div>
                    <div className="mb-3"><label className="form-label fw-semibold">Bootstrap Icon</label><input type="text" className="form-control" value={menuIconInput} onChange={(event) => setMenuIconInput(event.target.value)} placeholder="bi-speedometer2" disabled={savingMenu} />{menuIconInput.trim() && <div className="mt-2">Preview: <i className={`${menuIconInput.trim()} fs-4 ms-2`} /></div>}</div>
                    <div className="row g-3">
                      <div className="col-md-7"><label className="form-label fw-semibold">Parent Menu</label><select className="form-select" value={menuParentIdInput} onChange={(event) => setMenuParentIdInput(event.target.value)} disabled={savingMenu}><option value="">Menu Utama</option>{menus.filter(menu => menu.id !== editingMenu?.id).filter(menu => menu.parentId === null).sort((a,b) => a.sortOrder-b.sortOrder).map(menu => <option key={menu.id} value={menu.id}>{menu.name}</option>)}</select></div>
                      <div className="col-md-5"><label className="form-label fw-semibold">Urutan</label><input type="number" className="form-control" min={0} value={menuSortOrderInput} onChange={(event) => setMenuSortOrderInput(event.target.value)} disabled={savingMenu} required /></div>
                    </div>
                    <div className="form-check mt-4"><input id="system-menu-active" type="checkbox" className="form-check-input" checked={menuIsActive} onChange={(event) => setMenuIsActive(event.target.checked)} disabled={savingMenu} /><label htmlFor="system-menu-active" className="form-check-label">Menu aktif</label></div>
                  </div>
                  <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={closeMenuModal} disabled={savingMenu}>Batal</button><button type="submit" className="btn btn-primary" disabled={savingMenu || !menuNameInput.trim()}>{savingMenu ? <><span className="spinner-border spinner-border-sm me-2" />Menyimpan...</> : <><i className="bi bi-check-lg me-1" />{editingMenu ? 'Simpan Perubahan' : 'Simpan Menu'}</>}</button></div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}

      {showPersyaratanModal && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title fw-bold">
                    {editingPersyaratan
                      ? 'Edit Persyaratan Dokumen'
                      : 'Tambah Persyaratan Dokumen'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={closePersyaratanModal}
                    disabled={saving}
                    aria-label="Tutup"
                  />
                </div>

                <div className="modal-body">
                  <form
                    onSubmit={(event) => {
                      event.preventDefault()
                      void handleSavePersyaratan()
                    }}
                  >
                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Program Beasiswa
                      </label>
                      <select
                        className="form-select"
                        value={persyaratanBeasiswaId}
                        onChange={(event) =>
                          setPersyaratanBeasiswaId(event.target.value)
                        }
                        disabled={saving}
                        required
                      >
                        <option value="">Pilih program</option>
                        {programs.map((program) => (
                          <option key={program.id} value={program.id}>
                            {program.nama}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Nama Dokumen
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={persyaratanNama}
                        onChange={(event) =>
                          setPersyaratanNama(event.target.value)
                        }
                        placeholder="Contoh: KTP (Kartu Tanda Penduduk)"
                        disabled={saving}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Deskripsi
                      </label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={persyaratanDeskripsi}
                        onChange={(event) =>
                          setPersyaratanDeskripsi(event.target.value)
                        }
                        placeholder="Keterangan persyaratan dokumen"
                        disabled={saving}
                      />
                    </div>

                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Format Allowed
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value="PDF / JPG / PNG"
                          disabled
                        />
                        <div className="form-text">
                          Mengikuti aturan upload dokumen aplikasi.
                        </div>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Max Size
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value="2 MB"
                          disabled
                        />
                        <div className="form-text">
                          Batas upload dokumen per file.
                        </div>
                      </div>
                    </div>

                    <div className="form-check mb-4">
                      <input
                        id="persyaratan-wajib"
                        type="checkbox"
                        className="form-check-input"
                        checked={persyaratanWajib}
                        onChange={(event) =>
                          setPersyaratanWajib(event.target.checked)
                        }
                        disabled={saving}
                      />
                      <label
                        htmlFor="persyaratan-wajib"
                        className="form-check-label"
                      >
                        Dokumen ini wajib diunggah
                      </label>
                    </div>

                    <div className="d-flex justify-content-end gap-2">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={closePersyaratanModal}
                        disabled={saving}
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" />
                            Menyimpan...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check-lg me-1" />
                            {editingPersyaratan
                              ? 'Simpan Perubahan'
                              : 'Simpan Persyaratan'}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}

      </div>
    </>
  )
}

export default AdminPage
