<template>
    <div class="container">
        <h1 :class="{ 'color-animation': animateH1 }">Economic Indicators</h1>
        <div class="content">
            <div v-if="result">
                <div v-for="item in result">
                    <p><strong>{{ item.name }}</strong> &nbsp;<b style="color: #d73232">{{ item.value }}</b> ({{
            item.date
                        }})</p>
                </div>
            </div>
            <div v-else>
                <p>Loading...</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useFetch } from '#app'

const result = ref(null)
const animateH1 = ref(false)

const fetch = async () => {
    animateH1.value = true
    const { data } = await useFetch('/api/economicIndicators')
    if (!data.value) {
        return fetch()
    }

    result.value = data.value

    // Stop the animation after it's done
    setTimeout(() => {
        animateH1.value = false
    }, 3000)  // Duration of the animation in ms       
}

onMounted(async () => {
    fetch() // 페이지가 로드될 때 최초 데이터 가져오기

    // 1분마다 데이터 갱신
    const interval = setInterval(() => {
        fetch()
    }, 80000) // 1분 20초

    // 컴포넌트가 언마운트될 때 interval 정리
    onUnmounted(() => {
        clearInterval(interval)
    })
})
</script>

<style scoped>
@keyframes textColorChange {
    0% {
        color: white;
    }

    50% {
        color: #d73232;
    }

    100% {
        color: white;
    }
}

.color-animation {
    animation: textColorChange 4s ease-in-out;
}

.container {
    border: 2px solid #ddd;
    display: block;
    justify-content: left;
    align-items: center;
}

.content {
    overflow-y: scroll;
    height: 690px;
}

p {
    font-size: 15.4px;
    margin: 10px 2px 12px 2px;
    line-height: 0.55cm;
}

/* 중간 크기 화면 (태블릿)에서의 스타일링 */
@media all and (max-width:1279px) {
    .container {
        max-width: 40%;
        max-height: 350px;
        margin-right: 10px;
    }

    .content {
        max-height: 250px;
    }
}
</style>