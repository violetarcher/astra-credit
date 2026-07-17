import { Tool, text } from './index';
import { checkPermission } from '@/lib/fga';
import { checkGuardianEnrollment, getGuardianEnrollmentUrl, initiateCiba } from '@/lib/ciba';
import { getDemoData } from '@/data/demo-data';

export const creditReportTool: Tool = {
  name: 'get_credit_report',
  description:
    'Retrieves the full credit report for the authenticated user. This is a sensitive operation — if the user has not previously granted agent access, they will receive a push notification via Auth0 Guardian to approve.',
  inputSchema: {
    type: 'object',
    properties: {},
  },

  async handler(_args, { authSub, fgaUserId, displayName }) {
    // Check Guardian enrollment before anything else
    const enrolled = await checkGuardianEnrollment(authSub);
    if (!enrolled) {
      const enrollmentUrl = await getGuardianEnrollmentUrl(authSub).catch(() => null);
      return text(
        JSON.stringify({
          status: 'enrollment_required',
          message:
            'To approve sensitive data requests, you need to enroll in Auth0 Guardian push notifications. ' +
            'Please visit the enrollment URL, complete setup, then ask me to try again.',
          enrollment_url: enrollmentUrl ?? 'Check your email for an enrollment link.',
        })
      );
    }

    // Check FGA: does agent:claude have time-bounded consent for this user?
    const allowed = await checkPermission(
      'agent:claude',
      'can_view_full',
      `credit_profile:${fgaUserId}`
    );

    if (allowed) {
      return text(JSON.stringify(getDemoData(displayName).creditReport, null, 2));
    }

    // No valid consent tuple — initiate CIBA
    const authReqId = await initiateCiba(
      authSub,
      'AstraCredit: Approve credit report access for Claude'
    );

    return text(
      JSON.stringify({
        status: 'ciba_pending',
        auth_req_id: authReqId,
        message:
          'A push notification has been sent to your Guardian app. ' +
          'Please approve the request, then call poll_ciba_approval with the auth_req_id to proceed.',
      })
    );
  },
};
