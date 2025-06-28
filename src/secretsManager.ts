import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

export interface Credentials {
	channelId: string;
	channelSecret: string;
	lineKid: string;
	linePrivateKey: object;
	lineUserId: string;
	calendarId: string;
	calendarPrivateKey: string;
	calendarClientEmail: string;
}

export interface SecretsManagerConfig {
	region?: string;
}

export class SecretsManagerAdapter {
	private client: SecretsManagerClient;

	constructor(config?: SecretsManagerConfig) {
		this.client = new SecretsManagerClient({
			region: config?.region || process.env.AWS_REGION || "ap-northeast-1",
		});
	}

	async getCredentials(secretName: string): Promise<Credentials> {
		try {
			const command = new GetSecretValueCommand({
				SecretId: secretName,
			});

			const response = await this.client.send(command);

			if (!response.SecretString) {
				throw new Error("Secret string is empty");
			}

			const credentials = JSON.parse(response.SecretString);
			this.validateCredentials(credentials);
			return credentials;
		} catch (error) {
			console.error("Failed to get credentials from Secrets Manager:", error);
			throw new Error(
				`Failed to get credentials: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	private validateCredentials(
		credentials: unknown,
	): asserts credentials is Credentials {
		if (
			typeof credentials !== "object" ||
			credentials === null ||
			!("channelId" in credentials) ||
			!("channelSecret" in credentials) ||
			!("lineKid" in credentials) ||
			!("linePrivateKey" in credentials) ||
			!("lineUserId" in credentials) ||
			!("calendarId" in credentials) ||
			!("calendarPrivateKey" in credentials) ||
			!("calendarClientEmail" in credentials)
		) {
			throw new Error("Missing required credential fields");
		}
	}
}
