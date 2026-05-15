#!/usr/bin/env node
// 合成 Salesforce メタデータを生成して `yohaku graph build` の所要時間を計測する。
// 使い方:
//   node scripts/bench-graph-build.mjs --objects 100 --fields-per-object 20 --apex 50 --flows 30
//   node scripts/bench-graph-build.mjs --preset small|medium|large

import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PRESETS = {
  small: { objects: 20, fieldsPerObject: 10, apex: 10, flows: 5 },
  medium: { objects: 100, fieldsPerObject: 20, apex: 50, flows: 30 },
  large: { objects: 500, fieldsPerObject: 30, apex: 200, flows: 100 },
};

function parseArgs(argv) {
  const flags = new Map();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        flags.set(key, next);
        i++;
      } else {
        flags.set(key, "true");
      }
    }
  }
  return flags;
}

function objectXml(name) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
    <label>${name}</label>
    <pluralLabel>${name}s</pluralLabel>
    <description>bench: ${name}</description>
    <sharingModel>Private</sharingModel>
    <nameField><label>${name} Name</label><type>Text</type></nameField>
    <deploymentStatus>Deployed</deploymentStatus>
</CustomObject>`;
}

function fieldXml(name) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>${name}</fullName>
    <label>${name}</label>
    <type>Text</type>
    <length>80</length>
</CustomField>`;
}

function apexClsMeta() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>62.0</apiVersion>
    <status>Active</status>
</ApexClass>`;
}

function apexClsBody(name) {
  return `public class ${name} {
    public static String hello() { return '${name}'; }
}`;
}

function flowXml(name) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Flow xmlns="http://soap.sforce.com/2006/04/metadata">
    <label>${name}</label>
    <processType>AutoLaunchedFlow</processType>
    <status>Active</status>
    <apiVersion>62.0</apiVersion>
    <interviewLabel>${name}</interviewLabel>
</Flow>`;
}

function generateFixture(root, spec) {
  const base = join(root, "force-app", "main", "default");
  mkdirSync(join(base, "objects"), { recursive: true });
  mkdirSync(join(base, "classes"), { recursive: true });
  mkdirSync(join(base, "flows"), { recursive: true });

  // sfdx-project.json (簡易)
  writeFileSync(
    join(root, "sfdx-project.json"),
    JSON.stringify(
      {
        packageDirectories: [{ path: "force-app", default: true }],
        sourceApiVersion: "62.0",
      },
      null,
      2,
    ),
  );

  for (let i = 0; i < spec.objects; i++) {
    const oname = `BenchObj${i}__c`;
    const odir = join(base, "objects", oname);
    const fieldsDir = join(odir, "fields");
    mkdirSync(fieldsDir, { recursive: true });
    writeFileSync(join(odir, `${oname}.object-meta.xml`), objectXml(oname));
    for (let f = 0; f < spec.fieldsPerObject; f++) {
      const fname = `Field${f}__c`;
      writeFileSync(join(fieldsDir, `${fname}.field-meta.xml`), fieldXml(fname));
    }
  }
  for (let a = 0; a < spec.apex; a++) {
    const cname = `BenchClass${a}`;
    writeFileSync(join(base, "classes", `${cname}.cls`), apexClsBody(cname));
    writeFileSync(join(base, "classes", `${cname}.cls-meta.xml`), apexClsMeta());
  }
  for (let f = 0; f < spec.flows; f++) {
    const fname = `BenchFlow${f}`;
    writeFileSync(join(base, "flows", `${fname}.flow-meta.xml`), flowXml(fname));
  }
}

function bench(root, mode, cliPath) {
  const start = process.hrtime.bigint();
  const r = spawnSync(
    process.execPath,
    [
      cliPath,
      "graph",
      "build",
      ...(mode === "incremental" ? ["--incremental"] : []),
      "--quiet",
      "--no-timing-log",
      "--root",
      root,
    ],
    { encoding: "utf8" },
  );
  const ms = Number(process.hrtime.bigint() - start) / 1_000_000;
  if (r.status !== 0) {
    process.stderr.write(r.stderr ?? "");
    throw new Error(`graph build (${mode}) failed: exit ${r.status}`);
  }
  return ms;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const preset = flags.get("preset");
  const spec =
    preset && PRESETS[preset]
      ? PRESETS[preset]
      : {
          objects: Number(flags.get("objects") ?? 100),
          fieldsPerObject: Number(flags.get("fields-per-object") ?? 20),
          apex: Number(flags.get("apex") ?? 50),
          flows: Number(flags.get("flows") ?? 30),
        };

  const here = fileURLToPath(import.meta.url);
  const cliPath = resolve(here, "..", "..", "dist", "cli.js");

  const root = join(tmpdir(), `yohaku-bench-${Date.now()}`);
  mkdirSync(root, { recursive: true });
  try {
    process.stdout.write(
      `[bench] generating fixture: objects=${spec.objects} fields/obj=${spec.fieldsPerObject} apex=${spec.apex} flows=${spec.flows}\n`,
    );
    const gen0 = process.hrtime.bigint();
    generateFixture(root, spec);
    const genMs = Number(process.hrtime.bigint() - gen0) / 1_000_000;
    process.stdout.write(`[bench] fixture ready in ${genMs.toFixed(0)}ms\n`);

    process.stdout.write("[bench] running full build...\n");
    const fullMs = bench(root, "full", cliPath);
    process.stdout.write(`[bench] full       : ${fullMs.toFixed(0)} ms\n`);

    process.stdout.write("[bench] running incremental (no-op) build...\n");
    const inc1Ms = bench(root, "incremental", cliPath);
    process.stdout.write(`[bench] incr (noop): ${inc1Ms.toFixed(0)} ms\n`);

    // 1 ファイル変更を模した incremental
    const touched = join(root, "force-app", "main", "default", "classes", "BenchClass0.cls");
    writeFileSync(touched, `${apexClsBody("BenchClass0")}\n// edit\n`);
    const inc2Ms = bench(root, "incremental", cliPath);
    process.stdout.write(`[bench] incr (1ed) : ${inc2Ms.toFixed(0)} ms\n`);

    const summary = JSON.stringify(
      {
        spec,
        fixtureGenMs: Math.round(genMs),
        fullMs: Math.round(fullMs),
        incrementalNoopMs: Math.round(inc1Ms),
        incrementalOneEditMs: Math.round(inc2Ms),
      },
      null,
      2,
    );
    process.stdout.write(`${summary}\n`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
