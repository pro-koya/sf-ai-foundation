import { describe, expect, it } from "vitest";
import {
  summaryForApex,
  summaryForApexTrigger,
  summaryForAuraBundle,
  summaryForFlexiPage,
  summaryForFlow,
  summaryForLwc,
  summaryForPermissionSet,
  summaryForRecordType,
  summaryForValidationRule,
} from "../../../src/render/summary.js";
import type {
  ApexClass,
  ApexTrigger,
  AuraBundle,
  FlexiPage,
  Flow,
  KnowledgeGraph,
  LightningWebComponent,
  PermissionSet,
  RecordType,
  ValidationRule,
} from "../../../src/types/graph.js";

const META: KnowledgeGraph["meta"] = {
  sfaiVersion: "test",
  builtAt: "2026-05-08T00:00:00Z",
  sourceAdapter: "local",
  salesforceApiVersion: "62.0",
  sourceHash: "h",
};

const EMPTY_GRAPH: KnowledgeGraph = {
  meta: META,
  objects: [],
  fields: [],
  validationRules: [],
  flows: [],
  apexClasses: [],
  apexTriggers: [],
  permissionSets: [],
  profiles: [],
  recordTypes: [],
  approvalProcesses: [],
  sharingRules: [],
  layouts: [],
  customMetadataRecords: [],
  namedCredentials: [],
  remoteSiteSettings: [],
  lwcs: [],
  auraBundles: [],
  flexiPages: [],
  visualforcePages: [],
  visualforceComponents: [],
  customApplications: [],
  dependencies: [],
  tags: [],
};

describe("summaryForApex", () => {
  it("メソッド数 / SOQL / DML / トレイトを 1 行で出す", () => {
    const cls: ApexClass = {
      fullyQualifiedName: "Foo",
      apiVersion: "62.0",
      isTest: false,
      sourcePath: "x.cls",
      contentHash: "h",
      body: {
        methods: [
          {
            name: "run",
            visibility: "public",
            isStatic: false,
            returnType: "void",
            parameters: "",
            annotations: [],
          },
        ],
        soqlQueries: [{ raw: "SELECT Id FROM Account", primaryObject: "Account" }],
        dmlOperations: [{ kind: "insert", target: "a", viaDatabaseClass: false }],
        classReferences: [{ className: "Helper", memberName: "x" }],
        classAnnotations: [],
        hasTryCatch: true,
        hasCallout: false,
      },
    };
    const s = summaryForApex(cls, EMPTY_GRAPH);
    expect(s).toContain("**1 メソッド**");
    expect(s).toContain("**SOQL 1 件**");
    expect(s).toContain("**DML 1 件**");
    expect(s).toContain("通常クラス");
    expect(s).toContain("try/catch 有");
    expect(s).toContain("`Helper`");
  });

  it("対応テストクラスがあれば言及する", () => {
    const cls: ApexClass = {
      fullyQualifiedName: "Svc",
      apiVersion: "62.0",
      isTest: false,
      sourcePath: "x.cls",
      contentHash: "h",
    };
    const test: ApexClass = { ...cls, fullyQualifiedName: "SvcTest", isTest: true };
    const g = { ...EMPTY_GRAPH, apexClasses: [cls, test] };
    expect(summaryForApex(cls, g)).toContain("`SvcTest`");
  });

  it("テストクラス自身は通常クラス扱いにしない", () => {
    const cls: ApexClass = {
      fullyQualifiedName: "FooTest",
      apiVersion: "62.0",
      isTest: true,
      sourcePath: "x.cls",
      contentHash: "h",
    };
    expect(summaryForApex(cls, EMPTY_GRAPH)).toContain("テストクラス");
  });
});

