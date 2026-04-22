let currentUser = null;
let currentAuthMode = 'login'; // 'login' or 'signup'

function toggleAuthMode(mode) {
    currentAuthMode = mode;
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const loginText = document.getElementById('auth-login-text');
    const signupText = document.getElementById('auth-signup-text');
    const signupExtra = document.getElementById('auth-signup-extra');
    const submitBtn = document.getElementById('auth-submit-btn');

    if (mode === 'login') {
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
        loginText.style.display = 'block';
        signupText.style.display = 'none';
        signupExtra.style.display = 'none';
        submitBtn.textContent = 'ログインしてはじめる';
    } else {
        tabLogin.classList.remove('active');
        tabSignup.classList.add('active');
        loginText.style.display = 'none';
        signupText.style.display = 'block';
        signupExtra.style.display = 'block';
        submitBtn.textContent = '新規登録してはじめる';
    }
}

async function login() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (!email || !password) {
        showToast('必要事項を入力してください');
        return;
    }

    const endpoint = currentAuthMode === 'login' ? '/api/auth/login' : '/api/auth/signup';

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            currentUser = data.user.id;
            const userEmail = data.user.email;
            const userName = data.user.name;

            document.getElementById('sidebar-user-name').textContent = userName;
            document.getElementById('profile-name-input').value = userName;

            document.getElementById('auth-screen').classList.add('hidden');
            document.getElementById('auth-screen').classList.remove('active');
            document.getElementById('app-layout').classList.remove('hidden');

            showToast(currentAuthMode === 'login' ? 'ログインしました！' : 'アカウントを作成しました！');
            init(); // ログイン後にデータ取得開始
        } else {
            showToast(data.error || 'エラーが発生しました');
        }
    } catch (e) {
        showToast('サーバーに接続できません');
    }
}

async function saveProfile() {
    const newName = document.getElementById('profile-name-input').value;
    if (newName.trim() === '') {
        showToast('アカウント名を入力してください', 'warning');
        return;
    }

    try {
        const res = await fetch('/api/user/update', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id: currentUser, name: newName })
        });

        if (res.ok) {
            document.getElementById('sidebar-user-name').textContent = newName;
            showToast('アカウント設定を保存しました', 'success');
        } else {
            showToast('保存に失敗しました', 'warning');
        }
    } catch (e) {
        showToast('サーバーに接続できません', 'warning');
    }
}

function logout() {
    document.getElementById('app-layout').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('auth-screen').classList.add('active');

    // ルート描画などの状態をリセット
    if (routeLayer) {
        map.removeLayer(routeLayer);
        routeLayer = null;
    }
    showToast('ログアウトしました');
}

async function resetSystemData() {
    console.log('resetSystemData called');
    if (!confirm('【警告】すべてのユーザーデータ、予約履歴、アカウント情報を初期化します。実行後、自動的にログアウトされます。よろしいですか？')) {
        console.log('Reset cancelled by user');
        return;
    }

    try {
        console.log('Sending reset request to server...');
        const btn = event.currentTarget;
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> リセット中...';

        const res = await fetch('/api/debug/reset', { method: 'POST' });
        console.log('Server response status:', res.status);

        if (res.ok) {
            showToast('システムデータを完全に初期化しました', 'success');
            console.log('Reset success. Logging out and reloading...');
            // データリセット後は強制ログアウトして初期画面へ
            setTimeout(() => {
                logout();
                location.reload();
            }, 1000);
        } else {
            btn.disabled = false;
            btn.innerHTML = originalText;
            const errData = await res.json();
            console.error('Reset failed:', errData);
            showToast('リセットに失敗しました: ' + (errData.error || ''), 'warning');
        }
    } catch (e) {
        console.error('Reset connection error:', e);
        showToast('通信エラーが発生しました', 'warning');
    }
}

// Sidebar Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();

        // Update active class on nav
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        // Show target screen
        const target = item.getAttribute('data-target');
        if (target) {
            document.querySelectorAll('.content-screen').forEach(s => s.classList.remove('active'));
            const targetEl = document.getElementById(target);
            if (targetEl) targetEl.classList.add('active');

            // Leaflet Resize Bug Fix & Screen specific logic
            if (target === 'map-screen') {
                setTimeout(() => map.invalidateSize(), 150);
            } else if (target === 'search-screen') {
                applySearchFilters();
            }
        }
    });
});

