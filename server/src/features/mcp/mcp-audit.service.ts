import crypto from 'node:crypto';
import { AuthUserContext } from './mcp.types';

export interface McpAuditLogEntry {
  timestamp: string;
  userId: string;
  userName: string;
  role: string;
  toolName: string;
  argumentsHash: string;
  durationMs: number;
  status: 'SUCCESS' | 'ERROR' | 'FORBIDDEN';
  errorMessage?: string;
}

class McpAuditService {
  /**
   * Hashes tool input arguments to preserve privacy and prevent PII logging
   * while maintaining a cryptographic proof of inputs for audits.
   */
  public hashArguments(args: unknown): string {
    try {
      const serialized = JSON.stringify(args || {});
      return crypto.createHash('sha256').update(serialized).digest('hex').substring(0, 16);
    } catch {
      return 'unhashable_payload';
    }
  }

  /**
   * Records a structured audit log entry for tool executions.
   */
  public logToolExecution(
    context: AuthUserContext,
    toolName: string,
    rawArgs: unknown,
    startTime: number,
    status: 'SUCCESS' | 'ERROR' | 'FORBIDDEN',
    errorMessage?: string
  ): McpAuditLogEntry {
    const durationMs = Math.round(performance.now() - startTime);
    const entry: McpAuditLogEntry = {
      timestamp: new Date().toISOString(),
      userId: context.userId,
      userName: context.name,
      role: context.role,
      toolName,
      argumentsHash: this.hashArguments(rawArgs),
      durationMs,
      status,
      errorMessage,
    };

    // Structured JSON log output suitable for enterprise log collectors (Datadog, CloudWatch, Loki)
    console.log(`[MCP AUDIT] ${JSON.stringify(entry)}`);

    return entry;
  }
}

export const mcpAuditService = new McpAuditService();
