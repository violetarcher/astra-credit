import { z } from 'zod';
import { Tool, text, error } from './index';
import { pollCibaToken } from '@/lib/ciba';
import { writeConsentTuple } from '@/lib/fga';

const schema = z.object({
  auth_req_id: z.string().min(1),
});

export const pollCibaApprovalTool: Tool = {
  name: 'poll_ciba_approval',
  description:
    'Polls for the status of a pending CIBA (backchannel authentication) approval. ' +
    'When the user approves on their Guardian app, this records their consent in Auth0 FGA ' +
    'as a 30-day time-bounded relationship. Call this after get_credit_report or run_mortgage_model returns ciba_pending.',
  inputSchema: {
    type: 'object',
    properties: {
      auth_req_id: {
        type: 'string',
        description: 'The auth_req_id returned by the tool that initiated the CIBA request.',
      },
    },
    required: ['auth_req_id'],
  },

  async handler(args, { fgaUserId }) {
    const parsed = schema.safeParse(args);
    if (!parsed.success) return error('Invalid arguments: auth_req_id is required.');

    const status = await pollCibaToken(parsed.data.auth_req_id);

    if (status === 'approved') {
      // Write the time-bounded consent tuple to FGA
      await writeConsentTuple(fgaUserId);

      return text(
        JSON.stringify({
          status: 'approved',
          message:
            'Approval received. Consent has been recorded in Auth0 FGA as a 30-day time-bounded relationship. ' +
            'You can now retry the original request — no further approval will be needed within this window.',
          fga_tuple_written: `agent:claude consented_agent credit_profile:${fgaUserId} (expires in 30 days)`,
        })
      );
    }

    if (status === 'denied') {
      return text(
        JSON.stringify({
          status: 'denied',
          message: 'The request was denied. No data will be returned.',
        })
      );
    }

    if (status === 'expired') {
      return text(
        JSON.stringify({
          status: 'expired',
          message: 'The approval window expired. Please retry the original request to initiate a new one.',
        })
      );
    }

    return text(
      JSON.stringify({
        status: 'pending',
        message: 'Approval is still pending. Check your Guardian app and try again in a moment.',
      })
    );
  },
};
