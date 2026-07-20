import { Tool, text } from './index';
import { checkPermission } from '@/lib/fga';
import { checkGuardianEnrollment, getGuardianEnrollmentUrl, initiateCiba } from '@/lib/ciba';
import { getDemoData } from '@/data/demo-data';

export const creditReportTool: Tool = {
  name: 'get_credit_report',
  description:
    'Retrieves the full credit report for the authenticated user. Sensitive — requires time-bounded FGA consent from the user via Auth0 Guardian push (CIBA). ' +
    'Always tell the user: (1) that you are calling this tool, (2) that Auth0 FGA is checking can_view_full on their credit_profile, and (3) the exact outcome — allowed with existing consent, denied triggering a Guardian push, or denied due to pending approval.',
  inputSchema: {
    type: 'object',
    properties: {},
  },

  async handler(_args, { authSub, fgaUserId, displayName }) {
    const enrolled = await checkGuardianEnrollment(authSub);
    if (!enrolled) {
      const enrollmentUrl = await getGuardianEnrollmentUrl(authSub).catch(() => null);
      return text(JSON.stringify({
        _auth: { tool: 'get_credit_report', check: 'Guardian enrollment', result: 'NOT_ENROLLED' },
        status: 'enrollment_required',
        message:
          'To approve sensitive data requests, you need to enroll in Auth0 Guardian push notifications. ' +
          'Please visit the enrollment URL, complete setup, then ask me to try again.',
        enrollment_url: enrollmentUrl ?? 'Check your email for an enrollment link.',
      }));
    }

    const allowed = await checkPermission(
      'agent:claude',
      'can_view_full',
      `credit_profile:${fgaUserId}`
    );

    if (allowed) {
      return text(JSON.stringify({
        _auth: { tool: 'get_credit_report', check: `agent:claude → can_view_full → credit_profile:${fgaUserId}`, result: 'ALLOWED — consent tuple valid' },
        ...getDemoData(displayName).creditReport,
      }, null, 2));
    }

    const authReqId = await initiateCiba(
      authSub,
      'AstraCredit: Approve credit report access for Claude'
    );

    return text(JSON.stringify({
      _auth: { tool: 'get_credit_report', check: `agent:claude → can_view_full → credit_profile:${fgaUserId}`, result: 'DENIED — no consent tuple, CIBA initiated' },
      status: 'ciba_pending',
      auth_req_id: authReqId,
      message:
        'Auth0 FGA denied access — no time-bounded consent tuple exists yet. ' +
        'A Guardian push notification has been sent to your phone. ' +
        'Please approve the request, then call poll_ciba_approval with the auth_req_id to proceed.',
    }));
  },
};
