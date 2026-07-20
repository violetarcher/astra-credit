import { Tool, text } from './index';
import { checkPermission } from '@/lib/fga';
import { checkGuardianEnrollment, getGuardianEnrollmentUrl, initiateCiba } from '@/lib/ciba';
import { getDemoData } from '@/data/demo-data';

export const mortgageModelTool: Tool = {
  name: 'run_mortgage_model',
  description:
    'Runs a mortgage eligibility analysis for the authenticated user using their credit profile data. ' +
    'Requires agent consent — if a CIBA approval is already on record in Auth0 FGA from a prior session, no additional push notification is sent. ' +
    'Always tell the user: (1) that you are calling this tool, (2) that Auth0 FGA is checking can_run_mortgage_model — and crucially whether this reused an existing consent tuple from the credit report or triggered a new CIBA push.',
  inputSchema: {
    type: 'object',
    properties: {},
  },

  async handler(_args, { authSub, fgaUserId, displayName }) {
    // Check Guardian enrollment
    const enrolled = await checkGuardianEnrollment(authSub);
    if (!enrolled) {
      const enrollmentUrl = await getGuardianEnrollmentUrl(authSub).catch(() => null);
      return text(
        JSON.stringify({
          status: 'enrollment_required',
          message:
            'Guardian push enrollment is required before sensitive operations can proceed.',
          enrollment_url: enrollmentUrl ?? 'Check your email for an enrollment link.',
        })
      );
    }

    // Checks the same consented_agent tuple written during get_credit_report CIBA approval
    const allowed = await checkPermission(
      'agent:claude',
      'can_run_mortgage_model',
      `credit_profile:${fgaUserId}`
    );

    if (allowed) {
      return text(JSON.stringify({
        _auth: { tool: 'run_mortgage_model', check: `agent:claude → can_run_mortgage_model → credit_profile:${fgaUserId}`, result: 'ALLOWED — reusing existing consent tuple (no push needed)' },
        ...getDemoData(displayName).mortgageEligibility,
      }, null, 2));
    }

    const authReqId = await initiateCiba(
      authSub,
      'AstraCredit: Approve mortgage eligibility analysis for Claude'
    );

    return text(JSON.stringify({
      _auth: { tool: 'run_mortgage_model', check: `agent:claude → can_run_mortgage_model → credit_profile:${fgaUserId}`, result: 'DENIED — no consent tuple, CIBA initiated' },
      status: 'ciba_pending',
      auth_req_id: authReqId,
      message:
        'Auth0 FGA denied access — no consent tuple on record. ' +
        'A Guardian push has been sent to your phone. ' +
        'Please approve, then call poll_ciba_approval with the auth_req_id.',
    }));
  },
};
