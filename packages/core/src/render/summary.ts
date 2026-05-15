// Quick Summary 生成 (Phase 9-A2)
// 各エンティティの最上部に出す「パッと読める」決定的要約。
//
// 設計方針:
//   - 完全に決定的: 入力 (KG entity) が同じなら出力も同じ
//   - LLM 不要: ファクトを文字列に整形するだけ
//   - 1〜3 行に収める: 長文化したら読まれない
//   - 太字 (`**`) と inline code (`` ` ``) を活用してスキャンしやすく

import type {
  ApexClass,
  ApexTrigger,
  ApprovalProcess,
  AuraBundle,
  CustomApplication,
  CustomMetadataRecord,
  FlexiPage,
  Flow,
  KnowledgeGraph,
  Layout,
  LightningWebComponent,
  NamedCredential,
  PermissionSet,
  Profile,
  RecordType,
  RemoteSiteSetting,
  SharingRule,
  ValidationRule,
  VisualforceComponent,
  VisualforcePage,
} from "../types/graph.js";

export function summaryForApex(cls: ApexClass, graph: KnowledgeGraph): string {
  const body = cls.body;
  const methodCount = body?.methods.length ?? 0;
  const soqlCount = body?.soqlQueries.length ?? 0;
  const dmlCount = body?.dmlOperations.length ?? 0;
  const refCount = body?.classReferences.length ?? 0;

  const headerParts: string[] = [];
  headerParts.push(`**${methodCount} メソッド**`);
  if (soqlCount > 0) headerParts.push(`**SOQL ${soqlCount} 件**`);
  if (dmlCount > 0) headerParts.push(`**DML ${dmlCount} 件**`);
  const headline = headerParts.join(" / ");

  const traits: string[] = [];
  traits.push(cls.isTest ? "テストクラス" : "通常クラス");
  if (body?.hasCallout) traits.push("HTTP コールアウト有");
  if (body?.hasTryCatch) traits.push("try/catch 有");
  if (cls.isInterface === true) traits.push("インターフェース");
  if (cls.isAbstract === true) traits.push("抽象クラス");

  const lines: string[] = [];
  lines.push(`${headline} を含む ${traits.join(" / ")}。`);

  // 最も "重い" メソッドを 1 つ紹介 (control flow node 数が最大のもの)
  const biggest = pickBiggestMethod(cls);
  if (biggest !== undefined) {
    const profile = profileMethod(biggest);
    lines.push(`主要メソッド: \`${biggest.methodName}\` (${profile})。`);
  }

  // 呼び出し先トップ 3
  if (refCount > 0 && body !== undefined) {
    const topRefs = uniqueClassNames(body.classReferences).slice(0, 3);
    if (topRefs.length > 0) {
      const refLine = topRefs.map((n) => `\`${n}\``).join(", ");
      const more = refCount > topRefs.length ? " ほか" : "";
      lines.push(`主な呼び出し先: ${refLine}${more}。`);
    }
  }

  // 対応するテストクラスがあるか
  const testFqn = `${cls.fullyQualifiedName}Test`;
  if (!cls.isTest && graph.apexClasses.some((c) => c.fullyQualifiedName === testFqn && c.isTest)) {
    lines.push(`対応テスト: \`${testFqn}\`。`);
  }

  return lines.join(" ");
}

export function summaryForApexTrigger(trg: ApexTrigger, graph: KnowledgeGraph): string {
  const events = trg.events.join(" / ");
  const handlerClass = trg.body?.classReferences[0]?.className;
  const lines: string[] = [];
  lines.push(`**\`${trg.object}\` の ${events}** イベントで起動するトリガ。`);
  if (handlerClass !== undefined) {
    lines.push(`本体は \`${handlerClass}\` に委譲。`);
  }
  // 同一オブジェクトの他トリガー数
  const sameObject = graph.apexTriggers.filter((t) => t.object === trg.object);
  if (sameObject.length > 1) {
    lines.push(`⚠ \`${trg.object}\` には他に ${sameObject.length - 1} 本のトリガが存在。`);
  }
  return lines.join(" ");
}

