import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import type { LmsUser } from '../../shared/types';

const ROLES = ['admin', 'manager', 'employee'] as const;
const GENRES = ['rock', 'hip-hop', 'country', 'classical', 'pop', 'jazz', 'electronic'] as const;

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-500/20 text-red-300',
  manager: 'bg-amber-500/20 text-amber-300',
  employee: 'bg-blue-500/20 text-blue-300',
};

interface UserForm {
  name: string;
  email: string;
  department: string;
  role: string;
  preferredGenre: string;
}

const emptyForm: UserForm = { name: '', email: '', department: '', role: 'employee', preferredGenre: '' };

export default function UsersView() {
  const { users, setUsers, addUser, updateUser, removeUser } = useAppStore();
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    window.electronAPI.getUsers().then((data) => setUsers(data));
  }, [setUsers]);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.department.toLowerCase().includes(q),
    );
  }, [users, search]);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setShowAddForm(true);
  }

  function openEdit(user: LmsUser) {
    setShowAddForm(false);
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      department: user.department,
      role: user.role,
      preferredGenre: user.preferredGenre ?? '',
    });
  }

  function cancelForm() {
    setShowAddForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        const updated = await window.electronAPI.updateUser(editingId, {
          name: form.name,
          email: form.email,
          department: form.department,
          role: form.role,
          preferredGenre: form.preferredGenre || null,
        });
        updateUser(editingId, updated);
        setEditingId(null);
      } else {
        const created = await window.electronAPI.createUser({
          name: form.name,
          email: form.email,
          department: form.department,
          role: form.role,
          preferredGenre: form.preferredGenre || null,
        });
        addUser(created);
        setShowAddForm(false);
      }
      setForm(emptyForm);
    } catch (err) {
      console.error('Failed to save user:', err);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setSaving(true);
    try {
      await window.electronAPI.deleteUser(id);
      removeUser(id);
      if (editingId === id) cancelForm();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
    setDeleteConfirmId(null);
    setSaving(false);
  }

  function renderFormRow(isNew: boolean) {
    return (
      <tr className="bg-slate-700/50">
        <td className="px-3 py-2">
          <input
            type="text"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-slate-600 text-white text-sm rounded px-2 py-1 border border-slate-500 focus:border-blue-400 focus:outline-none"
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full bg-slate-600 text-white text-sm rounded px-2 py-1 border border-slate-500 focus:border-blue-400 focus:outline-none"
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="text"
            placeholder="Department"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            className="w-full bg-slate-600 text-white text-sm rounded px-2 py-1 border border-slate-500 focus:border-blue-400 focus:outline-none"
          />
        </td>
        <td className="px-3 py-2">
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full bg-slate-600 text-white text-sm rounded px-2 py-1 border border-slate-500 focus:border-blue-400 focus:outline-none"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2">
          <select
            value={form.preferredGenre}
            onChange={(e) => setForm({ ...form, preferredGenre: e.target.value })}
            className="w-full bg-slate-600 text-white text-sm rounded px-2 py-1 border border-slate-500 focus:border-blue-400 focus:outline-none"
          >
            <option value="">None</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || !form.email.trim()}
              className="px-2.5 py-1 text-xs font-medium rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition"
            >
              {saving ? '...' : isNew ? 'Add' : 'Save'}
            </button>
            <button
              onClick={cancelForm}
              className="px-2.5 py-1 text-xs font-medium rounded bg-slate-600 hover:bg-slate-500 text-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Manage employees and their training preferences.
          </p>
        </div>
        <button
          onClick={openAdd}
          disabled={showAddForm}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition"
        >
          + Add User
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm bg-slate-800 text-white text-sm rounded-lg px-3 py-2 border border-slate-700 focus:border-blue-400 focus:outline-none placeholder-gray-500"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-gray-400 text-xs uppercase tracking-wider">
              <th className="text-left px-3 py-2.5 font-medium">Name</th>
              <th className="text-left px-3 py-2.5 font-medium">Email</th>
              <th className="text-left px-3 py-2.5 font-medium">Department</th>
              <th className="text-left px-3 py-2.5 font-medium">Role</th>
              <th className="text-left px-3 py-2.5 font-medium">Genre</th>
              <th className="text-left px-3 py-2.5 font-medium w-36">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {showAddForm && renderFormRow(true)}
            {filtered.length === 0 && !showAddForm && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                  {search ? 'No users match your search.' : 'No users yet. Click "Add User" to get started.'}
                </td>
              </tr>
            )}
            {filtered.map((user) =>
              editingId === user.id ? (
                <React.Fragment key={user.id}>{renderFormRow(false)}</React.Fragment>
              ) : (
                <tr
                  key={user.id}
                  onClick={() => openEdit(user)}
                  className="hover:bg-slate-700/40 cursor-pointer transition"
                >
                  <td className="px-3 py-2.5 text-gray-200 font-medium">{user.name}</td>
                  <td className="px-3 py-2.5 text-gray-400">{user.email}</td>
                  <td className="px-3 py-2.5 text-gray-400">{user.department}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user.role] ?? 'bg-slate-600 text-gray-300'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-gray-400 capitalize">{user.preferredGenre ?? '--'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openEdit(user)}
                        className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-gray-300 transition"
                      >
                        Edit
                      </button>
                      {deleteConfirmId === user.id ? (
                        <>
                          <button
                            onClick={() => handleDelete(user.id)}
                            disabled={saving}
                            className="px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-500 text-white transition"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-gray-300 transition"
                          >
                            No
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(user.id)}
                          className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-red-600/80 text-gray-400 hover:text-white transition"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      <p className="text-xs text-gray-500 mt-3">
        {filtered.length} user{filtered.length !== 1 ? 's' : ''}{search ? ' matched' : ' total'}
      </p>
    </div>
  );
}
