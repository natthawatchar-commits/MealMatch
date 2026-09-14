import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app  = initializeApp({apiKey:"AIzaSyApISz8uFOfVirU3rX7Dk9wSVVwIKwY2OM",authDomain:"inventory-matching.firebaseapp.com",projectId:"inventory-matching",storageBucket:"inventory-matching.firebasestorage.app",messagingSenderId:"758643685191",appId:"1:758643685191:web:44a886c25e35d14185be62",measurementId:"G-TZRDCHH5WC"});
const auth = getAuth(app);
const db   = getFirestore(app);

let currentUser=null, items=[], currentIndex=null;
const MAX_SLOTS=16;

/* ── THAI TO ENGLISH MAPPING FOR IMAGES ── */
const THAI_ING_MAP = {
  // Thai -> English
  "ไก่": "chicken", "หมู": "pork", "เนื้อวัว": "beef", "กุ้ง": "shrimp", "ปลา": "fish",
  "ไข่": "egg", "ไข่ไก่": "egg", "น้ำปลา": "fish sauce", "พริก": "chili", "กระเทียม": "garlic",
  "กะเพรา": "basil", "มะนาว": "lime", "หอมใหญ่": "onion", "หอมแดง": "shallot", "น้ำมันพืช": "oil",
  "น้ำตาล": "sugar", "เกลือ": "salt", "หมูกรอบ": "pork belly", "คะน้า": "kale", "เต้าหู้": "tofu",
  "เห็ด": "mushroom", "ต้นหอม": "spring onion", "ผักชี": "coriander", "มะเขือเทศ": "tomato"
};

function getImgUrl(name) {
  if (!name) return "https://cdn-icons-png.flaticon.com/512/1046/1046857.png";
  
  // แปลงเป็นอักษรพิมพ์เล็กและตัดช่องว่างหัวท้าย
  const clean = name.trim().toLowerCase();
  
  // 1. ถ้ามีใน Dictionary แปลงเป็นอังกฤษ
  let engName = THAI_ING_MAP[clean] || clean;
  
  // 2. จัดการคำภาษาอังกฤษแบบพหูพจน์ให้กลับเป็นเอกพจน์เพื่อให้ตรงกับ API รูปภาพ
  if (engName.endsWith("s") && !["chili", "basil", "fish sauce"].includes(engName)) {
    if (engName === "chillies") engName = "chili";
    else if (engName === "onions") engName = "onion";
    else if (engName === "eggs") engName = "egg";
  }

  // 3. ปรับตัวอักษรแรกให้เป็นตัวใหญ่ (เช่น chicken -> Chicken) เพื่อให้ตรงกับ API ของ TheMealDB
  const formattedName = engName.charAt(0).toUpperCase() + engName.slice(1);

  return `https://www.themealdb.com/images/ingredients/${encodeURIComponent(formattedName)}.png`;
}

/* ── AUTH — no redirect, just track user ── */
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    loadItems();
  } else {
    // guest: show empty grid with sign-in prompt
    renderGrid();
    renderDetailList([]);
    updateHeader();
    showGuestNotice();
  }
});

function showGuestNotice() {
  const notice = document.createElement("div");
  notice.style.cssText = "background:#EBF3FD;border:1px solid #B8D4F5;border-radius:14px;padding:14px 16px;margin-bottom:16px;font-size:13px;color:#2C6FBF;display:flex;align-items:center;gap:10px;";
  notice.innerHTML = `<i class="fas fa-circle-info" style="font-size:16px;flex-shrink:0"></i><span>Sign in to add and track your ingredients. <a href="../login/login.html" style="font-weight:700;color:#2C6FBF">Sign In</a></span>`;
  document.querySelector(".page-body").prepend(notice);
}

window.openModal = function() {
  if(!currentUser){showLoginPrompt();return;}
  document.getElementById("modal").classList.add("open");
};

window.closeModal = function() {
  document.getElementById("modal").classList.remove("open");
  document.getElementById("itemName").value="";
  document.getElementById("itemQty").value="";
  document.getElementById("ingredientSuggestions").style.display="none";
};

async function loadItems() {
  items=[];
  const snapshot=await getDocs(collection(db,"users",currentUser.uid,"ingredients"));
  snapshot.forEach(d=>items.push({id:d.id,...d.data()}));
  items.sort((a,b)=>{if(!a.expire)return 1;if(!b.expire)return -1;return new Date(a.expire)-new Date(b.expire);});
  localStorage.setItem("fridgeIngredients",JSON.stringify(items.map(i=>i.name.toLowerCase())));
  renderGrid(); renderDetailList(items); updateHeader();
}

