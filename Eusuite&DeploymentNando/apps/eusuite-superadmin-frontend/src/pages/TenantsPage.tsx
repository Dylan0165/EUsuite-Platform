import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { clsx } from 'clsx'

interface Tenant {
  id: string
  name: string
  slug: string
  domain?: string
  primary_email: string
  status: 'pending' | 'active' | 'suspended' | 'cancelled'
  plan_id?: string
  created_at: string
  storage_used_gb: number
  storage_limit_gb: number
  user_count: number
  user_limit: number
}

interface Plan {
  id: string
  name: string
  code: string
}

interface CreateTenantForm {
  name: string
  slug: string
  primary_email: string
  domain?: string
  plan_id?: string
}

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
  active: { label: 'Active', color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
  suspended: { label: 'Suspended', color: 'bg-red-100 text-red-800', icon: XCircleIcon },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800', icon: XCircleIcon },
}

export default function TenantsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateTenantForm>()

  const { data: tenantsData, isLoading } = useQuery({
    queryKey: ['tenants', searchQuery, statusFilter, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      params.append('skip', String((currentPage - 1) * pageSize))
      params.append('limit', String(pageSize))
      const { data } = await apiClient.get(`/tenants?${params}`)
      return data
    },
  })

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data } = await apiClient.get('/plans')
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: CreateTenantForm) => {
      return await apiClient.post('/tenants', data)
    },
    onSuccess: () => {
      toast.success('Tenant created successfully')
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      setIsCreateModalOpen(false)
      reset()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create tenant')
    },
  })

  const onSubmit = (data: CreateTenantForm) => {
    createMutation.mutate(data)
  }

  const tenants = tenantsData?.items || tenantsData || []
  const totalCount = tenantsData?.total || tenants.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="text-gray-500 mt-1">Manage all tenant organizations</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Tenant
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tenants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-40"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Tenants table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organization
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Users
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Storage
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tenants.map((tenant: Tenant) => {
                const status = statusConfig[tenant.status]
                return (
                  <tr
                    key={tenant.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/tenants/${tenant.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
                          <BuildingOffice2Icon className="h-5 w-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{tenant.name}</p>
                          <p className="text-sm text-gray-500">
                            {tenant.domain || `${tenant.slug}.eusuite.eu`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx('badge', status.color)}>
                        <status.icon className="h-4 w-4 mr-1" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-900">
                        {tenant.user_count} / {tenant.user_limit}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={clsx(
                              'h-full rounded-full',
                              tenant.storage_used_gb / tenant.storage_limit_gb > 0.9
                                ? 'bg-red-500'
                                : tenant.storage_used_gb / tenant.storage_limit_gb > 0.7
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            )}
                            style={{
                              width: `${Math.min(100, (tenant.storage_used_gb / tenant.storage_limit_gb) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-500">
                          {tenant.storage_used_gb.toFixed(1)} / {tenant.storage_limit_gb} GB
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/tenants/${tenant.id}`)
                        }}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, totalCount)} of {totalCount} tenants
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn btn-secondary"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={currentPage * pageSize >= totalCount}
                className="btn btn-secondary"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Tenant Modal */}
      <Transition appear show={isCreateModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsCreateModalOpen(false)}>
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
                    Create New Tenant
                  </Dialog.Title>

                  <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Organization Name
                      </label>
                      <input
                        {...register('name', { required: 'Name is required' })}
                        className="input w-full mt-1"
                        placeholder="Acme Corp"
                      />
                      {errors.name && (
                        <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Slug (subdomain)
                      </label>
                      <input
                        {...register('slug', {
                          required: 'Slug is required',
                          pattern: {
                            value: /^[a-z0-9-]+$/,
                            message: 'Only lowercase letters, numbers, and hyphens',
                          },
                        })}
                        className="input w-full mt-1"
                        placeholder="acme-corp"
                      />
                      {errors.slug && (
                        <p className="text-sm text-red-600 mt-1">{errors.slug.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Primary Email
                      </label>
                      <input
                        {...register('primary_email', {
                          required: 'Email is required',
                          pattern: {
                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                            message: 'Invalid email address',
                          },
                        })}
                        type="email"
                        className="input w-full mt-1"
                        placeholder="admin@acme.com"
                      />
                      {errors.primary_email && (
                        <p className="text-sm text-red-600 mt-1">{errors.primary_email.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Custom Domain (optional)
                      </label>
                      <input
                        {...register('domain')}
                        className="input w-full mt-1"
                        placeholder="dashboard.acme.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Plan
                      </label>
                      <select {...register('plan_id')} className="input w-full mt-1">
                        <option value="">Select a plan...</option>
                        {plans?.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(false)}
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={createMutation.isPending}
                        className="btn btn-primary"
                      >
                        {createMutation.isPending ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Creating...
                          </>
                        ) : (
                          'Create Tenant'
                        )}
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
