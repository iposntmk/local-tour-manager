#!/bin/bash

OUTPUT_FILE="consolidated_migration.sql"
MIGRATIONS_DIR="supabase/migrations"

# Header
cat > "$OUTPUT_FILE" << 'EOF'
-- ============================================
-- Consolidated Migration Script for Tour Manager
-- ============================================
-- This file contains all migrations in chronological order
-- Run this entire file in Supabase SQL Editor
-- ============================================

EOF

# Iterate through migrations in order
cd "$MIGRATIONS_DIR"
for file in $(ls -1 *.sql | sort); do
  echo "-- ============================================" >> "../../$OUTPUT_FILE"
  echo "-- Migration: $file" >> "../../$OUTPUT_FILE"
  echo "-- ============================================" >> "../../$OUTPUT_FILE"
  echo "" >> "../../$OUTPUT_FILE"
  cat "$file" >> "../../$OUTPUT_FILE"
  echo "" >> "../../$OUTPUT_FILE"
  echo "" >> "../../$OUTPUT_FILE"
done

cd ../..
echo "Created $OUTPUT_FILE successfully!"
echo "You can now run this file in Supabase SQL Editor"
