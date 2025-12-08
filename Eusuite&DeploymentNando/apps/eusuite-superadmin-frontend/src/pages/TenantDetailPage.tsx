import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  BuildingOffice2Icon,
  UserGroupIcon,
  CloudIcon,
  CreditCardIcon,
  CubeIcon,
  TrashIcon,
  PencilIcon,
  PauseIcon,
  PlayIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { Dialog, Transition, Tab } from '@headlessui/react'
import { Fragment } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { clsx } from 'clsx'

interface TenantDetail {
  id: string
  name: string
  slug: string
  domain?: string
  primary_email: string
  status: 'pending' | 'active' | 'suspended' | 'cancelled'
  branding: {
    primary_color?: string
    secondary_color?: string
    logo_url?: string
    favicon_url?: string
    company_name?: string
  }
  storage_used_gb: number
  storage_limit_gb: number
  user_count: number
  user_limit: number
  created_at: string
  updated_at: string
  subscription?: {
    id: string
    plan_name: string
    status: string
    current_period_start: string
    current_period_end: string
    stripe_subscription_id?: string
  }
  deployments: Deployment[]
  users: TenantUser[]
}

interface Deployment {
  id: string
  app_type: string
  namespace: string
  port: number
  status: string
  created_at: string
}

interface TenantUser {
  id: string
  email: string
  name?: string
  role: string
  is_active: boolean
  created_at: string
}

interface EditTenantForm {
  name: string
  domain?: string
  storage_limit_gb: number
  user_limit: number
}

