const TEMPLATES={
 linmas:{name:"Pelindungan Masyarakat",categories:[
 "Peningkatan kapasitas Satlinmas di Desa melalui pelatihan, sosialisasi, atau pemberdayaan",
 "Pendampingan dan pendataan Satlinmas serta sarana dan prasarana Satlinmas",
 "Koordinasi dan pendataan potensi gangguan Tibumtranlinmas atau bencana",
 "Tindak lanjut laporan potensi gangguan ketenteraman, ketertiban umum dan pelindungan masyarakat",
 "Patroli rutin pengawasan gangguan ketenteraman dan ketertiban umum",
 "Penegakan Perda Kabupaten Buleleng Nomor 3 Tahun 2024 khususnya tertib sosial (Penduduk Non Permanen)",
 "Kegiatan lain yang diperintahkan atasan"]},
 perda:{name:"Penegakan Perda dan Perkada",categories:[
 "Penegakan Perda dan Perkada di Wilayah Kabupaten Buleleng",
 "Pendataan Penduduk Non Permanen (PPNP)",
 "Sidak / pengawasan pedagang dan pelaku usaha",
 "Pemeriksaan / BAP terhadap pelanggar",
 "Sidang tindak pidana ringan (Tipiring)",
 "Pengamanan atau pengembalian barang sitaan",
 "Koordinasi dan kegiatan penegakan lainnya"]},
 trantibum:{name:"Trantibum",categories:[
 "Patroli rutin wilayah Kabupaten Buleleng",
 "Pengawasan gangguan ketenteraman dan ketertiban umum",
 "Pengamanan kegiatan atau fasilitas umum",
 "Tindak lanjut laporan / aduan masyarakat",
 "Penanganan gepeng, pengamen, anak punk, atau orang terlantar",
 "Penanganan dan pengamanan gangguan jiwa (ODGJ)",
 "Sidak / penertiban pedagang dan pelaku usaha",
 "Kegiatan lain terkait ketertiban umum dan ketenteraman masyarakat"]}
};

const GOOGLE_CLIENT_ID="328705110971-vr57ejjk0aiphlsujcj6enhiijpics3t.apps.googleusercontent.com";
const WORKER_URL="https://laporan-kinerja-api.richardpramudita.workers.dev";
const ALLOWED_EMAIL="richardpramudita@gmail.com";
const $=id=>document.getElementById(id);
let selected="",items=[],idToken="";
const now=new Date();
$("reportMonth").value=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;

function decodeJwt(token){
  try{
    const part=token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/");
    return JSON.parse(decodeURIComponent(atob(part).split("").map(c=>"%"+("00"+c.charCodeAt(0).toString(16)).slice(-2)).join("")));
  }catch(_){return null;}
}
function tokenValid(token){
  const p=decodeJwt(token);
  return !!(p&&p.email===ALLOWED_EMAIL&&p.exp>Date.now()/1000+30);
}
function setAuthMessage(message){$("authStatus").textContent=message;}
function showSignedIn(email){
  $("loginPanel").classList.add("hidden");
  $("appArea").classList.remove("hidden");
  $("signedEmail").textContent=email;
}
function signOut(){
  const old=idToken;
  idToken="";
  localStorage.removeItem("laporanGoogleIdToken");
  if(old&&window.google?.accounts?.id)google.accounts.id.revoke(old,()=>{});
  $("appArea").classList.add("hidden");
  $("loginPanel").classList.remove("hidden");
  $("googleButton").innerHTML="";
  setAuthMessage("Silakan masuk dengan akun Google yang diizinkan.");
  initGoogleLogin();
}
function onGoogleCredential(response){
  const payload=decodeJwt(response.credential);
  if(!payload||payload.email!==ALLOWED_EMAIL||payload.email_verified!==true){
    setAuthMessage("Akses ditolak. Gunakan akun "+ALLOWED_EMAIL+".");
    return;
  }
  idToken=response.credential;
  localStorage.setItem("laporanGoogleIdToken",idToken);
  showSignedIn(payload.email);
  setAuthMessage("Login berhasil.");
  if(selected)loadItems();
}
function initGoogleLogin(){
  if(!window.google?.accounts?.id)return;
  google.accounts.id.initialize({client_id:GOOGLE_CLIENT_ID,callback:onGoogleCredential,auto_select:false});
  google.accounts.id.renderButton($("googleButton"),{theme:"outline",size:"large",shape:"rectangular",text:"signin_with",width:280});
}
window.addEventListener("load",()=>{
  if(window.google?.accounts?.id)initGoogleLogin();
  else setTimeout(initGoogleLogin,500);
  const saved=localStorage.getItem("laporanGoogleIdToken");
  if(saved&&tokenValid(saved)){
    idToken=saved;
    const p=decodeJwt(saved);
    showSignedIn(p.email);
    setAuthMessage("Sesi Google masih berlaku.");
  }else{
    localStorage.removeItem("laporanGoogleIdToken");
    setAuthMessage("Silakan masuk dengan akun Google yang diizinkan.");
  }
});
$("logoutButton").onclick=signOut;

