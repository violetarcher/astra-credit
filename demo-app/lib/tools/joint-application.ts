import { Tool, text, error } from './index';
import { checkPermission } from '@/lib/fga';
import { getFgaUserId } from '@/lib/auth';

export const jointApplicationTool: Tool = {
  name: 'get_joint_application_data',
  description:
    'Retrieves data for a joint mortgage application. ' +
    'Only users who have been added as applicants to the joint application can access this data.',
  inputSchema: {
    type: 'object',
    properties: {
      application_id: {
        type: 'string',
        description: 'The joint application identifier (e.g. joint-2024)',
      },
    },
    required: ['application_id'],
  },

  async handler(args, userId) {
    let fgaUserId: string;
    try {
      fgaUserId = getFgaUserId(userId);
    } catch {
      return error('User not found in AstraCredit system.');
    }

    const applicationId = (args.application_id as string) ?? 'joint-2024';

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
            `Access denied. ${fgaUserId} is not listed as an applicant on mortgage application "${applicationId}". ` +
            'To be granted access, the other applicant or an AstraCredit administrator must add you to this application in the authorization system.',
          authorization_detail: {
            checked: `user:${fgaUserId} → can_view → mortgage_application:${applicationId}`,
            result: 'DENIED — no applicant relationship found in Auth0 FGA',
          },
        })
      );
    }

    // Would return joint application data if the user had access
    return text(JSON.stringify({ message: 'Access granted — joint application data would appear here.' }));
  },
};
