export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isEmailVerified: boolean;
  roles: string[];
  permissions: string[];
}

export interface SportCategory {
  id: string;
  name: string;
  fullName: string;
  calendarIds: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CalendarEvent {
  id: string;
  externalEventId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  sportName: string;
  location?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: {
    permission: Permission;
  }[];
}

export interface Permission {
  id: string;
  action: string;
  description?: string;
}

export interface UserManagementItem {
  id: string;
  email: string;
  isEmailVerified: boolean;
  userInfo?: {
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
  userRoles: {
    role: {
      name: string;
      permissions: {
        permission: Permission;
      }[];
    };
  }[];
}
