import { accountSummaryTool } from './account-summary';
import { creditReportTool } from './credit-report';
import { mortgageModelTool } from './mortgage-model';
import { jointApplicationTool, requestJointApplicationAccessTool } from './joint-application';
import { checkGuardianEnrollmentTool, getGuardianEnrollmentUrlTool } from './guardian-enrollment';
import { pollCibaApprovalTool } from './ciba-poll';

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export interface ToolContext {
  authSub: string;
  fgaUserId: string;
  displayName: string;
}

export interface Tool extends McpToolDefinition {
  handler: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;
}

const registry: Tool[] = [
  accountSummaryTool,
  creditReportTool,
  pollCibaApprovalTool,
  mortgageModelTool,
  jointApplicationTool,
  requestJointApplicationAccessTool,
  checkGuardianEnrollmentTool,
  getGuardianEnrollmentUrlTool,
];

const toolMap = new Map(registry.map((t) => [t.name, t]));

export function listTools(): McpToolDefinition[] {
  return registry.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  }));
}

export async function callTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<ToolResult> {
  const tool = toolMap.get(name);
  if (!tool) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }
  return tool.handler(args, ctx);
}

function text(content: string): ToolResult {
  return { content: [{ type: 'text', text: content }] };
}

function error(message: string): ToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

export { text, error };
