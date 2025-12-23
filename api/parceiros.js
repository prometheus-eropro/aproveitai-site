import Airtable from "airtable";

export default async function handler(req, res) {
  try {
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY,
    }).base(process.env.AIRTABLE_BASE_ID);

    const dados = [];

    await base("parceiros")
      .select({
        view: "Visualização em grade",
      })
      .eachPage((records, fetchNextPage) => {
        records.forEach((record) => {
          dados.push({
            id: record.id,
            ...record.fields,
          });
        });
        fetchNextPage();
      });

    res.status(200).json(dados);
  } catch (erro) {
    console.error("AIRTABLE ERRO:", erro);
    res.status(500).json({
      error: "Erro ao acessar Airtable (parceiros)",
      detalhe: erro.message,
    });
  }
}
