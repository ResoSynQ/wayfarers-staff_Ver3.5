            if(res.ok) {
                rawData[key] = await res.json();
                if (immediateLayers.includes(key)) renderGeoJson(key);
            }
        } catch (e) { console.error(`Failed to load ${key}:`, e); }
    }
}
fetchAllData();

const overlayMaps = {
    "♟️ 道標": layers.rel, "🌳 公園・遊具": layers.park, "🏟️ 公共施設": layers.com, "📚 文化施設": layers.mus, "🏃‍♂️ 体育施設": layers.gym, "🏯 文化財": layers.cul, "🚾 トイレ": layers.wc,
    "🏞️ 景観地区": layers.keikan, "🌲 景観重要建造物樹木": layers.tree, "📜 歴史的風土保存区域": layers.fudo, "🏘️ 伝統的建造物群保存地区": layers.denken, "🗺️ 歴史的風致重点地区": layers.fuchi, "🎆 観光資源": layers.kanko, 
    "🍽️ 喫茶店・レストラン": layers.restaurants, "🐾 トレイル.古道": layers.trail, "🛤️ 東海自然歩道": layers.shizenhodo, "🛣️ 五街道": layers.gokaido,
    "🌍 トレンド": layers.live_trend, "🌸 開花": layers.live_flower, "😊 ローカルニュース": layers.live_local,
    "🗣️ ユーザー投稿スポット": layers.user_spots, "🎡 万博・レガシー": layers.legacy_spots
};

layers.rel.addTo(map); layers.park.addTo(map); layers.com.addTo(map);
layers.mus.addTo(map); layers.gym.addTo(map); layers.cul.addTo(map);

L.control.layers({}, overlayMaps, {collapsed: false, position: 'topleft'}).addTo(map);

function insertCategoryHeaders() {
    document.querySelectorAll('.custom-layer-header').forEach(el => el.remove());
    document.querySelectorAll('.leaflet-control-layers-overlays label').forEach(label => {
        const text = label.textContent.trim();
        let headerHtml = "";
        if (text.includes("道標")) headerHtml = "<div class='custom-layer-header' style='margin:18px 0 10px 0;'><hr style='margin:0 0 12px 0; border:0; border-top:1px solid #ddd;'><div style='font-size:1.05em; font-weight:bold; color:#1565C0;'>【基本探索】</div></div>";
        else if (text.includes("景観地区")) headerHtml = "<div class='custom-layer-header' style='margin:18px 0 10px 0;'><hr style='margin:0 0 12px 0; border:0; border-top:1px solid #ddd;'><div style='font-size:1.05em; font-weight:bold; color:#E65100;'>【広域地域データ】</div></div>";
        else if (text.includes("喫茶店")) headerHtml = "<div class='custom-layer-header' style='margin:18px 0 10px 0;'><hr style='margin:0 0 12px 0; border:0; border-top:1px solid #ddd;'><div style='font-size:1.05em; font-weight:bold; color:#2E7D32;'>【上級者向け】</div></div>";
        else if (text.includes("トレンド")) headerHtml = "<div class='custom-layer-header' style='margin:18px 0 10px 0;'><hr style='margin:0 0 12px 0; border:0; border-top:1px solid #ddd;'><div style='font-size:1.05em; font-weight:bold; color:#8e44ad;'>【実験機能】</div></div>";
        else if (text.includes("ユーザー投稿")) headerHtml = "<div class='custom-layer-header' style='margin:18px 0 10px 0;'><hr style='margin:0 0 12px 0; border:0; border-top:1px solid #ddd;'><div style='font-size:1.05em; font-weight:bold; color:#e67e22;'>【コミュニティ】</div></div>";
        else if (text.includes("万博")) headerHtml = "<div class='custom-layer-header' style='margin:18px 0 10px 0;'><hr style='margin:0 0 12px 0; border:0; border-top:1px solid #ddd;'><div style='font-size:1.05em; font-weight:bold; color:#d35400;'>【特別イベント】</div></div>";
        
        if (headerHtml) label.insertAdjacentHTML('beforebegin', headerHtml);
    });
}
insertCategoryHeaders();
map.on('layeradd layerremove', () => setTimeout(insertCategoryHeaders, 10));

