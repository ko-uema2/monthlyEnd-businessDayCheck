# ADR-002: Google Calendarクラスの責務分離

## ステータス

承認済み

## 日付

2025年6月

## 決定者

AI Assistant

## 技術的決定

Google Calendar APIを使用するクラスを、単一責任原則に従って以下の3つのクラスに分割する：

1. **GoogleCalendarBase** - 共通認証処理を提供する抽象基底クラス
2. **GoogleCalendarHolidayFetcher** - 祝日情報取得専用クラス
3. **GoogleCalendarEventCreator** - イベント追加専用クラス

## 背景

### 問題

元の`GoogleCalendarAdapter`クラスは以下の2つの異なる責務を持っていました：

1. **祝日情報の取得** (`fetchHolidays`メソッド)
   - 読み取り専用の操作
   - 日本の祝日カレンダー（`ja.japanese#holiday@group.v.calendar.google.com`）から情報を取得
   - 月末最終営業日判定のためのデータ提供

2. **イベントの追加** (`addEvent`メソッド)
   - 書き込み操作
   - ユーザーのカレンダーに新しいイベントを作成
   - リマインド設定を含む予定の追加

これらの処理は以下の点で異なるコンテキストを持っています：

- **セキュリティ要件**: 読み取りと書き込みで異なる権限が必要
- **使用頻度**: 祝日取得は毎日実行、イベント追加は月末最終営業日のみ
- **データソース**: 祝日は公開カレンダー、イベントはユーザーのプライベートカレンダー
- **エラーハンドリング**: 読み取り失敗と書き込み失敗で異なる対応が必要

### 影響

- 単一責任原則の違反
- クラスの責務が不明確
- テストの複雑化
- 将来の拡張性の制限

## 検討した選択肢

### 選択肢1: 現在の統合クラスを維持

**説明**: 元の`GoogleCalendarAdapter`クラスをそのまま使用し、1つのクラスで両方の機能を提供

**メリット**:

- 既存コードの変更が不要
- シンプルな構造

**デメリット**:

- 単一責任原則の違反
- 読み取りと書き込みの責務が混在
- テストが複雑になる
- セキュリティ面での権限管理が困難

### 選択肢2: 機能別クラス分割（採用）

**説明**: 読み取り専用と書き込み専用のクラスに分割し、共通処理は基底クラスに配置

**メリット**:

- 単一責任原則の遵守
- 各クラスの責務が明確
- テストが簡潔になる
- セキュリティ面での権限管理が容易
- 将来の拡張性が向上
- コードの可読性と保守性が向上

**デメリット**:

- クラス数が増加
- 既存コードの修正が必要

### 選択肢3: インターフェース分離

**説明**: インターフェースを分離し、実装クラスで統合

**メリット**:

- インターフェースレベルでの責務分離

**デメリット**:

- 実装レベルでの責務分離が不十分
- 複雑性が増加

## 決定理由

### 技術的理由

1. **単一責任原則の遵守**: 各クラスが明確な1つの責務を持つ
2. **テスタビリティの向上**: 読み取りと書き込みのテストを分離できる
3. **セキュリティの向上**: 必要最小限の権限で各クラスを動作させられる
4. **保守性の向上**: 各機能の変更が他に影響しない

### ビジネス的理由

1. **将来の拡張性**: 新しいGoogle Calendar機能の追加が容易
2. **開発効率**: 機能ごとの開発・テストが独立して行える
3. **リスク軽減**: 一つの機能の変更が他に影響しない

## 実装詳細

### クラス構造

```typescript
// 基底クラス（共通認証処理）
abstract class GoogleCalendarBase {
  protected calendar: calendar_v3.Calendar;
  constructor(config: GoogleCalendarConfig) { ... }
}

// 祝日取得専用クラス
class GoogleCalendarHolidayFetcher extends GoogleCalendarBase {
  async fetchHolidays(date: Date): Promise<calendar_v3.Schema$Event[]> { ... }
}

// イベント追加専用クラス
class GoogleCalendarEventCreator extends GoogleCalendarBase {
  async addEvent(eventData: EventData, calendarId: string): Promise<calendar_v3.Schema$Event> { ... }
}

// 後方互換性のための非推奨クラス
@deprecated
class GoogleCalendarAdapter extends GoogleCalendarBase {
  // 内部で新しいクラスを使用
}
```

### 使用例

```typescript
// 祝日取得（読み取り専用）
const holidayFetcher = new GoogleCalendarHolidayFetcher(config);
const holidays = await holidayFetcher.fetchHolidays(date);

// イベント追加（書き込み専用）
const eventCreator = new GoogleCalendarEventCreator(config);
const event = await eventCreator.addEvent(eventData, calendarId);
```

## 後方互換性

既存の`GoogleCalendarAdapter`クラスは非推奨として残し、内部で新しいクラスを使用することで後方互換性を保ちます。これにより、段階的な移行が可能です。

## 影響範囲

### 変更が必要なファイル

- `src/googleCalendar.ts` - 新しいクラス構造の実装
- `src/actionExecutor.ts` - GoogleCalendarEventCreatorを使用
- `src/monthlyEndBusinessDayCheck.ts` - GoogleCalendarHolidayFetcherを使用
- テストファイル - 新しいクラスに対応したテスト

### 影響しないファイル

- 既存の`GoogleCalendarAdapter`を使用しているコード（後方互換性により動作継続）

## リスクと対策

### リスク

1. **移行の複雑性**: 既存コードの修正が必要
2. **学習コスト**: 新しいクラス構造の理解が必要

### 対策

1. **段階的移行**: 後方互換性を保ちながら段階的に移行
2. **ドキュメント整備**: 新しいクラス構造の説明を充実
3. **テスト充実**: 各クラスの単体テストを作成

## 関連ADR

- [ADR-001: LineNotifyAdapterでのMessagingApiClientの遅延インスタンス化](./001-line-notify-adapter-messaging-client-instantiation.md)

## 結論

Google Calendarクラスの責務分離により、単一責任原則に従った設計が実現され、コードの可読性、保守性、テスタビリティが大幅に向上します。後方互換性を保ちながら段階的に移行することで、リスクを最小限に抑えて改善を実現できます。

この決定により、将来の機能拡張や保守作業がより効率的に行えるようになり、長期的なプロジェクトの成功に貢献します。
