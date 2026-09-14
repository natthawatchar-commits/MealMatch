import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const app  = initializeApp({ apiKey:"AIzaSyApISz8uFOfVirU3rX7Dk9wSVVwIKwY2OM",authDomain:"inventory-matching.firebaseapp.com",projectId:"inventory-matching",storageBucket:"inventory-matching.firebasestorage.app",messagingSenderId:"758643685191",appId:"1:758643685191:web:44a886c25e35d14185be62" });
const auth = getAuth(app);

let meals = [], visibleCount = 10, fridgeNames = [];
let currentUser = null;

onAuthStateChanged(auth, user => { currentUser = user; });

const fridgeRaw = localStorage.getItem("fridgeIngredients");
fridgeNames = fridgeRaw ? JSON.parse(fridgeRaw) : [];

document.addEventListener("DOMContentLoaded", () => {
  renderChips();
  loadMenus();
});

function renderChips() {
  const wrap = document.getElementById("fridgeChips");
  if (!fridgeNames.length) {
    wrap.innerHTML = `<span style="font-size:12px;color:var(--text-3);padding:12px 0 0;white-space:nowrap">
      ${currentUser ? "ตู้เย็นของคุณว่างเปล่า" : "เข้าสู่ระบบเพื่อจับคู่เมนูจากตู้เย็นของคุณ"}
    </span>`;
    return;
  }
  fridgeNames.slice(0,8).forEach(name => {
    const chip = document.createElement("div"); chip.className = "fchip";
    chip.innerHTML = `${name}`;
    wrap.appendChild(chip);
  });
}

function loadMenus() {
  const list = document.getElementById("menuList");
  list.innerHTML = `<div class="state-box"><i class="fas fa-spinner fa-spin"></i>กำลังค้นหาเมนู...</div>`;

  const allMeals = window.THAI_MEALS || [];

  meals = allMeals.map(meal => {
    const ings = meal.ingredients ? meal.ingredients.map(i => i.name.toLowerCase()) : [];
    const matched = fridgeNames.length ? ings.filter(ing => fridgeNames.some(f => ing.includes(f.toLowerCase()) || f.toLowerCase().includes(ing))) : [];
    const score = ings.length ? matched.length / ings.length : 0;
    return { meal, score, matched, ings };
  });

  // เรียงลำดับจากเมนูที่ตรงกับวัตถุดิบมากที่สุด
  meals.sort((a,b) => b.score - a.score);

  document.getElementById("discoverSub").textContent = fridgeNames.length
    ? `คำนวณจากวัตถุดิบ ${fridgeNames.length} ชนิดในตู้เย็น`
    : "เมนูอาหารไทยแนะนำทั้งหมด";

  renderMenus();
}

function renderMenus(data = null) {
  const source = data || meals;
  const list = document.getElementById("menuList");
  list.innerHTML = "";

  if (!source.length) {
    list.innerHTML = `<div class="state-box"><i class="fas fa-search"></i>ไม่พบเมนูอาหาร</div>`;
    document.getElementById("loadMoreWrap").innerHTML = "";
    document.getElementById("resultsInfo").textContent = "";
    return;
  }

  document.getElementById("resultsInfo").textContent = `พบ ${source.length} เมนู · เรียงตามความตรงกันของวัตถุดิบ`;

  source.slice(0, visibleCount).forEach(({ meal, score, matched, ings }) => {
    const pct = Math.round(score * 100);
    const tier = pct >= 50 ? "high" : pct >= 20 ? "medium" : "low";
    const isFav = JSON.parse(localStorage.getItem("favoriteMenus") || "[]").some(m => m.id === meal.idMeal);
    const missing = ings.filter(i => !fridgeNames.some(f => i.includes(f.toLowerCase()) || f.toLowerCase().includes(i)));
    
    const matchChips = matched.slice(0, 3).map(i => `<span class="mc-ing-chip match"><i class="fas fa-check" style="font-size:9px;margin-right:3px"></i>${i}</span>`).join("");
    const moreChip = matched.length > 3 ? `<span class="mc-ing-chip more">+อีก ${matched.length - 3}</span>` : "";
    const missChips = missing.slice(0, 2).map(i => `<span class="mc-miss-chip">+ ${i}</span>`).join("");

    const card = document.createElement("div");
    card.className = "menu-card";
    card.innerHTML = `
      <div class="mc-img-wrap">
        <img src="${meal.strMealThumb}" alt="${meal.strMeal}" loading="lazy">
        <span class="mc-match-badge ${tier}">${pct > 0 ? "ตรงกัน " + pct + "%" : "ไม่มีวัตถุดิบ"}</span>
        <button class="mc-fav-btn" onclick="toggleFav(event,'${meal.idMeal}','${meal.strMeal.replace(/'/g,"\\'")}','${meal.strMealThumb}')">
          <i class="${isFav ? "fas" : "far"} fa-heart"></i>
        </button>
        <span class="mc-cat-badge">${meal.strCategory}</span>
      </div>
      <div class="mc-body">
        <p class="mc-title">${meal.strMeal}</p>
        <div class="mc-meta">
          <span><i class="fas fa-clock" style="margin-right:3px;font-size:11px"></i>~30 นาที</span>
          <span><i class="fas fa-users" style="margin-right:3px;font-size:11px"></i>2-4 ที่</span>
        </div>
        ${fridgeNames.length ? `<div class="mc-bar-row"><span class="mc-bar-label">วัตถุดิบตรงกัน</span><div class="mc-bar-track"><div class="mc-bar-fill ${tier}" style="width:${pct}%"></div></div><span class="mc-bar-pct ${tier}">${pct}%</span></div>` : ""}
        ${matched.length ? `<div class="mc-ing-row">${matchChips}${moreChip}</div>` : ""}
        ${missing.length && fridgeNames.length ? `<div class="mc-miss-row"><span class="mc-miss-label">ขาดวัตถุดิบ:</span>${missChips}</div>` : ""}
      </div>`;
    
    card.querySelector(".mc-img-wrap").addEventListener("click", e => { if (e.target.closest(".mc-fav-btn")) return; openDetail(meal.idMeal); });
    card.querySelector(".mc-body").onclick = () => openDetail(meal.idMeal);
    list.appendChild(card);
  });

  document.getElementById("loadMoreWrap").innerHTML = visibleCount < source.length
    ? `<button class="load-more-btn" onclick="loadMore()">แสดงเพิ่มเติม <i class="fas fa-chevron-down" style="margin-left:6px;font-size:12px"></i></button>` : "";
}

window.loadMore = () => { visibleCount += 10; renderMenus(); };
window.openDetail = id => { window.location.href = `menudetail.html?id=${id}`; };
window.searchMenu = () => {
  const kw = document.getElementById("menuSearch").value.trim().toLowerCase();
  visibleCount = 10;
  renderMenus(kw ? meals.filter(({ meal }) => meal.strMeal.toLowerCase().includes(kw)) : null);
};