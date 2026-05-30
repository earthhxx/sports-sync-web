import { api } from '@/lib/axios';

export const calendarService = {
  // Retrieve authorized calendar events with optional query filters
  async getEvents(filters?: { startDate?: string; endDate?: string; sports?: string; page?: number; limit?: number }, config?: any) {
    const response = await api.get('/calendar', { params: filters, ...config });
    return response.data;
  },

  // Retrieve active sport categories dynamically from database for filters
  async getSports() {
    const response = await api.get('/calendar/sports');
    return response.data;
  },

  // Retrieve sports availability count in date range
  async getSportsAvailability(startDate?: string, endDate?: string) {
    const response = await api.get('/calendar/sports-availability', {
      params: { startDate, endDate },
    });
    return response.data as { sportName: string; count: number }[];
  },

  // Export schedule; returns the file string
  async exportSchedule(params: any, format: 'txt' | 'csv' = 'txt', eventIds?: string[]): Promise<string> {
    const data = { ...params, format, eventIds };
    const response = await api.post(`/calendar/export`, data, {
      responseType: 'text',
    });
    return typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data, null, 2);
  },
  
  // Get all matched events for export preview (unpaginated/large limit)
  async getExportPreview(params: { startDate?: string; endDate?: string; sports?: string }) {
    const response = await api.get('/calendar', { params: { ...params, limit: 2000, page: 1 } });
    return response.data;
  },
};
