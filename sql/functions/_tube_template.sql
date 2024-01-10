CREATE OR REPLACE FUNCTION _tube_template(
  template text,
  VARIADIC args text[]
) RETURNS text
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
  k text;
  v text;
  prefix text;
BEGIN
  prefix := substring(template from E'^\n[ \t]+');
  IF prefix IS NOT NULL THEN
    template := regexp_replace(template, prefix, E'\n', 'mg');
  END IF;
  FOR i IN 1 .. cardinality(args) BY 2 LOOP
    k := args[i];
    v := args[i + 1];
    IF v IS NULL THEN
      RAISE EXCEPTION 'Argument % is NULL: "%", args: %', k, template, args;
    END IF;
    template := replace(template, '{I:' || k || '}', right(left(quote_ident(v || ''''), -2), -1));
    template := replace(template, '{SQL:' || k || '}', v);
    template := replace(template, '{' || k || '}', quote_literal(v));
  END LOOP;
  RETURN regexp_replace(template, E'^(([ \t]*)\n)+|[ \t\n]+$', '', 'sg');
END;
$$;

COMMENT ON FUNCTION _tube_template(text, text[])
  IS 'Replaces {I:name} with its identifier-quoted value (but without quotes) '
     'for each pair of the arguments. Replaces {name} with its literal-quoted '
     'value. Replaces {SQL:name} with its unmodified value.';
