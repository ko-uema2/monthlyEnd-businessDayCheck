import { channelAccessToken, messagingApi } from "@line/bot-sdk";
import * as jose from "node-jose";

const { MessagingApiClient } = messagingApi;
const { ChannelAccessTokenClient } = channelAccessToken;

export interface LineNotifyConfig {
	channelId: string;
	channelSecret: string;
	lineKid: string;
	linePrivateKey: string;
}

export class LineNotifyAdapter {
	private client: InstanceType<typeof MessagingApiClient>;
	private userId: string;
	private channelId: string;
	private channelSecret: string;
	private lineKid: string;
	private linePrivateKey: string;

	constructor(config: LineNotifyConfig) {
		this.channelId = config.channelId;
		this.channelSecret = config.channelSecret;
		this.lineKid = config.lineKid;
		this.linePrivateKey = config.linePrivateKey;
		this.userId = config.lineKid; // lineKidをuserIdとして使用
	}

	private async generateChannelAccessToken(): Promise<string> {
		try {
			// JWTヘッダーを設定
			const header = {
				alg: "RS256",
				typ: "JWT",
				kid: this.lineKid,
			};

			// JWTペイロードを設定
			const payload = {
				iss: this.channelId,
				sub: this.channelId,
				aud: "https://api.line.me/",
				exp: Math.floor(new Date().getTime() / 1000) + 60 * 30, // 30分後
				token_exp: 60 * 60 * 24 * 30, // 30日
			};

			// プライベートキーをパース
			const privateKey = JSON.parse(this.linePrivateKey);

			// JWTトークンを生成
			const jwtToken = await (
				jose.JWS.createSign(
					{ format: "compact", fields: header },
					privateKey as jose.JWK.Key,
				) as jose.JWS.Signer
			)
				.update(JSON.stringify(payload))
				.final();

			// LINE APIにリクエストを送信してチャンネルアクセストークンを取得
			const channelAccessTokenClient = new ChannelAccessTokenClient({});
			const response = await channelAccessTokenClient.issueChannelTokenByJWT(
				"client_credentials",
				"urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
				jwtToken.toString(),
			);

			const tokenData = response.access_token;

			if (!tokenData) {
				throw new Error("No access token in response");
			}

			return tokenData;
		} catch (error) {
			console.error("Failed to generate channel access token:", error);
			throw new Error(
				`Failed to generate channel access token: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
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
				messages: [
					{
						type: "text",
						text: message,
					},
				],
			});
		} catch (error) {
			console.error("Failed to send LINE message:", error);
			throw new Error(
				`Failed to send LINE message: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}
}
