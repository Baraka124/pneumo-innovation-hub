// NEWS page controller. Ported from the news page inline script
// (self-contained renderer: feed, spotlight, publications timeline,
// bronchial-tree canvas) + the loadNews fetch that was in api.js.
import { apiFetch } from './api.js';
import { setError } from './ui.js';

/* ===== ported page controller ===== */
  
  /* ══════════════════════════════════════════════════════════
     PERSPECTIVES — news feed renderer
     Called by api.js via window.onNewsLoaded() after fetch
     Posts shape: { id, post_type, title, body, published_at,
       created_at, featured_image_url, journal_name,
       authors_text, doi, word_count,
       author: { id, full_name },
       research_line: { id, line_number, name } }
  ══════════════════════════════════════════════════════════ */
  (function(){

    var _all      = [];   /* full post list */
    var _filter   = '';   /* current type filter */
    var feed      = document.getElementById('blogFeed');
    var skeleton  = document.getElementById('feedSkeleton');
    var reader    = document.getElementById('articleReader');
    var countEl   = document.getElementById('filterCount');

    /* ── Utils ────────────────────────────────────────────── */
    function esc(s){
      return s ? String(s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;') : '';
    }

    function fmtDate(d){
      if(!d) return '';
      try {
        var diff = Math.floor((new Date() - new Date(d)) / 60000);
        if(diff < 1)    return 'Just now';
        if(diff < 60)   return diff + 'm ago';
        if(diff < 1440) return Math.floor(diff/60) + 'h ago';
        if(diff < 10080) return Math.floor(diff/1440) + 'd ago';
        return new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
      } catch(e){ return ''; }
    }

    function excerpt(body, len){
      if(!body) return '';
      var t = body.replace(/<[^>]*>/g,'').trim();
      return t.length <= len ? t : t.slice(0,len).replace(/\s+\S*$/,'') + '…';
    }

    function typeLabel(t){
      if(t==='publication') return 'Publication';
      if(t==='update')      return 'Update';
      if(t==='photo_story') return 'Photo Story';
      return 'Article';
    }

    /* ── Build a single post item ─────────────────────────── */
    var arrowSvg = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:11px;height:11px;vertical-align:middle;"><path d="M3 8h10M9 4l4 4-4 4"/></svg>';
    var _postIndex = 0; /* counter for numbering articles */

    function buildPost(p){
      var type   = p.post_type || 'article';
      var date   = fmtDate(p.published_at || p.created_at);
      // Publications already show the real academic author list via
      // authors_text (e.g. "Gonzalez-Rivas D, Manolache V, et al.").
      // p.author is whoever curated/submitted the post in neumDesk, not
      // necessarily a paper author — showing both was redundant at best
      // and actively misleading at worst, since the two names can differ.
      var author = (p.author && type !== 'publication') ? p.author.full_name : '';
      var line   = p.research_line ? 'L'+p.research_line.line_number+' — '+p.research_line.name : '';
      var sep    = '<span class="post-meta-sep"></span>';

      var metaRow =
        '<div class="post-meta-row">'+
          (date   ? '<span>'+esc(date)+'</span>' : '')+
          (line   ? sep+'<span class="post-line-tag">'+esc(line)+'</span>' : '')+
          (author ? sep+'<span>'+esc(author)+'</span>' : '')+
        '</div>';

      var el = document.createElement('article');
      el.dataset.id = p.id;

      /* ── PHOTO STORY ─────────────────────────────────────── */
      if(type === 'photo_story'){
        el.className = 'post-item is-photo';
        var imgSrc = p.featured_image_url || '';
        el.innerHTML =
          '<div class="post-photo-wrap">'+
            (imgSrc
              ? '<img src="'+esc(imgSrc)+'" alt="'+esc(p.title||'')+'" class="post-photo-img" loading="lazy">'
              : '<div class="post-photo-img" style="background:var(--navy-2);"></div>')+
            '<div class="post-photo-scrim"></div>'+
            '<div class="post-photo-overlay">'+
              '<div class="post-photo-badge">'+
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" style="width:10px;height:10px;"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="9"/></svg>'+
                esc(typeLabel(type))+
              '</div>'+
              '<h2 class="post-photo-title">'+esc(p.title||'Untitled')+'</h2>'+
              '<div class="post-photo-meta">'+
                (author ? esc(author)+' · ' : '')+esc(date)+
              '</div>'+
            '</div>'+
            '<div class="post-photo-hint"><span lang="en">Click to read</span><span lang="es">Clic para leer</span></div>'+
          '</div>';

      /* ── ARTICLE — numbered magazine row ─────────────────── */
      } else if(type === 'article'){
        el.className = 'post-item is-article';
        _postIndex++;
        var numStr = String(_postIndex).padStart(2,'0');
        var thumb = p.featured_image_url
          ? '<div class="post-article-thumb"><img src="'+esc(p.featured_image_url)+'" alt="'+esc(p.title||'')+'" loading="lazy"></div>'
          : '';
        el.innerHTML =
          '<div class="post-item-num">'+numStr+'</div>'+
          '<div class="post-article-body">'+
            '<span class="post-type-badge article">'+esc(typeLabel(type))+'</span>'+
            '<h2 class="post-title">'+esc(p.title||'Untitled')+'</h2>'+
            (p.body ? '<p class="post-excerpt">'+esc(excerpt(p.body, 200))+'</p>' : '')+
            metaRow+
            '<span class="post-readmore"><span lang="en">Read more</span><span lang="es">Leer más</span> '+arrowSvg+'</span>'+
          '</div>'+
          thumb;

      /* ── UPDATE — accent line ────────────────────────────── */
      } else if(type === 'update'){
        el.className = 'post-item is-update';
        el.innerHTML =
          '<div class="post-update-accent"></div>'+
          '<div class="post-article-body">'+
            '<span class="post-type-badge update">'+esc(typeLabel(type))+'</span>'+
            '<h2 class="post-title">'+esc(p.title||'Untitled')+'</h2>'+
            (p.body ? '<p class="post-excerpt">'+esc(excerpt(p.body, 160))+'</p>' : '')+
            metaRow+
          '</div>';

      /* ── PUBLICATION — blue accent line ──────────────────── */
      } else {
        el.className = 'post-item is-publication';
        el.innerHTML =
          '<div class="post-pub-accent"></div>'+
          '<div class="post-article-body">'+
            '<span class="post-type-badge publication">'+esc(typeLabel(type))+'</span>'+
            '<h2 class="post-title">'+esc(p.title||'Untitled')+'</h2>'+
            (p.journal_name ? '<div class="post-journal">'+esc(p.journal_name)+'</div>' : '')+
            (p.authors_text ? '<div class="post-authors">'+esc(p.authors_text)+'</div>' : '')+
            (p.doi
              ? '<div class="post-doi"><a href="https://doi.org/'+esc(p.doi)+'" target="_blank" rel="noopener" onclick="event.stopPropagation()">doi:'+esc(p.doi)+'</a></div>'
              : '')+
            metaRow+
          '</div>';
      }

      el.addEventListener('click', function(){ openPost(p); });
      return el;
    }

    /* ── Render feed ──────────────────────────────────────── */
    function renderFeed(){
      _postIndex = 0; /* reset article numbering */
      var posts = _filter
        ? _all.filter(function(p){ return p.post_type === _filter; })
        : _all;

      /* Count label */
      if(countEl){
        countEl.textContent = posts.length
          ? posts.length + ' post' + (posts.length!==1?'s':'')
          : '';
      }

      /* Remove old items (keep skeleton in DOM but hidden) */
      Array.from(feed.children).forEach(function(c){
        if(c.id !== 'feedSkeleton') feed.removeChild(c);
      });

      if(!posts.length){
        var empty = document.createElement('div');
        empty.className = 'feed-state';
        empty.innerHTML =
          '<div class="feed-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div>'+
          '<p><span lang="en">No posts in this category yet.</span><span lang="es">Aún no hay publicaciones en esta categoría.</span></p>';
        feed.appendChild(empty);
        return;
      }

      var frag = document.createDocumentFragment();
      posts.forEach(function(p){ frag.appendChild(buildPost(p)); });
      feed.appendChild(frag);
    }

    /* ── Populate sidebar ─────────────────────────────────── */
    function populateSidebar(){
      var counts = { article:0, update:0, publication:0, photo_story:0 };
      var lines  = {};

      _all.forEach(function(p){
        var t = p.post_type || 'article';
        if(counts[t] !== undefined) counts[t]++;
        if(p.research_line){
          var key = p.research_line.id;
          if(!lines[key]) lines[key] = { name: 'L'+p.research_line.line_number+' — '+p.research_line.name, count: 0 };
          lines[key].count++;
        }
      });

      /* Update hero stats (articles + updates + publications shown in hero) */
      ['sbArticles','sb2Articles'].forEach(function(id){ var el=document.getElementById(id); if(el) el.textContent=counts.article||'0'; });
      ['sbUpdates','sb2Updates'].forEach(function(id){ var el=document.getElementById(id); if(el) el.textContent=counts.update||'0'; });
      ['sbPubs','sb2Pubs'].forEach(function(id){ var el=document.getElementById(id); if(el) el.textContent=counts.publication||'0'; });
      ['sbPhotos','sb2Photos'].forEach(function(id){ var el=document.getElementById(id); if(el) el.textContent=counts.photo_story||'0'; });
      var sl = document.getElementById('sbLines');

      if(sl){
        sl.innerHTML = Object.values(lines)
          .sort(function(a,b){ return b.count - a.count; })
          .map(function(l){
            return '<div class="sb-line-item" style="display:flex;justify-content:space-between;align-items:baseline;padding:.3rem 0;border-bottom:1px solid var(--rule-l);font-size:.8rem;">'+
              '<span style="color:var(--text-on-light-2);font-size:.8125rem;">'+esc(l.name)+'</span>'+
              '<span style="font-family:var(--ff-mono);font-size:var(--fs-label);color:var(--text-on-light-3);">'+l.count+'</span>'+
            '</div>';
          }).join('') || '<span style="font-size:.8rem;color:var(--text-on-light-3);">—</span>';
      }
    }

    /* ── Open single post in Articles reader ───────────────── */
    function openPost(p){
      if(!reader) return;
      var type   = p.post_type || 'article';
      var isPub  = type === 'publication';
      var author = isPub ? '' : (p.author ? p.author.full_name : '');
      var date   = p.published_at || p.created_at;

      /* Author avatar — monogram if no photo, real image if available */
      var authorInitials = author ? author.split(' ').filter(function(w){
        return w && ['Dr.','Dra.','Prof.'].indexOf(w) === -1;
      }).slice(0,2).map(function(n){ return n[0]; }).join('').toUpperCase() : '';
      var authorAv = (p.author && p.author.public_photo_url)
        ? '<img src="'+esc(p.author.public_photo_url)+'" alt="'+esc(author)+'" loading="lazy" style="width:100%;height:100%;object-fit:cover;">'
        : authorInitials;

      /* Body — HTML passthrough if HTML, otherwise plain paragraph blocks */
      var bodyHtml;
      if(isPub){
        bodyHtml =
          '<div class="gz-article-body">'+
            (p.journal_name ? '<p><strong>'+esc(p.journal_name)+'</strong></p>' : '')+
            (p.authors_text ? '<p>'+esc(p.authors_text)+'</p>' : '')+
            (p.summary ? '<p>'+esc(p.summary)+'</p>' : '')+
            (p.doi ? '<p><a href="https://doi.org/'+esc(p.doi)+'" target="_blank" rel="noopener">doi:'+esc(p.doi)+' →</a></p>' : '')+
          '</div>';
      } else {
        var rawBody = p.body || p.content || '';
        var isHtml = /^\s*</.test(rawBody);
        bodyHtml = '<div class="gz-article-body">';
        if(rawBody){
          bodyHtml += isHtml ? rawBody
            : rawBody.split(/\n{2,}/).map(function(para){
                return '<p>'+esc(para.trim())+'</p>';
              }).join('');
        } else {
          bodyHtml += '<p style="color:var(--ink-3);font-style:italic;">Full article content is available via the linked publication.</p>';
        }
        bodyHtml += '</div>';
      }

      reader.innerHTML =
        '<div class="gz-reader" id="gzReaderInner">'+
          '<div class="gz-reader-close">'+
            '<span class="gz-reader-close-name">neumACt Articles</span>'+
            '<button class="gz-reader-close-btn" id="artBack" type="button" aria-label="Close article">'+
              '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;"><path d="M13 8H3M7 4l-4 4 4 4"/></svg>'+
              '<span lang="en">Back</span><span lang="es">Volver</span>'+
            '</button>'+
          '</div>'+
          '<div class="gz-reader-progress"><div class="gz-reader-progress-fill" id="gzProgress"></div></div>'+
          '<article class="gz-article">'+
            '<div class="gz-article-type">'+esc(typeLabel(type))+'</div>'+
            '<h1 class="gz-article-headline">'+esc(p.title||'Untitled')+'</h1>'+
            (p.summary && !isPub ? '<p class="gz-article-dek">'+esc(p.summary)+'</p>' : '')+
            '<div class="gz-article-byline">'+
              (author
                ? '<div class="gz-article-author">'+
                    '<div class="gz-article-author-av">'+authorAv+'</div>'+
                    '<span class="gz-article-author-name">'+esc(author)+'</span>'+
                  '</div>'
                : '')+
              (author && date ? '<span class="gz-article-meta-sep">·</span>' : '')+
              (date ? '<span class="gz-article-date">'+fmtDate(date)+'</span>' : '')+
              (p.research_line
                ? '<span class="gz-article-line-tag">L'+p.research_line.line_number+' — '+esc(p.research_line.name)+'</span>'
                : '')+
            '</div>'+
            (p.featured_image_url
              ? '<div class="gz-article-cover"><img src="'+esc(p.featured_image_url)+'" alt="'+esc(p.title||'')+'" loading="lazy"></div>'
              : '')+
            bodyHtml+
            (p.doi
              ? '<div class="gz-article-footer"><div class="gz-article-doi">DOI: <a href="https://doi.org/'+esc(p.doi)+'" target="_blank" rel="noopener">'+esc(p.doi)+' →</a></div></div>'
              : '')+
          '</article>'+
        '</div>';

      document.querySelector('.blog-layout') && (document.querySelector('.blog-layout').style.display = 'none');
      document.querySelector('.filter-strip') && (document.querySelector('.filter-strip').style.display = 'none');
      window.scrollTo({ top: 0, behavior: 'instant' });

      /* Reading progress tied to page scroll since the reader is full-viewport */
      var progressEl = document.getElementById('gzProgress');
      function updateProgress(){
        if(!progressEl) return;
        var scrolled = window.scrollY;
        var total = document.documentElement.scrollHeight - window.innerHeight;
        progressEl.style.width = total > 0 ? Math.min(100, (scrolled/total)*100)+'%' : '0%';
      }
      window.addEventListener('scroll', updateProgress, { passive: true });

      document.getElementById('artBack').addEventListener('click', function(){
        window.removeEventListener('scroll', updateProgress);
        closePost();
      });
    }

    function closePost(){
      reader.innerHTML = '';
      document.querySelector('.blog-layout') && (document.querySelector('.blog-layout').style.display = '');
      document.querySelector('.filter-strip') && (document.querySelector('.filter-strip').style.display = '');
    }

    /* ── Wire filter buttons ──────────────────────────────── */
    document.querySelectorAll('.flt').forEach(function(btn){
      btn.addEventListener('click', function(){
        /* close reader if open before filtering */
        if(reader && reader.classList.contains('open')) closePost();
        _filter = btn.dataset.type || '';
        document.querySelectorAll('.flt').forEach(function(b){ b.classList.remove('on'); });
        btn.classList.add('on');
        renderFeed();
        /* scroll to feed top */
        feed && feed.scrollIntoView({behavior:'smooth', block:'start'});
      });
    });

    /* ── Entry point called by api.js ─────────────────────── */
    window.onNewsLoaded = function(){
      _all = (window._newsAllPosts || []);

      /* ScholarlyArticle structured data for peer-reviewed output.
         The feed is API-driven, so this can't live statically in the
         head — injected once, publications only. */
      try{
        if(!document.getElementById('pubSchema')){
          var pubs = _all.filter(function(p){ return p.post_type === 'publication'; });
          if(pubs.length){
            var g = pubs.map(function(p){
              var a = { '@type':'ScholarlyArticle', 'headline': p.title || '' };
              if(p.authors) a.author = String(p.authors).split(/,\s*/).map(function(n){ return { '@type':'Person','name':n }; });
              if(p.published_at || p.created_at) a.datePublished = (p.published_at || p.created_at).slice(0,10);
              if(p.journal) a.isPartOf = { '@type':'Periodical','name': p.journal };
              if(p.doi) a.sameAs = 'https://doi.org/' + String(p.doi).replace(/^https?:\/\/doi\.org\//,'');
              return a;
            });
            var s = document.createElement('script');
            s.type = 'application/ld+json'; s.id = 'pubSchema';
            s.textContent = JSON.stringify({ '@context':'https://schema.org','@graph':g });
            document.head.appendChild(s);
          }
        }
      }catch(e){}

      /* Hide skeleton, show feed */
      if(skeleton) skeleton.style.display = 'none';

      populateSidebar();
      populateHeroSpotlight();
      populatePubHighlights();
      populatePubTimeline();
      renderFeed();
    };

    /* ── Publication highlights — curated, not the full feed ── */
    function populatePubHighlights(){
      var wrap = document.getElementById('pubHighlightsWrap');
      var list = document.getElementById('pubHighlightsList');
      if(!wrap || !list) return;
      var pubs = _all.filter(function(p){ return p.post_type === 'publication' && p.is_featured; }).slice(0, 5);
      if(!pubs.length){ wrap.style.display = 'none'; return; }
      list.innerHTML = pubs.map(function(p, i){
        var year = p.published_at ? new Date(p.published_at).getFullYear() : '';
        return '<a href="#" class="pub-hl-row" data-idx="'+i+'" style="display:flex;align-items:baseline;gap:.875rem;padding:1rem 0;'+(i>0?'border-top:1px solid var(--border-l);':'')+'text-decoration:none;color:inherit;">'+
          '<span style="font-family:var(--ff-mono);font-size:var(--fs-label);color:var(--ink-4);flex-shrink:0;white-space:nowrap;">'+esc(p.journal_name||'')+(year?' · '+year:'')+'</span>'+
          '<span style="font-size:var(--fs-meta);flex:1;">'+esc(p.title||'')+'</span>'+
          '</a>';
      }).join('');
      list.querySelectorAll('.pub-hl-row').forEach(function(row){
        row.addEventListener('click', function(e){
          e.preventDefault();
          openPost(pubs[parseInt(row.dataset.idx, 10)]);
        });
      });
      wrap.style.display = '';
    }

    /* ── PHASE 2 · 8: Publications as a timeline artifact ─────────
       A horizontal year-axis: one column per year, one dot per
       paper stacked upward — output over time made visible at a
       glance instead of buried in a list. Dots carry the title as
       a native tooltip and open the post on click/Enter. Built
       from the same _all array the feed already holds. */
    function populatePubTimeline(){
      var wrap = document.getElementById('pubTimelineWrap');
      var el = document.getElementById('pubTimeline');
      if(!wrap || !el) return;
      var pubs = _all.filter(function(p){ return p.post_type === 'publication'; });
      if(pubs.length < 3) return;   /* below this it reads as noise */

      var byYear = {};
      pubs.forEach(function(p){
        var d = p.published_at || p.created_at;
        if(!d) return;
        var y = String(new Date(d).getFullYear());
        (byYear[y] = byYear[y] || []).push(p);
      });
      var years = Object.keys(byYear).sort();
      if(years.length < 2) return;  /* one column isn't a timeline */

      el.innerHTML = years.map(function(y){
        var dots = byYear[y].map(function(p){
          return '<button class="pt-dot" role="listitem" title="'+esc(p.title||'')+'" data-pid="'+esc(String(p.id))+'" aria-label="'+esc(p.title||'Publication')+', '+y+'"></button>';
        }).join('');
        return '<div class="pt-col"><div class="pt-dots">'+dots+'</div>'+
               '<div class="pt-count">'+byYear[y].length+'</div>'+
               '<div class="pt-year">'+y+'</div></div>';
      }).join('');

      el.querySelectorAll('.pt-dot').forEach(function(d){
        d.addEventListener('click', function(){
          var p = pubs.find(function(x){ return String(x.id) === d.dataset.pid; });
          if(p) openPost(p);
        });
      });
      wrap.style.display = '';
    }

    /* ── Hero spotlight: up to 4 featured-first candidates, no
       auto-rotate — post titles take real reading time, same reasoning
       as index.html's hero. User clicks a dot to move between them. */
    var spotlightPool = [];
    var activeSpotlightIdx = 0;

    function buildSpotlightPool(){
      if(!_all.length) return [];
      var featured = _all.filter(function(p){ return p.is_featured; });
      var rest = _all.filter(function(p){ return !p.is_featured; });
      return featured.concat(rest).slice(0, 4);
    }

    function renderSpotlight(p){
      var card = document.getElementById('heroLatest');
      var imgEl= document.getElementById('heroLatestImg');
      var badge= document.getElementById('heroLatestBadge');
      var title= document.getElementById('heroLatestTitle');
      var meta = document.getElementById('heroLatestMeta');
      if(!card || !p) return;

      if(badge){
        badge.innerHTML =
          '<span lang="en">Spotlight · '+esc(typeLabel(p.post_type||'article'))+'</span>'+
          '<span lang="es">Destacado · '+esc(typeLabel(p.post_type||'article'))+'</span>';
      }
      if(title){
        title.innerHTML = '<span lang="en">'+esc(p.title||'Untitled')+'</span><span lang="es">'+esc(p.title||'Untitled')+'</span>';
      }
      if(meta){
        var metaTxt = fmtDate(p.published_at||p.created_at)+((p.author && p.post_type !== 'publication')?' · '+esc(p.author.full_name):'')+(p.research_line?' · L'+p.research_line.line_number:'');
        meta.textContent = metaTxt;
      }
      imgEl.innerHTML = p.featured_image_url
        ? '<img src="'+esc(p.featured_image_url)+'" alt="'+esc(p.title||'')+'" loading="lazy">'
        : '<div class="blog-hero-feature-ph"></div>';

      card.onclick = function(){ openPost(p); };
      card.style.cursor = 'pointer';
    }

    function renderSpotlightDots(){
      var dotsEl = document.getElementById('heroLatestDots');
      if(!dotsEl) return;
      if(spotlightPool.length < 2){ dotsEl.innerHTML=''; return; }
      dotsEl.innerHTML = spotlightPool.map(function(_, i){
        return '<button class="story-dot'+(i===activeSpotlightIdx?' active':'')+'" role="tab" aria-selected="'+(i===activeSpotlightIdx)+'" aria-label="Story '+(i+1)+' of '+spotlightPool.length+'" data-idx="'+i+'"></button>';
      }).join('');
      dotsEl.querySelectorAll('.story-dot').forEach(function(dot){
        dot.addEventListener('click', function(e){
          e.stopPropagation();
          activeSpotlightIdx = parseInt(dot.dataset.idx, 10);
          renderSpotlight(spotlightPool[activeSpotlightIdx]);
          renderSpotlightDots();
        });
      });
    }

    function populateHeroSpotlight(){
      spotlightPool = buildSpotlightPool();
      if(!spotlightPool.length) return;
      activeSpotlightIdx = 0;
      renderSpotlight(spotlightPool[0]);
      renderSpotlightDots();
    }

    /* Fallback: if api.js already ran before this script */
    if(window._newsAllPosts && window._newsAllPosts.length){
      window.onNewsLoaded();
    }

  })();
  
  
  

(function(){
  var mob=document.getElementById('mobToggle');
  var drawer=document.getElementById('mobDrawer');
  var overlay=document.getElementById('mobOverlay');
  // header-enhance.js owns the scrolled-state scroll listener and the
  // drawer focus trap (MutationObserver on #mobDrawer's "open" class
  // -- works regardless of which function below toggles it). This
  // used to also sync aria-pressed on the desktop language buttons by
  // ID, which is now wrong: those buttons are role="radio" inside a
  // radiogroup (see polish.css/header-enhance.js), so the correct
  // attribute is aria-checked, and header-enhance.js's syncLangSwitch
  // already keeps it current on every selectLang() call -- this
  // redundant, now-incorrect sync is removed.
  var _orig=window.selectLang;
  window.selectLang=function(l){
    if(_orig)_orig(l);
    if(drawer)drawer.classList.remove('open');
    if(overlay)overlay.classList.remove('open');
    if(mob)mob.setAttribute('aria-expanded','false');
  };
})();


  
  /* ── News hero bronchial tree ─────────────────────────── */
  (function(){
    var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function drawTree(ctx, W, H, breath, dir, cx, originY, trunkH, mainLen){
      ctx.lineCap = 'round';
      var nodePoints = [];

      function branch(x, y, angle, len, depth){
        if(depth > 8 || len < 1.5) return;
        var ex = x + Math.sin(angle) * len;
        var ey = y + dir * Math.cos(angle) * len;
        var sw    = Math.max(0.12, 0.9  * Math.pow(0.67, depth));
        var alpha = Math.max(0.06, 0.52 * Math.pow(0.77, depth));
        ctx.lineWidth   = sw;
        ctx.strokeStyle = 'rgba(0,179,179,'+alpha.toFixed(3)+')';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
        nodePoints.push({ x: ex, y: ey, depth: depth });
        var spread = 0.40 + breath * 0.06;
        branch(ex, ey, angle - spread, len * 0.69, depth + 1);
        branch(ex, ey, angle + spread, len * 0.69, depth + 1);
      }

      /* trachea */
      ctx.lineWidth = 0.85;
      ctx.strokeStyle = 'rgba(0,179,179,0.48)';
      ctx.beginPath(); ctx.moveTo(cx, originY); ctx.lineTo(cx, originY + dir * trunkH); ctx.stroke();
      nodePoints.push({ x: cx, y: originY + dir * trunkH, depth: -1 });

      var breathOff = breath * 0.03;
      branch(cx, originY + dir * trunkH, -(0.30 + breathOff), mainLen,        0);
      branch(cx, originY + dir * trunkH,  (0.25 + breathOff), mainLen * 0.94, 0);

      /* nodes */
      nodePoints.forEach(function(n){
        var r     = n.depth < 0 ? 2.2 : Math.max(0.7, 2.2 * Math.pow(0.72, n.depth + 1));
        var alpha = Math.max(0.08, 0.55 * Math.pow(0.78, Math.max(n.depth, 0)));
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,179,179,'+alpha.toFixed(3)+')'; ctx.fill();
        if(r > 1.2){
          ctx.beginPath(); ctx.arc(n.x, n.y, r + 1.8, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(0,179,179,'+(alpha * 0.35).toFixed(3)+')';
          ctx.lineWidth = 0.3; ctx.stroke();
        }
      });

      /* ghost lung silhouettes */
      var sc = Math.min(H * 0.36, W * 0.17);
      var cy = originY + dir * (trunkH + mainLen * 1.1);
      var lo = 0.07 + breath * 0.04;
      var lx = cx - sc * 0.18, rx = cx + sc * 0.18;
      ctx.lineWidth = 0.35;
      ctx.strokeStyle = 'rgba(0,179,179,'+lo.toFixed(3)+')';
      ctx.beginPath();
      ctx.moveTo(cx, cy - dir*sc);
      ctx.bezierCurveTo(lx-sc*1.05, cy-dir*sc*0.65, lx-sc*1.15, cy+dir*sc*0.45, lx-sc*0.12, cy+dir*sc);
      ctx.bezierCurveTo(cx-sc*0.04, cy+dir*sc*0.55, cx, cy+dir*sc*0.25, cx, cy-dir*sc);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy - dir*sc);
      ctx.bezierCurveTo(rx+sc*1.05, cy-dir*sc*0.65, rx+sc*1.15, cy+dir*sc*0.45, rx+sc*0.12, cy+dir*sc);
      ctx.bezierCurveTo(cx+sc*0.04, cy+dir*sc*0.55, cx, cy+dir*sc*0.25, cx, cy-dir*sc);
      ctx.stroke();
    }

    function bootCanvas(){
      var canvas = document.getElementById('newsBg');
      if(!canvas) return;
      var ctx = canvas.getContext('2d');
      var W, H, paused = false;

      function resize(){
        W = canvas.width  = canvas.parentElement.offsetWidth;
        H = canvas.height = canvas.parentElement.offsetHeight;
      }

      document.addEventListener('visibilitychange', function(){
        paused = document.hidden;
        if(!paused) requestAnimationFrame(draw);
      });

      function draw(t){
        if(paused) return;
        ctx.clearRect(0, 0, W, H);
        var mobile = W < 960;
        /* on mobile push right and fade */
        canvas.style.opacity = mobile ? '0.25' : '0.85';
        var cx = mobile ? W * 0.85 : W * 0.72;
        var breath = REDUCED ? 0.5 : Math.sin(t * 0.00075) * 0.5 + 0.5;
        drawTree(ctx, W, H, breath, 1, cx, H * 0.02, H * 0.16, H * 0.155);
        if(!REDUCED) requestAnimationFrame(draw);
      }

      resize();
      window.addEventListener('resize', resize);
      if(REDUCED){
        requestAnimationFrame(function(t){ draw(t); });
      } else {
        requestAnimationFrame(draw);
      }
    }

    bootCanvas();
  })();
  
/* ===== data fetch (was loadNews in api.js) ===== */
async function loadNews(filters = {}) {
  const feed = document.getElementById('blogFeed') || document.getElementById('newsFeed');
  if (!feed) return;
  const params = new URLSearchParams();
  if (filters.type && filters.type !== 'all') params.set('type', filters.type);
  try {
    const data = await fetchList('news', `?${params}`);
    window._newsAllPosts = data || [];
    if (typeof window.onNewsLoaded === 'function') window.onNewsLoaded();
  } catch (err) {
    setError(feed, 'Could not load posts. Please try again later.');
  }
}
loadNews();
