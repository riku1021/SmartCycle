# 作業ルール

## 作業前

1. 作業すべき内容に対して issue を立てる。
2. 作業をする issue を確認し、その issue 番号を元に`create a branch`から branch を発行する。（例：`issue-1`）
3. 発行されたコマンドを元にその branch に遷移する。

```bash
git fetch origin
git checkout issue-issue番号
```

## 作業開始

1. 現在のブランチを確認する。

```bash
git branch
```

これで作業予定の`* issue-issue番号`と出力されれば、OK。
もし、作業予定の issue にいない場合は以下のコマンドで想定の branch に遷移する。

```bash
git switch issue-番号
```

2. ターミナルから作業ディレクトリに移動し、リモートリポジトリの状態を同期する。

```bash
git pull origin main
```

## 作業終了

1. ターミナルから変更点を確認する。

```bash
git status
```

変更を行ったファイル名が赤文字で表示される。

2. 作業内容（ファイルや変更）をステージングエリアに追加する。

```bash
git add .
```

add を行った後に再び`git status`を行うと赤文字が緑の文字に変更する。

3. ステージングエリアにある変更をコミット（リポジトリの履歴に保存）する。

```bash
git commit -m "作業内容の端的なコメント"
```

4. ターミナルから作業ディレクトリに移動し、リモートリポジトリの状態を同期する。 重要！！

```bash
git pull origin main
```

5. 変更内容をリモートリポジトリに反映させる。

```bash
git push origin issue-issue番号
```

6. プルリクを作成する。

- リモートリポジトリに行き、`Pull requests`タブをクリックする。
- `New`ボタンを押し、作業を行ったリモートブランチを選択し、`Create pull request`ボタンを選択する。
- プルリクのタイトル及び概要欄に作業内容を記載する。
- `Create pull request`ボタンを押した後、**Reviewers**にレビュー担当者を選択する。
