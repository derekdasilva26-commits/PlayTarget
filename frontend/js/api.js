const API_URL = "http://127.0.0.1:8000";

// ==========================
// ELEMENTOS (HTML)
// ==========================
const statusEl = document.getElementById("status");

const gamesList = document.getElementById("gamesList");
const gameForm = document.getElementById("gameForm");
const refreshGamesBtn = document.getElementById("refreshGamesBtn");

const sitesList = document.getElementById("sitesList");
const siteForm = document.getElementById("siteForm");
const refreshSitesBtn = document.getElementById("refreshSitesBtn");

const priceForm = document.getElementById("priceForm");
const refreshPriceFormBtn = document.getElementById("refreshPriceFormBtn");
const priceGameId = document.getElementById("priceGameId");
const priceSiteId = document.getElementById("priceSiteId");
const priceValue = document.getElementById("priceValue");
const priceCurrency = document.getElementById("priceCurrency");
const priceResult = document.getElementById("priceResult");

// ==========================
// AUTH
// ==========================
function getToken() {
  return localStorage.getItem("token");
}

function authHeaders() {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function updateAuthUI() {
  const token = getToken();
  const authForm = document.getElementById("authForm");
  const authStatus = document.getElementById("authStatus");
  const loggedUser = document.getElementById("loggedUser");

  if (token) {
    // Decode username from JWT payload (no verification needed client-side)
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (loggedUser) loggedUser.textContent = `Logado como: ${payload.sub}`;
    } catch {
      if (loggedUser) loggedUser.textContent = "Logado";
    }
    if (authForm) authForm.classList.add("hidden");
    if (authStatus) authStatus.classList.remove("hidden");
  } else {
    if (authForm) authForm.classList.remove("hidden");
    if (authStatus) authStatus.classList.add("hidden");
  }
}

async function register() {
  const username = document.getElementById("authUsername")?.value?.trim();
  const password = document.getElementById("authPassword")?.value;
  const msgEl = document.getElementById("authMessage");

  if (!username || !password) {
    if (msgEl) { msgEl.textContent = "Preencha username e senha."; msgEl.classList.remove("hidden"); }
    return;
  }

  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (msgEl) { msgEl.textContent = data.detail || "Erro ao registrar."; msgEl.classList.remove("hidden"); }
    return;
  }

  if (msgEl) { msgEl.textContent = ""; msgEl.classList.add("hidden"); }
  // Auto-login after register
  await login(username, password);
}

async function login(usernameArg, passwordArg) {
  const username = usernameArg ?? document.getElementById("authUsername")?.value?.trim();
  const password = passwordArg ?? document.getElementById("authPassword")?.value;
  const msgEl = document.getElementById("authMessage");

  if (!username || !password) {
    if (msgEl) { msgEl.textContent = "Preencha username e senha."; msgEl.classList.remove("hidden"); }
    return;
  }

  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (msgEl) { msgEl.textContent = data.detail || "Username ou senha inválidos."; msgEl.classList.remove("hidden"); }
    return;
  }

  const data = await res.json();
  localStorage.setItem("token", data.access_token);
  if (msgEl) { msgEl.textContent = ""; msgEl.classList.add("hidden"); }
  updateAuthUI();
}

function logout() {
  localStorage.removeItem("token");
  updateAuthUI();
}