const SCAN_ZOOM = 15;
const scanBtn = document.getElementById('scan-btn');
function updateScanBtn() {
    if(!scanBtn) return;
    if (map.getZoom() >= SCAN_ZOOM) { scanBtn.classList.remove('disabled'); scanBtn.disabled = false; scanBtn.innerText = "📡 周囲をスキャン"; }
    else { scanBtn.classList.add('disabled'); scanBtn.disabled = true; scanBtn.innerText = "もっと近づいてスキャン"; }
}
map.on('zoomend', updateScanBtn);
updateScanBtn();

scanBtn?.addEventListener('click', () => {
    if (map.getZoom() < SCAN_ZOOM) return;
    scanBtn.innerText = "🔄 スキャン中...";
    scanBtn.classList.add('disabled');
    const bounds = map.getBounds();
    setTimeout(() => {
        Object.keys(layerDefs).forEach(key => { if (!immediateLayers.includes(key) && map.hasLayer(layers[key]) && rawData[key]) renderGeoJson(key, bounds); });
        scanBtn.innerText = "📡 周囲をスキャン"; scanBtn.classList.remove('disabled');
    }, 600);
});

const myakuCredit = '（画像のミャクミャク・こみゃく・こみゃくピンは二次創作です）';
let restaurantWarningShown = false, advanceWarningShown = false;
map.on('overlayadd', function(e) {
    if (e.name.includes('トレンド') && rawData['live_trend']) renderGeoJson('live_trend');
    if (e.name.includes('開花') && rawData['live_flower']) renderGeoJson('live_flower');
    if (e.name.includes('ローカル') && rawData['live_local']) renderGeoJson('live_local');
    if (e.name.includes('ユーザー投稿') && rawData['user_spots']) renderGeoJson('user_spots');
    if (e.name.includes('万博') && rawData['legacy_spots']) renderGeoJson('legacy_spots');
    if (e.name.includes('万博')) map.attributionControl.addAttribution(myakuCredit);
    if (e.name.includes('トレンド') || e.name.includes('開花') || e.name.includes('ローカル')) map.attributionControl.addAttribution(yahooCredit);
    if (e.name.includes('喫茶店') && !restaurantWarningShown) { alert("飲食店データは最大で10mの誤差があることがあります。立ち寄る際は十分に確認してください。"); restaurantWarningShown = true; }
    if ((e.name.includes('トレイル') || e.name.includes('自然歩道') || e.name.includes('五街道')) && !advanceWarningShown) { alert("【上級者向け警告】\n難易度の高いルートが含まれます。事前に計画を立てましょう。"); advanceWarningShown = true; }
});

map.on('overlayremove', function(e) {
    if (e.name.includes('万博')) map.attributionControl.removeAttribution(myakuCredit);
    if (e.name.includes('トレンド') || e.name.includes('開花') || e.name.includes('ローカル')) {
        let hasLiveLayer = false;
        if (layers['live_trend'] && map.hasLayer(layers['live_trend'])) hasLiveLayer = true;
        if (layers['live_flower'] && map.hasLayer(layers['live_flower'])) hasLiveLayer = true;
        if (layers['live_local'] && map.hasLayer(layers['live_local'])) hasLiveLayer = true;
        if (!hasLiveLayer) map.attributionControl.removeAttribution(yahooCredit);
    }
});

document.getElementById('menu-btn')?.addEventListener('click', (e) => { e.stopPropagation(); document.body.classList.toggle('menu-open'); });
document.getElementById('help-btn')?.addEventListener('click', () => { window.location.href = "help.html"; });
document.getElementById('license-btn')?.addEventListener('click', () => { window.location.href = "license.html"; });
document.getElementById('location-btn')?.addEventListener('click', () => { map.locate({setView: true, maxZoom: 16}); });

function hideLoadingScreen() {
    const s = document.getElementById('loading-screen');
    if(s && s.style.display !== 'none') { s.style.opacity = '0'; setTimeout(() => s.style.display = 'none', 800); }
}
window.addEventListener('load', () => setTimeout(hideLoadingScreen, 1500));
setTimeout(hideLoadingScreen, 4000);

map.on('locationfound', (e) => { L.circleMarker(e.latlng, {radius: 8, fillColor: '#007BFF', color: '#fff', weight: 2, fillOpacity: 1}).addTo(map).bindPopup("現在地").openPopup(); });
map.on('locationerror', () => { alert("現在地を取得できませんでした。端末の位置情報設定を確認してください。"); });

