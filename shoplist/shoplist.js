import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app=initializeApp({apiKey:"AIzaSyApISz8uFOfVirU3rX7Dk9wSVVwIKwY2OM",authDomain:"inventory-matching.firebaseapp.com",projectId:"inventory-matching",storageBucket:"inventory-matching.firebasestorage.app",messagingSenderId:"758643685191",appId:"1:758643685191:web:44a886c25e35d14185be62"});
const auth=getAuth(app),db=getFirestore(app);
let currentUser=null,shoppingData=[],ingredientList=[];

onAuthStateChanged(auth,async(user)=>{
  currentUser=user;
  if(user){await loadShoppingList();renderQuickChips();}
  else{renderList();showGuestNotice();}
});

loadIngredientList();

function showGuestNotice(){
  const body=document.querySelector(".page-body");
  const notice=document.createElement("div");
  notice.style.cssText="background:#EBF3FD;border:1px solid #B8D4F5;border-radius:14px;padding:20px;text-align:center;font-size:13px;color:#2C6FBF;margin-bottom:16px;";
  notice.innerHTML=`<i class="fas fa-circle-info" style="font-size:24px;margin-bottom:8px;display:block"></i><p style="font-weight:700;margin-bottom:4px">Sign in to use Shopping List</p><p style="margin-bottom:14px;opacity:.8">Your list syncs across all your devices</p><a href="../login/login.html" style="display:inline-block;padding:10px 24px;background:#4A90E2;color:#fff;border-radius:12px;font-weight:700;text-decoration:none">Sign In</a>`;
  body.prepend(notice);
}

function renderQuickChips(){
  const fridgeRaw=localStorage.getItem("fridgeIngredients");
  if(!fridgeRaw)return;
  const fridge=JSON.parse(fridgeRaw);if(!fridge.length)return;
  const section=document.getElementById("chipsSection"),wrap=document.getElementById("quickChips");
  section.style.display="block";
  wrap.innerHTML=`<span style="font-size:11px;color:var(--text-3);white-space:nowrap;align-self:center">Quick add:</span>`;
  fridge.slice(0,8).forEach(name=>{
    const chip=document.createElement("div");chip.className="quick-chip";
    chip.innerHTML=`<img src="https://www.themealdb.com/images/ingredients/${name}.png" onerror="this.style.display='none'">${name}`;
    chip.onclick=()=>quickAdd(name);wrap.appendChild(chip);
  });
}

async function quickAdd(name){
  if(!currentUser){showLoginPrompt();return;}
  await addDoc(collection(db,"users",currentUser.uid,"shopping"),{name,qty:1,unit:"pcs",done:false,createdAt:new Date()});
  loadShoppingList();
}

async function loadIngredientList(){
  try{const r=await fetch("https://www.themealdb.com/api/json/v1/1/list.php?i=list");const d=await r.json();ingredientList=d.meals.map(i=>i.strIngredient.toLowerCase());}catch(e){}
}

async function loadShoppingList(){
  shoppingData=[];
  const snapshot=await getDocs(collection(db,"users",currentUser.uid,"shopping"));
  snapshot.forEach(d=>shoppingData.push({id:d.id,...d.data()}));
  renderList();
}

function renderList(){
  const pending=shoppingData.filter(i=>!i.done),done=shoppingData.filter(i=>i.done);
  document.getElementById("shopSub").textContent=`${shoppingData.length} total · ${done.length} done`;
  const badge=document.getElementById("leftBadge");
  pending.length>0?(badge.style.display="flex",document.getElementById("leftCount").textContent=pending.length):badge.style.display="none";
  document.getElementById("listEmpty").style.display=shoppingData.length===0?"block":"none";
  const toBuySection=document.getElementById("toBuySection"),toBuyList=document.getElementById("toBuyList"),toBuyLabel=document.getElementById("toBuyLabel");
  toBuyList.innerHTML="";
  if(pending.length){toBuySection.style.display="block";toBuyLabel.textContent=`TO BUY (${pending.length})`;pending.forEach(item=>toBuyList.appendChild(makeRow(item,false)));}
  else toBuySection.style.display="none";
  const doneSection=document.getElementById("doneSection"),doneList=document.getElementById("doneList"),doneLabel=document.getElementById("doneLabel");
  doneList.innerHTML="";
  if(done.length){doneSection.style.display="block";doneLabel.textContent=`DONE (${done.length})`;done.forEach(item=>doneList.appendChild(makeRow(item,true)));}
  else doneSection.style.display="none";
}

