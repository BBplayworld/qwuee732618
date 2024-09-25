<template>
    <div>
        <table>
            <thead>
                <tr>
                    <th>Stock</th>
                    <th>Current Price</th>
                    <th>52-Week High</th>
                    <th>% from 52-Week High</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>QQQ</strong></td>
                    <td>482.44</td>
                    <td>503.52</td>
                    <td style="background-color: rgb(129, 30, 30);">-4.2% </td>
                </tr>
                <tr>
                    <td><strong>VOO</strong></td>
                    <td>420.35</td>
                    <td>450</td>
                    <td style="background-color: rgb(20, 86, 20);">1% </td>
                </tr>
                <tr>
                    <td><strong>AAPL</strong></td>
                    <td>145.65</td>
                    <td>180</td>
                    <td style="background-color: rgb(215, 50, 50);">-18.2% </td>
                </tr>
                <tr>
                    <td><strong>NVDA</strong></td>
                    <td>290.55</td>
                    <td>330</td>
                    <td style="background-color: rgb(215, 50, 50);">-16% </td>
                </tr>
                <tr>
                    <td><strong>MSFT</strong></td>
                    <td>310</td>
                    <td>350</td>
                    <td style="background-color: rgb(20, 86, 20);">1% </td>
                </tr>
                <tr>
                    <td><strong>GOOG</strong></td>
                    <td>2800.55</td>
                    <td>3000</td>
                    <td style="background-color: rgb(20, 86, 20);">1% </td>
                </tr>
                <tr>
                    <td><strong>AMZN</strong></td>
                    <td>3500.45</td>
                    <td>3800</td>
                    <td style="background-color: rgb(20, 86, 20);">1% </td>
                </tr>
                <tr>
                    <td><strong>META</strong></td>
                    <td>150.35</td>
                    <td>190</td>
                    <td style="background-color: rgb(86, 20, 20);">-0.2% </td>
                </tr>
                <tr>
                    <td><strong>AVGO</strong></td>
                    <td>180.9</td>
                    <td>200</td>
                    <td style="background-color: rgb(20, 86, 20);">1% </td>
                </tr>
                <tr>
                    <td><strong>TSLA</strong></td>
                    <td>200.25</td>
                    <td>250</td>
                    <td style="background-color: rgb(20, 86, 20);">1% </td>
                </tr>
                <tr>
                    <td><strong>COST</strong></td>
                    <td>250.85</td>
                    <td>270</td>
                    <td style="background-color: rgb(86, 20, 20);">-0.2% </td>
                </tr>
                <tr>
                    <td><strong>ASML</strong></td>
                    <td>280.3</td>
                    <td>320</td>
                    <td style="background-color: rgb(20, 86, 20);">1% </td>
                </tr>
                <tr>
                    <td><strong>NFLX</strong></td>
                    <td>450.5</td>
                    <td>500</td>
                    <td style="background-color: rgb(20, 86, 20);">1% </td>
                </tr>
                <tr>
                    <td><strong>AZN</strong></td>
                    <td>290.1</td>
                    <td>320</td>
                    <td style="background-color: rgb(86, 20, 20);">-0.2% </td>
                </tr>
                <tr>
                    <td><strong>AMD</strong></td>
                    <td>110.75</td>
                    <td>130</td>
                    <td style="background-color: rgb(86, 20, 20);">-0.2% </td>
                </tr>
                <tr>
                    <td><strong>ADBE</strong></td>
                    <td>570</td>
                    <td>600</td>
                    <td style="background-color: rgb(215, 50, 50);">-13% </td>
                </tr>
                <tr>
                    <td><strong>QCOM</strong></td>
                    <td>180.45</td>
                    <td>220</td>
                    <td style="background-color: rgb(86, 20, 20);">-0.2% </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
<style scoped>
h1,
h2 {
    color: #F08;
}

.container {
    display: block;
    justify-content: center;
    position: relative;
    border-right: 2px solid #666;
}

.content {
    overflow-y: auto;
    overflow-x: hidden;
    height: 680px;
    margin: 0 10px 0 0;
    border-collapse: separate;
    border-spacing: 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-radius: 10px;

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

table {
    width: 100%;
    border-radius: 10px;
    text-align: left;
}

th,
td {
    padding: 15px;
    border-bottom: 2px solid #eaeaea;
    max-width: 30px;
}

th {
    background-color: #3f3f3f;
    /* 고급스러운 어두운 파란색 */
    color: #ffffff;
    font-weight: 600;
    text-align: left;
    font-size: 16px;
    line-height: 20px;
}

td {
    font-size: 15px;
    font-weight: bold;
    color: #ddd;
}

tbody tr:hover {
    background-color: #1f1f1f;
    /* 마우스 호버 시 */
}

strong {
    font-weight: bold;
    color: #32D732;
    /* 주식 이름 색상 */
}

td:last-child {
    text-align: right;
    /* 퍼센트 변동값 오른쪽 정렬 */
}

.scrollbar {
    top: 110px;
    right: 20px;
}

/* 중간 크기 화면 (태블릿)에서의 스타일링 */
@media all and (max-width:1279px) {

    th,
    td {
        padding: 10px;
        font-size: 12.5px;
    }

    th {
        text-align: center;
    }
}

@media all and (max-width: 767px) {
    .content {
        margin: 20px 10px 0 0;
        border-right: 0;
    }

    th,
    td {
        font-size: 12px;
    }

    .scrollbar {
        top: 100px;
        right: 13px;
    }
}
</style>