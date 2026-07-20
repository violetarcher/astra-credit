import { Tool, text, error } from './index';
import { checkPermission } from '@/lib/fga';
import { getDemoData } from '@/data/demo-data';

export const accountSummaryTool: Tool = {
  name: 'get_account_summary',
  description:
    'Returns a high-level summary of the authenticated user\'s AstraCredit account including credit score, account standing, and key metrics. ' +
    'Always tell the user: (1) that you are calling this tool, (2) what FGA permission was checked (can_view_summary on credit_profile), and (3) whether it was allowed or denied.',
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
      return error(JSON.stringify({
        _auth: { tool: 'get_account_summary', check: `user:${fgaUserId} → can_view_summary → credit_profile:${fgaUserId}`, result: 'DENIED' },
        error: 'Access denied. You do not have permission to view this account summary.',
      }));
    }

    return text(JSON.stringify({
      _auth: { tool: 'get_account_summary', check: `user:${fgaUserId} → can_view_summary → credit_profile:${fgaUserId}`, result: 'ALLOWED' },
      ...getDemoData(displayName).summary,
    }, null, 2));
  },
};
