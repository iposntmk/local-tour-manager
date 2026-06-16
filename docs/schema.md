# Supabase Schema

Generated: 2026-06-15T12:36:40.185Z
Project: `tuypgzkejqbbvubwomov`
Source: Supabase CLI linked remote database connection metadata, followed by PostgreSQL catalog introspection.
Scope: user-defined schemas matching Supabase CLI dump behavior; Supabase-managed schemas such as `auth`, `storage`, `realtime`, and `extensions` are excluded.

## Summary

- Schemas: `public`
- Tables/foreign tables: 31
- Views/materialized views: 0
- Columns: 371
- Constraints: 115
- Indexes: 92
- RLS policies: 99
- Triggers: 0
- Enums: 0
- Domains: 0
- Sequences: 0
- Functions: 34

## Extensions

| Extension | Schema | Version |
|---|---|---|
| `pg_stat_statements` | `extensions` | 1.11 |
| `pgcrypto` | `extensions` | 1.3 |
| `plpgsql` | `pg_catalog` | 1.0 |
| `supabase_vault` | `vault` | 0.3.1 |
| `uuid-ossp` | `extensions` | 1.1 |

## Tables

### public.companies

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `name` | text | no |  |  |  |  |
| 3 | `status` | text | no | 'active'::text |  |  |  |
| 4 | `search_keywords` | text[] | yes | '{}'::text[] |  |  |  |
| 5 | `created_at` | timestamp with time zone | yes | now() |  |  |  |
| 6 | `updated_at` | timestamp with time zone | yes | now() |  |  |  |
| 7 | `contact_name` | text | yes |  |  |  |  |
| 8 | `phone` | text | yes |  |  |  |  |
| 9 | `email` | text | yes |  |  |  |  |
| 10 | `note` | text | yes |  |  |  |  |
| 11 | `is_default` | boolean | no | false |  |  |  |
| 12 | `created_by` | uuid | yes | default_created_by() |  |  |  |
| 13 | `is_shared` | boolean | no | is_admin() |  |  |  |

#### Constraints

- `companies_created_by_fkey` (foreign key)
```sql
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
```
- `companies_pkey` (primary key)
```sql
PRIMARY KEY (id)
```

#### Indexes

- `companies_pkey`
```sql
CREATE UNIQUE INDEX companies_pkey ON public.companies USING btree (id)
```
- `idx_companies_created_by`
```sql
CREATE INDEX idx_companies_created_by ON public.companies USING btree (created_by)
```

#### RLS Policies

- `companies_delete`
  - Command: `DELETE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND (created_by = auth.uid())))
    ```
- `companies_insert`
  - Command: `INSERT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - With check:
    ```sql
    (is_active_user() AND (created_by = auth.uid()))
    ```
- `companies_select`
  - Command: `SELECT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND ((created_by = auth.uid()) OR (is_shared = true))))
    ```
- `companies_update`
  - Command: `UPDATE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND (created_by = auth.uid())))
    ```
  - With check:
    ```sql
    (is_admin() OR (is_active_user() AND (created_by = auth.uid())))
    ```

### public.destinations_free

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `name` | text | no |  |  |  |  |
| 3 | `province_id` | uuid | yes |  |  |  |  |
| 4 | `province_name_at_booking` | text | yes |  |  |  |  |
| 5 | `status` | text | no | 'active'::text |  |  |  |
| 6 | `search_keywords` | text[] | yes | '{}'::text[] |  |  |  |
| 7 | `is_shared` | boolean | yes | false |  |  |  |
| 8 | `created_by` | uuid | yes |  |  |  |  |
| 9 | `created_at` | timestamp with time zone | yes | now() |  |  |  |
| 10 | `updated_at` | timestamp with time zone | yes | now() |  |  |  |
| 11 | `raw_name` | text | yes |  |  |  |  |

#### Constraints

- `destinations_free_created_by_fkey` (foreign key)
```sql
FOREIGN KEY (created_by) REFERENCES user_profiles(id) ON DELETE SET NULL
```
- `destinations_free_province_id_fkey` (foreign key)
```sql
FOREIGN KEY (province_id) REFERENCES provinces(id)
```
- `destinations_free_pkey` (primary key)
```sql
PRIMARY KEY (id)
```

#### Indexes

- `destinations_free_pkey`
```sql
CREATE UNIQUE INDEX destinations_free_pkey ON public.destinations_free USING btree (id)
```

#### RLS Policies

- `Admins can do everything on destinations_free`
  - Command: `ALL`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    ((( SELECT user_profiles.role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = 'admin'::text) OR (( SELECT user_profiles.email
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = 'iposntmk@gmail.com'::text))
    ```
  - With check:
    ```sql
    ((( SELECT user_profiles.role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = 'admin'::text) OR (( SELECT user_profiles.email
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = 'iposntmk@gmail.com'::text))
    ```
- `Editors can insert own destinations_free`
  - Command: `INSERT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - With check:
    ```sql
    ((( SELECT user_profiles.role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = ANY (ARRAY['editor'::text, 'admin'::text])) OR (( SELECT user_profiles.email
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = 'iposntmk@gmail.com'::text))
    ```
- `Editors can insert, select, update on destinations_free`
  - Command: `ALL`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    ((( SELECT user_profiles.role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = 'editor'::text) AND ((is_shared = true) OR (created_by = auth.uid())))
    ```
  - With check:
    ```sql
    ((( SELECT user_profiles.role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = 'editor'::text) AND ((is_shared = true) OR (created_by = auth.uid())))
    ```
- `Viewers can select on destinations_free`
  - Command: `SELECT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    ((( SELECT user_profiles.role
   FROM user_profiles
  WHERE (user_profiles.id = auth.uid())) = 'viewer'::text) AND ((is_shared = true) OR (created_by = auth.uid())))
    ```

### public.detailed_expenses

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `name` | text | no |  |  |  |  |
| 3 | `category_id` | uuid | yes |  |  |  |  |
| 4 | `status` | text | no | 'active'::text |  |  |  |
| 5 | `search_keywords` | text[] | yes | '{}'::text[] |  |  |  |
| 6 | `created_at` | timestamp with time zone | yes | now() |  |  |  |
| 7 | `updated_at` | timestamp with time zone | yes | now() |  |  |  |
| 8 | `price` | numeric | yes | 0 |  |  |  |
| 9 | `category_name_at_booking` | text | yes |  |  |  |  |
| 10 | `created_by` | uuid | yes | default_created_by() |  |  |  |
| 11 | `guide_id` | uuid | yes |  |  |  |  |
| 12 | `is_shared` | boolean | no | is_admin() |  |  |  |

#### Constraints

- `detailed_expenses_created_by_fkey` (foreign key)
```sql
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
```
- `detailed_expenses_guide_id_fkey` (foreign key)
```sql
FOREIGN KEY (guide_id) REFERENCES user_profiles(id) ON DELETE SET NULL
```
- `detailed_expenses_pkey` (primary key)
```sql
PRIMARY KEY (id)
```

#### Indexes

- `detailed_expenses_pkey`
```sql
CREATE UNIQUE INDEX detailed_expenses_pkey ON public.detailed_expenses USING btree (id)
```
- `idx_detailed_expenses_created_by`
```sql
CREATE INDEX idx_detailed_expenses_created_by ON public.detailed_expenses USING btree (created_by)
```

#### RLS Policies

- `detailed_expenses_delete`
  - Command: `DELETE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND (created_by = auth.uid())))
    ```
- `detailed_expenses_insert`
  - Command: `INSERT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - With check:
    ```sql
    (is_active_user() AND (created_by = auth.uid()))
    ```
- `detailed_expenses_select`
  - Command: `SELECT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND ((created_by = auth.uid()) OR (is_shared = true))))
    ```
- `detailed_expenses_update`
  - Command: `UPDATE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND (created_by = auth.uid())))
    ```
  - With check:
    ```sql
    (is_admin() OR (is_active_user() AND (created_by = auth.uid())))
    ```

### public.diary_types

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `name` | text | no |  |  |  |  |
| 3 | `status` | text | no | 'active'::text |  |  |  |
| 4 | `search_keywords` | text[] | yes | '{}'::text[] |  |  |  |
| 5 | `created_at` | timestamp with time zone | yes | now() |  |  |  |
| 6 | `updated_at` | timestamp with time zone | yes | now() |  |  |  |
| 7 | `data_type` | text | no | 'text'::text |  |  |  |

#### Constraints

- `diary_types_pkey` (primary key)
```sql
PRIMARY KEY (id)
```

#### Indexes

- `diary_types_pkey`
```sql
CREATE UNIQUE INDEX diary_types_pkey ON public.diary_types USING btree (id)
```

### public.expense_categories

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `name` | text | no |  |  |  |  |
| 3 | `status` | text | no | 'active'::text |  |  |  |
| 4 | `search_keywords` | text[] | yes | '{}'::text[] |  |  |  |
| 5 | `created_at` | timestamp with time zone | yes | now() |  |  |  |
| 6 | `updated_at` | timestamp with time zone | yes | now() |  |  |  |
| 7 | `created_by` | uuid | yes | default_created_by() |  |  |  |
| 8 | `guide_id` | uuid | yes |  |  |  |  |
| 9 | `is_shared` | boolean | no | is_admin() |  |  |  |

#### Constraints

- `expense_categories_created_by_fkey` (foreign key)
```sql
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
```
- `expense_categories_guide_id_fkey` (foreign key)
```sql
FOREIGN KEY (guide_id) REFERENCES user_profiles(id) ON DELETE SET NULL
```
- `expense_categories_pkey` (primary key)
```sql
PRIMARY KEY (id)
```

#### Indexes

- `expense_categories_pkey`
```sql
CREATE UNIQUE INDEX expense_categories_pkey ON public.expense_categories USING btree (id)
```
- `idx_expense_categories_created_by`
```sql
CREATE INDEX idx_expense_categories_created_by ON public.expense_categories USING btree (created_by)
```

#### RLS Policies

- `expense_categories_delete`
  - Command: `DELETE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND (created_by = auth.uid())))
    ```
- `expense_categories_insert`
  - Command: `INSERT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - With check:
    ```sql
    (is_active_user() AND (created_by = auth.uid()))
    ```
- `expense_categories_select`
  - Command: `SELECT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND ((created_by = auth.uid()) OR (is_shared = true))))
    ```
- `expense_categories_update`
  - Command: `UPDATE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND (created_by = auth.uid())))
    ```
  - With check:
    ```sql
    (is_admin() OR (is_active_user() AND (created_by = auth.uid())))
    ```

### public.guide_languages

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `guide_id` | uuid | no |  |  |  |  |
| 3 | `language_id` | uuid | no |  |  |  |  |
| 4 | `proficiency` | text | no | 'working'::text |  |  |  |
| 5 | `created_at` | timestamp with time zone | yes | now() |  |  |  |
| 6 | `updated_at` | timestamp with time zone | yes | now() |  |  |  |

#### Constraints

- `guide_languages_proficiency_check` (check)
```sql
CHECK (proficiency = ANY (ARRAY['basic'::text, 'working'::text, 'fluent'::text, 'native'::text]))
```
- `guide_languages_guide_id_fkey` (foreign key)
```sql
FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE
```
- `guide_languages_language_id_fkey` (foreign key)
```sql
FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE RESTRICT
```
- `guide_languages_pkey` (primary key)
```sql
PRIMARY KEY (id)
```
- `guide_languages_guide_language_unique` (unique)
```sql
UNIQUE (guide_id, language_id)
```

#### Indexes

- `guide_languages_guide_language_unique`
```sql
CREATE UNIQUE INDEX guide_languages_guide_language_unique ON public.guide_languages USING btree (guide_id, language_id)
```
- `guide_languages_pkey`
```sql
CREATE UNIQUE INDEX guide_languages_pkey ON public.guide_languages USING btree (id)
```
- `idx_guide_languages_guide_id`
```sql
CREATE INDEX idx_guide_languages_guide_id ON public.guide_languages USING btree (guide_id)
```
- `idx_guide_languages_language_id`
```sql
CREATE INDEX idx_guide_languages_language_id ON public.guide_languages USING btree (language_id)
```

#### RLS Policies

- `guide_languages_legacy_admin_select`
  - Command: `SELECT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    is_admin()
    ```

### public.guides

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `name` | text | no |  |  |  |  |
| 3 | `status` | text | no | 'active'::text |  |  |  |
| 4 | `search_keywords` | text[] | yes | '{}'::text[] |  |  |  |
| 5 | `created_at` | timestamp with time zone | yes | now() |  |  |  |
| 6 | `updated_at` | timestamp with time zone | yes | now() |  |  |  |
| 7 | `phone` | text | yes |  |  |  |  |
| 8 | `note` | text | yes |  |  |  |  |
| 9 | `is_default` | boolean | no | false |  |  |  |
| 10 | `created_by` | uuid | yes | default_created_by() |  |  |  |
| 11 | `is_shared` | boolean | no | is_admin() |  |  |  |

