const API_URL = "http://127.0.0.1:8000";

const gamesList = document.getElementById("gamesList");
const gameForm = document.getElementById("gameForm");

// ==========================
// LISTAR JOGOS
// ==========================
async function fetchGames() {
  const response = await fetch(`${API_URL}/games/`);
  const games = await response.json();

  gamesList.innerHTML = "";

  games.forEach(game => {
    const div = document.createElement("div");
    div.className = "border p-4 rounded bg-gray-50";

    div.innerHTML = `
      <h3 class="font-bold text-lg">${game.title}</h3>
      <p class="text-sm text-gray-600">${game.genre}</p>
      <p class="mt-2">${game.description || ""}</p>
      <button onclick="loadPrices(${game.id})"
        class="mt-3 bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600">
        Ver Preços
      </button>
      <div id="prices-${game.id}" class="mt-3 text-sm text-gray-700"></div>
    `;

    gamesList.appendChild(div);
  });
}

// ==========================
// CADASTRAR JOGO
// ==========================
gameForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const newGame = {
    title: document.getElementById("title").value,
    genre: document.getElementById("genre").value,
    description: document.getElementById("description").value
  };

  await fetch(`${API_URL}/games/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(newGame)
  });

  gameForm.reset();
  fetchGames();
});

// ==========================
// LISTAR PREÇOS POR JOGO
// ==========================
async function loadPrices(gameId) {
  const response = await fetch(`${API_URL}/prices/game/${gameId}`);
  const prices = await response.json();

  const pricesDiv = document.getElementById(`prices-${gameId}`);

  if (prices.length === 0) {
    pricesDiv.innerHTML = "Nenhum preço cadastrado.";
    return;
  }

  pricesDiv.innerHTML = prices
    .map(p => `💰 R$ ${p.price}`)
    .join("<br>");
}

// ==========================
// INICIALIZAÇÃO
// ==========================
fetchGames();