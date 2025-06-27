import { messagingApi } from "@line/bot-sdk";

const { MessagingApiClient } = messagingApi;

export interface LineNotifyConfig {
	channelAccessToken: string;
	userId: string;
}

export class LineNotifyAdapter {
	private client: InstanceType<typeof MessagingApiClient>;
	private userId: string;

	constructor(config: LineNotifyConfig) {
		this.client = new MessagingApiClient({
			channelAccessToken: config.channelAccessToken,
		});
		this.userId = config.userId;
	}

	async sendMessage(message: string): Promise<void> {
		await this.client.pushMessage({
			to: this.userId,
			messages: [
				{
					type: "text",
					text: message,
				},
			],
		});
	}
}
