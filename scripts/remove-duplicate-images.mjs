#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env
const envPath = join(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function removeDuplicates() {
  console.log('🔍 Finding duplicate images...\n');

  // Get all tour images
  const { data: images, error } = await supabase
    .from('tour_images')
    .select('id, tour_id, file_name, storage_path, created_at')
    .order('tour_id')
    .order('file_name')
    .order('created_at');

  if (error) {
    console.error('Error fetching images:', error);
    return;
  }

  // Group by tour_id and file_name
  const tourGroups = {};
  images.forEach(img => {
    if (!tourGroups[img.tour_id]) {
      tourGroups[img.tour_id] = {};
    }
    if (!tourGroups[img.tour_id][img.file_name]) {
      tourGroups[img.tour_id][img.file_name] = [];
    }
    tourGroups[img.tour_id][img.file_name].push(img);
  });

  // Find duplicates and keep only the most recent one
  const idsToDelete = [];

  for (const [tourId, files] of Object.entries(tourGroups)) {
    for (const [fileName, instances] of Object.entries(files)) {
      if (instances.length > 1) {
        // Sort by created_at descending (newest first)
        instances.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Keep the newest, delete the rest
        const toKeep = instances[0];
        const toDelete = instances.slice(1);

        console.log(`📂 ${fileName}`);
        console.log(`   Keeping: ${toKeep.id} (${toKeep.created_at})`);
        console.log(`   Deleting: ${toDelete.length} older copies`);

        idsToDelete.push(...toDelete.map(img => img.id));
      }
    }
  }

  if (idsToDelete.length === 0) {
    console.log('\n✅ No duplicates found!');
    return;
  }

  console.log(`\n🗑️  Deleting ${idsToDelete.length} duplicate records...`);

  // Delete in batches of 100
  const batchSize = 100;
  let deleted = 0;

  for (let i = 0; i < idsToDelete.length; i += batchSize) {
    const batch = idsToDelete.slice(i, i + batchSize);

    const { error: deleteError } = await supabase
      .from('tour_images')
      .delete()
      .in('id', batch);

    if (deleteError) {
      console.error(`Error deleting batch ${i}-${i + batch.length}:`, deleteError);
    } else {
      deleted += batch.length;
      console.log(`  ✓ Deleted batch ${Math.floor(i / batchSize) + 1} (${batch.length} records)`);
    }
  }

  console.log(`\n✅ Cleanup complete! Deleted ${deleted} duplicate records.`);
}

removeDuplicates().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
