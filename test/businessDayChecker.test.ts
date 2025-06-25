import type { calendar_v3 } from "googleapis";
import { BusinessDayChecker } from "../src/businessDayChecker";

describe("BusinessDayChecker", () => {
	// 祝日データのユーティリティ
        const makeHoliday = (dateStr: string): calendar_v3.Schema$Event => ({
                start: { dateTime: new Date(dateStr).toISOString() },
        });

        // 終日イベント用の祝日データ
        const makeAllDayHoliday = (dateStr: string): calendar_v3.Schema$Event => ({
                start: { date: dateStr },
        });

	test("月末が平日で祝日でない場合、その日が最終営業日", () => {
		// 2024-07-31(水)は平日
		const checker = new BusinessDayChecker([]);
		expect(checker.isLastBusinessDay(new Date("2024-07-31"))).toBe(true);
		expect(checker.isLastBusinessDay(new Date("2024-07-30"))).toBe(false);
	});

	test("月末が土日の場合、直前の平日が最終営業日", () => {
		// 2024-08-31(土)
		const checker = new BusinessDayChecker([]);
		expect(checker.isLastBusinessDay(new Date("2024-08-30"))).toBe(true); // 金曜
		expect(checker.isLastBusinessDay(new Date("2024-08-31"))).toBe(false); // 土曜
	});

        test("月末が祝日の場合、直前の平日が最終営業日", () => {
                // 2024-07-31(水)が祝日
                const holidays = [makeHoliday("2024-07-31")];
                const checker = new BusinessDayChecker(holidays);
                expect(checker.isLastBusinessDay(new Date("2024-07-30"))).toBe(true); // 前日が最終営業日
                expect(checker.isLastBusinessDay(new Date("2024-07-31"))).toBe(false);
        });

        test("終日イベントとして指定された祝日を考慮できる", () => {
                // 2024-07-31(水)が祝日（終日）
                const holidays = [makeAllDayHoliday("2024-07-31")];
                const checker = new BusinessDayChecker(holidays);
                expect(checker.isLastBusinessDay(new Date("2024-07-30"))).toBe(true);
                expect(checker.isLastBusinessDay(new Date("2024-07-31"))).toBe(false);
        });

	test("月末が土日かつ直前の平日が祝日の場合、さらに前の平日が最終営業日", () => {
		// 2024-08-31(土), 2024-08-30(金)が祝日
		const holidays = [makeHoliday("2024-08-30")];
		const checker = new BusinessDayChecker(holidays);
		expect(checker.isLastBusinessDay(new Date("2024-08-29"))).toBe(true); // 木曜
		expect(checker.isLastBusinessDay(new Date("2024-08-30"))).toBe(false);
		expect(checker.isLastBusinessDay(new Date("2024-08-31"))).toBe(false);
	});

	test("祝日がない場合の挙動", () => {
		const checker = new BusinessDayChecker([]);
		expect(checker.isLastBusinessDay(new Date("2024-09-30"))).toBe(true);
	});
});