describe("summaryForApexTrigger", () => {
  it("オブジェクトとイベントを表示", () => {
    const t: ApexTrigger = {
      fullyQualifiedName: "OrderTrigger",
      object: "Order__c",
      events: ["beforeInsert", "afterUpdate"],
      apiVersion: "62.0",
      sourcePath: "x.trigger",
      contentHash: "h",
      body: {
        methods: [],
        soqlQueries: [],
        dmlOperations: [],
        classReferences: [{ className: "OrderHandler", memberName: "<new>" }],
        classAnnotations: [],
        hasTryCatch: false,
        hasCallout: false,
      },
    };
    const s = summaryForApexTrigger(t, EMPTY_GRAPH);
    expect(s).toContain("`Order__c`");
    expect(s).toContain("beforeInsert / afterUpdate");
    expect(s).toContain("`OrderHandler`");
  });

  it("同一オブジェクトに複数トリガーで警告", () => {
    const a: ApexTrigger = {
      fullyQualifiedName: "T1",
      object: "Account",
      events: ["beforeInsert"],
      apiVersion: "62.0",
      sourcePath: "x.trigger",
      contentHash: "h",
    };
    const b: ApexTrigger = { ...a, fullyQualifiedName: "T2" };
    const g = { ...EMPTY_GRAPH, apexTriggers: [a, b] };
    expect(summaryForApexTrigger(a, g)).toContain("⚠");
  });
});

describe("summaryForFlow", () => {
  it("type / status / triggeringObject を出す", () => {
    const f: Flow = {
      fullyQualifiedName: "X",
      type: "AutoLaunchedFlow",
      status: "Active",
      triggeringObject: "Order__c",
      sourcePath: "x.flow-meta.xml",
      contentHash: "h",
      body: {
        elements: [{ name: "Create", kind: "recordCreate", target: "Shipment__c" }],
        subflows: [],
        recordObjects: [],
        actionCalls: [],
      },
    };
    const s = summaryForFlow(f);
    expect(s).toContain("Active な AutoLaunchedFlow");
    expect(s).toContain("`Order__c`");
    expect(s).toContain("レコード作成 1");
  });
});

describe("summaryForValidationRule", () => {
  it("Active かつ formula 長と error message を出す", () => {
    const v: ValidationRule = {
      fullyQualifiedName: "Order__c.X",
      object: "Order__c",
      active: true,
      errorConditionFormula: "AND(ISNEW(), Status__c = 'Approved')",
      errorMessage: "新規でかつ承認済みは禁止",
      sourcePath: "x.xml",
      contentHash: "h",
    };
    const s = summaryForValidationRule(v);
    expect(s).toContain("**Active な入力規則**");
    expect(s).toContain("`Order__c`");
    expect(s).toContain("新規でかつ承認済みは禁止");
  });
});

describe("summaryForRecordType / summaryForPermissionSet", () => {
  it("RecordType: active と label と description", () => {
    const rt: RecordType = {
      fullyQualifiedName: "Order__c.Standard",
      object: "Order__c",
      label: "通常",
      description: "通常受注",
      active: true,
      sourcePath: "x.xml",
      contentHash: "h",
    };
    expect(summaryForRecordType(rt)).toContain("Active");
    expect(summaryForRecordType(rt)).toContain("通常受注");
  });

  it("PermissionSet: license と description", () => {
    const ps: PermissionSet = {
      fullyQualifiedName: "FinanceOps",
      label: "FinanceOps",
      license: "Salesforce",
      description: "経理担当向け",
      sourcePath: "x.xml",
      contentHash: "h",
    };
    expect(summaryForPermissionSet(ps)).toContain("`Salesforce`");
    expect(summaryForPermissionSet(ps)).toContain("経理担当向け");
  });
});

