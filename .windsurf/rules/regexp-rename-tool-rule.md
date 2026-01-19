---
trigger: auto
---

# 正規表現リネームツール (regexp-rename) 開発ルール

## プロジェクト概要
このプロジェクトは、Rust (Tauri v2) と Vue 3 を使用した高機能な正規表現ファイルリネームツールです。

## 技術スタック
- **Frontend**: Vue 3 (Composition API) + TypeScript + Tailwind CSS
- **Backend**: Rust (Tauri v2)
- **Component Design**: Atomic Design (components/ 内に配置)

## ディレクトリ構成 (Tauri/Vite 標準)
- [src/](cci:9://file:///c:/codes/regexp-rename/src:0:0-0:0): Vue 3 フロントエンド
  - `components/atoms/`, `components/molecules/`, `components/organisms/`: Atomic Design
  - `composables/`: ビジネスロジック
  - `store/`: 状態管理 (Pinia)
- `src-tauri/`: Rust バックエンド
- `tests/`: テストコード

## テスト方針
- フロントエンド: Vitest を使用し、`tests/unit/` に配置
- バックエンド: Rust 標準のテスト機能を使い、各モジュール内に記述

## 実装上の注意点
- **設定保存**: 設定（グループ、正規表現、アクティブグループ等）は Rust 側の [save_settings](cci:1://file:///c:/codes/regexp-rename/src-tauri/src/lib.rs:74:4-82:5) / [load_settings](cci:1://file:///c:/codes/regexp-rename/src-tauri/src/lib.rs:59:4-72:5) invoke コマンドを通じて永続化します。
- **IPC通信**: 重い処理やファイル操作は Rust 側 ([execute_rename_files](cci:1://file:///c:/codes/regexp-rename/src-tauri/src/lib.rs:84:4-167:5)) で行い、フロントエンドは表示と入力を担当します。
- **グループ仕様**: デフォルトで `id: "none"` (名前: 「なし」) のグループを許容し、初期状態や未選択時のハンドリングを適切に行う必要があります。
- **循環参照防止**: グループ参照機能があるため、プレビューや実行時に循環参照をチェックし、エラーとして表示する必要があります。

## スタイルガイド
- Tailwind CSS を使用し、一貫性のあるモダンな UI を構築します。
- Vue ファイルは `<script setup lang="ts">`, `<template>`, `<style lang="scss" scoped>` の構造を維持します。
