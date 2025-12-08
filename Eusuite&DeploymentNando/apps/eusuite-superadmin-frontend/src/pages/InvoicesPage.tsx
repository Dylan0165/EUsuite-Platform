import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  MagnifyingGlassIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { clsx } from 'clsx'

interface Invoice {
  id: string
  invoice_number: string
  tenant_id: string
  tenant_name: string
  subscription_id: string
  amount: number
  currency: string
  status: 'draft' | 'pending' | 'paid' | 'failed' | 'cancelled'
  period_start: string
  period_end: string
  due_date: string
  paid_at?: string
  stripe_invoice_id?: string
  created_at: string
}

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800', icon: DocumentTextIcon },
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800', icon: XCircleIcon },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600', icon: XCircleIcon },
}

export default function InvoicesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['invoices', searchQuery, statusFilter, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      params.append('skip', String((currentPage - 1) * pageSize))
      params.append('limit', String(pageSize))
      const { data } = await apiClient.get(`/invoices?${params}`)
      return data
    },
  })

  const { data: stats } = useQuery({
    queryKey: ['invoice-stats'],
    queryFn: async () => {
      const { data } = await apiClient.get('/invoices/stats')
      return data
    },
  })

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.post(`/invoices/${id}/mark-paid`)
    },
    onSuccess: () => {
      toast.success('Invoice marked as paid')
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice-stats'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update invoice')
    },
  })

  const resendMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.post(`/invoices/${id}/resend`)
    },
    onSuccess: () => {
      toast.success('Invoice resent to tenant')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to resend invoice')
    },
  })

  const invoices = invoicesData?.items || invoicesData || []
  const totalCount = invoicesData?.total || invoices.length

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <p className="text-gray-500 mt-1">Manage billing and payment records</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500">Total Outstanding</p>
          <p className="text-2xl font-bold text-gray-900">
            €{(stats?.total_outstanding || 0).toLocaleString()}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Paid This Month</p>
          <p className="text-2xl font-bold text-green-600">
            €{(stats?.paid_this_month || 0).toLocaleString()}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats?.pending_count || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Overdue</p>
          <p className="text-2xl font-bold text-red-600">{stats?.overdue_count || 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by invoice number or tenant..."
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
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Invoices table */}
      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invoice
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tenant
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Period
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Due Date
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoices.map((invoice: Invoice) => {
              const status = statusConfig[invoice.status]
              const isOverdue =
                invoice.status === 'pending' && new Date(invoice.due_date) < new Date()
              return (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <DocumentTextIcon className="h-5 w-5 text-gray-500" />
                      </div>
                      <span className="font-medium text-gray-900">{invoice.invoice_number}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => navigate(`/tenants/${invoice.tenant_id}`)}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      {invoice.tenant_name}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900">
                      €{invoice.amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={clsx(
                        'badge',
                        isOverdue ? 'bg-red-100 text-red-800' : status.color
                      )}
                    >
                      {isOverdue ? 'Overdue' : status.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {new Date(invoice.period_start).toLocaleDateString()} -{' '}
                    {new Date(invoice.period_end).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx('text-sm', isOverdue ? 'text-red-600 font-medium' : 'text-gray-500')}>
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      {invoice.status === 'pending' && (
                        <button
                          onClick={() => markPaidMutation.mutate(invoice.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Mark as Paid"
                        >
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        </button>
                      )}
                      {['pending', 'failed'].includes(invoice.status) && (
                        <button
                          onClick={() => resendMutation.mutate(invoice.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Resend Invoice"
                        >
                          <EnvelopeIcon className="h-5 w-5 text-blue-500" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          // Download PDF
                          window.open(`/api/v1/invoices/${invoice.id}/pdf`, '_blank')
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="Download PDF"
                      >
                        <ArrowDownTrayIcon className="h-5 w-5 text-gray-500" />
                      </button>
                    </div>
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
            {Math.min(currentPage * pageSize, totalCount)} of {totalCount} invoices
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
    </div>
  )
}
