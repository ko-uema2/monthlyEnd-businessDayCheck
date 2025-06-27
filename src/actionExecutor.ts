import type { GoogleCalendarAdapter } from "./googleCalendar";
import type { LineNotifyAdapter } from "./lineNotify";

export interface ActionExecutorConfig {
	lineNotify: LineNotifyAdapter;
	googleCalendar: GoogleCalendarAdapter;
	calendarId: string;
}

export class ActionExecutor {
	private lineNotify: LineNotifyAdapter;
	private googleCalendar: GoogleCalendarAdapter;
	private calendarId: string;

	constructor(config: ActionExecutorConfig) {
		this.lineNotify = config.lineNotify;
		this.googleCalendar = config.googleCalendar;
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
			17,
			0,
			0,
		); // 17:00 JST
		const end = new Date(
			currentDate.getFullYear(),
			currentDate.getMonth(),
			currentDate.getDate(),
			17,
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
