// composables/useMarketOpen.ts
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import isBetween from 'dayjs/plugin/isBetween'
import advancedFormat from 'dayjs/plugin/advancedFormat'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(isBetween)
dayjs.extend(advancedFormat)

export function useMarketOpen() {
    const marketTimezone = 'America/New_York'

    const now = dayjs().tz(marketTimezone)

    const marketOpenTime = dayjs().tz(marketTimezone).hour(9).minute(30)
    const marketCloseTime = dayjs().tz(marketTimezone).hour(16).minute(0)

    const isMarketOpen = now.isBetween(marketOpenTime, marketCloseTime, null, '[)')

    return {
        currentTime: now.format('YYYY-MM-DD HH:mm:ss'),
        isMarketOpen,
    };
}
