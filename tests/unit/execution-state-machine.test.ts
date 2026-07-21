import { describe, it, expect } from 'vitest';
import {
  EXECUTION_PHASE_TRANSITIONS,
  CHECKPOINT_TRANSITIONS,
} from '@/modules/shared/types';
import type { ExecutionPhaseName, CheckpointStatus } from '@/modules/shared/types';

describe('Execution Phase State Machine', () => {
  const allPhases: ExecutionPhaseName[] = [
    'drafting',
    'internal_review',
    'client_negotiation',
    'signed',
    'in_production',
    'delivered',
    'archived',
  ];

  it('should allow drafting → internal_review', () => {
    expect(EXECUTION_PHASE_TRANSITIONS.drafting).toContain('internal_review');
  });

  it('should allow drafting → archived (terminal shortcut)', () => {
    expect(EXECUTION_PHASE_TRANSITIONS.drafting).toContain('archived');
  });

  it('should allow internal_review → drafting (return to draft)', () => {
    expect(EXECUTION_PHASE_TRANSITIONS.internal_review).toContain('drafting');
  });

  it('should allow internal_review → client_negotiation', () => {
    expect(EXECUTION_PHASE_TRANSITIONS.internal_review).toContain('client_negotiation');
  });

  it('should allow client_negotiation → drafting (rework)', () => {
    expect(EXECUTION_PHASE_TRANSITIONS.client_negotiation).toContain('drafting');
  });

  it('should allow client_negotiation → internal_review', () => {
    expect(EXECUTION_PHASE_TRANSITIONS.client_negotiation).toContain('internal_review');
  });

  it('should allow client_negotiation → signed', () => {
    expect(EXECUTION_PHASE_TRANSITIONS.client_negotiation).toContain('signed');
  });

  it('should allow signed → in_production', () => {
    expect(EXECUTION_PHASE_TRANSITIONS.signed).toContain('in_production');
  });

  it('should allow in_production → delivered', () => {
    expect(EXECUTION_PHASE_TRANSITIONS.in_production).toContain('delivered');
  });

  it('should allow any non-terminal phase → archived', () => {
    const nonTerminal = allPhases.filter((p) => p !== 'archived');
    for (const phase of nonTerminal) {
      expect(EXECUTION_PHASE_TRANSITIONS[phase]).toContain('archived');
    }
  });

  it('should have archived as terminal (no transitions out)', () => {
    expect(EXECUTION_PHASE_TRANSITIONS.archived).toHaveLength(0);
  });

  it('should not allow drafting → signed (skip review)', () => {
    expect(EXECUTION_PHASE_TRANSITIONS.drafting).not.toContain('signed');
  });

  it('should not allow drafting → in_production (skip all)', () => {
    expect(EXECUTION_PHASE_TRANSITIONS.drafting).not.toContain('in_production');
  });

  it('should not allow drafting → delivered', () => {
    expect(EXECUTION_PHASE_TRANSITIONS.drafting).not.toContain('delivered');
  });

  it('should not allow signed → drafting (already signed)', () => {
    expect(EXECUTION_PHASE_TRANSITIONS.signed).not.toContain('drafting');
  });

  it('should not allow signed → internal_review', () => {
    expect(EXECUTION_PHASE_TRANSITIONS.signed).not.toContain('internal_review');
  });

  it('should not allow delivered → in_production (reverse)', () => {
    expect(EXECUTION_PHASE_TRANSITIONS.delivered).not.toContain('in_production');
  });

  it('should not allow delivered → signed', () => {
    expect(EXECUTION_PHASE_TRANSITIONS.delivered).not.toContain('signed');
  });

  it('should not allow in_production → client_negotiation (reverse)', () => {
    expect(EXECUTION_PHASE_TRANSITIONS.in_production).not.toContain('client_negotiation');
  });

  it('each phase should have defined transitions', () => {
    for (const phase of allPhases) {
      expect(EXECUTION_PHASE_TRANSITIONS[phase]).toBeDefined();
      expect(Array.isArray(EXECUTION_PHASE_TRANSITIONS[phase])).toBe(true);
    }
  });

  it('all transitions should reference valid phases', () => {
    for (const targets of Object.values(EXECUTION_PHASE_TRANSITIONS)) {
      for (const target of targets) {
        expect(allPhases).toContain(target);
      }
    }
  });
});

describe('Checkpoint State Machine', () => {
  const allStatuses: CheckpointStatus[] = [
    'pending',
    'in_progress',
    'completed',
    'reopened',
  ];

  it('should allow pending → in_progress', () => {
    expect(CHECKPOINT_TRANSITIONS.pending).toContain('in_progress');
  });

  it('should allow pending → completed', () => {
    expect(CHECKPOINT_TRANSITIONS.pending).toContain('completed');
  });

  it('should allow in_progress → completed', () => {
    expect(CHECKPOINT_TRANSITIONS.in_progress).toContain('completed');
  });

  it('should allow in_progress → reopened', () => {
    expect(CHECKPOINT_TRANSITIONS.in_progress).toContain('reopened');
  });

  it('should allow completed → reopened', () => {
    expect(CHECKPOINT_TRANSITIONS.completed).toContain('reopened');
  });

  it('should allow reopened → in_progress', () => {
    expect(CHECKPOINT_TRANSITIONS.reopened).toContain('in_progress');
  });

  it('should allow reopened → completed', () => {
    expect(CHECKPOINT_TRANSITIONS.reopened).toContain('completed');
  });

  it('should not allow pending → reopened (skip in_progress)', () => {
    expect(CHECKPOINT_TRANSITIONS.pending).not.toContain('reopened');
  });

  it('should not allow completed → pending (go backwards)', () => {
    expect(CHECKPOINT_TRANSITIONS.completed).not.toContain('pending');
  });

  it('should not allow completed → in_progress (only reopened)', () => {
    expect(CHECKPOINT_TRANSITIONS.completed).not.toContain('in_progress');
  });

  it('each status should have defined transitions', () => {
    for (const status of allStatuses) {
      expect(CHECKPOINT_TRANSITIONS[status]).toBeDefined();
      expect(Array.isArray(CHECKPOINT_TRANSITIONS[status])).toBe(true);
    }
  });

  it('should not allow completed → completed (self-loop)', () => {
    expect(CHECKPOINT_TRANSITIONS.completed).not.toContain('completed');
  });
});
