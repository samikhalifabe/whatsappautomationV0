// app/api/autoscout/vehicles/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialiser le client Supabase
const supabaseUrl = 'https://xnorovqcdvkuacblcpwp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhub3JvdnFjZHZrdWFjYmxjcHdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4MjYxNTUsImV4cCI6MjA2MTQwMjE1NX0.RUTbHbV4h1I6HUFOqp5n0TZWOVyrtbqP-SD_t3yR8AQ';
const supabase = createClient(supabaseUrl, supabaseKey);

// Alternativement, vous pouvez importer le client Supabase depuis lib/supabase.ts
// import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vehicles } = body;

    if (!Array.isArray(vehicles) || vehicles.length === 0) {
      return NextResponse.json({ error: 'Aucun véhicule à enregistrer' }, { status: 400 });
    }

    // Format des véhicules pour correspondre exactement à votre schéma
    const formattedVehicles = vehicles.map(vehicle => ({
      brand: vehicle.brand,
      model: vehicle.model,
      price: vehicle.price,
      year: vehicle.year,
      mileage: vehicle.mileage,
      fuel_type: vehicle.fuel_type,
      transmission: vehicle.transmission,
      power: vehicle.power,
      location: vehicle.location,
      listing_url: vehicle.listing_url,
      phone: vehicle.phone || '',
      image_url: vehicle.image_url || '',
      contact_status: vehicle.contact_status || 'Not contacted',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Insertion des véhicules dans la base de données
    const { data, error } = await supabase
      .from('vehicles')
      .insert(formattedVehicles)
      .select();

    if (error) {
      console.error('Erreur lors de l\'insertion en base de données:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Véhicules enregistrés avec succès', 
      savedCount: data.length,
      vehicles: data
    });
  } catch (error) {
    console.error('Exception lors de l\'enregistrement des véhicules:', error);
    return NextResponse.json({ error: 'Erreur serveur lors de l\'enregistrement' }, { status: 500 });
  }
}
