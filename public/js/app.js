async function carregarParceiros() {
  const container = document.getElementById("parceirosGrid");
  container.innerHTML = "Carregando parceiros...";

  try {
    const r = await fetch("/api/gateway?action=listarParceiros");
    const { ok, data } = await r.json();

    if (!ok) throw new Error("Erro ao buscar parceiros");

    container.innerHTML = data.map(p => `
      <div class="card">
        <img src="${p.logo || 'logo-aproveitai.png'}" alt="${p.nome}" />
        <h3>${p.nome}</h3>
        <p>${p.cidade}</p>
        ${p.whatsapp ? `<a href="https://wa.me/${p.whatsapp}" target="_blank">WhatsApp</a>` : ""}
        ${p.instagram ? `<a href="https://instagram.com/${p.instagram.replace('@','')}" target="_blank">Instagram</a>` : ""}
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = "Erro ao carregar parceiros.";
    console.error(e);
  }
}

document.addEventListener("DOMContentLoaded", carregarParceiros);