// Clock
setInterval(() => {
    const now = new Date();
    document.getElementById('current-clock').textContent =
        `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
}, 1000);

// --- Core State ---
const socket = io();
let parkingLots = {};
let markers = {};
let reservations = [];
let chartInstance = null;
let pieChartInstance = null;
let selectedLotId = null;
let lastSelfActionLotId = null; // 自己アクションによる重複通知防止用
let currentSearchFilter = 'all';
let currentResTab = 'active';

// 定数・状態
const MAP_CENTER = [34.702485, 135.495951]; // 大阪駅周辺
let userMarker = null;
let currentLatLng = [...MAP_CENTER];
let routeLayer = null;

// Leaflet Setup
const map = L.map('map', { zoomControl: false }).setView(MAP_CENTER, 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

// Dummy Location Pin
userMarker = L.circleMarker(MAP_CENTER, {
    color: '#4F46E5', fillColor: '#4F46E5', fillOpacity: 0.8, radius: 8, weight: 2
}).addTo(map).bindPopup('現在地');

// Geolocation
function locateUser() {
    if ("geolocation" in navigator) {
        showToast('現在地を取得中...');
        navigator.geolocation.getCurrentPosition(position => {
            currentLatLng = [position.coords.latitude, position.coords.longitude];
            userMarker.setLatLng(currentLatLng);
            map.flyTo(currentLatLng, 16);
            showToast('現在地を取得しました');
        }, err => {
            // ローカル等で取得失敗時は大阪駅を位置としてフォールバック
            currentLatLng = [...MAP_CENTER];
            userMarker.setLatLng(currentLatLng);
            map.flyTo(currentLatLng, 15);
            showToast('現在地が取得できないためデフォルト位置（大阪駅）を設定しました');
        });
    } else {
        showToast('お使いのブラウザは位置情報に対応していません');
    }
}

async function init() {
    updateWeather(); // 天気情報の取得を開始
    await fetchParkingLots();
    await fetchReservations();
    updateHomeData();
}

// Weather API Integration (Open-Meteo)
async function updateWeather() {
    const lat = MAP_CENTER[0];
    const lng = MAP_CENTER[1];
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&timezone=auto`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        const cw = data.current_weather;

        const weatherText = document.getElementById('weather-text');
        const weatherIcon = document.getElementById('weather-icon');

        if (!weatherText || !weatherIcon) return;

        // WMO Weather Codes mapping
        const mapping = {
            0: { text: "快晴", icon: "fa-sun" },
            1: { text: "晴れ", icon: "fa-cloud-sun" },
            2: { text: "薄曇り", icon: "fa-cloud-sun" },
            3: { text: "曇り", icon: "fa-cloud" },
            45: { text: "霧", icon: "fa-smog" },
            48: { text: "霧", icon: "fa-smog" },
            51: { text: "霧雨", icon: "fa-cloud-rain" },
            61: { text: "小雨", icon: "fa-cloud-rain" },
            63: { text: "雨", icon: "fa-cloud-showers-heavy" },
            65: { text: "大雨", icon: "fa-cloud-showers-heavy" },
            71: { text: "小雪", icon: "fa-snowflake" },
            95: { text: "雷雨", icon: "fa-cloud-bolt" }
        };


        const info = mapping[cw.weathercode] || { text: "不明", icon: "fa-cloud-sun" };

        weatherText.innerHTML = `<span style="font-weight:800">${cw.temperature}°C</span> ${info.text}`;

        // アイコンの更新
        weatherIcon.className = `fa-solid ${info.icon}`;

        // 初回取得時のみ通知（任意）
        // showToast(`現在の天気: ${cw.temperature}°C ${info.text}`, 'info');

    } catch (e) {
        console.error('Weather fetch error:', e);
        document.getElementById('weather-text').textContent = "取得エラー";
    }
}

async function fetchParkingLots() {
    try {
        const res = await fetch('/api/parking_lots');
        const lots = await res.json();
        lots.forEach(lot => {
            parkingLots[lot.id] = lot;
            createMarker(lot);
        });
    } catch(e) { showToast('駐輪場データの取得に失敗しました'); }
}

