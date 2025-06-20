import { defineEventHandler, getQuery, createError } from 'h3'
import { clearFileCache, writeUpdateState, executeDefensiveReset } from '~/server/utils/cache'

// 어드민 개인키 환경 변수에서 가져오기
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY

interface ClearCacheResponse {
  success: boolean
  message: string
  timestamp: number
  clearedItems: string[]
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const providedKey = query.key as string
  const resetType = (query.type as string) || 'cache' // 'cache' | 'full' | 'defensive'

  // 1. 어드민 키 검증
  if (!ADMIN_SECRET_KEY) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Admin secret key not configured',
    })
  }

  if (!providedKey) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Admin key required. Use ?key=YOUR_ADMIN_KEY',
    })
  }

  if (providedKey !== ADMIN_SECRET_KEY) {
    // 보안 로그 (실제 환경에서는 더 자세한 로깅 권장)
    console.warn(`[SECURITY] Unauthorized cache clear attempt with key: ${providedKey?.substring(0, 4)}***`)

    throw createError({
      statusCode: 403,
      statusMessage: 'Invalid admin key',
    })
  }

  // 2. 캐시 삭제 실행
  const clearedItems: string[] = []
  const timestamp = Date.now()

  try {
    console.log(`[ADMIN] Cache clear requested by admin - type: ${resetType}`)

    switch (resetType) {
      case 'cache':
        // 파일 캐시만 삭제
        await clearFileCache()
        clearedItems.push('file_cache')
        console.log('[ADMIN] File cache cleared successfully')
        break

      case 'full':
        // 파일 캐시 + 상태 리셋
        await clearFileCache()
        await writeUpdateState({
          hasCompletedInitialUpdate: false,
          isBackgroundUpdateInProgress: false,
          callCount: 0,
          lastResetTimestamp: timestamp,
        })
        clearedItems.push('file_cache', 'update_state')
        console.log('[ADMIN] Full cache and state reset completed')
        break

      case 'defensive':
        // 방어 로직 실행 (가장 강력한 리셋)
        await executeDefensiveReset()
        clearedItems.push('file_cache', 'update_state', 'defensive_reset')
        console.log('[ADMIN] Defensive reset executed')
        break

      default:
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid reset type. Use: cache, full, or defensive',
        })
    }

    const response: ClearCacheResponse = {
      success: true,
      message: `Cache cleared successfully (${resetType} mode)`,
      timestamp,
      clearedItems,
    }

    console.log(`[ADMIN] Cache clear completed successfully:`, response)
    return response
  } catch (error: any) {
    console.error('[ADMIN] Cache clear failed:', error)

    throw createError({
      statusCode: 500,
      statusMessage: `Cache clear failed: ${error?.message || 'Unknown error'}`,
    })
  }
})
