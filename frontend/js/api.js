const API_URL = "http://127.0.0.1:8001";

let USD_TO_BRL = 5.70;
let USD_TO_BRL_UPDATED_AT = "";
let USD_TO_BRL_SOURCE = "";

fetch(`${API_URL}/health`)
  .then(res => res.json())
  .then(data => {
     document.getElementById('api-status').textContent =
       data.status === 'healthy' ? 'ONLINE' : 'OFFLINE';
  })
  .catch(() => {
     document.getElementById('api-status').textContent = 'OFFLINE';
  });
  
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

const selectGame = document.getElementById("selectGame");
const btnRefreshAuto = document.getElementById("btnRefreshAuto");
const refreshStatus = document.getElementById("refresh-status");

const wishlistForm = document.getElementById("wishlistForm");
const wishlistGameId = document.getElementById("wishlistGameId");
const wishlistTargetPrice = document.getElementById("wishlistTargetPrice");
const wishlistMessage = document.getElementById("wishlistMessage");
const wishlistList = document.getElementById("wishlistList");
const refreshWishlistBtn = document.getElementById("refreshWishlistBtn");

const historyForm = document.getElementById("historyForm");
const historyGameId = document.getElementById("historyGameId");
const historyInsight = document.getElementById("historyInsight");
const historyList = document.getElementById("historyList");

let historyChartInstance = null;