async function fetchReservations() {
    if (!currentUser) return;
    try {
        const res = await fetch('/api/reservations?user_id=' + encodeURIComponent(currentUser));
        reservations = await res.json();
        renderReservations();
        // マップピンの予約状態を再更新
        Object.values(parkingLots).forEach(lot => updateMarker(lot));
        // ダッシュボード等も同期
        updateHomeData();
    } catch(e) { console.error('fetchReservations error:', e); }
}

// --- Home Dashboard ---
function updateHomeData() {
    let totalAvail = 0;
    let totalSpots = 0;
    let fullCount = 0;
    let activeRes = reservations.filter(r => r.status === 'reserved' || r.status === 'active').length;
    const labels = [];
    const data = [];

    Object.values(parkingLots).forEach(lot => {
        totalAvail += lot.available_spots;
        totalSpots += lot.total_spots;
        if (lot.available_spots === 0) fullCount++;
        labels.push(lot.name);
        data.push(lot.available_spots);
    });

    const occupancyRate = totalSpots === 0 ? 0 : Math.round(((totalSpots - totalAvail) / totalSpots) * 100);
    const usedSpots = totalSpots - totalAvail;

    document.getElementById('total-occupancy-display').textContent = occupancyRate;
    document.getElementById('total-usage-text').textContent = `${usedSpots} / ${totalSpots}台使用中`;
    document.getElementById('full-lot-display').textContent = fullCount;
    document.getElementById('total-lot-text').textContent = `全${Object.keys(parkingLots).length}駐輪場中`;
    document.getElementById('active-res-display').textContent = activeRes;

    updateChart(labels, data);
    updatePieChart(Object.keys(parkingLots).length - fullCount, fullCount);

    const searchScreen = document.getElementById('search-screen');
    if (searchScreen && searchScreen.classList.contains('active')) {
        applySearchFilters();
    }
}

function updatePieChart(freeCount, fullCount) {
    const ctx = document.getElementById('statusPieChart').getContext('2d');
    if (pieChartInstance) {
        pieChartInstance.data.datasets[0].data = [freeCount, fullCount];
        pieChartInstance.update();
        return;
    }
    pieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['空車あり', '満車'],
            datasets: [{
                data: [freeCount, fullCount],
                backgroundColor: ['#4F46E5', '#EF4444'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
            },
            cutout: '70%'
        }
    });
}

function updateChart(labels, data) {
    const ctx = document.getElementById('congestionChart').getContext('2d');
    if (chartInstance) {
        chartInstance.data.labels = labels;
        chartInstance.data.datasets[0].data = data;
        chartInstance.update();
        return;
    }
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '空き台数',
                data: data,
                backgroundColor: 'rgba(79, 70, 229, 0.85)',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false } }
        }
    });
}

// --- Map & Markers ---
function getStatusClass(available, total) {
    if (available === 0) return 'full';
    if (available <= total * 0.2) return 'few';
    return 'free';
}

function createMarker(lot) {
    let status = getStatusClass(lot.available_spots, lot.total_spots);
    let title = `${status==='full'?'満':lot.available_spots}`;
    let iconHtml = '';

    // 有効な予約（reserved または active）がある場合のみ星アイコンを表示
    const activeRes = reservations.find(r => r.parking_lot_id == lot.id && (r.status === 'reserved' || r.status === 'active'));

    if (activeRes) {
        status = 'reserved';
        iconHtml = `<div class="custom-pin pin-${status}">
                      <i class="fa-solid fa-star" style="font-size: 1.2rem; margin: 0;"></i>
                    </div>`;
    } else {
        iconHtml = `<div class="custom-pin pin-${status}">
                 <i class="fa-solid fa-bicycle"></i>
                 <span>${title}</span>
               </div>`;
    }

    const icon = L.divIcon({
        className: 'custom-icon',
        html: iconHtml,
        iconSize: [44, 44], iconAnchor: [22, 44]
    });

    const marker = L.marker([lot.latitude, lot.longitude], { icon }).addTo(map);
    marker.on('click', () => showLotDetails(lot.id));
    markers[lot.id] = marker;
}

