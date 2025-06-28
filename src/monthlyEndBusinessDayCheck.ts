import type { ScheduledEvent } from "aws-lambda";
import { ActionExecutor } from "./actionExecutor";
import { BusinessDayChecker } from "./businessDayChecker";
import { GoogleCalendarHolidayFetcher } from "./googleCalendar";
import { SecretsManagerAdapter } from "./secretsManager";

// 環境変数の型定義
interface Env {
	SECRETS_NAME: string;
}

// ログレベルの定義
type LogLevel = "info" | "warn" | "error";

// 構造化ログ出力関数
function log(level: LogLevel, message: string, data?: unknown): void {
	const logEntry: Record<string, unknown> = {
		timestamp: new Date().toISOString(),
		level,
		message,
	};

	if (data !== undefined) {
		logEntry.data = data;
	}

	console.log(JSON.stringify(logEntry));
}

// 環境変数の取得
const env = process.env as unknown as Env;

// アプリケーションサービス層
export const handler = async (event: ScheduledEvent): Promise<void> => {
	const startTime = new Date();
	log("info", "月末営業日チェック処理開始", {
		startTime: startTime.toISOString(),
		eventId: event.id,
		eventTime: event.time,
	});

	try {
		// EventBridgeから実行日時を取得
		const executionTime = new Date(event.time);
		log("info", "EventBridge実行日時取得", {
			executionTime: executionTime.toISOString(),
			eventTime: event.time,
		});

		// Secrets Managerから認証情報取得
		log("info", "Secrets Managerから認証情報取得開始");
		const secretsManager = new SecretsManagerAdapter();
		const credentials = await secretsManager.getCredentials(env.SECRETS_NAME);
		log("info", "認証情報取得成功");

		// アクション実行クラスの初期化
		log("info", "ActionExecutor初期化開始");
		const actionExecutor = new ActionExecutor({
			channelId: credentials.channelId,
			channelSecret: credentials.channelSecret,
			lineKid: credentials.lineKid,
			linePrivateKey: credentials.linePrivateKey,
			googleClientEmail: credentials.calendarClientEmail,
			googlePrivateKey: credentials.calendarPrivateKey,
			calendarId: credentials.calendarId,
		});
		log("info", "ActionExecutor初期化完了");

		// GoogleCalendarHolidayFetcherの初期化（祝日取得用）
		log("info", "GoogleCalendarHolidayFetcher初期化開始");
		const googleCalendar = new GoogleCalendarHolidayFetcher({
			clientEmail: credentials.calendarClientEmail,
			privateKey: credentials.calendarPrivateKey,
		});
		log("info", "GoogleCalendarHolidayFetcher初期化完了");

		// ドメイン層の初期化
		log("info", "祝日情報取得開始");
		const holidays = await googleCalendar.fetchHolidays(executionTime);
		log("info", "祝日情報取得成功", { holidayCount: holidays.length });

		const businessDayChecker = new BusinessDayChecker(holidays);
		log("info", "BusinessDayChecker初期化完了");

		// 最終営業日判定（EventBridgeの実行日時を使用）
		log("info", "月末最終営業日判定開始");
		const isLastBusinessDay =
			businessDayChecker.isLastBusinessDay(executionTime);
		log("info", "月末最終営業日判定完了", {
			isLastBusinessDay,
			executionDate: executionTime.toISOString(),
		});

		// 最終営業日判定とアクション実行
		if (isLastBusinessDay) {
			log("info", "月末最終営業日を検出、アクション実行開始");

			try {
				await actionExecutor.executeMonthlyEndActions(executionTime);
				log("info", "月末最終営業日アクション実行成功");
			} catch (error) {
				log("error", "月末最終営業日アクション実行失敗", {
					error: error instanceof Error ? error.message : "Unknown error",
					stack: error instanceof Error ? error.stack : undefined,
				});
				throw error;
			}
		} else {
			log("info", "月末最終営業日ではないため、アクション実行をスキップ");
		}

		const endTime = new Date();
		const processingTime = endTime.getTime() - startTime.getTime();
		log("info", "月末営業日チェック処理完了", {
			processingTimeMs: processingTime,
			endTime: endTime.toISOString(),
		});
	} catch (error) {
		const endTime = new Date();
		const processingTime = endTime.getTime() - startTime.getTime();

		log("error", "月末営業日チェック処理でエラーが発生", {
			error: error instanceof Error ? error.message : "Unknown error",
			stack: error instanceof Error ? error.stack : undefined,
			processingTimeMs: processingTime,
			endTime: endTime.toISOString(),
		});

		// エラーを再スローしてデッドレターキューで再試行
		throw error;
	}
};
