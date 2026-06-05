// Integracja z Fakturownia API
// Wymaga env vars: FAKTUROWNIA_API_TOKEN, FAKTUROWNIA_DOMAIN (np. mojafirma.fakturownia.pl)
const SELLER_DEFAULT = {
  name: 'Excellent Patient Service Sp. z o.o.',
  tax_no: '5170359961',
  post_code: '36-040',
  city: 'Boguchwała',
  street: 'ul. Teodora Lubomirskiego 39/E',
  country: 'PL',
  email: 'kontakt@testomnia.pl'
};

export async function createInvoice({ buyerName, buyerEmail, buyerTaxNo, buyerCompanyName, buyerStreet, buyerCity, buyerPostCode, amountCents, productName, paymentMethod }) {
  const token = process.env.FAKTUROWNIA_API_TOKEN;
  const domain = process.env.FAKTUROWNIA_DOMAIN;
  if (!token || !domain) {
    throw new Error('FAKTUROWNIA_API_TOKEN i FAKTUROWNIA_DOMAIN nie są ustawione w env vars');
  }
  const isCompany = !!buyerTaxNo;
  const priceNet = (amountCents / 100 / 1.23).toFixed(2); // VAT 23%
  const invoice = {
    api_token: token,
    invoice: {
      kind: 'vat',
      number: null, // auto
      sell_date: new Date().toISOString().slice(0,10),
      issue_date: new Date().toISOString().slice(0,10),
      payment_to: new Date(Date.now()+14*86400e3).toISOString().slice(0,10),
      seller_name: SELLER_DEFAULT.name,
      seller_tax_no: SELLER_DEFAULT.tax_no,
      seller_street: SELLER_DEFAULT.street,
      seller_post_code: SELLER_DEFAULT.post_code,
      seller_city: SELLER_DEFAULT.city,
      seller_country: SELLER_DEFAULT.country,
      buyer_name: isCompany ? (buyerCompanyName || buyerName) : buyerName,
      buyer_tax_no: buyerTaxNo || '',
      buyer_email: buyerEmail,
      buyer_street: buyerStreet || '',
      buyer_post_code: buyerPostCode || '',
      buyer_city: buyerCity || '',
      buyer_country: 'PL',
      currency: 'PLN',
      payment_type: paymentMethod || 'transfer',
      status: 'paid',
      paid_date: new Date().toISOString().slice(0,10),
      lang: 'pl',
      positions: [{
        name: productName || 'Testomnia · Pełny raport rozwojowy (PDF)',
        tax: 23,
        total_price_gross: (amountCents / 100).toFixed(2),
        quantity: 1
      }]
    }
  };
  const r = await fetch(`https://${domain}/invoices.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(invoice)
  });
  const j = await r.json();
  if (!r.ok) throw new Error('Fakturownia error: ' + JSON.stringify(j));
  return {
    fakturowniaId: j.id,
    number: j.number,
    pdfUrl: `https://${domain}/invoices/${j.id}.pdf?api_token=${token}`,
    viewUrl: j.view_url || `https://${domain}/invoices/${j.id}`
  };
}
