// Supabase integration for push notifications

import { supabase } from './supabaseClient';
import type { PushSubscriptionData } from './pushNotifications';

export interface SupabasePushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Save or update push subscription in Supabase
 */
export async function saveSubscriptionToSupabase(
  subscriptionData: PushSubscriptionData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Check if subscription already exists
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('endpoint', subscriptionData.endpoint)
      .single();

    if (existing) {
      // Update existing subscription
      const { error } = await supabase
        .from('push_subscriptions')
        .update({
          p256dh: subscriptionData.keys.p256dh,
          auth: subscriptionData.keys.auth,
          enabled: subscriptionData.settings?.enabled ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        console.error('Failed to update subscription:', error);
        return { success: false, error: error.message };
      }
    } else {
      // Insert new subscription
      const { error } = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: user.id,
          endpoint: subscriptionData.endpoint,
          p256dh: subscriptionData.keys.p256dh,
          auth: subscriptionData.keys.auth,
          enabled: subscriptionData.settings?.enabled ?? true,
        });

      if (error) {
        console.error('Failed to insert subscription:', error);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving subscription to Supabase:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Remove push subscription from Supabase
 */
export async function removeSubscriptionFromSupabase(
  endpoint: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint);

    if (error) {
      console.error('Failed to delete subscription:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error removing subscription from Supabase:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get all push subscriptions for current user
 */
export async function getUserSubscriptions(): Promise<{
  success: boolean;
  data?: SupabasePushSubscription[];
  error?: string;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch subscriptions:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching subscriptions from Supabase:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update subscription settings (enabled/disabled)
 */
export async function updateSubscriptionSettings(
  endpoint: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .update({
        enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('endpoint', endpoint);

    if (error) {
      console.error('Failed to update subscription settings:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating subscription settings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
