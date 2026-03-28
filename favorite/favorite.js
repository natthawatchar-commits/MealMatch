import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

initializeApp({apiKey:"AIzaSyApISz8uFOfVirU3rX7Dk9wSVVwIKwY2OM",authDomain:"inventory-matching.firebaseapp.com",projectId:"inventory-matching",storageBucket:"inventory-matching.firebasestorage.app",messagingSenderId:"758643685191",appId:"1:758643685191:web:44a886c25e35d14185be62"});
const auth=getAuth();
let currentUser=null;

onAuthStateChanged(auth,user=>{
  currentUser=user;
  // favorites work from localStorage regardless of login state
});

let ingredientList=[],favoriteIngredients=JSON.parse(localStorage.getItem("favoriteIngredients")||"[]"),favoriteMenus=JSON.parse(localStorage.getItem("favoriteMenus")||"[]");
const fridgeNames=JSON.parse(localStorage.getItem("fridgeIngredients")||"[]");

loadIngredientList();
renderRecipes();
renderIngredients();
updateCounts();

window.switchTab=function(tab){
  document.getElementById("panelRecipes").style.display=tab==="recipes"?"block":"none";
  document.getElementById("panelIngredients").style.display=tab==="ingredients"?"block":"none";
  document.getElementById("tabRecipes").classList.toggle("active",tab==="recipes");
  document.getElementById("tabIngredients").classList.toggle("active",tab==="ingredients");
};

function updateCounts(){
  document.getElementById("cntRecipes").textContent=favoriteMenus.length;
  document.getElementById("cntIngredients").textContent=favoriteIngredients.length;
}

function renderRecipes(){
  const list=document.getElementById("recipeList"),empty=document.getElementById("recipeEmpty");
  list.querySelectorAll(".recipe-row").forEach(r=>r.remove());
  if(!favoriteMenus.length){empty.style.display="block";return;}
  empty.style.display="none";
  favoriteMenus.forEach(menu=>{
    const pct=computeMatch(menu.id),tier=pct>=50?"high":pct>=25?"medium":"low";
    const row=document.createElement("div");row.className="recipe-row";
    row.innerHTML=`<img class="recipe-row-img" src="${menu.image}" alt="${menu.name}" onerror="this.src='https://cdn-icons-png.flaticon.com/512/1046/1046857.png'"><div class="recipe-row-body"><p class="recipe-row-title">${menu.name}</p><div class="recipe-row-meta"><span><i class="fas fa-clock"></i>~20 min</span><span><i class="fas fa-users"></i>2 servings</span></div><div class="recipe-bar-track"><div class="recipe-bar-fill ${tier}" style="width:${pct}%"></div></div><p class="recipe-bar-pct ${tier}">${pct}%</p></div><div class="recipe-row-actions"><button class="heart-btn active" data-id="${menu.id}"><i class="fas fa-heart"></i></button></div>`;
    row.querySelector(".recipe-row-body").onclick=()=>{window.location.href=`../menumatching/menudetail.html?id=${menu.id}`;};
    row.querySelector(".recipe-row-img").onclick=()=>{window.location.href=`../menumatching/menudetail.html?id=${menu.id}`;};
    row.querySelector(".heart-btn").onclick=(e)=>{e.stopPropagation();toggleMenu(menu.id,menu.name,menu.image,e.currentTarget);};
    list.appendChild(row);
  });
}

function computeMatch(mealId){
  const cached=localStorage.getItem("allMeals");if(!cached||!fridgeNames.length)return 0;
  try{const meals=JSON.parse(cached),meal=meals.find(m=>m.idMeal===mealId);if(!meal)return 0;
    const ings=[];for(let i=1;i<=20;i++){const ing=meal[`strIngredient${i}`];if(ing&&ing.trim())ings.push(ing.toLowerCase());}
    if(!ings.length)return 0;
    return Math.round(ings.filter(ing=>fridgeNames.some(f=>ing.includes(f)||f.includes(ing))).length/ings.length*100);
  }catch(e){return 0;}
}

function toggleMenu(id,name,image,btn){
  const idx=favoriteMenus.findIndex(m=>m.id===id);
  if(idx===-1)favoriteMenus.push({id,name,image});else favoriteMenus.splice(idx,1);
  localStorage.setItem("favoriteMenus",JSON.stringify(favoriteMenus));
  renderRecipes();updateCounts();
}

