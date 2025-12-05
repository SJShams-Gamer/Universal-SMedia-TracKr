// script.js (ES module)
// This script focuses on AniList search (GraphQL) and API result rendering.
// It runs on index.html after app.js (app.js initializes Firebase and exposes Firestore functions).

const ANILIST_URL = 'https://graphql.anilist.co';

const apiSearchInput = document.getElementById('api-search-input');
const apiMediaType = document.getElementById('api-media-type');
const apiSearchBtn = document.getElementById('api-search-btn');
const apiResultsEl = document.getElementById('api-results');

function debounce(fn, wait=350){
  let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), wait); };
}

async function searchAniList(query, type='ANIME'){
  if(!query) return [];
  const q = `
    query ($search: String, $type: MediaType, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total, currentPage, lastPage, perPage }
        media(search: $search, type: $type) {
          id
          title { romaji english native }
          coverImage { large medium }
          bannerImage
          format
          averageScore
          episodes
          chapters
          startDate { year month day }
          status
          genres
          siteUrl
          popularity
        }
      }
    }
  `;
  const payload = { query: q, variables: { search: query, type, page:1, perPage:20 } };
  try {
    const res = await fetch(ANILIST_URL, {
      method:'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if(!res.ok) throw new Error('AniList fetch failed: ' + res.status);
    const json = await res.json();
    return json.data?.Page?.media || [];
  } catch(err){
    console.error('AniList error', err);
    throw err;
  }
}

function renderApiResults(items){
  apiResultsEl.innerHTML = '';
  if(!items || items.length===0){
    apiResultsEl.innerHTML = `<p style="color:var(--muted)">No results</p>`;
    return;
  }
  items.forEach(item => {
    const card = document.createElement('article');
    card.className = 'card';
    const img = document.createElement('img'); img.src = item.coverImage?.large || item.coverImage?.medium || 'https://via.placeholder.com/640x360?text=No+Image';
    img.alt = item.title?.romaji || item.title?.english || 'cover';
    const body = document.createElement('div'); body.className='card-body';
    const h3 = document.createElement('h3'); h3.textContent = item.title?.english || item.title?.romaji || 'Untitled';
    const p = document.createElement('p'); p.textContent = item.format ? `${item.format} • ${item.averageScore ?? '—'}` : '';
    const actions = document.createElement('div'); actions.className='actions';
    const saveBtn = document.createElement('button'); saveBtn.className='small-btn'; saveBtn.textContent='+ Save';
    saveBtn.addEventListener('click', async ()=>{
      // Save to Firestore (create doc under current user's list)
      if(typeof window.saveImported === 'function'){
        // Use global helper if available (app.js saves imported arrays)
        await window.saveImported([{
          title: item.title?.romaji || item.title?.english || 'Untitled',
          type: 'anime',
          cover: item.coverImage?.large || item.coverImage?.medium || null,
          status: item.status || null,
          notes: null,
          source: 'anilist'
        }]);
        alert('Saved to My List');
      } else {
        alert('Save helper unavailable (not signed in?).');
      }
    });

    actions.appendChild(saveBtn);
    body.appendChild(h3);
    body.appendChild(p);
    body.appendChild(actions);
    card.appendChild(img);
    card.appendChild(body);
    apiResultsEl.appendChild(card);
  });
}

// wire events
if(apiSearchBtn){
  const doSearch = async ()=>{
    const q = apiSearchInput.value.trim();
    if(!q) { apiResultsEl.innerHTML=''; return; }
    apiSearchBtn.disabled = true; apiSearchBtn.textContent='Searching...';
    try{
      const items = await searchAniList(q, apiMediaType.value || 'ANIME');
      renderApiResults(items);
    } catch(err){
      apiResultsEl.innerHTML = `<p style="color:#ffb4b4">Search failed: ${err.message}</p>`;
    } finally {
      apiSearchBtn.disabled = false; apiSearchBtn.textContent='Search AniList';
    }
  };
  apiSearchBtn.addEventListener('click', doSearch);
  apiSearchInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') doSearch(); });
  apiSearchInput.addEventListener('input', debounce(()=>{ if(apiSearchInput.value.trim().length>=2) apiSearchBtn.click(); }, 600));
}
