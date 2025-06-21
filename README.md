# 月末営業日チェック

## 事前準備

### LINE

#### LINE Messaging API を有効化

[Messaging API を始めよう](https://developers.line.biz/ja/docs/messaging-api/getting-started/)

1. LINE公式アカウントを作成する
2. LINE公式アカウントで Messaging API を有効化する

#### チャネルアクセストークンを取得

[チャネルアクセストークン](https://developers.line.biz/ja/docs/basics/channel-access-token/)

- チャネルアクセストークンの種類
  - 任意の有効期間を指定できるチャネルアクセストークン (チャネルアクセストークンv2.1)
  - ステートレスチャネルアクセストークン
  - 短期のチャネルアクセストークン
  - 長期のチャネルアクセストークン

今回は`チャネルアクセストークンv2.1`を使用する。  
[チャネルアクセストークンv2.1](https://developers.line.biz/ja/docs/messaging-api/access-token/)

1. アサーション署名キーのキーペアを作成する

    ```bash
    python jwt.py
    ```

2. 公開鍵を登録し、kid を取得する

3. 秘密鍵をjsonファイルに保存する


### GooGle Calendar API を有効化
