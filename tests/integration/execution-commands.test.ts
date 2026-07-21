import { describe, it, expect } from 'vitest';
import {
  EXECUTION_PHASE_TRANSITIONS,
  CHECKPOINT_TRANSITIONS,
  ROLE_PERMISSIONS,
} from '@/modules/shared/types';
import type { ExecutionPhaseName, CheckpointStatus, UserRole } from '@/modules/shared/types';
import {
  createExecutionPhaseSchema,
  transitionExecutionPhaseSchema,
  createCheckpointSchema,
  completeCheckpointSchema,
  reopenCheckpointSchema,
  updatePaymentSummarySchema,
} from '@/modules/shared/validation';

describe('Execution Phase Commands Integration', () => {
  describe('full lifecycle', () => {
    it('should follow complete lifecycle: drafting → internal_review → client_negotiation → signed → in_production → delivered → archived', () => {
      const transitions: ExecutionPhaseName[] = [];
      let currentPhase: ExecutionPhaseName = 'drafting';

      expect(EXECUTION_PHASE_TRANSITIONS[currentPhase]).toContain('internal_review');
      transitions.push('internal_review');
      currentPhase = 'internal_review';

      expect(EXECUTION_PHASE_TRANSITIONS[currentPhase]).toContain('client_negotiation');
      transitions.push('client_negotiation');
      currentPhase = 'client_negotiation';

      expect(EXECUTION_PHASE_TRANSITIONS[currentPhase]).toContain('signed');
      transitions.push('signed');
      currentPhase = 'signed';

      expect(EXECUTION_PHASE_TRANSITIONS[currentPhase]).toContain('in_production');
      transitions.push('in_production');
      currentPhase = 'in_production';

      expect(EXECUTION_PHASE_TRANSITIONS[currentPhase]).toContain('delivered');
      transitions.push('delivered');
      currentPhase = 'delivered';

      expect(EXECUTION_PHASE_TRANSITIONS[currentPhase]).toContain('archived');
      transitions.push('archived');
      currentPhase = 'archived';

      expect(EXECUTION_PHASE_TRANSITIONS[currentPhase]).toHaveLength(0);

      expect(transitions).toEqual([
        'internal_review',
        'client_negotiation',
        'signed',
        'in_production',
        'delivered',
        'archived',
      ]);
    });

    it('should allow rework: client_negotiation → drafting', () => {
      let currentPhase: ExecutionPhaseName = 'client_negotiation';
      expect(EXECUTION_PHASE_TRANSITIONS[currentPhase]).toContain('drafting');
      currentPhase = 'drafting';
      expect(EXECUTION_PHASE_TRANSITIONS[currentPhase]).toContain('internal_review');
    });

    it('should allow return to review: client_negotiation → internal_review', () => {
      let currentPhase: ExecutionPhaseName = 'client_negotiation';
      expect(EXECUTION_PHASE_TRANSITIONS[currentPhase]).toContain('internal_review');
      currentPhase = 'internal_review';
      expect(EXECUTION_PHASE_TRANSITIONS[currentPhase]).toContain('client_negotiation');
    });

    it('should allow shortcut to archived from any non-terminal phase', () => {
      const nonTerminal: ExecutionPhaseName[] = [
        'drafting',
        'internal_review',
        'client_negotiation',
        'signed',
        'in_production',
        'delivered',
      ];
      for (const phase of nonTerminal) {
        expect(EXECUTION_PHASE_TRANSITIONS[phase]).toContain('archived');
      }
    });
  });

  describe('forbidden transitions', () => {
    it('should not allow signed → drafting', () => {
      expect(EXECUTION_PHASE_TRANSITIONS.signed).not.toContain('drafting');
    });

    it('should not allow archived → any', () => {
      expect(EXECUTION_PHASE_TRANSITIONS.archived).toHaveLength(0);
    });

    it('should not allow delivered → in_production', () => {
      expect(EXECUTION_PHASE_TRANSITIONS.delivered).not.toContain('in_production');
    });
  });

  describe('role permissions', () => {
    it('should allow owner, manager, operations to manage execution phase', () => {
      const allowedRoles: UserRole[] = ['owner', 'manager', 'operations'];
      for (const role of allowedRoles) {
        expect(ROLE_PERMISSIONS.manage_execution_phase[role]).toBe(true);
      }
    });

    it('should deny designer, legal_reviewer, observer to manage execution phase', () => {
      const deniedRoles: UserRole[] = ['designer', 'legal_reviewer', 'observer'];
      for (const role of deniedRoles) {
        expect(ROLE_PERMISSIONS.manage_execution_phase[role]).toBe(false);
      }
    });

    it('should allow all roles to view execution', () => {
      const allRoles: UserRole[] = ['owner', 'manager', 'designer', 'legal_reviewer', 'operations', 'observer'];
      for (const role of allRoles) {
        expect(ROLE_PERMISSIONS.view_execution[role]).toBe(true);
      }
    });
  });
});