export function summaryForFlow(flow: Flow): string {
  const elements = flow.body?.elements ?? [];
  const kindCounts = countByKind(elements);
  const triggering =
    flow.triggeringObject !== undefined ? `\`${flow.triggeringObject}\`` : flow.type;

  const headline = `**${flow.status} な ${flow.type}** (起点: ${triggering})。`;
  const summaryParts: string[] = [];
  if (kindCounts.recordCreate > 0) summaryParts.push(`レコード作成 ${kindCounts.recordCreate}`);
  if (kindCounts.recordUpdate > 0) summaryParts.push(`更新 ${kindCounts.recordUpdate}`);
  if (kindCounts.recordDelete > 0) summaryParts.push(`削除 ${kindCounts.recordDelete}`);
  if (kindCounts.recordLookup > 0) summaryParts.push(`参照 ${kindCounts.recordLookup}`);
  if (kindCounts.decision > 0) summaryParts.push(`分岐 ${kindCounts.decision}`);
  if (kindCounts.loop > 0) summaryParts.push(`ループ ${kindCounts.loop}`);
  if (kindCounts.actionCall > 0) summaryParts.push(`アクション ${kindCounts.actionCall}`);
  if (kindCounts.subflow > 0) summaryParts.push(`サブフロー ${kindCounts.subflow}`);
  if (kindCounts.screen > 0) summaryParts.push(`画面 ${kindCounts.screen}`);
  const composition = summaryParts.length > 0 ? summaryParts.join(" / ") : "要素なし";

  const lines = [headline, `構成: ${composition}。`];
  if (flow.description !== undefined && flow.description.trim() !== "") {
    lines.push(`説明: ${truncate(flow.description.trim(), 120)}`);
  }
  return lines.join(" ");
}

export function summaryForValidationRule(vr: ValidationRule): string {
  const status = vr.active ? "Active" : "Inactive";
  const formulaLen = vr.errorConditionFormula?.length ?? 0;
  const lines = [`**${status} な入力規則** (対象: \`${vr.object}\`)。`];
  if (vr.errorMessage !== undefined) {
    lines.push(`エラーメッセージ: ${truncate(vr.errorMessage, 120)}`);
  }
  if (formulaLen > 0) {
    lines.push(`条件式 ${formulaLen} 文字 (詳細セクション参照)。`);
  }
  return lines.join(" ");
}

export function summaryForRecordType(rt: RecordType): string {
  const status = rt.active ? "Active" : "Inactive";
  const head = `**${status} なレコードタイプ** (対象: \`${rt.object}\`)`;
  const lines = [`${head}${rt.label !== undefined ? ` — ${rt.label}` : ""}。`];
  if (rt.description !== undefined) {
    lines.push(`用途: ${truncate(rt.description, 120)}`);
  }
  return lines.join(" ");
}

export function summaryForPermissionSet(ps: PermissionSet): string {
  const lines: string[] = [];
  const license = ps.license !== undefined ? `License: \`${ps.license}\`` : "License 指定なし";
  lines.push(`**権限セット** (${license})。`);
  const body = ps.body;
  if (body !== undefined) {
    const objCount = body.objectPermissions.length;
    const fieldCount = body.fieldPermissions.length;
    const classCount = body.classAccesses.length;
    const userPermCount = body.userPermissions.length;
    const counts: string[] = [];
    if (objCount > 0) counts.push(`オブジェクト権限 ${objCount}`);
    if (fieldCount > 0) counts.push(`フィールド権限 ${fieldCount}`);
    if (classCount > 0) counts.push(`Apex クラス ${classCount}`);
    if (userPermCount > 0) counts.push(`ユーザ権限 ${userPermCount}`);
    if (counts.length > 0) lines.push(`内訳: ${counts.join(" / ")}。`);
    // CRUD のあるオブジェクトをトップ 3
    const crudObjects = body.objectPermissions
      .filter((p) => p.create && p.edit && p.delete)
      .map((p) => p.object)
      .slice(0, 3);
    if (crudObjects.length > 0) {
      lines.push(`完全 CRUD: ${crudObjects.map((o) => `\`${o}\``).join(", ")}。`);
    }
    // modifyAll/viewAll が付与されているオブジェクト (要レビュー観点)
    const elevated = body.objectPermissions
      .filter((p) => p.modifyAll || p.viewAll)
      .map((p) => `\`${p.object}\` (${p.modifyAll ? "ModifyAll" : "ViewAll"})`)
      .slice(0, 3);
    if (elevated.length > 0) {
      lines.push(`⚠ 強権限: ${elevated.join(", ")}。`);
    }
  }
  if (ps.description !== undefined) {
    lines.push(`概要: ${truncate(ps.description, 120)}`);
  }
  return lines.join(" ");
}

