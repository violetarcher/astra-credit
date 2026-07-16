import { Tool, text, error } from './index';
import { checkGuardianEnrollment, getGuardianEnrollmentUrl } from '@/lib/ciba';

export const checkGuardianEnrollmentTool: Tool = {
  name: 'check_guardian_enrollment',
  description:
    'Checks whether the authenticated user has enrolled in Auth0 Guardian push notifications. ' +
    'Guardian enrollment is required before CIBA approval flows can be used.',
  inputSchema: {
    type: 'object',
    properties: {},
  },

  async handler(_args, userId) {
    try {
      const enrolled = await checkGuardianEnrollment(userId);
      return text(
        JSON.stringify({
          enrolled,
          message: enrolled
            ? 'Guardian push notifications are active. CIBA approvals can proceed.'
            : 'Not enrolled. Use get_guardian_enrollment_url to get a setup link.',
        })
      );
    } catch (e) {
      return error(`Failed to check enrollment status: ${(e as Error).message}`);
    }
  },
};

export const getGuardianEnrollmentUrlTool: Tool = {
  name: 'get_guardian_enrollment_url',
  description:
    'Generates a Guardian enrollment URL for the authenticated user. ' +
    'The user should open this URL on their mobile device to set up push notification approvals.',
  inputSchema: {
    type: 'object',
    properties: {},
  },

  async handler(_args, userId) {
    try {
      const url = await getGuardianEnrollmentUrl(userId);
      return text(
        JSON.stringify({
          enrollment_url: url,
          message:
            'Open this URL on your mobile device to complete Guardian enrollment. ' +
            'Once done, call check_guardian_enrollment to confirm, then retry your original request.',
        })
      );
    } catch (e) {
      return error(`Failed to generate enrollment URL: ${(e as Error).message}`);
    }
  },
};