// ==========================
// HELPERS
// ==========================
function setStatus(ok) {
  if (!statusEl) return;
  statusEl.textContent = ok ? "ONLINE" : "OFFLINE";
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

async function loadExchangeRate() {
  const box = document.getElementById("exchange-rate-box");
  if (box) {
    box.textContent = "Cotação do dólar: carregando...";
  }

  try {
    const res = await fetch(`${API_URL}/exchange-rate/usd-brl`);
    if (!res.ok) throw new Error("Falha ao buscar cotação");

    const data = await res.json();

    USD_TO_BRL = Number(data.rate);
    USD_TO_BRL_UPDATED_AT = data.updated_at || "";
    USD_TO_BRL_SOURCE = data.source || "Banco Central";

    if (box) {
      box.innerHTML =
        `<strong>Cotação atual:</strong> USD 1 = R$ ${USD_TO_BRL.toFixed(4)} ` +
        `<br><span style="color:#475569;">Fonte: ${USD_TO_BRL_SOURCE}</span>` +
        `<br><span style="color:#475569;">Atualizado em: ${USD_TO_BRL_UPDATED_AT}</span>`;
    }
  } catch {
    if (box) {
      box.innerHTML =
        `<strong>Cotação atual:</strong> USD 1 = R$ ${USD_TO_BRL.toFixed(2)}` +
        ` <span style="color:#b45309;">(valor padrão de segurança)</span>`;
    }
  }
}

// ==========================
// SITES CACHE
// ==========================
let sitesCache = new Map();

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

    div.innerHTML = `
      <h3 style="font-weight:bold; margin:0 0 2px 0">${game.title}</h3>
      <p style="margin:0; font-size:0.9em; color:#555">${game.genre}</p>
      <p style="margin:4px 0 8px 0">${game.description || ""}</p>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button data-game-id="${game.id}" class="view-prices-btn" style="background:#10b981;color:#fff;border:none;padding:5px 12px;border-radius:4px;cursor:pointer;">Ver Preços</button>
        <button data-game-id="${game.id}" class="edit-game-btn" style="background:#f59e0b;color:#fff;border:none;padding:5px 12px;border-radius:4px;cursor:pointer;">Editar</button>
        <button data-game-id="${game.id}" class="delete-game-btn" style="background:#ef4444;color:#fff;border:none;padding:5px 12px;border-radius:4px;cursor:pointer;">Remover</button>
      </div>
      <div id="prices-${game.id}" style="margin-top:8px; font-size:0.9rem; color:#111;"></div>
      <hr style="margin:12px 0; border:none; border-top:1px solid #eee;">
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

async function preencherComboJogos() {
  if (!selectGame) return;

  const res = await fetch(`${API_URL}/games/`);
  if (!res.ok) return;
  const games = await res.json();

  selectGame.innerHTML = "";

  games.forEach((game) => {
    const opt = document.createElement("option");
    opt.value = game.id;
    opt.textContent = `[${game.id}] ${game.title}`;
    selectGame.appendChild(opt);
  });

  if (games.length > 0) {
    buscarComparacao(games[0].id);
  }
}

if (selectGame) {
  selectGame.addEventListener("change", () => {
    const id = selectGame.value;
    if (id) buscarComparacao(id);
  });
}

if (btnRefreshAuto) {
  btnRefreshAuto.addEventListener("click", async () => {
    const id = selectGame?.value;
    if (!id) return;

    btnRefreshAuto.disabled = true;
    btnRefreshAuto.textContent = "⏳ Buscando preços...";
    refreshStatus.textContent = "";
    refreshStatus.style.color = "#fff";

    try {
      const res = await fetch(`${API_URL}/prices/refresh/${id}`, { method: "POST" });
      const data = await res.json();

      if (res.ok && data.total_inserido > 0) {
        refreshStatus.textContent = `✅ ${data.total_inserido} preço(s) encontrado(s) e salvo(s)!`;
        refreshStatus.style.color = "#bbf7d0";
        await buscarComparacao(id);
      } else if (res.ok && data.total_inserido === 0) {
        refreshStatus.textContent = "⚠️ Nenhum preço novo encontrado nas lojas.";
        refreshStatus.style.color = "#fde68a";
      } else {
        refreshStatus.textContent = "❌ Erro ao buscar preços.";
        refreshStatus.style.color = "#fca5a5";
      }
    } catch (e) {
      refreshStatus.textContent = "❌ Erro de conexão com o backend.";
      refreshStatus.style.color = "#fca5a5";
    }

    btnRefreshAuto.disabled = false;
    btnRefreshAuto.textContent = "🔄 Buscar Preços Automaticamente";
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newGame),
    });

    if (!res.ok) {
      alert(`Erro ao cadastrar jogo: ${await safeText(res)}`);
      return;
    }

    gameForm.reset();
    await fetchGames();
    await refreshPriceFormOptions();
    await preencherComboJogos();
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

    div.innerHTML = `
      <h3 style="font-weight:bold; margin:0 0 2px 0">${site.name}</h3>
      <p style="margin:0; font-size:0.9em; color:#555">${site.url}</p>
      <p style="margin:4px 0 8px 0; font-size:0.9em;">Status: ${
        site.active
          ? "<span style='color:#059669;font-weight:bold'>Ativo</span>"
          : "<span style='color:#dc2626;font-weight:bold'>Inativo</span>"
      }</p>
      <div style="display:flex; gap:8px;">
        <button data-site-id="${site.id}" class="edit-site-btn" style="background:#f59e0b;color:#fff;border:none;padding:5px 12px;border-radius:4px;cursor:pointer;">Editar</button>
        <button data-site-id="${site.id}" class="delete-site-btn" style="background:#ef4444;color:#fff;border:none;padding:5px 12px;border-radius:4px;cursor:pointer;">Remover</button>
      </div>
      <hr style="margin:12px 0; border:none; border-top:1px solid #eee;">
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
      headers: { "Content-Type": "application/json" },
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
      const usd = Number(p.price).toFixed(2);
      const brl = (Number(p.price) * USD_TO_BRL).toFixed(2);
      const value = `USD ${usd} (R$ ${brl})`;

      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px solid #f0f0f0;">
          <div>
            <span style="font-weight:bold">${siteName}</span>
            <span style="color:#555"> — ${value}</span>
          </div>
          <div style="display:flex; gap:6px;">
            <button style="font-size:0.8em;background:#f59e0b;color:#fff;border:none;padding:3px 8px;border-radius:3px;cursor:pointer;"
              onclick="editPrice(${p.id}, ${p.game_id}, ${p.site_id}, ${p.price}, '${p.currency || "USD"}')">
              Editar
            </button>
            <button style="font-size:0.8em;background:#ef4444;color:#fff;border:none;padding:3px 8px;border-radius:3px;cursor:pointer;"
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
      headers: { "Content-Type": "application/json" },
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
    if (selectGame && String(payload.game_id) === selectGame.value) {
      buscarComparacao(payload.game_id);
    }
  });
}

