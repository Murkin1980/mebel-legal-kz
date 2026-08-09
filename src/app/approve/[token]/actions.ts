'use server';

import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { publicApprovalService } from '@/modules/approvals/public-approval.service';
import { AppError } from '@/modules/shared/errors';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');

export async function submitClientDecision(input: {
  token: string; challengeCode: string; decision: 'approved' | 'rejected';
  comment?: string; clientName?: string; clientEmail?: string; commandId: string;
}) {
  try {
    const requestHeaders = await headers();
    const forwarded = requestHeaders.get('cf-connecting-ip') || requestHeaders.get('x-forwarded-for') || '';
    const userAgent = requestHeaders.get('user-agent') || '';
    const result = await publicApprovalService.recordDecision(input, {
      ipHash: forwarded ? hash(forwarded.split(',')[0].trim()) : undefined,
      userAgentHash: userAgent ? hash(userAgent) : undefined,
    });
    return { success: true as const, decision: result.decision };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message, errorCode: error.code };
    return { success: false as const, error: 'Не удалось сохранить решение', errorCode: 'INTERNAL_ERROR' };
  }
}
