import { endOfDay, startOfDay } from "date-fns";
import { JWT } from "google-auth-library";
import { type calendar_v3, google } from "googleapis";

export interface GoogleCalendarConfig {
	clientEmail: string;
	privateKey: string;
}

export interface EventData {
	summary: string;
	start: Date;
	end: Date;
	description?: string;
	location?: string;
	reminders?: number[]; // 分単位のリマインダー（例: [180, 120, 60]）
}

/**
 * Google Calendar APIの共通認証処理を提供する基底クラス
 */
export abstract class GoogleCalendarBase {
	protected calendar: calendar_v3.Calendar;

	constructor(config: GoogleCalendarConfig) {
		this.calendar = google.calendar({
			version: "v3",
			auth: new JWT({
				email: config.clientEmail,
				key: config.privateKey.replace(/\n/g, "\n"),
				scopes: ["https://www.googleapis.com/auth/calendar"],
			}),
		});
	}
}

/**
 * Google Calendarから祝日情報を取得するクラス
 */
export class GoogleCalendarHolidayFetcher extends GoogleCalendarBase {
	async fetchHolidays(date: Date): Promise<calendar_v3.Schema$Event[]> {
		const calendarId = "ja.japanese#holiday@group.v.calendar.google.com";
		const response = await this.calendar.events.list({
			calendarId,
			timeMin: startOfDay(date).toISOString(),
			timeMax: endOfDay(date).toISOString(),
			singleEvents: true,
		});

		return response.data.items ?? [];
	}
}

/**
 * Google Calendarにイベントを追加するクラス
 */
export class GoogleCalendarEventCreator extends GoogleCalendarBase {
	async addEvent(
		eventData: EventData,
		calendarId: string,
	): Promise<calendar_v3.Schema$Event> {
		const event: calendar_v3.Schema$Event = {
			summary: eventData.summary,
			start: {
				dateTime: eventData.start.toISOString(),
				timeZone: "Asia/Tokyo",
			},
			end: {
				dateTime: eventData.end.toISOString(),
				timeZone: "Asia/Tokyo",
			},
		};

		if (eventData.description) {
			event.description = eventData.description;
		}

		if (eventData.location) {
			event.location = eventData.location;
		}

		if (eventData.reminders && eventData.reminders.length > 0) {
			event.reminders = {
				useDefault: false,
				overrides: eventData.reminders.map((minutes) => ({
					method: "popup",
					minutes,
				})),
			};
		}

		const response = await this.calendar.events.insert({
			calendarId,
			requestBody: event,
		});

		return response.data;
	}
}

/**
 * @deprecated 後方互換性のため残しています。新しいコードでは GoogleCalendarHolidayFetcher または GoogleCalendarEventCreator を使用してください。
 */
export class GoogleCalendarAdapter extends GoogleCalendarBase {
	async fetchHolidays(date: Date): Promise<calendar_v3.Schema$Event[]> {
		const auth = this.calendar.context._options.auth as JWT;
		if (!auth.email || !auth.key) {
			throw new Error("認証情報が不完全です");
		}
		const holidayFetcher = new GoogleCalendarHolidayFetcher({
			clientEmail: auth.email,
			privateKey: auth.key,
		});
		return holidayFetcher.fetchHolidays(date);
	}

	async addEvent(
		eventData: EventData,
		calendarId: string,
	): Promise<calendar_v3.Schema$Event> {
		const auth = this.calendar.context._options.auth as JWT;
		if (!auth.email || !auth.key) {
			throw new Error("認証情報が不完全です");
		}
		const eventCreator = new GoogleCalendarEventCreator({
			clientEmail: auth.email,
			privateKey: auth.key,
		});
		return eventCreator.addEvent(eventData, calendarId);
	}
}