// ==========================
// COMPARAÇÃO AUTOMÁTICA (AC2)
// ==========================
async function buscarComparacao(gameId) {
  try {
    const response = await fetch(`${API_URL}/prices/game/${gameId}/comparison`);

    if (!response.ok) throw new Error("Sem dados");

    const dados = await response.json();
    const infoDiv = document.getElementById("priceResult");

    const menorBRL = (dados.menor_preco * USD_TO_BRL).toFixed(2);
    const maiorBRL = (dados.maior_preco * USD_TO_BRL).toFixed(2);
    const diferencaBRL = (dados.diferenca * USD_TO_BRL).toFixed(2);
    const economiaBRL = (dados.economia * USD_TO_BRL).toFixed(2);

    document.getElementById("menor-preco").innerHTML =
      `USD ${dados.menor_preco.toFixed(2)} (R$ ${menorBRL}) - ${dados.site_melhor_preco}`;

    document.getElementById("maior-preco").textContent =
      `USD ${dados.maior_preco.toFixed(2)} (R$ ${maiorBRL})`;

    document.getElementById("diferenca").textContent =
      `USD ${dados.diferenca.toFixed(2)} (R$ ${diferencaBRL})`;

    document.getElementById("economia").textContent =
      `USD ${dados.economia.toFixed(2)} (R$ ${economiaBRL})`;

    if (infoDiv) {
      infoDiv.innerHTML =
        `<strong>💡 Dica:</strong> ` +
        `você pode economizar <strong>USD ${dados.economia.toFixed(2)} / R$ ${economiaBRL}</strong> ` +
        `comprando em <strong>${dados.site_melhor_preco}</strong>.`;
    }

    document.getElementById("comparacao-precos").style.display = "block";

  } catch {
    document.getElementById("comparacao-precos").innerHTML =
      "<em>Nenhuma comparação disponível para este jogo.</em>";
    if (priceResult) {
      priceResult.textContent =
        "Clique em 'Buscar Preços Automaticamente' ou cadastre preços em pelo menos dois sites.";
    }
  }
}

// ==========================
// EDITAR / REMOVER JOGO
// ==========================
async function deleteGame(gameId) {
  const ok = confirm("Tem certeza que deseja remover este jogo?");
  if (!ok) return;

  const res = await fetch(`${API_URL}/games/${gameId}`, { method: "DELETE" });
  if (!res.ok) {
    alert(`Erro ao remover jogo: ${await safeText(res)}`);
    return;
  }

  await fetchGames();
  await refreshPriceFormOptions();
  await preencherComboJogos();
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, genre, description }),
  });

  if (!res.ok) {
    alert(`Erro ao atualizar jogo: ${await safeText(res)}`);
    return;
  }

  await fetchGames();
  await refreshPriceFormOptions();
  await preencherComboJogos();
}

