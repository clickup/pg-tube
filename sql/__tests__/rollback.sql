\ir ../pg-tube-down.sql

SET search_path TO test_pg_tube;

DROP FUNCTION expect(text, text, text);

SET search_path TO public;
DROP SCHEMA test_pg_tube;

ROLLBACK;