#### Constraints

- `guides_created_by_fkey` (foreign key)
```sql
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
```
- `guides_pkey` (primary key)
```sql
PRIMARY KEY (id)
```

#### Indexes

- `guides_pkey`
```sql
CREATE UNIQUE INDEX guides_pkey ON public.guides USING btree (id)
```
- `idx_guides_created_by`
```sql
CREATE INDEX idx_guides_created_by ON public.guides USING btree (created_by)
```

#### RLS Policies

- `guides_delete`
  - Command: `DELETE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND (created_by = auth.uid())))
    ```
- `guides_insert`
  - Command: `INSERT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - With check:
    ```sql
    (is_active_user() AND (created_by = auth.uid()))
    ```
- `guides_legacy_admin_select`
  - Command: `SELECT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    is_admin()
    ```
- `guides_select`
  - Command: `SELECT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND ((created_by = auth.uid()) OR (is_shared = true))))
    ```
- `guides_update`
  - Command: `UPDATE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND (created_by = auth.uid())))
    ```
  - With check:
    ```sql
    (is_admin() OR (is_active_user() AND (created_by = auth.uid())))
    ```

### public.hotels

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `name` | text | no |  |  |  |  |
| 3 | `owner_name` | text | no |  |  |  |  |
| 4 | `owner_phone` | text | no |  |  |  |  |
| 5 | `room_type` | text | no |  |  |  |  |
| 6 | `price_per_night` | numeric | no | 0 |  |  |  |
| 7 | `address` | text | yes |  |  |  |  |
| 8 | `note` | text | yes |  |  |  |  |
| 9 | `status` | text | no | 'active'::text |  |  |  |
| 10 | `search_keywords` | text[] | yes |  |  |  |  |
| 11 | `created_at` | timestamp with time zone | yes | now() |  |  |  |
| 12 | `updated_at` | timestamp with time zone | yes | now() |  |  |  |
| 13 | `province_id` | uuid | yes |  |  |  |  |
| 14 | `province_name_at_booking` | text | yes |  |  |  |  |

#### Constraints

- `hotels_room_type_check` (check)
```sql
CHECK (room_type = ANY (ARRAY['single'::text, 'double'::text, 'group'::text, 'suite'::text]))
```
- `hotels_status_check` (check)
```sql
CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text]))
```
- `hotels_province_id_fkey` (foreign key)
```sql
FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE SET NULL
```
- `hotels_pkey` (primary key)
```sql
PRIMARY KEY (id)
```

#### Indexes

- `hotels_name_unique_idx`
```sql
CREATE UNIQUE INDEX hotels_name_unique_idx ON public.hotels USING btree (lower(name))
```
- `hotels_pkey`
```sql
CREATE UNIQUE INDEX hotels_pkey ON public.hotels USING btree (id)
```
- `hotels_province_id_idx`
```sql
CREATE INDEX hotels_province_id_idx ON public.hotels USING btree (province_id)
```
- `hotels_search_keywords_idx`
```sql
CREATE INDEX hotels_search_keywords_idx ON public.hotels USING gin (search_keywords)
```
- `hotels_status_idx`
```sql
CREATE INDEX hotels_status_idx ON public.hotels USING btree (status)
```

### public.languages

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `code` | text | no |  |  |  |  |
| 3 | `name` | text | no |  |  |  |  |
| 4 | `native_name` | text | yes |  |  |  |  |
| 5 | `status` | text | no | 'active'::text |  |  |  |
| 6 | `search_keywords` | text[] | yes | '{}'::text[] |  |  |  |
| 7 | `created_by` | uuid | yes | default_created_by() |  |  |  |
| 8 | `created_at` | timestamp with time zone | yes | now() |  |  |  |
| 9 | `updated_at` | timestamp with time zone | yes | now() |  |  |  |
| 10 | `is_shared` | boolean | no | is_admin() |  |  |  |

#### Constraints

- `languages_created_by_fkey` (foreign key)
```sql
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
```
- `languages_pkey` (primary key)
```sql
PRIMARY KEY (id)
```
- `languages_code_unique` (unique)
```sql
UNIQUE (code)
```

#### Indexes

- `idx_languages_created_by`
```sql
CREATE INDEX idx_languages_created_by ON public.languages USING btree (created_by)
```
- `languages_code_unique`
```sql
CREATE UNIQUE INDEX languages_code_unique ON public.languages USING btree (code)
```
- `languages_pkey`
```sql
CREATE UNIQUE INDEX languages_pkey ON public.languages USING btree (id)
```

#### RLS Policies

- `languages_delete`
  - Command: `DELETE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND (created_by = auth.uid())))
    ```
- `languages_insert`
  - Command: `INSERT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - With check:
    ```sql
    (is_active_user() AND (created_by = auth.uid()))
    ```
- `languages_select`
  - Command: `SELECT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND ((created_by = auth.uid()) OR (is_shared = true))))
    ```
- `languages_update`
  - Command: `UPDATE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND (created_by = auth.uid())))
    ```
  - With check:
    ```sql
    (is_admin() OR (is_active_user() AND (created_by = auth.uid())))
    ```

### public.nationalities

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `name` | text | no |  |  |  |  |
| 3 | `status` | text | no | 'active'::text |  |  |  |
| 4 | `search_keywords` | text[] | yes | '{}'::text[] |  |  |  |
| 5 | `created_at` | timestamp with time zone | yes | now() |  |  |  |
| 6 | `updated_at` | timestamp with time zone | yes | now() |  |  |  |
| 7 | `iso2` | text | yes |  |  |  |  |
| 8 | `emoji` | text | yes |  |  |  |  |
| 9 | `created_by` | uuid | yes | default_created_by() |  |  |  |
| 10 | `is_shared` | boolean | no | is_admin() |  |  |  |

#### Constraints

- `nationalities_created_by_fkey` (foreign key)
```sql
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
```
- `nationalities_pkey` (primary key)
```sql
PRIMARY KEY (id)
```

#### Indexes

- `idx_nationalities_created_by`
```sql
CREATE INDEX idx_nationalities_created_by ON public.nationalities USING btree (created_by)
```
- `nationalities_pkey`
```sql
CREATE UNIQUE INDEX nationalities_pkey ON public.nationalities USING btree (id)
```

#### RLS Policies

- `nationalities_delete`
  - Command: `DELETE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND (created_by = auth.uid())))
    ```
- `nationalities_insert`
  - Command: `INSERT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - With check:
    ```sql
    (is_active_user() AND (created_by = auth.uid()))
    ```
- `nationalities_select`
  - Command: `SELECT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND ((created_by = auth.uid()) OR (is_shared = true))))
    ```
- `nationalities_update`
  - Command: `UPDATE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND (created_by = auth.uid())))
    ```
  - With check:
    ```sql
    (is_admin() OR (is_active_user() AND (created_by = auth.uid())))
    ```

### public.nationality_languages

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `nationality_id` | uuid | no |  |  |  |  |
| 3 | `language_id` | uuid | no |  |  |  |  |
| 4 | `is_primary` | boolean | no | false |  |  |  |
| 5 | `priority` | integer | no | 100 |  |  |  |
| 6 | `created_at` | timestamp with time zone | yes | now() |  |  |  |
| 7 | `updated_at` | timestamp with time zone | yes | now() |  |  |  |

#### Constraints

- `nationality_languages_language_id_fkey` (foreign key)
```sql
FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE RESTRICT
```
- `nationality_languages_nationality_id_fkey` (foreign key)
```sql
FOREIGN KEY (nationality_id) REFERENCES nationalities(id) ON DELETE CASCADE
```
- `nationality_languages_pkey` (primary key)
```sql
PRIMARY KEY (id)
```
- `nationality_languages_nationality_language_unique` (unique)
```sql
UNIQUE (nationality_id, language_id)
```

#### Indexes

- `idx_nationality_languages_language_id`
```sql
CREATE INDEX idx_nationality_languages_language_id ON public.nationality_languages USING btree (language_id)
```
- `idx_nationality_languages_nationality_id`
```sql
CREATE INDEX idx_nationality_languages_nationality_id ON public.nationality_languages USING btree (nationality_id)
```
- `nationality_languages_nationality_language_unique`
```sql
CREATE UNIQUE INDEX nationality_languages_nationality_language_unique ON public.nationality_languages USING btree (nationality_id, language_id)
```
- `nationality_languages_pkey`
```sql
CREATE UNIQUE INDEX nationality_languages_pkey ON public.nationality_languages USING btree (id)
```

#### RLS Policies

- `Public delete access`
  - Command: `DELETE`
  - Permissive: PERMISSIVE
  - Roles: `{public}`
  - Using:
    ```sql
    true
    ```
- `Public insert access`
  - Command: `INSERT`
  - Permissive: PERMISSIVE
  - Roles: `{public}`
  - With check:
    ```sql
    true
    ```
- `Public read access`
  - Command: `SELECT`
  - Permissive: PERMISSIVE
  - Roles: `{public}`
  - Using:
    ```sql
    true
    ```
- `Public update access`
  - Command: `UPDATE`
  - Permissive: PERMISSIVE
  - Roles: `{public}`
  - Using:
    ```sql
    true
    ```

### public.provinces

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `name` | text | no |  |  |  |  |
| 3 | `status` | text | no | 'active'::text |  |  |  |
| 4 | `search_keywords` | text[] | yes | '{}'::text[] |  |  |  |
| 5 | `created_at` | timestamp with time zone | yes | now() |  |  |  |
| 6 | `updated_at` | timestamp with time zone | yes | now() |  |  |  |
| 7 | `created_by` | uuid | yes | default_created_by() |  |  |  |
| 8 | `is_shared` | boolean | no | is_admin() |  |  |  |

#### Constraints

- `provinces_created_by_fkey` (foreign key)
```sql
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
```
- `provinces_pkey` (primary key)
```sql
PRIMARY KEY (id)
```

#### Indexes

- `idx_provinces_created_by`
```sql
CREATE INDEX idx_provinces_created_by ON public.provinces USING btree (created_by)
```
- `provinces_pkey`
```sql
CREATE UNIQUE INDEX provinces_pkey ON public.provinces USING btree (id)
```

#### RLS Policies

- `provinces_delete`
  - Command: `DELETE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND (created_by = auth.uid())))
    ```
- `provinces_insert`
  - Command: `INSERT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - With check:
    ```sql
    (is_active_user() AND (created_by = auth.uid()))
    ```
- `provinces_select`
  - Command: `SELECT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND ((created_by = auth.uid()) OR (is_shared = true))))
    ```
- `provinces_update`
  - Command: `UPDATE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND (created_by = auth.uid())))
    ```
  - With check:
    ```sql
    (is_admin() OR (is_active_user() AND (created_by = auth.uid())))
    ```

### public.restaurants

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `name` | text | no |  |  |  |  |
| 3 | `restaurant_type` | text | no |  |  |  |  |
| 4 | `phone` | text | yes |  |  |  |  |
| 5 | `address` | text | yes |  |  |  |  |
| 6 | `note` | text | yes |  |  |  |  |
| 7 | `status` | text | no | 'active'::text |  |  |  |
| 8 | `search_keywords` | text[] | yes |  |  |  |  |
| 9 | `created_at` | timestamp with time zone | yes | now() |  |  |  |
| 10 | `updated_at` | timestamp with time zone | yes | now() |  |  |  |
| 11 | `commission_for_guide` | numeric | yes | 0 |  |  |  |
| 12 | `province_id` | uuid | yes |  |  |  |  |
| 13 | `province_name_at_booking` | text | yes |  |  |  |  |

#### Constraints

- `restaurants_restaurant_type_check` (check)
```sql
CHECK (restaurant_type = ANY (ARRAY['asian'::text, 'indian'::text, 'western'::text, 'local'::text, 'other'::text]))
```
- `restaurants_status_check` (check)
```sql
CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text]))
```
- `restaurants_province_id_fkey` (foreign key)
```sql
FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE SET NULL
```
- `restaurants_pkey` (primary key)
```sql
PRIMARY KEY (id)
```

#### Indexes

- `restaurants_name_unique_idx`
```sql
CREATE UNIQUE INDEX restaurants_name_unique_idx ON public.restaurants USING btree (lower(name))
```
- `restaurants_pkey`
```sql
CREATE UNIQUE INDEX restaurants_pkey ON public.restaurants USING btree (id)
```
- `restaurants_province_id_idx`
```sql
CREATE INDEX restaurants_province_id_idx ON public.restaurants USING btree (province_id)
```
- `restaurants_search_keywords_idx`
```sql
CREATE INDEX restaurants_search_keywords_idx ON public.restaurants USING gin (search_keywords)
```
- `restaurants_status_idx`
```sql
CREATE INDEX restaurants_status_idx ON public.restaurants USING btree (status)
```

