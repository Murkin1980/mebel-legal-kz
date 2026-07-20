/**
 * Identity/Authentication service.
 *
 * Handles Supabase Auth operations.
 */

import { createClient } from '@/lib/supabase/server';
import { AppError, unauthorized } from '@/modules/shared/errors';

export interface User {
  id: string;
  email: string;
}

export class AuthService {
  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User> {
    const supabase = await createClient();

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      throw unauthorized('Not authenticated');
    }

    return {
      id: user.id,
      email: user.email || '',
    };
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<User> {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw unauthorized('Invalid credentials');
    }

    return {
      id: data.user.id,
      email: data.user.email || '',
    };
  }

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string): Promise<User> {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to create account', 500);
    }

    return {
      id: data.user?.id || '',
      email: data.user?.email || '',
    };
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
}

export const authService = new AuthService();