export function summaryForProfile(pf: Profile): string {
  const license =
    pf.userLicense !== undefined ? `User License: \`${pf.userLicense}\`` : "User License 不明";
  const lines: string[] = [];
  lines.push(`**Profile** (${license})。`);
  const body = pf.body;
  if (body !== undefined) {
    const counts: string[] = [];
    if (body.objectPermissions.length > 0)
      counts.push(`オブジェクト権限 ${body.objectPermissions.length}`);
    if (body.fieldPermissions.length > 0)
      counts.push(`フィールド権限 ${body.fieldPermissions.length}`);
    if (body.classAccesses.length > 0) counts.push(`Apex クラス ${body.classAccesses.length}`);
    if (body.userPermissions.length > 0) counts.push(`ユーザ権限 ${body.userPermissions.length}`);
    if (counts.length > 0) lines.push(`内訳: ${counts.join(" / ")}。`);
    const elevated = body.objectPermissions
      .filter((p) => p.modifyAll || p.viewAll)
      .map((p) => `\`${p.object}\` (${p.modifyAll ? "ModifyAll" : "ViewAll"})`)
      .slice(0, 3);
    if (elevated.length > 0) {
      lines.push(`⚠ 強権限: ${elevated.join(", ")}。`);
    }
  }
  return lines.join(" ");
}

export function summaryForApprovalProcess(ap: ApprovalProcess): string {
  const status = ap.active ? "Active" : "Inactive";
  const stepCount = ap.steps.length;
  const lines: string[] = [];
  lines.push(`**${status} な承認プロセス** (対象: \`${ap.object}\`、ステップ ${stepCount} 段階)。`);
  if (ap.entryCriteria.length > 0) {
    const items = ap.entryCriteria
      .map((c) => `\`${c.field}\` ${c.operation} \`${c.value}\``)
      .slice(0, 3)
      .join(" / ");
    lines.push(`エントリ条件: ${items}。`);
  }
  if (stepCount > 0) {
    const stepLabels = ap.steps
      .map((s, i) => `${i + 1}. ${s.label ?? s.name}`)
      .slice(0, 3)
      .join(" → ");
    const more = stepCount > 3 ? " → ..." : "";
    lines.push(`段階: ${stepLabels}${more}。`);
  }
  if (ap.description !== undefined) {
    lines.push(`概要: ${truncate(ap.description, 120)}`);
  }
  return lines.join(" ");
}

export function summaryForSharingRule(sr: SharingRule): string {
  const kindLabel = sr.kind === "criteriaBased" ? "条件ベース" : "オーナーベース";
  const sharedTo =
    sr.sharedTo.target !== undefined
      ? `${sr.sharedTo.type}:${sr.sharedTo.target}`
      : sr.sharedTo.type;
  const lines: string[] = [];
  lines.push(
    `**${kindLabel} 共有ルール** (\`${sr.object}\` → \`${sharedTo}\`、アクセス: \`${sr.accessLevel}\`)。`,
  );
  if (sr.kind === "criteriaBased" && sr.criteriaItems.length > 0) {
    const items = sr.criteriaItems
      .map((c) => `\`${c.field}\` ${c.operation} \`${c.value}\``)
      .slice(0, 3)
      .join(" / ");
    lines.push(`条件: ${items}。`);
  }
  if (sr.ownerSource !== undefined) {
    lines.push(`オーナー条件: \`${sr.ownerSource}\`。`);
  }
  if (sr.description !== undefined) {
    lines.push(`概要: ${truncate(sr.description, 120)}`);
  }
  return lines.join(" ");
}