### public.shop_places

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `name` | text | no |  |  |  |  |
| 3 | `shop_type` | text | no |  |  |  |  |
| 4 | `phone` | text | yes |  |  |  |  |
| 5 | `address` | text | yes |  |  |  |  |
| 6 | `note` | text | yes |  |  |  |  |
| 7 | `status` | text | no | 'active'::text |  |  |  |
| 8 | `search_keywords` | text[] | yes |  |  |  |  |
| 9 | `created_at` | timestamp with time zone | yes | now() |  |  |  |
| 10 | `updated_at` | timestamp with time zone | yes | now() |  |  |  |
| 11 | `commission_for_guide` | numeric | yes | 0 |  |  |  |
| 12 | `province_id` | uuid | yes |  |  |  |  |
| 13 | `province_name_at_booking` | text | yes |  |  |  |  |

#### Constraints

- `shop_places_shop_type_check` (check)
```sql
CHECK (shop_type = ANY (ARRAY['clothing'::text, 'food_and_beverage'::text, 'souvenirs'::text, 'handicrafts'::text, 'electronics'::text, 'other'::text]))
```
- `shop_places_status_check` (check)
```sql
CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text]))
```
- `shop_places_province_id_fkey` (foreign key)
```sql
FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE SET NULL
```
- `shop_places_pkey` (primary key)
```sql
PRIMARY KEY (id)
```

#### Indexes

- `shop_places_name_unique_idx`
```sql
CREATE UNIQUE INDEX shop_places_name_unique_idx ON public.shop_places USING btree (lower(name))
```
- `shop_places_pkey`
```sql
CREATE UNIQUE INDEX shop_places_pkey ON public.shop_places USING btree (id)
```
- `shop_places_province_id_idx`
```sql
CREATE INDEX shop_places_province_id_idx ON public.shop_places USING btree (province_id)
```
- `shop_places_search_keywords_idx`
```sql
CREATE INDEX shop_places_search_keywords_idx ON public.shop_places USING gin (search_keywords)
```
- `shop_places_status_idx`
```sql
CREATE INDEX shop_places_status_idx ON public.shop_places USING btree (status)
```

### public.shopping_commission_payments

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `tour_shopping_id` | uuid | no |  |  |  |  |
| 3 | `amount` | numeric | no |  |  |  |  |
| 4 | `payment_method` | character varying | no |  |  |  |  |
| 5 | `paid_at` | date | no |  |  |  |  |
| 6 | `note` | text | yes |  |  |  |  |
| 7 | `created_at` | timestamp with time zone | yes | now() |  |  |  |
| 8 | `updated_at` | timestamp with time zone | yes | now() |  |  |  |

#### Constraints

- `shopping_commission_payments_amount_positive` (check)
```sql
CHECK (amount > 0::numeric) NOT VALID
```
- `shopping_commission_payments_payment_method_check` (check)
```sql
CHECK (payment_method::text = ANY (ARRAY['cash'::character varying, 'bank_transfer'::character varying]::text[]))
```
- `shopping_commission_payments_tour_shopping_id_fkey` (foreign key)
```sql
FOREIGN KEY (tour_shopping_id) REFERENCES tour_shoppings(id) ON DELETE CASCADE
```
- `shopping_commission_payments_pkey` (primary key)
```sql
PRIMARY KEY (id)
```

#### Indexes

- `idx_scp_tour_shopping_id`
```sql
CREATE INDEX idx_scp_tour_shopping_id ON public.shopping_commission_payments USING btree (tour_shopping_id)
```
- `shopping_commission_payments_pkey`
```sql
CREATE UNIQUE INDEX shopping_commission_payments_pkey ON public.shopping_commission_payments USING btree (id)
```

#### RLS Policies

- `shopping_commission_payments delete`
  - Command: `DELETE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_modify_tour_shopping(tour_shopping_id)
    ```
- `shopping_commission_payments insert`
  - Command: `INSERT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - With check:
    ```sql
    can_modify_tour_shopping(tour_shopping_id)
    ```
- `shopping_commission_payments select`
  - Command: `SELECT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_view_tour_shopping(tour_shopping_id)
    ```
- `shopping_commission_payments update`
  - Command: `UPDATE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_modify_tour_shopping(tour_shopping_id)
    ```
  - With check:
    ```sql
    can_modify_tour_shopping(tour_shopping_id)
    ```

### public.shoppings

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `name` | text | no |  |  |  |  |
| 3 | `status` | text | no | 'active'::text |  |  |  |
| 4 | `search_keywords` | text[] | yes | '{}'::text[] |  |  |  |
| 5 | `created_at` | timestamp with time zone | yes | now() |  |  |  |
| 6 | `updated_at` | timestamp with time zone | yes | now() |  |  |  |
| 7 | `price` | numeric | yes | 0 |  |  |  |
| 8 | `created_by` | uuid | yes | default_created_by() |  |  |  |
| 9 | `guide_id` | uuid | yes |  |  |  |  |
| 10 | `is_shared` | boolean | no | is_admin() |  |  |  |
| 11 | `phone` | character varying | yes |  |  |  |  |
| 12 | `address` | text | yes |  |  |  |  |
| 13 | `commission_rate` | numeric(5,4) | yes | NULL::numeric |  |  |  |
| 14 | `withholds_pit` | boolean | no | false |  |  |  |
| 15 | `pit_rate` | numeric(5,4) | yes | NULL::numeric |  |  |  |

#### Constraints

- `shoppings_created_by_fkey` (foreign key)
```sql
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
```
- `shoppings_guide_id_fkey` (foreign key)
```sql
FOREIGN KEY (guide_id) REFERENCES user_profiles(id) ON DELETE SET NULL
```
- `shoppings_pkey` (primary key)
```sql
PRIMARY KEY (id)
```

#### Indexes

- `idx_shoppings_created_by`
```sql
CREATE INDEX idx_shoppings_created_by ON public.shoppings USING btree (created_by)
```
- `shoppings_pkey`
```sql
CREATE UNIQUE INDEX shoppings_pkey ON public.shoppings USING btree (id)
```

#### RLS Policies

- `shoppings_delete`
  - Command: `DELETE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND (created_by = auth.uid())))
    ```
- `shoppings_insert`
  - Command: `INSERT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - With check:
    ```sql
    (is_active_user() AND (created_by = auth.uid()))
    ```
- `shoppings_select`
  - Command: `SELECT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND ((created_by = auth.uid()) OR (is_shared = true))))
    ```
- `shoppings_update`
  - Command: `UPDATE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND (created_by = auth.uid())))
    ```
  - With check:
    ```sql
    (is_admin() OR (is_active_user() AND (created_by = auth.uid())))
    ```

### public.tour_allowances

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `tour_id` | uuid | yes |  |  |  |  |
| 3 | `date` | date | yes |  |  |  |  |
| 4 | `name` | text | no |  |  |  |  |
| 5 | `price` | numeric | yes | 0 |  |  |  |
| 6 | `created_at` | timestamp with time zone | yes | now() |  |  |  |
| 7 | `quantity` | integer | yes | 1 |  |  |  |
| 8 | `category_id` | uuid | yes |  |  |  |  |
| 9 | `line_status` | text | no | 'unchecked'::text |  |  |  |
| 10 | `line_comment` | text | yes |  |  |  |  |
| 11 | `reviewed_by` | uuid | yes |  |  |  |  |
| 12 | `reviewed_at` | timestamp with time zone | yes |  |  |  |  |

#### Constraints

- `tour_allowances_line_status_check` (check)
```sql
CHECK (line_status = ANY (ARRAY['unchecked'::text, 'valid'::text, 'need_more'::text, 'invalid'::text]))
```
- `tour_allowances_category_id_fkey` (foreign key)
```sql
FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL
```
- `tour_allowances_reviewed_by_fkey` (foreign key)
```sql
FOREIGN KEY (reviewed_by) REFERENCES user_profiles(id) ON DELETE SET NULL
```
- `tour_allowances_tour_id_fkey` (foreign key)
```sql
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE
```
- `tour_allowances_pkey` (primary key)
```sql
PRIMARY KEY (id)
```

#### Indexes

- `idx_tour_allowances_tour_id`
```sql
CREATE INDEX idx_tour_allowances_tour_id ON public.tour_allowances USING btree (tour_id)
```
- `tour_allowances_category_id_idx`
```sql
CREATE INDEX tour_allowances_category_id_idx ON public.tour_allowances USING btree (category_id)
```
- `tour_allowances_pkey`
```sql
CREATE UNIQUE INDEX tour_allowances_pkey ON public.tour_allowances USING btree (id)
```

#### RLS Policies

- `tour_allowances_delete`
  - Command: `DELETE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_edit_tour_content(tour_id)
    ```
- `tour_allowances_insert`
  - Command: `INSERT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - With check:
    ```sql
    can_edit_tour_content(tour_id)
    ```
- `tour_allowances_select`
  - Command: `SELECT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_view_tour(tour_id)
    ```
- `tour_allowances_update`
  - Command: `UPDATE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_modify_tour(tour_id)
    ```
  - With check:
    ```sql
    can_modify_tour(tour_id)
    ```

### public.tour_destinations

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `tour_id` | uuid | yes |  |  |  |  |
| 3 | `name` | text | no |  |  |  |  |
| 4 | `price` | numeric | yes | 0 |  |  |  |
| 5 | `date` | date | yes |  |  |  |  |
| 6 | `created_at` | timestamp with time zone | yes | now() |  |  |  |
| 7 | `guests` | integer | yes | 1 |  |  |  |
| 8 | `line_status` | text | no | 'unchecked'::text |  |  |  |
| 9 | `line_comment` | text | yes |  |  |  |  |
| 10 | `reviewed_by` | uuid | yes |  |  |  |  |
| 11 | `reviewed_at` | timestamp with time zone | yes |  |  |  |  |
| 12 | `guide_note` | text | yes |  |  |  |  |
| 13 | `vat_rate` | numeric(5,2) | no | 0 |  |  |  |
| 14 | `vat_amount` | numeric(12,2) | no | 0 |  |  |  |

#### Constraints

- `tour_destinations_line_status_check` (check)
```sql
CHECK (line_status = ANY (ARRAY['unchecked'::text, 'valid'::text, 'need_more'::text, 'invalid'::text]))
```
- `tour_destinations_reviewed_by_fkey` (foreign key)
```sql
FOREIGN KEY (reviewed_by) REFERENCES user_profiles(id) ON DELETE SET NULL
```
- `tour_destinations_tour_id_fkey` (foreign key)
```sql
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE
```
- `tour_destinations_pkey` (primary key)
```sql
PRIMARY KEY (id)
```

#### Indexes

- `idx_tour_destinations_tour_id`
```sql
CREATE INDEX idx_tour_destinations_tour_id ON public.tour_destinations USING btree (tour_id)
```
- `tour_destinations_pkey`
```sql
CREATE UNIQUE INDEX tour_destinations_pkey ON public.tour_destinations USING btree (id)
```

#### RLS Policies

- `tour_destinations_delete`
  - Command: `DELETE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_edit_tour_content(tour_id)
    ```
- `tour_destinations_insert`
  - Command: `INSERT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - With check:
    ```sql
    can_edit_tour_content(tour_id)
    ```
- `tour_destinations_select`
  - Command: `SELECT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_view_tour(tour_id)
    ```
- `tour_destinations_update`
  - Command: `UPDATE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_modify_tour(tour_id)
    ```
  - With check:
    ```sql
    can_modify_tour(tour_id)
    ```

### public.tour_diaries

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `tour_id` | uuid | yes |  |  |  |  |
| 3 | `tour_code_at_booking` | text | yes |  |  |  |  |
| 4 | `diary_type_id` | uuid | yes |  |  |  |  |
| 5 | `diary_type_name_at_booking` | text | yes |  |  |  |  |
| 6 | `content_type` | text | no |  |  |  |  |
| 7 | `content_text` | text | yes |  |  |  |  |
| 8 | `content_urls` | text[] | yes |  |  |  |  |
| 9 | `created_at` | timestamp with time zone | yes | now() |  |  |  |
| 10 | `updated_at` | timestamp with time zone | yes | now() |  |  |  |
| 11 | `diary_type_data_type` | text | yes |  |  |  |  |

#### Constraints

- `tour_diaries_tour_id_fkey` (foreign key)
```sql
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE
```
- `tour_diaries_pkey` (primary key)
```sql
PRIMARY KEY (id)
```

#### Indexes

- `idx_tour_diaries_tour_id`
```sql
CREATE INDEX idx_tour_diaries_tour_id ON public.tour_diaries USING btree (tour_id)
```
- `tour_diaries_pkey`
```sql
CREATE UNIQUE INDEX tour_diaries_pkey ON public.tour_diaries USING btree (id)
```

