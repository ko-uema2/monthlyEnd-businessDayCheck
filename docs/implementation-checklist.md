# 実装チェックリスト

## Phase 1: 基盤強化

### SecretsManagerAdapterクラス作成

- [x] `src/secretsManager.ts` ファイル作成
- [x] AWS SDK for JavaScript v3 の Secrets Manager クライアント実装
- [x] 認証情報取得メソッド `getCredentials()` 実装
- [x] 型定義（認証情報インターフェース）作成
- [x] エラーハンドリング実装

### ActionExecutorクラス作成（責務分離）

- [x] `src/actionExecutor.ts` ファイル作成
- [x] 月末最終営業日アクション実行メソッド `executeMonthlyEndActions()` 実装
- [x] LINE通知送信メソッド `sendLineNotification()` 実装
- [x] Googleカレンダー予定追加メソッド `addCalendarEvent()` 実装
- [x] 型定義（ActionExecutorConfigインターフェース）作成
- [x] コンストラクタでのアダプターインスタンス化実装
- [x] 認証情報を直接受け取る形への変更

### エラーハンドリング強化

- [x] `src/monthlyEndBusinessDayCheck.ts` のエラーハンドリング強化
- [x] 構造化ログ出力実装（info/error/warn）
- [x] 適切な例外スロー処理実装
- [x] ログ出力レベルの設定

### 既存機能の動作確認

- [x] 現在のシステムの動作確認
- [x] 既存テストの実行・確認
- [x] エラーケースの動作確認

## Phase 2: 機能追加

### Googleカレンダー予定追加機能実装

- [x] `src/googleCalendar.ts` の `addEvent` メソッド修正
- [x] リマインド設定（3時間前、2時間前、1時間前）実装
- [x] タイムゾーン設定（JST）確認
- [x] 予定時間設定（17:00-17:15）実装
- [x] 予定タイトル設定（「月末の最終営業日」）実装

### メイン処理統合

- [x] `src/monthlyEndBusinessDayCheck.ts` のActionExecutor統合
- [x] SecretsManagerAdapter の統合
- [x] エラーハンドリングの統合
- [x] ログ出力の統合
- [x] 責務分離によるコード簡潔化

### CDKスタック修正

- [x] `lib/monthly_end-business_day_check-stack.ts` のデッドレターキュー設定追加
- [x] SQS デッドレターキュー作成
- [x] EventBridge ルール（再実行用）作成
- [x] Lambda関数（再実行用）作成
- [x] IAM権限設定

## Phase 3: テスト・デプロイ

### 単体テスト

- [ ] ActionExecutor の単体テスト
- [ ] SecretsManagerAdapter の単体テスト
- [ ] GoogleCalendarHolidayFetcher の単体テスト（祝日取得機能）
- [ ] GoogleCalendarEventCreator の単体テスト（イベント追加機能、リマインド設定含む）
- [ ] BusinessDayChecker の単体テスト
- [ ] LineNotifyAdapter の単体テスト（MessagingApiClient使用確認、JWT認証確認、ChannelAccessTokenClient確認）

### 統合テスト

- [ ] 月末最終営業日判定フローの統合テスト
- [ ] アクション実行フローの統合テスト
- [ ] エラーハンドリングフローの統合テスト
- [ ] LINE API連携テスト（MessagingApiClient動作確認、JWT認証動作確認、ChannelAccessTokenClient動作確認）

### デプロイ・動作確認

- [ ] AWS CDK デプロイ
- [ ] 本番環境での動作確認
- [ ] エラー時の再試行確認
- [ ] ログ出力確認
- [ ] 外部API連携確認

## 技術的チェック項目

### セキュリティ

- [x] 認証情報の適切な管理（Secrets Manager）
- [x] IAM権限の最小権限原則
- [x] 環境変数の適切な設定
- [x] LINE API認証情報の適切な管理
- [x] JWT認証の適切な実装

### パフォーマンス

- [x] Lambda関数のタイムアウト設定（30秒）
- [x] 外部API呼び出しの最適化
- [x] メモリ使用量の最適化
- [x] LINE API呼び出しの最適化
- [x] JWTトークン生成の最適化