export function summaryForLayout(layout: Layout): string {
  const totalItems = layout.sections.reduce((sum, s) => sum + s.items.length, 0);
  const lines: string[] = [];
  lines.push(
    `**\`${layout.object}\` のレイアウト** (${layout.layoutName})。セクション ${layout.sections.length} / フィールド ${totalItems}。`,
  );
  if (layout.relatedLists.length > 0) {
    lines.push(`関連リスト ${layout.relatedLists.length} 件。`);
  }
  if (layout.quickActions.length > 0) {
    lines.push(`クイックアクション ${layout.quickActions.length} 件。`);
  }
  return lines.join(" ");
}

export function summaryForCustomMetadataRecord(cmr: CustomMetadataRecord): string {
  const lines: string[] = [];
  lines.push(
    `**CustomMetadata レコード** (Type: \`${cmr.type}\`、Record: \`${cmr.recordName}\`)。値 ${cmr.values.length} 個。`,
  );
  if (cmr.label !== undefined) lines.push(`Label: ${cmr.label}。`);
  // 主要な値 (最大 3 個) を要約
  const top = cmr.values
    .slice(0, 3)
    .map((v) => `\`${v.field}\`=\`${truncate(v.value, 30)}\``)
    .join(", ");
  if (top !== "") lines.push(`主要値: ${top}${cmr.values.length > 3 ? " ほか" : ""}。`);
  return lines.join(" ");
}

export function summaryForNamedCredential(nc: NamedCredential): string {
  const lines: string[] = [];
  const protocol = nc.protocol !== undefined ? `\`${nc.protocol}\`` : "プロトコル未指定";
  lines.push(`**外部連携 NamedCredential** (${protocol})。`);
  if (nc.endpoint !== undefined) lines.push(`Endpoint: \`${nc.endpoint}\`。`);
  lines.push(
    nc.hasSecret ? "⚠ シークレット情報あり (値は本書に出力しない)。" : "シークレット情報なし。",
  );
  return lines.join(" ");
}

export function summaryForRemoteSiteSetting(rss: RemoteSiteSetting): string {
  const status = rss.active ? "Active" : "Inactive";
  const lines: string[] = [];
  lines.push(`**${status} な Remote Site Setting**。`);
  if (rss.url !== undefined) lines.push(`URL: \`${rss.url}\`。`);
  if (rss.disableProtocolSecurity) {
    lines.push("⚠ HTTP 許容 (disableProtocolSecurity=true)。");
  }
  return lines.join(" ");
}

export function summaryForLwc(lwc: LightningWebComponent): string {
  const lines: string[] = [];
  const exposure = lwc.isExposed ? "公開 LWC" : "内部 LWC";
  const bundle: string[] = ["JS"];
  if (lwc.hasHtml) bundle.push("HTML");
  if (lwc.hasCss) bundle.push("CSS");
  lines.push(`**${exposure}** (${bundle.join(" + ")})。`);

  const counts: string[] = [];
  if (lwc.apexImports.length > 0) counts.push(`Apex 呼び出し ${lwc.apexImports.length}`);
  if (lwc.publicProperties.length > 0) counts.push(`@api ${lwc.publicProperties.length}`);
  if (lwc.wires.length > 0) counts.push(`@wire ${lwc.wires.length}`);
  if (lwc.customEvents.length > 0) counts.push(`CustomEvent ${lwc.customEvents.length}`);
  if (lwc.childComponents.length > 0) counts.push(`子 LWC ${lwc.childComponents.length}`);
  if (counts.length > 0) lines.push(`内訳: ${counts.join(" / ")}。`);

  if (lwc.targets.length > 0) {
    const top = lwc.targets
      .slice(0, 3)
      .map((t) => `\`${t}\``)
      .join(", ");
    const more = lwc.targets.length > 3 ? " ほか" : "";
    lines.push(`Targets: ${top}${more}。`);
  }
  if (lwc.description !== undefined && lwc.description.trim() !== "") {
    lines.push(`説明: ${truncate(lwc.description.trim(), 120)}`);
  }
  return lines.join(" ");
}

