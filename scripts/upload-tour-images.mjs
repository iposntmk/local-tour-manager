#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
const envPath = join(__dirname, '../.env');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      process.env[key] = value;
    }
  });
} catch (error) {
  console.error('Warning: Could not load .env file');
}

// Get Supabase credentials from environment
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const IMAGES_DIR = join(__dirname, '../all-tour-images');
const STORAGE_BUCKET = 'tour-images';

// Function to get tour by tour code
async function getTourByCode(tourCode) {
  const { data, error } = await supabase
    .from('tours')
    .select('id, tour_code')
    .ilike('tour_code', tourCode)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching tour ${tourCode}:`, error.message);
    return null;
  }

  return data;
}

// Function to upload image to storage
async function uploadImage(tourCode, filePath, fileName) {
  try {
    const fileBuffer = readFileSync(filePath);
    const storagePath = `${tourCode}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: getContentType(fileName),
        upsert: true, // Replace if exists
      });

    if (error) {
      console.error(`  ✗ Failed to upload ${fileName}:`, error.message);
      return null;
    }

    return storagePath;
  } catch (err) {
    console.error(`  ✗ Error uploading ${fileName}:`, err.message);
    return null;
  }
}

// Function to create tour_images record
async function createTourImageRecord(tourId, storagePath, fileName, fileSize) {
  const { data, error } = await supabase
    .from('tour_images')
    .insert({
      tour_id: tourId,
      storage_path: storagePath,
      file_name: fileName,
      file_size: fileSize,
      mime_type: getContentType(fileName),
    })
    .select()
    .single();

  if (error) {
    console.error(`  ✗ Failed to create DB record for ${fileName}:`, error.message);
    return false;
  }

  return true;
}

// Get content type based on file extension
function getContentType(fileName) {
  const ext = fileName.toLowerCase().split('.').pop();
  const types = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  return types[ext] || 'application/octet-stream';
}

// Main function
async function main() {
  console.log('🚀 Starting tour images upload...\n');

  // Get all folders in all-tour-images
  const folders = readdirSync(IMAGES_DIR).filter(item => {
    const itemPath = join(IMAGES_DIR, item);
    return statSync(itemPath).isDirectory();
  });

  console.log(`📁 Found ${folders.length} tour folders\n`);

  let stats = {
    totalFolders: folders.length,
    successFolders: 0,
    skippedFolders: 0,
    totalImages: 0,
    uploadedImages: 0,
    failedImages: 0,
  };

  for (const folderName of folders) {
    const folderPath = join(IMAGES_DIR, folderName);
    console.log(`\n📂 Processing folder: ${folderName}`);

    // Find tour by folder name (tour code)
    const tour = await getTourByCode(folderName);

    if (!tour) {
      console.log(`  ⚠️  No tour found with code: ${folderName}`);
      stats.skippedFolders++;
      continue;
    }

    console.log(`  ✓ Found tour: ${tour.tour_code} (${tour.id})`);

    // Get all image files in the folder
    const files = readdirSync(folderPath).filter(file => {
      const ext = file.toLowerCase().split('.').pop();
      return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    });

    if (files.length === 0) {
      console.log(`  ⚠️  No images found in folder`);
      continue;
    }

    console.log(`  📸 Found ${files.length} images`);
    stats.totalImages += files.length;

    let folderSuccess = true;

    for (const fileName of files) {
      const filePath = join(folderPath, fileName);
      const fileSize = statSync(filePath).size;

      // Upload to storage
      const storagePath = await uploadImage(tour.tour_code, filePath, fileName);

      if (!storagePath) {
        stats.failedImages++;
        folderSuccess = false;
        continue;
      }

      // Create database record
      const success = await createTourImageRecord(tour.id, storagePath, fileName, fileSize);

      if (success) {
        console.log(`  ✓ Uploaded: ${fileName}`);
        stats.uploadedImages++;
      } else {
        stats.failedImages++;
        folderSuccess = false;
      }
    }

    if (folderSuccess) {
      stats.successFolders++;
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Upload Summary:');
  console.log('='.repeat(60));
  console.log(`Total folders:      ${stats.totalFolders}`);
  console.log(`Success folders:    ${stats.successFolders}`);
  console.log(`Skipped folders:    ${stats.skippedFolders}`);
  console.log(`Total images:       ${stats.totalImages}`);
  console.log(`Uploaded images:    ${stats.uploadedImages}`);
  console.log(`Failed images:      ${stats.failedImages}`);
  console.log('='.repeat(60));

  if (stats.uploadedImages > 0) {
    console.log('\n✅ Upload completed successfully!');
  } else {
    console.log('\n⚠️  No images were uploaded.');
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
