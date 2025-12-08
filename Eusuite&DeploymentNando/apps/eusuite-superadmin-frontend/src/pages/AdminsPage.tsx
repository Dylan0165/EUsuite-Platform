import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserCircleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { useAuthStore } from '@/stores/authStore'
import { clsx } from 'clsx'

interface Admin {
  id: number
  email: string
  name?: string
  role: 'super_admin' | 'admin' | 'support' | 'viewer'
  is_active: boolean
  mfa_enabled: boolean
  last_login?: string
  created_at: string
}

interface AdminForm {
  email: string
  name?: string
  password: string
  role: 'super_admin' | 'admin' | 'support' | 'viewer'
  is_active: boolean
}

const roleConfig = {
  super_admin: { label: 'Super Admin', color: 'bg-red-100 text-red-800' },
  admin: { label: 'Admin', color: 'bg-purple-100 text-purple-800' },
  support: { label: 'Support', color: 'bg-blue-100 text-blue-800' },
  viewer: { label: 'Viewer', color: 'bg-gray-100 text-gray-800' },
}

export default function AdminsPage() {
  const queryClient = useQueryClient()
  const currentAdmin = useAuthStore((state) => state.user)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AdminForm>()

  const { data: admins, isLoading } = useQuery<Admin[]>({
    queryKey: ['admins'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admins')
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: AdminForm) => {
      return await apiClient.post('/admins', data)
    },
    onSuccess: () => {
      toast.success('Admin created successfully')
      queryClient.invalidateQueries({ queryKey: ['admins'] })
      closeModal()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create admin')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<AdminForm> }) => {
      return await apiClient.patch(`/admins/${id}`, data)
    },
    onSuccess: () => {
      toast.success('Admin updated successfully')
      queryClient.invalidateQueries({ queryKey: ['admins'] })
      closeModal()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update admin')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiClient.delete(`/admins/${id}`)
    },
    onSuccess: () => {
      toast.success('Admin deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['admins'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete admin')
    },
  })

  const openCreateModal = () => {
    setEditingAdmin(null)
    reset({
      email: '',
      name: '',
      password: '',
      role: 'viewer',
      is_active: true,
    })
    setIsModalOpen(true)
  }

  const openEditModal = (admin: Admin) => {
    setEditingAdmin(admin)
    reset({
      email: admin.email,
      name: admin.name || '',
      password: '',
      role: admin.role,
      is_active: admin.is_active,
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingAdmin(null)
    reset()
  }

  const onSubmit = (data: AdminForm) => {
    if (editingAdmin) {
      const updateData: Partial<AdminForm> = {
        name: data.name,
        role: data.role,
        is_active: data.is_active,
      }
      if (data.password) {
        updateData.password = data.password
      }
      updateMutation.mutate({ id: editingAdmin.id, data: updateData })
    } else {
      createMutation.mutate(data)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administrators</h1>
          <p className="text-gray-500 mt-1">Manage admin users and permissions</p>
        </div>
        {currentAdmin?.role === 'super_admin' && (
          <button onClick={openCreateModal} className="btn btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Admin
          </button>
        )}
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(roleConfig).map(([key, config]) => (
          <div key={key} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{config.label}s</p>
                <p className="text-2xl font-bold text-gray-900">
                  {admins?.filter((a) => a.role === key).length || 0}
                </p>
              </div>
              <ShieldCheckIcon
                className={clsx(
                  'h-8 w-8',
                  key === 'super_admin'
                    ? 'text-red-500'
                    : key === 'admin'
                    ? 'text-purple-500'
                    : key === 'support'
                    ? 'text-blue-500'
                    : 'text-gray-400'
                )}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Admins table */}
      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Admin
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                MFA
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {admins?.map((admin) => {
              const role = roleConfig[admin.role]
              const isCurrentUser = admin.id === currentAdmin?.id
              return (
                <tr key={admin.id} className={clsx('hover:bg-gray-50', isCurrentUser && 'bg-primary-50/30')}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <UserCircleIcon className="h-6 w-6 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {admin.name || admin.email}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-primary-600">(You)</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">{admin.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx('badge', role.color)}>{role.label}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={clsx(
                        'badge',
                        admin.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      )}
                    >
                      {admin.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={clsx(
                        'badge',
                        admin.mfa_enabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      )}
                    >
                      {admin.mfa_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {admin.last_login
                      ? new Date(admin.last_login).toLocaleString()
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      {currentAdmin?.role === 'super_admin' && (
                        <>
                          <button
                            onClick={() => openEditModal(admin)}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                          >
                            <PencilIcon className="h-5 w-5 text-gray-500" />
                          </button>
                          {!isCurrentUser && (
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this admin?')) {
                                  deleteMutation.mutate(admin.id)
                                }
                              }}
                              className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                              <TrashIcon className="h-5 w-5 text-red-500" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white p-6 shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-semibold text-gray-900">
                    {editingAdmin ? 'Edit Admin' : 'Create Admin'}
                  </Dialog.Title>

                  <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        {...register('email', {
                          required: 'Email is required',
                          pattern: {
                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                            message: 'Invalid email',
                          },
                        })}
                        type="email"
                        disabled={!!editingAdmin}
                        className="input w-full mt-1"
                      />
                      {errors.email && (
                        <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input {...register('name')} className="input w-full mt-1" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {editingAdmin ? 'New Password (leave blank to keep)' : 'Password'}
                      </label>
                      <input
                        {...register('password', {
                          required: editingAdmin ? false : 'Password is required',
                          minLength: {
                            value: 8,
                            message: 'Password must be at least 8 characters',
                          },
                        })}
                        type="password"
                        className="input w-full mt-1"
                      />
                      {errors.password && (
                        <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Role</label>
                      <select {...register('role')} className="input w-full mt-1">
                        {Object.entries(roleConfig).map(([key, config]) => (
                          <option key={key} value={key}>
                            {config.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        {...register('is_active')}
                        type="checkbox"
                        id="is_active"
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <label htmlFor="is_active" className="text-sm text-gray-700">
                        Account is active
                      </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <button type="button" onClick={closeModal} className="btn btn-secondary">
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        className="btn btn-primary"
                      >
                        {createMutation.isPending || updateMutation.isPending
                          ? 'Saving...'
                          : editingAdmin
                          ? 'Update Admin'
                          : 'Create Admin'}
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}