function renderIngredients(){
  const list=document.getElementById("ingredientList"),empty=document.getElementById("ingredientEmpty");
  list.querySelectorAll(".ing-row").forEach(r=>r.remove());
  if(!favoriteIngredients.length){empty.style.display="block";return;}
  empty.style.display="none";
  favoriteIngredients.forEach(name=>{
    const row=document.createElement("div");row.className="ing-row";
    row.innerHTML=`<img src="https://www.themealdb.com/images/ingredients/${name}.png" onerror="this.src='https://cdn-icons-png.flaticon.com/512/1046/1046857.png'"><span class="ing-row-name">${name}</span><button class="heart-btn active"><i class="fas fa-heart"></i></button>`;
    row.querySelector(".heart-btn").onclick=()=>toggleIngredient(name);
    list.appendChild(row);
  });
}

function toggleIngredient(name){
  const idx=favoriteIngredients.indexOf(name);
  if(idx===-1)favoriteIngredients.push(name);else favoriteIngredients.splice(idx,1);
  localStorage.setItem("favoriteIngredients",JSON.stringify(favoriteIngredients));
  renderIngredients();updateCounts();
}

window.searchRecipeFavorite=async function(){
  const input=document.getElementById("recipeInput"),keyword=input.value.trim(),box=document.getElementById("recipeSuggestionBox");
  box.innerHTML="";if(!keyword){box.style.display="none";return;}
  try{
    const r=await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${keyword}`);const d=await r.json();
    if(d.meals&&d.meals.length){
      d.meals.slice(0,6).forEach(meal=>{
        const isSaved=favoriteMenus.some(m=>m.id===meal.idMeal);
        const div=document.createElement("div");div.className="suggestion-item";
        div.innerHTML=`<img src="${meal.strMealThumb}" style="border-radius:6px;width:28px;height:28px;object-fit:cover"><span style="flex:1">${meal.strMeal}</span><i class="fas fa-heart" style="color:${isSaved?"#EF4444":"#D1D5DB"};font-size:13px"></i>`;
        div.onclick=()=>addMenuFavorite({id:meal.idMeal,name:meal.strMeal,image:meal.strMealThumb});
        box.appendChild(div);
      });box.style.display="block";
    }else box.style.display="none";
  }catch(e){box.style.display="none";}
};

function addMenuFavorite(menu){
  if(!favoriteMenus.some(m=>m.id===menu.id)){favoriteMenus.push(menu);localStorage.setItem("favoriteMenus",JSON.stringify(favoriteMenus));renderRecipes();updateCounts();}
  document.getElementById("recipeInput").value="";document.getElementById("recipeSuggestionBox").style.display="none";
}

window.searchFavorite=async function(){
  const input=document.getElementById("favoriteInput"),keyword=input.value.toLowerCase().trim(),box=document.getElementById("suggestionBox");
  box.innerHTML="";if(!keyword){box.style.display="none";return;}
  const ingMatches=ingredientList.filter(n=>n.toLowerCase().includes(keyword)).slice(0,8);
  if(ingMatches.length){
    box.innerHTML+=`<div class="suggestion-title">Ingredients</div>`;
    ingMatches.forEach(name=>{
      const isSaved=favoriteIngredients.includes(name);
      const div=document.createElement("div");div.className="suggestion-item";
      div.innerHTML=`<img src="https://www.themealdb.com/images/ingredients/${name}.png" onerror="this.style.display='none'" style="width:28px;height:28px;object-fit:contain"><span style="flex:1">${name}</span><i class="fas fa-heart" style="color:${isSaved?"#EF4444":"#D1D5DB"};font-size:13px"></i>`;
      div.onclick=()=>addIngredientFavorite(name);box.appendChild(div);
    });box.style.display="block";
  }else box.style.display="none";
};

function addIngredientFavorite(name){
  if(!favoriteIngredients.includes(name)){favoriteIngredients.push(name);localStorage.setItem("favoriteIngredients",JSON.stringify(favoriteIngredients));renderIngredients();updateCounts();}
  document.getElementById("favoriteInput").value="";document.getElementById("suggestionBox").style.display="none";
}

document.addEventListener("click",e=>{if(!e.target.closest(".ingredient-wrapper")){document.querySelectorAll(".suggestion-box").forEach(b=>b.style.display="none");}});

async function loadIngredientList(){try{const r=await fetch("https://www.themealdb.com/api/json/v1/1/list.php?i=list");const d=await r.json();ingredientList=d.meals.map(i=>i.strIngredient);}catch(e){}}
