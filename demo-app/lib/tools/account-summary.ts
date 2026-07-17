import { Tool, text, error } from './index';
import { checkPermission } from '@/lib/fga';
import { getDemoData } from '@/data/sarah';

export const accountSummaryTool: Tool = {
  name: 'get_account_summary',
  description:
    'Returns a high-level summary of the authenticated user\'s AstraCredit account including credit score, account standing, and key metrics.',
  inputSchema: {
    type: 'object',
    properties: {},
  },

  async handler(_args, { fgaUserId, displayName }) {
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

    return text(JSON.stringify(getDemoData(displayName).summary, null, 2));
  },
};