// ==========================
// EDITAR / REMOVER SITE
// ==========================
async function deleteSite(siteId) {
  const ok = confirm("Tem certeza que deseja remover este site?");
  if (!ok) return;

  const res = await fetch(`${API_URL}/sites/${siteId}`, { method: "DELETE" });
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
    headers: { "Content-Type": "application/json" },
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
// EDITAR / REMOVER PREÇO
// ==========================
async function deletePrice(priceId, gameId) {
  const ok = confirm("Tem certeza que deseja remover este preço?");
  if (!ok) return;

  const res = await fetch(`${API_URL}/prices/${priceId}`, { method: "DELETE" });
  if (!res.ok) {
    alert("Erro ao remover preço.");
    return;
  }

  await loadPrices(gameId);
  if (selectGame && String(gameId) === selectGame.value) {
    buscarComparacao(gameId);
  }
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ price: newPrice }),
  });

  if (!res.ok) {
    alert("Erro ao atualizar preço.");
    return;
  }

  await loadPrices(gameId);
  if (selectGame && String(gameId) === selectGame.value) {
    buscarComparacao(gameId);
  }
}

window.deletePrice = deletePrice;
window.editPrice = editPrice;

// ==========================
// WISHLIST
// ==========================
async function refreshWishlistGameOptions() {
  if (!wishlistGameId) return;

  const res = await fetch(`${API_URL}/games/`);
  if (!res.ok) return;

  const games = await res.json();
  wishlistGameId.innerHTML = "";

  games.forEach((game) => {
    const opt = document.createElement("option");
    opt.value = game.id;
    opt.textContent = `[${game.id}] ${game.title}`;
    wishlistGameId.appendChild(opt);
  });
}

async function fetchWishlistAlerts() {
  if (!wishlistList) return;

  wishlistList.innerHTML = "Carregando wishlist...";

  try {
    const res = await fetch(`${API_URL}/wishlist/alerts`);
    if (!res.ok) throw new Error("Erro ao buscar wishlist");

    const items = await res.json();

    if (!items.length) {
      wishlistList.innerHTML = "<em style='color:#cbd5e1;'>Nenhum jogo adicionado à wishlist ainda.</em>";
      return;
    }

    wishlistList.innerHTML = items.map((item) => {
      const bestPriceBRL = item.current_best_price !== null
        ? (item.current_best_price * USD_TO_BRL).toFixed(2)
        : null;

      const targetBRL = Number(item.target_price).toFixed(2);

      const statusHtml = item.opportunity
        ? `<span style="color:#34d399;font-weight:bold;">✅ Oportunidade encontrada</span>`
        : `<span style="color:#fbbf24;font-weight:bold;">⏳ Ainda acima do preço-alvo</span>`;

      const currentPriceHtml = bestPriceBRL
        ? `R$ ${bestPriceBRL}`
        : "Sem preço disponível";

      const siteHtml = item.best_site ? item.best_site : "—";

      return `
        <div style="border:1px solid rgba(148,163,184,0.18); border-radius:12px; padding:12px; margin-bottom:10px; background:rgba(255,255,255,0.04); color:#f8fbff; box-shadow:0 8px 18px rgba(0,0,0,0.18);">
          <div style="font-weight:bold; font-size:1rem; margin-bottom:6px; color:#ffffff;">${item.game_title}</div>
          <div style="font-size:0.92rem; color:#dbeafe;">Preço-alvo: <strong style="color:#ffffff;">R$ ${targetBRL}</strong></div>
          <div style="font-size:0.92rem; color:#dbeafe;">Melhor preço atual: <strong style="color:#ffffff;">${currentPriceHtml}</strong></div>
          <div style="font-size:0.92rem; color:#dbeafe;">Loja: <strong style="color:#ffffff;">${siteHtml}</strong></div>
          <div style="margin-top:6px;">${statusHtml}</div>
          <div style="font-size:0.88rem; color:#cbd5e1; margin-top:4px;">${item.message}</div>
          <button
            style="margin-top:10px; background:linear-gradient(135deg,#ef4444,#dc2626); color:#fff; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:bold;"
            onclick="deleteWishlistItem(${item.wishlist_id})"
          >
            Remover da Wishlist
          </button>
        </div>
      `;
    }).join("");
  } catch {
    wishlistList.innerHTML = "<em style='color:#fca5a5;'>Erro ao carregar wishlist.</em>";
  }
}

