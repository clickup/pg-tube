import addRowNumberOver from "../addRowNumberOver";

it("should not touch queries with row_number", () => {
  expect(addRowNumberOver("SELECT id, row_number() OVER () FROM some")).toBe(
    "SELECT id, row_number() OVER () FROM some",
  );
});

it("should process queries with order by and limit", () => {
  expect(
    addRowNumberOver(
      "SELECT id FROM some WHERE id>0 ORDER BY field1, field2 LIMIT 10",
    ),
  ).toBe(
    "SELECT id, row_number() OVER (ORDER BY field1, field2) FROM some WHERE id>0 ORDER BY field1, field2 LIMIT 10",
  );
});

it("should process queries with order", () => {
  expect(
    addRowNumberOver("SELECT id FROM some WHERE id>0 ORDER BY field1"),
  ).toBe(
    "SELECT id, row_number() OVER (ORDER BY field1) FROM some WHERE id>0 ORDER BY field1",
  );
});

it("should process queries without order", () => {
  expect(addRowNumberOver("SELECT id FROM some WHERE id>0")).toBe(
    "SELECT id, row_number() OVER () FROM some WHERE id>0",
  );
  expect(addRowNumberOver("SELECT id FROM some\nWHERE id>0")).toBe(
    "SELECT id, row_number() OVER () FROM some\nWHERE id>0",
  );
  expect(addRowNumberOver("SELECT id\nFROM\nsome\nWHERE id>0")).toBe(
    "SELECT id, row_number() OVER ()\nFROM\nsome\nWHERE id>0",
  );
});

it("should process queries with sub-selects", () => {
  expect(
    addRowNumberOver(
      "SELECT id FROM (SELECT id FROM other ORDER BY f LIMIT 10) t WHERE id>0 ORDER BY field",
    ),
  ).toBe(
    "SELECT id, row_number() OVER (ORDER BY field) FROM (SELECT id FROM other ORDER BY f LIMIT 10) t WHERE id>0 ORDER BY field",
  );
});

it("should process or reject queries with WITH clause", () => {
  expect(() =>
    addRowNumberOver(
      "WITH tbl AS (SELECT id FROM tbl) SELECT id FROM tbl ORDER BY field",
    ),
  ).toThrow(Error);

  expect(
    addRowNumberOver(
      "WITH tbl AS (SELECT id FROM tbl) SELECT id, row_number() OVER () FROM tbl",
    ),
  ).toEqual(
    "WITH tbl AS (SELECT id FROM tbl) SELECT id, row_number() OVER () FROM tbl",
  );
});
