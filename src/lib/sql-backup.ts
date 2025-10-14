import { supabase } from "@/integrations/supabase/client";

interface TableSchema {
  table_name: string;
  columns: Array<{
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
  }>;
}

export async function generateFullSQLBackup(): Promise<string> {
  const tables = [
    'guides', 'companies', 'nationalities', 'provinces', 
    'tourist_destinations', 'shoppings', 'expense_categories', 
    'detailed_expenses', 'diary_types', 'tours', 'tour_destinations',
    'tour_expenses', 'tour_meals', 'tour_allowances', 'tour_shoppings',
    'tour_diaries', 'tour_images'
  ];

  let sql = `-- SQL Backup Generated: ${new Date().toISOString()}\n`;
  sql += `-- Database: Lovable Cloud\n`;
  sql += `-- This backup includes both schema (CREATE TABLE) and data (INSERT)\n\n`;
  sql += `SET client_encoding = 'UTF8';\n\n`;

  for (const tableName of tables) {
    try {
      sql += `-- ============================================\n`;
      sql += `-- Table: ${tableName}\n`;
      sql += `-- ============================================\n\n`;
      sql += `DROP TABLE IF EXISTS public.${tableName} CASCADE;\n\n`;
      sql += `CREATE TABLE public.${tableName} (\n`;

      // Fetch one row to determine columns and types
      const { data: sampleRows } = await supabase
        .from(tableName as any)
        .select('*')
        .limit(1);

      if (sampleRows && sampleRows.length > 0) {
        const row = sampleRows[0];
        const columnDefs = Object.keys(row).map((colName, idx, arr) => {
          let colType = 'TEXT';
          const value = row[colName];
          
          // Infer type from column name and value
          if (colName === 'id' || colName.endsWith('_id')) {
            colType = 'UUID';
          } else if (colName === 'created_at' || colName === 'updated_at') {
            colType = 'TIMESTAMP WITH TIME ZONE';
          } else if (colName.includes('date') && colName !== 'updated_at' && colName !== 'created_at') {
            colType = 'DATE';
          } else if (colName === 'price' || colName.includes('total') || colName.includes('payment') || colName.includes('advance') || colName.includes('tip') || colName.includes('collection')) {
            colType = 'NUMERIC';
          } else if (colName === 'guests' || colName === 'quantity' || colName === 'adults' || colName === 'children' || colName === 'number_of_guests' || colName === 'total_days' || colName === 'total_guests' || colName === 'file_size') {
            colType = 'INTEGER';
          } else if (typeof value === 'number') {
            if (Number.isInteger(value)) {
              colType = 'INTEGER';
            } else {
              colType = 'NUMERIC';
            }
          } else if (typeof value === 'boolean') {
            colType = 'BOOLEAN';
          } else if (Array.isArray(value)) {
            colType = 'TEXT[]';
          }
          
          // Set defaults and constraints
          let constraints = '';
          if (colName === 'id') {
            constraints = ' NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY';
          } else if (colName === 'created_at' || colName === 'updated_at') {
            constraints = ' DEFAULT now()';
          } else if (colName === 'status') {
            constraints = " NOT NULL DEFAULT 'active'";
          } else if (colName === 'data_type') {
            constraints = " NOT NULL DEFAULT 'text'";
          } else if (colName === 'content_type') {
            constraints = ' NOT NULL';
          } else if ((colName === 'name' || colName === 'tour_code') && !colName.includes('at_booking')) {
            constraints = ' NOT NULL';
          } else if ((colName.includes('price') || colName.includes('total')) && value !== null) {
            constraints = ' DEFAULT 0';
          } else if ((colName === 'guests' || colName === 'quantity') && value !== null) {
            constraints = ' DEFAULT 1';
          } else if (colName.includes('search_keywords')) {
            constraints = " DEFAULT '{}'";
          }
          
          const comma = idx < arr.length - 1 ? ',' : '';
          return `  ${colName} ${colType}${constraints}${comma}`;
        });
        
        sql += columnDefs.join('\n');
      } else {
        // If no data, create minimal schema
        sql += `  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,\n`;
        sql += `  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()`;
      }
      
      sql += '\n);\n\n';
      
      // Add RLS
      sql += `ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;\n\n`;
      sql += `CREATE POLICY "Public access" ON public.${tableName} FOR ALL USING (true) WITH CHECK (true);\n\n`;

      // Fetch all table data
      const { data: rows, error: dataError } = await supabase
        .from(tableName as any)
        .select('*');

      if (dataError) {
        console.error(`Error fetching data for ${tableName}:`, dataError);
        sql += `-- Error fetching data for ${tableName}\n\n`;
        continue;
      }

      sql += `-- Data for table: ${tableName}\n`;
      sql += `-- Records: ${rows?.length || 0}\n\n`;

      // Generate INSERT statements
      if (rows && rows.length > 0) {
        const columnNames = Object.keys(rows[0]);
        
        for (const row of rows) {
          const values = columnNames.map(col => {
            const value = row[col];
            if (value === null) return 'NULL';
            if (typeof value === 'string') {
              return `'${value.replace(/'/g, "''")}'`;
            }
            if (typeof value === 'boolean') return value ? 'true' : 'false';
            if (Array.isArray(value)) {
              if (value.length === 0) return "'{}'";
              return `ARRAY[${value.map(v => `'${String(v).replace(/'/g, "''")}'`).join(',')}]`;
            }
            if (typeof value === 'object') {
              return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
            }
            return String(value);
          });

          sql += `INSERT INTO public.${tableName} (${columnNames.join(', ')}) VALUES (${values.join(', ')});\n`;
        }
        sql += '\n';
      }
    } catch (error) {
      console.error(`Error processing table ${tableName}:`, error);
      sql += `-- Error processing table ${tableName}\n\n`;
    }
  }

  return sql;
}

export function downloadSQLBackup(sql: string) {
  const blob = new Blob([sql], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
