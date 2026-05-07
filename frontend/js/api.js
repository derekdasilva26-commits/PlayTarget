const API_URL = "http://127.0.0.1:8001";
const USD_TO_BRL = 5.70;

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

      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px solid #f0f0f0;">
          <div>
            <span style="font-weight:bold">${siteName}</span>
            <span style="color:#555"> — USD ${usd}</span>
            <span style="color:#888; font-size:0.85em"> (R$ ${brl})</span>
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
      currency: (priceCurrency?.value || "USD").trim(),
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
    if (priceCurrency) priceCurrency.value = "USD";

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
    const comparacaoDiv = document.getElementById("comparacao-precos");

    const menorBRL = (dados.menor_preco * USD_TO_BRL).toFixed(2);
    const maiorBRL = (dados.maior_preco * USD_TO_BRL).toFixed(2);
    const economiaBRL = (dados.economia * USD_TO_BRL).toFixed(2);

    // Tabela com todos os preços ordenados do menor para o maior
    const tabelaPrecos = dados.todos_os_precos
      .sort((a, b) => a.preco - b.preco)
      .map((p, i) => {
        const brl = (p.preco * USD_TO_BRL).toFixed(2);
        const destaque = i === 0 ? "color:#059669;font-weight:bold" : "color:#374151";
        return `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #e5e7eb;">
          <span style="${destaque}">${i === 0 ? "🏆 " : ""}${p.site}</span>
          <span style="${destaque}">USD ${p.preco.toFixed(2)} <span style="color:#6b7280;font-size:0.85em;font-weight:normal">(R$ ${brl})</span></span>
        </div>`;
      })
      .join("");

    comparacaoDiv.innerHTML = `
      <div style="margin-bottom:10px;">
        <strong>🏆 Menor preço:</strong>
        <span style="color:#059669;font-weight:bold"> USD ${dados.menor_preco.toFixed(2)} = R$ ${menorBRL} — ${dados.site_melhor_preco}</span><br>
        ${dados.todos_os_precos.length > 1 ? `
        <strong>Maior preço:</strong> USD ${dados.maior_preco.toFixed(2)} = R$ ${maiorBRL}<br>
        <strong>💰 Economia:</strong> <span style="color:#dc2626;font-weight:bold">R$ ${economiaBRL}</span>
        ` : ""}
      </div>
      <div style="font-size:0.9em;font-weight:bold;margin-bottom:4px;">Preços por loja:</div>
      ${tabelaPrecos}
    `;

    if (infoDiv) {
      if (dados.todos_os_precos.length > 1) {
        infoDiv.innerHTML = `<strong>💡 Dica:</strong> economize <strong>R$ ${economiaBRL}</strong> comprando em <strong>${dados.site_melhor_preco}</strong>!`;
      } else {
        infoDiv.innerHTML = `<em>Apenas 1 loja encontrada. Clique em buscar novamente para mais resultados!</em>`;
      }
    }

  } catch {
    const comparacaoDiv = document.getElementById("comparacao-precos");
    if (comparacaoDiv) comparacaoDiv.innerHTML = "<em>Nenhum preço encontrado. Clique em 'Buscar Preços Automaticamente'!</em>";
    if (priceResult) priceResult.textContent = "";
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
// INICIALIZAÇÃO
// ==========================
(async function init() {
  await checkBackend();
  await fetchGames();
  await fetchSites();
  await refreshPriceFormOptions();
  await preencherComboJogos();
})();