function updateHeader() {
  const n=items.length;
  document.getElementById("slotLabel").textContent=`${n}/16 slots used`;
  document.getElementById("usageLabel").textContent=`${n} / ${MAX_SLOTS}`;
  document.getElementById("usageBarFill").style.width=`${(n/MAX_SLOTS)*100}%`;
  document.getElementById("fullBanner").style.display=n>=MAX_SLOTS?"flex":"none";
}

function renderGrid() {
  const grid=document.getElementById("inventoryGrid"); grid.innerHTML="";
  const show=items.slice(0,MAX_SLOTS-1);
  show.forEach((item,index)=>{
    const slot=document.createElement("div");
    const cls=getExpireClass(item.expire); slot.className=`fridge-slot ${cls}`;
    slot.onclick=()=>openItemModal(index);
    slot.innerHTML=`<div class="slot-expire-dot"></div><img class="slot-img" src="${getImgUrl(item.name)}" onerror="this.src='https://cdn-icons-png.flaticon.com/512/1046/1046857.png'"><p class="slot-name">${item.name}</p><p class="slot-qty">${item.qty} ${item.unit}</p>`;
    grid.appendChild(slot);
  });
  if(items.length<MAX_SLOTS){
    const add=document.createElement("div"); add.className="fridge-slot add-slot"; add.onclick=window.openModal;
    add.innerHTML=`<i class="fas fa-plus"></i><span>Add</span>`; grid.appendChild(add);
  }
  const total=grid.children.length;
  for(let i=total;i<MAX_SLOTS;i++){const e=document.createElement("div");e.className="fridge-slot empty-slot";grid.appendChild(e);}
}

function renderDetailList(data) {
  const container=document.getElementById("itemDetailList"); container.innerHTML="";
  if(!data.length){container.innerHTML=`<p style="color:var(--text-3);font-size:13px;text-align:center;padding:24px 0">${currentUser?"No ingredients yet — add something!":"Sign in to see your ingredients"}</p>`;return;}
  data.forEach((item,index)=>{
    const cls=getExpireClass(item.expire),badgeText=getExpireBadge(item.expire);
    const expireStr=item.expire?new Date(item.expire).toLocaleDateString("th-TH"):"—";
    const row=document.createElement("div"); row.className=`detail-row ${cls}`; row.onclick=()=>openItemModal(index);
    row.innerHTML=`<img src="${getImgUrl(item.name)}" onerror="this.src='https://cdn-icons-png.flaticon.com/512/1046/1046857.png'"><div class="dr-info"><p class="dr-name">${item.name}</p><p class="dr-meta">${item.qty} ${item.unit} · expires ${expireStr}</p></div>${badgeText?`<span class="dr-badge ${cls}">${badgeText}</span>`:""}`;
    container.appendChild(row);
  });
}

function getExpireClass(expire){if(!expire)return"is-ok";const d=Math.ceil((new Date(expire)-new Date())/86400000);if(d<0)return"is-expired";if(d<=1)return"is-danger";if(d<=3)return"is-warn";return"is-ok";}
function getExpireBadge(expire){if(!expire)return null;const d=Math.ceil((new Date(expire)-new Date())/86400000);if(d<0)return"Expired";if(d===0)return"Today";if(d===1)return"1 day left";if(d<=3)return`${d} days left`;return null;}

window.openItemModal=function(index){
  if(!currentUser){showLoginPrompt();return;}
  currentIndex=index; const item=items[index];
  document.getElementById("popupIcon").innerHTML=`<img src="${getImgUrl(item.name)}" onerror="this.src='https://cdn-icons-png.flaticon.com/512/1046/1046857.png'">`;
  document.getElementById("popupName").textContent=item.name;
  document.getElementById("popupQty").value=item.qty;
  document.getElementById("popupUnit").textContent=item.unit;
  document.getElementById("popupExpire").value = item.expire || "";
  document.getElementById("itemModal").classList.add("open");
};

window.closeItemModal=async function(){
  const value=parseInt(document.getElementById("popupQty").value)||0;
  if(value<=0&&currentIndex!==null){await deleteItem();return;}
  document.getElementById("itemModal").classList.remove("open");
};

window.adjustQty=async function(amount){
  if(currentIndex===null)return;
  const input=document.getElementById("popupQty");let value=(parseInt(input.value)||0)+amount;if(value<0)value=0;input.value=value;
  const item=items[currentIndex];
  await updateDoc(doc(db,"users",currentUser.uid,"ingredients",item.id),{qty:value});loadItems();
};

