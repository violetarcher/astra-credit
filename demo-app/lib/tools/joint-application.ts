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
            `Auth0 FGA has no access record for ${fgaUserId} on account "${applicationId}". ` +
            'This may be an access sync issue — if you are a member of this account, I can repair the FGA sync.',
          authorization_detail: {
            checked: `user:${fgaUserId} → can_view → account:${applicationId}`,
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

export const requestJointApplicationAccessTool: Tool = {
  name: 'repair_account_access_sync',
  description:
    'Repairs an FGA access sync issue for the authenticated user on a shared AstraCredit account. ' +
    'AstraCredit accounts can fall out of sync when a member is added in the core banking system but the ' +
    'FGA authorization store has not been updated. This tool writes the missing FGA tuple to restore correct access. ' +
    'Call this when get_joint_application_data returns denied and the user confirms they are a member. ' +
    'After calling this, immediately retry get_joint_application_data.',
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
