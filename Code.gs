/**
 * Backend Apps Script.
 * Setup: isi DRIVE_FOLDER_ID, deploy sebagai Web App, jalankan setup() sekali.
 * Catatan: data JSON dan foto disimpan dalam folder privat Drive pemilik script.
 */
const DRIVE_FOLDER_ID = "1LxU3_qeQen0KQgy2nm7DbsxMLWcDr8j7";
const DATA_FILE = "laporan-kinerja-data.json";
const TZ = "Asia/Makassar";

function setup(){
  folder_();
  dataFile_();
  return "Folder Drive dan file data siap digunakan.";
}
function doGet(){return json_({ok:true,message:"Backend Laporan Kinerja aktif."});}
function doPost(e){
  try{
    const p=JSON.parse((e.postData&&e.postData.contents)||"{}");
    if(p.action==="ping")return json_({ok:true,message:"Koneksi Google Apps Script berhasil."});
    if(p.action==="saveEntry")return json_(saveEntry_(p.entry));
    if(p.action==="listEntries")return json_({ok:true,entries:listEntries_(p.template,p.month)});
    if(p.action==="generateReport")return json_(generateReport_(p.template,p.month));
    throw new Error("Aksi tidak dikenal.");
  }catch(err){return json_({ok:false,error:String(err.message||err)});}
}
function json_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
function folder_(){if(!DRIVE_FOLDER_ID||DRIVE_FOLDER_ID.indexOf("GANTI_")===0)throw new Error("Isi DRIVE_FOLDER_ID pada Code.gs.");return DriveApp.getFolderById(DRIVE_FOLDER_ID);}
function dataFile_(){const f=folder_(),it=f.getFilesByName(DATA_FILE);if(it.hasNext())return it.next();return f.createFile(DATA_FILE,"[]",MimeType.PLAIN_TEXT);}
function readData_(){return JSON.parse(dataFile_().getBlob().getDataAsString()||"[]");}
function writeData_(a){dataFile_().setContent(JSON.stringify(a));}
function listEntries_(template,month){
  return readData_().filter(x=>x.template===template&&x.month===month)
    .sort((a,b)=>a.createdAt.localeCompare(b.createdAt))
    .map(x=>({id:x.id,categoryName:x.categoryName,description:x.description,caption:x.caption||"",createdAt:x.createdAt,photoUrl:x.photoUrl||""}));
}
function saveEntry_(entry){
  if(!entry||!entry.template||!entry.month||!entry.description||!entry.photoData)throw new Error("Data kegiatan belum lengkap.");
  const folder=folder_(),monthFolderName=entry.month.replace("-","_")+"_"+entry.template;
  const it=folder.getFoldersByName(monthFolderName),sub=it.hasNext()?it.next():folder.createFolder(monthFolderName);
  const bytes=Utilities.base64Decode(entry.photoData.split(",")[1]);
  const safe=(entry.originalName||"dokumentasi.jpg").replace(/[^\w.-]/g,"_");
  const blob=Utilities.newBlob(bytes,"image/jpeg",Date.now()+"_"+safe);
  const photo=sub.createFile(blob);
  entry.photoFileId=photo.getId();entry.photoUrl=photo.getUrl();delete entry.photoData;
  const all=readData_();all.push(entry);writeData_(all);
  return {ok:true,id:entry.id,photoUrl:entry.photoUrl};
}
function generateReport_(template,month){
  const all=readData_().filter(x=>x.template===template&&x.month===month).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
  if(!all.length)throw new Error("Tidak ada data untuk format dan bulan tersebut.");
  const meta=templateMeta_(template),parts=month.split("-"),monthName=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"][Number(parts[1])-1],year=parts[0];
  const html=buildHtml_(meta,all,monthName,year);
  const folder=folder_(),out=folder.createFolder("Laporan_"+template+"_"+month);
  const htmlBlob=Utilities.newBlob(html,"text/html","laporan.html");
  // Impor HTML menjadi Google Docs, kemudian ekspor dua format.
  const gdoc=Drive.Files.create({name:"Laporan_"+template+"_"+month,mimeType:"application/vnd.google-apps.document",parents:[out.getId()]},htmlBlob,{fields:"id,name"});
  const docx=Drive.Files.export(gdoc.id,"application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  docx.setName("Laporan_"+template+"_"+month+".docx");const word=out.createFile(docx);
  const pdf=Drive.Files.export(gdoc.id,"application/pdf");pdf.setName("Laporan_"+template+"_"+month+".pdf");const pdfFile=out.createFile(pdf);
  return {ok:true,docxUrl:word.getUrl(),pdfUrl:pdfFile.getUrl(),folderUrl:out.getUrl()};
}
function templateMeta_(id){
 const m={
 linmas:{title:"LAPORAN KINERJA PELAKSANAAN KEGIATAN PELINDUNGAN MASYARAKAT",ii:"Kegiatan Pelindungan Masyarakat",intro:"Pelindungan masyarakat dilaksanakan melalui pembinaan, koordinasi, kesiapsiagaan, penanggulangan, dan pemulihan sesuai tugas dan fungsi perangkat daerah.",closing:"Telah terlaksananya kegiatan pelindungan masyarakat sehingga mendukung terciptanya ketertiban dan ketenteraman di masyarakat."},
 perda:{title:"LAPORAN TENTANG PENANGANAN PENEGAKAN PERDA DAN PERKADA",ii:"Penegakan Perda dan Perkada di Wilayah Kabupaten Buleleng",intro:"Penegakan Peraturan Daerah dan Peraturan Kepala Daerah dilaksanakan untuk menjamin kepastian hukum, ketertiban, dan kepatuhan masyarakat terhadap ketentuan yang berlaku.",closing:"Kegiatan penanganan penegakan Perda dan Perkada mendukung peningkatan kesadaran masyarakat untuk mematuhi peraturan yang berlaku."},
 trantibum:{title:"LAPORAN KINERJA PELAKSANAAN PENYELENGGARAAN KETERTIBAN UMUM DAN KETENTERAMAN MASYARAKAT",ii:"Penyelenggaraan Ketertiban Umum dan Ketenteraman Masyarakat",intro:"Ketertiban umum dan ketenteraman masyarakat merupakan kondisi dasar untuk mendukung penyelenggaraan pemerintahan dan kehidupan masyarakat yang aman, nyaman, dan tertib.",closing:"Telah terlaksananya kegiatan patroli dan pengamanan untuk memberikan rasa aman dan tertib bagi masyarakat."}
 };if(!m[id])throw new Error("Format laporan tidak dikenal.");return m[id];
}
function buildHtml_(m,entries,monthName,year){
 const esc=s=>String(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
 let rows="";
 entries.forEach((e,i)=>{const photo=DriveApp.getFileById(e.photoFileId).getBlob();const data=Utilities.base64Encode(photo.getBytes());const mime=photo.getContentType();rows+=`<tr><td>${i+1}</td><td>${esc(e.categoryName)}</td><td>${esc(e.description).replace(/\n/g,"<br>")}${e.caption?`<p><i>${esc(e.caption)}</i></p>`:""}</td><td><img class="photo" src="data:${mime};base64,${data}"></td></tr>`;});
 return `<!doctype html><html><head><meta charset="utf-8"><style>
 @page{size:A4;margin:2.2cm 2cm}body{font-family:"Times New Roman",serif;font-size:11pt;line-height:1.35;color:#111}h1{text-align:center;font-size:15pt;margin:0 0 30px}h2{font-size:12pt;margin-top:24px}h3{font-size:11pt}p{text-align:justify;text-indent:1cm}.center{text-align:center;text-indent:0}.page{page-break-before:always}table{border-collapse:collapse;width:100%;font-size:9pt}th,td{border:1px solid #333;padding:6px;vertical-align:top}th{text-align:center}.photo{max-width:135px;max-height:150px;object-fit:contain}.sign{margin-left:58%;text-align:left;margin-top:45px}.muted{font-size:9pt}
 </style></head><body>
 <h1>${esc(m.title)}<br><br>PERIODE ${esc(monthName.toUpperCase())} ${year}</h1>
 <h2>I. PENDAHULUAN</h2><h3>A. Latar Belakang</h3><p>${esc(m.intro)}</p>
 <h3>B. Landasan Hukum</h3><p>Landasan hukum mengikuti ketentuan peraturan perundang-undangan sebagaimana tercantum dalam template laporan ${esc(m.title)}.</p>
 <h3>C. Maksud dan Tujuan</h3><p>Laporan ini disusun sebagai bentuk pertanggungjawaban pelaksanaan tugas selama satu bulan serta bahan evaluasi capaian kinerja dan perencanaan kegiatan selanjutnya.</p>
 <h2>II. KEGIATAN YANG DILAKSANAKAN</h2><p>${esc(m.ii)} selama bulan ${esc(monthName)} ${year}.</p>
 <h2>III. HASIL YANG DICAPAI</h2><table><thead><tr><th style="width:5%">No</th><th style="width:23%">Kegiatan</th><th style="width:47%">Hasil Kegiatan</th><th style="width:25%">Dokumentasi</th></tr></thead><tbody>${rows}</tbody></table>
 <h2>IV. KESIMPULAN DAN SARAN</h2><h3>a. Kesimpulan</h3><p>${esc(m.closing)}</p><h3>b. Saran</h3><p>Koordinasi dan sinergi dengan perangkat daerah serta instansi terkait agar terus ditingkatkan guna mendukung pelaksanaan tugas.</p>
 <p class="center">Demikian hasil kegiatan yang kami jalani dalam satu bulan.</p>
 <div class="sign">Dibuat di : Singaraja, ${new Date().getDate()} ${monthName} ${year}<br>Ahli Pertama Satuan Polisi Pamong Praja<br>Kabupaten Buleleng<br><br><br><br><b>Nama dan tanda tangan pejabat</b><br>Ahli Pertama</div>
 </body></html>`;
}