describe('Checkpoint Commands Integration', () => {
  describe('checkpoint lifecycle', () => {
    it('should follow complete lifecycle: pending → in_progress → completed → reopened → completed', () => {
      const transitions: CheckpointStatus[] = [];
      let status: CheckpointStatus = 'pending';

      expect(CHECKPOINT_TRANSITIONS[status]).toContain('in_progress');
      transitions.push('in_progress');
      status = 'in_progress';

      expect(CHECKPOINT_TRANSITIONS[status]).toContain('completed');
      transitions.push('completed');
      status = 'completed';

      expect(CHECKPOINT_TRANSITIONS[status]).toContain('reopened');
      transitions.push('reopened');
      status = 'reopened';

      expect(CHECKPOINT_TRANSITIONS[status]).toContain('completed');
      transitions.push('completed');
      status = 'completed';

      expect(transitions).toEqual(['in_progress', 'completed', 'reopened', 'completed']);
    });

    it('should allow pending → completed (direct)', () => {
      expect(CHECKPOINT_TRANSITIONS.pending).toContain('completed');
    });
  });

  describe('forbidden transitions', () => {
    it('should not allow completed → pending', () => {
      expect(CHECKPOINT_TRANSITIONS.completed).not.toContain('pending');
    });

    it('should not allow completed → in_progress', () => {
      expect(CHECKPOINT_TRANSITIONS.completed).not.toContain('in_progress');
    });
  });

  describe('role permissions', () => {
    it('should allow owner, manager, legal_reviewer, operations to manage checkpoints', () => {
      const allowedRoles: UserRole[] = ['owner', 'manager', 'legal_reviewer', 'operations'];
      for (const role of allowedRoles) {
        expect(ROLE_PERMISSIONS.manage_checkpoints[role]).toBe(true);
      }
    });

    it('should all roles to view checkpoints', () => {
      const allRoles: UserRole[] = ['owner', 'manager', 'designer', 'legal_reviewer', 'operations', 'observer'];
      for (const role of allRoles) {
        expect(ROLE_PERMISSIONS.view_checkpoints[role]).toBe(true);
      }
    });
  });
});

describe('Execution Commands Validation', () => {
  it('should validate create execution phase', () => {
    const result = createExecutionPhaseSchema.safeParse({
      legalCaseId: '00000000-0000-0000-0000-000000000001',
      contractPackageId: '00000000-0000-0000-0000-000000000002',
    });
    expect(result.success).toBe(true);
  });

  it('should reject create execution phase with invalid UUIDs', () => {
    const result = createExecutionPhaseSchema.safeParse({
      legalCaseId: 'not-a-uuid',
      contractPackageId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('should validate transition execution phase', () => {
    const result = transitionExecutionPhaseSchema.safeParse({
      executionPhaseId: '00000000-0000-0000-0000-000000000001',
      targetPhase: 'internal_review',
    });
    expect(result.success).toBe(true);
  });

  it('should reject transition to invalid phase name', () => {
    const result = transitionExecutionPhaseSchema.safeParse({
      executionPhaseId: '00000000-0000-0000-0000-000000000001',
      targetPhase: 'non_existent_phase',
    });
    expect(result.success).toBe(false);
  });

  it('should validate create checkpoint', () => {
    const result = createCheckpointSchema.safeParse({
      executionPhaseId: '00000000-0000-0000-0000-000000000001',
      name: 'Проверить черновик',
      description: 'Проверить соответствие нормам',
      assignedRole: 'legal_reviewer',
    });
    expect(result.success).toBe(true);
  });

  it('should reject create checkpoint with empty name', () => {
    const result = createCheckpointSchema.safeParse({
      executionPhaseId: '00000000-0000-0000-0000-000000000001',
      name: '',
    });
    expect(result.success).toBe(false);
  });

  it('should validate complete checkpoint', () => {
    const result = completeCheckpointSchema.safeParse({
      checkpointId: '00000000-0000-0000-0000-000000000001',
    });
    expect(result.success).toBe(true);
  });

  it('should validate reopen checkpoint', () => {
    const result = reopenCheckpointSchema.safeParse({
      checkpointId: '00000000-0000-0000-0000-000000000001',
    });
    expect(result.success).toBe(true);
  });

  it('should validate update payment summary with positive delta', () => {
    const result = updatePaymentSummarySchema.safeParse({
      legalCaseId: '00000000-0000-0000-0000-000000000001',
      contractPackageId: '00000000-0000-0000-0000-000000000002',
      amountDelta: '50000000',
    });
    expect(result.success).toBe(true);
  });

  it('should validate update payment summary with negative delta', () => {
    const result = updatePaymentSummarySchema.safeParse({
      legalCaseId: '00000000-0000-0000-0000-000000000001',
      contractPackageId: '00000000-0000-0000-0000-000000000002',
      amountDelta: '-50000000',
    });
    expect(result.success).toBe(true);
  });

  it('should reject update payment summary with non-integer string', () => {
    const result = updatePaymentSummarySchema.safeParse({
      legalCaseId: '00000000-0000-0000-0000-000000000001',
      contractPackageId: '00000000-0000-0000-0000-000000000002',
      amountDelta: '50000.50',
    });
    expect(result.success).toBe(false);
  });
});

describe('Payments Summary Roles', () => {
  it('should allow owner and operations to manage payments summary', () => {
    expect(ROLE_PERMISSIONS.manage_payments_summary.owner).toBe(true);
    expect(ROLE_PERMISSIONS.manage_payments_summary.operations).toBe(true);
    expect(ROLE_PERMISSIONS.manage_payments_summary.manager).toBe(false);
    expect(ROLE_PERMISSIONS.manage_payments_summary.designer).toBe(false);
    expect(ROLE_PERMISSIONS.manage_payments_summary.legal_reviewer).toBe(false);
    expect(ROLE_PERMISSIONS.manage_payments_summary.observer).toBe(false);
  });

  it('should allow all roles to view payments summary', () => {
    const allRoles: UserRole[] = ['owner', 'manager', 'designer', 'legal_reviewer', 'operations', 'observer'];
    for (const role of allRoles) {
      expect(ROLE_PERMISSIONS.view_payments_summary[role]).toBe(true);
    }
  });
});