document.getElementById('reload-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('reload-btn');
    btn.innerText = "⏳";
    try {
        map.closePopup();
        const freshUrl = layerDefs.live_trend.url + '?t=' + new Date().getTime();
        const res = await fetch(freshUrl);
        if (res.ok) {
            const freshData = await res.json();
            rawData['live_trend'] = freshData; rawData['live_flower'] = freshData; rawData['live_local'] = freshData;
            if (map.hasLayer(layers['live_trend'])) renderGeoJson('live_trend');
            if (map.hasLayer(layers['live_flower'])) renderGeoJson('live_flower');
            if (map.hasLayer(layers['live_local'])) renderGeoJson('live_local');
        }
        const freshUserUrl = layerDefs.user_spots.url + '?t=' + new Date().getTime();
        const resUser = await fetch(freshUserUrl);
        if (resUser.ok) {
            rawData['user_spots'] = await resUser.json();
            if (map.hasLayer(layers['user_spots'])) renderGeoJson('user_spots');
        }
    } catch(e) { console.error("最新データの取得に失敗しました:", e); }
    setTimeout(() => { btn.innerText = "↻"; }, 500);
});

let requestMarker = null;
document.getElementById('request-btn')?.addEventListener('click', () => {
    if (requestMarker) map.removeLayer(requestMarker);
    const center = map.getCenter();
    requestMarker = L.marker(center, { draggable: true, icon: icons.red }).addTo(map);
    const popupContent = `
        <div style="text-align:center; min-width:180px;">
            <b style="font-size:1.1em; color:#d35400;">この地点を申請しますか？</b><br>
            <span style="font-size:0.8em; color:#666;">※ピンをドラッグして微調整できます</span><br><br>
            <button id="confirm-request-btn" style="padding:8px 15px; background:#e67e22; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold; width:100%;">✉️ この地点を申請</button>
        </div>
    `;
    requestMarker.bindPopup(popupContent).openPopup();
    requestMarker.on('popupclose', () => { if (requestMarker) { map.removeLayer(requestMarker); requestMarker = null; } });
});

document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'confirm-request-btn') {
        if (!requestMarker) return;
        const latlng = requestMarker.getLatLng();
        const lat = latlng.lat.toFixed(6); const lng = latlng.lng.toFixed(6);
        const supportEmail = "information.app.excellent@gmail.com"; 
        const subject = encodeURIComponent("【マップDJ】新規スポット追加申請");
        const body = encodeURIComponent(`面白いスポットを報告します。\n\n【スポット名】\n（ここに名称を入力してください）\n\n【おすすめの理由・説明】\n（ここにおすすめの理由を入力してください）\n\n-------------------------\n【位置情報（自動取得）】\n緯度: ${lat}\n経度: ${lng}\nGoogleマップで確認:\nhttps://www.google.com/maps?q=${lat},${lng}\n-------------------------`);
        window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
        map.closePopup(); map.removeLayer(requestMarker); requestMarker = null;
    }
});

map.on('zoomend', function() {
    const zoom = map.getZoom();
    let size = 24;
    if (zoom === 10) size = 10;
    else if (zoom === 11) size = 16;
    else if (zoom === 12) size = 21;
    else if (zoom === 13) size = 23;
    else if (zoom === 14) size = 25;
    document.documentElement.style.setProperty('--myaku-size', size + 'px');
    document.body.classList.toggle('hide-myaku-large', zoom <= 9 || zoom >= 15);

    // legacyClusterGroupのアイコンを再生成させる（iconCreateFunctionを再呼び出し）
    if (legacyClusterGroup) {
        legacyClusterGroup.refreshClusters();
    }
});

// 初期ロード時はzoomendが発火しないため、起動直後に1度だけ実行
(function applyInitialMyakuSize() {
    const zoom = map.getZoom();
    let size = 24;
    if (zoom === 10) size = 10;
    else if (zoom === 11) size = 16;
    else if (zoom === 12) size = 21;
    else if (zoom === 13) size = 23;
    else if (zoom === 14) size = 25;
    document.documentElement.style.setProperty('--myaku-size', size + 'px');
    document.body.classList.toggle('hide-myaku-large', zoom <= 9 || zoom >= 15);
})();