function updateMarker(lot) {
    const marker = markers[lot.id];
    if (!marker) return;

    let status = getStatusClass(lot.available_spots, lot.total_spots);
    let title = `${status==='full'?'満':lot.available_spots}`;
    let iconHtml = '';

    // 有効な予約がある場合のみ
    const activeRes = reservations.find(r => r.parking_lot_id == lot.id && (r.status === 'reserved' || r.status === 'active'));

    if (activeRes) {
        status = 'reserved';
        iconHtml = `<div class="custom-pin pin-${status}">
                      <i class="fa-solid fa-star" style="font-size: 1.2rem; margin: 0;"></i>
                    </div>`;
    } else {
        iconHtml = `<div class="custom-pin pin-${status}">
                 <i class="fa-solid fa-bicycle"></i>
                 <span>${title}</span>
               </div>`;
    }

    const icon = L.divIcon({
        className: 'custom-icon',
        html: iconHtml,
        iconSize: [44, 44], iconAnchor: [22, 44]
    });
    marker.setIcon(icon);
}

// Map Panel
function showLotDetails(id) {
    selectedLotId = id;
    const lot = parkingLots[id];

    document.getElementById('lot-title').textContent = lot.name;
    document.getElementById('lot-available').textContent = lot.available_spots;
    document.getElementById('lot-total').textContent = lot.total_spots;
    document.getElementById('lot-price').textContent = lot.price_per_hour;

    const status = getStatusClass(lot.available_spots, lot.total_spots);
    const badge = document.getElementById('lot-status-badge');
    badge.className = `badge ${status}`;
    badge.textContent = status === 'full' ? '満車' : (status === 'few' ? '残りわずか' : '空きあり');

    const resBtn = document.getElementById('reserve-trigger-btn');
    if (lot.available_spots === 0) {
        resBtn.disabled = true;
        resBtn.innerHTML = '<i class="fa-solid fa-ban"></i> 満車';
    } else {
        resBtn.disabled = false;
        resBtn.innerHTML = '<i class="fa-regular fa-calendar-check"></i> 予約する';
    }

    document.getElementById('detail-panel').classList.remove('hidden');
    map.panTo([lot.latitude, lot.longitude]);
}

function closePanel() {
    document.getElementById('detail-panel').classList.add('hidden');
    selectedLotId = null;

    // ルート描画があれば消す
    if (routeLayer) {
        map.removeLayer(routeLayer);
        routeLayer = null;
    }
}

// OSRM Routing
document.getElementById('nav-btn').addEventListener('click', async () => {
    if (!selectedLotId) return;
    const lot = parkingLots[selectedLotId];

    // 既存のルートを消去
    if (routeLayer) {
        map.removeLayer(routeLayer);
    }

    showToast('ルートを検索中...');
    try {
        // OSRM Public API (注意: 座標は longitude, latitudeの順)
        const url = `https://router.project-osrm.org/route/v1/bicycle/${currentLatLng[1]},${currentLatLng[0]};${lot.longitude},${lot.latitude}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            routeLayer = L.geoJSON(route.geometry, {
                style: { color: '#4F46E5', weight: 5, opacity: 0.8 }
            }).addTo(map);

            // 地図のズームをルートに合わせる
            map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });
            showToast(`自転車で約 ${Math.ceil(route.duration / 60)} 分のルートです。ナビを開始します。`);
        } else {
            showToast('ルートが見つかりませんでした');
        }
    } catch(err) {
        // フォールバック: Google Maps
        window.open(`https://www.google.com/maps/dir/?api=1&origin=${currentLatLng[0]},${currentLatLng[1]}&destination=${lot.latitude},${lot.longitude}&travelmode=bicycling`);
        showToast('Google Mapsを起動します');
    }
});

// --- Reservation Modal & Logic ---
document.getElementById('reserve-trigger-btn').addEventListener('click', () => {
    if (!selectedLotId) return;
    const lot = parkingLots[selectedLotId];
    document.getElementById('modal-lot-name').textContent = lot.name;
    document.getElementById('modal-lot-price').textContent = lot.price_per_hour;

    document.getElementById('reservation-modal').classList.remove('hidden');
});

function closeReservationModal() {
    document.getElementById('reservation-modal').classList.add('hidden');
}