async function createWishlistItem(payload) {
  const res = await fetch(`${API_URL}/wishlist/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await safeText(res));
  }

  return await res.json();
}

async function deleteWishlistItem(wishlistId) {
  const ok = confirm("Tem certeza que deseja remover este item da wishlist?");
  if (!ok) return;

  const res = await fetch(`${API_URL}/wishlist/${wishlistId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    alert("Erro ao remover item da wishlist.");
    return;
  }

  await fetchWishlistAlerts();
}

window.deleteWishlistItem = deleteWishlistItem;

if (wishlistForm) {
  wishlistForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      game_id: Number(wishlistGameId.value),
      target_price: Number(wishlistTargetPrice.value),
    };

    if (wishlistMessage) {
      wishlistMessage.style.color = "#111827";
      wishlistMessage.textContent = "Adicionando à wishlist...";
    }

    try {
      await createWishlistItem(payload);

      if (wishlistMessage) {
        wishlistMessage.style.color = "#059669";
        wishlistMessage.textContent = "Jogo adicionado à wishlist com sucesso!";
      }

      wishlistForm.reset();
      await refreshWishlistGameOptions();
      await fetchWishlistAlerts();
    } catch (err) {
      if (wishlistMessage) {
        wishlistMessage.style.color = "#dc2626";
        wishlistMessage.textContent = `Erro ao adicionar à wishlist: ${err.message}`;
      }
    }
  });
}

if (refreshWishlistBtn) {
  refreshWishlistBtn.addEventListener("click", fetchWishlistAlerts);
}

// ==========================
// HISTÓRICO / GRÁFICO / INSIGHT
// ==========================
function renderHistoryList(items) {
  if (!historyList) return;

  if (!items.length) {
    historyList.innerHTML = "<em style='color:#cbd5e1;'>Nenhum histórico encontrado.</em>";
    return;
  }

  historyList.innerHTML = items.map((item) => {
    const priceBRL = (Number(item.price) * USD_TO_BRL).toFixed(2);
    const checkedAt = new Date(item.checked_at).toLocaleString("pt-BR");

    return `
      <div style="border-bottom:1px solid rgba(148,163,184,0.14); padding:10px 0;">
        <div style="font-weight:bold; color:#ffffff;">${item.site_name}</div>
        <div style="font-size:0.92rem; color:#e5eefc;">
          USD ${Number(item.price).toFixed(2)} (R$ ${priceBRL})
        </div>
        <div style="font-size:0.88rem; color:#aebed8;">
          Fonte: ${item.source} • Data: ${checkedAt}
        </div>
      </div>
    `;
  }).join("");
}

function renderHistoryChart(items) {
  const canvas = document.getElementById("historyChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  if (historyChartInstance) {
    historyChartInstance.destroy();
  }

  const labels = items.map((item) => {
    const dt = new Date(item.checked_at);
    return dt.toLocaleString("pt-BR");
  });

  const valuesBRL = items.map((item) => Number(item.price) * USD_TO_BRL);

  historyChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Preço em R$",
          data: valuesBRL,
          borderColor: "#60a5fa",
          backgroundColor: "rgba(96, 165, 250, 0.20)",
          tension: 0.30,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "#22d3ee",
          pointBorderColor: "#0f172a",
          pointBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: {
            color: "#e5eefc",
            font: {
              size: 12,
              weight: "bold",
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#cbd5e1",
            maxRotation: 35,
            minRotation: 20,
          },
          grid: {
            color: "rgba(148,163,184,0.12)",
          },
        },
        y: {
          beginAtZero: false,
          ticks: {
            color: "#cbd5e1",
            callback: function(value) {
              return "R$ " + Number(value).toFixed(2);
            }
          },
          grid: {
            color: "rgba(148,163,184,0.12)",
          },
        }
      }
    }
  });
}

