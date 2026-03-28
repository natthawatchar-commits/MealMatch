// Browse — no login required
const API_SEARCH = "https://www.themealdb.com/api/json/v1/1/search.php?s=";
let meals = [], filtered = [], visibleCount = 30;

loadAllMenus();

async function loadAllMenus() {
  const grid = document.getElementById("menuList");
  grid.innerHTML = `<div class="state-box"><i class="fas fa-spinner fa-spin"></i>Loading recipes...</div>`;

  const cached = localStorage.getItem("allMeals");
  if (cached) {
    meals = filtered = JSON.parse(cached);
    document.getElementById("browseSub").textContent = `${meals.length} recipes`;
    renderGrid(); return;
  }

  let all = [];
  for (const l of "abcdefghijklmnopqrstuvwxyz".split("")) {
    try { const r = await fetch(API_SEARCH + l); const d = await r.json(); if (d.meals) all = all.concat(d.meals); } catch(e){}
  }
  const seen = new Set();
  meals = all.filter(m => { if(seen.has(m.idMeal)) return false; seen.add(m.idMeal); return true; });
  localStorage.setItem("allMeals", JSON.stringify(meals));
  filtered = meals;
  document.getElementById("browseSub").textContent = `${meals.length} recipes`;
  renderGrid();
}

function renderGrid() {
  const grid = document.getElementById("menuList");
  grid.innerHTML = "";
  if (!filtered.length) { grid.innerHTML = `<div class="state-box"><i class="fas fa-search"></i>No recipes found</div>`; document.getElementById("loadMoreWrap").innerHTML = ""; return; }
  filtered.slice(0, visibleCount).forEach(meal => {
    const card = document.createElement("div");
    card.className = "menu-card";
    card.onclick = () => { window.location.href = `menudetail.html?id=${meal.idMeal}`; };
    card.innerHTML = `<img src="${meal.strMealThumb}" alt="${meal.strMeal}" loading="lazy"><p class="menu-name">${meal.strMeal}</p>`;
    grid.appendChild(card);
  });
  const wrap = document.getElementById("loadMoreWrap");
  wrap.innerHTML = visibleCount < filtered.length
    ? `<button class="load-more-btn" onclick="loadMore()">Show more <i class="fas fa-chevron-down" style="margin-left:6px;font-size:12px"></i></button>` : "";
}

window.loadMore   = () => { visibleCount += 30; renderGrid(); };
window.searchMenu = () => {
  const kw = document.getElementById("menuSearch").value.trim().toLowerCase();
  visibleCount = 30;
  filtered = kw ? meals.filter(m => m.strMeal.toLowerCase().includes(kw)) : meals;
  renderGrid();
};
