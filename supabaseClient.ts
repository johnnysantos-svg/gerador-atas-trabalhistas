import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient;

/**
 * Initializes the Supabase client with the provided URL and anonymous key.
 * This function must be called once when the application starts or after
 * the configuration is provided by the user.
 * @param {string} url - The Supabase project URL.
 * @param {string} key - The Supabase project anonymous public key.
 * @returns {SupabaseClient} The initialized Supabase client instance.
 */
export const initializeSupabase = (url: string, key: string): SupabaseClient => {
    if (!url || !key) {
        throw new Error('Supabase URL and anonymous key are required.');
    }
    supabase = createClient(url, key);
    return supabase;
};

/**
 * Retrieves the singleton instance of the Supabase client.
 * Throws an error if the client has not been initialized yet.
 * @returns {SupabaseClient} The Supabase client instance.
 */
export const getSupabase = (): SupabaseClient => {
    if (!supabase) {
        throw new Error('Supabase client has not been initialized. Please call initializeSupabase first.');
    }
    return supabase;
};
