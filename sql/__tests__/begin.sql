BEGIN;

CREATE SCHEMA test_pg_tube;
SET search_path TO test_pg_tube;
SET client_min_messages TO NOTICE;
\set ON_ERROR_STOP on

\ir ../pg-tube-up.sql

CREATE FUNCTION expect(sql text, exp text, msg text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  got text;
BEGIN
  EXECUTE sql INTO got;
  got := trim(E' \t\n' from regexp_replace(got, E'^[ \t]+', '', 'mg'));
  exp := trim(E' \t\n' from regexp_replace(exp, E'^[ \t]+', '', 'mg'));
  IF got IS DISTINCT FROM exp THEN
    RAISE EXCEPTION 'Expectation failed (%): expected %, got %', msg, exp, got;
  END IF;
END;
$$;