### public.tour_expenses

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `tour_id` | uuid | yes |  |  |  |  |
| 3 | `name` | text | no |  |  |  |  |
| 4 | `price` | numeric | yes | 0 |  |  |  |
| 5 | `date` | date | yes |  |  |  |  |
| 6 | `created_at` | timestamp with time zone | yes | now() |  |  |  |
| 7 | `guests` | integer | yes | 1 |  |  |  |
| 8 | `line_status` | text | no | 'unchecked'::text |  |  |  |
| 9 | `line_comment` | text | yes |  |  |  |  |
| 10 | `reviewed_by` | uuid | yes |  |  |  |  |
| 11 | `reviewed_at` | timestamp with time zone | yes |  |  |  |  |
| 12 | `guide_note` | text | yes |  |  |  |  |
| 13 | `vat_rate` | numeric(5,2) | no | 0 |  |  |  |
| 14 | `vat_amount` | numeric(12,2) | no | 0 |  |  |  |
| 15 | `days` | numeric(6,2) | yes |  |  |  | Number of chargeable days for expense rows that need a day multiplier, such as water for guests. |

#### Constraints

- `tour_expenses_line_status_check` (check)
```sql
CHECK (line_status = ANY (ARRAY['unchecked'::text, 'valid'::text, 'need_more'::text, 'invalid'::text]))
```
- `tour_expenses_reviewed_by_fkey` (foreign key)
```sql
FOREIGN KEY (reviewed_by) REFERENCES user_profiles(id) ON DELETE SET NULL
```
- `tour_expenses_tour_id_fkey` (foreign key)
```sql
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE
```
- `tour_expenses_pkey` (primary key)
```sql
PRIMARY KEY (id)
```

#### Indexes

- `idx_tour_expenses_tour_id`
```sql
CREATE INDEX idx_tour_expenses_tour_id ON public.tour_expenses USING btree (tour_id)
```
- `tour_expenses_pkey`
```sql
CREATE UNIQUE INDEX tour_expenses_pkey ON public.tour_expenses USING btree (id)
```

#### RLS Policies

- `tour_expenses_delete`
  - Command: `DELETE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_edit_tour_content(tour_id)
    ```
- `tour_expenses_insert`
  - Command: `INSERT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - With check:
    ```sql
    can_edit_tour_content(tour_id)
    ```
- `tour_expenses_select`
  - Command: `SELECT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_view_tour(tour_id)
    ```
- `tour_expenses_update`
  - Command: `UPDATE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_modify_tour(tour_id)
    ```
  - With check:
    ```sql
    can_modify_tour(tour_id)
    ```

### public.tour_images

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `tour_id` | uuid | yes |  |  |  |  |
| 3 | `storage_path` | text | yes |  |  |  |  |
| 4 | `file_name` | text | yes |  |  |  |  |
| 5 | `file_size` | integer | yes |  |  |  |  |
| 6 | `mime_type` | text | yes |  |  |  |  |
| 7 | `created_at` | timestamp with time zone | yes | now() |  |  |  |

#### Constraints

- `tour_images_tour_id_fkey` (foreign key)
```sql
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE
```
- `tour_images_pkey` (primary key)
```sql
PRIMARY KEY (id)
```

#### Indexes

- `idx_tour_images_tour_id`
```sql
CREATE INDEX idx_tour_images_tour_id ON public.tour_images USING btree (tour_id)
```
- `tour_images_pkey`
```sql
CREATE UNIQUE INDEX tour_images_pkey ON public.tour_images USING btree (id)
```

#### RLS Policies

- `tour_images_delete`
  - Command: `DELETE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_edit_tour_content(tour_id)
    ```
- `tour_images_insert`
  - Command: `INSERT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - With check:
    ```sql
    can_edit_tour_content(tour_id)
    ```
- `tour_images_select`
  - Command: `SELECT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_view_tour(tour_id)
    ```
- `tour_images_update`
  - Command: `UPDATE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_edit_tour_content(tour_id)
    ```
  - With check:
    ```sql
    can_edit_tour_content(tour_id)
    ```

### public.tour_line_attachments

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `tour_id` | uuid | no |  |  |  |  |
| 3 | `line_type` | text | no |  |  |  |  |
| 4 | `line_id` | uuid | no |  |  |  |  |
| 5 | `file_path` | text | no |  |  |  |  |
| 6 | `file_name` | text | no |  |  |  |  |
| 7 | `file_type` | text | yes |  |  |  |  |
| 8 | `file_size` | integer | yes |  |  |  |  |
| 9 | `uploaded_by` | uuid | yes |  |  |  |  |
| 10 | `created_at` | timestamp with time zone | no | now() |  |  |  |

#### Constraints

- `tour_line_attachments_line_type_check` (check)
```sql
CHECK (line_type = ANY (ARRAY['destination'::text, 'meal'::text, 'expense'::text]))
```
- `tour_line_attachments_tour_id_fkey` (foreign key)
```sql
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE
```
- `tour_line_attachments_uploaded_by_fkey` (foreign key)
```sql
FOREIGN KEY (uploaded_by) REFERENCES user_profiles(id) ON DELETE SET NULL
```
- `tour_line_attachments_pkey` (primary key)
```sql
PRIMARY KEY (id)
```
- `tour_line_attachments_file_path_key` (unique)
```sql
UNIQUE (file_path)
```

#### Indexes

- `idx_tour_line_attachments_line`
```sql
CREATE INDEX idx_tour_line_attachments_line ON public.tour_line_attachments USING btree (line_type, line_id)
```
- `idx_tour_line_attachments_tour`
```sql
CREATE INDEX idx_tour_line_attachments_tour ON public.tour_line_attachments USING btree (tour_id, created_at DESC)
```
- `tour_line_attachments_file_path_key`
```sql
CREATE UNIQUE INDEX tour_line_attachments_file_path_key ON public.tour_line_attachments USING btree (file_path)
```
- `tour_line_attachments_pkey`
```sql
CREATE UNIQUE INDEX tour_line_attachments_pkey ON public.tour_line_attachments USING btree (id)
```

#### RLS Policies

- `tour_line_attachments_delete`
  - Command: `DELETE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_modify_tour(tour_id)
    ```
- `tour_line_attachments_insert`
  - Command: `INSERT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - With check:
    ```sql
    can_modify_tour(tour_id)
    ```
- `tour_line_attachments_select`
  - Command: `SELECT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_view_tour(tour_id)
    ```

### public.tour_meals

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `tour_id` | uuid | yes |  |  |  |  |
| 3 | `name` | text | no |  |  |  |  |
| 4 | `price` | numeric | yes | 0 |  |  |  |
| 5 | `date` | date | yes |  |  |  |  |
| 6 | `created_at` | timestamp with time zone | yes | now() |  |  |  |
| 7 | `guests` | integer | yes | 1 |  |  |  |
| 8 | `line_status` | text | no | 'unchecked'::text |  |  |  |
| 9 | `line_comment` | text | yes |  |  |  |  |
| 10 | `reviewed_by` | uuid | yes |  |  |  |  |
| 11 | `reviewed_at` | timestamp with time zone | yes |  |  |  |  |
| 12 | `guide_note` | text | yes |  |  |  |  |
| 13 | `vat_rate` | numeric(5,2) | no | 0 |  |  |  |
| 14 | `vat_amount` | numeric(12,2) | no | 0 |  |  |  |

#### Constraints

- `tour_meals_line_status_check` (check)
```sql
CHECK (line_status = ANY (ARRAY['unchecked'::text, 'valid'::text, 'need_more'::text, 'invalid'::text]))
```
- `tour_meals_reviewed_by_fkey` (foreign key)
```sql
FOREIGN KEY (reviewed_by) REFERENCES user_profiles(id) ON DELETE SET NULL
```
- `tour_meals_tour_id_fkey` (foreign key)
```sql
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE
```
- `tour_meals_pkey` (primary key)
```sql
PRIMARY KEY (id)
```

#### Indexes

- `idx_tour_meals_tour_id`
```sql
CREATE INDEX idx_tour_meals_tour_id ON public.tour_meals USING btree (tour_id)
```
- `tour_meals_pkey`
```sql
CREATE UNIQUE INDEX tour_meals_pkey ON public.tour_meals USING btree (id)
```

#### RLS Policies

- `tour_meals_delete`
  - Command: `DELETE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_edit_tour_content(tour_id)
    ```
- `tour_meals_insert`
  - Command: `INSERT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - With check:
    ```sql
    can_edit_tour_content(tour_id)
    ```
- `tour_meals_select`
  - Command: `SELECT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_view_tour(tour_id)
    ```
- `tour_meals_update`
  - Command: `UPDATE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_modify_tour(tour_id)
    ```
  - With check:
    ```sql
    can_modify_tour(tour_id)
    ```

### public.tour_nationalities

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `tour_id` | uuid | no |  |  |  |  |
| 3 | `nationality_id` | uuid | no |  |  |  |  |
| 4 | `nationality_name_at_booking` | text | no |  |  |  |  |
| 5 | `pax_count` | integer | no | 1 |  |  |  |
| 6 | `created_at` | timestamp with time zone | yes | now() |  |  |  |
| 7 | `updated_at` | timestamp with time zone | yes | now() |  |  |  |

#### Constraints

- `tour_nationalities_pax_count_check` (check)
```sql
CHECK (pax_count > 0)
```
- `tour_nationalities_nationality_id_fkey` (foreign key)
```sql
FOREIGN KEY (nationality_id) REFERENCES nationalities(id) ON DELETE RESTRICT
```
- `tour_nationalities_tour_id_fkey` (foreign key)
```sql
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE
```
- `tour_nationalities_pkey` (primary key)
```sql
PRIMARY KEY (id)
```
- `tour_nationalities_tour_nationality_unique` (unique)
```sql
UNIQUE (tour_id, nationality_id)
```

#### Indexes

- `idx_tour_nationalities_nationality_id`
```sql
CREATE INDEX idx_tour_nationalities_nationality_id ON public.tour_nationalities USING btree (nationality_id)
```
- `idx_tour_nationalities_tour_id`
```sql
CREATE INDEX idx_tour_nationalities_tour_id ON public.tour_nationalities USING btree (tour_id)
```
- `tour_nationalities_pkey`
```sql
CREATE UNIQUE INDEX tour_nationalities_pkey ON public.tour_nationalities USING btree (id)
```
- `tour_nationalities_tour_nationality_unique`
```sql
CREATE UNIQUE INDEX tour_nationalities_tour_nationality_unique ON public.tour_nationalities USING btree (tour_id, nationality_id)
```

#### RLS Policies

- `tour_nationalities_delete`
  - Command: `DELETE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_edit_tour_content(tour_id)
    ```
- `tour_nationalities_insert`
  - Command: `INSERT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - With check:
    ```sql
    can_edit_tour_content(tour_id)
    ```
- `tour_nationalities_select`
  - Command: `SELECT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_view_tour(tour_id)
    ```
- `tour_nationalities_update`
  - Command: `UPDATE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_edit_tour_content(tour_id)
    ```
  - With check:
    ```sql
    can_edit_tour_content(tour_id)
    ```

### public.tour_payments

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `tour_id` | uuid | no |  |  |  |  |
| 3 | `amount` | numeric | no |  |  |  |  |
| 4 | `payment_method` | text | no |  |  |  |  |
| 5 | `paid_at` | timestamp with time zone | no | now() |  |  |  |
| 6 | `paid_by` | uuid | yes |  |  |  |  |
| 7 | `note` | text | yes |  |  |  |  |
| 8 | `created_at` | timestamp with time zone | yes | now() |  |  |  |
| 9 | `updated_at` | timestamp with time zone | yes | now() |  |  |  |

#### Constraints

- `tour_payments_amount_check` (check)
```sql
CHECK (amount > 0::numeric)
```
- `tour_payments_payment_method_check` (check)
```sql
CHECK (payment_method = ANY (ARRAY['cash'::text, 'bank_transfer'::text]))
```
- `tour_payments_paid_by_fkey` (foreign key)
```sql
FOREIGN KEY (paid_by) REFERENCES user_profiles(id)
```
- `tour_payments_tour_id_fkey` (foreign key)
```sql
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE
```
- `tour_payments_pkey` (primary key)
```sql
PRIMARY KEY (id)
```

#### Indexes

- `idx_tour_payments_paid_at`
```sql
CREATE INDEX idx_tour_payments_paid_at ON public.tour_payments USING btree (paid_at DESC)
```
- `idx_tour_payments_tour_id`
```sql
CREATE INDEX idx_tour_payments_tour_id ON public.tour_payments USING btree (tour_id)
```
- `tour_payments_pkey`
```sql
CREATE UNIQUE INDEX tour_payments_pkey ON public.tour_payments USING btree (id)
```

#### RLS Policies

- `tour_payments delete`
  - Command: `DELETE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (can_view_tour(tour_id) AND check_user_permission(auth.uid(), ARRAY['mark_tour_paid'::text]))
    ```
- `tour_payments insert`
  - Command: `INSERT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - With check:
    ```sql
    (can_view_tour(tour_id) AND check_user_permission(auth.uid(), ARRAY['mark_tour_paid'::text]))
    ```