function makeRow(item,isDone){
  const row=document.createElement("div");row.className=`shop-item ${isDone?"done-item":""}`;
  row.innerHTML=`<button class="shop-check ${isDone?"checked":""}" onclick="toggleDone('${item.id}')"><i class="fas fa-check"></i></button><img src="https://www.themealdb.com/images/ingredients/${item.name}.png" onerror="this.src='https://cdn-icons-png.flaticon.com/512/1046/1046857.png'"><div class="shop-info"><p class="shop-name">${item.name}</p><p class="shop-qty">${item.qty} ${item.unit}</p></div><button class="shop-del" onclick="deleteItem('${item.id}')"><i class="fas fa-trash"></i></button>`;
  return row;
}

window.openModal=function(){
  if(!currentUser){showLoginPrompt();return;}
  document.getElementById("addModal").classList.add("open");
  setTimeout(()=>document.getElementById("itemInput").focus(),100);
};
window.closeModal=function(){
  document.getElementById("addModal").classList.remove("open");
  document.getElementById("itemInput").value="";document.getElementById("itemQty").value="";
  document.getElementById("suggestionBox").style.display="none";
};
window.addItem=async function(){
  if(!currentUser){showLoginPrompt();return;}
  const name=document.getElementById("itemInput").value.toLowerCase().trim();
  const qty=document.getElementById("itemQty").value||1;
  const unit=document.getElementById("itemUnit").value;
  if(!name)return;
  await addDoc(collection(db,"users",currentUser.uid,"shopping"),{name,qty:Number(qty),unit,done:false,createdAt:new Date()});
  closeModal();loadShoppingList();
};
window.toggleDone=async function(id){
  if(!currentUser)return;
  const item=shoppingData.find(i=>i.id===id);if(!item)return;
  await updateDoc(doc(db,"users",currentUser.uid,"shopping",id),{done:!item.done});loadShoppingList();
};
window.deleteItem=async function(id){
  if(!currentUser)return;
  await deleteDoc(doc(db,"users",currentUser.uid,"shopping",id));loadShoppingList();
};
window.clearDone=async function(){
  if(!currentUser)return;
  const done=shoppingData.filter(i=>i.done);
  await Promise.all(done.map(i=>deleteDoc(doc(db,"users",currentUser.uid,"shopping",i.id))));
  loadShoppingList();
};
window.showSuggestions=function(){
  const input=document.getElementById("itemInput"),keyword=input.value.toLowerCase().trim(),box=document.getElementById("suggestionBox");
  box.innerHTML="";
  if(!keyword||!ingredientList.length){box.style.display="none";return;}
  const matches=ingredientList.filter(n=>n.includes(keyword)).slice(0,7);
  if(!matches.length){box.style.display="none";return;}
  matches.forEach(name=>{const div=document.createElement("div");div.className="suggestion-item";div.innerHTML=`<img src="https://www.themealdb.com/images/ingredients/${name}.png" onerror="this.style.display='none'">${name}`;div.onclick=()=>{input.value=name;box.style.display="none";document.getElementById("itemQty").focus();};box.appendChild(div);});
  box.style.display="block";
};
document.addEventListener("click",e=>{if(!e.target.closest(".ingredient-wrapper"))document.getElementById("suggestionBox").style.display="none";});

function showLoginPrompt(){
  document.getElementById("__lp")?.remove();
  const o=document.createElement("div");o.id="__lp";
  o.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:flex-end;justify-content:center;z-index:9999;";
  o.innerHTML=`<div style="background:#fff;width:100%;max-width:430px;border-radius:20px 20px 0 0;padding:28px 24px 40px;font-family:-apple-system,sans-serif;text-align:center">
    <div style="width:52px;height:52px;border-radius:50%;background:#EBF3FD;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:22px">🔒</div>
    <p style="font-size:17px;font-weight:700;margin-bottom:6px">Sign in required</p>
    <p style="font-size:13px;color:#9AA0B0;margin-bottom:20px">Sign in to manage your shopping list</p>
    <a href="../login/login.html" style="display:block;padding:13px;background:#4A90E2;color:#fff;border-radius:14px;font-weight:700;text-decoration:none;margin-bottom:10px">Sign In</a>
    <a href="../register/register.html" style="display:block;padding:12px;background:#EBF3FD;color:#4A90E2;border-radius:14px;font-weight:600;text-decoration:none;margin-bottom:14px">Create Account</a>
    <button onclick="document.getElementById('__lp').remove()" style="background:none;border:none;color:#9AA0B0;cursor:pointer;font-size:13px">Maybe later</button>
  </div>`;
  o.addEventListener("click",e=>{if(e.target===o)o.remove();});
  document.body.appendChild(o);
}
