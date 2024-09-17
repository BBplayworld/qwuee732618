<template>
    <div class="container">
    </div>
</template>

<style scoped>
.container {
    position: relative;
    float: left;
    margin: 5px 20px 5px 5px;
    min-width: 70px;
}

/* 중간 크기 화면 (태블릿)에서의 스타일링 */
@media all and (max-width:1279px) {
    .container {
        margin: 5px 5px 5px 5px;
    }
}

@media all and (max-width: 767px) {
    .container {
        min-width: 0px;
    }
}
</style>