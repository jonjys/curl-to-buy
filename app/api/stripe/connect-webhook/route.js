import { handleWebhook } from '../webhook/route'
export const runtime = 'nodejs'
export async function POST(req) { return handleWebhook(req, true) }