export function summaryForAuraBundle(aura: AuraBundle): string {
  const kindLabel =
    aura.bundleKind === "Component"
      ? "Aura コンポーネント"
      : aura.bundleKind === "Application"
        ? "Aura アプリケーション"
        : "Aura イベント";
  const lines: string[] = [];
  lines.push(`**${kindLabel}** (Legacy UI)。`);
  const parts: string[] = [];
  if (aura.hasController) parts.push("Controller");
  if (aura.hasHelper) parts.push("Helper");
  if (aura.hasRenderer) parts.push("Renderer");
  if (aura.hasStyle) parts.push("Style");
  if (parts.length > 0) lines.push(`構成: ${parts.join(" / ")}。`);
  const counts: string[] = [];
  if (aura.attributes.length > 0) counts.push(`attribute ${aura.attributes.length}`);
  if (aura.handlers.length > 0) counts.push(`handler ${aura.handlers.length}`);
  if (counts.length > 0) lines.push(`内訳: ${counts.join(" / ")}。`);
  if (aura.description !== undefined && aura.description.trim() !== "") {
    lines.push(`説明: ${truncate(aura.description.trim(), 120)}`);
  }
  return lines.join(" ");
}

export function summaryForFlexiPage(fp: FlexiPage): string {
  const typeLabel = fp.type !== undefined ? `\`${fp.type}\`` : "type 不明";
  const lines: string[] = [];
  const target = fp.sobjectType !== undefined ? ` (対象: \`${fp.sobjectType}\`)` : "";
  lines.push(`**Lightning Page** ${typeLabel}${target}。`);
  const totalItems = fp.regions.reduce((sum, r) => sum + r.items.length, 0);
  lines.push(`Region ${fp.regions.length} / Item ${totalItems}。`);
  if (fp.pageTemplate !== undefined) {
    lines.push(`Template: \`${fp.pageTemplate}\`。`);
  }
  if (fp.description !== undefined && fp.description.trim() !== "") {
    lines.push(`説明: ${truncate(fp.description.trim(), 120)}`);
  }
  return lines.join(" ");
}

export function summaryForVisualforcePage(vfp: VisualforcePage): string {
  const lines: string[] = [];
  const renderHint = vfp.renderAs !== undefined ? `\`${vfp.renderAs}\` 出力` : "通常 HTML";
  lines.push(`**Visualforce Page** (${renderHint})。`);
  if (vfp.controller !== undefined) {
    lines.push(`Controller: \`${vfp.controller}\`。`);
  } else if (vfp.standardController !== undefined) {
    lines.push(`Standard Controller: \`${vfp.standardController}\`。`);
  }
  if (vfp.extensions.length > 0) {
    lines.push(`Extensions: ${vfp.extensions.map((e) => `\`${e}\``).join(", ")}。`);
  }
  const counts: string[] = [];
  if (vfp.markupCounts.length > 0) {
    const total = vfp.markupCounts.reduce((sum, c) => sum + c.count, 0);
    counts.push(`apex タグ ${total} 箇所 (種別 ${vfp.markupCounts.length})`);
  }
  if (vfp.methodReferences.length > 0) {
    counts.push(`メソッド参照 ${vfp.methodReferences.length}`);
  }
  if (counts.length > 0) lines.push(`内訳: ${counts.join(" / ")}。`);
  if (vfp.description !== undefined && vfp.description.trim() !== "") {
    lines.push(`説明: ${truncate(vfp.description.trim(), 120)}`);
  }
  return lines.join(" ");
}

export function summaryForVisualforceComponent(vfc: VisualforceComponent): string {
  const lines: string[] = [];
  lines.push("**Visualforce Component**。");
  if (vfc.controller !== undefined) {
    lines.push(`Controller: \`${vfc.controller}\`。`);
  }
  const counts: string[] = [];
  if (vfc.attributes.length > 0) counts.push(`公開属性 ${vfc.attributes.length}`);
  if (vfc.markupCounts.length > 0) {
    const total = vfc.markupCounts.reduce((sum, c) => sum + c.count, 0);
    counts.push(`apex タグ ${total} 箇所`);
  }
  if (counts.length > 0) lines.push(`内訳: ${counts.join(" / ")}。`);
  if (vfc.description !== undefined && vfc.description.trim() !== "") {
    lines.push(`説明: ${truncate(vfc.description.trim(), 120)}`);
  }
  return lines.join(" ");
}

