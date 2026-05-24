import { api } from '@/lib/axios';

export const adminService = {
  // Retrieve all user accounts
  async getUsers() {
    const response = await api.get('/admin/users');
    return response.data;
  },

  // Assign role to user
  async assignUserRole(userId: string, roleName: string) {
    const response = await api.post(`/admin/users/${userId}/roles`, { roleName });
    return response.data;
  },

  // Revoke role from user
  async revokeUserRole(userId: string, roleNames: string[]) {
    const response = await api.delete(`/admin/users/${userId}/roles`, {
      data: { roleNames },
    });
    return response.data;
  },

  // Retrieve system roles
  async getRoles() {
    const response = await api.get('/admin/roles');
    return response.data;
  },

  // Create custom role
  async createRole(name: string, description: string) {
    const response = await api.post('/admin/roles', { name, description });
    return response.data;
  },

  // Delete custom role
  async deleteRole(roleId: string) {
    const response = await api.delete(`/admin/roles/${roleId}`);
    return response.data;
  },

  // Assign permissions to role
  async assignRolePermissions(roleId: string, permissions: { action: string; description?: string }[]) {
    const response = await api.post(`/admin/roles/${roleId}/permissions`, { permissions });
    return response.data;
  },

  // Remove permissions from role
  async removeRolePermissions(roleId: string, permissionActions: string[]) {
    const response = await api.delete(`/admin/roles/${roleId}/permissions`, {
      data: { permissionActions },
    });
    return response.data;
  },

  // Retrieve sport categories
  async getSports() {
    const response = await api.get('/admin/sports');
    return response.data;
  },

  // Update sport category configuration
  async updateSport(sportId: string, data: { fullName?: string; calendarIds?: string[]; isActive?: boolean }) {
    const response = await api.patch(`/admin/sports/${sportId}`, data);
    return response.data;
  },

  // Trigger global google calendar synchronization
  async triggerGlobalSync() {
    const response = await api.post('/google-calendar/sync');
    return response.data;
  },
};
