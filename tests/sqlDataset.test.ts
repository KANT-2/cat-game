import { describe, expect, it } from "vitest";
import { parseSqlDataset } from "../src/services/sqlDataset";

describe("SQL dataset preview", () => {
  it("extracts table schemas, sample rows and generated ranges", () => {
    const setup = `
      CREATE TABLE students (id int, name text, active boolean);
      INSERT INTO students VALUES (1,'Miso',true),(2,'Nabi',false);
      CREATE TABLE nums (n int);
      INSERT INTO nums SELECT generate_series(1,10);
    `;

    expect(parseSqlDataset(setup)).toEqual([
      {
        name: "students",
        columns: ["id", "name", "active"],
        rows: [
          ["1", "Miso", "true"],
          ["2", "Nabi", "false"],
        ],
        rowSummary: undefined,
      },
      { name: "nums", columns: ["n"], rows: [], rowSummary: "1 … 10" },
    ]);
  });

  it("keeps commas and escaped quotes inside SQL strings", () => {
    const setup = "CREATE TABLE notes (id int, body text); INSERT INTO notes VALUES (1,'hi, cat'),(2,'it''s ok');";

    expect(parseSqlDataset(setup)[0]?.rows).toEqual([
      ["1", "hi, cat"],
      ["2", "it's ok"],
    ]);
  });
});
