-- Create a separate database for tests so they don't wipe dev data
SELECT 'CREATE DATABASE thermal_test OWNER thermal'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'thermal_test')\gexec
