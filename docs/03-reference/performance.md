# Performance & Benchmarks

> AI エージェント (Claude Code / Antigravity 等) の体感速度に直結する `yohaku graph build` の所要時間ガイド。Claude Code の hook から呼ぶ場合は **`--async` の併用を強く推奨**する。

---

## 1. なぜ重要か

`yohaku graph build` は Claude Code の **PostToolUse hook** から `Edit` / `Write` のたびに呼ばれる構成が既定。
hook は同期実行されるため、`graph build` が 2 秒かかると AI の応答が 2 秒遅延する。
編集が 5〜10 回連続すると **累積 10〜20 秒** の wall-clock 損失になる。

これを避けるための仕組みが本書で扱う `--async` モードと Stop フックである。

---

## 2. 計測結果 (`scripts/bench-graph-build.mjs`)

合成フィクスチャでの初期計測 (Apple Silicon / Node 20):

| Preset | Objects | Fields/Obj | Apex | Flows | Full build | Incremental (no-op) | Incremental (1 edit) |
|---|---:|---:|---:|---:|---:|---:|---:|
| `small` | 20 | 10 | 10 | 5 | ~1.5 s | ~1.2 s | ~1.2 s |
| `medium` | 100 | 20 | 50 | 30 | ~1.7 s | ~1.6 s | ~1.7 s |
| `large` (未測) | 500 | 30 | 200 | 100 | — | — | — |

**観察**: 現状は incremental の no-op でも **約 1.2 秒の固定コスト** がかかる。これは process 起動 + ファイル走査 + SQLite open のオーバーヘッドが支配的で、メタデータ件数が増えても線形には伸びない (medium と small で差が小さい)。今後の高速化ターゲットは「no-op を 200ms 未満にする」こと。

---

## 3. Claude Code hook 統合での推奨設定

`yohaku init` が生成する `.claude/settings.json` は既定で以下の構成:

```jsonc
"PostToolUse": [
  {
    "matcher": "Edit|Write",
    // メタデータ拡張子のみに絞り、無関係な編集で hook が走らないようにする
    "pathMatcher": "force-app/**/*.{cls,trigger,flow-meta.xml,object-meta.xml,...}",
    "hooks": [{ "command": "yohaku graph build --incremental --quiet --async" }]
  }
],
"Stop": [
  // セッション末に確実に最新化 (--async の取りこぼし保険)
  { "hooks": [{ "command": "yohaku graph build --incremental --quiet" }] }
]
```

ポイント:

1. **`--async`**: 子プロセスを detach するので、hook の wall-clock は数十 ms に収まる
2. **pathMatcher 厳格化**: 全 `force-app/**` ではなく、メタデータ拡張子のみ。たとえば `.cls` の対になる `.cls-meta.xml` 編集も拾う一方、無関係な README 等は無視
3. **Stop フック**: `--async` で取りこぼした分をセッション末で確実に同期。ここは同期実行で良い (どうせ AI は応答を返した後)
4. **競合制御**: `--async` 同士の競合は `.yohaku/build.lock` + `.yohaku/build.dirty` で安全に直列化される

---

## 4. 計測の取り方

```bash
# プロジェクトのルートで
yohaku graph build --incremental --quiet
# → .yohaku/hook-timings.jsonl に 1 行追記される
cat .yohaku/hook-timings.jsonl | tail -5
```

2 秒を超えると `[yohaku] warning: graph build took X.YYs (> 2s threshold)...` が stderr に出る。

合成ベンチを動かす:

```bash
node packages/core/scripts/bench-graph-build.mjs --preset small
node packages/core/scripts/bench-graph-build.mjs --preset medium
node packages/core/scripts/bench-graph-build.mjs --objects 300 --fields-per-object 25 --apex 100 --flows 50
```

---

## 5. それでも重い場合の逃げ道

`.claude/settings.json` の `"hooks": {}` を空にすれば、自動 build は完全に止まる。
代わりに「節目だけ手動で」回す運用に切り替え可能:

```bash
# 重要編集の区切りで手動同期
yohaku sync --quiet
```

---

## 6. 既知の高速化ターゲット (今後の課題)

- [ ] **no-op incremental の固定コスト削減** (1.2s → 200ms 目標)
  - SQLite open を遅延化
  - content_hash の早期短絡 (全ファイル走査前に root manifest を比較)
- [ ] **Node 起動コスト** (Bun / 事前バンドルでの常駐化検討)
- [ ] **`--watch` モード** (常駐デーモンで `graph build --incremental` をストリームに発火)

上記が入れば `--async` 自体が不要になるが、それまでは `--async` + Stop フックの組み合わせが最適解。
