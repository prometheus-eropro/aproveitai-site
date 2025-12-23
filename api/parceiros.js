import Airtable from "airtable";

export default async function handler(req, res) {
  try {
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY,
    }).base(process.env.AIRTABLE_BASE_ID);

    const registros = [];

    await base("parceiros")
      .select({ maxRecords: 100 })
      .eachPage((records, fetchNextPage) => {
        records.forEach((record) => {
          registros.push({
            id: record.id,
            ...record.fields,
          });
        });
        fetchNextPage();
      });

    res.status(200).json(registros);
  } catch (err) {
    console.error("ERRO AIRTABLE:", err);
    res.status(500).json({
      error: "Erro ao acessar Airtable (parceiros)",
      detalhe: err.message,
    });
  }
}
