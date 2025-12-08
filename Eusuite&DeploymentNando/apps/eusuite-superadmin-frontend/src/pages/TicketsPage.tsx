import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  MagnifyingGlassIcon,
  TicketIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { clsx } from 'clsx'

interface Ticket {
  id: string
  ticket_number: string
  tenant_id: string
  tenant_name: string
  subject: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed'
  assigned_to?: string
  assigned_admin_name?: string
  created_at: string
  updated_at: string
  message_count: number
}

interface TicketMessage {
  id: string
  content: string
  sender_type: 'tenant' | 'admin'
  sender_name: string
  created_at: string
}

const statusConfig = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
  waiting: { label: 'Waiting', color: 'bg-purple-100 text-purple-800' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-600' },
}

const priorityConfig = {
  low: { label: 'Low', color: 'text-gray-600' },
  medium: { label: 'Medium', color: 'text-blue-600' },
  high: { label: 'High', color: 'text-orange-600' },
  urgent: { label: 'Urgent', color: 'text-red-600' },
}

export default function TicketsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const pageSize = 20

  const { register, handleSubmit, reset } = useForm<{ content: string }>()

  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['tickets', searchQuery, statusFilter, priorityFilter, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (priorityFilter !== 'all') params.append('priority', priorityFilter)
      params.append('skip', String((currentPage - 1) * pageSize))
      params.append('limit', String(pageSize))
      const { data } = await apiClient.get(`/tickets?${params}`)
      return data
    },
  })

  const { data: ticketMessages, isLoading: messagesLoading } = useQuery({
    queryKey: ['ticket-messages', selectedTicket?.id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/tickets/${selectedTicket?.id}/messages`)
      return data
    },
    enabled: !!selectedTicket,
  })

  const replyMutation = useMutation({
    mutationFn: async ({ ticketId, content }: { ticketId: string; content: string }) => {
      return await apiClient.post(`/tickets/${ticketId}/messages`, { content })
    },
    onSuccess: () => {
      toast.success('Reply sent')
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', selectedTicket?.id] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      reset()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to send reply')
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      return await apiClient.patch(`/tickets/${ticketId}`, { status })
    },
    onSuccess: () => {
      toast.success('Ticket updated')
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      if (selectedTicket) {
        setSelectedTicket({ ...selectedTicket, status: selectedTicket.status })
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update ticket')
    },
  })

  const tickets = ticketsData?.items || ticketsData || []
  const totalCount = ticketsData?.total || tickets.length

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
        <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
        <p className="text-gray-500 mt-1">Manage tenant support requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {Object.entries(statusConfig).map(([key, config]) => (
          <div key={key} className="card">
            <p className="text-sm text-gray-500">{config.label}</p>
            <p className="text-2xl font-bold text-gray-900">
              {tickets.filter((t: Ticket) => t.status === key).length}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tickets..."
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
          {Object.entries(statusConfig).map(([key, config]) => (
            <option key={key} value={key}>
              {config.label}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="input w-40"
        >
          <option value="all">All Priority</option>
          {Object.entries(priorityConfig).map(([key, config]) => (
            <option key={key} value={key}>
              {config.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tickets table */}
      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ticket
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tenant
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned To
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Updated
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tickets.map((ticket: Ticket) => {
              const status = statusConfig[ticket.status]
              const priority = priorityConfig[ticket.priority]
              return (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary-100 rounded-lg">
                        <TicketIcon className="h-5 w-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{ticket.subject}</p>
                        <p className="text-sm text-gray-500">
                          #{ticket.ticket_number} • {ticket.category}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => navigate(`/tenants/${ticket.tenant_id}`)}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      {ticket.tenant_name}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx('font-medium', priority.color)}>
                      {priority.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx('badge', status.color)}>{status.label}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {ticket.assigned_admin_name || '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {new Date(ticket.updated_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setSelectedTicket(ticket)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="View Conversation"
                      >
                        <ChatBubbleLeftRightIcon className="h-5 w-5 text-primary-500" />
                      </button>
                      {ticket.status !== 'closed' && (
                        <button
                          onClick={() =>
                            updateStatusMutation.mutate({
                              ticketId: ticket.id,
                              status: 'closed',
                            })
                          }
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Close Ticket"
                        >
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        </button>
                      )}
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
            {Math.min(currentPage * pageSize, totalCount)} of {totalCount} tickets
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

      {/* Ticket Detail Modal */}
      <Transition appear show={!!selectedTicket} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setSelectedTicket(null)}>
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
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-xl bg-white shadow-xl transition-all">
                  {selectedTicket && (
                    <>
                      <div className="p-6 border-b border-gray-200">
                        <div className="flex items-start justify-between">
                          <div>
                            <Dialog.Title as="h3" className="text-lg font-semibold text-gray-900">
                              {selectedTicket.subject}
                            </Dialog.Title>
                            <p className="text-sm text-gray-500 mt-1">
                              #{selectedTicket.ticket_number} • {selectedTicket.tenant_name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={clsx(
                                'badge',
                                statusConfig[selectedTicket.status].color
                              )}
                            >
                              {statusConfig[selectedTicket.status].label}
                            </span>
                            <select
                              value={selectedTicket.status}
                              onChange={(e) =>
                                updateStatusMutation.mutate({
                                  ticketId: selectedTicket.id,
                                  status: e.target.value,
                                })
                              }
                              className="input text-sm py-1"
                            >
                              {Object.entries(statusConfig).map(([key, config]) => (
                                <option key={key} value={key}>
                                  {config.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 max-h-96 overflow-y-auto space-y-4">
                        {messagesLoading ? (
                          <div className="flex justify-center py-8">
                            <LoadingSpinner />
                          </div>
                        ) : (
                          ticketMessages?.map((message: TicketMessage) => (
                            <div
                              key={message.id}
                              className={clsx(
                                'p-4 rounded-lg',
                                message.sender_type === 'admin'
                                  ? 'bg-primary-50 ml-8'
                                  : 'bg-gray-50 mr-8'
                              )}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-gray-900">
                                  {message.sender_name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(message.created_at).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-gray-700 whitespace-pre-wrap">{message.content}</p>
                            </div>
                          ))
                        )}
                      </div>

                      <form
                        onSubmit={handleSubmit((data) =>
                          replyMutation.mutate({
                            ticketId: selectedTicket.id,
                            content: data.content,
                          })
                        )}
                        className="p-6 border-t border-gray-200"
                      >
                        <textarea
                          {...register('content', { required: true })}
                          className="input w-full"
                          rows={3}
                          placeholder="Type your reply..."
                        />
                        <div className="flex justify-end gap-3 mt-3">
                          <button
                            type="button"
                            onClick={() => setSelectedTicket(null)}
                            className="btn btn-secondary"
                          >
                            Close
                          </button>
                          <button
                            type="submit"
                            disabled={replyMutation.isPending}
                            className="btn btn-primary"
                          >
                            {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
                          </button>
                        </div>
                      </form>
                    </>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}
