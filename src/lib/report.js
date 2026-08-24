// REPORT (annual report) controller — fetches lines/team/publications
// and fills the figures. Print via native window.print().
import { API_BASE } from './api.js';
const API = API_BASE;
(function(){
  var year = new URLSearchParams(location.search).get('year') || String(new Date().getFullYear());
  document.getElementById('rptYear').textContent = year;
  document.title = 'Annual Report ' + year + ' | neumACt R&I';
  var API = 'https://neumac-manage-back-end-production.up.railway.app';
  function j(u){ return fetch(API+u).then(function(r){ return r.json(); }); }
  j('/api/research-lines/website').then(function(res){
    var d = res.data||[];
    document.getElementById('rptLines').textContent = d.length || '—';
    var t = d.reduce(function(s,l){ return s+(l.active_trials||0); },0);
    document.getElementById('rptTrials').textContent = t ? t+'+' : '—';
  }).catch(function(){});
  j('/api/team/website').then(function(res){
    document.getElementById('rptMembers').textContent = (res.data||[]).length || '—';
  }).catch(function(){});
  j('/api/news/website?type=publication&limit=30').then(function(res){
    var pubs = (res.data||[]).filter(function(p){
      var d = p.published_at || p.created_at;
      return d && String(new Date(d).getFullYear()) === year;
    });
    document.getElementById('rptPubs').textContent = pubs.length;
    var ol = document.getElementById('rptPubList');
    if(!pubs.length){
      ol.innerHTML = '<li style="list-style:none;color:var(--ink-4);"><span lang="en">No publications recorded for '+year+' yet.</span><span lang="es">Aún no hay publicaciones registradas en '+year+'.</span></li>';
      return;
    }
    function esc(s){ var d=document.createElement('div'); d.textContent=s==null?'':String(s); return d.innerHTML; }
    ol.innerHTML = pubs.map(function(p){
      return '<li>'+esc(p.title||'')+
        (p.journal ? ' <span class="rp-j">'+esc(p.journal)+'</span>' : '')+
        (p.authors ? '<span class="rp-a">'+esc(p.authors)+'</span>' : '')+'</li>';
    }).join('');
  }).catch(function(){
    document.getElementById('rptPubList').innerHTML='<li style="list-style:none;color:var(--ink-4);">Data unavailable.</li>';
  });
})();