- `tour_payments select`
  - Command: `SELECT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_view_tour(tour_id)
    ```
- `tour_payments update`
  - Command: `UPDATE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (can_view_tour(tour_id) AND check_user_permission(auth.uid(), ARRAY['mark_tour_paid'::text]))
    ```
  - With check:
    ```sql
    (can_view_tour(tour_id) AND check_user_permission(auth.uid(), ARRAY['mark_tour_paid'::text]))
    ```

### public.tour_shoppings

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `tour_id` | uuid | yes |  |  |  |  |
| 3 | `name` | text | no |  |  |  |  |
| 4 | `price` | numeric | no | 0 |  |  |  |
| 5 | `date` | date | yes |  |  |  |  |
| 6 | `created_at` | timestamp with time zone | yes | now() |  |  |  |
| 7 | `updated_at` | timestamp with time zone | yes | now() |  |  |  |
| 8 | `line_status` | text | no | 'unchecked'::text |  |  |  |
| 9 | `line_comment` | text | yes |  |  |  |  |
| 10 | `reviewed_by` | uuid | yes |  |  |  |  |
| 11 | `reviewed_at` | timestamp with time zone | yes |  |  |  |  |
| 12 | `withholds_pit` | boolean | yes |  |  |  |  |
| 13 | `pit_rate` | numeric(5,4) | yes | NULL::numeric |  |  |  |
| 14 | `pit_amount` | numeric | yes |  |  |  |  |
| 15 | `net_commission` | numeric | yes |  |  |  |  |

#### Constraints

- `tour_shoppings_line_status_check` (check)
```sql
CHECK (line_status = ANY (ARRAY['unchecked'::text, 'valid'::text, 'need_more'::text, 'invalid'::text]))
```
- `tour_shoppings_reviewed_by_fkey` (foreign key)
```sql
FOREIGN KEY (reviewed_by) REFERENCES user_profiles(id) ON DELETE SET NULL
```
- `tour_shoppings_tour_id_fkey` (foreign key)
```sql
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE
```
- `tour_shoppings_pkey` (primary key)
```sql
PRIMARY KEY (id)
```

#### Indexes

- `idx_tour_shoppings_tour_id`
```sql
CREATE INDEX idx_tour_shoppings_tour_id ON public.tour_shoppings USING btree (tour_id)
```
- `tour_shoppings_pkey`
```sql
CREATE UNIQUE INDEX tour_shoppings_pkey ON public.tour_shoppings USING btree (id)
```

#### RLS Policies

- `tour_shoppings_delete`
  - Command: `DELETE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_edit_tour_content(tour_id)
    ```
- `tour_shoppings_insert`
  - Command: `INSERT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - With check:
    ```sql
    can_edit_tour_content(tour_id)
    ```
- `tour_shoppings_select`
  - Command: `SELECT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_view_tour(tour_id)
    ```
- `tour_shoppings_update`
  - Command: `UPDATE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_modify_tour(tour_id)
    ```
  - With check:
    ```sql
    can_modify_tour(tour_id)
    ```

### public.tour_submission_history

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `tour_id` | uuid | no |  |  |  |  |
| 3 | `event` | text | no |  |  |  |  |
| 4 | `actor_id` | uuid | yes |  |  |  |  |
| 5 | `actor_role` | text | yes |  |  |  |  |
| 6 | `note` | text | yes |  |  |  |  |
| 7 | `created_at` | timestamp with time zone | no | now() |  |  |  |

#### Constraints

- `tour_submission_history_event_check` (check)
```sql
CHECK (event = ANY (ARRAY['submitted'::text, 'returned'::text, 'approved'::text, 'reopened'::text]))
```
- `tour_submission_history_actor_id_fkey` (foreign key)
```sql
FOREIGN KEY (actor_id) REFERENCES user_profiles(id) ON DELETE SET NULL
```
- `tour_submission_history_tour_id_fkey` (foreign key)
```sql
FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE
```
- `tour_submission_history_pkey` (primary key)
```sql
PRIMARY KEY (id)
```

#### Indexes

- `idx_tour_submission_history_tour`
```sql
CREATE INDEX idx_tour_submission_history_tour ON public.tour_submission_history USING btree (tour_id, created_at DESC)
```
- `tour_submission_history_pkey`
```sql
CREATE UNIQUE INDEX tour_submission_history_pkey ON public.tour_submission_history USING btree (id)
```

#### RLS Policies

- `tour_submission_history_insert`
  - Command: `INSERT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - With check:
    ```sql
    can_modify_tour(tour_id)
    ```
- `tour_submission_history_select`
  - Command: `SELECT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_view_tour(tour_id)
    ```

### public.tourist_destinations

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `name` | text | no |  |  |  |  |
| 3 | `province_id` | uuid | yes |  |  |  |  |
| 4 | `status` | text | no | 'active'::text |  |  |  |
| 5 | `search_keywords` | text[] | yes | '{}'::text[] |  |  |  |
| 6 | `created_at` | timestamp with time zone | yes | now() |  |  |  |
| 7 | `updated_at` | timestamp with time zone | yes | now() |  |  |  |
| 8 | `price` | numeric | yes | 0 |  |  |  |
| 9 | `province_name_at_booking` | text | yes |  |  |  |  |
| 10 | `created_by` | uuid | yes | default_created_by() |  |  |  |
| 11 | `is_shared` | boolean | no | is_admin() |  |  |  |
| 12 | `raw_name` | text | yes |  |  |  | Optional unstandardized/original name for the tourist destination. |

#### Constraints

- `tourist_destinations_created_by_fkey` (foreign key)
```sql
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
```
- `tourist_destinations_pkey` (primary key)
```sql
PRIMARY KEY (id)
```

#### Indexes

- `idx_tourist_destinations_created_by`
```sql
CREATE INDEX idx_tourist_destinations_created_by ON public.tourist_destinations USING btree (created_by)
```
- `tourist_destinations_pkey`
```sql
CREATE UNIQUE INDEX tourist_destinations_pkey ON public.tourist_destinations USING btree (id)
```

#### RLS Policies

- `tourist_destinations_delete`
  - Command: `DELETE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND (created_by = auth.uid())))
    ```
- `tourist_destinations_insert`
  - Command: `INSERT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - With check:
    ```sql
    (is_active_user() AND (created_by = auth.uid()))
    ```
- `tourist_destinations_select`
  - Command: `SELECT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND ((created_by = auth.uid()) OR (is_shared = true))))
    ```
- `tourist_destinations_update`
  - Command: `UPDATE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND (created_by = auth.uid())))
    ```
  - With check:
    ```sql
    (is_admin() OR (is_active_user() AND (created_by = auth.uid())))
    ```

### public.tours

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `tour_code` | text | no |  |  |  |  |
| 3 | `start_date` | date | yes |  |  |  |  |
| 4 | `end_date` | date | yes |  |  |  |  |
| 5 | `company_id` | uuid | yes |  |  |  | Booking / selling company (parent agency, e.g. Authentic Travel) |
| 6 | `guide_id` | uuid | yes |  |  |  |  |
| 7 | `number_of_guests` | integer | yes |  |  |  |  |
| 8 | `nationality_id` | uuid | yes |  |  |  |  |
| 9 | `notes` | text | yes |  |  |  |  |
| 10 | `created_at` | timestamp with time zone | yes | now() |  |  |  |
| 11 | `updated_at` | timestamp with time zone | yes | now() |  |  |  |
| 12 | `client_name` | text | yes |  |  |  |  |
| 13 | `adults` | integer | yes |  |  |  |  |
| 14 | `children` | integer | yes |  |  |  |  |
| 15 | `total_guests` | numeric | yes | 0 |  |  |  |
| 16 | `driver_name` | text | yes |  |  |  |  |
| 17 | `client_phone` | text | yes |  |  |  |  |
| 18 | `total_days` | numeric | yes | 0 |  |  |  |
| 19 | `company_name_at_booking` | text | yes |  |  |  |  |
| 20 | `guide_name_at_booking` | text | yes |  |  |  |  |
| 21 | `nationality_name_at_booking` | text | yes |  |  |  |  |
| 22 | `total_tabs` | numeric | yes | 0 |  |  |  |
| 23 | `advance_payment` | numeric | yes |  |  |  |  |
| 24 | `total_after_advance` | numeric | yes | 0 |  |  |  |
| 25 | `company_tip` | numeric | yes |  |  |  |  |
| 26 | `total_after_tip` | numeric | yes | 0 |  |  |  |
| 27 | `collections_for_company` | numeric | yes |  |  |  |  |
| 28 | `total_after_collections` | numeric | yes | 0 |  |  |  |
| 29 | `final_total` | numeric | yes | 0 |  |  |  |
| 30 | `summary` | jsonb | yes | '{"totalTabs": 0}'::jsonb |  |  |  |
| 31 | `note` | text | yes | ''::text |  |  |  |
| 32 | `created_by_user_id` | uuid | yes |  |  |  |  |
| 33 | `land_operator_id` | uuid | yes |  |  |  | Land operator / subcontractor company providing on-ground services (guide, transport, restaurant). Optional. |
| 34 | `land_operator_name_at_booking` | text | yes |  |  |  | Denormalized name of land operator at the time of booking. |
| 35 | `settlement_status` | text | no | 'draft'::text |  |  | Settlement workflow state: draft (HDV editing), submitted (sent to accountant), need_changes (returned), approved (locked), closed (archived). |
| 36 | `submitted_at` | timestamp with time zone | yes |  |  |  |  |
| 37 | `approved_at` | timestamp with time zone | yes |  |  |  |  |
| 38 | `approved_by` | uuid | yes |  |  |  |  |
| 39 | `locked_at` | timestamp with time zone | yes |  |  |  |  |
| 40 | `submission_count` | integer | no | 0 |  |  | Number of times HDV has submitted this tour for review. |
| 41 | `payment_status` | text | no | 'pending'::text |  |  |  |
| 42 | `payment_total` | numeric | no | 0 |  |  |  |
| 43 | `last_paid_at` | timestamp with time zone | yes |  |  |  |  |
| 44 | `last_payment_method` | text | yes |  |  |  |  |
| 45 | `water_warning_dismissed` | boolean | no | false |  |  |  |
| 46 | `has_zero_price` | boolean | no | false |  |  |  |
| 47 | `has_duplicate_dest_names` | boolean | no | false |  |  |  |
| 48 | `missing_water_expense` | boolean | no | false |  |  |  |
| 49 | `has_unpaid_commission` | boolean | no | false |  |  |  |
| 50 | `allowance_total` | numeric | no | 0 |  |  |  |

#### Constraints

- `tours_last_payment_method_check` (check)
```sql
CHECK (last_payment_method IS NULL OR (last_payment_method = ANY (ARRAY['cash'::text, 'bank_transfer'::text])))
```
- `tours_payment_status_check` (check)
```sql
CHECK (payment_status = ANY (ARRAY['pending'::text, 'partial'::text, 'paid'::text]))
```
- `tours_settlement_status_check` (check)
```sql
CHECK (settlement_status = ANY (ARRAY['draft'::text, 'submitted'::text, 'need_changes'::text, 'approved'::text, 'closed'::text]))
```
- `tours_approved_by_fkey` (foreign key)
```sql
FOREIGN KEY (approved_by) REFERENCES user_profiles(id) ON DELETE SET NULL
```
- `tours_created_by_user_id_fkey` (foreign key)
```sql
FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id)
```
- `tours_guide_id_fkey` (foreign key)
```sql
FOREIGN KEY (guide_id) REFERENCES user_profiles(id) ON DELETE SET NULL
```
- `tours_land_operator_id_fkey` (foreign key)
```sql
FOREIGN KEY (land_operator_id) REFERENCES companies(id) ON DELETE SET NULL
```
- `tours_pkey` (primary key)
```sql
PRIMARY KEY (id)
```

#### Indexes

- `idx_tours_company_land_operator`
```sql
CREATE INDEX idx_tours_company_land_operator ON public.tours USING btree (company_id, land_operator_id)
```
- `idx_tours_created_by_user_id`
```sql
CREATE INDEX idx_tours_created_by_user_id ON public.tours USING btree (created_by_user_id)
```
- `idx_tours_land_operator_id`
```sql
CREATE INDEX idx_tours_land_operator_id ON public.tours USING btree (land_operator_id)
```
- `idx_tours_payment_status`
```sql
CREATE INDEX idx_tours_payment_status ON public.tours USING btree (payment_status)
```
- `idx_tours_settlement_status`
```sql
CREATE INDEX idx_tours_settlement_status ON public.tours USING btree (settlement_status)
```
- `tours_pkey`
```sql
CREATE UNIQUE INDEX tours_pkey ON public.tours USING btree (id)
```

#### RLS Policies

- `tours_delete`
  - Command: `DELETE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND (guide_id = auth.uid()) AND check_user_permission(auth.uid(), ARRAY['delete_tours'::text])))
    ```
- `tours_insert`
  - Command: `INSERT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - With check:
    ```sql
    (is_admin() OR (is_active_user() AND check_user_permission(auth.uid(), ARRAY['create_tours'::text]) AND ((is_guide_user(auth.uid()) AND (guide_id = auth.uid())) OR ((NOT is_guide_user(auth.uid())) AND check_user_permission(auth.uid(), ARRAY['edit_tours'::text])))))
    ```