async function refreshHistoryGameOptions() {
  if (!historyGameId) return;

  const res = await fetch(`${API_URL}/games/`);
  if (!res.ok) return;

  const games = await res.json();
  historyGameId.innerHTML = "";

  games.forEach((game) => {
    const opt = document.createElement("option");
    opt.value = game.id;
    opt.textContent = `[${game.id}] ${game.title}`;
    historyGameId.appendChild(opt);
  });
}

async function fetchPriceHistory(gameId) {
  const res = await fetch(`${API_URL}/prices/game/${gameId}/history`);
  if (!res.ok) {
    throw new Error("Não foi possível carregar o histórico.");
  }
  return await res.json();
}

async function fetchPriceInsight(gameId) {
  const res = await fetch(`${API_URL}/prices/game/${gameId}/insight`);
  if (!res.ok) {
    throw new Error("Não foi possível carregar o insight.");
  }
  return await res.json();
}

function renderHistoryInsight(insight) {
  if (!historyInsight) return;

  const historicalLowBRL = (Number(insight.historical_low) * USD_TO_BRL).toFixed(2);
  const currentBestBRL = (Number(insight.current_best) * USD_TO_BRL).toFixed(2);

  const status = insight.is_good_time_to_buy
    ? `<span style="color:#34d399; font-weight:bold;">✅ Ótimo momento para comprar</span>`
    : `<span style="color:#fbbf24; font-weight:bold;">⚠️ Ainda não é o melhor momento</span>`;

  historyInsight.innerHTML = `
    <div style="padding:12px; border:1px solid rgba(96,165,250,0.30); background:rgba(59,130,246,0.10); border-radius:12px; color:#eaf2ff;">
      <div style="margin-bottom:6px;">${status}</div>
      <div style="font-size:0.93rem; color:#dbeafe;">
        <strong style="color:#ffffff;">Menor preço histórico:</strong> USD ${Number(insight.historical_low).toFixed(2)} (R$ ${historicalLowBRL}) - ${insight.historical_low_site}
      </div>
      <div style="font-size:0.93rem; color:#dbeafe;">
        <strong style="color:#ffffff;">Melhor preço atual:</strong> USD ${Number(insight.current_best).toFixed(2)} (R$ ${currentBestBRL}) - ${insight.current_best_site}
      </div>
      <div style="font-size:0.9rem; color:#cbd5e1; margin-top:6px;">
        ${insight.message}
      </div>
    </div>
  `;
}

async function loadHistoryAndInsight(gameId) {
  try {
    if (historyList) historyList.innerHTML = "<span style='color:#cbd5e1;'>Carregando histórico...</span>";
    if (historyInsight) historyInsight.innerHTML = "<span style='color:#cbd5e1;'>Carregando insight...</span>";

    const [historyItems, insight] = await Promise.all([
      fetchPriceHistory(gameId),
      fetchPriceInsight(gameId),
    ]);

    renderHistoryList(historyItems);
    renderHistoryChart(historyItems);
    renderHistoryInsight(insight);
  } catch (err) {
    if (historyList) {
      historyList.innerHTML = `<em style="color:#fca5a5;">${err.message}</em>`;
    }
    if (historyInsight) {
      historyInsight.innerHTML = "";
    }
    console.error("Erro ao carregar histórico:", err);
  }
}

if (historyForm) {
  historyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const gameId = Number(historyGameId.value);
    if (!gameId) return;

    await loadHistoryAndInsight(gameId);
  });
}

// ==========================
// INICIALIZAÇÃO
// ==========================
(async function init() {
  await checkBackend();
  await loadExchangeRate();
  await fetchGames();
  await fetchSites();
  await refreshPriceFormOptions();
  await preencherComboJogos();
  await refreshWishlistGameOptions();
  await fetchWishlistAlerts();
  await refreshHistoryGameOptions();

  if (historyGameId && historyGameId.value) {
    await loadHistoryAndInsight(Number(historyGameId.value));
  }
})();
