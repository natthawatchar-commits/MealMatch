import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const app  = initializeApp({ apiKey:"AIzaSyApISz8uFOfVirU3rX7Dk9wSVVwIKwY2OM",authDomain:"inventory-matching.firebaseapp.com",projectId:"inventory-matching",storageBucket:"inventory-matching.firebasestorage.app",messagingSenderId:"758643685191",appId:"1:758643685191:web:44a886c25e35d14185be62" });
const auth = getAuth(app);

const fridgeNames = JSON.parse(localStorage.getItem("fridgeIngredients") || "[]");
let currentMeal = null;
let currentUser = null;

onAuthStateChanged(auth, user => { currentUser = user; });

document.addEventListener("DOMContentLoaded", () => {
  loadMeal();
});

function loadMeal() {
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) return;
  
  const meals = window.THAI_MEALS || [];
  currentMeal = meals.find(m => m.idMeal === id);
  
  if (currentMeal) {
    renderMeal(currentMeal);
    checkFavState(id);
  }
}

function renderMeal(meal) {
  document.title = `${meal.strMeal} – MealMatch`;
  document.getElementById("mealImage").src = meal.strMealThumb;
  document.getElementById("mealName").textContent = meal.strMeal;
  document.getElementById("mealCategory").textContent = meal.strCategory;
  
  if (meal.strArea) {
    document.getElementById("mealArea").innerHTML =
      `<span class="area-tag"><i class="fas fa-globe" style="margin-right:3px;font-size:10px"></i>${meal.strArea}</span>`;
  }
  
  const ings = meal.ingredients || [];
  renderIngredients(ings);
  renderMatchSection(ings);
  renderInstructions(meal.instructions);
}

function renderIngredients(ings) {
  const grid = document.getElementById("ingredientList");
  grid.innerHTML = "";
  ings.forEach(({ name, measure }) => {
    const inFridge = fridgeNames.some(f => name.toLowerCase().includes(f.toLowerCase()) || f.toLowerCase().includes(name.toLowerCase()));
    const item = document.createElement("div");
    item.className = `ing-item ${inFridge ? "have" : "missing"}`;
    item.innerHTML = inFridge
      ? `<div class="ing-check"><i class="fas fa-check"></i></div><div class="ing-info"><p class="ing-name">${name}</p><p class="ing-measure">${measure || ""}</p></div>`
      : `<div class="ing-info" style="padding-left:6px"><p class="ing-name">${name}</p><p class="ing-measure">${measure || ""}</p></div>`;
    grid.appendChild(item);
  });
}

function renderMatchSection(ings) {
  if (!fridgeNames.length) return;
  const matched = ings.filter(({ name }) => fridgeNames.some(f => name.toLowerCase().includes(f.toLowerCase()) || f.toLowerCase().includes(name.toLowerCase())));
  const missing = ings.filter(({ name }) => !fridgeNames.some(f => name.toLowerCase().includes(f.toLowerCase()) || f.toLowerCase().includes(name.toLowerCase())));
  const pct = ings.length ? Math.round(matched.length / ings.length * 100) : 0;
  
  document.getElementById("matchSection").style.display = "block";
  document.getElementById("matchPct").textContent = `${pct}%`;
  document.getElementById("matchBarFill").style.width = `${pct}%`;
  
  const chips = document.getElementById("matchChips");
  chips.innerHTML = "";
  matched.slice(0, 4).forEach(({ name }) => { chips.innerHTML += `<span class="match-chip have"><i class="fas fa-check" style="font-size:9px;margin-right:3px"></i>${name}</span>`; });
  missing.slice(0, 3).forEach(({ name }) => { chips.innerHTML += `<span class="match-chip missing">+ ${name}</span>`; });
}

function renderInstructions(steps) {
  const container = document.getElementById("instructions");
  if (!steps || !steps.length) { container.textContent = "ไม่มีข้อมูลวิธีทำ"; return; }
  
  const makeTimeline = arr => `<div class="timeline">${arr.map((step, i) =>
    `<div class="inst-step-wrap"><div class="inst-step-num">${i + 1}</div><div class="inst-step">${step}</div></div>`
  ).join("")}</div>`;
  
  container.innerHTML = makeTimeline(steps);
}

function checkFavState(id) {
  const favs = JSON.parse(localStorage.getItem("favoriteMenus") || "[]");
  if (favs.some(m => m.id === id)) {
    const btn = document.getElementById("favBtn");
    btn.querySelector("i").className = "fas fa-heart";
    btn.classList.add("active");
  }
}

window.toggleFav = function () {
  if (!currentUser) { showLoginPrompt(); return; }
  if (!currentMeal) return;
  let favs = JSON.parse(localStorage.getItem("favoriteMenus") || "[]");
  const id = currentMeal.idMeal, idx = favs.findIndex(m => m.id === id);
  const btn = document.getElementById("favBtn");
  if (idx === -1) { 
    favs.push({ id, name: currentMeal.strMeal, image: currentMeal.strMealThumb }); 
    btn.querySelector("i").className = "fas fa-heart"; 
    btn.classList.add("active"); 
  } else { 
    favs.splice(idx, 1); 
    btn.querySelector("i").className = "far fa-heart"; 
    btn.classList.remove("active"); 
  }
  localStorage.setItem("favoriteMenus", JSON.stringify(favs));
};