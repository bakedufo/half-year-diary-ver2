import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCkrpiqE2d_CgZX47QxJZD8C1mYfZmO75E",
  authDomain: "half-year-diary.firebaseapp.com",
  projectId: "half-year-diary",
  storageBucket: "half-year-diary.firebasestorage.app",
  messagingSenderId: "52175563386",
  appId: "1:52175563386:web:f65720a571abcbbe66a9c3",
  measurementId: "G-WTQC01FGM0",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// ログイン・アウトのボタン設定
document.getElementById("loginBtn").onclick = () =>
  signInWithPopup(auth, provider);
document.getElementById("logoutBtn").onclick = () => signOut(auth);

// ログイン状態の監視
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("login-screen").classList.add("hidden");
    renderSidebar();
    loadDiaries(user.uid);
  } else {
    document.getElementById("login-screen").classList.remove("hidden");
  }
});

// サイドバーの月別表示
function renderSidebar() {
  const monthList = document.getElementById("month-list");

  const now = new Date();
  const currentMonth = now.getMonth(); //0が1月、11が12月（1ずれる）
  const months = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthName = d.getMonth() + 1;
    months.push(monthName);
  }

  let html = `
  <li>
  <button
  onclick="showAllDiaries()"
  class="w-full text-left block p-3 rounded-lg hover:bg-stone-300 transition border-2 border-stone-300 text-gray-700 font-bold">
  すべて表示
  </button>
  </li>

  <li>
    <button
      onclick="filterByMarked()"
      class="w-full text-left block p-3 rounded-lg hover:bg-amber-100 transition border-2 border-stone-300 text-gray-700 font-bold">
      ★ 保存済み
    </button>
  </li>`;
  
  html += months
    .map((m) => {
      return `
  <li>
    <button
      onclick="filterByMonth(${m})"
      class="w-full text-left block p-3 rounded-lg hover:bg-stone-300 transition border-2 border-stone-300 text-gray-700 font-bold"
      >
        ${m}月
    </button>
  </li>
  `;
    })
    .join("");

  monthList.innerHTML = html;
}
renderSidebar();

window.showAllDiaries = () => {
  const user = auth.currentUser;
  if (!user) return;
  document.getElementById("current-title").innerText = "今日の日記";
  loadDiaries(user.uid);
};

window.filterByMonth = async (targetMonth) => {
  const user = auth.currentUser;
  if (!user) return;

  const diaryList = document.getElementById("diary-list");
  diaryList.innerHTML = `<p class="text-center text-stone-400 font-mono italic">Searching for ${targetMonth}...</p>`;

  // 表示タイトルの書き換え
  document.getElementById("current-title").innerText = `${targetMonth}月の日記`;

  // 1. 検索範囲（1日〜末日）を作成
  const now = new Date();
  let year = now.getFullYear();
  if (targetMonth > now.getMonth() + 1) year--; // 選択月が今月より先なら「去年」とみなす

  const startDate = new Date(year, targetMonth - 1, 1);
  const endDate = new Date(year, targetMonth, 0, 23, 59, 59);

  // 2. クエリ作成
  // ※ script.js上部の import に "where" を追加しているか確認してください
  const q = query(
    collection(db, "diaries"),
    where("uid", "==", user.uid),
    where("createdAt", ">=", startDate),
    where("createdAt", "<=", endDate),
    orderBy("createdAt", "desc")
  );

  try {
    const querySnapshot = await getDocs(q);
    renderDiariesFromSnapshot(querySnapshot); // 表示用に関数を分ける
  } catch (error) {
    console.error("Error filtering diaries:", error);
    // ここでインデックス作成のURLがコンソールに出ます
  }
};

// 共通の描画処理（loadDiariesとfilterByMonthの両方から使う）
function renderDiariesFromSnapshot(querySnapshot) {
  const diaryList = document.getElementById("diary-list");
  diaryList.innerHTML = "";

  if (querySnapshot.empty) {
    diaryList.innerHTML =
      '<p class="text-center text-stone-400">日記が見つかりませんでした</p>';
    return;
  }

  querySnapshot.forEach((docSnap) => {
    const diary = docSnap.data();
    const id = docSnap.id;
    const date = diary.createdAt?.toDate().toLocaleString() || "保存中...";

    const html = `
      <article class="bg-white p-6 rounded-2xl shadow-sm border-l-4 ${
        diary.is_marked ? "border-amber-400" : "border-stone-200"
      }">
          <p class="text-stone-800 whitespace-pre-wrap leading-relaxed text-lg mb-6">${
            diary.content
          }</p>
          <div class="flex justify-between items-center text-xs text-stone-400">
              <span>${date}</span>
              <div class="flex gap-4">
                  <button onclick="toggleMark('${id}', ${
      diary.is_marked
    })" class="${
      diary.is_marked ? "text-amber-500 font-bold" : "text-stone-300"
    }">${diary.is_marked ? "★ 保存済み" : "☆ 保存する"}</button>
                  <button onclick="toggleEdit('${id}')" class="hover:text-blue-500">編集</button>
                  <button onclick="deleteDiary('${id}')" class="hover:text-red-400">削除</button>
              </div>
          </div>
      </article>
    `;
    diaryList.insertAdjacentHTML("beforeend", html);
  });
}

