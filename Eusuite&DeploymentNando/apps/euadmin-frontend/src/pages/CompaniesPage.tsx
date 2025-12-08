/**
 * EUAdmin Frontend - Companies Page
 * Manage all tenant companies
 */
import { useState, useEffect } from 'react';
import {
  Building2, Plus, Search, Check, X,
  Trash2, Eye, Rocket, Users, HardDrive,
  AlertTriangle, CheckCircle, Clock, Ban
} from 'lucide-react';
import { companiesApi, type Company } from '../api/tenant';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'suspended'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  
  useEffect(() => {
    loadCompanies();
  }, [page, search, filter]);
  
  async function loadCompanies() {
    setLoading(true);
    try {
      const params: Parameters<typeof companiesApi.list>[0] = {
        page,
        page_size: 20,
        search: search || undefined,
      };
      
      if (filter === 'active') {
        params.is_active = true;
        params.is_approved = true;
      } else if (filter === 'pending') {
        params.is_approved = false;
      } else if (filter === 'suspended') {
        params.is_active = false;
      }
      
      const result = await companiesApi.list(params);
      setCompanies(result.companies);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function handleApprove(id: number) {
    try {
      await companiesApi.approve(id, 1); // TODO: Use actual user ID
      loadCompanies();
    } catch (error) {
      console.error('Failed to approve company:', error);
    }
  }
  
  async function handleSuspend(id: number) {
    const reason = prompt('Reden voor suspensie:');
    if (!reason) return;
    
    try {
      await companiesApi.suspend(id, reason);
      loadCompanies();
    } catch (error) {
      console.error('Failed to suspend company:', error);
    }
  }
  
  async function handleUnsuspend(id: number) {
    try {
      await companiesApi.unsuspend(id);
      loadCompanies();
    } catch (error) {
      console.error('Failed to unsuspend company:', error);
    }
  }
  
  async function handleDelete(id: number) {
    try {
      await companiesApi.delete(id);
      setShowDeleteConfirm(null);
      loadCompanies();
    } catch (error) {
      console.error('Failed to delete company:', error);
    }
  }
  
  function getStatusBadge(company: Company) {
    if (company.is_suspended) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <Ban className="w-3 h-3" /> Suspended
        </span>
      );
    }
    if (!company.is_approved) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          <Clock className="w-3 h-3" /> Pending
        </span>
      );
    }
    if (company.is_active) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle className="w-3 h-3" /> Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        <X className="w-3 h-3" /> Inactive
      </span>
    );
  }
  
  function formatStorage(bytes: number): string {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Building2 className="w-8 h-8 text-primary-600" />
            Companies
          </h1>
          <p className="text-gray-500 mt-1">
            Manage tenant companies and their ecosystems
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Company
        </button>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        
        <div className="flex items-center gap-2">
          {(['all', 'active', 'pending', 'suspended'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f === 'all' ? 'All' : f === 'active' ? 'Active' : f === 'pending' ? 'Pending' : 'Suspended'}
            </button>
          ))}
        </div>
      </div>
      
      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Namespace
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Users
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Storage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Target
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent mx-auto"></div>
                  <p className="mt-2">Loading...</p>
                </td>
              </tr>
            ) : companies.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  <Building2 className="w-12 h-12 mx-auto text-gray-300" />
                  <p className="mt-2">No companies found</p>
                </td>
              </tr>
            ) : (
              companies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900">{company.name}</div>
                      <div className="text-sm text-gray-500">{company.contact_email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {company.namespace || '-'}
                    </code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(company)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {company.user_count || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <HardDrive className="w-4 h-4" />
                      {formatStorage(company.storage_used || 0)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      company.deployment_target === 'central_cloud'
                        ? 'bg-blue-100 text-blue-700'
                        : company.deployment_target === 'company_cloud'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {company.deployment_target === 'central_cloud' ? 'Central' : 
                       company.deployment_target === 'company_cloud' ? 'Company' : 'Self-hosted'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      {!company.is_approved && (
                        <button
                          onClick={() => handleApprove(company.id)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      {company.is_approved && !company.is_suspended && (
                        <button
                          onClick={() => window.location.href = `/companies/${company.id}/deploy`}
                          className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg"
                          title="Deploy"
                        >
                          <Rocket className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedCompany(company)}
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {company.is_suspended ? (
                        <button
                          onClick={() => handleUnsuspend(company.id)}
                          className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                          title="Unsuspend"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSuspend(company.id)}
                          className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg"
                          title="Suspend"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setShowDeleteConfirm(company.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {/* Pagination */}
        {total > 20 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} companies
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * 20 >= total}
                className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-semibold">Delete Company</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this company? This action cannot be undone and will remove all users, data, and deployments.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Create Modal */}
      {showCreateModal && (
        <CreateCompanyModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadCompanies();
          }}
        />
      )}
      
      {/* View Company Modal */}
      {selectedCompany && (
        <ViewCompanyModal
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
        />
      )}
    </div>
  );
}

// Create Company Modal
function CreateCompanyModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    description: '',
    deployment_target: 'central_cloud',
  });
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await companiesApi.create(formData);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create company');
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Create New Company</h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Email *
            </label>
            <input
              type="email"
              required
              value={formData.contact_email}
              onChange={(e) => setFormData(f => ({ ...f, contact_email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Phone
            </label>
            <input
              type="tel"
              value={formData.contact_phone}
              onChange={(e) => setFormData(f => ({ ...f, contact_phone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deployment Target
            </label>
            <select
              value={formData.deployment_target}
              onChange={(e) => setFormData(f => ({ ...f, deployment_target: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="central_cloud">Central EUSuite Cloud</option>
              <option value="company_cloud">Company's Own Cloud</option>
              <option value="self_hosted">Self-hosted (Download YAML)</option>
            </select>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// View Company Modal
function ViewCompanyModal({ company, onClose }: { company: Company; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{company.name}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 uppercase">Slug</label>
              <p className="font-medium">{company.slug}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">Namespace</label>
              <p className="font-medium font-mono">{company.namespace || '-'}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">Contact Email</label>
              <p className="font-medium">{company.contact_email}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">Phone</label>
              <p className="font-medium">{company.contact_phone || '-'}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">Users</label>
              <p className="font-medium">{company.user_count || 0}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">Storage Used</label>
              <p className="font-medium">{((company.storage_used || 0) / 1024 / 1024 / 1024).toFixed(2)} GB</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">Deployment Target</label>
              <p className="font-medium capitalize">{company.deployment_target?.replace('_', ' ')}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">Created</label>
              <p className="font-medium">{company.created_at ? new Date(company.created_at).toLocaleDateString() : '-'}</p>
            </div>
          </div>
          
          {company.description && (
            <div>
              <label className="text-xs text-gray-500 uppercase">Description</label>
              <p className="text-gray-600">{company.description}</p>
            </div>
          )}
          
          {company.suspension_reason && (
            <div className="p-3 bg-red-50 rounded-lg">
              <label className="text-xs text-red-600 uppercase">Suspension Reason</label>
              <p className="text-red-700">{company.suspension_reason}</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => window.location.href = `/companies/${company.id}`}
            className="px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg"
          >
            Manage Company
          </button>
        </div>
      </div>
    </div>
  );
}