window.updateQtyFromInput=async function(){
  if(currentIndex===null)return;
  const value=parseInt(document.getElementById("popupQty").value)||0;const item=items[currentIndex];
  await updateDoc(doc(db,"users",currentUser.uid,"ingredients",item.id),{qty:value});loadItems();
};

window.addItem=async function(){
  const name=document.getElementById("itemName").value.toLowerCase().trim();
  const qty=parseInt(document.getElementById("itemQty").value);
  const unit=document.getElementById("itemUnit").value;
  const expire=document.getElementById("itemExpire").value;
  if(!name||!qty){alert("กรอกชื่อและจำนวนให้ครบ");return;}
  if(items.length>=MAX_SLOTS){alert("ตู้เย็นเต็มแล้ว!");return;}
  await addDoc(collection(db,"users",currentUser.uid,"ingredients"),{name,qty,unit,expire:expire||null,createdAt:new Date()});
  closeModal();loadItems();
};

window.deleteItem=async function(){
  if(currentIndex===null)return;
  const item=items[currentIndex];
  await deleteDoc(doc(db,"users",currentUser.uid,"ingredients",item.id));
  document.getElementById("itemModal").classList.remove("open");currentIndex=null;loadItems();
};

window.goInventory=()=>{window.location.href="../inventory/inventory.html";};

window.filterItems=function(){
  const q=document.getElementById("searchInput").value.toLowerCase();
  renderDetailList(q?items.filter(i=>i.name.toLowerCase().includes(q)):items);
};

// Autocomplete
window.ingredientList=[];
async function loadIngredientList(){
  try{
    const r=await fetch("https://www.themealdb.com/api/json/v1/1/list.php?i=list");
    const d=await r.json();
    const engList = d.meals.map(i=>i.strIngredient.toLowerCase());
    const thaiList = Object.keys(THAI_ING_MAP);
    window.ingredientList = [...thaiList, ...engList];
  }catch(e){}
}

window.suggestIngredient=function(){
  const input=document.getElementById("itemName"),box=document.getElementById("ingredientSuggestions"),value=input.value.toLowerCase();
  box.innerHTML="";
  if(!value.length||!window.ingredientList.length){box.style.display="none";return;}
  const matches=window.ingredientList.filter(n=>n.includes(value)).slice(0,6);
  if(!matches.length){box.style.display="none";return;}
  box.style.display="block";
  matches.forEach(name=>{const div=document.createElement("div");div.className="suggestion-item";div.textContent=name;div.onclick=()=>{input.value=name;box.style.display="none";};box.appendChild(div);});
};

document.addEventListener("click",e=>{if(!e.target.closest(".ingredient-wrapper"))document.getElementById("ingredientSuggestions")?.style.setProperty("display", "none");});
loadIngredientList();

function showLoginPrompt(){
  document.getElementById("__lp")?.remove();
  const o=document.createElement("div");o.id="__lp";
  o.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:flex-end;justify-content:center;z-index:9999;";
  o.innerHTML=`<div style="background:#fff;width:100%;max-width:430px;border-radius:20px 20px 0 0;padding:28px 24px 40px;font-family:-apple-system,sans-serif;text-align:center">
    <div style="width:52px;height:52px;border-radius:50%;background:#EBF3FD;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:22px">🔒</div>
    <p style="font-size:17px;font-weight:700;margin-bottom:6px">Sign in required</p>
    <p style="font-size:13px;color:#9AA0B0;margin-bottom:20px">Sign in to manage your fridge ingredients</p>
    <a href="../login/login.html" style="display:block;padding:13px;background:#4A90E2;color:#fff;border-radius:14px;font-weight:700;text-decoration:none;margin-bottom:10px">Sign In</a>
    <a href="../register/register.html" style="display:block;padding:12px;background:#EBF3FD;color:#4A90E2;border-radius:14px;font-weight:600;text-decoration:none;margin-bottom:14px">Create Account</a>
    <button onclick="document.getElementById('__lp').remove()" style="background:none;border:none;color:#9AA0B0;cursor:pointer;font-size:13px">Maybe later</button>
  </div>`;
  o.addEventListener("click",e=>{if(e.target===o)o.remove();});
  document.body.appendChild(o);
}

window.updateExpire = async function(){
  if(currentIndex===null) return;

  const value = document.getElementById("popupExpire").value;
  const item = items[currentIndex];

  await updateDoc(
    doc(db,"users",currentUser.uid,"ingredients",item.id),
    { expire: value || null }
  );

  loadItems();
};