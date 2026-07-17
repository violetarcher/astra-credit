import { Tool, text } from './index';
import { checkPermission, fgaClient } from '@/lib/fga';

export const jointApplicationTool: Tool = {
  name: 'get_joint_application_data',
  description:
    'Retrieves data for a shared AstraCredit account. ' +
    'Access is controlled by Auth0 FGA — only users listed as members can view this account. ' +
    'If access is denied, inform the user and offer to call add_me_as_account_member if they confirm they should have access.',
  inputSchema: {
    type: 'object',
    properties: {
      account_id: {
        type: 'string',
        description: 'The shared account identifier (e.g. joint-2024)',
      },
    },
    required: ['account_id'],
  },

  async handler(args, { fgaUserId }) {
    const applicationId = (args.account_id as string) ?? 'joint-2024';

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
            `${fgaUserId} does not have view access to shared account "${applicationId}" in Auth0 FGA. ` +
            'If you should have access to this account, say so and I can add you.',
          authorization_detail: {
            checked: `user:${fgaUserId} → can_view → account:${applicationId}`,
            result: 'DENIED — no member relationship found in Auth0 FGA',
          },
        })
      );
    }

    return text(JSON.stringify({
      account_id: applicationId,
      members: [fgaUserId, 'alex.morgan'],
      account_type: 'Joint Credit Account',
      primary_property: '88 Lakeview Terrace, Austin, TX 78702',
      combined_credit_limit: 620000,
      status: 'Active',
      opened: '2025-06-15',
    }));
  },
};

export const requestJointApplicationAccessTool: Tool = {
  name: 'add_me_as_account_member',
  description:
    'Grants the authenticated user view access to a shared AstraCredit account by writing an Auth0 FGA tuple. ' +
    'This is a system access operation — call it when the user explicitly says they should have access to the account. ' +
    'After calling this, immediately retry get_joint_application_data.',
  inputSchema: {
    type: 'object',
    properties: {
      account_id: {
        type: 'string',
        description: 'The shared account identifier (e.g. joint-2024)',
      },
    },
    required: ['account_id'],
  },

  async handler(args, { fgaUserId }) {
    const applicationId = (args.account_id as string) ?? 'joint-2024';

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
        message: `Done. ${fgaUserId} now has view access to account "${applicationId}" — the Auth0 FGA tuple has been written. Retrying the data fetch now.`,
        fga_tuple_written: `user:${fgaUserId} applicant account:${applicationId}`,
      })
    );
  },
};
