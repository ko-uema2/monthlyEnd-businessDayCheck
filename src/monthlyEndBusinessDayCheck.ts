import { BusinessDayChecker } from "./businessDayChecker";
import { GoogleCalendarAdapter } from "./googleCalendar";
import { LineNotifyAdapter } from "./lineNotify";

// 環境変数の型定義
interface Env {
	CALENDAR_ID: string;
	LINE_CHANNEL_ACCESS_TOKEN: string;
	LINE_USER_ID: string;
	GOOGLE_CLIENT_EMAIL: string;
	GOOGLE_PRIVATE_KEY: string;
}

// 環境変数の取得
const env = process.env as unknown as Env;

// アプリケーションサービス層
export const handler = async (): Promise<void> => {
	try {
		const now = new Date();

		// インフラ層の初期化
		const googleCalendar = new GoogleCalendarAdapter({
			clientEmail: env.GOOGLE_CLIENT_EMAIL,
			privateKey: env.GOOGLE_PRIVATE_KEY,
		});
		const lineNotify = new LineNotifyAdapter({
			channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN,
			userId: env.LINE_USER_ID,
		});

		// ドメイン層の初期化
		const holidays = await googleCalendar.fetchHolidays(now);
		const businessDayChecker = new BusinessDayChecker(holidays);

		// 最終営業日判定と通知
		if (businessDayChecker.isLastBusinessDay(now)) {
			await lineNotify.sendMessage("‼️今日は本人確認をする日‼️");
		}
	} catch (error) {
		console.error("Error:", error);
		throw error;
	}
};
