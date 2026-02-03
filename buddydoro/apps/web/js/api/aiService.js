// apps/web/js/api/aiService.js
import { apiPost } from './apiClient.js';

export async function generatePlan(goal) {
    return await apiPost('/ai/plan', { goal });
}
