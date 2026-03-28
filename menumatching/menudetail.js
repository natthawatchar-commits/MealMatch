import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const app  = initializeApp({ apiKey:"AIzaSyApISz8uFOfVirU3rX7Dk9wSVVwIKwY2OM",authDomain:"inventory-matching.firebaseapp.com",projectId:"inventory-matching",storageBucket:"inventory-matching.firebasestorage.app",messagingSenderId:"758643685191",appId:"1:758643685191:web:44a886c25e35d14185be62" });
const auth = getAuth(app);

const API_LOOKUP = "https://www.themealdb.com/api/json/v1/1/lookup.php?i=";
const fridgeNames = JSON.parse(localStorage.getItem("fridgeIngredients") || "[]");
let currentMeal = null;
let currentUser = null;

onAuthStateChanged(auth, user => { currentUser = user; });

loadMeal();

async function loadMeal() {
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) return;
  const res  = await fetch(API_LOOKUP + id);
  const data = await res.json();
  currentMeal = data.meals[0];
  renderMeal(currentMeal);
  checkFavState(id);
}

function renderMeal(meal) {
  document.title = `${meal.strMeal} – MealMatch`;
  document.getElementById("mealImage").src = meal.strMealThumb;
  document.getElementById("mealName").textContent     = meal.strMeal;
  document.getElementById("mealCategory").textContent = meal.strCategory;
  if (meal.strArea) {
    document.getElementById("mealArea").innerHTML =
      `<span class="area-tag"><i class="fas fa-globe" style="margin-right:3px;font-size:10px"></i>${meal.strArea}</span>`;
  }
  const ings = [];
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`], measure = meal[`strMeasure${i}`];
    if (name && name.trim()) ings.push({ name: name.trim(), measure: measure?.trim() || "" });
  }
  renderIngredients(ings);
  renderMatchSection(ings);
  renderInstructions(meal.strInstructions);
}

function renderIngredients(ings) {
  const grid = document.getElementById("ingredientList");
  grid.innerHTML = "";
  ings.forEach(({ name, measure }) => {
    const inFridge = fridgeNames.some(f => name.toLowerCase().includes(f) || f.includes(name.toLowerCase()));
    const item = document.createElement("div");
    item.className = `ing-item ${inFridge ? "have" : "missing"}`;
    item.innerHTML = inFridge
      ? `<div class="ing-check"><i class="fas fa-check"></i></div><div class="ing-info"><p class="ing-name">${name}</p><p class="ing-measure">${measure || "to taste"}</p></div>`
      : `<img class="ing-img" src="https://www.themealdb.com/images/ingredients/${name}.png" onerror="this.src='https://cdn-icons-png.flaticon.com/512/1046/1046857.png'"><div class="ing-info"><p class="ing-name">${name}</p><p class="ing-measure">${measure || "to taste"}</p></div>`;
    grid.appendChild(item);
  });
}

function renderMatchSection(ings) {
  if (!fridgeNames.length) return;
  const matched = ings.filter(({name}) => fridgeNames.some(f => name.toLowerCase().includes(f) || f.includes(name.toLowerCase())));
  const missing = ings.filter(({name}) => !fridgeNames.some(f => name.toLowerCase().includes(f) || f.includes(name.toLowerCase())));
  const pct = ings.length ? Math.round(matched.length / ings.length * 100) : 0;
  document.getElementById("matchSection").style.display = "block";
  document.getElementById("matchPct").textContent = `${pct}%`;
  document.getElementById("matchBarFill").style.width = `${pct}%`;
  const chips = document.getElementById("matchChips");
  matched.slice(0,4).forEach(({name}) => { chips.innerHTML += `<span class="match-chip have"><i class="fas fa-check" style="font-size:9px;margin-right:3px"></i>${name}</span>`; });
  missing.slice(0,3).forEach(({name}) => { chips.innerHTML += `<span class="match-chip missing">+ ${name}</span>`; });
}

function renderInstructions(text) {
  const container = document.getElementById("instructions");
  if (!text) { container.textContent = "No instructions available."; return; }
  const raw = text.replace(/\r\n/g, "\n");
  const steps = raw.split(/\n+/).filter(s => s.trim().length > 10);
  const makeTimeline = arr => `<div class="timeline">${arr.map((step, i) =>
    `<div class="inst-step-wrap" style="animation:bodySlide 0.4s ease ${0.1+i*0.06}s both"><div class="inst-step-num">${i+1}</div><div class="inst-step">${step.trim()}</div></div>`
  ).join("")}</div>`;
  if (steps.length > 1) { container.innerHTML = makeTimeline(steps); return; }
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const grouped = []; let chunk = "";
  sentences.forEach((s,i) => { chunk += s + " "; if ((i+1)%3===0 || i===sentences.length-1) { grouped.push(chunk.trim()); chunk=""; } });
  container.innerHTML = makeTimeline(grouped);
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
  if (idx === -1) { favs.push({ id, name: currentMeal.strMeal, image: currentMeal.strMealThumb }); btn.querySelector("i").className = "fas fa-heart"; btn.classList.add("active"); }
  else { favs.splice(idx,1); btn.querySelector("i").className = "far fa-heart"; btn.classList.remove("active"); }
  localStorage.setItem("favoriteMenus", JSON.stringify(favs));
};

function showLoginPrompt() {
  document.getElementById("__lp")?.remove();
  const o = document.createElement("div");
  o.id = "__lp";
  o.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:flex-end;justify-content:center;z-index:9999;";
  o.innerHTML = `<div style="background:#fff;width:100%;max-width:430px;border-radius:20px 20px 0 0;padding:28px 24px 40px;font-family:-apple-system,sans-serif;text-align:center">
    <div style="width:52px;height:52px;border-radius:50%;background:#EBF3FD;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:22px">🔒</div>
    <p style="font-size:17px;font-weight:700;margin-bottom:6px">Sign in required</p>
    <p style="font-size:13px;color:#9AA0B0;margin-bottom:20px">Sign in to save your favourite recipes</p>
    <a href="../login/login.html" style="display:block;padding:13px;background:#4A90E2;color:#fff;border-radius:14px;font-weight:700;text-decoration:none;margin-bottom:10px">Sign In</a>
    <a href="../register/register.html" style="display:block;padding:12px;background:#EBF3FD;color:#4A90E2;border-radius:14px;font-weight:600;text-decoration:none;margin-bottom:14px">Create Account</a>
    <button onclick="document.getElementById('__lp').remove()" style="background:none;border:none;color:#9AA0B0;cursor:pointer;font-size:13px">Maybe later</button>
  </div>`;
  o.addEventListener("click", e => { if(e.target===o) o.remove(); });
  document.body.appendChild(o);
}
