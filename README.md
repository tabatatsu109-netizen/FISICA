# FISICA — 高校サッカー部向け 選手成長・コンディション管理アプリ

選手が毎日の記録(体重・身長・睡眠・食事・コンディション)をスマホから最短で入力し、
月ごとに「成長カルテ」が自動生成され、監督は全選手をダッシュボードで俯瞰できるWebアプリです。

## 主な機能

### 選手向け
- **今日の記録**: 体重/身長、睡眠時間(スライダー)、睡眠の質・体調・疲労・筋肉痛(絵文字5段階)、RPE、食事(朝昼夕+補食 × 主食/主菜/副菜/乳製品/果物タグ)
- **個人ダッシュボード**: コンディション統合スコア(0-100の円形ゲージ)、連続記録日数、体重・睡眠・スコア・栄養の28日グラフ
- **月次成長カルテ**: 月間スコア(コンディション/睡眠/栄養)、身長体重の伸び、**同世代トップレベル(各年代代表平均)とのBMI比較**、改善アドバイス自動生成
- **A4カルテPDF出力**: カルテの「PDF出力」ボタン → 顔写真入りのA4 1枚デザイン(`/karte-print/[userId]/[month]`)→ ブラウザの「PDFに保存」で保護者にそのまま共有できるPDFに
- **顔写真登録**: 選手ホームまたは監督の選手詳細からアップロード(ブラウザ側で正方形400pxに自動縮小してDB保存)

### 監督向け
- **チームダッシュボード**: 全選手一覧(スコア・睡眠・体重変化・入力率)、要注意アラート(コンディション低下/睡眠不足/体重急減/入力率低下)
- **ランキング**: 体重増加(30日)、連続記録
- **選手ドリルダウン**: 個人グラフ+月次カルテ閲覧

## セットアップ

PostgreSQLの接続文字列を `.env` の `DATABASE_URL` に設定してから:

```bash
npm install
npx prisma db push        # スキーマをDBに反映
node prisma/seed.mjs      # デモデータ投入(任意)
npm run dev               # http://localhost:3000
```

## デプロイ(Vercel + Neon)

1. [Neon](https://neon.tech) で無料DBを作成し、接続文字列(`postgresql://...`)を取得
2. ローカルの `.env` に設定して `npx prisma db push`(+必要なら `node prisma/seed.mjs`)
3. [Vercel](https://vercel.com) で本リポジトリをImportし、環境変数を設定してDeploy:
   - `DATABASE_URL` = Neonの接続文字列
   - `SESSION_SECRET` = 強いランダム値(`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` で生成)

### デモアカウント(シード後)
| ロール | ID | パスワード |
|---|---|---|
| 監督 | `coach` | `demo1234` |
| 選手 | `sato` / `suzuki` / `ito` など8名 | `demo1234` |

## 技術構成
- **Next.js 16 (App Router / Webpack) + TypeScript + Tailwind CSS v4**
- **Prisma 6 + PostgreSQL**(Neon等のマネージドPostgres推奨)
- **Recharts**(グラフ)/ HMAC署名Cookieによるセッション認証(bcryptパスワードハッシュ)

> 注: このリポジトリはexFATドライブでの開発を考慮し、dev/buildともに `--webpack` を使用しています(Turbopackはシンボリックリンク必須のためexFAT非対応)。NTFS環境ならpackage.jsonから`--webpack`を外してTurbopackも利用可能です。

## 本番運用前のTODO
- `SESSION_SECRET` 環境変数を必ず強いランダム値に変更
- 選手アカウントの管理画面(現状はシードスクリプトで作成)
- 未成年の身体データを扱うため、保護者同意・プライバシーポリシーの整備

## BMI目標値について
カルテの「同世代トップレベルとの比較」は、各年代代表チームの平均値をもとにしたポジション別(フィールド/GK)・年代別(U13〜U20)のBMI目標値を使用しています(`src/lib/benchmark.ts`)。
