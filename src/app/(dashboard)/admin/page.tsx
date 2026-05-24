'use client';

import React, { useState, useEffect } from 'react';
import { adminService } from '@/services/admin.service';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { Tabs } from '@/components/ui/tabs';
import {
  Users,
  Shield,
  Settings,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Edit,
} from 'lucide-react';
import { UserManagementItem, Role, SportCategory } from '@/types';

export default function AdminDashboard() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('users');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Lists state
  const [users, setUsers] = useState<UserManagementItem[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [sports, setSports] = useState<SportCategory[]>([]);

  // Dialog / Action State
  const [selectedUser, setSelectedUser] = useState<UserManagementItem | null>(null);
  const [roleToAssign, setRoleToAssign] = useState('');
  
  const [showCreateRoleDialog, setShowCreateRoleDialog] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [newPermissionAction, setNewPermissionAction] = useState('');
  const [newPermissionDesc, setNewPermissionDesc] = useState('');

  const [selectedSport, setSelectedSport] = useState<SportCategory | null>(null);
  const [showSportDialog, setShowSportDialog] = useState(false);
  const [sportFullName, setSportFullName] = useState('');
  const [sportCalendarIdsText, setSportCalendarIdsText] = useState('');
  const [sportIsActive, setSportIsActive] = useState(true);

  // ==========================================
  // DATA LOADERS
  // ==========================================

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getUsers();
      setUsers(data);
    } catch (err: any) {
      showToast('error', 'Failed to retrieve user accounts.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRoles = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getRoles();
      // The API returns role array or pagination payload { data, total, ... }
      if (Array.isArray(data)) {
        setRoles(data);
      } else if (data?.data) {
        setRoles(data.data);
      }
    } catch (err: any) {
      showToast('error', 'Failed to retrieve system roles.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSports = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getSports();
      if (Array.isArray(data)) {
        setSports(data);
      } else if (data?.data) {
        setSports(data.data);
      }
    } catch (err: any) {
      showToast('error', 'Failed to retrieve sport configurations.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'roles') loadRoles();
    if (activeTab === 'sports') loadSports();
  }, [activeTab]);

  // Global Calendar Sync
  const handleGlobalSync = async () => {
    setIsSyncing(true);
    try {
      const response = await adminService.triggerGlobalSync();
      showToast('success', response.data?.message || 'Global Google Calendar Sync successfully completed!');
      if (activeTab === 'sports') loadSports();
    } catch (err: any) {
      showToast('error', 'Global Google Calendar sync task failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  // ==========================================
  // USER ACTIONS
  // ==========================================

  const handleAssignRole = async (userId: string) => {
    if (!roleToAssign) return;
    try {
      await adminService.assignUserRole(userId, roleToAssign);
      showToast('success', `Role '${roleToAssign}' assigned successfully.`);
      setRoleToAssign('');
      loadUsers();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to assign role.');
    }
  };

  const handleRevokeRole = async (userId: string, roleName: string) => {
    if (roleName === 'ADMIN' && users.find(u => u.id === userId)?.email === 'admin@sportssync.com') {
      showToast('error', 'Cannot revoke ADMIN role from primary administrator account.');
      return;
    }
    try {
      await adminService.revokeUserRole(userId, [roleName]);
      showToast('success', `Role '${roleName}' revoked successfully.`);
      loadUsers();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to revoke role.');
    }
  };

  // ==========================================
  // ROLE ACTIONS
  // ==========================================

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName) return;

    try {
      await adminService.createRole(newRoleName.toUpperCase(), newRoleDesc);
      showToast('success', 'Custom role created successfully.');
      setNewRoleName('');
      setNewRoleDesc('');
      setShowCreateRoleDialog(false);
      loadRoles();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to create role.');
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (roleName === 'ADMIN' || roleName === 'USER') {
      showToast('error', 'System default roles (ADMIN, USER) cannot be deleted.');
      return;
    }

    if (!confirm(`Are you sure you want to delete role '${roleName}'?`)) return;

    try {
      await adminService.deleteRole(roleId);
      showToast('success', 'Custom role deleted successfully.');
      loadRoles();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to delete role.');
    }
  };

  // ==========================================
  // PERMISSION ACTIONS
  // ==========================================

  const handleAddPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !newPermissionAction) return;

    try {
      await adminService.assignRolePermissions(selectedRole.id, [
        {
          action: newPermissionAction,
          description: newPermissionDesc,
        },
      ]);
      showToast('success', 'Permission added to role successfully.');
      setNewPermissionAction('');
      setNewPermissionDesc('');
      
      // Reload specific role permissions
      const data = await adminService.getRoles();
      const updatedRoles = Array.isArray(data) ? data : data?.data || [];
      setRoles(updatedRoles);
      const updatedRole = updatedRoles.find((r: Role) => r.id === selectedRole.id);
      if (updatedRole) setSelectedRole(updatedRole);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to add permission.');
    }
  };

  const handleRemovePermission = async (roleId: string, action: string) => {
    try {
      await adminService.removeRolePermissions(roleId, [action]);
      showToast('success', `Permission '${action}' removed from role.`);
      
      // Reload specific role permissions
      const data = await adminService.getRoles();
      const updatedRoles = Array.isArray(data) ? data : data?.data || [];
      setRoles(updatedRoles);
      const updatedRole = updatedRoles.find((r: Role) => r.id === roleId);
      if (updatedRole) setSelectedRole(updatedRole);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to remove permission.');
    }
  };

  // ==========================================
  // SPORT ACTIONS
  // ==========================================

  const handleOpenSportEdit = (sport: SportCategory) => {
    setSelectedSport(sport);
    setSportFullName(sport.fullName);
    setSportCalendarIdsText(sport.calendarIds.join('\n'));
    setSportIsActive(sport.isActive);
    setShowSportDialog(true);
  };

  const handleUpdateSport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSport) return;

    // Convert newlines to array of string IDs
    const calendarIds = sportCalendarIdsText
      .split('\n')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    try {
      await adminService.updateSport(selectedSport.id, {
        fullName: sportFullName,
        calendarIds,
        isActive: sportIsActive,
      });
      showToast('success', 'Sport category configuration updated.');
      setShowSportDialog(false);
      loadSports();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to update sport configurations.');
    }
  };

  const handleToggleSportStatus = async (sport: SportCategory) => {
    try {
      await adminService.updateSport(sport.id, {
        isActive: !sport.isActive,
      });
      showToast('success', `Sport status changed to ${!sport.isActive ? 'Active' : 'Inactive'}.`);
      loadSports();
    } catch (err: any) {
      showToast('error', 'Failed to toggle sport category status.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with global sync */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 glass-panel rounded-xl glow-teal">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-teal-400" />
            Admin Control Panel
          </h1>
          <p className="text-sm text-slate-400">Manage user access privileges, roles, permissions, and sport schedules.</p>
        </div>
        <Button
          onClick={handleGlobalSync}
          isLoading={isSyncing}
          variant="secondary"
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing && 'animate-spin'}`} />
          Run Global Calendar Sync
        </Button>
      </div>

      {/* Tabs list */}
      <Tabs
        tabs={[
          { id: 'users', label: 'User Directories', icon: <Users className="w-4 h-4" /> },
          { id: 'roles', label: 'Roles & Privileges', icon: <Shield className="w-4 h-4" /> },
          { id: 'sports', label: 'Sport Configurations', icon: <Settings className="w-4 h-4" /> },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 glass-panel rounded-xl min-h-[300px]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-teal-500 mb-3" />
          <span className="text-sm text-slate-400 font-medium animate-pulse">Retrieving settings...</span>
        </div>
      )}

      {/* 1. USERS DIRECTORY TAB */}
      {!isLoading && activeTab === 'users' && (
        <div className="glass-panel rounded-xl overflow-hidden border-slate-800/60 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="p-4">User</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Assigned Roles</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
                {users.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-slate-900/20 transition-colors">
                    {/* User Avatar + Name */}
                    <td className="p-4 flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-teal-400 font-semibold text-xs border border-slate-700">
                        {userItem.userInfo?.firstName?.[0] || userItem.email[0].toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-200">
                        {userItem.userInfo?.firstName
                          ? `${userItem.userInfo.firstName} ${userItem.userInfo.lastName || ''}`
                          : 'Not Provided'}
                      </span>
                    </td>

                    {/* Email */}
                    <td className="p-4">{userItem.email}</td>

                    {/* Roles Badge List */}
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1.5">
                        {userItem.userRoles.map((ur) => (
                          <span
                            key={ur.role.name}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20"
                          >
                            {ur.role.name}
                            <button
                              onClick={() => handleRevokeRole(userItem.id, ur.role.name)}
                              className="text-slate-500 hover:text-red-400 ml-1 cursor-pointer"
                              title="Revoke Role"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Add Role Selector */}
                    <td className="p-4">
                      <div className="flex items-center gap-2 max-w-[200px] mx-auto">
                        <Select
                          options={[
                            { value: '', label: 'Select role...' },
                            { value: 'USER', label: 'USER' },
                            { value: 'ADMIN', label: 'ADMIN' },
                          ]}
                          value={roleToAssign}
                          onChange={(e) => setRoleToAssign(e.target.value)}
                        />
                        <Button
                          variant="outline"
                          onClick={() => handleAssignRole(userItem.id)}
                          disabled={!roleToAssign}
                        >
                          Add
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. ROLES & PERMISSIONS TAB */}
      {!isLoading && activeTab === 'roles' && (
        <div className="space-y-6">
          {/* Header Actions */}
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setShowCreateRoleDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Custom Role
            </Button>
          </div>

          {/* Roles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((role) => (
              <div key={role.id} className="glass-panel rounded-xl p-5 flex flex-col justify-between gap-4 border-slate-800/60">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-base font-bold text-white tracking-wide">{role.name}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedRole(role);
                          setShowPermissionsDialog(true);
                        }}
                        className="text-slate-400 hover:text-teal-400 transition-colors cursor-pointer"
                        title="Manage Permissions"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role.id, role.name)}
                        className="text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                        title="Delete Role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 italic leading-relaxed">
                    {role.description || 'No description provided.'}
                  </p>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Mapped Permissions
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions?.length === 0 ? (
                        <span className="text-xs text-slate-600 italic">No permissions</span>
                      ) : (
                        role.permissions?.map((rp) => (
                          <span
                            key={rp.permission.action}
                            className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          >
                            {rp.permission.action}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. SPORTS CONFIGURATIONS TAB */}
      {!isLoading && activeTab === 'sports' && (
        <div className="glass-panel rounded-xl overflow-hidden border-slate-800/60 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Sport Name</th>
                  <th className="p-4">Full Description Name</th>
                  <th className="p-4">Calendar IDs</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
                {sports.map((sport) => (
                  <tr key={sport.id} className="hover:bg-slate-900/20 transition-colors">
                    {/* Name */}
                    <td className="p-4 font-bold text-slate-100">{sport.name}</td>

                    {/* Full Name */}
                    <td className="p-4 text-slate-300">{sport.fullName}</td>

                    {/* Calendar ID summary */}
                    <td className="p-4 max-w-[250px] truncate">
                      <span className="text-xs font-mono text-slate-400">
                        {sport.calendarIds.length} calendars configured
                      </span>
                    </td>

                    {/* Active toggle button */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleSportStatus(sport)}
                        className="text-slate-400 hover:text-white transition-all cursor-pointer inline-flex items-center"
                        title={sport.isActive ? 'Deactivate Sport' : 'Activate Sport'}
                      >
                        {sport.isActive ? (
                          <ToggleRight className="w-6 h-6 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-slate-600" />
                        )}
                      </button>
                    </td>

                    {/* Edit config button */}
                    <td className="p-4 text-center">
                      <Button
                        variant="outline"
                        onClick={() => handleOpenSportEdit(sport)}
                      >
                        <Edit className="w-4 h-4 mr-1.5" /> Configure
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE CUSTOM ROLE DIALOG */}
      <Dialog
        isOpen={showCreateRoleDialog}
        onClose={() => {
          setShowCreateRoleDialog(false);
          setNewRoleName('');
          setNewRoleDesc('');
        }}
        title="Create New Custom System Role"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateRole} className="space-y-4">
          <Input
            id="role-name"
            label="Role Name"
            placeholder="e.g. MODERATOR"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
          />
          <Input
            id="role-desc"
            label="Role Description"
            placeholder="Describe role privileges..."
            value={newRoleDesc}
            onChange={(e) => setNewRoleDesc(e.target.value)}
          />
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setShowCreateRoleDialog(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="secondary">
              Create Role
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MANAGE ROLE PERMISSIONS DIALOG */}
      <Dialog
        isOpen={showPermissionsDialog}
        onClose={() => {
          setShowPermissionsDialog(false);
          setNewPermissionAction('');
          setNewPermissionDesc('');
          setSelectedRole(null);
        }}
        title={selectedRole ? `Permissions Map - ${selectedRole.name}` : ''}
        maxWidth="md"
      >
        <div className="space-y-6">
          {/* Add Permission Form */}
          <form onSubmit={handleAddPermission} className="p-4 rounded-lg bg-slate-950/40 border border-slate-850 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Map New Permission Action</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                id="perm-action"
                label="Permission Action"
                placeholder="e.g. read:sport:NBA"
                value={newPermissionAction}
                onChange={(e) => setNewPermissionAction(e.target.value)}
              />
              <Input
                id="perm-desc"
                label="Description"
                placeholder="NBA view schedules permission..."
                value={newPermissionDesc}
                onChange={(e) => setNewPermissionDesc(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="outline">
                <Plus className="w-4 h-4 mr-1.5" /> Map Action
              </Button>
            </div>
          </form>

          {/* List of Permissions inside selectedRole */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1.5">
              Current Mapped Permissions
            </h4>
            <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
              {selectedRole?.permissions?.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No permissions mapped to this role.</p>
              ) : (
                selectedRole?.permissions?.map((rp) => (
                  <div
                    key={rp.permission.action}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-900 bg-slate-900/40 text-sm"
                  >
                    <div className="space-y-0.5">
                      <span className="font-mono text-xs text-purple-400 font-semibold">{rp.permission.action}</span>
                      {rp.permission.description && (
                        <p className="text-xs text-slate-400">{rp.permission.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemovePermission(selectedRole.id, rp.permission.action)}
                      className="text-slate-500 hover:text-red-400 p-1 cursor-pointer transition-colors"
                      title="Unmap Permission"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowPermissionsDialog(false);
                setSelectedRole(null);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Dialog>

      {/* CONFIGURE SPORT DIALOG */}
      <Dialog
        isOpen={showSportDialog}
        onClose={() => {
          setShowSportDialog(false);
          setSelectedSport(null);
        }}
        title={selectedSport ? `Configure Category - ${selectedSport.name}` : ''}
        maxWidth="md"
      >
        <form onSubmit={handleUpdateSport} className="space-y-4">
          <Input
            id="sport-fullName"
            label="Sport Full Display Name"
            placeholder="Ultimate Fighting Championship"
            value={sportFullName}
            onChange={(e) => setSportFullName(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
              Google Calendar IDs (one per line)
            </label>
            <textarea
              className="w-full min-h-[120px] px-4 py-2.5 rounded-lg border bg-slate-950/60 border-slate-800 text-slate-100 placeholder-slate-500 font-mono text-xs transition-all duration-300 outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30"
              placeholder="e.g. 2lcbtf28u9nncve5hsmgfjmqok4qi380@import.calendar.google.com"
              value={sportCalendarIdsText}
              onChange={(e) => setSportCalendarIdsText(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <label className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
              Sport Status
            </label>
            <button
              type="button"
              onClick={() => setSportIsActive(!sportIsActive)}
              className="text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              {sportIsActive ? (
                <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded border border-emerald-500/20 text-xs font-semibold">
                  <CheckCircle className="w-3.5 h-3.5" /> Active (Events are displayed)
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-slate-800 text-slate-400 px-3 py-1 rounded border border-slate-700 text-xs font-semibold">
                  <XCircle className="w-3.5 h-3.5" /> Inactive (Schedules are hidden)
                </div>
              )}
            </button>
          </div>

          <div className="flex gap-3 justify-end pt-6 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setShowSportDialog(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="secondary">
              Save Configurations
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
