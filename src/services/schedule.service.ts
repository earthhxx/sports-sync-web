import { api } from '@/lib/axios';
import { ReconciliationResult } from '@/lib/reconciliation-parser';

export const scheduleService = {
  async reconcile(text: string): Promise<ReconciliationResult> {
    const response = await api.post('/calendar/reconcile', { text });
    return response.data;
  },
};
