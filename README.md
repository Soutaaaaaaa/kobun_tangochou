# 古文単語400

古文単語400語（No.1–400）を学ぶアプリ。Next.js (App Router) + TypeScript + Tailwind CSS + Supabase。スマホ表示を優先しています。

## できること

- **アカウント**：アカウント名とパスワードで新規作成・ログイン。学習記録はアカウントごとに保存。
- **20セクション**：最頻出語 1–100／頻出語 101–240／敬語 241–275／重要語 276–400。約20語ずつで、区分をまたがない。
- **単語カード**：フリック（タップ）でめくる → 覚えたら左、まだなら右へフリック。
- **四択クイズ**：形の似た語・意味の紛らわしい語を優先して選択肢に入れる。
- **ランダム出題**：既存の区分・セクションを複数選ぶか、番号（例：120〜180）を直接指定して、カード／クイズでランダムに出題。
- **今日の復習（40問）**：数日前に間違えた単語・苦手リスト・しばらく学習していない単語を優先して約7割、残りは普通の単語を混ぜて出題。
- **苦手リスト**：間違えた単語は自動で追加。カードで「覚えた」またはクイズで2回連続正解すると外れる。手動でも出し入れ可。
- **学習履歴**：単語ごとに「最後に学習した日時」「最後に正解した日時」「最後に間違えた日時」「正解数・不正解数」を保存。解答1回ごとのログ（study_logs）も保存。

## セットアップ

### 1. Supabase

1. [Supabase](https://supabase.com) でプロジェクトを作成。
2. **SQL Editor** で `supabase/migrations/0001_init.sql`、続けて `0002_grants.sql` の中身を実行（テーブル・RLS・関数・権限を作成）。
3. **Authentication → Sign In / Providers → Email** で **「Confirm email」をオフ** にする。
   - Supabase のログインはメールアドレスが必須なので、アプリ内部ではアカウント名から `アカウント名@kobun-tango.local` という実在しないアドレスを作って使っています（メールは送られません）。
   - もし Supabase がこのアドレスを受け付けない場合は、環境変数 `NEXT_PUBLIC_AUTH_EMAIL_DOMAIN` で別のドメインを指定してください。
4. **Settings → API** から Project URL と anon key を控える。

### 2. ローカルで動かす

```bash
cp .env.example .env.local   # URL と anon key を書き込む
npm install
npm run dev                  # http://localhost:3000
```

### 3. 公開する（例：Vercel）

GitHub のこのリポジトリを Vercel にインポートし、環境変数 `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定してデプロイします。

## 構成

```
src/
  app/
    login, signup          ログイン・新規作成（Server Actions: app/auth-actions.ts）
    (main)/                ログインが必要な画面
      page.tsx             トップ（セクション一覧・進捗）
      section/[id]         セクション詳細・単語一覧
      random               範囲を選んでランダム出題
      study                カード／クイズ（URLパラメータで範囲・出題数などを指定）
      review               今日の復習
      weak                 苦手リスト・間違えた記録
  components/              FlashCards, Quiz, WordList, ProgressProvider など
  lib/
    words-raw.ts           単語データ（番号|見出し|漢字|品詞|意味;意味…）
    words.ts               カテゴリ・セクション分け
    distractors.ts         紛らわしい選択肢の選び方
    review.ts              今日の復習の出題ロジック
    supabase/              Supabase クライアント（ブラウザ・サーバー・middleware）
  middleware.ts            未ログインなら /login へ
supabase/migrations/       DB スキーマ
```

### データベース

| テーブル | 内容 |
|---|---|
| `profiles` | アカウント名（サインアップ時に自動作成） |
| `word_progress` | ユーザー×単語ごとの状態：苦手か、正解数・不正解数、連続正解数、最終学習・最終正解・最終不正解の日時 |
| `study_logs` | 解答1回ごとの記録（単語・正誤・カード/クイズ/今日の復習・日時） |

どのテーブルも Row Level Security で本人の行しか読み書きできません。解答の記録は `record_answer` 関数で、状態の更新とログの追加を1回で行います。