// 既存の loadDiaries も修正（共通関数を使うように）
async function loadDiaries(uid) {
  const q = query(
    collection(db, "diaries"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  renderDiariesFromSnapshot(querySnapshot);
}

// 日記の保存
document.getElementById("diaryForm").onsubmit = async (e) => {
  e.preventDefault();
  const content = document.getElementById("diaryContent").value;
  const user = auth.currentUser;
  if (user) {
    await addDoc(collection(db, "diaries"), {
      content,
      uid: user.uid,
      is_marked: false,
      createdAt: serverTimestamp(),
    });
    document.getElementById("diaryContent").value = "";
    loadDiaries(user.uid);
  }
};

// グローバル関数として公開（HTML内のonclickから呼べるようにする）
window.toggleMark = async (id, currentStatus) => {
  await updateDoc(doc(db, "diaries", id), { is_marked: !currentStatus });
  loadDiaries(auth.currentUser.uid);
};
window.deleteDiary = async (id) => {
  if (confirm("削除しますか？")) {
    await deleteDoc(doc(db, "diaries", id));
    loadDiaries(auth.currentUser.uid);
  }
};

//　日記の編集
window.toggleEdit = async (id) => {
  const user = auth.currentUser;
  if (!user) return;

  // 1. クリックされた日記の要素を特定
  const article = document.querySelector(`button[onclick*="toggleEdit('${id}')"]`).closest("article");
  const contentP = article.querySelector("p");
  const currentContent = contentP.innerText;

  // 二重クリック防止（すでにtextareaがあれば何もしない）
  if (article.querySelector("textarea")) return;

  // 2. 表示を textarea と 保存・キャンセルボタンに書き換える
  const originalHTML = contentP.outerHTML; // キャンセル時に戻すため保存
  contentP.innerHTML = `
    <textarea id="edit-area-${id}" 
      class="w-full p-3 border-2 border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-stone-50" 
      rows="4">${currentContent}</textarea>
    <div class="flex gap-2 mt-2">
      <button id="save-btn-${id}" class="bg-amber-500 text-white px-4 py-1 rounded-full text-sm hover:bg-amber-600 transition">保存</button>
      <button id="cancel-btn-${id}" class="bg-stone-200 text-stone-600 px-4 py-1 rounded-full text-sm hover:bg-stone-300 transition">キャンセル</button>
    </div>
  `;

  // 3. 保存ボタンのクリックイベント
  document.getElementById(`save-btn-${id}`).onclick = async () => {
    const newContent = document.getElementById(`edit-area-${id}`).value;
    
    // 内容が空でなく、かつ変更がある場合のみ更新
    if (newContent.trim() !== "" && newContent !== currentContent) {
      try {
        await updateDoc(doc(db, "diaries", id), {
          content: newContent
        });
        loadDiaries(user.uid); // 再描画
      } catch (error) {
        console.error("編集失敗", error);
        alert("保存に失敗しました。");
      }
    } else {
      // 変更がなければ元に戻す
      contentP.outerHTML = originalHTML;
    }
  };

  // 4. キャンセルボタンのクリックイベント
  document.getElementById(`cancel-btn-${id}`).onclick = () => {
    contentP.outerHTML = originalHTML; // 元の <p> タグに戻す
  };
};

// 保存済み（★）のみを表示する関数
window.filterByMarked = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const diaryList = document.getElementById("diary-list");
  diaryList.innerHTML = `<p class="text-center text-stone-400 font-mono italic">Loading marked diaries...</p>`;

  // 表示タイトルの書き換え
  document.getElementById("current-title").innerText = "保存した日記";

  // クエリ作成: is_marked が true のものだけを抽出
  const q = query(
    collection(db, "diaries"),
    where("uid", "==", user.uid),
    where("is_marked", "==", true),
    orderBy("createdAt", "desc")
  );

  try {
    const querySnapshot = await getDocs(q);
    renderDiariesFromSnapshot(querySnapshot);
  } catch (error) {
    console.error("Error filtering marked diaries:", error);
    // 複合クエリ（where + orderBy）の場合、初回実行時にFirebaseコンソールでインデックス作成が必要な場合があります。
    // コンソールに表示されるリンクをクリックして作成してください。
  }
};
