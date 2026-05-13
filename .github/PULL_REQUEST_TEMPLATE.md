<!--
ありがとうございます！この PR テンプレを使って、レビュアーが状況を把握しやすいよう情報を埋めてください。
Thank you for the contribution! Please fill in the sections below so reviewers can understand the change.
-->

## 概要 / Summary

<!-- 何を解決する PR か、1〜3 文で / What does this PR change, in 1–3 sentences? -->

## 種別 / Type of change

- [ ] バグ修正 / Bug fix
- [ ] 新機能 / New feature
- [ ] リファクタリング / Refactor (動作変更なし)
- [ ] ドキュメント / Documentation
- [ ] テスト / Tests
- [ ] CI / ビルド / CI or build
- [ ] セキュリティ / Security
- [ ] その他 / Other:

## 動機・背景 / Motivation

<!-- なぜ必要か。関連 issue があればリンク。 / Why is this needed? Link related issues. -->

Closes #

## 変更内容 / Changes

<!-- 主要な変更点を箇条書きで / Key changes as a bullet list -->

-

## テスト計画 / Test plan

<!-- どう動作確認したか / How was this tested? -->

- [ ] `npm test` で **全テスト pass**
- [ ] `npm run lint` (root) で **0 errors**
- [ ] (UI / CLI 変更があれば) ローカルで手動動作確認

## 設計原則チェック / Design principle check

本 OSS の [3 層分離](../AGENTS.md) と [禁則 14 か条](../IMPLEMENTATION_GUIDE.md#横断的に守るべき禁則事項) を確認:

- [ ] 決定的処理 / AI 判断 / 人手補完 の層を混ぜていない
- [ ] HUMAN_MANAGED ブロックを AI で上書きしていない
- [ ] AI に生メタデータ (XML) を直接読ませず、知識グラフ経由にしている
- [ ] CLAUDE.md / AGENTS.md を肥大化させていない (15KB / 30KB 以内)
- [ ] (該当する場合) 新 Phase を立てる根拠が [`AGENTS.md` § 3](../AGENTS.md#3-phase-スコープ規律) の閾値 (a)(b) を両方満たしている

## 補足 / Notes

<!-- レビュアーに伝えたいこと / Anything else reviewers should know? -->
