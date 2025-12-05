// AniList Search System
const ANILIST_URL = "https://graphql.anilist.co";

const apiSearchInput = document.getElementById("api-search-input");
const apiMediaType = document.getElementById("api-media-type");
const apiSearchBtn = document.getElementById("api-search-btn");
const apiResultsEl = document.getElementById("api-results");

// Debounce
function debounce(fn, time = 350) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), time);
  };
}

async function searchAniList(query, type = "ANIME") {
  const q = `
    query ($search: String, $type: MediaType) {
      Page(page:1, perPage:20) {
        media(search: $search, type: $type) {
          id
          title { romaji english native }
          coverImage { large medium }
          format
          averageScore
          episodes
          chapters
          genres
        }
      }
    }
  `;

  const response = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: q,
      variables: { search: query, type }
    })
  });

  const json = await response.json();
  return json.data.Page.media;
}

function renderApiResults(items) {
  apiResultsEl.innerHTML = "";

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img src="${item.coverImage?.large}" alt="cover">
      <div class="card-body">
        <h3>${item.title.english || item.title.romaji}</h3>
        <p>${item.format || ""} • ⭐ ${item.averageScore ?? "--"}</p>
        <button class="small-btn add-btn">Add to List</button>
      </div>
    `;

    // ADD TO LIST BUTTON
    card.querySelector(".add-btn").addEventListener("click", () => {
      window.saveMediaEntry({
        id: item.id.toString(),
        title: item.title.english || item.title.romaji,
        type: apiMediaType.value.toLowerCase(), // anime/manga
        thumbnail: item.coverImage.large,
        format: item.format,
        score: item.averageScore,
        episodes: item.episodes,
        chapters: item.chapters,
        genres: item.genres
      });
    });

    apiResultsEl.appendChild(card);
  });
}

// Search events
apiSearchBtn.addEventListener("click", async () => {
  const q = apiSearchInput.value.trim();
  if (!q) return;

  const items = await searchAniList(q, apiMediaType.value.toUpperCase());
  renderApiResults(items);
});

apiSearchInput.addEventListener(
  "input",
  debounce(() => {
    if (apiSearchInput.value.trim().length >= 2) apiSearchBtn.click();
  }, 600)
);
