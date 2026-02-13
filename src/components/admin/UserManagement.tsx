"use client";
import React, { useState, useEffect } from 'react';
import { useToast } from '../ui/toast-context';
import { Trash2, UserPlus, Shield } from 'lucide-react';

type AdminUser = {
    id: string;
    email: string;
    role: string;
    createdAt: string;
};

export function UserManagement() {
    const { addToast } = useToast();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);

    // New User State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('admin');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch('/api/admin/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setUsers(await res.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ email, password, role })
            });

            if (res.ok) {
                addToast('User created', 'success');
                setShowAdd(false);
                setEmail('');
                setPassword('');
                fetchUsers();
            } else {
                addToast('Failed to create user', 'error');
            }
        } catch (e) {
            addToast('Error creating user', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to remove this admin?')) return;
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`/api/admin/users/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                addToast('User deleted', 'success');
                fetchUsers();
            } else {
                const d = await res.json();
                addToast(d.error || 'Failed', 'error');
            }
        } catch (e) {
            addToast('Error deleting user', 'error');
        }
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-brand-gold" />
                    Admin Users
                </h3>
                <button
                    onClick={() => setShowAdd(!showAdd)}
                    className="flex items-center gap-2 text-sm bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition"
                >
                    <UserPlus className="w-4 h-4" />
                    Add Admin
                </button>
            </div>

            {showAdd && (
                <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200 animate-in slide-in-from-top-2">
                    <h4 className="font-semibold text-slate-800 mb-4">New Admin Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                            placeholder="Email"
                            className="bg-white px-4 py-2 rounded border border-slate-300 text-slate-900"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                        <input
                            placeholder="Initial Password"
                            type="password"
                            className="bg-white px-4 py-2 rounded border border-slate-300 text-slate-900"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                        <button
                            onClick={handleCreate}
                            className="bg-brand-green text-white px-4 py-2 rounded hover:bg-green-700"
                        >
                            Create User
                        </button>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200 text-slate-500 text-sm">
                            <th className="py-3 px-2">Email</th>
                            <th className="py-3 px-2">Role</th>
                            <th className="py-3 px-2">Created</th>
                            <th className="py-3 px-2 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition">
                                <td className="py-3 px-2 text-slate-900 font-medium">{u.email}</td>
                                <td className="py-3 px-2">
                                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs uppercase font-bold tracking-wider">
                                        {u.role}
                                    </span>
                                </td>
                                <td className="py-3 px-2 text-slate-500 text-sm">
                                    {new Date(u.createdAt).toLocaleDateString()}
                                </td>
                                <td className="py-3 px-2 text-right">
                                    <button
                                        onClick={() => handleDelete(u.id)}
                                        className="text-slate-400 hover:text-red-600 p-2 transition"
                                        title="Remove User"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {users.length === 0 && !loading && (
                    <div className="text-center py-8 text-slate-400">No users found</div>
                )}
            </div>
        </div>
    );
}
