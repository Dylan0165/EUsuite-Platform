import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { clsx } from 'clsx'

interface Plan {
  id: string
  name: string
  code: string
  description?: string
  price_monthly: number
  price_yearly: number
  storage_gb: number
  user_limit: number
  features: string[]
  is_active: boolean
  created_at: string
}

interface PlanForm {
  name: string
  code: string
  description?: string
  price_monthly: number
  price_yearly: number
  storage_gb: number
  user_limit: number
  features: string
  is_active: boolean
}

export default function PlansPage() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PlanForm>()

  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data } = await apiClient.get('/plans')
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: PlanForm) => {
      const payload = {
        ...data,
        features: data.features.split('\n').filter((f) => f.trim()),
      }
      return await apiClient.post('/plans', payload)
    },
    onSuccess: () => {
      toast.success('Plan created successfully')
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      closeModal()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create plan')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PlanForm }) => {
      const payload = {
        ...data,
        features: data.features.split('\n').filter((f) => f.trim()),
      }
      return await apiClient.patch(`/plans/${id}`, payload)
    },
    onSuccess: () => {
      toast.success('Plan updated successfully')
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      closeModal()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update plan')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/plans/${id}`)
    },
    onSuccess: () => {
      toast.success('Plan deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['plans'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete plan')
    },
  })

  const openCreateModal = () => {
    setEditingPlan(null)
    reset({
      name: '',
      code: '',
      description: '',
      price_monthly: 0,
      price_yearly: 0,
      storage_gb: 10,
      user_limit: 5,
      features: '',
      is_active: true,
    })
    setIsModalOpen(true)
  }

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan)
    reset({
      name: plan.name,
      code: plan.code,
      description: plan.description,
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      storage_gb: plan.storage_gb,
      user_limit: plan.user_limit,
      features: plan.features.join('\n'),
      is_active: plan.is_active,
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingPlan(null)
    reset()
  }

  const onSubmit = (data: PlanForm) => {
    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data })
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
          <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
          <p className="text-gray-500 mt-1">Manage pricing and plan features</p>
        </div>
        <button onClick={openCreateModal} className="btn btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Plan
        </button>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans?.map((plan) => (
          <div
            key={plan.id}
            className={clsx(
              'card relative',
              !plan.is_active && 'opacity-60'
            )}
          >
            {!plan.is_active && (
              <span className="absolute top-4 right-4 badge bg-gray-100 text-gray-600">
                Inactive
              </span>
            )}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
              <p className="text-sm text-gray-500 font-mono">{plan.code}</p>
            </div>
            {plan.description && (
              <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
            )}
            <div className="mb-4">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-gray-900">
                  €{plan.price_monthly}
                </span>
                <span className="text-gray-500">/month</span>
              </div>
              <p className="text-sm text-gray-500">
                €{plan.price_yearly}/year (save{' '}
                {Math.round(
                  ((plan.price_monthly * 12 - plan.price_yearly) /
                    (plan.price_monthly * 12)) *
                    100
                )}
                %)
              </p>
            </div>
            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Storage</span>
                <span className="font-medium text-gray-900">{plan.storage_gb} GB</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Users</span>
                <span className="font-medium text-gray-900">
                  {plan.user_limit === -1 ? 'Unlimited' : plan.user_limit}
                </span>
              </div>
            </div>
            {plan.features.length > 0 && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Features:</p>
                <ul className="space-y-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="border-t border-gray-200 pt-4 mt-4 flex justify-end gap-2">
              <button
                onClick={() => openEditModal(plan)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <PencilIcon className="h-5 w-5 text-gray-500" />
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this plan?')) {
                    deleteMutation.mutate(plan.id)
                  }
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <TrashIcon className="h-5 w-5 text-red-500" />
              </button>
            </div>
          </div>
        ))}
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
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-xl bg-white p-6 shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-semibold text-gray-900">
                    {editingPlan ? 'Edit Plan' : 'Create Plan'}
                  </Dialog.Title>

                  <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <input
                          {...register('name', { required: 'Name is required' })}
                          className="input w-full mt-1"
                          placeholder="Professional"
                        />
                        {errors.name && (
                          <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Code</label>
                        <input
                          {...register('code', { required: 'Code is required' })}
                          className="input w-full mt-1"
                          placeholder="pro"
                        />
                        {errors.code && (
                          <p className="text-sm text-red-600 mt-1">{errors.code.message}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <textarea
                        {...register('description')}
                        className="input w-full mt-1"
                        rows={2}
                        placeholder="Best for growing teams..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Monthly Price (€)
                        </label>
                        <input
                          {...register('price_monthly', {
                            required: 'Required',
                            valueAsNumber: true,
                          })}
                          type="number"
                          step="0.01"
                          className="input w-full mt-1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Yearly Price (€)
                        </label>
                        <input
                          {...register('price_yearly', {
                            required: 'Required',
                            valueAsNumber: true,
                          })}
                          type="number"
                          step="0.01"
                          className="input w-full mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Storage (GB)
                        </label>
                        <input
                          {...register('storage_gb', {
                            required: 'Required',
                            valueAsNumber: true,
                          })}
                          type="number"
                          className="input w-full mt-1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          User Limit (-1 = unlimited)
                        </label>
                        <input
                          {...register('user_limit', {
                            required: 'Required',
                            valueAsNumber: true,
                          })}
                          type="number"
                          className="input w-full mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Features (one per line)
                      </label>
                      <textarea
                        {...register('features')}
                        className="input w-full mt-1"
                        rows={4}
                        placeholder="All EUSuite apps&#10;Priority support&#10;Custom branding"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        {...register('is_active')}
                        type="checkbox"
                        id="is_active"
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <label htmlFor="is_active" className="text-sm text-gray-700">
                        Plan is active and available for purchase
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
                          : editingPlan
                          ? 'Update Plan'
                          : 'Create Plan'}
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
