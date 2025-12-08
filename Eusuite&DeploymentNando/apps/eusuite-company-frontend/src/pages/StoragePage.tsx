import { useState, useEffect } from 'react'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CircleStackIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner'

interface StoragePolicy {
  id: number
  name: string
  description: string | null
  max_file_size_mb: number
  max_storage_gb: number
  allowed_extensions: string[]
  retention_days: number
  is_default: boolean
}

interface StorageStats {
  total_storage_gb: number
  used_storage_gb: number
  available_storage_gb: number
  usage_percentage: number
}

export default function StoragePage() {
  const [policies, setPolicies] = useState<StoragePolicy[]>([])
  const [stats, setStats] = useState<StorageStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<StoragePolicy | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [policiesRes, statsRes] = await Promise.all([
        apiClient.get('/storage/policies'),
        apiClient.get('/storage/usage'),
      ])
      setPolicies(policiesRes.data.policies)
      setStats(statsRes.data)
    } catch {
      // Mock data
      setPolicies([
        { id: 1, name: 'Default', description: 'Default storage policy', max_file_size_mb: 100, max_storage_gb: 5, allowed_extensions: [], retention_days: 365, is_default: true },
        { id: 2, name: 'Power User', description: 'Extended storage for power users', max_file_size_mb: 500, max_storage_gb: 25, allowed_extensions: [], retention_days: 365, is_default: false },
        { id: 3, name: 'Media', description: 'For designers and media files', max_file_size_mb: 1000, max_storage_gb: 50, allowed_extensions: ['.jpg', '.png', '.mp4', '.pdf'], retention_days: 730, is_default: false },
      ])
      setStats({
        total_storage_gb: 100,
        used_storage_gb: 42,
        available_storage_gb: 58,
        usage_percentage: 42,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this policy?')) return

    try {
      await apiClient.delete(`/storage/policies/${id}`)
      toast.success('Policy deleted')
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete policy')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Storage</h1>
        <p className="text-gray-500 mt-1">Manage storage policies and quotas</p>
      </div>

      {/* Usage overview */}
      {stats && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="card-title">Storage Usage</h2>
            <span className="text-2xl font-bold" style={{ color: 'var(--brand-primary)' }}>
              {stats.usage_percentage}%
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div
              className="h-4 rounded-full transition-all"
              style={{
                width: `${stats.usage_percentage}%`,
                backgroundColor: 'var(--brand-primary)',
              }}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.used_storage_gb} GB
              </p>
              <p className="text-sm text-gray-500">Used</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.available_storage_gb} GB
              </p>
              <p className="text-sm text-gray-500">Available</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.total_storage_gb} GB
              </p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
          </div>
        </div>
      )}

      {/* Policies */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Storage Policies</h2>
        <button
          onClick={() => {
            setEditingPolicy(null)
            setShowModal(true)
          }}
          className="btn btn-primary"
        >
          <PlusIcon className="h-5 w-5" />
          Add Policy
        </button>
      </div>

      {isLoading ? (
        <div className="py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {policies.map((policy) => (
            <div key={policy.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: 'var(--brand-primary)', opacity: 0.1 }}
                  >
                    <CircleStackIcon
                      className="h-6 w-6"
                      style={{ color: 'var(--brand-primary)' }}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{policy.name}</h3>
                    {policy.is_default && (
                      <span className="badge badge-success text-xs">Default</span>
                    )}
                  </div>
                </div>
                {!policy.is_default && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingPolicy(policy)
                        setShowModal(true)
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(policy.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-500 mt-2">
                {policy.description || 'No description'}
              </p>

              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Max file size</span>
                  <span className="font-medium">{policy.max_file_size_mb} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Storage limit</span>
                  <span className="font-medium">{policy.max_storage_gb} GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Retention</span>
                  <span className="font-medium">{policy.retention_days} days</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <PolicyModal
          policy={editingPolicy}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            fetchData()
          }}
        />
      )}
    </div>
  )
}

function PolicyModal({
  policy,
  onClose,
  onSuccess,
}: {
  policy: StoragePolicy | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: policy?.name || '',
    description: policy?.description || '',
    max_file_size_mb: policy?.max_file_size_mb || 100,
    max_storage_gb: policy?.max_storage_gb || 10,
    retention_days: policy?.retention_days || 365,
    is_default: policy?.is_default || false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (policy) {
        await apiClient.put(`/storage/policies/${policy.id}`, formData)
        toast.success('Policy updated')
      } else {
        await apiClient.post('/storage/policies', formData)
        toast.success('Policy created')
      }
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Operation failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-lg font-semibold">
            {policy ? 'Edit Policy' : 'Create Policy'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                type="text"
                required
                className="form-input"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                rows={2}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Max File Size (MB)</label>
                <input
                  type="number"
                  min={1}
                  className="form-input"
                  value={formData.max_file_size_mb}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_file_size_mb: parseInt(e.target.value) || 100,
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">Storage Limit (GB)</label>
                <input
                  type="number"
                  min={1}
                  className="form-input"
                  value={formData.max_storage_gb}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_storage_gb: parseInt(e.target.value) || 10,
                    })
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Retention Days</label>
              <input
                type="number"
                min={1}
                className="form-input"
                value={formData.retention_days}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    retention_days: parseInt(e.target.value) || 365,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(e) =>
                    setFormData({ ...formData, is_default: e.target.checked })
                  }
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm">Set as default policy</span>
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="btn btn-primary">
              {isLoading ? <LoadingSpinner size="sm" /> : policy ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
