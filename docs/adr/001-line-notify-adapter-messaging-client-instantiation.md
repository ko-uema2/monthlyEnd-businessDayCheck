# ADR-001: LineNotifyAdapterでのMessagingApiClientの遅延インスタンス化

## ステータス

承認済み

## 日付

2024年12月

## 決定者

AI Assistant

## 技術的な決定

LineNotifyAdapterクラスにおいて、MessagingApiClientのインスタンス化をsendMessageメソッド内で実行し、コンストラクタでは行わない。

## 背景

LINE APIを使用したメッセージ送信機能を実装する際、以下の課題が存在した：

1. **動的チャンネルアクセストークン取得**: JWT認証を使用してチャンネルアクセストークンを動的に取得する必要がある
2. **トークンの有効期限**: チャンネルアクセストークンには有効期限があり、期限切れの場合は再取得が必要
3. **認証情報の依存関係**: MessagingApiClientは有効なチャンネルアクセストークンが必要
4. **リソース効率**: 不要なAPI呼び出しを避け、必要な時のみトークンを取得したい

## 検討した選択肢

### 選択肢1: createInstanceメソッドでMessagingApiClientをインスタンス化

```typescript
export class LineNotifyAdapter {
    private client: InstanceType<typeof MessagingApiClient>;
    private userId: string;
    private channelId: string;
    private lineKid: string;
    private linePrivateKey: string;

    private constructor(config: LineNotifyConfig) {
        this.channelId = config.channelId;
        this.channelSecret = config.channelSecret;
        this.lineKid = config.lineKid;
        this.linePrivateKey = config.linePrivateKey;
        this.userId = config.lineKid;
    }

    static async createInstance(config: LineNotifyConfig): Promise<LineNotifyAdapter> {
        const instance = new LineNotifyAdapter(config);
        await instance.initialize();
        return instance;
    }

    private async initialize(): Promise<void> {
        const channelAccessToken = await this.generateChannelAccessToken();
        this.client = new MessagingApiClient({
            channelAccessToken,
        });
    }

    async sendMessage(message: string): Promise<void> {
        await this.client.pushMessage({
            to: this.userId,
            messages: [{ type: "text", text: message }],
        });
    }
}

// 使用例
const lineNotify = await LineNotifyAdapter.createInstance(config);
await lineNotify.sendMessage("Hello");
```

**メリット:**

- TypeScriptのベストプラクティスに準拠（非同期処理をファクトリーメソッドで処理）
- インスタンス化時にエラーを早期発見
- 初期化完了後にインスタンスが返されるため、使用時にエラーが発生しない
- シンプルな使用インターフェース

**デメリット:**

- 使用しない場合でもトークン取得が実行される
- トークン期限切れ時の再取得が困難
- ファクトリーパターンの実装により若干複雑
- インスタンス化が非同期になるため、使用側も非同期処理が必要

### 選択肢2: sendMessageメソッドでMessagingApiClientをインスタンス化（採用）

```typescript
async sendMessage(message: string): Promise<void> {
    // メッセージ送信時にチャンネルアクセストークンを取得
    const channelAccessToken = await this.generateChannelAccessToken();
    
    // クライアントインスタンスを作成
    this.client = new MessagingApiClient({
        channelAccessToken,
    });
    
    await this.client.pushMessage({...});
}
```

**メリット:**

- 必要な時のみトークン取得が実行される
- トークン期限切れ時の自動再取得が可能
- コンストラクタが同期的に保たれる
- エラーハンドリングが明確
- リソース効率が良い

**デメリット:**

- メッセージ送信時に若干のオーバーヘッド
- 実装が若干複雑

### 選択肢3: シングルトンパターンでのトークン管理

```typescript
class TokenManager {
    private static instance: TokenManager;
    private token: string | null = null;
    private expiresAt: number = 0;
    
    static getInstance(): TokenManager {
        if (!TokenManager.instance) {
            TokenManager.instance = new TokenManager();
        }
        return TokenManager.instance;
    }
    
    async getToken(): Promise<string> {
        if (this.isTokenValid()) {
            return this.token!;
        }
        // トークン再取得
    }
}
```

**メリット:**

- トークンの再利用が可能
- 効率的なトークン管理

**デメリット:**

- 実装が複雑
- グローバル状態の管理が必要
- テストが困難

## 決定理由

### 1. トークンの有効期限管理の重要性

チャンネルアクセストークンには有効期限があり、期限切れの場合は再取得が必要です。選択肢1（createInstanceメソッド）でインスタンス化した場合、以下の問題が発生します：

