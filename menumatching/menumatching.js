import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const app  = initializeApp({ apiKey:"AIzaSyApISz8uFOfVirU3rX7Dk9wSVVwIKwY2OM",authDomain:"inventory-matching.firebaseapp.com",projectId:"inventory-matching",storageBucket:"inventory-matching.firebasestorage.app",messagingSenderId:"758643685191",appId:"1:758643685191:web:44a886c25e35d14185be62" });
const auth = getAuth(app);

const API_SEARCH = "https://www.themealdb.com/api/json/v1/1/search.php?s=";
let meals = [], visibleCount = 10, fridgeNames = [];
let currentUser = null;

onAuthStateChanged(auth, user => { currentUser = user; });

// get fridge from localStorage (set by myfridge.js when logged in)
const fridgeRaw = localStorage.getItem("fridgeIngredients");
fridgeNames = fridgeRaw ? JSON.parse(fridgeRaw) : [];

renderChips();
loadMenus();

function renderChips() {
  const wrap = document.getElementById("fridgeChips");
  if (!fridgeNames.length) {
    wrap.innerHTML = `<span style="font-size:12px;color:var(--text-3);padding:12px 0 0;white-space:nowrap">
      ${currentUser ? "Your fridge is empty" : "Sign in to match from your fridge"}
    </span>`;
    return;
  }
  fridgeNames.slice(0,8).forEach(name => {
    const chip = document.createElement("div"); chip.className = "fchip";
    chip.innerHTML = `<img src="https://www.themealdb.com/images/ingredients/${name}.png" onerror="this.style.display='none'">${name}`;
    wrap.appendChild(chip);
  });
}

async function loadMenus() {
  const list = document.getElementById("menuList");
  list.innerHTML = `<div class="state-box"><i class="fas fa-spinner fa-spin"></i>Finding recipes...</div>`;

  let allMeals = [];
  const cached = localStorage.getItem("allMeals");
  if (cached) { allMeals = JSON.parse(cached); }
  else {
    for (const l of "abcdefghijklmnopqrstuvwxyz".split("")) {
      try { const r = await fetch(API_SEARCH+l); const d = await r.json(); if(d.meals) allMeals=allMeals.concat(d.meals); } catch(e){}
    }
    const seen=new Set(); allMeals=allMeals.filter(m=>{if(seen.has(m.idMeal))return false;seen.add(m.idMeal);return true;});
    localStorage.setItem("allMeals", JSON.stringify(allMeals));
  }

  meals = allMeals.map(meal => {
    const ings = []; for(let i=1;i<=20;i++){const ing=meal[`strIngredient${i}`];if(ing&&ing.trim())ings.push(ing.toLowerCase());}
    const matched = fridgeNames.length ? ings.filter(ing=>fridgeNames.some(f=>ing.includes(f)||f.includes(ing))) : [];
    const score = ings.length ? matched.length/ings.length : 0;
    return { meal, score, matched, ings };
  });
  meals.sort((a,b) => b.score-a.score);

  document.getElementById("discoverSub").textContent = fridgeNames.length
    ? `Based on ${fridgeNames.length} ingredients in your fridge`
    : "Browse all recipes — sign in to match from your fridge";

  renderMenus();
}

