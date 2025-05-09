import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = 'https://xnorovqcdvkuacblcpwp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhub3JvdnFjZHZrdWFjYmxjcHdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4MjYxNTUsImV4cCI6MjA2MTQwMjE1NX0.RUTbHbV4h1I6HUFOqp5n0TZWOVyrtbqP-SD_t3yR8AQ';

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