async function submitReservation(e) {
    e.preventDefault();
    if (!selectedLotId) return;

    const startTime = new Date().toISOString();
    const durationStr = document.getElementById('res-duration').value;
    const submitBtn = document.getElementById('res-submit-btn');

    submitBtn.disabled = true;
    submitBtn.textContent = '処理中...';

    // HTTPレスポンスより先にWebSocket通知が届くケースに備え、事前にフラグをセット
    const currentActionLotId = selectedLotId;
    lastSelfActionLotId = currentActionLotId;

    try {
        const res = await fetch('/api/reservations', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
                parking_lot_id: currentActionLotId,
                user_id: currentUser,
                start_time: startTime,
                duration: parseInt(durationStr, 10)
            })
        });

        if (res.ok) {
            showToast('予約が確定しました！', 'success');
            closeReservationModal();
            closePanel();
            await fetchReservations();
        } else {
            const err = await res.json();
            showToast(err.error || '予約に失敗しました。', 'warning');
        }
    } catch(err) {
        showToast('ネットワークエラーが発生しました。');
    } finally {
        // フラグは数秒後に解除 (WebSocketラグ考慮)
        setTimeout(() => {
            if (lastSelfActionLotId === currentActionLotId) lastSelfActionLotId = null;
        }, 3000);
        submitBtn.disabled = false;
        submitBtn.textContent = '予約を確定する';
    }
}