- `tours_select`
  - Command: `SELECT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    (is_admin() OR (is_active_user() AND ((is_guide_user(auth.uid()) AND (guide_id = auth.uid())) OR ((NOT is_guide_user(auth.uid())) AND check_user_permission(auth.uid(), ARRAY['edit_tours'::text])) OR ((settlement_status <> 'draft'::text) AND check_user_permission(auth.uid(), ARRAY['approve_settlement'::text, 'review_settlement_line'::text, 'reopen_settlement'::text, 'mark_tour_paid'::text])))))
    ```
- `tours_update`
  - Command: `UPDATE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    can_modify_tour(id)
    ```
  - With check:
    ```sql
    can_modify_tour(id)
    ```

### public.user_languages

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no | gen_random_uuid() |  |  |  |
| 2 | `user_id` | uuid | no |  |  |  |  |
| 3 | `language_id` | uuid | no |  |  |  |  |
| 4 | `proficiency` | text | no | 'working'::text |  |  |  |
| 5 | `created_at` | timestamp with time zone | no | now() |  |  |  |
| 6 | `updated_at` | timestamp with time zone | no | now() |  |  |  |

#### Constraints

- `user_languages_proficiency_check` (check)
```sql
CHECK (proficiency = ANY (ARRAY['basic'::text, 'working'::text, 'fluent'::text, 'native'::text]))
```
- `user_languages_language_id_fkey` (foreign key)
```sql
FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE RESTRICT
```
- `user_languages_user_id_fkey` (foreign key)
```sql
FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
```
- `user_languages_pkey` (primary key)
```sql
PRIMARY KEY (id)
```
- `user_languages_user_language_unique` (unique)
```sql
UNIQUE (user_id, language_id)
```

#### Indexes

- `idx_user_languages_language_id`
```sql
CREATE INDEX idx_user_languages_language_id ON public.user_languages USING btree (language_id)
```
- `idx_user_languages_user_id`
```sql
CREATE INDEX idx_user_languages_user_id ON public.user_languages USING btree (user_id)
```
- `user_languages_pkey`
```sql
CREATE UNIQUE INDEX user_languages_pkey ON public.user_languages USING btree (id)
```
- `user_languages_user_language_unique`
```sql
CREATE UNIQUE INDEX user_languages_user_language_unique ON public.user_languages USING btree (user_id, language_id)
```

#### RLS Policies

- `user_languages_delete`
  - Command: `DELETE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    check_user_permission(auth.uid(), ARRAY['manage_users'::text, 'edit_users'::text, 'change_user_roles'::text])
    ```
- `user_languages_insert`
  - Command: `INSERT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - With check:
    ```sql
    check_user_permission(auth.uid(), ARRAY['manage_users'::text, 'edit_users'::text, 'change_user_roles'::text])
    ```
- `user_languages_select`
  - Command: `SELECT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    ((user_id = auth.uid()) OR check_user_permission(auth.uid(), ARRAY['manage_users'::text, 'view_all_users'::text]) OR (is_active_user() AND (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = user_languages.user_id) AND (up.status = 'active'::text) AND (up.settlement_role = 'guide'::text))))))
    ```
- `user_languages_update`
  - Command: `UPDATE`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    check_user_permission(auth.uid(), ARRAY['manage_users'::text, 'edit_users'::text, 'change_user_roles'::text])
    ```
  - With check:
    ```sql
    check_user_permission(auth.uid(), ARRAY['manage_users'::text, 'edit_users'::text, 'change_user_roles'::text])
    ```

### public.user_profiles

Type: table
Owner: `postgres`
RLS enabled: yes
RLS forced: no

#### Columns

| # | Column | Type | Nullable | Default | Identity | Generated | Comment |
|---:|---|---|---|---|---|---|---|
| 1 | `id` | uuid | no |  |  |  |  |
| 2 | `email` | text | no |  |  |  |  |
| 3 | `full_name` | text | yes |  |  |  |  |
| 4 | `role` | text | no | 'viewer'::text |  |  |  |
| 5 | `status` | text | no | 'active'::text |  |  |  |
| 6 | `created_at` | timestamp with time zone | yes | now() |  |  |  |
| 7 | `updated_at` | timestamp with time zone | yes | now() |  |  |  |
| 8 | `created_by` | uuid | yes |  |  |  |  |
| 9 | `settlement_role` | text | no | 'none'::text |  |  | Business role for tour settlement workflow: guide (HDV submits), accountant (reviews/approves), none (no settlement involvement). |
| 10 | `permissions` | text[] | yes |  |  |  | Optional explicit app feature permissions. NULL means use role and settlement-role defaults. |
| 11 | `phone` | text | yes | ''::text |  |  |  |
| 12 | `note` | text | yes | ''::text |  |  |  |
| 13 | `is_default_guide` | boolean | no | false |  |  |  |
| 14 | `guide_search_keywords` | text[] | yes | '{}'::text[] |  |  |  |
| 15 | `legacy_guide_id` | uuid | yes |  |  |  |  |

#### Constraints

- `user_profiles_role_check` (check)
```sql
CHECK (role = ANY (ARRAY['admin'::text, 'editor'::text, 'viewer'::text]))
```
- `user_profiles_settlement_role_check` (check)
```sql
CHECK (settlement_role = ANY (ARRAY['none'::text, 'guide'::text, 'accountant'::text]))
```
- `user_profiles_status_check` (check)
```sql
CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text]))
```
- `user_profiles_created_by_fkey` (foreign key)
```sql
FOREIGN KEY (created_by) REFERENCES user_profiles(id)
```
- `user_profiles_id_fkey` (foreign key)
```sql
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
```
- `user_profiles_pkey` (primary key)
```sql
PRIMARY KEY (id)
```
- `user_profiles_email_key` (unique)
```sql
UNIQUE (email)
```

#### Indexes

- `idx_user_profiles_default_guide`
```sql
CREATE INDEX idx_user_profiles_default_guide ON public.user_profiles USING btree (is_default_guide) WHERE (settlement_role = 'guide'::text)
```
- `idx_user_profiles_email`
```sql
CREATE INDEX idx_user_profiles_email ON public.user_profiles USING btree (email)
```
- `idx_user_profiles_legacy_guide_id`
```sql
CREATE UNIQUE INDEX idx_user_profiles_legacy_guide_id ON public.user_profiles USING btree (legacy_guide_id) WHERE (legacy_guide_id IS NOT NULL)
```
- `idx_user_profiles_role`
```sql
CREATE INDEX idx_user_profiles_role ON public.user_profiles USING btree (role)
```
- `idx_user_profiles_settlement_role`
```sql
CREATE INDEX idx_user_profiles_settlement_role ON public.user_profiles USING btree (settlement_role)
```
- `idx_user_profiles_status`
```sql
CREATE INDEX idx_user_profiles_status ON public.user_profiles USING btree (status)
```
- `user_profiles_email_key`
```sql
CREATE UNIQUE INDEX user_profiles_email_key ON public.user_profiles USING btree (email)
```
- `user_profiles_pkey`
```sql
CREATE UNIQUE INDEX user_profiles_pkey ON public.user_profiles USING btree (id)
```

#### RLS Policies

- `Users can delete profiles with permission`
  - Command: `DELETE`
  - Permissive: PERMISSIVE
  - Roles: `{public}`
  - Using:
    ```sql
    ((id <> auth.uid()) AND check_user_permission(auth.uid(), ARRAY['manage_users'::text, 'delete_users'::text]))
    ```
- `Users can insert profiles with permission`
  - Command: `INSERT`
  - Permissive: PERMISSIVE
  - Roles: `{public}`
  - With check:
    ```sql
    check_user_permission(auth.uid(), ARRAY['manage_users'::text, 'create_users'::text])
    ```
- `Users can update profiles with permission`
  - Command: `UPDATE`
  - Permissive: PERMISSIVE
  - Roles: `{public}`
  - Using:
    ```sql
    check_user_permission(auth.uid(), ARRAY['manage_users'::text, 'edit_users'::text, 'change_user_roles'::text])
    ```
  - With check:
    ```sql
    check_user_permission(auth.uid(), ARRAY['manage_users'::text, 'edit_users'::text, 'change_user_roles'::text])
    ```
- `user_profiles_select`
  - Command: `SELECT`
  - Permissive: PERMISSIVE
  - Roles: `{authenticated}`
  - Using:
    ```sql
    ((id = auth.uid()) OR check_user_permission(auth.uid(), ARRAY['manage_users'::text, 'view_all_users'::text]) OR (is_active_user() AND (settlement_role = 'guide'::text) AND (status = 'active'::text)))
    ```

## Functions

### public.can_edit_tour_content(p_tour_id uuid)

Returns: `boolean`
Language: `sql`
Volatility: `stable`
Security: definer

```sql
CREATE OR REPLACE FUNCTION public.can_edit_tour_content(p_tour_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT p_tour_id IS NOT NULL
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.tours AS tour
        WHERE tour.id = p_tour_id
          AND public.is_active_user()
          AND (
            (
              public.is_guide_user(auth.uid())
              AND tour.guide_id = auth.uid()
              AND public.check_user_permission(auth.uid(), ARRAY['edit_tours','submit_settlement'])
            )
            OR (
              NOT public.is_guide_user(auth.uid())
              AND public.check_user_permission(auth.uid(), ARRAY['edit_tours'])
            )
          )
      )
    );
$function$
```

### public.can_modify_tour(p_tour_id uuid)

Returns: `boolean`
Language: `sql`
Volatility: `stable`
Security: definer

```sql
CREATE OR REPLACE FUNCTION public.can_modify_tour(p_tour_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT p_tour_id IS NOT NULL
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.tours AS tour
        WHERE tour.id = p_tour_id
          AND public.is_active_user()
          AND (
            (
              public.is_guide_user(auth.uid())
              AND tour.guide_id = auth.uid()
              AND public.check_user_permission(auth.uid(), ARRAY['edit_tours','submit_settlement'])
            )
            OR (
              NOT public.is_guide_user(auth.uid())
              AND public.check_user_permission(
                auth.uid(),
                ARRAY['edit_tours','approve_settlement','review_settlement_line','reopen_settlement','mark_tour_paid']
              )
            )
          )
      )
    );
$function$
```

### public.can_modify_tour_image_object(p_name text)

Returns: `boolean`
Language: `sql`
Volatility: `stable`
Security: definer

```sql
CREATE OR REPLACE FUNCTION public.can_modify_tour_image_object(p_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT public.can_edit_tour_content(public.storage_path_tour_id(p_name))
    OR EXISTS (
      SELECT 1
      FROM public.tour_images ti
      WHERE ti.storage_path = p_name
        AND public.can_edit_tour_content(ti.tour_id)
    );
$function$
```

### public.can_modify_tour_shopping(p_tour_shopping_id uuid)

Returns: `boolean`
Language: `sql`
Volatility: `stable`
Security: definer

```sql
CREATE OR REPLACE FUNCTION public.can_modify_tour_shopping(p_tour_shopping_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.tour_shoppings ts
    WHERE ts.id = p_tour_shopping_id
      AND public.can_edit_tour_content(ts.tour_id)
  );
$function$
```

### public.can_view_tour(p_tour_id uuid)

Returns: `boolean`
Language: `sql`
Volatility: `stable`
Security: definer

```sql
CREATE OR REPLACE FUNCTION public.can_view_tour(p_tour_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT p_tour_id IS NOT NULL
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.tours AS tour
        WHERE tour.id = p_tour_id
          AND public.is_active_user()
          AND (
            (public.is_guide_user(auth.uid()) AND tour.guide_id = auth.uid())
            OR (
              NOT public.is_guide_user(auth.uid())
              AND public.check_user_permission(auth.uid(), ARRAY['edit_tours'])
            )
            OR (
              tour.settlement_status <> 'draft'
              AND public.check_user_permission(
                auth.uid(),
                ARRAY['approve_settlement','review_settlement_line','reopen_settlement','mark_tour_paid']
              )
            )
          )
      )
    );
$function$
```

### public.can_view_tour_image_object(p_name text)

Returns: `boolean`
Language: `sql`
Volatility: `stable`
Security: definer

