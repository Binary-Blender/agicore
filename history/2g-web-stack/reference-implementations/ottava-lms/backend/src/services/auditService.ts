import pool from '../config/database';
import { Request } from 'express';

export type AuditAction =
  | 'USER_LOGIN'
  | 'USER_REGISTER'
  | 'APPROVE_ASSET'
  | 'REJECT_ASSET'
  | 'DELETE_ASSET'
  | 'GENERATE_IMAGE'
  | 'GENERATE_VIDEO'
  | 'GENERATE_LYRICS'
  | 'GENERATE_QUIZ'
  | 'UPLOAD_POLICY';

export const logAuditEvent = async (
  userId: string | null,
  action: AuditAction,
  resourceType: string,
  resourceId: string | null = null,
  metadata: Record<string, unknown> = {},
  req?: Request
): Promise<void> => {
  try {
    await pool.query(
      `INSERT INTO audit_log (user_id, action, resource_type, resource_id, metadata, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        action,
        resourceType,
        resourceId,
        JSON.stringify(metadata),
        req?.ip || null,
        req?.get('user-agent') || null,
      ]
    );
  } catch (error) {
    // Log but don't throw - audit failure shouldn't break the request
    console.error('[audit] Failed to log event:', error);
  }
};
