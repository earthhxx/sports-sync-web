'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  CheckSquare,
  Square,
  AlertTriangle,
  LayoutDashboard,
  Activity,
  Calendar,
  Sparkles,
  Clock,
  TrendingUp,
  HelpCircle,
} from 'lucide-react';
import { UserManagementItem, Role, SportCategory } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';
import { useHasPermission } from '@/hooks/useHasPermission';

export default function AdminDashboard() {
  const { showToast } = useToast();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [infoLang, setInfoLang] = useState<'en' | 'th'>('th');
  const [isSyncInfoModalOpen, setIsSyncInfoModalOpen] = useState(false);
  const [syncInfoLang, setSyncInfoLang] = useState<'en' | 'th'>('th');

  // Permission hooks
  const canReadDashboard = useHasPermission('read:dashboard');
  const canReadUsers = useHasPermission('read:users');
  const canReadRoles = useHasPermission('read:roles');
  const canReadSports = useHasPermission('read:sports');
  const canAssignRole = useHasPermission('assign:role');
  const canCreateRole = useHasPermission('create:role');
  const canAssignPermission = useHasPermission('assign:permission');
  const canWriteSports = useHasPermission('write:sports');
  const canSyncCalendar = useHasPermission('sync:calendar');

  // Privilege Escalation Protection helpers
  const isCurrentUserAdmin = user?.roles.includes('ADMIN');
  const hasManageAdmin = user?.permissions.includes('manage:admin');

  const canAssignRoleToUser = (roleName: string) => {
    if (!canAssignRole) return false;
    if (roleName === 'ADMIN') {
      return !!(isCurrentUserAdmin || hasManageAdmin);
    }
    return true;
  };

  const canRevokeRole = (roleName: string) => {
    if (!canAssignRole) return false;
    if (roleName === 'ADMIN') {
      return !!(isCurrentUserAdmin || hasManageAdmin);
    }
    return true;
  };

  // Filter tabs according to user permissions
  const allowedTabs = useMemo(() => {
    const allTabs = [
      { id: 'dashboard', label: 'Overview Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, allowed: canReadDashboard },
      { id: 'users', label: 'User Directories', icon: <Users className="w-4 h-4" />, allowed: canReadUsers },
      { id: 'roles', label: 'Roles & Privileges', icon: <Shield className="w-4 h-4" />, allowed: canReadRoles },
      { id: 'sports', label: 'Sport Configurations', icon: <Settings className="w-4 h-4" />, allowed: canReadSports },
    ];
    return allTabs.filter(t => t.allowed);
  }, [canReadDashboard, canReadUsers, canReadRoles, canReadSports]);

  // Adjust active tab if the current one is not allowed
  useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.some(t => t.id === activeTab)) {
      setActiveTab(allowedTabs[0].id);
    }
  }, [allowedTabs, activeTab]);

  // Lists state
  const [users, setUsers] = useState<UserManagementItem[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [sports, setSports] = useState<SportCategory[]>([]);
  const [usersCount, setUsersCount] = useState(0);
  const [rolesCount, setRolesCount] = useState(0);
  const [permissionsList, setPermissionsList] = useState<{ id: string; action: string; description?: string }[]>([]);
  const [tempSelectedPermissions, setTempSelectedPermissions] = useState<string[]>([]);
  const [showSyncWarningDialog, setShowSyncWarningDialog] = useState(false);
  const [cronIntervalMinutes, setCronIntervalMinutes] = useState(360);

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

  const loadPermissions = async () => {
    try {
      const data = await adminService.getPermissions();
      setPermissionsList(data);
    } catch (err: any) {
      showToast('error', 'Failed to retrieve system permissions.');
    }
  };

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const stats = await adminService.getDashboardStats();
      setUsersCount(stats.usersCount || 0);
      setRolesCount(stats.rolesCount || 0);
      if (Array.isArray(stats.sports)) {
        setSports(stats.sports);
      } else if (stats.sports?.data) {
        setSports(stats.sports.data);
      }
    } catch (err: any) {
      showToast('error', 'Failed to retrieve dashboard overview statistics.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsersTabData = async () => {
    setIsLoading(true);
    try {
      const result = await adminService.getUsersPageData();
      setUsers(result.users || []);
      const rolesData = result.roles;
      if (Array.isArray(rolesData)) {
        setRoles(rolesData);
      } else if (rolesData?.data) {
        setRoles(rolesData.data);
      }
    } catch (err: any) {
      showToast('error', 'Failed to retrieve users directory data.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRolesTabData = async () => {
    setIsLoading(true);
    try {
      const result = await adminService.getRolesPageData();
      const rolesData = result.roles;
      if (Array.isArray(rolesData)) {
        setRoles(rolesData);
      } else if (rolesData?.data) {
        setRoles(rolesData.data);
      }
      setPermissionsList(result.permissions || []);
    } catch (err: any) {
      showToast('error', 'Failed to retrieve role templates & permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const totalCalendarIds = useMemo(() => {
    return sports.reduce((sum, sport) => sum + (sport.calendarIds?.length || 0), 0);
  }, [sports]);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboardData();
    }
    if (activeTab === 'users') {
      loadUsersTabData();
    }
    if (activeTab === 'roles') {
      loadRolesTabData();
    }
    if (activeTab === 'sports') {
      loadSports();
    }
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
    if (roleToAssign === 'ADMIN' && !(isCurrentUserAdmin || hasManageAdmin)) {
      showToast('error', 'Unauthorized to assign ADMIN role.');
      return;
    }
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
    if (roleName === 'ADMIN' && !(isCurrentUserAdmin || hasManageAdmin)) {
      showToast('error', 'Unauthorized to revoke ADMIN role.');
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
  // PERMISSION ACTIONS (Bulk Mapped)
  // ==========================================

  const handleOpenPermissionsDialog = (role: Role) => {
    setSelectedRole(role);
    const currentActions = role.permissions?.map((rp) => rp.permission.action) || [];
    setTempSelectedPermissions(currentActions);
    setShowPermissionsDialog(true);
  };

  const handleTogglePermissionTemp = (action: string) => {
    setTempSelectedPermissions((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    if (selectedRole.name === 'ADMIN' && !(isCurrentUserAdmin || hasManageAdmin)) {
      showToast('error', 'Unauthorized to modify ADMIN permissions.');
      return;
    }
    setIsLoading(true);
    try {
      const originalActions = selectedRole.permissions?.map((rp) => rp.permission.action) || [];
      
      const addedActions = tempSelectedPermissions.filter((action) => !originalActions.includes(action));
      const removedActions = originalActions.filter((action) => !tempSelectedPermissions.includes(action));

      if (removedActions.length > 0) {
        await adminService.removeRolePermissions(selectedRole.id, removedActions);
      }

      if (addedActions.length > 0) {
        const toAssign = addedActions.map((action) => {
          const permInfo = permissionsList.find((p) => p.action === action);
          return {
            action,
            description: permInfo?.description || '',
          };
        });
        await adminService.assignRolePermissions(selectedRole.id, toAssign);
      }

      showToast('success', `Permissions updated successfully for role '${selectedRole.name}'.`);
      setShowPermissionsDialog(false);
      setSelectedRole(null);
      loadRoles();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to update permissions.');
    } finally {
      setIsLoading(false);
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
      {/* Header */}
      <div className="p-6 glass-panel rounded-xl glow-teal flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-teal-400" />
            Admin Control Panel
          </h1>
          <p className="text-sm text-slate-400">Manage user access privileges, roles, permissions, and sport schedules.</p>
        </div>
        <button
          onClick={() => setIsInfoModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/5 border border-indigo-500/25 hover:border-indigo-500/40 rounded-xl transition-all cursor-pointer self-start sm:self-center"
        >
          <HelpCircle className="w-4 h-4" />
          How it works
        </button>
      </div>

      {/* Tabs list */}
      <Tabs
        tabs={allowedTabs}
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

      {/* 0. OVERVIEW DASHBOARD TAB */}
      {!isLoading && activeTab === 'dashboard' && (
        <div className="space-y-6 animate-fadeIn">
          {/* KPI Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Metric Card 1: Users */}
            <div className="glass-panel rounded-xl p-5 border border-slate-800/60 shadow-xl relative overflow-hidden transition-all duration-300 hover:border-slate-700/80 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Registered Users</span>
                  <span className="text-3xl font-extrabold text-white tracking-tight block">{usersCount}</span>
                </div>
                <div className="bg-purple-500/10 text-purple-400 p-2.5 rounded-lg border border-purple-500/20 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Access control ready</span>
              </div>
            </div>

            {/* Metric Card 2: Roles */}
            <div className="glass-panel rounded-xl p-5 border border-slate-800/60 shadow-xl relative overflow-hidden transition-all duration-300 hover:border-slate-700/80 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Security Roles</span>
                  <span className="text-3xl font-extrabold text-white tracking-tight block">{rolesCount}</span>
                </div>
                <div className="bg-blue-500/10 text-blue-400 p-2.5 rounded-lg border border-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                  <Shield className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                <span>Authorization templates</span>
              </div>
            </div>

            {/* Metric Card 3: Sport Categories */}
            <div className="glass-panel rounded-xl p-5 border border-slate-800/60 shadow-xl relative overflow-hidden transition-all duration-300 hover:border-slate-700/80 hover:shadow-[0_0_20px_rgba(20,184,166,0.15)] group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Sport Categories</span>
                  <span className="text-3xl font-extrabold text-white tracking-tight block">{sports.length}</span>
                </div>
                <div className="bg-teal-500/10 text-teal-400 p-2.5 rounded-lg border border-teal-500/20 group-hover:scale-110 transition-transform duration-300">
                  <Activity className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{sports.filter((s) => s.isActive).length} active, {sports.filter((s) => !s.isActive).length} inactive</span>
              </div>
            </div>

            {/* Metric Card 4: Total Calendar IDs */}
            <div className="glass-panel rounded-xl p-5 border border-slate-800/60 shadow-xl relative overflow-hidden transition-all duration-300 hover:border-slate-700/80 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Connected Calendars</span>
                  <span className="text-3xl font-extrabold text-white tracking-tight block">{totalCalendarIds}</span>
                </div>
                <div className="bg-amber-500/10 text-amber-400 p-2.5 rounded-lg border border-amber-500/20 group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Google Calendar integration</span>
              </div>
            </div>
          </div>

          {/* Core Dashboard Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left/Middle Column: Quota Simulator and Action Trigger */}
            <div className="lg:col-span-2 glass-panel rounded-xl p-6 border border-slate-800/60 shadow-xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-teal-500/10 text-teal-400 p-2 rounded-lg border border-teal-500/20">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-wide">Sync Control & Quota Simulator</h2>
                    <p className="text-xs text-slate-400">Monitor daily API limit consumption and trigger a global database schedule refresh.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSyncInfoModalOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-teal-400 hover:text-teal-350 bg-teal-500/5 border border-teal-500/25 hover:border-teal-500/45 rounded-lg transition-all cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Help
                </button>
              </div>

              {/* Calculator Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Simulation Inputs</h3>
                  <Input
                    id="dash-cron-interval"
                    label="Cron Job Frequency (Minutes)"
                    type="number"
                    min={1}
                    value={cronIntervalMinutes}
                    onChange={(e) => setCronIntervalMinutes(Math.max(1, Number(e.target.value)))}
                    className="bg-slate-950 border-slate-800 focus:border-teal-500/50"
                  />
                  <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-900 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Manual Sync Cost:</span>
                      <span className="font-mono text-slate-300">{totalCalendarIds} requests</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cron Sync Cost (per run):</span>
                      <span className="font-mono text-slate-300">{totalCalendarIds} requests</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cron Syncs Per Day:</span>
                      <span className="font-mono text-slate-300">{Math.round((1440 / Math.max(1, cronIntervalMinutes)) * 100) / 100} times</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Projected Daily Queries</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-900 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Cron Daily Queries</span>
                      <span className="text-xl font-mono font-bold text-slate-200 mt-1 block">
                        {Math.round((1440 / Math.max(1, cronIntervalMinutes)) * totalCalendarIds)}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-900 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Projected</span>
                      <span className="text-xl font-mono font-bold text-teal-400 mt-1 block">
                        {Math.round((1440 / Math.max(1, cronIntervalMinutes)) * totalCalendarIds) + totalCalendarIds}
                      </span>
                    </div>
                  </div>

                  {(() => {
                    const safeMinutes = Math.max(1, cronIntervalMinutes);
                    const runsPerDay = 1440 / safeMinutes;
                    const cronQueriesPerDay = Math.round(runsPerDay * totalCalendarIds);
                    const totalQueries = cronQueriesPerDay + totalCalendarIds;
                    const quotaLimit = 1000000;
                    const percentage = (totalQueries / quotaLimit) * 100;

                    let statusText = 'SAFE';
                    let statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                    let barColor = 'bg-emerald-500';
                    if (percentage >= 80) {
                      statusText = 'HIGH USAGE';
                      statusColor = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
                      barColor = 'bg-yellow-500';
                    }
                    if (percentage >= 100) {
                      statusText = 'QUOTA EXCEEDED';
                      statusColor = 'text-red-500 bg-red-500/10 border-red-500/20';
                      barColor = 'bg-red-500';
                    }

                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-semibold">Quota Consumption:</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusColor}`}>
                            {percentage.toFixed(5)}% ({statusText})
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                          <div
                            className={`h-full ${barColor} transition-all duration-500`}
                            style={{ width: `${Math.min(100, percentage)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Action Trigger Banner */}
              {canSyncCalendar && (
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-md">
                    <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-500" />
                      Trigger Manual Integration Sync
                    </div>
                    <p className="text-xs text-slate-400">
                      Forces an immediate background fetch of all active sport calendar categories. Events will be matched, parsed, and cached in the database.
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowSyncWarningDialog(true)}
                    isLoading={isSyncing}
                    className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold shadow-[0_0_15px_rgba(20,184,166,0.3)] hover:shadow-[0_0_25px_rgba(20,184,166,0.5)] transition-all duration-300 py-2.5 px-5 h-auto text-xs w-full md:w-auto"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing && 'animate-spin'}`} />
                    Run Global Calendar Sync
                  </Button>
                </div>
              )}
            </div>

            {/* Right Column: Configured Feeds Density Checklist */}
            <div className="glass-panel rounded-xl p-6 border border-slate-800/60 shadow-xl flex flex-col justify-between gap-4">
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
                  <div className="bg-purple-500/10 text-purple-400 p-2 rounded-lg border border-purple-500/20">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white tracking-wide">Sports Config Densities</h2>
                    <p className="text-xs text-slate-400">Status & calendar count per sport category</p>
                  </div>
                </div>

                <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {sports.map((sport) => (
                    <div
                      key={sport.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/40 border border-slate-900/60 hover:bg-slate-900/30 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-slate-200">{sport.fullName}</div>
                        <div className="text-[10px] text-slate-500 font-mono tracking-wider">{sport.name.toUpperCase()}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono font-bold bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                          {sport.calendarIds?.length || 0} cal
                        </span>
                        {sport.isActive ? (
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-slate-700" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-[10px] text-slate-500 leading-relaxed italic border-t border-slate-800/80 pt-3">
                * To add, remove, or modify calendar channels or full descriptions, head over to the **Sport Configurations** tab.
              </div>
            </div>
          </div>
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
                            {canRevokeRole(ur.role.name) && (
                              <button
                                onClick={() => handleRevokeRole(userItem.id, ur.role.name)}
                                className="text-slate-500 hover:text-red-400 ml-1 cursor-pointer"
                                title="Revoke Role"
                              >
                                &times;
                              </button>
                            )}
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
                            ...roles
                              .filter((r) => canAssignRoleToUser(r.name))
                              .map((r) => ({ value: r.name, label: r.name })),
                          ]}
                          value={roleToAssign}
                          onChange={(e) => setRoleToAssign(e.target.value)}
                          disabled={!canAssignRole}
                        />
                        <Button
                          variant="outline"
                          onClick={() => handleAssignRole(userItem.id)}
                          disabled={!canAssignRole || !roleToAssign}
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
          {canCreateRole && (
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setShowCreateRoleDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Custom Role
              </Button>
            </div>
          )}

          {/* Roles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((role) => {
              const canEditPerms = canAssignPermission && (role.name !== 'ADMIN' || isCurrentUserAdmin || hasManageAdmin);
              const canDelRole = canCreateRole && role.name !== 'ADMIN' && role.name !== 'USER';

              return (
                <div key={role.id} className="glass-panel rounded-xl p-5 flex flex-col justify-between gap-4 border-slate-800/60">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h3 className="text-base font-bold text-white tracking-wide">{role.name}</h3>
                      <div className="flex gap-2">
                        {canEditPerms && (
                          <button
                            onClick={() => handleOpenPermissionsDialog(role)}
                            className="text-slate-400 hover:text-teal-400 transition-colors cursor-pointer"
                            title="Manage Permissions"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {canDelRole && (
                          <button
                            onClick={() => handleDeleteRole(role.id, role.name)}
                            className="text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                            title="Delete Role"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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
            );
          })}
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
                      {canWriteSports ? (
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
                      ) : (
                        <span className="text-slate-500 inline-flex items-center cursor-not-allowed opacity-50">
                          {sport.isActive ? (
                            <ToggleRight className="w-6 h-6 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-slate-700" />
                          )}
                        </span>
                      )}
                    </td>

                    {/* Edit config button */}
                    <td className="p-4 text-center">
                      <Button
                        variant="outline"
                        onClick={() => handleOpenSportEdit(sport)}
                      >
                        {canWriteSports ? (
                          <>
                            <Edit className="w-4 h-4 mr-1.5" /> Configure
                          </>
                        ) : (
                          <>
                            <Settings className="w-4 h-4 mr-1.5" /> View
                          </>
                        )}
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
          setSelectedRole(null);
        }}
        title={selectedRole ? `Permissions Map - ${selectedRole.name}` : ''}
        maxWidth="md"
      >
        <div className="space-y-6">
          <p className="text-sm text-slate-400">
            Check or uncheck the boxes to assign permissions to this role. Click <strong>Save Permissions</strong> to apply changes.
          </p>

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Select System Privileges</h4>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setTempSelectedPermissions(permissionsList.map((p) => p.action))}
                className="text-xs py-1 px-2.5 h-auto text-teal-400 hover:text-teal-300"
              >
                Select All
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setTempSelectedPermissions([])}
                className="text-xs py-1 px-2.5 h-auto text-slate-400 hover:text-white"
              >
                Clear All
              </Button>
            </div>
          </div>

          <div className="max-h-[350px] overflow-y-auto space-y-6 pr-1">
            {/* 1. Universal Control */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Universal Controls</h5>
              <div className="grid grid-cols-1 gap-2">
                {permissionsList.filter((p) => p.action === 'manage:all').map((p) => {
                  const isChecked = tempSelectedPermissions.includes(p.action);
                  return (
                    <button
                      key={p.action}
                      type="button"
                      onClick={() => handleTogglePermissionTemp(p.action)}
                      className={`flex items-start gap-3 p-3.5 rounded-lg border text-left transition-all duration-300 cursor-pointer ${
                        isChecked
                          ? 'border-teal-500/30 bg-teal-500/5 text-white shadow-[0_0_15px_rgba(20,184,166,0.05)]'
                          : 'border-slate-905 bg-slate-900/40 text-slate-300 hover:border-slate-800'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="text-xs font-mono font-bold tracking-wide text-teal-400">{p.action}</div>
                        <div className="text-xs text-slate-400 mt-1">{p.description || 'Full administrator access to all aspects of the application.'}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Sport Categories */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sports Calendar Feeds Access</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {permissionsList.filter((p) => p.action !== 'manage:all').map((p) => {
                  const isChecked = tempSelectedPermissions.includes(p.action);
                  const sportName = p.action.replace('read:sport:', '');
                  return (
                    <button
                      key={p.action}
                      type="button"
                      onClick={() => handleTogglePermissionTemp(p.action)}
                      className={`flex items-start gap-3 p-3.5 rounded-lg border text-left transition-all duration-300 cursor-pointer ${
                        isChecked
                          ? 'border-purple-500/30 bg-purple-500/5 text-white shadow-[0_0_15px_rgba(168,85,247,0.05)]'
                          : 'border-slate-905 bg-slate-900/40 text-slate-300 hover:border-slate-800'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="text-xs font-bold text-slate-200">{sportName} View Fee</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">{p.action}</div>
                        <div className="text-xs text-slate-400 mt-1 leading-relaxed">{p.description || `Can view events and schedules for ${sportName}`}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowPermissionsDialog(false);
                setSelectedRole(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSavePermissions}
              className="bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white"
            >
              Save Permissions
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
            disabled={!canWriteSports}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
              Google Calendar IDs (one per line)
            </label>
            <textarea
              className="w-full min-h-[120px] px-4 py-2.5 rounded-lg border bg-slate-950/60 border-slate-800 text-slate-100 placeholder-slate-500 font-mono text-xs transition-all duration-300 outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="e.g. 2lcbtf28u9nncve5hsmgfjmqok4qi380@import.calendar.google.com"
              value={sportCalendarIdsText}
              onChange={(e) => setSportCalendarIdsText(e.target.value)}
              disabled={!canWriteSports}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <label className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
              Sport Status
            </label>
            <button
              type="button"
              onClick={() => canWriteSports && setSportIsActive(!sportIsActive)}
              className={`text-slate-400 hover:text-white transition-all ${canWriteSports ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              disabled={!canWriteSports}
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
            {canWriteSports && (
              <Button type="submit" variant="secondary">
                Save Configurations
              </Button>
            )}
          </div>
        </form>
      </Dialog>

      {/* GOOGLE CALENDAR SYNC WARNING DIALOG */}
      <Dialog
        isOpen={showSyncWarningDialog}
        onClose={() => setShowSyncWarningDialog(false)}
        title="⚠️ Google Calendar API Quota Warning"
        maxWidth="md"
      >
        <div className="space-y-6">
          {/* Warning Banner */}
          <div className="flex gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200">
            <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5 text-amber-400" />
            <div>
              <p className="font-semibold text-sm">Dangerous Operation Alert</p>
              <p className="text-xs text-amber-300/90 mt-1 leading-relaxed">
                Running a global sync triggers multiple API request calls to Google Calendar. Frequent execution or overly aggressive cron intervals will deplete your Google API free tier quota.
              </p>
            </div>
          </div>

          {/* Quota Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-900 text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Google Daily Quota</span>
              <span className="text-lg font-mono font-bold text-white mt-1 block">1,000,000</span>
              <span className="text-[10px] text-slate-400">requests / day</span>
            </div>
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-900 text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Calendar IDs in DB</span>
              <span className="text-lg font-mono font-bold text-teal-400 mt-1 block">{totalCalendarIds}</span>
              <span className="text-[10px] text-slate-400">configured channels</span>
            </div>
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-900 text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Single Sync Cost</span>
              <span className="text-lg font-mono font-bold text-teal-400 mt-1 block">{totalCalendarIds}</span>
              <span className="text-[10px] text-slate-400">API queries</span>
            </div>
          </div>

          {/* Calculator Input */}
          <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Quota Usage Calculator</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <Input
                id="cron-interval"
                label="Cron Job Frequency (Minutes)"
                type="number"
                min={1}
                value={cronIntervalMinutes}
                onChange={(e) => setCronIntervalMinutes(Math.max(1, Number(e.target.value)))}
                className="bg-slate-950 border-slate-800 focus:border-teal-500/50"
              />
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Runs Per Day</span>
                <span className="text-sm font-mono font-bold text-slate-300 block">
                  {Math.round((1440 / Math.max(1, cronIntervalMinutes)) * 100) / 100} times / day
                </span>
              </div>
            </div>

            {/* Calculations results */}
            {(() => {
              const safeMinutes = Math.max(1, cronIntervalMinutes);
              const runsPerDay = 1440 / safeMinutes;
              const cronQueriesPerDay = Math.round(runsPerDay * totalCalendarIds);
              const manualQueries = totalCalendarIds;
              const totalQueries = cronQueriesPerDay + manualQueries;
              const quotaLimit = 1000000;
              const percentage = (totalQueries / quotaLimit) * 100;
              
              let statusText = 'SAFE';
              let statusColor = 'text-emerald-400';
              let barColor = 'bg-emerald-500';
              if (percentage >= 80) {
                statusText = 'HIGH USAGE WARNING';
                statusColor = 'text-yellow-400';
                barColor = 'bg-yellow-500';
              }
              if (percentage >= 100) {
                statusText = 'DANGER: QUOTA EXCEEDED';
                statusColor = 'text-red-500';
                barColor = 'bg-red-500';
              }

              return (
                <div className="space-y-3 pt-3 border-t border-slate-800/80">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400">Cron Daily Queries:</span>
                      <span className="font-mono font-bold text-slate-200 ml-1.5">{cronQueriesPerDay}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Total Projected (Cron + 1 Sync):</span>
                      <span className="font-mono font-bold text-slate-200 ml-1.5">{totalQueries}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-400">Daily Quota Consumption:</span>
                      <span className={`${statusColor} font-mono`}>
                        {percentage.toFixed(6)}% ({statusText})
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                      <div
                        className={`h-full ${barColor} transition-all duration-500`}
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-850">
            <Button type="button" variant="ghost" onClick={() => setShowSyncWarningDialog(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.2)]"
              onClick={() => {
                setShowSyncWarningDialog(false);
                handleGlobalSync();
              }}
            >
              Confirm & Sync Now
            </Button>
          </div>
        </div>
      </Dialog>

      {/* How It Works Explanation Modal */}
      {isInfoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel border-slate-800/80 w-full max-w-xl p-6 rounded-2xl shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Header with Language Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-4 mb-4 flex-shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-400 animate-pulse" />
                {infoLang === 'th' ? 'หลักการทำงานของระบบแอดมิน' : 'How Admin Panel Works'}
              </h3>
              <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setInfoLang('th')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    infoLang === 'th'
                      ? 'bg-indigo-500/20 text-indigo-300 font-semibold'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  ภาษาไทย
                </button>
                <button
                  onClick={() => setInfoLang('en')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    infoLang === 'en'
                      ? 'bg-indigo-500/20 text-indigo-300 font-semibold'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Description Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-slate-300 text-xs sm:text-sm leading-relaxed">
              {infoLang === 'th' ? (
                <>
                  <p className="text-slate-405 mb-4">
                    หน้านี้คือศูนย์กลางสำหรับผู้ดูแลระบบ เพื่อควบคุมสิทธิ์การใช้งาน บทบาทหน้าที่ และปรับแต่งโครงสร้างหมวดหมู่กีฬาเพื่อใช้เปรียบเทียบตารางแข่งขัน
                  </p>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded bg-teal-400"></span>
                        1. แดชบอร์ดสรุปผล & โปรแกรมจำลองโควตา
                      </h4>
                      <p className="text-xs text-slate-400">
                        แสดงข้อมูลภาพรวม และจำลองโควตาการดึงข้อมูลจากระบบ Google Calendar อัตโนมัติในแต่ละวัน เพื่อควบคุมปริมาณการใช้งานไม่ให้เกิดสิทธิ์การเข้าถึงลิมิตของ Google API ในการดึงข้อมูล
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded bg-teal-400"></span>
                        2. ทะเบียนรายชื่อและสิทธิ์สมาชิก (User Directories)
                      </h4>
                      <p className="text-xs text-slate-400">
                        เป็นหน้ารวมข้อมูลบัญชีที่ลงทะเบียนในระบบ แอดมินสามารถกำหนดตำแหน่ง/บทบาท (เช่น ADMIN, USER) หรือถอดถอนกลุ่มบทบาทออกเพื่อจำกัดการเข้าใช้งานเมนูของระบบได้
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded bg-teal-400"></span>
                        3. การจัดการบทบาทและสิทธิ์พิเศษ (Roles & Privileges)
                      </h4>
                      <p className="text-xs text-slate-400">
                        ปรับแต่งสิทธิ์ในการอ่าน เขียน หรือควบคุมระบบในแต่ละกลุ่มตำแหน่งอย่างละเอียด เพื่อความปลอดภัยสูงสุด (เช่น ให้สิทธิ์บางตำแหน่งดูตารางแข่งได้อย่างเดียว แต่ไม่มีสิทธิ์ดึงข้อมูลปฏิทินสด)
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded bg-teal-400"></span>
                        4. การปรับแต่งประเภทกีฬา (Sport Configurations)
                      </h4>
                      <p className="text-xs text-slate-400">
                        ตั้งค่ารายชื่อกีฬาทั้งหมด ใส่รหัสของ Google Calendar (Calendar IDs) สำหรับใช้ดึงข้อมูลตารางการแข่งขันอย่างเป็นทางการเพื่อนำมาจับคู่ในระบบ Reconciler
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-slate-405 mb-4">
                    This dashboard is the central administration panel for managing system roles, user access configurations, and sports schedules API integration.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded bg-teal-400"></span>
                        1. Dashboard Summary & Quota Simulator
                      </h4>
                      <p className="text-xs text-slate-400">
                        Monitor active parameters and run quota projection calculations to ensure automated background sync queries remain safely within the limits of Google API thresholds.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded bg-teal-400"></span>
                        2. User Directories
                      </h4>
                      <p className="text-xs text-slate-400">
                        Review all accounts registered in the platform. Administrators can grant or revoke roles (e.g. USER, ADMIN) to modify user permissions instantly.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded bg-teal-400"></span>
                        3. Roles & Privileges
                      </h4>
                      <p className="text-xs text-slate-400">
                        Manage security privileges. Toggle granular access controls (such as write options, sync controls, or read rules) for each defined system role.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded bg-teal-400"></span>
                        4. Sport Configuration Channels
                      </h4>
                      <p className="text-xs text-slate-400">
                        Configure sport categories, toggle status, and input calendar channel targets (Google Calendar IDs) used to retrieve tournament data.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-800/60 pt-4 mt-4 flex justify-end flex-shrink-0">
              <button
                onClick={() => setIsInfoModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 transition-all cursor-pointer shadow-lg shadow-teal-500/15"
              >
                {infoLang === 'th' ? 'เข้าใจแล้ว' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Control & Quota Simulator Explanation Modal */}
      {isSyncInfoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel border-slate-800/80 w-full max-w-xl p-6 rounded-2xl shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Header with Language Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-4 mb-4 flex-shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-teal-400 animate-pulse" />
                {syncInfoLang === 'th' ? 'หลักการซิงค์และจำลองโควตา' : 'Sync Control & Quota Simulator'}
              </h3>
              <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setSyncInfoLang('th')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    syncInfoLang === 'th'
                      ? 'bg-teal-500/20 text-teal-300 font-semibold'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  ภาษาไทย
                </button>
                <button
                  onClick={() => setSyncInfoLang('en')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    syncInfoLang === 'en'
                      ? 'bg-teal-500/20 text-teal-300 font-semibold'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Description Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-slate-300 text-xs sm:text-sm leading-relaxed">
              {syncInfoLang === 'th' ? (
                <>
                  <p className="text-slate-405 mb-4">
                    บริการ Google Calendar API มีขีดจำกัดโควตาการดึงข้อมูลสูงสุดอยู่ที่ <strong>1,000,000 คำขอต่อวัน</strong> ระบบนี้ช่วยให้ประเมินการใช้งานปฏิทินทั้งหมดได้ล่วงหน้า
                  </p>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded bg-teal-400"></span>
                        ปัจจัยในการคำนวณโควตา
                      </h4>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-slate-400">
                        <li><strong>จำนวนช่องปฏิทิน (Connected Calendars):</strong> นับจำนวนปฏิทินจริงทั้งหมดที่บริษัทผูกไว้ในระบบกีฬา (แต่ละปฏิทินใช้ 1 คำขอต่อการซิงค์ 1 ครั้ง)</li>
                        <li><strong>ความถี่ในการซิงค์ข้อมูล (Cron Frequency):</strong> ตัวเลือกรอบการทำงานดึงข้อมูลอัตโนมัติ (เช่น ทุกๆ 360 นาที หรือ 6 ชั่วโมง)</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded bg-teal-400"></span>
                        สูตรคำนวณเบื้องหลัง
                      </h4>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-slate-400 font-mono text-[11px]">
                        <li>จำนวนรอบซิงค์ต่อวัน = 1,440 นาที (24 ชั่วโมง) / ความถี่ที่คุณกรอก</li>
                        <li>ปริมาณคำขอแบบออโต้รายวัน = จำนวนรอบซิงค์ต่อวัน × จำนวนช่องปฏิทิน</li>
                        <li>ปริมาณคำขอทั้งหมดคาดการณ์ = คำขอรายวันจากระบบออโต้ + คำขอดึงข้อมูลด้วยตนเอง (Manual Sync)</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded bg-rose-500"></span>
                        คำเตือนและข้อควรระวัง
                      </h4>
                      <p className="text-xs text-slate-400">
                        หากตั้งความถี่สั้นเกินไป (เช่น ซิงค์ทุกๆ 1-5 นาที) จะทำให้มีปริมาณเรียกข้อมูลที่สูงมากเกินความจำเป็น และอาจทำให้ Google บล็อกการทำงานชั่วคราว (Quota Exceeded) แอดมินจึงควรปรับค่าความถี่เพื่อคงแถบสถานะเป็นสีเขียวปลอดภัยเสมอ
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-slate-405 mb-4">
                    The Google Calendar API enforces a limit of <strong>1,000,000 requests per day</strong>. This simulator calculates expected API consumption based on active sport setups.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded bg-teal-400"></span>
                        Quota Metrics Variables
                      </h4>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-slate-400">
                        <li><strong>Connected Calendars:</strong> Total calendar feeds configured across all active sports. Each calendar consumes 1 request per sync.</li>
                        <li><strong>Cron Frequency:</strong> Interval set for automated background synchronizations (e.g. every 360 minutes / 6 hours).</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded bg-teal-400"></span>
                        Calculations
                      </h4>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-slate-400 font-mono text-[11px]">
                        <li>Sync Runs Per Day = 1,440 minutes (24 hours) / Sync Frequency</li>
                        <li>Automated Requests = Sync Runs Per Day × Connected Calendars</li>
                        <li>Projected Daily Requests = Automated Requests + Manual Sync Requests</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-100 mb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded bg-rose-500"></span>
                        Key Precautionary Rule
                      </h4>
                      <p className="text-xs text-slate-400">
                        Setting sync frequency too short (e.g., every 1 or 5 minutes) consumes a high number of queries, leading to temporary lockouts (Quota Exceeded). Ensure projected daily parameters remain in the safe green status bar.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-800/60 pt-4 mt-4 flex justify-end flex-shrink-0">
              <button
                onClick={() => setIsSyncInfoModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 transition-all cursor-pointer shadow-lg shadow-teal-500/15"
              >
                {syncInfoLang === 'th' ? 'เข้าใจแล้ว' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
