---
type: pitfall
date: 2026-05-07
title: npm link 経由の sfai が silent 終了するバグ (isDirectInvoke 比較が symlink を考慮していなかった)
severity: critical
tags: [phase-2, cycle-2-1, ci, cli, npm-link, symlink]
---

# npm link 経由の sfai が silent 終了するバグ

## 何が起きたか

利用者環境 (`/Users/developer/.nodebrew/current/bin/sfai` 経由) で `sfai init --profile minimal --project-name sfai-trial --language ja` を実行すると、何も出力されず exit 0 で終了。`.claude/` `.agents/` 等の生成物が一切作られない。

`sfai version` ですら出力なし、というのが診断の決定打となった。

## 根本原因

`packages/sfai-core/src/cli.ts` の末尾で、ESM スクリプトが直接実行されたかを判定する従来の慣用コード:

```typescript
const isDirectInvoke = import.meta.url === `file://${process.argv[1]}`;
if (isDirectInvoke) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
```

これは **`node dist/cli.js` 直接実行では正しく動作する** が、`npm link` でグローバルインストールした場合に破綻する:

- `process.argv[1]` = `/Users/developer/.nodebrew/current/bin/sfai` (symlink パスのまま)
- `import.meta.url` = `file:///Users/developer/Desktop/SF-AI-Foundation/packages/sfai-core/dist/cli.js` (resolve 済み)

両者が文字列一致しないため `main()` が呼ばれず、cli.js が「ロードされただけで何もしない」状態になる。

## どう気づいたか

- 利用者から「`sfai init` 実行後に `.claude/` 等が作られない」報告
- 私の手元では `node dist/cli.js init ...` で正常動作 → 環境差を疑う
- `which sfai` の出力が `/Users/developer/.nodebrew/current/bin/sfai` だった (symlink ヒント)
- `ls -la` で symlink を確認、`readlink` で参照先が `dist/cli.js` であることを確認
- `sfai version` が silent exit 0 を返したことで isDirectInvoke 判定の失敗が確定

## 回避策・修正

`fs.realpathSync` で **両側のパスを resolve してから比較**:

```typescript
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

function isDirectInvoke(): boolean {
  const argvPath = process.argv[1];
  if (argvPath === undefined) return false;
  try {
    const resolvedArgv = realpathSync(argvPath);
    const resolvedMeta = realpathSync(fileURLToPath(import.meta.url));
    return resolvedArgv === resolvedMeta;
  } catch {
    return false;
  }
}

if (isDirectInvoke()) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
```

これで symlink 経由でも `main()` が確実に呼ばれる。

## 再発防止

1. **CI で symlink 経由の動作確認を追加**: `npm link` または手動 symlink 作成 → `sfai version` の出力確認を Phase 2 完了前に組み込む (improvement 候補)
2. **Node.js 標準ライブラリの `node:module` の `Module.prototype.runMain` 検出**を Phase 7 で検討 (より堅牢な手段がある可能性)
3. **bin script の慣用パターンを採用するときは symlink 環境でテスト**

## 関連ナレッジ

- pitfalls/[CI / E2E バグ 8 件](./2026-05-07-ci-and-e2e-bugs.md) — 同じく初期 CLI バグ群
- decisions/[サイクル 2-1 完了 ADR](../decisions/2026-05-07-cycle-2-1-completion.md)
- 修正コミット時刻: 2026-05-07 (Phase 2 サイクル 2-7 完了直後、利用者検証ゲート開始時)

## 利用者への対応

すでに修正コミット + `npm run build` 済み。symlink は repo の dist/ を直接参照しているため、利用者環境でも **追加操作なしで** 修正が反映される。
