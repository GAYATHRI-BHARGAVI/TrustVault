'use client';

import React, { useState, useEffect } from 'react';
import { Users, Shield, UserCheck, UserX, ShieldAlert, CheckCircle2, RefreshCw, KeyRound, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';

interface AdminUsersTabProps {
  currentUser: any;
  onRefresh: () => void;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({ currentUser, onRefresh }) => {
  const [users, setUsers] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.adminListUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleStatus = async (user: any) => {
    const newStatus = !user.is_active;
    const actionWord = newStatus ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${actionWord} account '${user.email}'? ${!newStatus ? 'All active sessions will be terminated immediately.' : ''}`)) {
      return;
    }

    try {
      setUpdatingId(user.id);
      setError(null);
      const res = await api.adminUpdateUserStatus(user.id, newStatus);
      setMessage(res.message);
      await loadUsers();
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setUpdatingId(userId);
      setError(null);
      const res = await api.adminUpdateUserRole(userId, newRole);
      setMessage(res.message);
      await loadUsers();
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            <Users className="w-6 h-6 text-[#42D9FF]" />
            <span>Administrative User & Role Management</span>
          </h2>
          <p className="text-sm text-[#B6C9E3] mt-1">
            Enforce the 3 core application roles (ADMIN, OWNER, VIEWER) and manage account activation status.
          </p>
        </div>

        <button
          disabled={loading}
          onClick={loadUsers}
          className="px-4 py-2.5 rounded-xl bg-[#091D36] hover:bg-[#0E2C52] border border-[rgba(116,177,235,0.25)] text-[#DCEEFF] text-xs sm:text-sm font-semibold flex items-center space-x-2 transition"
        >
          <RefreshCw className={`w-4 h-4 text-[#42D9FF] ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Users</span>
        </button>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-700/60 text-xs sm:text-sm text-emerald-200 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-700/60 text-xs sm:text-sm text-rose-200 flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Role Definitions Reference Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="p-5 rounded-2xl glass-card-static border border-[rgba(116,177,235,0.22)] space-y-1.5">
          <div className="flex items-center space-x-2 text-xs sm:text-sm font-bold text-[#42D9FF] uppercase tracking-wider">
            <Shield className="w-4 h-4" />
            <span>ADMIN Role</span>
          </div>
          <p className="text-xs text-[#B6C9E3] leading-relaxed">
            Full platform oversight, user status and role management, fleet risk telemetry, and emergency session revocation.
          </p>
        </div>

        <div className="p-5 rounded-2xl glass-card-static border border-[rgba(116,177,235,0.22)] space-y-1.5">
          <div className="flex items-center space-x-2 text-xs sm:text-sm font-bold text-emerald-400 uppercase tracking-wider">
            <UserCheck className="w-4 h-4" />
            <span>OWNER Role</span>
          </div>
          <p className="text-xs text-[#B6C9E3] leading-relaxed">
            Standard user. Can upload encrypted documents, grant/revoke recipient access for own documents, and purge own files.
          </p>
        </div>

        <div className="p-5 rounded-2xl glass-card-static border border-[rgba(116,177,235,0.22)] space-y-1.5">
          <div className="flex items-center space-x-2 text-xs sm:text-sm font-bold text-[#DCEEFF] uppercase tracking-wider">
            <KeyRound className="w-4 h-4 text-[#168BFF]" />
            <span>VIEWER Role</span>
          </div>
          <p className="text-xs text-[#B6C9E3] leading-relaxed">
            Read-only access. Can view/download documents only when granted explicit unexpired access. Blocked from uploading or sharing.
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl glass-card-static border border-[rgba(116,177,235,0.22)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[rgba(116,177,235,0.2)] bg-[#091D36]/80 flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
            Registered Identity Accounts ({users.length})
          </h3>
          <span className="text-xs font-mono text-[#859DBE]">
            Server-Validated RBAC
          </span>
        </div>

        <div className="divide-y divide-[rgba(116,177,235,0.15)]">
          {users.map((u) => {
            const isUpdating = updatingId === u.id;
            const isSelf = currentUser?.id === u.id;

            return (
              <div
                key={u.id}
                className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-[#0E284A]/40 transition"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-base font-bold text-white">{u.full_name}</span>
                    {isSelf && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#0A223F] text-[#42D9FF] border border-[#168BFF]/40 font-bold">
                        YOU
                      </span>
                    )}
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-md font-bold uppercase ${
                        u.role === 'ADMIN'
                          ? 'bg-[#0E284A] text-[#42D9FF] border border-[#168BFF]/40'
                          : u.role === 'OWNER'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                          : 'bg-blue-950/80 text-blue-300 border border-blue-700/60'
                      }`}
                    >
                      {u.role}
                    </span>
                    {u.is_active ? (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-rose-950 text-rose-400 border border-rose-800">
                        DEACTIVATED
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 text-xs sm:text-sm text-[#859DBE] font-mono">
                    <span>{u.email}</span>
                    <span>•</span>
                    <span>{u.documents_count} document(s) owned</span>
                    <span>•</span>
                    <span>{u.active_sessions_count} active session(s)</span>
                  </div>
                </div>

                {/* Actions: Change Role & Toggle Status */}
                <div className="flex items-center space-x-2.5 w-full md:w-auto justify-end flex-shrink-0">
                  {/* Role Selector */}
                  <select
                    disabled={isUpdating}
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-[#07172C] border border-[rgba(116,177,235,0.25)] text-xs font-mono text-[#F4F8FF] focus:outline-none focus:border-[#42D9FF]"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="OWNER">OWNER</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>

                  {/* Deactivate / Activate Button */}
                  {!isSelf && (
                    <button
                      disabled={isUpdating}
                      onClick={() => handleToggleStatus(u)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50 ${
                        u.is_active
                          ? 'bg-rose-950/70 hover:bg-rose-900/80 border border-rose-800/60 text-rose-300'
                          : 'bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-800/60 text-emerald-300'
                      }`}
                    >
                      {u.is_active ? (
                        <>
                          <UserX className="w-3.5 h-3.5" />
                          <span>Deactivate</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Activate</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};