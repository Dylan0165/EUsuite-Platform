/**
 * EUAdmin Frontend - Company Detail Page
 * Comprehensive company management with tabs for users, branding, storage, and deployments
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2, Users, Palette, HardDrive, Rocket,
  ChevronLeft, MoreHorizontal, Power, Trash2,
  Plus, Edit, Mail, Calendar, Globe, Server, Loader2,
  Check, AlertTriangle
} from 'lucide-react';
import {
  companiesApi, companyUsersApi, brandingApi, storagePolicyApi, deploymentsApi,
  type Company, type CompanyUser, type CompanyBranding, type StoragePolicy, type Deployment
} from '../api/tenant';

type Tab = 'overview' | 'users' | 'branding' | 'storage' | 'deployments';

export default function CompanyDetailPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (companyId) {
      loadCompany();
    }
  }, [companyId]);

  async function loadCompany() {
    setLoading(true);
    try {
      const data = await companiesApi.get(Number(companyId));
      setCompany(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load company');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(status: string) {
    if (!company) return;
    try {
      const updated = await companiesApi.update(company.id, { status: status as any });
      setCompany(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  async function handleDelete() {
    if (!company || !confirm(`Delete company "${company.name}"? This cannot be undone.`)) return;
    try {
      await companiesApi.delete(company.id);
      navigate('/companies');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete company');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          {error || 'Company not found'}
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Building2 }[] = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'storage', label: 'Storage', icon: HardDrive },
    { id: 'deployments', label: 'Deployments', icon: Rocket },
  ];

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    active: 'bg-green-100 text-green-700',
    suspended: 'bg-red-100 text-red-700',
    deleted: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/companies"
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 rounded-xl">
              <Building2 className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[company.status]}`}>
                  {company.status}
                </span>
              </div>
              <p className="text-gray-500 font-mono text-sm">{company.namespace}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/companies/${company.id}/deploy`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg"
          >
            <Rocket className="w-4 h-4" />
            Deploy
          </Link>
          <div className="relative group">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <MoreHorizontal className="w-5 h-5" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              {company.status === 'active' && (
                <button
                  onClick={() => handleStatusChange('suspended')}
                  className="w-full px-4 py-2 text-left text-yellow-600 hover:bg-yellow-50 flex items-center gap-2"
                >
                  <Power className="w-4 h-4" />
                  Suspend
                </button>
              )}
              {company.status === 'suspended' && (
                <button
                  onClick={() => handleStatusChange('active')}
                  className="w-full px-4 py-2 text-left text-green-600 hover:bg-green-50 flex items-center gap-2"
                >
                  <Power className="w-4 h-4" />
                  Activate
                </button>
              )}
              <button
                onClick={handleDelete}
                className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-1 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {activeTab === 'overview' && <OverviewTab company={company} />}
        {activeTab === 'users' && <UsersTab companyId={company.id} />}
        {activeTab === 'branding' && <BrandingTab companyId={company.id} />}
        {activeTab === 'storage' && <StorageTab companyId={company.id} />}
        {activeTab === 'deployments' && <DeploymentsTab companyId={company.id} />}
      </div>
    </div>
  );
}

// Tab Components
function OverviewTab({ company }: { company: Company }) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Company Information</h3>
        <div className="space-y-3">
          <InfoRow icon={Building2} label="Name" value={company.name} />
          <InfoRow icon={Globe} label="Slug" value={company.slug} />
          <InfoRow icon={Server} label="Namespace" value={company.namespace || 'Not set'} />
          <InfoRow icon={Mail} label="Domain" value={company.domain || 'Not set'} />
          <InfoRow icon={Users} label="Max Users" value={company.max_users.toString()} />
          <InfoRow icon={HardDrive} label="Max Storage" value={`${company.max_storage_gb} GB`} />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Deployment</h3>
        <div className="space-y-3">
          <InfoRow icon={Rocket} label="Target" value={company.deployment_target?.replace('_', ' ') || 'Central Cloud'} />
          <InfoRow icon={Calendar} label="Created" value={company.created_at ? new Date(company.created_at).toLocaleDateString() : 'Unknown'} />
        </div>

        {company.external_cluster_config && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">External Cluster</h4>
            <pre className="text-xs font-mono text-gray-600 overflow-x-auto">
              {JSON.stringify(company.external_cluster_config, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-gray-400" />
      <span className="text-gray-500 w-24">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  );
}

function UsersTab({ companyId }: { companyId: number }) {
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ first_name: '', last_name: '', email: '', role: 'user' });

  useEffect(() => {
    loadUsers();
  }, [companyId]);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await companyUsersApi.list(companyId);
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    try {
      await companyUsersApi.create(companyId, {
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        email: newUser.email || undefined,
        role: newUser.role as 'admin' | 'user',
      });
      setShowAddModal(false);
      setNewUser({ first_name: '', last_name: '', email: '', role: 'user' });
      loadUsers();
    } catch (err) {
      console.error('Failed to add user:', err);
    }
  }

  async function handleToggleActive(user: CompanyUser) {
    try {
      await companyUsersApi.update(companyId, user.id, { is_active: !user.is_active });
      loadUsers();
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  }

  async function handleDelete(user: CompanyUser) {
    if (!confirm(`Delete user "${user.first_name} ${user.last_name}"?`)) return;
    try {
      await companyUsersApi.delete(companyId, user.id);
      loadUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  }

  if (loading) {
    return <div className="animate-pulse h-40 bg-gray-100 rounded-lg" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Company Users ({users.length})</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg text-sm"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="divide-y border rounded-lg">
        {users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No users yet. Add the first user to get started.
          </div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  user.is_active ? 'bg-primary-100' : 'bg-gray-100'
                }`}>
                  <Users className={`w-5 h-5 ${user.is_active ? 'text-primary-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{user.first_name} {user.last_name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  user.role === 'company_admin' || user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {user.role}
                </span>
                <button
                  onClick={() => handleToggleActive(user)}
                  className={`p-2 rounded hover:bg-gray-100 ${user.is_active ? 'text-green-600' : 'text-gray-400'}`}
                  title={user.is_active ? 'Deactivate' : 'Activate'}
                >
                  <Power className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(user)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Add User</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={newUser.first_name}
                    onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={newUser.last_name}
                    onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Auto-generated if empty"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="user">User</option>
                  <option value="company_admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function BrandingTab({ companyId }: { companyId: number }) {
  const [, setBranding] = useState<CompanyBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    company_display_name: '',
    tagline: '',
    primary_color: '#1E40AF',
    secondary_color: '#3B82F6',
    accent_color: '#60A5FA',
    background_color: '#F8FAFC',
    text_color: '#1E293B',
  });

  useEffect(() => {
    loadBranding();
  }, [companyId]);

  async function loadBranding() {
    setLoading(true);
    try {
      const data = await brandingApi.get(companyId);
      setBranding(data);
      setForm({
        company_display_name: data.company_display_name || '',
        tagline: data.tagline || '',
        primary_color: data.primary_color,
        secondary_color: data.secondary_color,
        accent_color: data.accent_color,
        background_color: data.background_color,
        text_color: data.text_color,
      });
    } catch (err) {
      console.error('Failed to load branding:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      const updated = await brandingApi.update(companyId, form);
      setBranding(updated);
      setEditing(false);
    } catch (err) {
      console.error('Failed to save branding:', err);
    }
  }

  if (loading) {
    return <div className="animate-pulse h-40 bg-gray-100 rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Company Branding</h3>
        <button
          onClick={() => editing ? handleSave() : setEditing(true)}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
            editing 
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          {editing ? <Check className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
          {editing ? 'Save' : 'Edit'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input
              type="text"
              value={form.company_display_name}
              onChange={(e) => setForm({ ...form, company_display_name: e.target.value })}
              disabled={!editing}
              className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
            <input
              type="text"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              disabled={!editing}
              className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-50"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                  disabled={!editing}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={form.primary_color}
                  onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                  disabled={!editing}
                  className="flex-1 px-3 py-2 border rounded-lg font-mono text-sm disabled:bg-gray-50"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.secondary_color}
                  onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
                  disabled={!editing}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={form.secondary_color}
                  onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
                  disabled={!editing}
                  className="flex-1 px-3 py-2 border rounded-lg font-mono text-sm disabled:bg-gray-50"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Accent</label>
              <input
                type="color"
                value={form.accent_color}
                onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                disabled={!editing}
                className="w-full h-10 rounded border cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Background</label>
              <input
                type="color"
                value={form.background_color}
                onChange={(e) => setForm({ ...form, background_color: e.target.value })}
                disabled={!editing}
                className="w-full h-10 rounded border cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Text</label>
              <input
                type="color"
                value={form.text_color}
                onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                disabled={!editing}
                className="w-full h-10 rounded border cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="border rounded-lg overflow-hidden">
          <div
            className="p-6"
            style={{ backgroundColor: form.background_color }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-lg"
                style={{ backgroundColor: form.primary_color }}
              />
              <div>
                <h4 style={{ color: form.text_color }} className="font-bold">
                  {form.company_display_name || 'Company Name'}
                </h4>
                <p style={{ color: form.text_color, opacity: 0.7 }} className="text-sm">
                  {form.tagline || 'Your tagline here'}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <button
                className="w-full py-2 rounded text-white font-medium"
                style={{ backgroundColor: form.primary_color }}
              >
                Primary Button
              </button>
              <button
                className="w-full py-2 rounded text-white font-medium"
                style={{ backgroundColor: form.secondary_color }}
              >
                Secondary Button
              </button>
              <button
                className="w-full py-2 rounded border font-medium"
                style={{ borderColor: form.accent_color, color: form.accent_color }}
              >
                Accent Button
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StorageTab({ companyId }: { companyId: number }) {
  const [, setPolicy] = useState<StoragePolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    policy_type: 'HYBRID',
    max_file_size_mb: 100,
    allowed_extensions: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.mp3',
    blocked_extensions: '.exe,.bat,.sh,.cmd,.msi,.dll',
  });

  useEffect(() => {
    loadPolicy();
  }, [companyId]);

  async function loadPolicy() {
    setLoading(true);
    try {
      const data = await storagePolicyApi.get(companyId);
      setPolicy(data);
      setForm({
        policy_type: data.policy_type,
        max_file_size_mb: data.max_file_size_mb,
        allowed_extensions: data.allowed_extensions.join(','),
        blocked_extensions: data.blocked_extensions.join(','),
      });
    } catch (err) {
      console.error('Failed to load storage policy:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      const updated = await storagePolicyApi.update(companyId, {
        policy_type: form.policy_type as any,
        max_file_size_mb: form.max_file_size_mb,
        allowed_extensions: form.allowed_extensions.split(',').map(s => s.trim()).filter(Boolean),
        blocked_extensions: form.blocked_extensions.split(',').map(s => s.trim()).filter(Boolean),
      });
      setPolicy(updated);
      setEditing(false);
    } catch (err) {
      console.error('Failed to save policy:', err);
    }
  }

  if (loading) {
    return <div className="animate-pulse h-40 bg-gray-100 rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Storage Policy</h3>
        <button
          onClick={() => editing ? handleSave() : setEditing(true)}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
            editing 
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          {editing ? <Check className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
          {editing ? 'Save' : 'Edit'}
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Storage Type</label>
          <div className="grid grid-cols-3 gap-4">
            {['COMPANY_ONLY', 'EUCLOUD_ONLY', 'HYBRID'].map((type) => (
              <label
                key={type}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  form.policy_type === type
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${!editing ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name="policy_type"
                  value={type}
                  checked={form.policy_type === type}
                  onChange={(e) => setForm({ ...form, policy_type: e.target.value })}
                  disabled={!editing}
                  className="sr-only"
                />
                <p className="font-medium text-gray-900">{type.replace('_', ' ')}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {type === 'COMPANY_ONLY' && 'Files stored only in company namespace'}
                  {type === 'EUCLOUD_ONLY' && 'Files stored in central EUCloud'}
                  {type === 'HYBRID' && 'Files can be stored in both locations'}
                </p>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max File Size (MB)</label>
          <input
            type="number"
            value={form.max_file_size_mb}
            onChange={(e) => setForm({ ...form, max_file_size_mb: Number(e.target.value) })}
            disabled={!editing}
            className="w-32 px-3 py-2 border rounded-lg disabled:bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Extensions</label>
          <textarea
            value={form.allowed_extensions}
            onChange={(e) => setForm({ ...form, allowed_extensions: e.target.value })}
            disabled={!editing}
            rows={2}
            className="w-full px-3 py-2 border rounded-lg font-mono text-sm disabled:bg-gray-50"
            placeholder=".pdf,.doc,.jpg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Blocked Extensions</label>
          <textarea
            value={form.blocked_extensions}
            onChange={(e) => setForm({ ...form, blocked_extensions: e.target.value })}
            disabled={!editing}
            rows={2}
            className="w-full px-3 py-2 border rounded-lg font-mono text-sm disabled:bg-gray-50"
            placeholder=".exe,.bat,.sh"
          />
        </div>
      </div>
    </div>
  );
}

function DeploymentsTab({ companyId }: { companyId: number }) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeployments();
  }, [companyId]);

  async function loadDeployments() {
    setLoading(true);
    try {
      const data = await deploymentsApi.listForCompany(companyId);
      setDeployments(data);
    } catch (err) {
      console.error('Failed to load deployments:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="animate-pulse h-40 bg-gray-100 rounded-lg" />;
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    rollback: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Deployment History</h3>
        <Link
          to={`/companies/${companyId}/deploy`}
          className="inline-flex items-center gap-2 px-3 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg text-sm"
        >
          <Rocket className="w-4 h-4" />
          New Deployment
        </Link>
      </div>

      <div className="divide-y border rounded-lg">
        {deployments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No deployments yet. Deploy the company ecosystem to get started.
          </div>
        ) : (
          deployments.map((deployment) => (
            <div key={deployment.deployment_id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${
                  deployment.status === 'completed' ? 'bg-green-100' :
                  deployment.status === 'failed' ? 'bg-red-100' : 'bg-blue-100'
                }`}>
                  <Rocket className={`w-5 h-5 ${
                    deployment.status === 'completed' ? 'text-green-600' :
                    deployment.status === 'failed' ? 'text-red-600' : 'text-blue-600'
                  }`} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{deployment.deployment_type}</p>
                  <p className="text-sm text-gray-500">
                    {deployment.created_at ? new Date(deployment.created_at).toLocaleString() : 'Unknown'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[deployment.status]}`}>
                  {deployment.status}
                </span>
                {deployment.duration_seconds && (
                  <span className="text-sm text-gray-500">
                    {deployment.duration_seconds}s
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
