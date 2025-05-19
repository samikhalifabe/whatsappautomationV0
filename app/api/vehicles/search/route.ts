import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Assuming supabase client is configured here

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const searchTerm = searchParams.get('search') || '';
  const contactStatus = searchParams.get('contactStatus') || 'all';
  const sellerType = searchParams.get('sellerType') || 'all';
  const minPrice = Number(searchParams.get('minPrice')) || 0;
  const maxPrice = Number(searchParams.get('maxPrice')) || 100000; // Default max price
  const minYear = Number(searchParams.get('minYear')) || 2000; // Default min year
  const maxYear = Number(searchParams.get('maxYear')) || new Date().getFullYear(); // Default max year
  const showOnlyWithPhone = searchParams.get('showOnlyWithPhone') === 'true';
  const sortBy = searchParams.get('sortBy') || 'created_at_desc'; // Default sort
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 30;

  console.log('Search API received parameters:', {
    searchTerm, contactStatus, sellerType, minPrice, maxPrice, minYear, maxYear, showOnlyWithPhone, sortBy, page, limit
  });

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from('vehicles').select('*', { count: 'exact' });

  // Apply filters
  if (searchTerm) {
    // Option 1: Simple search with OR (case-insensitive)
    query = query.or(
      `brand.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`
    );

    // Option 2: If you have configured full-text search indexes in Supabase
    // (Requires setting up appropriate indexes in your database)
    // Example: Assuming you have a 'vehicle_search_index' column configured for full-text search
    // query = query.textSearch('vehicle_search_index', searchTerm, {
    //   config: 'english', // Configure according to your language
    //   type: 'websearch', // Websearch format (with AND, OR operators, etc.)
    // });
  }

  if (contactStatus !== 'all') {
    query = query.eq('contact_status', contactStatus);
  }

  if (sellerType !== 'all') {
    query = query.eq('seller_type', sellerType);
  }

  // Apply price filter only if min/max are not default
  if (minPrice > 0 || maxPrice < 100000) {
     query = query.gte('price', minPrice).lte('price', maxPrice);
  }


  // Apply year filter only if min/max are not default
   if (minYear > 2000 || maxYear < new Date().getFullYear()) {
     query = query.gte('year', minYear).lte('year', maxYear);
   }


  if (showOnlyWithPhone) {
    query = query.not('phone', 'is', null);
  }

  // Apply sorting
  const [sortColumn, sortOrder] = sortBy.split('_');
  let ascending = true;
  let columnToSort = sortColumn;

  // Handle cases like 'created_at_desc'
  if (sortOrder === 'desc') {
      ascending = false;
  } else if (sortOrder === 'asc') {
      ascending = true;
  } else {
      // If no order specified, assume ascending
      ascending = true;
      columnToSort = sortBy; // Use the whole string as column name if no underscore
  }

  // Special handling for 'created_at_desc' and 'created_at_asc'
  if (sortBy === 'created_at_desc') {
      columnToSort = 'created_at';
      ascending = false;
  } else if (sortBy === 'created_at_asc') {
      columnToSort = 'created_at';
      ascending = true;
  }


  if (columnToSort) {
    query = query.order(columnToSort, { ascending: ascending });
  } else {
     // Default sort if none specified or invalid
     query = query.order('created_at', { ascending: false });
  }


  // Apply pagination
  query = query.range(from, to);

  const { data, error, count } = await query; // Keep only this declaration

  console.log('Supabase query result:', { data, error, count }); // Log the result from Supabase

  if (error) {
    console.error('Error fetching vehicles:', error);
    // Safely access error message
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  console.log('Search API sending response:', { // Log the response being sent
    vehicles: data || [],
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });

  return NextResponse.json({
    vehicles: data || [],
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
}
