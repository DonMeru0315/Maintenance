// ---------------------------------------------------------
// 1. Firebase 設定
// ---------------------------------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, Timestamp } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ★★★ ここをご自身のFirebase設定に書き換えてください ★★★
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456...",
    appId: "1:123456..."
};

// Firebase初期化
let db;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("Firebase initialized");
} catch (e) {
    console.error("Firebase設定が正しくありません:", e);
    // 設定がない場合でもアプリが落ちないようにエラーを表示するだけにする
}

// ---------------------------------------------------------
// 2. アプリの状態変数
// ---------------------------------------------------------
let currentVehicle = null;

// ダミーデータ（Firebase接続前の動作確認用）
const DUMMY_VEHICLES = [
    { id: "v1", name: "プリウス", initDate: "2020-01" },
    { id: "v2", name: "CB400SF", initDate: "2018-05" }
];

// ---------------------------------------------------------
// 3. DOM要素
// ---------------------------------------------------------
const viewVehicles = document.getElementById('view-vehicles');
const viewLogs = document.getElementById('view-logs');
const headerTitle = document.getElementById('header-title');
const btnBack = document.getElementById('btn-back');
const vehicleListEl = document.getElementById('vehicle-list');
const logListEl = document.getElementById('log-list');
const fab = document.getElementById('fab');
const modal = document.getElementById('modal');
const form = document.getElementById('log-form');

// ---------------------------------------------------------
// 4. 関数群
// ---------------------------------------------------------

// 初期化
async function init() {
    document.getElementById('inp-date').valueAsDate = new Date();
    
    // グローバルスコープに関数を登録（HTMLのonclickから呼べるようにするため）
    window.closeModal = closeModal;
    
    await loadVehicles();
}

// 車両読み込み
async function loadVehicles() {
    vehicleListEl.innerHTML = '<div class="empty-state">読み込み中...</div>';
    
    let vehicles = [];
    try {
        // ここでFirestoreから車両データを取得する処理を入れます
        // 今回は簡略化のため、エラー時はダミーを使います
        if (!db) throw new Error("No DB");
        
        /* // Firestoreから取得する場合のコード例:
        const q = query(collection(db, "vehicles"));
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => vehicles.push({id: doc.id, ...doc.data()}));
        */
       
       if(vehicles.length === 0) vehicles = DUMMY_VEHICLES;

    } catch(e) {
        console.log("デモモードで動作します", e);
        vehicles = DUMMY_VEHICLES;
    }

    renderVehicleList(vehicles);
}

// 車両リスト描画
function renderVehicleList(vehicles) {
    vehicleListEl.innerHTML = '';
    vehicles.forEach(v => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="vehicle-name">${v.name}</div>
            <div class="vehicle-meta">登録: ${v.initDate}</div>
        `;
        // addEventListenerでイベント登録
        card.addEventListener('click', () => openVehicleLogs(v));
        vehicleListEl.appendChild(card);
    });
}

// ログ画面を開く
async function openVehicleLogs(vehicle) {
    currentVehicle = vehicle;
    headerTitle.textContent = vehicle.name;
    btnBack.style.display = 'block';

    viewVehicles.classList.remove('view-active');
    viewVehicles.classList.add('view-hidden');
    viewLogs.classList.remove('view-hidden');
    viewLogs.classList.add('view-active');

    await loadLogs(vehicle.id);
}

// 戻る処理
btnBack.addEventListener('click', () => {
    currentVehicle = null;
    headerTitle.textContent = "ガレージ";
    btnBack.style.display = 'none';

    viewLogs.classList.remove('view-active');
    viewLogs.classList.add('view-hidden');
    viewVehicles.classList.remove('view-hidden');
    viewVehicles.classList.add('view-active');
});

// ログ読み込み
async function loadLogs(vehicleId) {
    logListEl.innerHTML = '<div class="empty-state">記録を読み込み中...</div>';
    
    let logs = [];
    try {
        if (!db) throw new Error("No DB");
        
        const logsRef = collection(db, "vehicles", vehicleId, "logs");
        const q = query(logsRef, orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        
        snapshot.forEach(doc => {
            logs.push({ id: doc.id, ...doc.data() });
        });
    } catch (e) {
        console.log("ログ取得スキップ(デモモード)");
    }

    renderLogs(logs);
}

// ログ描画
function renderLogs(logs) {
    logListEl.innerHTML = '';
    if (logs.length === 0) {
        logListEl.innerHTML = '<div class="empty-state">整備記録はまだありません。<br>右下の＋ボタンで追加してください。</div>';
        return;
    }

    logs.forEach(log => {
        const el = document.createElement('div');
        el.className = 'card';
        el.innerHTML = `
            <div class="log-row">
                <div class="log-title">${log.content}</div>
                <div class="log-km">${Number(log.km).toLocaleString()} km</div>
            </div>
            <div class="log-date">${log.date}</div>
            ${log.remarks ? `<div class="log-remarks">${log.remarks}</div>` : ''}
        `;
        logListEl.appendChild(el);
    });
}

// FABクリック
fab.addEventListener('click', () => {
    if (!currentVehicle) return;
    modal.classList.add('active');
});

// モーダルを閉じる
function closeModal() {
    modal.classList.remove('active');
}

// フォーム送信
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const date = document.getElementById('inp-date').value;
    const km = document.getElementById('inp-km').value;
    const content = document.getElementById('inp-content').value;
    const remarks = document.getElementById('inp-remarks').value;

    try {
        if (!db) throw new Error("設定未完了: Firebase Configを設定してください");

        const logsRef = collection(db, "vehicles", currentVehicle.id, "logs");
        await addDoc(logsRef, {
            date: date,
            km: Number(km),
            content: content,
            remarks: remarks,
            createdAt: Timestamp.now()
        });

        closeModal();
        form.reset();
        document.getElementById('inp-date').valueAsDate = new Date();
        loadLogs(currentVehicle.id);

    } catch (e) {
        alert(e.message);
    }
});

// 実行開始
init();