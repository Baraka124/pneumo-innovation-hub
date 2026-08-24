// Atom feed generator (client-side, live from /api/news).

(function(){
  var API='https://neumac-manage-back-end-production.up.railway.app';
  var SITE='https://neumact.org';
  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function iso(d){try{return new Date(d).toISOString();}catch(e){return new Date().toISOString();}}
  var feedXml='';
  function build(posts){
    var updated = posts.length ? iso(posts[0].published_at||posts[0].created_at) : new Date().toISOString();
    var entries = posts.slice(0,40).map(function(p){
      var link = p.doi ? ('https://doi.org/'+String(p.doi).replace(/^https?:\/\/doi\.org\//,'')) : (SITE+'/news/');
      var when = iso(p.published_at||p.created_at);
      var summary = p.summary || p.authors_text || p.journal_name || '';
      return '  <entry>\n'+
        '    <title>'+esc(p.title||'Untitled')+'</title>\n'+
        '    <link href="'+esc(link)+'"/>\n'+
        '    <id>'+esc(SITE+'/news/#'+(p.id||when))+'</id>\n'+
        '    <updated>'+when+'</updated>\n'+
        (summary?'    <summary>'+esc(summary)+'</summary>\n':'')+
        '  </entry>';
    }).join('\n');
    return '<?xml version="1.0" encoding="UTF-8"?>\n'+
      '<feed xmlns="http://www.w3.org/2005/Atom">\n'+
      '  <title>neumACt R&amp;I — Articles</title>\n'+
      '  <subtitle>Research updates and publications from the Servicio de Neumología, CHUAC.</subtitle>\n'+
      '  <link href="'+SITE+'/news/"/>\n'+
      '  <link rel="self" href="'+SITE+'/feed/"/>\n'+
      '  <id>'+SITE+'/</id>\n'+
      '  <updated>'+updated+'</updated>\n'+
      '  <author><name>neumACt R&amp;I · Servicio de Neumología · CHUAC</name></author>\n'+
      entries+'\n</feed>\n';
  }
  fetch(API+'/api/news/website?limit=40')
    .then(function(r){return r.json();})
    .then(function(res){ feedXml=build(res.data||[]); })
    .catch(function(){ feedXml=build([]); });
  document.getElementById('dlFeed').addEventListener('click',function(){
    if(!feedXml){alert('Feed still loading — try again in a moment.');return;}
    var b=new Blob([feedXml],{type:'application/atom+xml'});
    var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='neumact-feed.xml';
    document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(a.href);
  });
  document.getElementById('showFeed').addEventListener('click',function(){
    var pre=document.getElementById('feedPreview');
    pre.textContent=feedXml||'Loading…';
    pre.style.display=pre.style.display==='none'?'block':'none';
  });
})();