async function cancelReservation(id) {
    // ユーザーにストレスを与えないよう、削除前の確認をシンプルにするか、あるいは即時実行にする
    // 今回は「使えるように」との要望なので、スムーズに動作するようにします。
    try {
        const res = await fetch(`/api/reservations/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('予約を取り消しました');
            await fetchReservations(); // UIを確実に再描画
        } else {
            showToast('取り消しに失敗しました');
        }
    } catch(err) {
        showToast('通信エラーが発生しました');
    }
}

// --- Reservation Tab & Render ---
function switchResTab(tab) {
    currentResTab = tab;
    // TabUI
    document.getElementById('res-tab-active').style.background = tab === 'active' ? 'white' : 'transparent';
    document.getElementById('res-tab-active').style.boxShadow = tab === 'active' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none';
    document.getElementById('res-tab-active').style.color = tab === 'active' ? 'var(--primary-color)' : 'var(--text-secondary)';

    document.getElementById('res-tab-history').style.background = tab === 'history' ? 'white' : 'transparent';
    document.getElementById('res-tab-history').style.boxShadow = tab === 'history' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none';
    document.getElementById('res-tab-history').style.color = tab === 'history' ? 'var(--primary-color)' : 'var(--text-secondary)';

    if(tab === 'active') {
        document.getElementById('res-active-container').style.display = 'block';
        document.getElementById('res-history-container').style.display = 'none';
    } else {
        document.getElementById('res-active-container').style.display = 'none';
        document.getElementById('res-history-container').style.display = 'block';
    }
}

function renderReservations() {
    const activeList = reservations.filter(r => r.status === 'reserved' || r.status === 'active');
    const historyList = reservations.filter(r => r.status === 'cancelled' || r.status === 'completed');

    document.getElementById('history-count').textContent = historyList.length;

    // アクティブリスト
    const actContainer = document.getElementById('reservation-list-container');
    const actMsg = document.getElementById('no-reservation-msg');

    if (activeList.length === 0) {
        actMsg.style.display = 'block';
        actContainer.innerHTML = '';
    } else {
        actMsg.style.display = 'none';
        actContainer.innerHTML = '';
        activeList.forEach(r => actContainer.appendChild(createResCardElement(r, true)));
    }

    // 履歴リスト
    const histContainer = document.getElementById('history-list-container');
    const histMsg = document.getElementById('no-history-msg');

    if (historyList.length === 0) {
        histMsg.style.display = 'block';
        histContainer.innerHTML = '';
    } else {
        histMsg.style.display = 'none';
        histContainer.innerHTML = '';
        historyList.forEach(r => histContainer.appendChild(createResCardElement(r, false)));
    }
}

function createResCardElement(r, isActive) {
    const st = new Date(r.start_time);
    const et = new Date(r.end_time);
    const formatTime = (d) => `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;

    const div = document.createElement('div');
    div.className = 'res-card';

    let badgeHtml = '';
    if (r.status === 'reserved' || r.status === 'active') badgeHtml = `<span class="badge free" style="padding: 4px 8px; font-size:0.75rem;">確保済</span>`;
    else if (r.status === 'cancelled') badgeHtml = `<span class="badge full" style="padding: 4px 8px; font-size:0.75rem;">キャンセル</span>`;
    else if (r.status === 'completed') badgeHtml = `<span class="badge" style="background:#64748B; padding: 4px 8px; font-size:0.75rem;">利用完了</span>`;

    div.innerHTML = `
        <div style="padding: 12px; background: #F8FAFC; border-radius: 12px; margin-bottom: 16px;">
            <div style="font-weight:800; font-size:1.1rem; color:var(--text-primary); margin-bottom: 6px;"><i class="fa-solid fa-square-parking" style="color:var(--primary-color);"></i> ${r.name}</div>
            <div style="font-size:0.9rem; color:var(--text-secondary); display:flex; justify-content:space-between;">
                <span><i class="fa-solid fa-money-bill"></i> ¥${r.amount_jpy} (現地決済)</span>
                ${badgeHtml}
            </div>
        </div>

        <div class="res-time" style="font-size: 0.95rem; text-align:center; padding: 10px; background: #EEF2FF; border-radius: 12px; font-weight:700;">
            <i class="fa-regular fa-clock"></i> ${formatTime(st)} から ${formatTime(et)}
        </div>

        ${isActive ? `
        <div style="display:flex; gap:12px; margin-top: 16px;">
           <button class="primary-btn flex-1" style="font-size: 0.95rem; padding: 12px;" onclick="document.querySelector('[data-target=map-screen]').click(); setTimeout(() => { map.invalidateSize(); showLotDetails(${r.parking_lot_id}); }, 200);"><i class="fa-solid fa-map-location-dot"></i> 地図</button>
           <button class="secondary-btn flex-1" style="font-size: 0.95rem; padding: 12px; color: #ef4444; border-color: #fecaca; background: #fff1f2;" onclick="cancelReservation(${r.id})"><i class="fa-solid fa-xmark"></i> キャンセル</button>
        </div>` : ''}
    `;
    return div;
}

// --- Search Features ---
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

function formatDistance(km) {
    if (km < 1) return `約 ${Math.round(km * 1000)} m`;
    return `約 ${km.toFixed(1)} km`;
}

function setSearchFilter(filter) {
    currentSearchFilter = filter;
    document.querySelectorAll('.filter-tabs .filter-tab').forEach(c => c.classList.remove('active'));
    document.getElementById('filter-' + filter).classList.add('active');
    applySearchFilters();
}

function applySearchFilters() {
    const text = document.getElementById('search-input').value.toLowerCase();
    const sort = document.getElementById('search-sort').value;

    // 現在地からの距離(km)を全駐輪場データに計算して付与
    let result = Object.values(parkingLots).map(lot => {
        return {
            ...lot,
            distanceKm: getDistanceFromLatLonInKm(currentLatLng[0], currentLatLng[1], lot.latitude, lot.longitude)
        };
    });

    // Text Filter
    if (text) {
        result = result.filter(lot => lot.name.toLowerCase().includes(text));
    }

    // Chip Filter
    if (currentSearchFilter === 'free') {
        result = result.filter(lot => lot.available_spots > 0);
    } else if (currentSearchFilter === 'reserve') {
        const activeResLotIds = reservations.filter(r => r.status === 'reserved' || r.status === 'active').map(r => r.parking_lot_id);
        result = result.filter(lot => lot.available_spots > 0 && !activeResLotIds.includes(lot.id));
    }

    // Sort
    if (sort === 'name') {
        result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'free') {
        result.sort((a, b) => b.available_spots - a.available_spots); // 空き枠が多い順
    } else if (sort === 'distance') {
        result.sort((a, b) => a.distanceKm - b.distanceKm); // 距離が近い順
    } else if (sort === 'price_asc') {
        result.sort((a, b) => a.price_per_hour - b.price_per_hour); // 料金が安い順
    } else if (sort === 'price_desc') {
        result.sort((a, b) => b.price_per_hour - a.price_per_hour); // 料金が高い順
    }

    renderSearchList(result);
}

function renderSearchList(lots) {
    const container = document.getElementById('search-list-container');
    const msg = document.getElementById('no-search-msg');

    container.innerHTML = '';
    if (lots.length === 0) {
        msg.style.display = 'block';
    } else {
        msg.style.display = 'none';
        lots.forEach(lot => {
            const statusClass = getStatusClass(lot.available_spots, lot.total_spots);
            const statusText = statusClass === 'full' ? '満車' : (statusClass === 'few' ? '残りわずか' : '空きあり');

            const div = document.createElement('div');
            div.className = 'res-card';

            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 12px;">
                    <div style="font-weight:800; font-size:1.1rem; color:var(--text-primary);"><i class="fa-solid fa-square-parking" style="color:var(--primary-color);"></i> ${lot.name}</div>
                    <span class="badge ${statusClass}">${statusText}</span>
                </div>
                <div style="font-size:0.85rem; color:var(--text-secondary); display:flex; justify-content:space-between; margin-bottom:16px; background:#F8FAFC; padding:8px; border-radius:8px;">
                    <span style="font-weight:700;"><i class="fa-solid fa-location-dot" style="color:var(--primary-color);"></i> ${formatDistance(lot.distanceKm)}</span>
                    <span><i class="fa-solid fa-bicycle"></i> 空き ${lot.available_spots}/${lot.total_spots}</span>
                    <span style="font-weight:700;"><i class="fa-solid fa-money-bill"></i> ¥${lot.price_per_hour}/h</span>
                </div>
                <div style="display:flex; gap:12px;">
                    <button class="secondary-btn flex-1" style="padding: 10px; font-size: 0.9rem;" onclick="document.querySelector('[data-target=map-screen]').click(); setTimeout(() => { map.invalidateSize(); map.flyTo([${lot.latitude}, ${lot.longitude}], 16); showLotDetails(${lot.id}); }, 200);">
                        <i class="fa-solid fa-map"></i> 地図へ
                    </button>
                    ${lot.available_spots > 0 && !reservations.some(r => (r.status === 'reserved' || r.status === 'active') && r.parking_lot_id == lot.id) ? `
                    <button class="primary-btn flex-1" style="padding: 10px; font-size: 0.9rem;" onclick="document.querySelector('[data-target=map-screen]').click(); setTimeout(() => { map.invalidateSize(); map.flyTo([${lot.latitude}, ${lot.longitude}], 16); showLotDetails(${lot.id}); }, 200);">
                        <i class="fa-solid fa-calendar-check"></i> 予約
                    </button>
                    ` : ''}
                    ${reservations.some(r => (r.status === 'reserved' || r.status === 'active') && r.parking_lot_id == lot.id) ? `
                    <button class="secondary-btn flex-1" style="padding: 10px; font-size: 0.9rem; cursor:default; color:var(--text-secondary); background:#F1F5F9; border:none;" disabled>
                        <i class="fa-solid fa-check"></i> 予約済
                    </button>
                    ` : ''}
                </div>
            `;
            container.appendChild(div);
        });
    }
}

function showToast(txt, type = 'info') {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');

    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'warning') icon = 'fa-triangle-exclamation';
    if (type === 'live') icon = 'fa-bolt-lightning';

    t.className = `toast toast-${type}`;
    t.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${txt}</span>`;

    container.appendChild(t);

    // アニメーション終了後に削除
    setTimeout(() => {
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 300);
    }, 3000);
}

// --- WebSocket Listeners ---
socket.on('parking_update', (data) => {
    const lot = parkingLots[data.id];
    if (lot) {
        const prevSpot = lot.available_spots;
        lot.available_spots = data.available_spots;
        lot.is_full = data.is_full;

        updateMarker(lot);
        updateHomeData();

        if (selectedLotId === lot.id) {
            showLotDetails(lot.id);
        }

        if (prevSpot === 0 && data.available_spots > 0) {
            showToast(`${lot.name} に空きが出ました！`, 'info');
        }

        // 他人が予約して枠が減った時の通知（ライブ感）
        // 自己アクションでない場合のみ通知
        if (prevSpot > data.available_spots && data.id !== lastSelfActionLotId) {
            showToast(`[ライブ] 誰かが ${lot.name} を予約しました！残り${data.available_spots}台`, 'live');
        }
    }
});
