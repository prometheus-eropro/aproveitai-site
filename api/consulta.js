function gerarCodigoAutorizacao() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigo = 'ERO';
  for (let i = 0; i < 5; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return codigo;
}

function mascararCpf(cpf) {
  if (!cpf) return "NAO_INFORMADO";
  cpf = cpf.replace(/\D/g, "");
  if (cpf.length !== 11) return cpf;
  return cpf.substring(0, 3) + ".***." + cpf.substring(6, 9) + "-" + cpf.substring(9);
}

async function salvarLog(apiKey, baseId, tabelaLogs, fields) {
  try {
    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tabelaLogs}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    });
    const result = await response.json();
    console.log("Log salvo:", result);
  } catch (err) {
    console.error("Erro ao salvar log:", err);
  }
}

async function buscarNomeParceiro(apiKey, baseId, tabelaParceiros, cnpj) {
  if (!cnpj) return null;
  const url = `https://api.airtable.com/v0/${baseId}/${tabelaParceiros}?filterByFormula={cnpj}='${cnpj}'`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  const dados = await resp.json();
  if (dados.records?.length > 0) {
    return dados.records[0].fields.nome || null;
  }
  return null;
}

export default async function handler(req, res) {
  try {
    let { tipo, cpf, cnpj, token, nomeParceiro } =
      req.method === "POST" ? req.body : req.query;

    cpf = cpf?.trim();
    cnpj = cnpj?.trim();
    token = token?.trim();
    tipo = tipo?.trim();
    nomeParceiro = nomeParceiro?.trim();

    const baseId = process.env.AIRTABLE_BASE_ID;
    const apiKey = process.env.AIRTABLE_API_KEY;
    const tabelaClientes = process.env.AIRTABLE_CLIENTES || "clientes";
    const tabelaLogs = process.env.AIRTABLE_LOGS || "log";
    const tabelaParceiros = process.env.AIRTABLE_PARCEIROS || "parceiros";

    if (!baseId || !apiKey) {
      return res.status(500).json({ erro: "Configuração inválida do servidor" });
    }

    if (tipo === "clientesValidar") {
      if (!cpf) {
        return res.status(400).json({ erro: "CPF não informado." });
      }

      const nomeParceiroReal = await buscarNomeParceiro(apiKey, baseId, tabelaParceiros, cnpj) || nomeParceiro || "NAO_INFORMADO";

      const url = `https://api.airtable.com/v0/${baseId}/${tabelaClientes}?filterByFormula=OR({cpf}='${cpf}', {idPublico}='${cpf}')`;
      const resposta = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
      const dados = await resposta.json();

      const codigo = gerarCodigoAutorizacao();

      if (dados.records?.length > 0) {
        const cliente = dados.records[0].fields;
        const ativo = cliente.ativo === 1 || cliente.ativo === true;

        await salvarLog(apiKey, baseId, tabelaLogs, {
          dataHora: new Date().toISOString(),
          CodigoAutorizacao: codigo,
          IdPublico: cliente.idPublico || cpf,
          NomeCliente: cliente.nome || "Desconhecido",
          CPF: cliente.cpf || cpf,
          Grupo: cliente.grupo || "NAO_INFORMADO",
          ClienteDesde: cliente.dataCadastro || "Desconhecido",
          Status: ativo ? "Ativo" : "Inativo",
          CNPJ_Parceiro: cnpj || "NAO_INFORMADO",
          NomeParceiro: nomeParceiroReal,
          origemConsulta: "paineldoparceiro"
        });

        if (!ativo) {
          return res.status(200).json({
            valido: false,
            dados: {
              nome: cliente.nome,
              idPublico: cliente.idPublico || cpf,
              cpf: mascararCpf(cliente.cpf),
              ativo: false,
              codigo: null,
            },
            mensagem: "Cliente inativo.",
          });
        }

        return res.status(200).json({
          valido: true,
          dados: {
            nome: cliente.nome,
            idPublico: cliente.idPublico || cpf,
            cpf: mascararCpf(cliente.cpf),
            grupo: cliente.grupo || "NAO_INFORMADO",
            clienteDesde: cliente.dataCadastro || "Desconhecido",
            ativo,
            codigo,
          },
        });
      } else {
        await salvarLog(apiKey, baseId, tabelaLogs, {
          dataHora: new Date().toISOString(),
          CodigoAutorizacao: codigo,
          IdPublico: cpf,
          NomeCliente: "Desconhecido",
          CPF: cpf,
          Grupo: "NAO_INFORMADO",
          ClienteDesde: "Desconhecido",
          Status: "Inativo",
          CNPJ_Parceiro: cnpj || "NAO_INFORMADO",
          NomeParceiro: nomeParceiroReal,
          origemConsulta: "paineldoparceiro"
        });

        return res.status(404).json({ valido: false, erro: "Cliente não encontrado." });
      }
    }

    if (tipo === "parceirosLogin") {
      if (!cnpj || !token) {
        return res.status(400).json({ erro: "CNPJ e token são obrigatórios" });
      }

      const url = `https://api.airtable.com/v0/${baseId}/${tabelaParceiros}?filterByFormula=AND({cnpj}='${cnpj}', {token}='${token}')`;
      const resposta = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
      const dados = await resposta.json();

      if (dados.records?.length > 0) {
  const parceiro = dados.records[0].fields;

  const ativo = parceiro.ativo === true || parceiro.ativo === 'sim' || parceiro.ativo === '✔️' || parceiro.ativo === '1';
 if (!ativo) {
  return res.status(403).json({
    valido: false,
    erro: "Parceiro inativo. Por favor, entre em contato com o suporte: (28) 99969-2303."
  });
}


  return res.status(200).json({
    valido: true,
    parceiro: {
      cnpj: parceiro.cnpj,
      nome: parceiro.nome || "NAO_INFORMADO",
      ...parceiro
    }
  });
}
 else {
        return res.status(401).json({ valido: false, erro: "Parceiro não encontrado ou token inválido." });
      }
    }

    if (tipo === "logs") {
      const cincoDiasAtras = new Date();
      cincoDiasAtras.setDate(cincoDiasAtras.getDate() - 5);

      const { cnpj } = req.method === "POST" ? req.body : req.query;
      if (!cnpj) return res.status(400).json({ erro: "CNPJ do parceiro é obrigatório para consultar logs." });

      const filtro = `AND(
        IS_AFTER({dataHora}, '${cincoDiasAtras.toISOString()}'),
        {CNPJ_Parceiro}='${cnpj}'
      )`;

      const url = `https://api.airtable.com/v0/${baseId}/${tabelaLogs}?filterByFormula=${encodeURIComponent(filtro)}&sort[0][field]=dataHora&sort[0][direction]=desc&maxRecords=50`;

      const resposta = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      const dados = await resposta.json();
      const consultas = (dados.records || []).map(r => {
        const f = r.fields;
        return {
          nomeCliente: f.NomeCliente || "Desconhecido",
          codigoAutorizacao: f.CodigoAutorizacao || "-",
          idPublico: f.IdPublico || "-",
          grupo: f.Grupo || "-",
          status: f.Status || "-",
          clienteDesde: f.ClienteDesde || "-",
          dataHora: f.dataHora || "-",
          nomeParceiro: f.NomeParceiro || "-",
          cnpjParceiro: f.CNPJ_Parceiro || "-"
        };
      });

      return res.status(200).json({ consultas });
    }
if (tipo === "listarParceiros") {
  const url = `https://api.airtable.com/v0/${baseId}/${tabelaParceiros}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });

  const dados = await resp.json();

  const parceiros = (dados.records || []).map(r => ({
    nome: r.fields.nome || "",
    cidade: r.fields.cidade || "",
    ramo: r.fields.ramo || "",
    whatsapp: r.fields.whatsapp || "",
    logoUrl: r.fields.logo?.[0]?.url || ""
  }));

  return res.status(200).json(parceiros);
}

    return res.status(400).json({ erro: "Tipo de operação não reconhecido." });
  } catch (err) {
    console.error("Erro interno na API:", err);
    return res.status(500).json({ erro: "Erro interno no servidor." });
  }
}