export function summaryForCustomApplication(app: CustomApplication): string {
  const lines: string[] = [];
  const navLabel = app.navType !== undefined ? `\`${app.navType}\`` : "ナビゲーション未指定";
  lines.push(`**Lightning App** (${navLabel})。`);
  if (app.tabs.length > 0) {
    const top = app.tabs
      .slice(0, 3)
      .map((t) => `\`${t}\``)
      .join(", ");
    const more = app.tabs.length > 3 ? ` ほか (計 ${app.tabs.length})` : "";
    lines.push(`Tab: ${top}${more}。`);
  }
  if (app.formFactors.length > 0) {
    lines.push(`Form Factors: ${app.formFactors.map((f) => `\`${f}\``).join(", ")}。`);
  }
  if (app.utilityBar !== undefined) {
    lines.push(`Utility Bar: \`${app.utilityBar}\`。`);
  }
  if (app.description !== undefined && app.description.trim() !== "") {
    lines.push(`説明: ${truncate(app.description.trim(), 120)}`);
  }
  return lines.join(" ");
}

// ---------- helpers ----------

function pickBiggestMethod(cls: ApexClass) {
  const flows = cls.body?.controlFlows ?? [];
  if (flows.length === 0) return undefined;
  return [...flows].sort((a, b) => countNodes(b.nodes) - countNodes(a.nodes))[0];
}

function countNodes(nodes: readonly import("../types/graph.js").ApexControlFlowNode[]): number {
  let total = 0;
  for (const n of nodes) {
    total += 1;
    switch (n.kind) {
      case "if":
        total += countNodes(n.thenNodes) + countNodes(n.elseNodes);
        break;
      case "for":
      case "while":
        total += countNodes(n.body);
        break;
      case "try":
        total += countNodes(n.tryNodes);
        for (const c of n.catches) total += countNodes(c.nodes);
        total += countNodes(n.finallyNodes);
        break;
      default:
        break;
    }
  }
  return total;
}

function profileMethod(flow: import("../types/graph.js").ApexMethodControlFlow): string {
  let soql = 0;
  let dml = 0;
  let branches = 0;
  let loops = 0;

  function walk(nodes: readonly import("../types/graph.js").ApexControlFlowNode[]): void {
    for (const n of nodes) {
      switch (n.kind) {
        case "soql":
          soql += 1;
          break;
        case "dml":
          dml += 1;
          break;
        case "if":
          branches += 1;
          walk(n.thenNodes);
          walk(n.elseNodes);
          break;
        case "for":
        case "while":
          loops += 1;
          walk(n.body);
          break;
        case "try":
          walk(n.tryNodes);
          for (const c of n.catches) walk(c.nodes);
          walk(n.finallyNodes);
          break;
        default:
          break;
      }
    }
  }
  walk(flow.nodes);

  const parts: string[] = [];
  if (soql > 0) parts.push(`SOQL ${soql}`);
  if (dml > 0) parts.push(`DML ${dml}`);
  if (branches > 0) parts.push(`分岐 ${branches}`);
  if (loops > 0) parts.push(`ループ ${loops}`);
  return parts.length > 0 ? parts.join(" / ") : "単純文のみ";
}

function uniqueClassNames(
  refs: readonly import("../types/graph.js").ApexClassReferenceInfo[],
): string[] {
  return [...new Set(refs.map((r) => r.className))];
}

interface KindCounts {
  recordCreate: number;
  recordUpdate: number;
  recordDelete: number;
  recordLookup: number;
  decision: number;
  loop: number;
  actionCall: number;
  subflow: number;
  screen: number;
  assignment: number;
  wait: number;
}

function countByKind(elements: readonly import("../types/graph.js").FlowElementInfo[]): KindCounts {
  const counts: KindCounts = {
    recordCreate: 0,
    recordUpdate: 0,
    recordDelete: 0,
    recordLookup: 0,
    decision: 0,
    loop: 0,
    actionCall: 0,
    subflow: 0,
    screen: 0,
    assignment: 0,
    wait: 0,
  };
  for (const e of elements) counts[e.kind] += 1;
  return counts;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}
