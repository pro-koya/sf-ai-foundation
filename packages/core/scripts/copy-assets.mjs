import { copyFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

mkdirSync("dist/schema", { recursive: true });
copyFileSync("src/schema/graph.schema.json", "dist/schema/graph.schema.json");

mkdirSync("dist/change-summary", { recursive: true });
copyFileSync("src/change-summary/schema.json", "dist/change-summary/schema.json");

mkdirSync("dist/release", { recursive: true });
copyFileSync("src/release/schema.json", "dist/release/schema.json");

mkdirSync("dist/render/templates", { recursive: true });
const renderTemplates = [
  "system-index.eta",
  "system-overview.eta",
  "object.eta",
  "flow.eta",
  "apex-class.eta",
  "apex-trigger.eta",
  "permission-set.eta",
  "profile.eta",
  "validation-rule.eta",
  "record-type.eta",
  "approval-process.eta",
  "sharing-rule.eta",
  "layout.eta",
  "custom-metadata-record.eta",
  "named-credential.eta",
  "remote-site-setting.eta",
  "lwc.eta",
  "aura-bundle.eta",
  "flexi-page.eta",
  "visualforce-page.eta",
  "visualforce-component.eta",
  "custom-application.eta",
  "executive-summary.eta",
  "executive-risks.eta",
];
for (const t of renderTemplates) {
  copyFileSync(`src/render/templates/${t}`, `dist/render/templates/${t}`);
}

// scaffold/ を dist/scaffold/ にコピー (yohaku init で利用するため)
const scaffoldSrc = resolve("..", "..", "scaffold");
const scaffoldDest = resolve("dist", "scaffold");
copyDirRecursive(scaffoldSrc, scaffoldDest);

console.log("[core] copied schema, eta templates, and scaffold/ to dist/");

function copyDirRecursive(src, dest) {
  const stack = [src];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;
    const entries = readdirSync(current);
    for (const entry of entries) {
      const full = join(current, entry);
      const s = statSync(full);
      if (s.isDirectory()) {
        stack.push(full);
        continue;
      }
      const rel = relative(src, full);
      const target = join(dest, rel);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(full, target);
    }
  }
}