// Bind auth buttons
const registerBtn = document.getElementById("registerBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
if (registerBtn) registerBtn.addEventListener("click", register);
if (loginBtn) loginBtn.addEventListener("click", () => login());
if (logoutBtn) logoutBtn.addEventListener("click", logout);

// ==========================
// HELPERS
// ==========================
function setStatus(ok) {
  if (!statusEl) return;
  statusEl.textContent = ok ? "ONLINE" : "OFFLINE";
  statusEl.className = ok ? "font-bold text-green-700" : "font-bold text-red-700";
}

async function checkBackend() {
  try {
    const r = await fetch(`${API_URL}/`);
    setStatus(r.ok);
  } catch {
    setStatus(false);
  }
}

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

// ==========================
// SITES CACHE (para mostrar nome da plataforma nos preços)
// ==========================
let sitesCache = new Map(); // site_id -> {id,name,url,active,...}

async function refreshSitesCache() {
  const res = await fetch(`${API_URL}/sites/`);
  if (!res.ok) return;
  const sites = await res.json();
  sitesCache = new Map(sites.map((s) => [s.id, s]));
}

// ==========================
// GAMES
// ==========================
async function fetchGames() {
  if (!gamesList) return;

  const response = await fetch(`${API_URL}/games/`);
  const games = await response.json();

  gamesList.innerHTML = "";

  games.forEach((game) => {
    const div = document.createElement("div");
    div.className = "border p-4 rounded bg-gray-50";

    div.innerHTML = `
      <h3 class="font-bold text-lg">${game.title}</h3>
      <p class="text-sm text-gray-600">${game.genre}</p>
      <p class="mt-2">${game.description || ""}</p>

      <div class="mt-3 flex flex-wrap gap-2">
        <button data-game-id="${game.id}"
          class="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 view-prices-btn">
          Ver Preços
        </button>

        <button data-game-id="${game.id}"
          class="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 edit-game-btn">
          Editar
        </button>

        <button data-game-id="${game.id}"
          class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 delete-game-btn">
          Remover
        </button>
      </div>

      <div id="prices-${game.id}" class="mt-3 text-sm text-gray-700"></div>
    `;

    gamesList.appendChild(div);
  });

  document.querySelectorAll(".view-prices-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.getAttribute("data-game-id"));
      await loadPrices(id);
    });
  });

  document.querySelectorAll(".delete-game-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.getAttribute("data-game-id"));
      await deleteGame(id);
    });
  });

  document.querySelectorAll(".edit-game-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.getAttribute("data-game-id"));
      await editGame(id);
    });
  });
}

if (gameForm) {
  gameForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newGame = {
      title: document.getElementById("title")?.value?.trim(),
      genre: document.getElementById("genre")?.value?.trim(),
      description: document.getElementById("description")?.value?.trim(),
    };

    const res = await fetch(`${API_URL}/games/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(newGame),
    });

    if (!res.ok) {
      alert(`Erro ao cadastrar jogo: ${await safeText(res)}`);
      return;
    }

    gameForm.reset();
    await fetchGames();
    await refreshPriceFormOptions();
  });
}

if (refreshGamesBtn) refreshGamesBtn.addEventListener("click", fetchGames);

// ==========================
// SITES
// ==========================
async function fetchSites() {
  if (!sitesList) return;

  const response = await fetch(`${API_URL}/sites/`);
  const sites = await response.json();

  sitesList.innerHTML = "";

  sites.forEach((site) => {
    const div = document.createElement("div");
    div.className = "border p-4 rounded bg-gray-50";

    div.innerHTML = `
      <h3 class="font-bold text-lg">${site.name}</h3>
      <p class="text-sm text-gray-600">${site.url}</p>
      <p class="mt-2 text-sm">Status: ${
        site.active
          ? "<span class='text-green-700 font-semibold'>Ativo</span>"
          : "<span class='text-red-700 font-semibold'>Inativo</span>"
      }</p>

      <div class="mt-3 flex flex-wrap gap-2">
        <button data-site-id="${site.id}"
          class="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 edit-site-btn">
          Editar
        </button>

        <button data-site-id="${site.id}"
          class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 delete-site-btn">
          Remover
        </button>
      </div>
    `;

    sitesList.appendChild(div);
  });

  sitesCache = new Map(sites.map((s) => [s.id, s]));

  document.querySelectorAll(".delete-site-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.getAttribute("data-site-id"));
      await deleteSite(id);
    });
  });

  document.querySelectorAll(".edit-site-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.getAttribute("data-site-id"));
      await editSite(id);
    });
  });
}

if (siteForm) {
  siteForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      name: document.getElementById("siteName")?.value?.trim(),
      url: document.getElementById("siteUrl")?.value?.trim(),
      active: Boolean(document.getElementById("siteActive")?.checked),
    };

    const res = await fetch(`${API_URL}/sites/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      alert(`Erro ao cadastrar site: ${await safeText(res)}`);
      return;
    }

    siteForm.reset();
    const active = document.getElementById("siteActive");
    if (active) active.checked = true;

    await fetchSites();
    await refreshPriceFormOptions();
  });
}

