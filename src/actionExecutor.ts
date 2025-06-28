import { GoogleCalendarEventCreator } from "./googleCalendar";
import { LineNotifyAdapter } from "./lineNotify";

export interface ActionExecutorConfig {
	// LINE API認証情報
	channelId: string;
	channelSecret: string;
	lineKid: string;
	linePrivateKey: object;
	lineUserId: string;
	// Google Calendar API認証情報
	googleClientEmail: string;
	googlePrivateKey: string;
	calendarId: string;
}

export class ActionExecutor {
	private lineNotify: LineNotifyAdapter;
	private googleCalendar: GoogleCalendarEventCreator;
	private calendarId: string;

	constructor(config: ActionExecutorConfig) {
		// LineNotifyAdapterのインスタンス化
		this.lineNotify = new LineNotifyAdapter({
			channelId: config.channelId,
			channelSecret: config.channelSecret,
			lineKid: config.lineKid,
			linePrivateKey: config.linePrivateKey,
			userId: config.lineUserId,
		});

		// GoogleCalendarEventCreatorのインスタンス化
		this.googleCalendar = new GoogleCalendarEventCreator({
			clientEmail: config.googleClientEmail,
			privateKey: config.googlePrivateKey,
		});

		this.calendarId = config.calendarId;
	}

	/**
	 * 月末最終営業日のアクションを実行
	 * @param currentDate 現在の日付
	 */
	async executeMonthlyEndActions(currentDate: Date): Promise<void> {
		// LINE通知送信
		await this.sendLineNotification();

		// Googleカレンダーに予定追加
		await this.addCalendarEvent(currentDate);
	}

	/**
	 * LINE通知を送信
	 */
	private async sendLineNotification(): Promise<void> {
		await this.lineNotify.sendMessage("‼️今日は本人確認をする日‼️");
	}

	/**
	 * Googleカレンダーに予定を追加
	 * @param currentDate 現在の日付
	 */
	private async addCalendarEvent(currentDate: Date): Promise<void> {
		const start = new Date(
			currentDate.getFullYear(),
			currentDate.getMonth(),
			currentDate.getDate(),
			8,
			0,
			0,
		); // 17:00 JST
		const end = new Date(
			currentDate.getFullYear(),
			currentDate.getMonth(),
			currentDate.getDate(),
			8,
			15,
			0,
		); // 17:15 JST

		await this.googleCalendar.addEvent(
			{
				summary: "月末の最終営業日",
				start,
				end,
				reminders: [180, 120, 60], // 3時間前、2時間前、1時間前
			},
			this.calendarId,
		);
	}
}
