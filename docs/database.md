# Database Management

## Migrations

> [!NOTE]
> We use the `atlas` CLI to manage migrations. See [https://atlasgo.io/getting-started#installation](https://atlasgo.io/getting-started#installation) for installation instructions and other documentation.

### Creating a new Migration

```sh
atlas migrate new some-migration-name
```

This will create a new migration file in the `migrations` directory.

### Listing Migrations

To list the migrations that the `atlas` CLI knows about, run:

```sh
../svelte-llmctx 🌱 chore/postgres [!?] ➜ atlas migrate ls  
0_create-migrations-table.sql
1_initial.sql
2_add-cache-table.sql
```

### Applying Migrations

To run migrations, use the `atlas` CLI. For example:

```sh
atlas migrate apply --env local
```

This will apply the migrations in the `migrations` directory to the database. You can also apply a specific migration by name:

```sh
atlas migrate apply --env local 2_add-cache-table
```

Example output:

```sh
../svelte-llmctx 🌱 chore/postgres [!?] ➜ atlas migrate apply --env local
Migrating to version 2 (3 migrations in total):

  -- migrating version 0
    -> CREATE TABLE IF NOT EXISTS migrations (
         id integer PRIMARY KEY,
         name varchar(100) UNIQUE NOT NULL,
         hash varchar(40) NOT NULL, -- sha1 hex encoded hash of the file name and contents, to ensure it hasn't been altered since applying the migration
         executed_at timestamp DEFAULT current_timestamp
       );
  -- ok (10.392333ms)

  -- migrating version 1
    -> CREATE TABLE IF NOT EXISTS presets (
         id SERIAL PRIMARY KEY,
         preset_name VARCHAR(100) UNIQUE NOT NULL,
         content TEXT NOT NULL,
         size_kb INTEGER NOT NULL,
         document_count INTEGER DEFAULT 0,
         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       );
    -> CREATE INDEX IF NOT EXISTS idx_presets_preset_name ON presets(preset_name);
    -> CREATE INDEX IF NOT EXISTS idx_presets_updated_at ON presets(updated_at);
  ...
  ...
  ...
  -- ok (61.440166ms)

  -- migrating version 2
    -> CREATE TABLE IF NOT EXISTS cache (
         id SERIAL PRIMARY KEY,
         cache_key VARCHAR(255) UNIQUE NOT NULL, -- Format: owner/repo
         data BYTEA NOT NULL, -- Binary data for tarball
         size_bytes INTEGER NOT NULL,
         expires_at TIMESTAMP NOT NULL,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       );
    -> CREATE INDEX IF NOT EXISTS idx_cache_key ON cache(cache_key);
    -> CREATE INDEX IF NOT EXISTS idx_cache_expires_at ON cache(expires_at);
  -- ok (12.534084ms)

  -------------------------
  -- 121.880125ms
  -- 3 migrations
  -- 25 sql statements
```

You can also use the `psql` command to list the tables in the database, for example:

```sh
./svelte-llmctx 🌱 chore/postgres [!?] 1m36s ➜ psql 'postgresql://admin:admin@127.0.0.1/db' -c '\d'              
                    List of relations
 Schema |            Name             |   Type   | Owner 
--------+-----------------------------+----------+-------
 public | cache                       | table    | admin
 public | cache_id_seq                | sequence | admin
 public | distillation_jobs           | table    | admin
 public | distillation_jobs_id_seq    | sequence | admin
 public | distillation_results        | table    | admin
 public | distillation_results_id_seq | sequence | admin
 public | distillations               | table    | admin
 public | distillations_id_seq        | sequence | admin
 public | migrations                  | table    | admin
 public | presets                     | table    | admin
 public | presets_id_seq              | sequence | admin
(11 rows)
```
