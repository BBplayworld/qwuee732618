<template>
    <div class="container">
        <h1>Economic Indicatorss</h1>
        <div v-if="indicators">
            <p><strong>GDP:</strong> {{ indicators.gdp.value }} ({{ indicators.gdp.date }})</p>
            <p><strong>Unemployment Rate:</strong> {{ indicators.unemployment.value }}% ({{ indicators.unemployment.date
                }})</p>
            <p><strong>Inflation Rate (CPI):</strong> {{ indicators.inflation.value }} ({{ indicators.inflation.date }})
            </p>
        </div>
        <div v-else>
            <p>Loading...</p>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useFetch } from '#app'

const indicators = ref(null)

const fetch = async () => {
    const { data } = await useFetch('/api/economicIndicators')
    if (!data.value) {
        return fetch()
    }

    indicators.value = data.value
}

onMounted(async () => {
    fetch() // 페이지가 로드될 때 최초 데이터 가져오기

    // 1분마다 데이터 갱신
    const interval = setInterval(() => {
        fetch()
    }, 60000) // 60,000 밀리초 = 1분

    // 컴포넌트가 언마운트될 때 interval 정리
    onUnmounted(() => {
        clearInterval(interval)
    })
})
</script>

<style scoped>
h1,
h2 {
    margin: 20px;
}

p {
    margin: 10px 5px 10px 5px;
}

.container {
    border: 2px solid #ddd;
    display: block;
    justify-content: left;
    align-items: center;
    margin: 5px;
}
</style>