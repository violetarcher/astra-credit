import { Tool, text } from './index';
import { checkPermission, fgaClient } from '@/lib/fga';

export const jointApplicationTool: Tool = {
  name: 'get_joint_application_data',
  description:
    'Retrieves data for a joint mortgage application. ' +
    'Only users who have been added as applicants to the joint application can access this data. ' +
    'If access is denied, offer to call request_joint_application_access to request it.',
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

  async handler(args, { fgaUserId }) {
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
            'Would you like me to request access? I can call request_joint_application_access to add you as an applicant.',
          authorization_detail: {
            checked: `user:${fgaUserId} → can_view → mortgage_application:${applicationId}`,
            result: 'DENIED — no applicant relationship found in Auth0 FGA',
          },
        })
      );
    }

    return text(JSON.stringify({
      application_id: applicationId,
      applicants: [fgaUserId, 'alex.morgan'],
      property: '88 Lakeview Terrace, Austin, TX 78702',
      requestedLoanAmount: 620000,
      estimatedPropertyValue: 775000,
      status: 'In Review',
      submittedAt: '2025-06-15',
    }));
  },
};

export const requestJointApplicationAccessTool: Tool = {
  name: 'request_joint_application_access',
  description:
    'Adds the authenticated user as an applicant on a joint mortgage application in Auth0 FGA, ' +
    'granting them access to view the application data. Call this after get_joint_application_data returns access denied.',
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

  async handler(args, { fgaUserId }) {
    const applicationId = (args.application_id as string) ?? 'joint-2024';

    await fgaClient.write({
      writes: [
        {
          user: `user:${fgaUserId}`,
          relation: 'applicant',
          object: `mortgage_application:${applicationId}`,
        },
      ],
    });

    return text(
      JSON.stringify({
        status: 'granted',
        message: `Access granted. ${fgaUserId} has been added as an applicant on mortgage application "${applicationId}" in Auth0 FGA. You can now call get_joint_application_data.`,
        fga_tuple_written: `user:${fgaUserId} applicant mortgage_application:${applicationId}`,
      })
    );
  },
};
