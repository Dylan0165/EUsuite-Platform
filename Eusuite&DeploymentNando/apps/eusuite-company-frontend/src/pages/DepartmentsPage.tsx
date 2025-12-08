import { useState, useEffect } from 'react'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner'

interface Department {
  id: number
  name: string
  description: string | null
  parent_id: number | null
  manager_id: number | null
  is_active: boolean
  user_count?: number
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.get('/departments')
      setDepartments(response.data.departments)
    } catch {
      // Mock data
      setDepartments([
        { id: 1, name: 'Engineering', description: 'Software development team', parent_id: null, manager_id: 1, is_active: true, user_count: 25 },
        { id: 2, name: 'Frontend', description: 'Frontend developers', parent_id: 1, manager_id: 2, is_active: true, user_count: 10 },
        { id: 3, name: 'Backend', description: 'Backend developers', parent_id: 1, manager_id: 3, is_active: true, user_count: 15 },
        { id: 4, name: 'Sales', description: 'Sales team', parent_id: null, manager_id: 4, is_active: true, user_count: 12 },
        { id: 5, name: 'Marketing', description: 'Marketing team', parent_id: null, manager_id: 5, is_active: true, user_count: 8 },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this department?')) return

    try {
      await apiClient.delete(`/departments/${id}`)
      toast.success('Department deleted')
      fetchDepartments()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete department')
    }
  }

  const getParentName = (parentId: number | null) => {
    if (!parentId) return '-'
    const parent = departments.find((d) => d.id === parentId)
    return parent?.name || '-'
  }

  // Build tree structure
  const buildTree = (parentId: number | null = null): Department[] => {
    return departments
      .filter((d) => d.parent_id === parentId)
      .map((d) => ({
        ...d,
        children: buildTree(d.id),
      }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
          <p className="text-gray-500 mt-1">Organize your team structure</p>
        </div>
        <button
          onClick={() => {
            setEditingDept(null)
            setShowModal(true)
          }}
          className="btn btn-primary"
        >
          <PlusIcon className="h-5 w-5" />
          Add Department
        </button>
      </div>

      {/* Departments grid */}
      {isLoading ? (
        <div className="py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <div key={dept.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {dept.description || 'No description'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditingDept(dept)
                      setShowModal(true)
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(dept.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-gray-500">
                    <UsersIcon className="h-4 w-4" />
                    {dept.user_count || 0} members
                  </div>
                  {dept.parent_id && (
                    <span className="text-gray-400">
                      Parent: {getParentName(dept.parent_id)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <DepartmentModal
          department={editingDept}
          departments={departments}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            fetchDepartments()
          }}
        />
      )}
    </div>
  )
}

function DepartmentModal({
  department,
  departments,
  onClose,
  onSuccess,
}: {
  department: Department | null
  departments: Department[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: department?.name || '',
    description: department?.description || '',
    parent_id: department?.parent_id || null,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (department) {
        await apiClient.put(`/departments/${department.id}`, formData)
        toast.success('Department updated')
      } else {
        await apiClient.post('/departments', formData)
        toast.success('Department created')
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
            {department ? 'Edit Department' : 'Create Department'}
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
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">Parent Department</label>
              <select
                className="form-input"
                value={formData.parent_id || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    parent_id: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
              >
                <option value="">None (Top Level)</option>
                {departments
                  .filter((d) => d.id !== department?.id)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="btn btn-primary">
              {isLoading ? (
                <LoadingSpinner size="sm" />
              ) : department ? (
                'Save Changes'
              ) : (
                'Create'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
