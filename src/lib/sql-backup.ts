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
  sql += `-- Database: Lovable Cloud\n\n`;
  sql += `SET client_encoding = 'UTF8';\n\n`;

  for (const tableName of tables) {
    try {
      // Fetch table schema
      const { data: columns, error: schemaError } = await supabase
        .from('information_schema.columns' as any)
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .order('ordinal_position');

      if (schemaError) {
        console.error(`Error fetching schema for ${tableName}:`, schemaError);
        continue;
      }

      // Fetch table data
      const { data: rows, error: dataError } = await supabase
        .from(tableName as any)
        .select('*');

      if (dataError) {
        console.error(`Error fetching data for ${tableName}:`, dataError);
        continue;
      }

      sql += `-- Table: ${tableName}\n`;
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
              return `ARRAY[${value.map(v => `'${String(v).replace(/'/g, "''")}'`).join(',')}]`;
            }
            if (typeof value === 'object') {
              return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
            }
            return String(value);
          });

          sql += `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${values.join(', ')});\n`;
        }
        sql += '\n';
      }
    } catch (error) {
      console.error(`Error processing table ${tableName}:`, error);
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