### エラーハンドリング

- [x] デッドレターキュー機能の動作確認
- [x] 再試行回数の制限（3回）
- [x] エラーログの詳細出力
- [x] LINE API通信エラーの適切な処理
- [x] JWT認証エラーの適切な処理

### ログ出力

- [x] 構造化ログ（JSON形式）の出力
- [x] ログレベルの適切な設定
- [x] CloudWatch Logs での確認
- [x] LINE API呼び出しログの出力
- [x] JWT認証ログの出力

### アーキテクチャ設計

- [x] 責務分離の実装（ActionExecutor）
- [x] 単一責任原則の遵守
- [x] 依存性注入の実装
- [x] コードの保守性向上
- [x] カプセル化の実装（ActionExecutorがアダプターを管理）
- [x] Google Calendarクラスの責務分離（HolidayFetcher/EventCreator分割）
- [x] LINE API最新仕様への対応（MessagingApiClient使用）
- [x] JWT認証の適切な実装（node-joseライブラリ使用）
- [x] ChannelAccessTokenClientの適切な実装（issueChannelTokenByJWT使用）

## 動作確認項目

### 基本動作

- [ ] 毎日朝9時の定期実行
- [ ] 月末最終営業日の判定
- [ ] LINE通知の送信（MessagingApiClient使用確認、JWT認証確認、ChannelAccessTokenClient確認）
- [ ] Googleカレンダーへの予定追加
- [ ] ActionExecutorによる一括アクション実行

### エラーケース

- [ ] 認証情報取得エラー時の再試行
- [ ] 外部API通信エラー時の再試行
- [ ] 処理エラー時の再試行
- [ ] 最大再試行回数到達時の処理
- [ ] LINE API通信エラー時の再試行
- [ ] JWT認証エラー時の再試行

### ログ確認

- [ ] 正常時のログ出力
- [ ] エラー時のログ出力
- [ ] 再試行時のログ出力
- [ ] ログレベルの確認
- [ ] ActionExecutor実行時のログ出力
- [ ] LINE API呼び出し時のログ出力
- [ ] JWT認証時のログ出力

## 最終確認項目

### 機能確認

- [ ] 全ての機能要件の実装完了
- [ ] 非機能要件の実装完了
- [ ] エラーハンドリングの実装完了
- [ ] 責務分離の実装完了
- [ ] Google Calendarクラス分割の実装完了
- [ ] LINE API最新仕様への対応完了
- [ ] JWT認証の実装完了
- [ ] ChannelAccessTokenClientの実装完了

### 品質確認

- [ ] コードレビューの完了
- [ ] テストの実行完了
- [ ] セキュリティチェックの完了
- [ ] アーキテクチャ設計の確認
- [ ] LINE API仕様の確認完了
- [ ] JWT認証仕様の確認完了
- [ ] ChannelAccessTokenClient仕様の確認完了

### ドキュメント確認

- [ ] README.md の更新
- [ ] 技術ドキュメントの更新
- [ ] 運用ドキュメントの更新
- [ ] 要件定義書の更新

---

**チェックリスト作成日**: 2024年12月
**作成者**: AI Assistant
**バージョン**: 1.5

## 変更履歴

| バージョン | 日付 | 変更内容 | 変更者 |
|------------|------|----------|--------|
| 1.0 | 2024年12月 | 初版作成 | AI Assistant |
| 1.1 | 2024年12月 | ActionExecutor責務分離、エラーハンドリング強化 | AI Assistant |
| 1.2 | 2024年12月 | LINE API仕様更新（MessagingApiClient使用） | AI Assistant |
| 1.3 | 2024年12月 | JWT認証実装（node-joseライブラリ使用） | AI Assistant |
| 1.4 | 2024年12月 | ChannelAccessTokenClient実装（issueChannelTokenByJwt使用） | AI Assistant |
| 1.5 | 2024年12月 | Google Calendarクラス分割（HolidayFetcher/EventCreator分割） | AI Assistant |
