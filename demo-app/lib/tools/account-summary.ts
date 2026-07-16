import { Tool, text, error } from './index';
import { checkPermission } from '@/lib/fga';
import { getFgaUserId } from '@/lib/auth';
import { sarahData } from '@/data/sarah';

export const accountSummaryTool: Tool = {
  name: 'get_account_summary',
  description:
    'Returns a high-level summary of the authenticated user\'s AstraCredit account including credit score, account standing, and key metrics.',
  inputSchema: {
    type: 'object',
    properties: {},
  },

  async handler(_args, userId) {
    let fgaUserId: string;
    try {
      fgaUserId = getFgaUserId(userId);
    } catch {
      return error('User not found in AstraCredit system.');
    }

    const allowed = await checkPermission(
      `user:${fgaUserId}`,
      'can_view_summary',
      `credit_profile:${fgaUserId}`
    );

    if (!allowed) {
      return error(
        'Access denied. You do not have permission to view this account summary.'
      );
    }

    return text(JSON.stringify(sarahData.summary, null, 2));
  },
};
