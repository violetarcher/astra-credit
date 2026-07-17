import { Tool, text } from './index';
import { checkPermission } from '@/lib/fga';
import { checkGuardianEnrollment, getGuardianEnrollmentUrl, initiateCiba } from '@/lib/ciba';
import { getDemoData } from '@/data/sarah';

export const mortgageModelTool: Tool = {
  name: 'run_mortgage_model',
  description:
    'Runs a mortgage eligibility analysis for the authenticated user using their credit profile data. ' +
    'Requires agent consent — if a CIBA approval is already on record in Auth0 FGA from a prior session, ' +
    'no additional push notification is sent.',
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
      return text(JSON.stringify(getDemoData(displayName).mortgageEligibility, null, 2));
    }

    // No consent on record — initiate CIBA
    const authReqId = await initiateCiba(
      authSub,
      'AstraCredit: Approve mortgage eligibility analysis for Claude'
    );

    return text(
      JSON.stringify({
        status: 'ciba_pending',
        auth_req_id: authReqId,
        message:
          'A push notification has been sent to your Guardian app. ' +
          'Please approve, then call poll_ciba_approval with the auth_req_id.',
      })
    );
  },
};
