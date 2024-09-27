<template>
    <div class="container">
        <h1 :class="{ 'color-animation': animateH1 }">Company <br />News</h1>
        <div class="content">
            <div v-if="items">
                <div v-for="item in items" :key="item.name">
                    <div v-if="Object.keys(item).length > 0" class="box">
                        <div class="name font-opensans">{{ item['related'] }} <span class="headline">[{{
                            item['source'] }}] {{
                                    item['headline']
                                }}</span>
                        </div>
                        <div class="news-content">
                            <!-- 추가된 부분: 이미지 썸네일 -->
                            <div v-if="item['image']" class="thumbnail">
                                <img :src="item['image']" alt="news thumbnail" />
                            </div>
                            <div class="value font-roboto">
                                {{ truncateSummary(item['summary']) }}
                                <div v-if="item['url']" class="url">
                                    <a :href="item['url']" target="_blank">more</a>
                                </div>
                            </div>
                        </div>
                        <div class="date font-roboto">
                            {{ dayjs.unix(item['datetime']).format('YYYY-MM-DD HH:mm') }}
                        </div>
                    </div>
                </div>
            </div>
            <div v-else>
                <InitCompanyNews />
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useFetch } from '#app'
import dayjs from 'dayjs'

const items = ref(null)
const animateH1 = ref(false)

const truncateSummary = (summary) => {
    const maxLength = 200 // 원하는 최대 길이 설정
    return summary.length > maxLength ? summary.substring(0, maxLength) + '...' : summary
}

const fetch = async () => {
    animateH1.value = true
    const { data } = await useFetch('/api/company-news', {
        retry: false
    })

    if (!data.value) {
        return setTimeout(fetch, 100)
    }

    items.value = data.value

    setTimeout(() => {
        animateH1.value = false
    }, 3000)  // Duration of the animation in ms    
}

onMounted(async () => {
    fetch() // 페이지가 로드될 때 최초 데이터 가져오기

    const interval = setInterval(fetch, 60000) // 60,000 = 1분

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
    display: block;
    justify-content: left;
    position: relative;
}

.content {
    margin: 0 10px 0 0;
    line-height: 22px;
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
    margin: 0 0 15px 0;
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

.news-content {
    margin: 10px 0 10px 0;
    display: flex;
    align-items: flex-start;
    /* 이미지와 텍스트 상단을 맞춤 */
}

.thumbnail {
    margin-right: 20px;
    /* 이미지와 텍스트 사이 간격 */
}

.thumbnail img {
    width: 150px;
    /* 이미지 크기 조정 */
    height: auto;
    border-radius: 10px;
}

.value {
    flex-grow: 1;
    /* 텍스트가 가능한 넓게 차지하도록 설정 */
}

.url {
    margin: 5px 0 5px 0;
    font-size: 16px;
    text-align: left;
}

.url a {
    color: #0073e6;
    text-decoration: none;
}

.url a:hover {
    text-decoration: underline;
}

/* 일반적인 모바일 기기 (아이폰, 갤럭시 등) 타겟팅 */
@media all and (max-width: 767px) {
    .container {
        margin-top: 30px;
        margin-bottom: 30px;
    }

    .content {
        margin: 0 10px 0 0;
    }
}
</style>