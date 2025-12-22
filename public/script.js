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
    loadDiaries(user.uid);
  } else {
    document.getElementById("login-screen").classList.remove("hidden");
  }
});

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

// 日記の読み込み（本人分のみ）
async function loadDiaries(uid) {
  const q = query(
    collection(db, "diaries"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  const list = document.getElementById("diaryList");
  list.innerHTML = "";

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
    list.insertAdjacentHTML("beforeend", html);
  });
}

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
