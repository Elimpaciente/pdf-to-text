addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}

const BASE_URL = 'https://pdftotext.com'

async function handleRequest(request) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (request.method !== 'POST') return jsonResponse({ success: false, message: 'Only POST requests are allowed' }, 405)

  const url = new URL(request.url)
  if (!url.pathname.startsWith('/pdf')) return jsonResponse({ success: false, message: 'Endpoint not found. Use /pdf' }, 404)

  try {
    const formData = await request.formData()
    const pdfFile = formData.get('pdf')
    if (!pdfFile) return jsonResponse({ success: false, message: 'PDF file required' }, 400)

    const text = await extractTextFromPDF(pdfFile)
    return jsonResponse({ success: true, text })
  } catch (error) {
    return jsonResponse({ success: false, message: error.message || 'Error processing PDF' }, 400)
  }
}

async function extractTextFromPDF(pdfFile) {
  const sid = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  const filename = pdfFile.name || 'document.pdf'
  const name = filename.replace(/\.pdf$/i, '')

  // 1. Subir
  const uploadForm = new FormData()
  uploadForm.append('file', pdfFile)
  const uploadRes = await fetch(`${BASE_URL}/api/upload?sid=${sid}`, { method: 'POST', body: uploadForm })
  if (!uploadRes.ok) throw new Error('Failed to upload PDF')
  const { fid } = await uploadRes.json()

  // 2. Convertir
  await fetch(`${BASE_URL}/api/convert/${sid}/${fid}`, { method: 'POST' })

  // 3. Esperar
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 1000))
    const status = await fetch(`${BASE_URL}/api/status/${sid}/${fid}`).then(r => r.json())
    if (status.status === 'success') break
    if (status.status === 'error') throw new Error(status.error || 'Conversion error')
    if (i === 59) throw new Error('Timeout waiting for conversion')
  }

  // 4. Descargar
  const textRes = await fetch(`${BASE_URL}/api/download/${sid}/${fid}/${name}.txt`)
  if (!textRes.ok) throw new Error('Failed to download result')
  return textRes.text()
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS }
  })
}