```sql
CREATE OR REPLACE FUNCTION public.can_view_tour_image_object(p_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT public.can_view_tour(public.storage_path_tour_id(p_name))
    OR EXISTS (
      SELECT 1
      FROM public.tour_images ti
      WHERE ti.storage_path = p_name
        AND public.can_view_tour(ti.tour_id)
    );
$function$
```

### public.can_view_tour_shopping(p_tour_shopping_id uuid)

Returns: `boolean`
Language: `sql`
Volatility: `stable`
Security: definer

```sql
CREATE OR REPLACE FUNCTION public.can_view_tour_shopping(p_tour_shopping_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.tour_shoppings ts
    WHERE ts.id = p_tour_shopping_id
      AND public.can_view_tour(ts.tour_id)
  );
$function$
```

### public.check_user_permission(user_id uuid, required_permissions text[])

Returns: `boolean`
Language: `plpgsql`
Volatility: `stable`
Security: definer

```sql
CREATE OR REPLACE FUNCTION public.check_user_permission(user_id uuid, required_permissions text[])
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_role TEXT;
  v_status TEXT;
  v_settlement_role TEXT;
  v_permissions TEXT[];
BEGIN
  SELECT role, status, settlement_role, permissions
  INTO v_role, v_status, v_settlement_role, v_permissions
  FROM public.user_profiles
  WHERE id = user_id;

  IF v_status IS DISTINCT FROM 'active' THEN
    RETURN false;
  END IF;
  IF v_role = 'admin' THEN
    RETURN true;
  END IF;

  RETURN COALESCE(
    COALESCE(v_permissions, public.default_permissions_for_profile(v_role, v_settlement_role))
    && required_permissions,
    false
  );
END;
$function$
```

### public.default_created_by()

Returns: `uuid`
Language: `sql`
Volatility: `stable`
Security: definer

```sql
CREATE OR REPLACE FUNCTION public.default_created_by()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT COALESCE(
    auth.uid(),
    (SELECT id FROM public.user_profiles WHERE email = 'iposntmk@gmail.com' AND status = 'active' LIMIT 1)
  );
$function$
```

### public.default_permissions_for_profile(p_role text, p_settlement_role text)

Returns: `text[]`
Language: `sql`
Volatility: `immutable`
Security: invoker

```sql
CREATE OR REPLACE FUNCTION public.default_permissions_for_profile(p_role text, p_settlement_role text)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT ARRAY(
    SELECT DISTINCT permission_name
    FROM unnest(
      public.default_permissions_for_role(p_role)
      || public.default_permissions_for_settlement_role(COALESCE(p_settlement_role, 'none'))
    ) AS default_permission(permission_name)
  );
$function$
```

### public.default_permissions_for_role(p_role text)

Returns: `text[]`
Language: `sql`
Volatility: `immutable`
Security: invoker

```sql
CREATE OR REPLACE FUNCTION public.default_permissions_for_role(p_role text)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT CASE p_role
    WHEN 'admin' THEN ARRAY[
      'view_tours','create_tours','edit_tours','delete_tours','export_tours','import_tours',
      'duplicate_tours','backup_data','download_all_tour_images','view_tour_all_tabs',
      'view_tour_info','view_tour_destinations','view_tour_expenses','view_tour_meals',
      'view_tour_combined','view_tour_allowances','view_tour_shoppings','view_tour_images',
      'view_tour_summary','edit_tour_info','edit_tour_destinations','edit_tour_expenses',
      'edit_tour_meals','edit_tour_allowances','edit_tour_shoppings','edit_tour_summary',
      'view_tour_info_all_fields','edit_tour_info_all_fields','view_tour_info_tour_code',
      'edit_tour_info_tour_code','view_tour_info_companies','edit_tour_info_companies',
      'view_tour_info_guide','edit_tour_info_guide','view_tour_info_client',
      'edit_tour_info_client','view_tour_info_pax','edit_tour_info_pax',
      'view_tour_info_dates','edit_tour_info_dates','view_tour_info_driver',
      'edit_tour_info_driver','view_tour_info_notes','edit_tour_info_notes',
      'view_tour_line_all_fields','edit_tour_line_all_fields','view_tour_line_name',
      'edit_tour_line_name','view_tour_line_price','edit_tour_line_price',
      'view_tour_line_date','edit_tour_line_date','view_tour_line_quantity',
      'edit_tour_line_quantity','view_tour_line_evidence','edit_tour_line_evidence',
      'upload_tour_images','delete_tour_images','view_master_data','edit_master_data',
      'delete_master_data','view_guides','create_guides','edit_guides','delete_guides',
      'import_guides','export_guides','view_languages','create_languages','edit_languages',
      'delete_languages','import_languages','export_languages','view_companies',
      'create_companies','edit_companies','delete_companies','import_companies',
      'export_companies','view_nationalities','create_nationalities','edit_nationalities',
      'delete_nationalities','import_nationalities','export_nationalities','view_provinces',
      'create_provinces','edit_provinces','delete_provinces','import_provinces',
      'export_provinces','view_tourist_destinations','create_tourist_destinations',
      'edit_tourist_destinations','delete_tourist_destinations',
      'import_tourist_destinations','export_tourist_destinations','view_shopping',
      'create_shopping','edit_shopping','delete_shopping','import_shopping','export_shopping',
      'view_expense_categories','create_expense_categories','edit_expense_categories',
      'delete_expense_categories','import_expense_categories','export_expense_categories',
      'view_detailed_expenses','create_detailed_expenses','edit_detailed_expenses',
      'delete_detailed_expenses','import_detailed_expenses','export_detailed_expenses',
      'view_statistics','manage_users','view_all_users','create_users','edit_users',
      'delete_users','change_user_roles','submit_settlement','review_settlement_line',
      'approve_settlement','reopen_settlement','mark_tour_paid'
    ]::TEXT[]
    WHEN 'editor' THEN ARRAY[
      'view_tours','create_tours','edit_tours','export_tours','import_tours',
      'duplicate_tours','download_all_tour_images','view_tour_all_tabs','view_tour_info',
      'view_tour_destinations','view_tour_expenses','view_tour_meals','view_tour_combined',
      'view_tour_allowances','view_tour_shoppings','view_tour_images','view_tour_summary',
      'view_tour_info_all_fields','view_tour_info_tour_code','view_tour_info_companies',
      'view_tour_info_guide','view_tour_info_client','view_tour_info_pax',
      'view_tour_info_dates','view_tour_info_driver','view_tour_info_notes',
      'view_tour_line_all_fields','view_tour_line_name','view_tour_line_price',
      'view_tour_line_date','view_tour_line_quantity','view_tour_line_evidence',
      'edit_tour_info','edit_tour_destinations','edit_tour_expenses','edit_tour_meals',
      'edit_tour_allowances','edit_tour_shoppings','edit_tour_summary',
      'edit_tour_info_all_fields','edit_tour_info_tour_code','edit_tour_info_companies',
      'edit_tour_info_guide','edit_tour_info_client','edit_tour_info_pax',
      'edit_tour_info_dates','edit_tour_info_driver','edit_tour_info_notes',
      'edit_tour_line_all_fields','edit_tour_line_name','edit_tour_line_price',
      'edit_tour_line_date','edit_tour_line_quantity','edit_tour_line_evidence',
      'upload_tour_images','view_statistics','view_master_data','edit_master_data',
      'view_guides','create_guides','edit_guides','import_guides','export_guides',
      'view_languages','create_languages','edit_languages','import_languages',
      'export_languages','view_companies','create_companies','edit_companies',
      'import_companies','export_companies','view_nationalities','create_nationalities',
      'edit_nationalities','import_nationalities','export_nationalities','view_provinces',
      'create_provinces','edit_provinces','import_provinces','export_provinces',
      'view_tourist_destinations','create_tourist_destinations','edit_tourist_destinations',
      'import_tourist_destinations','export_tourist_destinations','view_shopping',
      'create_shopping','edit_shopping','import_shopping','export_shopping',
      'view_expense_categories','create_expense_categories','edit_expense_categories',
      'import_expense_categories','export_expense_categories','view_detailed_expenses',
      'create_detailed_expenses','edit_detailed_expenses','import_detailed_expenses',
      'export_detailed_expenses'
    ]::TEXT[]
    WHEN 'viewer' THEN ARRAY[
      'view_tours','view_tour_all_tabs','view_tour_info','view_tour_destinations',
      'view_tour_expenses','view_tour_meals','view_tour_combined','view_tour_allowances',
      'view_tour_shoppings','view_tour_images','view_tour_summary',
      'view_tour_info_all_fields','view_tour_info_tour_code','view_tour_info_companies',
      'view_tour_info_guide','view_tour_info_client','view_tour_info_pax',
      'view_tour_info_dates','view_tour_info_driver','view_tour_info_notes',
      'view_tour_line_all_fields','view_tour_line_name','view_tour_line_price',
      'view_tour_line_date','view_tour_line_quantity','view_tour_line_evidence',
      'view_statistics','view_master_data','view_guides','view_languages','view_companies',
      'view_nationalities','view_provinces','view_tourist_destinations','view_shopping',
      'view_expense_categories','view_detailed_expenses'
    ]::TEXT[]
    ELSE ARRAY[]::TEXT[]
  END;
$function$
```

### public.default_permissions_for_settlement_role(p_settlement_role text)

Returns: `text[]`
Language: `sql`
Volatility: `immutable`
Security: invoker

```sql
CREATE OR REPLACE FUNCTION public.default_permissions_for_settlement_role(p_settlement_role text)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT CASE p_settlement_role
    WHEN 'guide' THEN ARRAY[
      'submit_settlement','view_tour_all_tabs','view_tour_info','view_tour_destinations',
      'view_tour_expenses','view_tour_meals','view_tour_combined','view_tour_allowances',
      'view_tour_shoppings','view_tour_images','view_tour_summary',
      'view_tour_info_all_fields','view_tour_info_tour_code','view_tour_info_companies',
      'view_tour_info_guide','view_tour_info_client','view_tour_info_pax',
      'view_tour_info_dates','view_tour_info_driver','view_tour_info_notes',
      'view_tour_line_all_fields','view_tour_line_name','view_tour_line_price',
      'view_tour_line_date','view_tour_line_quantity','view_tour_line_evidence',
      'edit_tour_destinations','edit_tour_expenses','edit_tour_meals',
      'edit_tour_allowances','edit_tour_shoppings','edit_tour_summary',
      'edit_tour_line_all_fields','edit_tour_info_all_fields','edit_tour_info_tour_code',
      'edit_tour_info_companies','edit_tour_info_guide','edit_tour_info_client',
      'edit_tour_info_pax','edit_tour_info_dates','edit_tour_info_driver',
      'edit_tour_info_notes','edit_tour_line_name','edit_tour_line_price',
      'edit_tour_line_date','edit_tour_line_quantity','edit_tour_line_evidence',
      'upload_tour_images'
    ]::TEXT[]
    WHEN 'accountant' THEN ARRAY[
      'review_settlement_line','approve_settlement','view_tour_info','view_tour_summary',
      'view_tour_info_all_fields','view_tour_line_all_fields'
    ]::TEXT[]
    ELSE ARRAY[]::TEXT[]
  END;
$function$
```

### public.handle_new_user()

Returns: `trigger`
Language: `plpgsql`
Volatility: `volatile`
Security: definer

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.user_profiles (id, email, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    'viewer', -- Default role for new signups
    'inactive' -- Require admin activation
  );
  RETURN NEW;
END;
$function$
```

### public.is_active_user()

Returns: `boolean`
Language: `sql`
Volatility: `stable`
Security: definer

```sql
CREATE OR REPLACE FUNCTION public.is_active_user()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND status = 'active'
  );
$function$
```

### public.is_admin()

Returns: `boolean`
Language: `sql`
Volatility: `stable`
Security: definer

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT public.is_admin_user(auth.uid());
$function$
```

### public.is_admin_user(p_user_id uuid)

Returns: `boolean`
Language: `sql`
Volatility: `stable`
Security: definer

```sql
CREATE OR REPLACE FUNCTION public.is_admin_user(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = p_user_id AND role = 'admin' AND status = 'active'
  );
$function$
```

### public.is_guide_user(p_user_id uuid)

Returns: `boolean`
Language: `sql`
Volatility: `stable`
Security: definer

```sql
CREATE OR REPLACE FUNCTION public.is_guide_user(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = p_user_id
      AND status = 'active'
      AND settlement_role = 'guide'
  );
$function$
```

### public.is_tour_owner(p_tour_id uuid)

Returns: `boolean`
Language: `sql`
Volatility: `stable`
Security: definer

```sql
CREATE OR REPLACE FUNCTION public.is_tour_owner(p_tour_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT p_tour_id IS NOT NULL
    AND (
      public.is_admin()
      OR (
        public.is_active_user()
        AND EXISTS (
          SELECT 1
          FROM public.tours t
          WHERE t.id = p_tour_id
            AND t.guide_id = auth.uid()
        )
      )
    );
$function$
```

