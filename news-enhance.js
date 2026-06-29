/* neumACt R&I — News zone enhancements (news.html only)
 * Adds live text-search on top of the page's existing filter/feed system,
 * without modifying that inline code. Null-safe: does nothing if the
 * search input or feed isn't present. */
(function(){
  'use strict';

  function initFeedSearch(){
    var input = document.getElementById('feedSearch');
    var feed  = document.getElementById('blogFeed');
    var countEl = document.getElementById('filterCount');
    if (!input || !feed) return;

    var debounce;
    function apply(){
      var q = input.value.trim().toLowerCase();
      var items = Array.prototype.filter.call(
        feed.children,
        function(c){ return c.id !== 'feedSkeleton' && !c.classList.contains('feed-state') && !c.classList.contains('feed-empty'); }
      );
      var shown = 0;
      items.forEach(function(item){
        var text = (item.textContent || '').toLowerCase();
        var match = !q || text.indexOf(q) !== -1;
        item.style.display = match ? '' : 'none';
        if (match) shown++;
      });

      // Manage an empty-state node for "no search results"
      var existing = feed.querySelector('.feed-empty');
      if (q && shown === 0){
        if (!existing){
          var empty = document.createElement('div');
          empty.className = 'feed-empty';
          empty.innerHTML =
            '<p class="feed-empty-title"><span lang="en">No matches found</span><span lang="es">Sin resultados</span></p>'
            + '<p><span lang="en">Nothing matches that search.</span><span lang="es">Nada coincide con esa búsqueda.</span></p>'
            + '<button class="feed-empty-reset" type="button"><span lang="en">Clear search</span><span lang="es">Borrar búsqueda</span></button>';
          empty.querySelector('.feed-empty-reset').addEventListener('click', function(){
            input.value = ''; apply(); input.focus();
          });
          feed.appendChild(empty);
        }
      } else if (existing){
        existing.remove();
      }

      if (countEl && q){
        countEl.textContent = shown + (shown === 1 ? ' result' : ' results');
      }
    }

    input.addEventListener('input', function(){
      feed.classList.add('filtering');
      clearTimeout(debounce);
      debounce = setTimeout(function(){
        apply();
        feed.classList.remove('filtering');
      }, 160);
    });

    // Re-apply search when the category filter re-renders the feed.
    // The page's filter buttons rebuild feed children, so observe it.
    var mo = new MutationObserver(function(){
      if (input.value.trim()) apply();
    });
    mo.observe(feed, { childList:true });
  }

  function boot(){ initFeedSearch(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