function renderMenus(data=null) {
  const source = data || meals;
  const list   = document.getElementById("menuList");
  list.innerHTML = "";
  if (!source.length) { list.innerHTML=`<div class="state-box"><i class="fas fa-search"></i>No recipes found</div>`; document.getElementById("loadMoreWrap").innerHTML=""; document.getElementById("resultsInfo").textContent=""; return; }
  document.getElementById("resultsInfo").textContent = `${source.length} recipes found · sorted by match`;

  source.slice(0, visibleCount).forEach(({ meal, score, matched, ings }) => {
    const pct  = Math.round(score*100);
    const tier = pct>=50?"high":pct>=20?"medium":"low";
    const isFav = JSON.parse(localStorage.getItem("favoriteMenus")||"[]").some(m=>m.id===meal.idMeal);
    const missing = ings.filter(i=>!fridgeNames.some(f=>i.includes(f)||f.includes(i)));
    const matchChips = matched.slice(0,3).map(i=>`<span class="mc-ing-chip match"><i class="fas fa-check" style="font-size:9px;margin-right:3px"></i>${i}</span>`).join("");
    const moreChip = matched.length>3?`<span class="mc-ing-chip more">+${matched.length-3} more</span>`:"";
    const missChips = missing.slice(0,2).map(i=>`<span class="mc-miss-chip">+ ${i}</span>`).join("");

    const card = document.createElement("div");
    card.className = "menu-card";
    card.innerHTML = `
      <div class="mc-img-wrap">
        <img src="${meal.strMealThumb}" alt="${meal.strMeal}" loading="lazy">
        <span class="mc-match-badge ${tier}">${pct>0?pct+"% match":"No match data"}</span>
        <button class="mc-fav-btn" onclick="toggleFav(event,'${meal.idMeal}','${meal.strMeal.replace(/'/g,"\\'")}','${meal.strMealThumb}')">
          <i class="${isFav?"fas":"far"} fa-heart"></i>
        </button>
        <span class="mc-cat-badge">${meal.strCategory}</span>
      </div>
      <div class="mc-body">
        <p class="mc-title">${meal.strMeal}</p>
        <div class="mc-meta">
          <span><i class="fas fa-clock" style="margin-right:3px;font-size:11px"></i>~20 min</span>
          <span><i class="fas fa-users" style="margin-right:3px;font-size:11px"></i>2 servings</span>
        </div>
        ${fridgeNames.length?`<div class="mc-bar-row"><span class="mc-bar-label">Ingredient match</span><div class="mc-bar-track"><div class="mc-bar-fill ${tier}" style="width:${pct}%"></div></div><span class="mc-bar-pct ${tier}">${pct}%</span></div>`:""}
        ${matched.length?`<div class="mc-ing-row">${matchChips}${moreChip}</div>`:""}
        ${missing.length&&fridgeNames.length?`<div class="mc-miss-row"><span class="mc-miss-label">Missing:</span>${missChips}</div>`:""}
      </div>`;
    card.querySelector(".mc-img-wrap").addEventListener("click", e => { if(e.target.closest(".mc-fav-btn")) return; openDetail(meal.idMeal); });
    card.querySelector(".mc-body").onclick = () => openDetail(meal.idMeal);
    list.appendChild(card);
  });

  document.getElementById("loadMoreWrap").innerHTML = visibleCount < source.length
    ? `<button class="load-more-btn" onclick="loadMore()">Show more recipes <i class="fas fa-chevron-down" style="margin-left:6px;font-size:12px"></i></button>` : "";
}

window.loadMore   = () => { visibleCount+=10; renderMenus(); };
window.openDetail = id => { window.location.href=`menudetail.html?id=${id}`; };
window.searchMenu = () => {
  const kw=document.getElementById("menuSearch").value.trim().toLowerCase();
  visibleCount=10;
  renderMenus(kw ? meals.filter(({meal})=>meal.strMeal.toLowerCase().includes(kw)) : null);
};

window.toggleFav = function(e, id, name, image) {
  e.stopPropagation();
  if (!currentUser) { showLoginPrompt(); return; }
  let favs=JSON.parse(localStorage.getItem("favoriteMenus")||"[]");
  const idx=favs.findIndex(m=>m.id===id), btn=e.currentTarget.querySelector("i");
  if(idx===-1){favs.push({id,name,image});btn.className="fas fa-heart";}
  else{favs.splice(idx,1);btn.className="far fa-heart";}
  localStorage.setItem("favoriteMenus",JSON.stringify(favs));
};

function showLoginPrompt() {
  document.getElementById("__lp")?.remove();
  const o=document.createElement("div"); o.id="__lp";
  o.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:flex-end;justify-content:center;z-index:9999;";
  o.innerHTML=`<div style="background:#fff;width:100%;max-width:430px;border-radius:20px 20px 0 0;padding:28px 24px 40px;font-family:-apple-system,sans-serif;text-align:center">
    <div style="width:52px;height:52px;border-radius:50%;background:#EBF3FD;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:22px">🔒</div>
    <p style="font-size:17px;font-weight:700;margin-bottom:6px">Sign in required</p>
    <p style="font-size:13px;color:#9AA0B0;margin-bottom:20px">Sign in to save recipes and match from your fridge</p>
    <a href="../login/login.html" style="display:block;padding:13px;background:#4A90E2;color:#fff;border-radius:14px;font-weight:700;text-decoration:none;margin-bottom:10px">Sign In</a>
    <a href="../register/register.html" style="display:block;padding:12px;background:#EBF3FD;color:#4A90E2;border-radius:14px;font-weight:600;text-decoration:none;margin-bottom:14px">Create Account</a>
    <button onclick="document.getElementById('__lp').remove()" style="background:none;border:none;color:#9AA0B0;cursor:pointer;font-size:13px">Maybe later</button>
  </div>`;
  o.addEventListener("click",e=>{if(e.target===o)o.remove();});
  document.body.appendChild(o);
}
