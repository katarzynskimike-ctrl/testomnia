// Feature flags endpoint — zwraca runtime config dla frontendu
// Frontend wywołuje to przy ładowaniu strony i ustawia window.__FEATURES__

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  res.status(200).json({
    calibration: process.env.ENABLE_CALIBRATION === 'true',
    wielki_test: process.env.ENABLE_WIELKI_TEST !== 'false', // default ON
    email_sequence: process.env.ENABLE_EMAIL_SEQUENCE === 'true',
    meta_pixel_id: process.env.META_PIXEL_ID || null,
  });
}