if (refreshSitesBtn) refreshSitesBtn.addEventListener("click", fetchSites);

// ==========================
// PRICES
// ==========================
async function loadPrices(gameId) {
  const pricesDiv = document.getElementById(`prices-${gameId}`);
  if (!pricesDiv) return;

  pricesDiv.innerHTML = "Carregando...";

  if (!sitesCache || sitesCache.size === 0) {
    await refreshSitesCache();
  }

  const response = await fetch(`${API_URL}/prices/game/${gameId}`);

  if (response.status === 404) {
    pricesDiv.innerHTML = "Nenhum preço cadastrado.";
    return;
  }

  if (!response.ok) {
    pricesDiv.innerHTML = `Erro ao buscar preços (${response.status}).`;
    return;
  }

  const prices = await response.json();

  pricesDiv.innerHTML = prices
    .map((p) => {
      const siteName = sitesCache.get(p.site_id)?.name || `Site #${p.site_id}`;
      const value = `${p.currency || "BRL"} ${Number(p.price).toFixed(2)}`;

      return `
        <div class="flex items-center justify-between gap-2 py-1">
          <div class="text-sm">
            <span class="font-semibold">${siteName}</span>
            <span class="text-gray-600">— ${value}</span>
          </div>

          <div class="flex items-center gap-2">
            <button class="text-xs bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
              onclick="editPrice(${p.id}, ${p.game_id}, ${p.site_id}, ${p.price}, '${p.currency || "BRL"}')">
              Editar
            </button>
            <button class="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
              onclick="deletePrice(${p.id}, ${p.game_id})">
              Remover
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

async function refreshPriceFormOptions() {
  if (!priceGameId || !priceSiteId) return;

  const [gamesRes, sitesRes] = await Promise.all([
    fetch(`${API_URL}/games/`),
    fetch(`${API_URL}/sites/`),
  ]);

  const games = gamesRes.ok ? await gamesRes.json() : [];
  const sites = sitesRes.ok ? await sitesRes.json() : [];

  priceGameId.innerHTML = "";
  games.forEach((g) => {
    const opt = document.createElement("option");
    opt.value = g.id;
    opt.textContent = `${g.id} - ${g.title}`;
    priceGameId.appendChild(opt);
  });

  priceSiteId.innerHTML = "";
  sites.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = `${s.id} - ${s.name}`;
    priceSiteId.appendChild(opt);
  });

  sitesCache = new Map(sites.map((s) => [s.id, s]));
}

if (refreshPriceFormBtn) {
  refreshPriceFormBtn.addEventListener("click", refreshPriceFormOptions);
}

if (priceForm) {
  priceForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!priceGameId?.value || !priceSiteId?.value) {
      if (priceResult) priceResult.textContent = "Selecione um game e um site.";
      return;
    }

    const payload = {
      game_id: Number(priceGameId.value),
      site_id: Number(priceSiteId.value),
      price: Number(priceValue.value),
      currency: (priceCurrency?.value || "BRL").trim(),
    };

    if (priceResult) priceResult.textContent = "Enviando...";

    const res = await fetch(`${API_URL}/prices/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await safeText(res);
      if (priceResult) priceResult.textContent = `Erro ao cadastrar preço: ${txt}`;
      return;
    }

    if (priceResult) priceResult.textContent = "Preço cadastrado com sucesso!";
    priceForm.reset();
    if (priceCurrency) priceCurrency.value = "BRL";

    await loadPrices(payload.game_id);
  });
}

