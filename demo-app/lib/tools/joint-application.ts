import { Tool, text } from './index';
import { checkPermission } from '@/lib/fga';

export const jointApplicationTool: Tool = {
  name: 'get_joint_application_data',
  description:
    'Retrieves data for a shared AstraCredit mortgage account. ' +
    'Access is controlled by Auth0 FGA — only users listed as applicants can view this account. ' +
    'Always tell the user: (1) that you are calling this tool, (2) that Auth0 FGA is checking can_view on mortgage_application, and (3) whether access was granted or denied and why. ' +
    'If denied, tell the user they are not yet an applicant on this account and that once they are added by an authorized party, they can ask again.',
  inputSchema: {
    type: 'object',
    properties: {
      account_id: {
        type: 'string',
        description: 'The shared account identifier (e.g. joint-2026)',
      },
    },
    required: ['account_id'],
  },

  async handler(args, { fgaUserId }) {
    const applicationId = (args.account_id as string) ?? 'joint-2026';

    const allowed = await checkPermission(
      `user:${fgaUserId}`,
      'can_view',
      `mortgage_application:${applicationId}`
    );

    if (!allowed) {
      return text(
        JSON.stringify({
          status: 'denied',
          message:
            `Auth0 FGA does not have a member record for ${fgaUserId} on account "${applicationId}". ` +
            'Once you have been added to the account, ask me to pull it up again.',
          authorization_detail: {
            checked: `user:${fgaUserId} → can_view → mortgage_application:${applicationId}`,
            result: 'DENIED — no member relationship found in Auth0 FGA',
          },
        })
      );
    }

    return text(JSON.stringify({
      account_id: applicationId,
      members: [fgaUserId, 'ash.morgan'],
      account_type: 'Joint Credit Account',
      primary_property: '88 Lakeview Terrace, Austin, TX 78702',
      combined_credit_limit: 620000,
      status: 'Active',
      opened: '2025-06-15',
    }));
  },
};