- トークン期限切れ時の再取得が困難
- 古いトークンでAPI呼び出しが失敗する可能性
- エラーハンドリングが複雑になる

選択肢2（sendMessageメソッド）では、メッセージ送信時に毎回最新のトークンを取得するため、有効期限の問題を回避できます。

### 2. リソース効率の向上

メッセージ送信機能を使用しない場合でも、選択肢1では初期化時にトークン取得が実行されるのは非効率です。選択肢2の遅延インスタンス化により、必要な時のみリソースを消費します。

### 3. 使用側の簡潔性

選択肢1では、使用側で非同期処理が必要になります：

```typescript
// 選択肢1の場合
const lineNotify = await LineNotifyAdapter.createInstance(config);
await lineNotify.sendMessage("Hello");

// 選択肢2の場合
const lineNotify = new LineNotifyAdapter(config);
await lineNotify.sendMessage("Hello");
```

選択肢2では、使用側のコードがより簡潔になります。

### 4. エラーハンドリングの明確化

sendMessageメソッド内でインスタンス化することで、エラーハンドリングが明確になります：

```typescript
async sendMessage(message: string): Promise<void> {
    try {
        const channelAccessToken = await this.generateChannelAccessToken();
        this.client = new MessagingApiClient({ channelAccessToken });
        await this.client.pushMessage({...});
    } catch (error) {
        // エラーハンドリングが明確
        throw new Error(`Failed to send LINE message: ${error.message}`);
    }
}
```

### 5. ファクトリーパターンの複雑性

選択肢1のファクトリーパターンは、以下の理由で本プロジェクトには過度に複雑です：

- シンプルなLINE通知機能に対して、ファクトリーパターンは過剰設計
- トークン管理の複雑性が増加
- テストの複雑性が増加

## 影響

### ポジティブな影響

- **保守性の向上**: トークン管理が明確で理解しやすい
- **効率性の向上**: 必要な時のみリソースを消費
- **エラー処理の改善**: エラーハンドリングが明確
- **テスト容易性**: モック化が容易

### 潜在的なリスク

- **パフォーマンス**: メッセージ送信時に若干のオーバーヘッド
- **複雑性**: 実装が若干複雑になる

## 実装例

```typescript
export class LineNotifyAdapter {
    private client: InstanceType<typeof MessagingApiClient>;
    private userId: string;
    private channelId: string;
    private lineKid: string;
    private linePrivateKey: string;

    constructor(config: LineNotifyConfig) {
        // コンストラクタでは認証情報のみを保存
        this.channelId = config.channelId;
        this.lineKid = config.lineKid;
        this.linePrivateKey = config.linePrivateKey;
        this.userId = config.lineKid;
    }

    async sendMessage(message: string): Promise<void> {
        try {
            // メッセージ送信時にチャンネルアクセストークンを取得
            const channelAccessToken = await this.generateChannelAccessToken();
            
            // クライアントインスタンスを作成
            this.client = new MessagingApiClient({
                channelAccessToken,
            });

            await this.client.pushMessage({
                to: this.userId,
                messages: [{ type: "text", text: message }],
            });
        } catch (error) {
            console.error("Failed to send LINE message:", error);
            throw new Error(`Failed to send LINE message: ${error.message}`);
        }
    }
}
```

## 結論

sendMessageメソッド内でMessagingApiClientをインスタンス化する設計（選択肢2）を採用することで、以下の利点が得られます：

1. **トークン管理の最適化**: メッセージ送信時に毎回最新のトークンを取得し、有効期限の問題を回避
2. **リソース効率の向上**: 必要な時のみトークンを取得し、不要なAPI呼び出しを回避
3. **使用側の簡潔性**: ファクトリーパターンを使用せず、シンプルなインスタンス化
4. **エラーハンドリングの明確化**: エラー処理が理解しやすく保守しやすい
5. **適切な複雑性**: シンプルなLINE通知機能に対して、過度に複雑な設計を避ける

選択肢1のファクトリーパターンは、TypeScriptのベストプラクティスに準拠しているものの、本プロジェクトの要件（月末最終営業日の通知）に対しては過度に複雑です。選択肢2の遅延インスタンス化により、機能要件を満たしつつ、保守性と効率性を両立できます。

この設計により、LINE APIとの連携が安全で効率的になり、長期的な保守性が向上します。

## 関連ADR

- なし（初回のADR）

## 参考資料

- [LINE Bot SDK for Node.js](https://line.github.io/line-bot-sdk-nodejs/)
- [TypeScript Constructor Best Practices](https://www.typescriptlang.org/docs/)
- [JWT Authentication with LINE API](https://developers.line.biz/en/docs/messaging-api/channel-access-tokens/)
