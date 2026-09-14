// allmenus.js — แสดงรายการเมนูอาหารไทยทั้งหมด
let meals = [], filtered = [], visibleCount = 30;

document.addEventListener("DOMContentLoaded", () => {
  loadAllMenus();
});

function loadAllMenus() {
  const grid = document.getElementById("menuList");
  grid.innerHTML = `<div class="state-box"><i class="fas fa-spinner fa-spin"></i>กำลังโหลดเมนู...</div>`;

  // อ่านข้อมูลจาก THAI_MEALS ที่เตรียมไว้
  meals = filtered = window.THAI_MEALS || [];
  
  document.getElementById("browseSub").textContent = `${meals.length} เมนู`;
  renderGrid();
}

function renderGrid() {
  const grid = document.getElementById("menuList");
  grid.innerHTML = "";
  
  if (!filtered.length) {
    grid.innerHTML = `<div class="state-box"><i class="fas fa-search"></i>ไม่พบเมนูอาหาร</div>`;
    document.getElementById("loadMoreWrap").innerHTML = "";
    return;
  }
  
  filtered.slice(0, visibleCount).forEach(meal => {
    const card = document.createElement("div");
    card.className = "menu-card";
    card.onclick = () => { window.location.href = `menudetail.html?id=${meal.idMeal}`; };
    card.innerHTML = `
      <img src="${meal.strMealThumb}" alt="${meal.strMeal}" loading="lazy">
      <p class="menu-name">${meal.strMeal}</p>
    `;
    grid.appendChild(card);
  });

  const wrap = document.getElementById("loadMoreWrap");
  wrap.innerHTML = visibleCount < filtered.length
    ? `<button class="load-more-btn" onclick="loadMore()">แสดงเพิ่มเติม <i class="fas fa-chevron-down" style="margin-left:6px;font-size:12px"></i></button>`
    : "";
}

window.loadMore = () => { visibleCount += 30; renderGrid(); };
window.searchMenu = () => {
  const kw = document.getElementById("menuSearch").value.trim().toLowerCase();
  visibleCount = 30;
  filtered = kw ? meals.filter(m => m.strMeal.toLowerCase().includes(kw)) : meals;
  renderGrid();
};