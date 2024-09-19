import { defineEventHandler } from 'h3'
import { useMarketOpen } from '~/composables/useMarketOpen'

export default defineEventHandler(() => {
    const { isMarketOpen } = useMarketOpen()
    return {
        isMarketOpen
    }
})
