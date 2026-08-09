import { createHash, createHmac } from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { AppError, forbidden, notFound, preconditionFailed } from '@/modules/shared/errors';
import { ROLE_PERMISSIONS, type ApprovalDecision, type ApprovalPublicLink, type UserRole } from '@/modules/shared/types';
import {
  createApprovalPublicLinkSchema,
  recordClientApprovalDecisionSchema,
  revokeApprovalPublicLinkSchema,
  type CreateApprovalPublicLinkInput,
  type RecordClientApprovalDecisionInput,
  type RevokeApprovalPublicLinkInput,
} from '@/modules/shared/validation';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const deriveSecret = (commandId: string, purpose: 'token' | 'challenge') => {
  const secret = process.env.APPROVAL_LINK_SECRET;
  if (!secret || secret.length < 32) throw new AppError('INTERNAL_ERROR', 'Approval link secret is not configured', 500);
  return createHmac('sha256', secret).update(`${purpose}:${commandId}`).digest(purpose === 'token' ? 'base64url' : 'hex');
};

export class PublicApprovalService {
  private async assertManager(approvalId: string, userId: string) {
    const supabase = await createClient();
    const { data: approval, error: approvalError } = await supabase.from('contract_approvals').select('id, organization_id, status, contract_package_id').eq('id', approvalId).single();
    if (approvalError && approvalError.code !== 'PGRST116') throw new AppError('INTERNAL_ERROR', approvalError.message, 500);
    if (!approval) throw notFound('Contract approval not found');
    const { data: membership, error: membershipError } = await supabase.from('organization_memberships').select('role').eq('organization_id', approval.organization_id).eq('user_id', userId).eq('status', 'active').single();
    if (membershipError && membershipError.code !== 'PGRST116') throw new AppError('INTERNAL_ERROR', membershipError.message, 500);
    if (!membership || !ROLE_PERMISSIONS.manage_approvals[membership.role as UserRole]) throw forbidden('Insufficient permissions');
    return { supabase, approval };
  }

  async createLink(input: CreateApprovalPublicLinkInput, userId: string, commandId = uuidv4()) {
    const validated = createApprovalPublicLinkSchema.parse(input);
    const { approval } = await this.assertManager(validated.approvalId, userId);
    if (approval.status !== 'pending_review') throw preconditionFailed('Approval must be pending review');
    if (validated.expiresAt && new Date(validated.expiresAt) <= new Date()) throw preconditionFailed('Link expiry must be in the future');
    const token = deriveSecret(commandId, 'token');
    const challenge = deriveSecret(commandId, 'challenge').slice(0, 8).toUpperCase();
    const serviceClient = await createServiceClient();
    const { data, error } = await serviceClient.rpc('create_client_approval_link', {
      p_organization_id: approval.organization_id,
      p_contract_approval_id: approval.id,
      p_contract_package_id: approval.contract_package_id,
      p_token_hash: hashToken(token), p_challenge_hash: hashToken(challenge),
      p_expires_at: validated.expiresAt || null, p_created_by: userId, p_command_id: commandId,
    });
    if (error || !data) throw new AppError('INTERNAL_ERROR', 'Failed to create public approval link', 500);
    return { link: data as ApprovalPublicLink, token, challenge };
  }

  async getLinkForStaff(approvalId: string, userId: string) {
    await this.assertManager(approvalId, userId);
    const serviceClient = await createServiceClient();
    const { data, error } = await serviceClient.from('approval_public_links')
      .select('id, status, expires_at, created_at, challenge_consumed_at')
      .eq('contract_approval_id', approvalId).maybeSingle();
    if (error) throw new AppError('INTERNAL_ERROR', error.message, 500);
    return data;
  }

  async revokeLink(input: RevokeApprovalPublicLinkInput, userId: string, commandId = uuidv4()) {
    const validated = revokeApprovalPublicLinkSchema.parse(input);
    const serviceClient = await createServiceClient();
    const { data: link, error: linkError } = await serviceClient.from('approval_public_links').select('*').eq('id', validated.linkId).single();
    if (linkError && linkError.code !== 'PGRST116') throw new AppError('INTERNAL_ERROR', linkError.message, 500);
    if (!link) throw notFound('Public approval link not found');
    const supabase = await createClient();
    const { data: membership, error: membershipError } = await supabase.from('organization_memberships').select('role').eq('organization_id', link.organization_id).eq('user_id', userId).eq('status', 'active').single();
    if (membershipError && membershipError.code !== 'PGRST116') throw new AppError('INTERNAL_ERROR', membershipError.message, 500);
    if (!membership || !ROLE_PERMISSIONS.manage_approvals[membership.role as UserRole]) throw forbidden('Insufficient permissions');
    if (link.status !== 'active') return link as ApprovalPublicLink;
    const { data, error } = await serviceClient.rpc('revoke_client_approval_link', { p_link_id: link.id, p_revoked_by: userId, p_command_id: commandId });
    if (error || !data) throw new AppError('INTERNAL_ERROR', 'Failed to revoke public approval link', 500);
    return data as ApprovalPublicLink;
  }

  async getPublicView(token: string) {
    const supabase = await createServiceClient();
    const { data: link } = await supabase.from('approval_public_links').select('id, status, expires_at, contract_approval_id, contract_package_id').eq('token_hash', hashToken(token)).single();
    if (!link || link.status !== 'active' || (link.expires_at && new Date(link.expires_at) <= new Date())) throw notFound('Approval link is invalid or expired');
    const { data: approval } = await supabase.from('contract_approvals').select('id, status, contract_package_id').eq('id', link.contract_approval_id).single();
    if (!approval) throw notFound('Approval not found');
    const { data: pkg } = await supabase.from('contract_packages').select('id, version, template_code').eq('id', link.contract_package_id).single();
    if (!pkg) throw notFound('Package not found');
    const { data: decisions } = await supabase.from('approval_decisions').select('id').eq('approval_public_link_id', link.id).limit(1);
    return { link, approval, package: pkg, decisions: decisions || [] };
  }

  async recordDecision(input: RecordClientApprovalDecisionInput, meta: { ipHash?: string; userAgentHash?: string }) {
    const validated = recordClientApprovalDecisionSchema.parse(input);
    const supabase = await createServiceClient();
    const commandId = validated.commandId || uuidv4();
    const { data, error } = await supabase.rpc('record_client_approval_decision', {
      p_token_hash: hashToken(validated.token),
      p_challenge_hash: hashToken(validated.challengeCode.toUpperCase()),
      p_decision: validated.decision,
      p_comment: validated.comment || '',
      p_client_name: validated.clientName || '',
      p_client_email: validated.clientEmail || '',
      p_client_ip_hash: meta.ipHash || null,
      p_user_agent_hash: meta.userAgentHash || null,
      p_command_id: commandId,
    });
    if (error || !data) {
      throw new AppError('INTERNAL_ERROR', 'Failed to record client decision', 500);
    }
    const rpcResult = data as { error?: string; decision?: ApprovalDecision };
    if (rpcResult.error?.startsWith('approval_challenge')) throw preconditionFailed('Неверный или недоступный код подтверждения');
    if (rpcResult.error === 'approval_link_invalid') throw notFound('Ссылка недействительна или истекла');
    if (!rpcResult.decision) throw new AppError('INTERNAL_ERROR', 'Decision was not returned', 500);
    return rpcResult.decision;
  }
}

export const publicApprovalService = new PublicApprovalService();
