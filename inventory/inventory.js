import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, getDocs, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app=initializeApp({apiKey:"AIzaSyApISz8uFOfVirU3rX7Dk9wSVVwIKwY2OM",authDomain:"inventory-matching.firebaseapp.com",projectId:"inventory-matching",storageBucket:"inventory-matching.firebasestorage.app",messagingSenderId:"758643685191",appId:"1:758643685191:web:44a886c25e35d14185be62"});
const auth=getAuth(app),db=getFirestore(app);
let inventoryData=[],currentUser=null,currentIndex=null,activeFilter="all";

onAuthStateChanged(auth,async(user)=>{
  currentUser=user;
  if(user){await loadInventory();}
  else{updateCounts();renderList([]);showGuestNotice();}
});

function showGuestNotice(){
  const list=document.getElementById("inventoryList");
  list.innerHTML=`<div style="background:#EBF3FD;border:1px solid #B8D4F5;border-radius:14px;padding:20px;text-align:center;font-size:13px;color:#2C6FBF">
    <i class="fas fa-circle-info" style="font-size:24px;margin-bottom:8px;display:block"></i>
    <p style="font-weight:700;margin-bottom:4px">Sign in to view your stock</p>
    <p style="margin-bottom:14px;opacity:.8">Track expiry dates and manage your ingredients</p>
    <a href="../login/login.html" style="display:inline-block;padding:10px 24px;background:#4A90E2;color:#fff;border-radius:12px;font-weight:700;text-decoration:none">Sign In</a>
  </div>`;
}

async function loadInventory(){
  inventoryData=[];
  const snapshot=await getDocs(collection(db,"users",currentUser.uid,"ingredients"));
  snapshot.forEach(d=>inventoryData.push({id:d.id,...d.data()}));
  inventoryData.sort((a,b)=>{if(!a.expire)return 1;if(!b.expire)return -1;return new Date(a.expire)-new Date(b.expire);});
  updateCounts();renderList(inventoryData);
}

function updateCounts(){
  let fresh=0,soon=0,expired=0;
  inventoryData.forEach(item=>{const cls=getClass(item.expire);if(cls==="is-ok")fresh++;else if(cls==="is-warn")soon++;else expired++;});
  document.getElementById("cntAll").textContent=inventoryData.length;
  document.getElementById("cntFresh").textContent=fresh;
  document.getElementById("cntSoon").textContent=soon;
  document.getElementById("cntExpired").textContent=expired;
  document.getElementById("stockSub").textContent=`${inventoryData.length} items · sorted by expiry`;
}

window.setFilter=function(f){
  activeFilter=f;
  document.querySelectorAll(".ftab").forEach(t=>t.classList.toggle("active",t.dataset.filter===f));
  applyFilter();
};

function applyFilter(){
  const q=document.getElementById("searchInput").value.toLowerCase();
  let data=inventoryData.filter(i=>i.name.toLowerCase().includes(q));
  if(activeFilter==="fresh")data=data.filter(i=>getClass(i.expire)==="is-ok");
  if(activeFilter==="soon")data=data.filter(i=>getClass(i.expire)==="is-warn");
  if(activeFilter==="expired")data=data.filter(i=>["is-expired","is-danger"].includes(getClass(i.expire)));
  renderList(data);
}
window.filterItems=applyFilter;

function renderList(data){
  const list=document.getElementById("inventoryList");list.innerHTML="";
  if(!data.length){list.innerHTML=`<div class="empty-state"><i class="fas fa-box-open"></i>No items found</div>`;return;}
  data.forEach((item)=>{
    const realIndex=inventoryData.indexOf(item),cls=getClass(item.expire),diff=getDiff(item.expire),badge=getBadge(cls);
    const daysNum=diff===null?"—":Math.abs(diff),daysLabel=diff===null?"":diff<0?"ago":"days";
    const expireStr=item.expire?new Date(item.expire).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"No expiry";
    const row=document.createElement("div");row.className=`inv-row ${cls}`;row.onclick=()=>openItemModal(realIndex);
    row.innerHTML=`<img src="https://www.themealdb.com/images/ingredients/${item.name}.png" onerror="this.src='https://cdn-icons-png.flaticon.com/512/1046/1046857.png'"><div class="inv-info"><div class="inv-name">${item.name}${badge?`<span class="inv-badge ${cls}">${badge}</span>`:""}</div><div class="inv-meta">${item.qty} ${item.unit} · ${expireStr}</div></div><div class="inv-days"><div class="inv-days-n">${daysNum}</div><div class="inv-days-l">${daysLabel}</div></div>`;
    list.appendChild(row);
  });
}