### public.normalize_tour_guide_id()

Returns: `trigger`
Language: `plpgsql`
Volatility: `volatile`
Security: definer

```sql
CREATE OR REPLACE FUNCTION public.normalize_tour_guide_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_mapped_id UUID;
  v_mapped_name TEXT;
BEGIN
  IF NEW.guide_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Already a canonical profile id: nothing to do.
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = NEW.guide_id) THEN
    RETURN NEW;
  END IF;

  -- Try to translate a legacy guides.id into the merged profile id.
  SELECT id, full_name
    INTO v_mapped_id, v_mapped_name
  FROM public.user_profiles
  WHERE legacy_guide_id = NEW.guide_id
  LIMIT 1;

  IF v_mapped_id IS NOT NULL THEN
    IF COALESCE(NEW.guide_name_at_booking, '') = '' THEN
      NEW.guide_name_at_booking := COALESCE(v_mapped_name, '');
    END IF;
    NEW.guide_id := v_mapped_id;
    RETURN NEW;
  END IF;

  -- No matching profile: keep the historical name, drop the broken reference.
  IF COALESCE(NEW.guide_name_at_booking, '') = ''
     AND to_regclass('public.guides') IS NOT NULL THEN
    SELECT name INTO NEW.guide_name_at_booking
    FROM public.guides
    WHERE id = NEW.guide_id;
  END IF;

  NEW.guide_id := NULL;
  RETURN NEW;
END;
$function$
```

### public.refresh_tour_payment_summary(p_tour uuid)

Returns: `void`
Language: `plpgsql`
Volatility: `volatile`
Security: definer

```sql
CREATE OR REPLACE FUNCTION public.refresh_tour_payment_summary(p_tour uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_sum NUMERIC;
  v_final NUMERIC;
  v_last_at TIMESTAMPTZ;
  v_last_method TEXT;
  v_status TEXT;
BEGIN
  SELECT COALESCE(SUM(amount), 0), MAX(paid_at)
    INTO v_sum, v_last_at
    FROM public.tour_payments WHERE tour_id = p_tour;

  SELECT payment_method INTO v_last_method
    FROM public.tour_payments
    WHERE tour_id = p_tour
    ORDER BY paid_at DESC, created_at DESC
    LIMIT 1;

  SELECT final_total INTO v_final FROM public.tours WHERE id = p_tour;

  v_status := CASE
    WHEN v_sum <= 0 THEN 'pending'
    WHEN v_sum >= COALESCE(v_final, 0) AND COALESCE(v_final, 0) > 0 THEN 'paid'
    ELSE 'partial'
  END;

  UPDATE public.tours
    SET payment_status = v_status,
        payment_total = v_sum,
        last_paid_at = v_last_at,
        last_payment_method = v_last_method,
        updated_at = now()
    WHERE id = p_tour;
END;
$function$
```

### public.refresh_tour_unpaid_commission_warning(p_tour uuid)

Returns: `void`
Language: `plpgsql`
Volatility: `volatile`
Security: invoker

```sql
CREATE OR REPLACE FUNCTION public.refresh_tour_unpaid_commission_warning(p_tour uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE public.tours t
  SET has_unpaid_commission = EXISTS (
    SELECT 1
    FROM public.tour_shoppings ts
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(scp.amount), 0) AS paid
      FROM public.shopping_commission_payments scp
      WHERE scp.tour_shopping_id = ts.id
    ) payments ON true
    WHERE ts.tour_id = p_tour
      AND COALESCE(ts.net_commission, ts.price - COALESCE(ts.pit_amount, 0), ts.price, 0) > 0
      AND payments.paid < COALESCE(ts.net_commission, ts.price - COALESCE(ts.pit_amount, 0), ts.price, 0)
  )
  WHERE t.id = p_tour;
END;
$function$
```

### public.refresh_tour_unpaid_commission_warning_from_payment()

Returns: `trigger`
Language: `plpgsql`
Volatility: `volatile`
Security: invoker

```sql
CREATE OR REPLACE FUNCTION public.refresh_tour_unpaid_commission_warning_from_payment()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  old_tour UUID;
  new_tour UUID;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT tour_id INTO old_tour
    FROM public.tour_shoppings
    WHERE id = OLD.tour_shopping_id;

    IF old_tour IS NOT NULL THEN
      PERFORM public.refresh_tour_unpaid_commission_warning(old_tour);
    END IF;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT tour_id INTO new_tour
    FROM public.tour_shoppings
    WHERE id = NEW.tour_shopping_id;

    IF new_tour IS NOT NULL AND new_tour IS DISTINCT FROM old_tour THEN
      PERFORM public.refresh_tour_unpaid_commission_warning(new_tour);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$
```

### public.refresh_tour_unpaid_commission_warning_from_shopping()

Returns: `trigger`
Language: `plpgsql`
Volatility: `volatile`
Security: invoker

```sql
CREATE OR REPLACE FUNCTION public.refresh_tour_unpaid_commission_warning_from_shopping()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.tour_id IS NOT NULL THEN
      PERFORM public.refresh_tour_unpaid_commission_warning(NEW.tour_id);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.tour_id IS NOT NULL THEN
      PERFORM public.refresh_tour_unpaid_commission_warning(OLD.tour_id);
    END IF;
    IF NEW.tour_id IS NOT NULL AND NEW.tour_id IS DISTINCT FROM OLD.tour_id THEN
      PERFORM public.refresh_tour_unpaid_commission_warning(NEW.tour_id);
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.tour_id IS NOT NULL THEN
    PERFORM public.refresh_tour_unpaid_commission_warning(OLD.tour_id);
  END IF;

  RETURN OLD;
END;
$function$
```

### public.set_tour_created_by()

Returns: `trigger`
Language: `plpgsql`
Volatility: `volatile`
Security: definer

```sql
CREATE OR REPLACE FUNCTION public.set_tour_created_by()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.created_by_user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$function$
```

### public.set_tour_creator()

Returns: `trigger`
Language: `plpgsql`
Volatility: `volatile`
Security: definer

```sql
CREATE OR REPLACE FUNCTION public.set_tour_creator()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- If created_by_user_id is not set, set it to current user
  IF NEW.created_by_user_id IS NULL THEN
    NEW.created_by_user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$function$
```

### public.storage_path_tour_id(p_name text)

Returns: `uuid`
Language: `plpgsql`
Volatility: `immutable`
Security: invoker

```sql
CREATE OR REPLACE FUNCTION public.storage_path_tour_id(p_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  first_segment text;
BEGIN
  first_segment := split_part(COALESCE(p_name, ''), '/', 1);
  IF first_segment = '' THEN
    RETURN NULL;
  END IF;

  RETURN first_segment::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$function$
```

### public.tour_payments_after_change()

Returns: `trigger`
Language: `plpgsql`
Volatility: `volatile`
Security: definer

```sql
CREATE OR REPLACE FUNCTION public.tour_payments_after_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.refresh_tour_payment_summary(OLD.tour_id);
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE' AND OLD.tour_id <> NEW.tour_id) THEN
    PERFORM public.refresh_tour_payment_summary(OLD.tour_id);
    PERFORM public.refresh_tour_payment_summary(NEW.tour_id);
    RETURN NEW;
  ELSE
    PERFORM public.refresh_tour_payment_summary(NEW.tour_id);
    RETURN NEW;
  END IF;
END;
$function$
```

### public.tour_payments_validate_settlement()

Returns: `trigger`
Language: `plpgsql`
Volatility: `volatile`
Security: definer

```sql
CREATE OR REPLACE FUNCTION public.tour_payments_validate_settlement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_status TEXT;
BEGIN
  SELECT settlement_status INTO v_status FROM public.tours WHERE id = NEW.tour_id;
  IF v_status NOT IN ('approved', 'closed') THEN
    RAISE EXCEPTION 'Cannot record payment until settlement is approved (current status: %)', v_status;
  END IF;
  RETURN NEW;
END;
$function$
```

### public.tours_refresh_payment_on_final_change()

Returns: `trigger`
Language: `plpgsql`
Volatility: `volatile`
Security: definer

```sql
CREATE OR REPLACE FUNCTION public.tours_refresh_payment_on_final_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF (NEW.final_total IS DISTINCT FROM OLD.final_total) THEN
    PERFORM public.refresh_tour_payment_summary(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$
```

### public.tours_reset_payments_on_unlock()

Returns: `trigger`
Language: `plpgsql`
Volatility: `volatile`
Security: definer

```sql
CREATE OR REPLACE FUNCTION public.tours_reset_payments_on_unlock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF (OLD.settlement_status IN ('approved', 'closed'))
     AND (NEW.settlement_status NOT IN ('approved', 'closed')) THEN
    DELETE FROM public.tour_payments WHERE tour_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$
```

### public.update_own_profile(p_full_name text, p_phone text, p_note text, p_language_ids uuid[])

Returns: `user_profiles`
Language: `plpgsql`
Volatility: `volatile`
Security: definer

```sql
CREATE OR REPLACE FUNCTION public.update_own_profile(p_full_name text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_note text DEFAULT NULL::text, p_language_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS user_profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_profile public.user_profiles;
  v_language_ids UUID[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.user_profiles
  SET
    full_name = CASE
      WHEN p_full_name IS NULL THEN full_name
      ELSE NULLIF(BTRIM(p_full_name), '')
    END,
    phone = CASE
      WHEN p_phone IS NULL THEN phone
      ELSE COALESCE(NULLIF(BTRIM(p_phone), ''), '')
    END,
    note = CASE
      WHEN p_note IS NULL THEN note
      ELSE COALESCE(NULLIF(BTRIM(p_note), ''), '')
    END,
    updated_at = NOW()
  WHERE id = auth.uid()
    AND status = 'active'
  RETURNING * INTO v_profile;

  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'Profile not found or inactive';
  END IF;

  IF p_language_ids IS NOT NULL AND v_profile.settlement_role = 'guide' THEN
    SELECT ARRAY(
      SELECT DISTINCT lang.id
      FROM unnest(p_language_ids) AS requested(language_id)
      JOIN public.languages AS lang ON lang.id = requested.language_id
      WHERE lang.status = 'active'
      ORDER BY lang.id
    )
    INTO v_language_ids;

    DELETE FROM public.user_languages
    WHERE user_id = v_profile.id;

    INSERT INTO public.user_languages (user_id, language_id, proficiency)
    SELECT v_profile.id, selected.language_id, 'working'
    FROM unnest(COALESCE(v_language_ids, ARRAY[]::UUID[])) AS selected(language_id)
    ON CONFLICT (user_id, language_id) DO UPDATE SET
      proficiency = EXCLUDED.proficiency,
      updated_at = NOW();
  END IF;

  RETURN v_profile;
END;
$function$
```

### public.update_updated_at_column()

Returns: `trigger`
Language: `plpgsql`
Volatility: `volatile`
Security: invoker

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
```

### public.validate_shopping_commission_payment_total()

Returns: `trigger`
Language: `plpgsql`
Volatility: `volatile`
Security: invoker

```sql
CREATE OR REPLACE FUNCTION public.validate_shopping_commission_payment_total()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  expected_net NUMERIC;
  paid_total NUMERIC;
BEGIN
  SELECT COALESCE(ts.net_commission, ts.price - COALESCE(ts.pit_amount, 0), ts.price, 0)
    INTO expected_net
  FROM public.tour_shoppings ts
  WHERE ts.id = NEW.tour_shopping_id;

  IF expected_net IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy dòng mua sắm trên tour để ghi nhận hoa hồng.'
      USING ERRCODE = '23503';
  END IF;

  SELECT COALESCE(SUM(scp.amount), 0)
    INTO paid_total
  FROM public.shopping_commission_payments scp
  WHERE scp.tour_shopping_id = NEW.tour_shopping_id
    AND scp.id IS DISTINCT FROM NEW.id;

  IF paid_total + NEW.amount > expected_net THEN
    RAISE EXCEPTION 'Tổng số tiền đã nhận không được vượt quá hoa hồng thực nhận.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$
```

### public.validate_tour_shopping_commission_not_below_paid()

Returns: `trigger`
Language: `plpgsql`
Volatility: `volatile`
Security: invoker

```sql
CREATE OR REPLACE FUNCTION public.validate_tour_shopping_commission_not_below_paid()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  expected_net NUMERIC;
  paid_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(scp.amount), 0)
    INTO paid_total
  FROM public.shopping_commission_payments scp
  WHERE scp.tour_shopping_id = NEW.id;

  expected_net := COALESCE(NEW.net_commission, NEW.price - COALESCE(NEW.pit_amount, 0), NEW.price, 0);

  IF paid_total > expected_net THEN
    RAISE EXCEPTION 'Tổng số tiền đã nhận không được vượt quá hoa hồng thực nhận.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$
```