// ==========================
// EDITAR / REMOVER JOGO
// ==========================
async function deleteGame(gameId) {
  const ok = confirm("Tem certeza que deseja remover este jogo?");
  if (!ok) return;

  const res = await fetch(`${API_URL}/games/${gameId}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) {
    alert(`Erro ao remover jogo: ${await safeText(res)}`);
    return;
  }

  await fetchGames();
  await refreshPriceFormOptions();
}

async function editGame(gameId) {
  const resGame = await fetch(`${API_URL}/games/${gameId}`);
  if (!resGame.ok) {
    alert("Não consegui carregar o jogo para editar.");
    return;
  }
  const game = await resGame.json();

  const title = prompt("Novo título:", game.title);
  if (title === null) return;

  const genre = prompt("Novo gênero:", game.genre || "");
  if (genre === null) return;

  const description = prompt("Nova descrição:", game.description || "");
  if (description === null) return;

  const res = await fetch(`${API_URL}/games/${gameId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ title, genre, description }),
  });

  if (!res.ok) {
    alert(`Erro ao atualizar jogo: ${await safeText(res)}`);
    return;
  }

  await fetchGames();
  await refreshPriceFormOptions();
}

// ==========================
// EDITAR / REMOVER SITE
// ==========================
async function deleteSite(siteId) {
  const ok = confirm("Tem certeza que deseja remover este site?");
  if (!ok) return;

  const res = await fetch(`${API_URL}/sites/${siteId}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) {
    alert(`Erro ao remover site: ${await safeText(res)}`);
    return;
  }

  await fetchSites();
  await refreshPriceFormOptions();
}

async function editSite(siteId) {
  const resSite = await fetch(`${API_URL}/sites/${siteId}`);
  if (!resSite.ok) {
    alert("Não consegui carregar o site para editar.");
    return;
  }
  const site = await resSite.json();

  const name = prompt("Novo nome da plataforma:", site.name);
  if (name === null) return;

  const url = prompt("Nova URL:", site.url || "");
  if (url === null) return;

  const activeStr = prompt("Ativo? (sim/não):", site.active ? "sim" : "não");
  if (activeStr === null) return;
  const active = activeStr.trim().toLowerCase().startsWith("s");

  const res = await fetch(`${API_URL}/sites/${siteId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ name, url, active }),
  });

  if (!res.ok) {
    alert(`Erro ao atualizar site: ${await safeText(res)}`);
    return;
  }

  await fetchSites();
  await refreshPriceFormOptions();
}

// ==========================
// EDITAR / REMOVER PREÇO (funções globais para onclick)
// ==========================
async function deletePrice(priceId, gameId) {
  const ok = confirm("Tem certeza que deseja remover este preço?");
  if (!ok) return;

  const res = await fetch(`${API_URL}/prices/${priceId}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) {
    alert("Erro ao remover preço.");
    return;
  }

  await loadPrices(gameId);
}

async function editPrice(priceId, gameId, siteId, currentPrice, currentCurrency) {
  const newPriceStr = prompt("Novo preço:", String(currentPrice));
  if (newPriceStr === null) return;

  const newPrice = Number(newPriceStr);
  if (Number.isNaN(newPrice) || newPrice < 0) {
    alert("Preço inválido.");
    return;
  }

  const res = await fetch(`${API_URL}/prices/${priceId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ price: newPrice }),
  });

  if (!res.ok) {
    alert("Erro ao atualizar preço.");
    return;
  }

  await loadPrices(gameId);
}

// expor no window para o onclick funcionar em todos os browsers
window.deletePrice = deletePrice;
window.editPrice = editPrice;

// ==========================
// INICIALIZAÇÃO
// ==========================
(async function init() {
  updateAuthUI();
  await checkBackend();
  await fetchGames();
  await fetchSites();
  await refreshPriceFormOptions();
})();