import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import vm from 'node:vm'
import * as crypto from 'node:crypto'

const root = resolve(new URL('../', import.meta.url).pathname)
export function memoryBlob() {
  const data = new Map()
  let version = 0
  return { data,
    async get(path) {
      const item = data.get(path)
      return item ? { statusCode: 200, blob: { etag: item.etag }, stream: new Response(item.text).body } : null
    },
    async put(path, text, opts) {
      const item = data.get(path)
      if (opts.ifMatch && opts.ifMatch !== item?.etag) throw Error('precondition failed')
      if (opts.allowOverwrite === false && item) throw Error('already exists')
      const etag = String(++version)
      data.set(path, { text, etag })
      return { pathname: path, etag }
    },
    async list({ prefix, limit = 1000 }) {
      const paths = [...data.keys()].filter((p) => p.startsWith(prefix))
      return { blobs: paths.slice(0, limit).map((pathname) => ({ pathname })), hasMore: paths.length > limit }
    },
  }
}
export function runtime({ blob = memoryBlob(), env = {}, mocks = {}, client = {}, fetch: fetchImpl } = {}) {
  const context = vm.createContext({ process: { env: { STRIPE_SECRET_KEY: 'sk_test_contract_only', ...env } },
    console, Request, Response, URL, URLSearchParams, Headers, Buffer, Date, setTimeout,
    fetch: fetchImpl || (() => { throw Error('External HTTP is forbidden in contract tests') }) })
  const modules = new Map()
  function getModule(path) {
    if (modules.has(path)) return modules.get(path)
    let values = mocks[path]
    if (path === '@vercel/blob') values = blob
    if (path === 'node:crypto') values = crypto
    if (path === 'lib/stripe.js') values = { stripe: () => client }
    const mod = values ? new vm.SyntheticModule(Object.keys(values), function() {
      for (const [k,v] of Object.entries(values)) this.setExport(k,v)
    }, { context, identifier: path }) : new vm.SourceTextModule(readFileSync(resolve(root, path), 'utf8'), { context, identifier: path })
    modules.set(path, mod)
    return mod
  }
  async function load(path) {
    const mod = getModule(path)
    if (mod.status === 'unlinked') await mod.link((specifier, parent) => {
      let key = specifier
      if (specifier.startsWith('.')) {
        key = resolve(root, dirname(parent.identifier), specifier).slice(root.length + 1)
        if (!key.endsWith('.js')) key += '.js'
      }
      return getModule(key)
    })
    if (mod.status !== 'evaluated') await mod.evaluate()
    return mod.namespace
  }
  return { load, blob }
}
export function catalog() {
  return [['start',500,'10'], ['grow',1900,'50'], ['scale',4900,'unlimited']].map(([key,amount,links]) => ({
    id: `price_${key}`, active: true, lookup_key: `ctb_${key}_monthly_v1`, currency: 'eur', unit_amount: amount,
    recurring: { interval: 'month', interval_count: 1 }, tax_behavior: 'inclusive', metadata: { app: 'curl_to_buy', plan: key },
    product: { id: `prod_${key}`, active: true, metadata: { app: 'curl_to_buy', plan: key, monthly_links: links } },
  }))
}
