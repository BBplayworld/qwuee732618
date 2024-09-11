import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
import isBetween from 'dayjs/plugin/isBetween.js'
import advancedFormat from 'dayjs/plugin/advancedFormat.js'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(isBetween)
dayjs.extend(advancedFormat)

const holiday = [
    '2024-11-28',
    '2024-12-25',
    '2025-01-01',
    '2025-01-20',
    '2025-02-17',
    '2025-04-18',
    '2025-05-26',
    '2025-06-19',
    '2025-07-04',
    '2025-09-01',
    '2025-11-27',
    '2025-12-25',
]

export function useMarketOpen() {
    const marketTimezone = 'America/New_York'

    const now = dayjs().tz(marketTimezone)

    // 현재 요일 가져오기 (0: 일요일, 6: 토요일)
    const dayOfWeek = now.day()

    const marketOpenTime = dayjs().tz(marketTimezone).hour(9).minute(30).second(0)
    const marketCloseTime = dayjs().tz(marketTimezone).hour(16).minute(0).second(0)

    // 토요일(6) 또는 일요일(0)인 경우 시장이 닫혀 있음
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6)

    // 현재 날짜가 휴장일인지 확인
    const isHoliday = holiday.includes(now.format('YYYY-MM-DD'))

    // 시장이 열려 있는지 여부를 결정
    const isMarketOpen = !isWeekend && !isHoliday && now.isBetween(marketOpenTime, marketCloseTime, null, '[)')
    console.log('isMarketOpen', !isWeekend, !isHoliday, now.isBetween(marketOpenTime, marketCloseTime, null, '[)'), isMarketOpen)

    return {
        currentTime: now.format('YYYY-MM-DD HH:mm:ss'),
        isMarketOpen,
    };
}
