import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as dateUtils from "../src/lib/dateUtils";
import { BoundedCache } from "../src/lib/cache/BoundedCache";

type Data = Record<string, unknown>;
type Row = Data & { id: string; parentProfileId: string; classId: string; name: string };
type CacheExports = {
  getCachedSlimStudents?: (where: Data, pagination: Data) => Promise<Data[]>;
  clearServerStudentsCache: () => void;
};

function fixture() {
  const base = {
    admissionNumber: "ADM-1", rollNumber: "12", gender: "F", status: "ACTIVE", isRte: false,
    isMarksheetClaimed: false, photoUrl: "photo", concessionId: "concession",
    dob: new Date("2018-03-04T00:00:00Z"), admissionDate: new Date("2026-04-01T00:00:00Z"),
    aadhaar: "123456789012", category: "OBC", religion: "Hinduism", fatherName: "Father", fatherMobile: "9000000000",
    motherName: "Mother", motherMobile: "9000000001", class: { name: "4", section: "A" },
    parentProfile: { familyCode: "FAM-1", address: "Address", user: { name: "Parent", phone: "9000000002" } },
    concession: { id: "concession", name: "Staff", percentage: 25, feeHeadName: "Tuition" },
  };
  const rows: Row[] = Array.from({ length: 2601 }, (_, i) => ({ ...base, id: `s${i}`, parentProfileId: i < 2 ? "family-a" : "family-b", classId: i < 2 ? "class-a" : "class-b", name: `Student ${String(i).padStart(4, "0")}` }));
  const stored = new Map<string, { tags: string[]; value: unknown }>();
  const calls: Data[] = [];
  const invalidations: unknown[][] = [];
  function project(row: Data, select: Data): Data {
    return Object.fromEntries(Object.entries(select).map(([key, shape]) => [key,
      shape === true ? row[key] : row[key] == null ? row[key] : project(row[key] as Data, (shape as { select: Data }).select),
    ]));
  }
  const database = { student: { findMany: async (query: Data) => {
    calls.push(query);
    const where = query.where as Data;
    const filtered = rows.filter(row => Object.entries(where).every(([key, value]) => {
      if (typeof value === "object" && value && "in" in value) return (value.in as string[]).includes(String(row[key]));
      return row[key] === value;
    })).sort((a, b) => a.name.localeCompare(b.name));
    const start = Number(query.skip || 0);
    return filtered.slice(start, query.take === undefined ? undefined : start + Number(query.take)).map(row => project(row, query.select as Data));
  } } };
  const nextCache = {
    unstable_cache: (load: (...args: Data[]) => Promise<unknown>, keys: string[], options: { tags: string[]; revalidate: number }) => {
      assert.ok(options.revalidate > 0 && options.revalidate <= 300);
      assert.ok(options.tags.length > 0);
      return async (...args: Data[]) => {
        const key = JSON.stringify([keys, args]);
        if (!stored.has(key)) stored.set(key, { tags: options.tags, value: await load(...args) });
        return stored.get(key)!.value;
      };
    },
    revalidateTag: (...args: unknown[]) => {
      invalidations.push(args);
      for (const [key, item] of stored) if (item.tags.includes(String(args[0]))) stored.delete(key);
    },
  };
  function instance(): CacheExports {
    const exports = {} as CacheExports;
    const code = ts.transpileModule(fs.readFileSync("src/lib/cache/studentsCache.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    vm.runInNewContext(code, { exports, console, require: (name: string) => {
      if (name === "next/cache") return nextCache;
      if (name === "@/lib/db") return { default: database };
      if (name === "@/lib/dateUtils") return dateUtils;
      if (name === "./BoundedCache") return { BoundedCache };
      throw new Error(`Unexpected import: ${name}`);
    } });
    return exports;
  }
  return { instance, rows, calls, invalidations };
}

test("durable slim roster is complete and shared by cold instances without dropping output fields", async () => {
  const f = fixture();
  const a = f.instance(); const b = f.instance();
  assert.equal(typeof a.getCachedSlimStudents, "function", "slim query must use durable caching");
  const first = await a.getCachedSlimStudents!({}, {});
  const second = await b.getCachedSlimStudents!({}, {});
  assert.equal(first.length, 2601, "the legacy unpaginated contract includes the entire roster");
  assert.equal(second.length, 2601);
  assert.equal(f.calls.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(first[0])), {
    id: "s0", name: "Student 0000", admissionNo: "ADM-1", rollNo: "12", gender: "F", status: "ACTIVE", isRte: false,
    isMarksheetClaimed: false, photoUrl: "photo", concessionId: "concession", dob: "2018-03-04", dobDisplay: "04-Mar-2018",
    aadhaar: "123456789012", category: "OBC", religion: "Hinduism", admissionDate: "2026-04-01", admissionDateDisplay: "01-Apr-2026",
    fatherName: "Father", fatherMobile: "9000000000", motherName: "Mother", motherMobile: "9000000001", class: "4", section: "A",
    parentName: "Parent", parentPhone: "9000000002", familyCode: "FAM-1", address: "Address",
    concession: { id: "concession", name: "Staff", percentage: 25, feeHeadName: "Tuition" },
  });
});

test("family and teacher scopes plus offsets have distinct durable cache entries", async () => {
  const f = fixture(); const cache = f.instance();
  assert.equal(typeof cache.getCachedSlimStudents, "function");
  assert.deepEqual((await cache.getCachedSlimStudents!({ parentProfileId: "family-a" }, {})).map(row => row.id), ["s0", "s1"]);
  assert.deepEqual((await cache.getCachedSlimStudents!({ classId: { in: ["class-b"] } }, { take: 1, skip: 1 })).map(row => row.id), ["s3"]);
  assert.deepEqual((await cache.getCachedSlimStudents!({ classId: { in: [] } }, {})).map(row => row.id), []);
  assert.deepEqual((await cache.getCachedSlimStudents!({ parentProfileId: "family-a" }, { take: 1, skip: 1 })).map(row => row.id), ["s1"]);
  assert.equal(f.calls.length, 4);
});

test("mutation invalidation immediately expires another instance's cached roster and empty result", async () => {
  const f = fixture(); const a = f.instance(); const b = f.instance();
  assert.equal(typeof a.getCachedSlimStudents, "function");
  await a.getCachedSlimStudents!({ parentProfileId: "family-a" }, {});
  await b.getCachedSlimStudents!({ parentProfileId: "new-family" }, {});
  f.rows[0].name = "Changed name"; f.rows[0].parentProfileId = "new-family";
  a.clearServerStudentsCache();
  assert.deepEqual(JSON.parse(JSON.stringify(f.invalidations.map(args => args[1]))), [{ expire: 0 }]);
  assert.deepEqual((await b.getCachedSlimStudents!({ parentProfileId: "family-a" }, {})).map(row => row.id), ["s1"]);
  assert.equal((await b.getCachedSlimStudents!({ parentProfileId: "new-family" }, {}))[0].name, "Changed name");
  assert.equal(f.calls.length, 4);
});
