const STORAGE_KEY='userQuestions';
let parsedQuestions=[];
let imageMap=new Map();
const $=id=>document.getElementById(id);
function stored(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{return[]}}
function saveStored(items){localStorage.setItem(STORAGE_KEY,JSON.stringify(items));updateStoredCount()}
function normalizeAnswer(raw){return [...new Set((raw||'').toLowerCase().match(/[a-z]/g)||[])]}
function splitBlocks(text){
  text=text.replace(/\r/g,'').trim();
  if(!text)return[];
  const starts=[...text.matchAll(/(?:^|\n)(?=(?:\*\*)?(?:question\s*\d*\s*[:.)-]|\d+\s*[.)]\s+))/ig)].map(m=>m.index+(m[0].startsWith('\n')?1:0));
  if(starts.length>1)return starts.map((x,i)=>text.slice(x,starts[i+1]||text.length).trim()).filter(Boolean);
  return text.split(/\n\s*\n(?=(?:\*\*)?(?:question|\d+\s*[.)]))/i).map(x=>x.trim()).filter(Boolean);
}
function parseBlock(block,index,category){
  const lines=block.split('\n').map(x=>x.trim()).filter(Boolean);
  let question='',options=[],answer=[],imageName='';
  const imageMatch=block.match(/\[image:\s*([^\]]+)\]/i);if(imageMatch)imageName=imageMatch[1].trim();
  const ansMatch=block.match(/(?:correct\s*)?answers?\s*[:=-]\s*([^\n]+)/i);if(ansMatch)answer=normalizeAnswer(ansMatch[1]);
  let firstOption=lines.findIndex(l=>/^[a-zA-Z]\s*[.)]\s+/.test(l));
  let qLines=lines.slice(0,firstOption<0?lines.length:firstOption).filter(l=>!/^select one or more\s*:?$/i.test(l)&&!/^select one\s*:?$/i.test(l)&&!/^\[image:/i.test(l));
  question=qLines.join(' ').replace(/^\*\*|\*\*$/g,'').replace(/^(?:question\s*\d*\s*[:.)-]|\d+\s*[.)]\s*)/i,'').trim();
  lines.forEach(l=>{const m=l.match(/^([a-zA-Z])\s*[.)]\s+(.+)$/);if(m)options.push({letter:m[1].toLowerCase(),text:m[2].replace(/\*\*/g,'').trim(),correct:answer.includes(m[1].toLowerCase())})});
  return {num:`${category.replace(/\s+/g,'')}-${Date.now()}-${index+1}`,category,question,options,imageName,image:'',approved:!!question&&options.length>=2&&answer.length>0};
}
async function loadImages(){imageMap=new Map();for(const f of [...$('imageFiles').files]){const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f)});imageMap.set(f.name,data)}}
function showMessage(text){$('parseMessage').textContent=text;$('parseMessage').classList.remove('hidden')}
function renderPreview(){
  $('previewList').innerHTML='';$('previewCount').textContent=`${parsedQuestions.length} detected`;
  parsedQuestions.forEach((q,i)=>{
    const card=document.createElement('article');card.className='card preview-card';
    const imageOptions=['<option value="">No image</option>',...[...imageMap.keys()].map(n=>`<option value="${escapeHtml(n)}" ${n===q.imageName?'selected':''}>${escapeHtml(n)}</option>`)].join('');
    card.innerHTML=`<div class="preview-head"><strong>Question ${i+1}</strong><label class="toggle-row"><input type="checkbox" data-field="approved" ${q.approved?'checked':''}> Include</label></div><input class="question-edit" data-field="question" value="${escapeHtml(q.question)}"><div class="preview-options"></div><div class="preview-meta"><label>Image<select data-field="imageName">${imageOptions}</select></label><label>Question bank<select data-field="category">${['Midterm 1','Midterm 2','Midterm 3','Midterm 4','Midterm 5','Midterm 6','Finals'].map(c=>`<option ${c===q.category?'selected':''}>${c}</option>`).join('')}</select></label></div>`;
    const options=card.querySelector('.preview-options');q.options.forEach((o,j)=>{const row=document.createElement('label');row.className='preview-option';row.innerHTML=`<input type="checkbox" data-option-correct="${j}" ${o.correct?'checked':''}><input type="text" data-option-text="${j}" value="${escapeHtml(o.text)}">`;options.appendChild(row)});
    card.addEventListener('input',e=>{const f=e.target.dataset.field;if(f)q[f]=e.target.type==='checkbox'?e.target.checked:e.target.value;if(e.target.dataset.optionCorrect!==undefined)q.options[+e.target.dataset.optionCorrect].correct=e.target.checked;if(e.target.dataset.optionText!==undefined)q.options[+e.target.dataset.optionText].text=e.target.value});
    $('previewList').appendChild(card);
  });
  $('previewSection').classList.remove('hidden');
}
function escapeHtml(s=''){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
$('parseBtn').onclick=async()=>{await loadImages();const blocks=splitBlocks($('batchText').value);parsedQuestions=blocks.map((b,i)=>parseBlock(b,i,$('importCategory').value)).filter(q=>q.question||q.options.length);if(!parsedQuestions.length){showMessage('No questions were detected. Check the example format and try again.');return}renderPreview();showMessage(`${parsedQuestions.length} question${parsedQuestions.length===1?'':'s'} detected. Questions without a marked answer are unchecked for safety.`)};
$('saveBtn').onclick=()=>{const valid=parsedQuestions.filter(q=>q.approved&&q.question&&q.options.length>=2&&q.options.some(o=>o.correct)).map(q=>({num:q.num,category:q.category,question:q.question,options:q.options.map((o,i)=>({letter:String.fromCharCode(97+i),text:o.text,correct:o.correct})),...(q.imageName&&imageMap.get(q.imageName)?{image:imageMap.get(q.imageName)}:{})}));if(!valid.length){alert('No approved questions with a correct answer are ready to save.');return}const existing=stored();const keys=new Set(existing.map(q=>q.question.trim().toLowerCase()));const fresh=valid.filter(q=>!keys.has(q.question.trim().toLowerCase()));saveStored([...existing,...fresh]);alert(`${fresh.length} question${fresh.length===1?'':'s'} saved. ${valid.length-fresh.length} duplicate${valid.length-fresh.length===1?' was':'s were'} skipped.`)};
$('exampleBtn').onclick=()=>{$('batchText').value=`Question: What increases preload?\nSelect one or more:\na. Increased venous return\nb. Vasodilation\nc. Hemorrhage\nd. Tachycardia\nAnswer: a\n\nQuestion: Which findings are expected in left-sided heart failure?\na. Pulmonary edema\nb. Orthopnea\nc. Peripheral cyanosis only\nd. Exertional dyspnea\nAnswer: a, b, d`};
$('exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify(stored(),null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='pathophysiology-questions-backup.json';a.click();URL.revokeObjectURL(a.href)};
$('restoreFile').onchange=async e=>{try{const data=JSON.parse(await e.target.files[0].text());if(!Array.isArray(data))throw Error();saveStored(data);alert('Backup restored.')}catch{alert('That file is not a valid question backup.')}};
$('clearBtn').onclick=()=>{if(confirm('Delete every imported question stored in this browser?'))saveStored([])};
function updateStoredCount(){$('storedCount').textContent=`${stored().length} questions`}
updateStoredCount();
