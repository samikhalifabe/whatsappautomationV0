import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = 'https://xnorovqcdvkuacblcpwp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhub3JvdnFjZHZrdWFjYmxjcHdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4MjYxNTUsImV4cCI6MjA2MTQwMjE1NX0.RUTbHbV4h1I6HUFOqp5n0TZWOVyrtbqP-SD_t3yR8AQ';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }
    
    // Exécuter la requête SQL
    const { data, error } = await supabase.rpc('exec_sql', { query });
    
    if (error) {
      console.error('Erreur SQL:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Erreur:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
