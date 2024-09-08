import { defineEventHandler } from 'h3'
import { useMarketOpen } from '~/composables/useMarketOpen'

const { isMarketOpen } = useMarketOpen()

export default defineEventHandler(() => {
    return {
        isMarketOpen
    }
})