function getDiff(expire){if(!expire)return null;return Math.ceil((new Date(expire)-new Date())/86400000);}
function getClass(expire){const d=getDiff(expire);if(d===null)return"is-ok";if(d<0)return"is-expired";if(d<=1)return"is-danger";if(d<=3)return"is-warn";return"is-ok";}
function getBadge(cls){if(cls==="is-expired")return"Expired";if(cls==="is-danger")return"Critical";if(cls==="is-warn")return"Soon";return null;}

window.openItemModal=function(index){
  if(!currentUser){showLoginPrompt();return;}
  currentIndex=index;const item=inventoryData[index];
  document.getElementById("popupIcon").innerHTML=`<img src="https://www.themealdb.com/images/ingredients/${item.name}.png" onerror="this.src='https://cdn-icons-png.flaticon.com/512/1046/1046857.png'">`;
  document.getElementById("popupName").textContent=item.name;
  document.getElementById("popupQty").value=item.qty;
  document.getElementById("popupUnit").textContent=item.unit;
  document.getElementById("popupExpire").value=item.expire||"";
  document.getElementById("itemModal").classList.add("open");
};
window.closeItemModal=()=>{document.getElementById("itemModal").classList.remove("open");};
window.adjustQty=function(amount){if(currentIndex===null)return;const input=document.getElementById("popupQty");let val=(parseInt(input.value)||0)+amount;if(val<0)val=0;input.value=val;};
window.saveItem=async function(){
  if(currentIndex===null)return;
  const item=inventoryData[currentIndex];
  const qty=parseInt(document.getElementById("popupQty").value)||0;
  const expire=document.getElementById("popupExpire").value||null;
  await updateDoc(doc(db,"users",currentUser.uid,"ingredients",item.id),{qty,expire});
  document.getElementById("itemModal").classList.remove("open");currentIndex=null;loadInventory();
};
window.deleteItem=async function(){
  if(currentIndex===null)return;
  const item=inventoryData[currentIndex];
  await deleteDoc(doc(db,"users",currentUser.uid,"ingredients",item.id));
  document.getElementById("itemModal").classList.remove("open");currentIndex=null;loadInventory();
};

function showLoginPrompt(){
  document.getElementById("__lp")?.remove();
  const o=document.createElement("div");o.id="__lp";
  o.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:flex-end;justify-content:center;z-index:9999;";
  o.innerHTML=`<div style="background:#fff;width:100%;max-width:430px;border-radius:20px 20px 0 0;padding:28px 24px 40px;font-family:-apple-system,sans-serif;text-align:center">
    <div style="width:52px;height:52px;border-radius:50%;background:#EBF3FD;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:22px">🔒</div>
    <p style="font-size:17px;font-weight:700;margin-bottom:6px">Sign in required</p>
    <p style="font-size:13px;color:#9AA0B0;margin-bottom:20px">Sign in to manage your stock</p>
    <a href="../login/login.html" style="display:block;padding:13px;background:#4A90E2;color:#fff;border-radius:14px;font-weight:700;text-decoration:none;margin-bottom:10px">Sign In</a>
    <a href="../register/register.html" style="display:block;padding:12px;background:#EBF3FD;color:#4A90E2;border-radius:14px;font-weight:600;text-decoration:none;margin-bottom:14px">Create Account</a>
    <button onclick="document.getElementById('__lp').remove()" style="background:none;border:none;color:#9AA0B0;cursor:pointer;font-size:13px">Maybe later</button>
  </div>`;
  o.addEventListener("click",e=>{if(e.target===o)o.remove();});
  document.body.appendChild(o);
}
