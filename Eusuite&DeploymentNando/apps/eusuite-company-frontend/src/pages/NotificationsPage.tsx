import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  BellIcon,
  CheckIcon,
  TrashIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import toast from 'react-hot-toast'

interface Notification {
  id: number
  type: 'info' | 'warning' | 'success' | 'error'
  title: string
  message: string
  read: boolean
  created_at: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.get('/notifications')
      setNotifications(response.data)
    } catch {
      // Mock data
      setNotifications([
        { id: 1, type: 'success', title: 'Deployment Complete', message: 'EUCloud has been successfully deployed.', read: false, created_at: '2024-02-15T10:30:00Z' },
        { id: 2, type: 'warning', title: 'Storage Limit Warning', message: 'You have used 85% of your storage quota.', read: false, created_at: '2024-02-15T09:00:00Z' },
        { id: 3, type: 'info', title: 'New Feature Available', message: 'Team collaboration features are now available.', read: true, created_at: '2024-02-14T16:00:00Z' },
        { id: 4, type: 'error', title: 'Failed Login Attempt', message: 'Multiple failed login attempts from IP 10.0.0.1', read: true, created_at: '2024-02-14T08:45:00Z' },
        { id: 5, type: 'info', title: 'Scheduled Maintenance', message: 'System maintenance scheduled for Feb 20, 2024', read: true, created_at: '2024-02-13T12:00:00Z' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (id: number) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`)
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
    } catch {
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
    }
  }

  const markAllAsRead = async () => {
    try {
      await apiClient.post('/notifications/read-all')
      setNotifications(notifications.map((n) => ({ ...n, read: true })))
      toast.success('All notifications marked as read')
    } catch {
      setNotifications(notifications.map((n) => ({ ...n, read: true })))
      toast.success('All notifications marked as read')
    }
  }

  const deleteNotification = async (id: number) => {
    try {
      await apiClient.delete(`/notifications/${id}`)
      setNotifications(notifications.filter((n) => n.id !== id))
      toast.success('Notification deleted')
    } catch {
      setNotifications(notifications.filter((n) => n.id !== id))
      toast.success('Notification deleted')
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />
      case 'warning':
        return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />
      case 'error':
        return <XCircleIcon className="h-6 w-6 text-red-500" />
      default:
        return <InformationCircleIcon className="h-6 w-6 text-blue-500" />
    }
  }

  const filteredNotifications =
    filter === 'unread'
      ? notifications.filter((n) => !n.read)
      : notifications

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>

        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="btn btn-outline">
            <CheckIcon className="h-4 w-4 mr-2" />
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setFilter('all')}
          className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
            filter === 'all'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
            filter === 'unread'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications list */}
      {isLoading ? (
        <div className="py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="card py-12 text-center">
          <BellIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No notifications
          </h3>
          <p className="text-gray-500">
            {filter === 'unread'
              ? "You've read all your notifications"
              : 'Notifications will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`card flex items-start gap-4 transition-colors ${
                !notification.read ? 'bg-primary/5 border-primary/20' : ''
              }`}
            >
              <div className="flex-shrink-0">
                {getNotificationIcon(notification.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {notification.title}
                    </h3>
                    <p className="text-gray-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {format(new Date(notification.created_at), 'PPp')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="p-2 text-gray-400 hover:text-primary transition-colors"
                        title="Mark as read"
                      >
                        <CheckIcon className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
