import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  MoreVertical,
  Trash2,
  UserCheck,
  UserX,
  Send,
} from 'lucide-react';
import { usersApi, CompanyUser, CreateUserRequest } from '../api/client';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

const mockUsers: CompanyUser[] = [
  {
    id: 1,
    email: 'jan@bedrijf.nl',
    first_name: 'Jan',
    last_name: 'Jansen',
    role: 'admin',
    status: 'active',
    created_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
  },
  {
    id: 2,
    email: 'lisa@bedrijf.nl',
    first_name: 'Lisa',
    last_name: 'de Vries',
    role: 'user',
    status: 'active',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    last_login: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    email: 'peter@bedrijf.nl',
    first_name: 'Peter',
    last_name: 'van Dijk',
    role: 'user',
    status: 'pending',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function UsersPage() {
  const [users, setUsers] = useState<CompanyUser[]>(mockUsers);
  const [search, setSearch] = useState('');
  const [_loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);

  const [newUser, setNewUser] = useState<CreateUserRequest>({
    email: '',
    first_name: '',
    last_name: '',
    role: 'user',
    send_invite: true,
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await usersApi.list();
        setUsers(data);
      } catch {
        console.log('Using mock data');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.first_name.toLowerCase().includes(search.toLowerCase()) ||
      user.last_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await usersApi.create(newUser);
      setUsers([...users, created]);
      setShowModal(false);
      setNewUser({
        email: '',
        first_name: '',
        last_name: '',
        role: 'user',
        send_invite: true,
      });
    } catch {
      // Mock create
      const mockCreated: CompanyUser = {
        id: users.length + 1,
        ...newUser,
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      setUsers([...users, mockCreated]);
      setShowModal(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Weet je zeker dat je deze gebruiker wilt verwijderen?')) return;
    
    try {
      await usersApi.delete(id);
      setUsers(users.filter((u) => u.id !== id));
    } catch {
      setUsers(users.filter((u) => u.id !== id));
    }
  };

  const handleResendInvite = async (id: number) => {
    try {
      await usersApi.resendInvite(id);
      alert('Uitnodiging opnieuw verstuurd!');
    } catch {
      alert('Uitnodiging opnieuw verstuurd! (mock)');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gebruikers</h1>
          <p className="text-gray-600">Beheer de gebruikers van je organisatie</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Gebruiker Toevoegen
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Zoek gebruikers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Gebruiker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Laatste Login
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-medium">
                          {user.first_name[0]}{user.last_name[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {user.role === 'admin' ? 'Admin' : 'Gebruiker'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                      user.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {user.status === 'active' ? (
                        <><UserCheck className="w-3 h-3" /> Actief</>
                      ) : (
                        <><UserX className="w-3 h-3" /> Uitnodiging verstuurd</>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.last_login
                      ? format(new Date(user.last_login), 'd MMM yyyy, HH:mm', { locale: nl })
                      : 'Nooit'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === user.id ? null : user.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-500" />
                      </button>
                      
                      {menuOpen === user.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setMenuOpen(null)}
                          />
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                            <button
                              onClick={() => {
                                handleResendInvite(user.id);
                                setMenuOpen(null);
                              }}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Send className="w-4 h-4" />
                              Uitnodiging Versturen
                            </button>
                            <button
                              onClick={() => {
                                handleDeleteUser(user.id);
                                setMenuOpen(null);
                              }}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                              Verwijderen
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Nieuwe Gebruiker
            </h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Voornaam
                  </label>
                  <input
                    type="text"
                    required
                    value={newUser.first_name}
                    onChange={(e) =>
                      setNewUser({ ...newUser, first_name: e.target.value })
                    }
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Achternaam
                  </label>
                  <input
                    type="text"
                    required
                    value={newUser.last_name}
                    onChange={(e) =>
                      setNewUser({ ...newUser, last_name: e.target.value })
                    }
                    className="input"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mailadres
                </label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value })
                  }
                  className="input"
                >
                  <option value="user">Gebruiker</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newUser.send_invite}
                  onChange={(e) =>
                    setNewUser({ ...newUser, send_invite: e.target.checked })
                  }
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm text-gray-700">
                  Stuur uitnodigingsmail
                </span>
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Annuleren
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Toevoegen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
