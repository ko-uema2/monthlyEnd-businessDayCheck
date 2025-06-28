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
                        const start = holiday.start?.date
                                ? new Date(holiday.start.date)
                                : holiday.start?.dateTime
                                ? new Date(holiday.start.dateTime)
                                : undefined;
                        if (!start) {
                                return false;
                        }

                        const end = holiday.end?.date
                                ? new Date(holiday.end.date)
                                : holiday.end?.dateTime
                                ? new Date(holiday.end.dateTime)
                                : undefined;

                        if (end) {
                                return start <= date && date < end;
                        }

                        return start.toDateString() === date.toDateString();
                });
        }
}