export default function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedTab, setSelectedTab] = useState(0)

  const { register, handleSubmit, reset } = useForm<EditTenantForm>()

  const { data: tenant, isLoading } = useQuery<TenantDetail>({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/tenants/${tenantId}`)
      return data
    },
    enabled: !!tenantId,
  })

  const updateMutation = useMutation({
    mutationFn: async (data: EditTenantForm) => {
      return await apiClient.patch(`/tenants/${tenantId}`, data)
    },
    onSuccess: () => {
      toast.success('Tenant updated successfully')
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] })
      setIsEditModalOpen(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update tenant')
    },
  })

  const suspendMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post(`/tenants/${tenantId}/suspend`)
    },
    onSuccess: () => {
      toast.success('Tenant suspended')
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to suspend tenant')
    },
  })

  const activateMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post(`/tenants/${tenantId}/activate`)
    },
    onSuccess: () => {
      toast.success('Tenant activated')
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to activate tenant')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.delete(`/tenants/${tenantId}`)
    },
    onSuccess: () => {
      toast.success('Tenant deleted')
      navigate('/tenants')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete tenant')
    },
  })

  const openEditModal = () => {
    if (tenant) {
      reset({
        name: tenant.name,
        domain: tenant.domain,
        storage_limit_gb: tenant.storage_limit_gb,
        user_limit: tenant.user_limit,
      })
      setIsEditModalOpen(true)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Tenant not found</p>
      </div>
    )
  }

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    suspended: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/tenants')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary-100 flex items-center justify-center">
              <BuildingOffice2Icon className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
              <p className="text-gray-500">
                {tenant.domain || `${tenant.slug}.eusuite.eu`}
              </p>
            </div>
            <span className={clsx('badge ml-4', statusColors[tenant.status])}>
              {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openEditModal} className="btn btn-secondary">
            <PencilIcon className="h-5 w-5 mr-2" />
            Edit
          </button>
          {tenant.status === 'active' ? (
            <button
              onClick={() => suspendMutation.mutate()}
              className="btn btn-secondary text-yellow-600 hover:text-yellow-700"
            >
              <PauseIcon className="h-5 w-5 mr-2" />
              Suspend
            </button>
          ) : tenant.status === 'suspended' ? (
            <button
              onClick={() => activateMutation.mutate()}
              className="btn btn-secondary text-green-600 hover:text-green-700"
            >
              <PlayIcon className="h-5 w-5 mr-2" />
              Activate
            </button>
          ) : null}
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="btn btn-secondary text-red-600 hover:text-red-700"
          >
            <TrashIcon className="h-5 w-5 mr-2" />
            Delete
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserGroupIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Users</p>
              <p className="text-xl font-semibold text-gray-900">
                {tenant.user_count} / {tenant.user_limit}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CloudIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Storage</p>
              <p className="text-xl font-semibold text-gray-900">
                {tenant.storage_used_gb.toFixed(1)} / {tenant.storage_limit_gb} GB
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CubeIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Deployments</p>
              <p className="text-xl font-semibold text-gray-900">
                {tenant.deployments?.length || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <CreditCardIcon className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Plan</p>
              <p className="text-xl font-semibold text-gray-900">
                {tenant.subscription?.plan_name || 'No plan'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
        <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 p-1">
          {['Overview', 'Users', 'Deployments', 'Billing', 'Settings'].map((tab) => (
            <Tab
              key={tab}
              className={({ selected }) =>
                clsx(
                  'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                  'focus:outline-none',
                  selected
                    ? 'bg-white text-primary-700 shadow'
                    : 'text-gray-600 hover:bg-gray-200/50'
                )
              }
            >
              {tab}
            </Tab>
          ))}
        </Tab.List>
        <Tab.Panels className="mt-4">
          {/* Overview */}
          <Tab.Panel className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4">Tenant Information</h3>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Slug</dt>
                    <dd className="font-medium text-gray-900">{tenant.slug}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Primary Email</dt>
                    <dd className="font-medium text-gray-900">{tenant.primary_email}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Created</dt>
                    <dd className="font-medium text-gray-900">
                      {new Date(tenant.created_at).toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Updated</dt>
                    <dd className="font-medium text-gray-900">
                      {new Date(tenant.updated_at).toLocaleString()}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4">Subscription</h3>
                {tenant.subscription ? (
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Plan</dt>
                      <dd className="font-medium text-gray-900">
                        {tenant.subscription.plan_name}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Status</dt>
                      <dd>
                        <span className="badge bg-green-100 text-green-800">
                          {tenant.subscription.status}
                        </span>
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Period</dt>
                      <dd className="font-medium text-gray-900">
                        {new Date(tenant.subscription.current_period_start).toLocaleDateString()} -{' '}
                        {new Date(tenant.subscription.current_period_end).toLocaleDateString()}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-gray-500">No active subscription</p>
                )}
              </div>
            </div>
          </Tab.Panel>

          {/* Users */}
          <Tab.Panel>
            <div className="card p-0 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      User
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Role
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tenant.users?.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{user.name || user.email}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="badge bg-gray-100 text-gray-800">{user.role}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={clsx(
                            'badge',
                            user.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          )}
                        >
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Tab.Panel>

          {/* Deployments */}
          <Tab.Panel>
            <div className="card p-0 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      App
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Namespace
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Port
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tenant.deployments?.map((deployment) => (
                    <tr key={deployment.id}>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {deployment.app_type}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{deployment.namespace}</td>
                      <td className="px-6 py-4 text-gray-600">{deployment.port}</td>
                      <td className="px-6 py-4">
                        <span
                          className={clsx(
                            'badge',
                            deployment.status === 'running'
                              ? 'bg-green-100 text-green-800'
                              : deployment.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          )}
                        >
                          {deployment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(deployment.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Tab.Panel>

          {/* Billing */}
          <Tab.Panel>
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Billing History</h3>
              <p className="text-gray-500">View invoices and payment history in the Invoices section.</p>
            </div>
          </Tab.Panel>

          {/* Settings */}
          <Tab.Panel>
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Branding</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-2">Primary Color</p>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: tenant.branding?.primary_color || '#3B82F6' }}
                    />
                    <span className="font-mono text-sm">
                      {tenant.branding?.primary_color || '#3B82F6'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-2">Secondary Color</p>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: tenant.branding?.secondary_color || '#1E40AF' }}
                    />
                    <span className="font-mono text-sm">
                      {tenant.branding?.secondary_color || '#1E40AF'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>

      {/* Edit Modal */}
      <Transition appear show={isEditModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsEditModalOpen(false)}>
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
                    Edit Tenant
                  </Dialog.Title>

                  <form
                    onSubmit={handleSubmit((data) => updateMutation.mutate(data))}
                    className="mt-4 space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input {...register('name')} className="input w-full mt-1" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Custom Domain
                      </label>
                      <input {...register('domain')} className="input w-full mt-1" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Storage Limit (GB)
                      </label>
                      <input
                        {...register('storage_limit_gb', { valueAsNumber: true })}
                        type="number"
                        className="input w-full mt-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">User Limit</label>
                      <input
                        {...register('user_limit', { valueAsNumber: true })}
                        type="number"
                        className="input w-full mt-1"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsEditModalOpen(false)}
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={updateMutation.isPending}
                        className="btn btn-primary"
                      >
                        {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Delete Confirmation Modal */}
      <Transition appear show={isDeleteModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsDeleteModalOpen(false)}>
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
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-100 rounded-full">
                      <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <Dialog.Title as="h3" className="text-lg font-semibold text-gray-900">
                        Delete Tenant
                      </Dialog.Title>
                      <p className="text-gray-500 mt-1">
                        Are you sure you want to delete "{tenant.name}"? This action cannot be undone.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                      className="btn bg-red-600 text-white hover:bg-red-700"
                    >
                      {deleteMutation.isPending ? 'Deleting...' : 'Delete Tenant'}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}
