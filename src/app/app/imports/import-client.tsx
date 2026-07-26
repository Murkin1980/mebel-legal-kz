'use client';
import { useState } from 'react';
type Preview = { hash:string; orders:number; documents:number; warnings:string[]; rows:Array<Record<string,string>> };
export function ImportClient() {
  const [file,setFile]=useState<File|null>(null); const [preview,setPreview]=useState<Preview|null>(null);
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState('');
  async function send(mode:'preview'|'commit') {
    if(!file)return; setBusy(true); setMessage('');
    const data=new FormData(); data.set('archive',file); data.set('mode',mode);
    const response=await fetch('/api/imports',{method:'POST',body:data}); const result=await response.json();
    setBusy(false); if(!response.ok){setMessage(result.error||'Ошибка');return;}
    if(mode==='preview')setPreview(result); else setMessage(result.duplicate?'Этот архив уже импортирован':'Импорт завершён');
  }
  return <div className="page-stack">
    <section className="workspace-card import-drop">
      <span className="app-kicker">Безопасный импорт</span><h2>Архив документов</h2>
      <p>ZIP до 25 МБ. В корне обязателен <code>manifest.csv</code>. До подтверждения данные не записываются.</p>
      <input type="file" accept=".zip,application/zip" onChange={(e)=>{setFile(e.target.files?.[0]||null);setPreview(null)}} />
      <button className="primary-action" disabled={!file||busy} onClick={()=>send('preview')}>{busy?'Проверка…':'Проверить архив'}</button>
      {message&&<p className="form-note" role="status">{message}</p>}
    </section>
    {preview&&<section className="workspace-card">
      <div className="preview-summary"><div><b>{preview.orders}</b><span>заказов</span></div><div><b>{preview.documents}</b><span>документов</span></div><div><b>{preview.warnings.length}</b><span>предупреждений</span></div></div>
      {preview.warnings.length>0&&<ul className="form-error">{preview.warnings.map((item)=><li key={item}>{item}</li>)}</ul>}
      <div className="table-wrap"><table><thead><tr><th>Заказ</th><th>Клиент</th><th>Документ</th><th>Файл</th></tr></thead>
      <tbody>{preview.rows.slice(0,50).map((row,index)=><tr key={`${row.file_path}-${index}`}><td>{row.order_number}</td><td>{row.customer_name}</td><td><span className={`doc-chip ${row.document_type}`}>{row.document_type}</span></td><td>{row.file_path}</td></tr>)}</tbody></table></div>
      <button className="primary-action" disabled={busy||preview.warnings.length>0} onClick={()=>send('commit')}>{busy?'Импорт…':'Подтвердить импорт'}</button>
    </section>}
  </div>;
}
