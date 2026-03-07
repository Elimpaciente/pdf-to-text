addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}

const PDF_API = 'https://pdf-to-text-three.vercel.app/pdf'

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
  const formData = new FormData()
  formData.append('pdf', pdfFile)

  const response = await fetch(PDF_API, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(60000)
  })

  if (!response.ok) throw new Error('Failed to extract text from PDF')

  const data = await response.json()
  if (!data.text) throw new Error('No text extracted from PDF')

  return data.text
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS }
  })
}
