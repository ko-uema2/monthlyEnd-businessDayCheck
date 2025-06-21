import { format, subDays } from "date-fns";
import { isWeekend } from "date-fns";
import type { calendar_v3 } from "googleapis";

export class BusinessDayChecker {
	constructor(private readonly holidays: calendar_v3.Schema$Event[]) {}

	isLastBusinessDay(date: Date): boolean {
		const lastBusinessDay = this.getLastBusinessDayOfMonth(date);
		return format(date, "yyyy-MM-dd") === format(lastBusinessDay, "yyyy-MM-dd");
	}

	private getLastBusinessDayOfMonth(date: Date): Date {
		let checkingDate = new Date(date.getFullYear(), date.getMonth() + 1, 0); // 当月の末日

		while (this.isHoliday(checkingDate)) {
			checkingDate = subDays(checkingDate, 1);
		}

		return checkingDate;
	}

	private isHoliday(date: Date): boolean {
		// 土日の判定
		if (isWeekend(date)) {
			return true;
		}

		// 祝日の判定
		return this.holidays.some((holiday) => {
			// 終日イベントの場合（dateプロパティを使用）
			if (holiday.start?.date) {
				const holidayDate = new Date(holiday.start.date);
				return holidayDate.toDateString() === date.toDateString();
			}

			// 時刻指定イベントの場合（dateTimeプロパティを使用）
			if (holiday.start?.dateTime) {
				const holidayDateTime = new Date(holiday.start.dateTime);
				return holidayDateTime.toDateString() === date.toDateString();
			}

			return false;
		});
	}
}
