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

async function checkDuplicates() {
  // Get all tour images with tour codes
  const { data: images, error } = await supabase
    .from('tour_images')
    .select('id, tour_id, file_name, storage_path, created_at')
    .order('tour_id')
    .order('file_name');

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Get tour codes
  const { data: tours } = await supabase
    .from('tours')
    .select('id, tour_code');

  const tourMap = {};
  tours.forEach(t => {
    tourMap[t.id] = t.tour_code;
  });

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

  // Find duplicates
  console.log('Checking for duplicate images...\n');
  let foundDuplicates = false;

  for (const [tourId, files] of Object.entries(tourGroups)) {
    for (const [fileName, instances] of Object.entries(files)) {
      if (instances.length > 1) {
        foundDuplicates = true;
        console.log(`🔴 Tour: ${tourMap[tourId]} (${tourId})`);
        console.log(`   File: ${fileName}`);
        console.log(`   Duplicates: ${instances.length} copies`);
        instances.forEach((img, i) => {
          const num = i + 1;
          console.log(`     ${num}. ID: ${img.id} | ${img.storage_path} | ${img.created_at}`);
        });
        console.log('');
      }
    }
  }

  if (!foundDuplicates) {
    console.log('✅ No duplicate images found!');
  }

  // Summary
  const totalImages = images.length;
  const uniqueTours = Object.keys(tourGroups).length;
  console.log(`\nSummary:`);
  console.log(`Total images: ${totalImages}`);
  console.log(`Tours with images: ${uniqueTours}`);
}

checkDuplicates();
