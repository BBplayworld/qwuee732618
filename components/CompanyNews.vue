<template>
    <div class="container">
        <h1 :class="{ 'color-animation': animateH1 }">Company News</h1>
        <div class="content">
            <div v-if="result">
                <div v-for="item in result">
                    <div v-if="item['datetime']">
                        <p><strong style="color: #32D732;">{{ item['name'] }}</strong>
                            &nbsp;{{ dayjs.unix(item['datetime']).format('YYYY-MM-DD HH:mm') }}
                            &nbsp;<span style="color: #28ac28">{{ item['headline'] }}</span>
                        </p>
                        <p>
                            {{ item['summary'] }}
                        </p>
                        <br />
                    </div>
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
import dayjs from 'dayjs'

const result = ref(null)
const animateH1 = ref(false)

const fetch = async () => {
    animateH1.value = true
    const { data } = await useFetch('/api/company-news')
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

    const interval = setInterval(() => {
        fetch()
    }, 80000) // 60,000 = 1분20초

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
        color: #32D732;
    }

    100% {
        color: white;
    }
}

.color-animation {
    animation: textColorChange 4s ease-in-out;
}

.container {
    max-width: 560px;
    border: 2px solid #ddd;
    display: block;
    justify-content: left;
    align-items: left;
    padding: 20px 0 10px 10px;
}

.content {
    overflow-y: scroll;
    height: 690px;
}

p {
    font-size: 15.5px;
    margin: 10px 5px 10px 5px;
    line-height: 0.58cm;
}

/* 중간 크기 화면 (태블릿)에서의 스타일링 */
@media all and (max-width:1279px) {
    .container {
        max-width: 60%;
        max-height: 350px;
    }

    .content {
        max-height: 250px;
    }
}
</style>