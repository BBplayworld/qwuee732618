<template>
    <div class="copyright">{{ dayjs().format('YYYY-MM-DD HH:mm') }} Market
        {{ items && items['isMarketOpen'] ? 'open' : 'closed' }}
        © BBstoqq
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import dayjs from 'dayjs'

const items = ref(null)
const fetch = async () => {
    const { data } = await useFetch('/api/market', {
        retry: false,
        cache: 'no-cache'
    })

    if (!data.value) {
        return setTimeout(fetch, 1000)
    }

    items.value = data.value
}

onMounted(() => {
    fetch() // 페이지가 로드될 때 최초 데이터 가져오기

    const interval = setInterval(() => {
        fetch()
    }, 60000) // 1분

    // 컴포넌트가 언마운트될 때 interval 정리
    onUnmounted(() => {
        clearInterval(interval)
    })
})
</script>

<style scoped>
.copyright {
    font-size: 14.5px;
    color: #666;
    padding-right: 35px;
    font-weight: 600;
}

@media all and (max-width: 767px) {
    .copyright {
        text-align: right;
        margin-right: 20px;
        font-size: 12px;
        padding: 45px 5px 0 0;
        line-height: 17px;
    }
}
</style>