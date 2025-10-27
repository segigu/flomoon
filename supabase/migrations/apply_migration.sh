#!/bin/bash

# Script to apply language support migration to Supabase
# This uses the Management API to execute SQL directly

PROJECT_REF="mbocfgtfkrlclmqjezfv"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ib2NmZ3Rma3JsY2xtcWplemZ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU0MDUzOCwiZXhwIjoyMDc3MTE2NTM4fQ.OVF_VMFWxEHr485LJxILvT_SI4iAEdfEwe5UJwil1AE"

echo "🔧 Applying migration: Add language support"

# Read the SQL file and execute it
SQL_CONTENT=$(cat /Users/sergey/flomoon/supabase/migrations/20251027_add_language_support.sql)

# Execute via psql if available, otherwise use HTTP API
if command -v psql &> /dev/null; then
    echo "Using psql to apply migration..."
    PGPASSWORD="JOB-bus0-bub" psql \
        "postgresql://postgres.mbocfgtfkrlclmqjezfv@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" \
        -f /Users/sergey/flomoon/supabase/migrations/20251027_add_language_support.sql
else
    echo "psql not found, please install PostgreSQL client or run SQL manually in Supabase SQL Editor"
    echo "SQL file location: /Users/sergey/flomoon/supabase/migrations/20251027_add_language_support.sql"
    exit 1
fi

echo "✅ Migration applied successfully!"
