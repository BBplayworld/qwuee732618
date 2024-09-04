<template>
    <div class="container">
        <h1 :class="{ 'color-animation': animateH1 }">Company <br />News</h1>
        <div class="content" @scroll="handleScroll">
            <div v-if="result">
                <div v-for="item in result" :key="item.name">
                    <div v-if="Object.keys(item).length > 0" class="box">
                        <div class="name font-opensans">{{ item['related'] }} <span class="headline">[{{
            item['source'] }}] {{
            item['headline']
        }}</span>
                        </div>
                        <div class="value font-roboto">{{ item['summary'] }}</div>
                        <div class="date font-roboto">
                            {{ dayjs.unix(item['datetime']).format('YYYY-MM-DD HH:mm') }}
                        </div>
                    </div>
                </div>
            </div>
            <div v-else>
                <p>Loading...</p>
            </div>
        </div>
        <div class="scrollbar" v-show="showScrollbar"></div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useFetch } from '#app'
import dayjs from 'dayjs'

const result = ref(null)
const animateH1 = ref(false)
const showScrollbar = ref(true)

const handleScroll = () => {
    showScrollbar.value = false
}

const fetch = async () => {
    animateH1.value = true
    const { data } = await useFetch('/api/company-news', {
        retry: false
    })

    if (!data.value) {
        return setTimeout(fetch, 1000)
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
    max-width: 470px;
    display: block;
    justify-content: left;
    position: relative;
}

.content {
    overflow-y: scroll;
    height: 690px;

    -webkit-overflow-scrolling: touch;

    /* WebKit 기반 브라우저 (Chrome, Safari, Whale)에서 스크롤바 스타일링 */
    &::-webkit-scrollbar {
        width: 5px;
    }

    &::-webkit-scrollbar-thumb {
        background-color: #111;
        border-radius: 6px;
        border: 3px solid #ddd;
    }

    &::-webkit-scrollbar-track {
        background-color: #111;
        border-radius: 6px;
    }
}

.scrollbar {
    right: 9px;
    width: 7px;
}

/* Box */
.box {
    border-radius: 7px;
    padding: 10px;
    color: white;
    /* 너비를 고정하여 일정한 크기의 박스 유지 */
    text-align: center;
    margin-bottom: 10px;
}

.box .name {
    font-size: 17px;
    color: #32D732;
    font-weight: bold;
    padding: 10px 0;
    border-radius: 8px 8px 0 0;
    text-align: left;
}

.box .headline {
    color: #28ac28;
}

.box .value {
    font-size: 15px;
    color: white;
    /* 중간 강조 색상 */
    margin: 5px 0 15px 0;
    font-weight: bold;
    text-align: left;
}

.box .date {
    font-size: 14px;
    background-color: #e0e0e0;
    color: black;
    padding: 10px 0;
    border-radius: 0 0 5px 5px;
    font-weight: bold;
}

/* 중간 크기 화면 (태블릿)에서의 스타일링 */
@media all and (max-width:1279px) {
    .container {
        max-width: 100%;
        margin: 0 0 100px 0;
    }

    .content {
        max-height: 350px;
    }
}

/* 일반적인 모바일 기기 (아이폰, 갤럭시 등) 타겟팅 */
@media all and (max-width: 767px) {
    .container {
        max-width: 100%;
        margin: 0 0 120px 0;
    }

    .content {
        height: auto;
        max-height: 710px;
    }
}
</style>