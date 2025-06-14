export default defineEventHandler(async (event) => {
  // Chrome DevTools 및 .well-known 요청들에 대해 빈 응답 반환
  setHeader(event, 'Content-Type', 'application/json')
  return {}
})