describe("summaryForLwc", () => {
  it("公開 LWC: bundle 構成と各種カウントを 1 行に出す", () => {
    const lwc: LightningWebComponent = {
      fullyQualifiedName: "claimDashboard",
      apiVersion: "62.0",
      masterLabel: "Claim Dashboard",
      isExposed: true,
      targets: ["lightning__RecordPage"],
      hasHtml: true,
      hasCss: true,
      apexImports: [
        { methodAlias: "getClaim", className: "ClaimService", methodName: "getClaim" },
      ],
      labelImports: [],
      publicProperties: ["recordId", "hideHeader"],
      wires: [{ target: "getClaim", bindingProperty: "wiredClaim" }],
      customEvents: ["refresh"],
      childComponents: ["c-claim-row"],
      standardComponents: [{ tag: "lightning-card", count: 1 }],
      directives: ["lwc:if"],
      sourcePath: "x.js-meta.xml",
      contentHash: "h",
    };
    const out = summaryForLwc(lwc);
    expect(out).toContain("公開 LWC");
    expect(out).toContain("JS + HTML + CSS");
    expect(out).toContain("Apex 呼び出し 1");
    expect(out).toContain("@api 2");
    expect(out).toContain("@wire 1");
    expect(out).toContain("子 LWC 1");
    expect(out).toContain("`lightning__RecordPage`");
  });

  it("内部 LWC: 公開判定が反映される", () => {
    const lwc: LightningWebComponent = {
      fullyQualifiedName: "internalUtil",
      isExposed: false,
      targets: [],
      hasHtml: false,
      hasCss: false,
      apexImports: [],
      labelImports: [],
      publicProperties: [],
      wires: [],
      customEvents: [],
      childComponents: [],
      standardComponents: [],
      directives: [],
      sourcePath: "x.js-meta.xml",
      contentHash: "h",
    };
    expect(summaryForLwc(lwc)).toContain("内部 LWC");
  });
});

describe("summaryForAuraBundle", () => {
  it("Component: 構成・attribute・handler 数を出す", () => {
    const aura: AuraBundle = {
      fullyQualifiedName: "ClaimSummary",
      bundleKind: "Component",
      apiVersion: "58.0",
      hasController: true,
      hasHelper: true,
      hasRenderer: false,
      hasStyle: false,
      attributes: ["recordId", "claim"],
      handlers: ["aura:doneRendering"],
      sourcePath: "x.cmp-meta.xml",
      contentHash: "h",
    };
    const out = summaryForAuraBundle(aura);
    expect(out).toContain("Aura コンポーネント");
    expect(out).toContain("Controller");
    expect(out).toContain("attribute 2");
    expect(out).toContain("handler 1");
  });

  it("Application/Event: 種別ラベルを切り替える", () => {
    const aura: AuraBundle = {
      fullyQualifiedName: "Foo",
      bundleKind: "Application",
      hasController: false,
      hasHelper: false,
      hasRenderer: false,
      hasStyle: false,
      attributes: [],
      handlers: [],
      sourcePath: "x.app-meta.xml",
      contentHash: "h",
    };
    expect(summaryForAuraBundle(aura)).toContain("Aura アプリケーション");
  });

  it("Event 種別も正しく判定する", () => {
    const aura: AuraBundle = {
      fullyQualifiedName: "ClaimUpdatedEvt",
      bundleKind: "Event",
      hasController: false,
      hasHelper: false,
      hasRenderer: false,
      hasStyle: false,
      attributes: [],
      handlers: [],
      sourcePath: "x.evt-meta.xml",
      contentHash: "h",
    };
    expect(summaryForAuraBundle(aura)).toContain("Aura イベント");
  });
});

describe("summaryForFlexiPage", () => {
  it("RecordPage: type / 対象オブジェクト / region 数 / item 数", () => {
    const fp: FlexiPage = {
      fullyQualifiedName: "Order_Record_Page",
      type: "RecordPage",
      sobjectType: "Order__c",
      pageTemplate: "flexipage:recordHomeTemplateDesktop",
      regions: [
        {
          name: "main",
          type: "Region",
          items: [{ componentName: "c:claimDashboard" }, { componentName: "flexipage:relatedListContainer" }],
        },
      ],
      sourcePath: "x.flexipage-meta.xml",
      contentHash: "h",
    };
    const out = summaryForFlexiPage(fp);
    expect(out).toContain("`RecordPage`");
    expect(out).toContain("`Order__c`");
    expect(out).toContain("Region 1 / Item 2");
  });
});