document.querySelectorAll(".template").forEach(b=>b.onclick=()=>choose(b.dataset.template));
function choose(id){
  selected=id;
  document.querySelectorAll(".template").forEach(b=>b.classList.toggle("selected",b.dataset.template===id));
  $("selectedName").textContent="Format aktif: "+TEMPLATES[id].name;
  $("category").innerHTML='<option value="">Pilih kategori</option>'+TEMPLATES[id].categories.map((x,i)=>`<option value="${i}">${x}</option>`).join("");
  $("step2").classList.remove("hidden");
  $("step3").classList.remove("hidden");
  loadItems();
}
$("changeTemplate").onclick=()=>{
  selected="";
  $("step2").classList.add("hidden");
  $("step3").classList.add("hidden");
};
async function api(action,payload={}){
  if(!idToken||!tokenValid(idToken))throw Error("Sesi login berakhir. Silakan masuk kembali.");
  const r=await fetch(WORKER_URL,{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":"Bearer "+idToken},
    body:JSON.stringify({action,...payload})
  });
  const j=await r.json().catch(()=>({ok:false,error:"Respons server tidak dapat dibaca."}));
  if(r.status===401){signOut();throw Error(j.error||"Akses ditolak. Silakan login kembali.");}
  if(!r.ok||!j.ok)throw Error(j.error||"Permintaan gagal.");
  return j;
}
$("testConnection").onclick=async()=>{
  try{const j=await api("ping");$("configStatus").textContent=j.message||"Koneksi berhasil.";}
  catch(e){$("configStatus").textContent=e.message;}
};
async function loadItems(){
  if(!selected)return;
  items=JSON.parse(localStorage.getItem(key())||"[]");
  render();
  try{
    const j=await api("listEntries",{template:selected,month:$("reportMonth").value});
    items=j.entries||[];
    localStorage.setItem(key(),JSON.stringify(items));
    render();
    $("saveStatus").textContent="Data berhasil disinkronkan dari Google Drive.";
  }catch(e){
    $("saveStatus").textContent="Belum dapat menyinkronkan data: "+e.message;
  }
}
function key(){return `report-${selected}-${$("reportMonth").value}`;}
$("reportMonth").onchange=()=>{if(selected)loadItems();};
function render(){
  $("entryCount").textContent=items.length+" kegiatan";
  $("entries").innerHTML=items.length?items.map((x,i)=>`<div class="entry"><strong>${i+1}. ${esc(x.categoryName)}</strong><div class="muted">${new Date(x.createdAt).toLocaleString("id-ID")}</div><p>${esc(x.description)}</p>${x.photoUrl?`<a target="_blank" rel="noopener" href="${esc(x.photoUrl)}">Buka dokumentasi</a>`:""}<div class="muted">${esc(x.caption||"")}</div></div>`).join(""):'<p class="muted">Belum ada kegiatan untuk bulan ini.</p>';
}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function compress(file){
  const img=await createImageBitmap(file);
  let w=img.width,h=img.height,max=1800;
  if(w>max||h>max){const ratio=Math.min(max/w,max/h);w=Math.round(w*ratio);h=Math.round(h*ratio);}
  const c=document.createElement("canvas");c.width=w;c.height=h;
  c.getContext("2d").drawImage(img,0,0,w,h);
  let q=.82,data=c.toDataURL("image/jpeg",q);
  while(data.length>850000&&q>.42){q-=.07;data=c.toDataURL("image/jpeg",q);}
  if(data.length>1000000)throw Error("Foto masih lebih dari 1 MB. Pilih foto dengan resolusi lebih kecil.");
  return data;
}
$("saveEntry").onclick=async()=>{
  try{
    if(!selected)throw Error("Pilih format laporan terlebih dahulu.");
    const month=$("reportMonth").value,cat=$("category").value,desc=$("description").value.trim();
    if(!month||cat===""||!desc)throw Error("Bulan, kategori, dan uraian kegiatan wajib diisi.");
    const file=$("photo").files[0];
    if(!file)throw Error("Pilih foto dokumentasi terlebih dahulu.");
    $("saveStatus").textContent="Memperkecil foto...";
    const photoData=await compress(file);
    const entry={id:crypto.randomUUID(),template:selected,month,categoryIndex:Number(cat),categoryName:TEMPLATES[selected].categories[Number(cat)],description:desc,caption:$("caption").value.trim(),photoData,originalName:file.name,createdAt:new Date().toISOString()};
    $("saveStatus").textContent="Menyimpan ke Google Drive...";
    await api("saveEntry",{entry});
    await loadItems();
    $("description").value="";$("caption").value="";$("photo").value="";
    $("saveStatus").textContent="Kegiatan berhasil disimpan ke Google Drive.";
  }catch(e){$("saveStatus").textContent=e.message;}
};
$("clearForm").onclick=()=>{$("category").value="";$("description").value="";$("caption").value="";$("photo").value="";};
$("generate").onclick=async()=>{
  try{
    if(!selected||!items.length)throw Error("Belum ada kegiatan tersimpan untuk format dan bulan ini.");
    $("generateStatus").textContent="Menyusun dokumen Word dan PDF...";
    const j=await api("generateReport",{template:selected,month:$("reportMonth").value});
    $("generateStatus").innerHTML="Laporan selesai dibuat.<br>"+(j.docxUrl?`<a target="_blank" rel="noopener" href="${esc(j.docxUrl)}">Buka Word</a> `:"")+(j.pdfUrl?`<a target="_blank" rel="noopener" href="${esc(j.pdfUrl)}">Buka PDF</a>`:"");
  }catch(e){$("generateStatus").textContent=e.message;}
};
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js"));
