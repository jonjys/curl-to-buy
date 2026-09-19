import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { runtime, catalog } from './integration-helper.mjs'

async function fixture() {
  const now = Math.floor(Date.now()/1000)
  const state={ sessions:new Map(), creates:[], next:1, merchant:true,
    sub:{ id:'sub_seller1', status:'active', metadata:{seller_id:'seller1'}, items:{data:[{
      quantity:1, price:{id:'price_start'}, current_period_start:now-1000, current_period_end:now+200000,
    }]} } }
  const seller={ id:'seller1', email:'seller@example.test', stripeAccountId:'acct_old', paymentAccountId:'acct_merchant', billingIdentity:{customer_account:'acct_merchant'} }
  const client={ prices:{list:async()=>({data:catalog()})}, subscriptions:{list:async()=>({data:[state.sub]})}, checkout:{sessions:{
    create:async(args,opts={})=>{
      state.creates.push({args,opts})
      const id=`cs_test_${state.next++}`
      const session={id,url:`https://checkout.stripe.com/${id}`,mode:args.mode,status:'open',payment_status:'unpaid',
        metadata:args.metadata, currency:args.line_items[0].price_data.currency, amount_total:args.line_items[0].price_data.unit_amount,
        created:now, customer_details:{email:'buyer@example.test'},
        collected_information:{shipping_details:{name:'Buyer',address:{line1:'Example 1',city:'Stockholm',postal_code:'11122',country:'SE'}}},
        payment_intent:{latest_charge:{refunded:false,disputed:false}},account:opts.stripeAccount||null}
      state.sessions.set(id,session);return session
    },
    retrieve:async(id,params,opts={})=>{
      const session=state.sessions.get(id)
      if(!session || session.account!==(opts.stripeAccount||null)) throw Error('Wrong Stripe account scope')
      return session
    },
  }}, webhooks:{constructEvent:(raw,sig,secret)=>{
    if(sig!=='valid' || secret!=='whsec_connected')throw Error('Bad signature')
    return JSON.parse(raw)
  }} }
  const app=runtime({client,env:{STRIPE_CTB_CONNECT_WEBHOOK_SECRET:'whsec_connected'},mocks:{
    'lib/stripe-connect.js':{
      loadReadySeller:async()=>state.merchant?seller:null,
      readySubscriptionMerchant:async()=>state.merchant?{id:seller.paymentAccountId}:null,
      retrieveConnectedRecipient:async()=>({}),recipientStatus:()=>({transfers:true}),
    },
  }})
  const store=await app.load('lib/store.js');await store.saveSeller(seller)
  const auth=await app.load('lib/seller.js')
  const cookie=auth.sellerCookie(seller.id).split(';')[0]
  const request=(path,body,owner=true)=>new Request(`https://app.test${path}`,{method:body?'POST':'GET',headers:{cookie:owner?cookie:auth.sellerCookie('other').split(';')[0],'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})})
  return {app,client,state,seller,store,request}
}

test('subscription item: no commission, connected Stripe scope, address and private order, verified webhook',async()=>{
  const {app,state,request,store}=await fixture()
  const register=await app.load('app/api/register-item/route.js')
  const body={requestId:randomUUID(),accepted:true,title:'Brand hoodie size M',description:'Cotton hoodie',condition:'new',priceSek:300,
    shippingIncluded:true,shippingCountries:['SE','DE'],salesLimit:1,brand:'Example Brand',contactEmail:'shop@example.test'}
  const saved=await register.POST(request('/api/register-item',body));assert.equal(saved.status,200)
  const {id}=await saved.json();const listing=await store.getListing(id)
  assert.equal(listing.billingMode,'subscription');assert.equal(listing.paymentAccountId,'acct_merchant')
  const checkout=await app.load('app/api/checkout/[id]/route.js')
  const purchase=await checkout.POST(request(`/api/checkout/${id}`,{attemptId:randomUUID()}),{params:{id}})
  assert.equal(purchase.status,200)
  const created=state.creates[0]
  assert.equal(created.opts.stripeAccount,'acct_merchant')
  assert.equal(created.args.payment_intent_data.application_fee_amount,0)
  assert.equal(created.args.payment_intent_data.transfer_data,undefined)
  assert.deepEqual([...created.args.shipping_address_collection.allowed_countries],['SE','DE'])
  const session=[...state.sessions.values()][0]
  const verify=await app.load('app/api/verify-session/route.js')
  const url=`/api/verify-session?listing_id=${id}&session_id=${session.id}`
  assert.equal((await (await verify.GET(request(url))).json()).status,'unpaid')
  session.payment_status='paid';session.status='complete'
  const hook=await app.load('app/api/stripe/webhook/route.js')
  const event=(account)=>new Request('https://app.test/api/stripe/connect-webhook',{method:'POST',headers:{'stripe-signature':'valid'},body:JSON.stringify({type:'checkout.session.completed',account,data:{object:session}})})
  assert.equal((await hook.handleWebhook(event('acct_other'),true)).status,400)
  assert.equal((await hook.handleWebhook(event('acct_merchant'),true)).status,200)
  assert.equal((await hook.handleWebhook(event('acct_merchant'),true)).status,200)
  assert.equal(await store.getSalesCount(id),1)
  assert.equal((await (await verify.GET(request(url))).json()).status,'paid')
  const orders=await app.load('app/api/item-orders/[id]/route.js')
  const result=await orders.GET(request(`/api/item-orders/${id}`),{params:{id}})
  assert.equal((await result.json()).orders[0].shippingAddress.city,'Stockholm')
  assert.equal((await orders.GET(request(`/api/item-orders/${id}`,null,false),{params:{id}})).status,404)
  session.payment_intent.latest_charge.refunded=true
  assert.equal((await (await verify.GET(request(url))).json()).status,'unavailable')
})

test('atomic link quotas: parallel last-slot requests, retries, unlimited upgrades and next period',async()=>{
  const {app}=await fixture()
  const quota=await app.load('lib/commerce-store.js')
  const billing={active:true,subscriptionId:'sub_q',periodStart:1,plan:{links:1}}
  const results=await Promise.allSettled([quota.reserveLink('s',billing,'one'),quota.reserveLink('s',billing,'two')])
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1)
  assert.equal(await quota.linkUsage('s',billing),1)
  const winner=results[0].status==='fulfilled'?'one':'two'
  await quota.reserveLink('s',billing,winner)
  assert.equal(await quota.linkUsage('s',billing),1)
  billing.plan.links=null;await quota.reserveLink('s',billing,'extra')
  assert.equal(await quota.linkUsage('s',billing),2)
  billing.plan.links=1
  await assert.rejects(()=>quota.reserveLink('s',{...billing,locale:'en'},'another'),/used all/)
  await assert.rejects(()=>quota.reserveLink('s',{...billing,locale:'sv'},'another'),/använt alla/)
  billing.periodStart=2;await quota.reserveLink('s',billing,'another')
  assert.equal(await quota.linkUsage('s',billing),1)
})

test('limited stock: only one open checkout, expired reservation frees slot; paid session stays sold without browser return',async()=>{
  const {app,client,state}=await fixture()
  const reservation=await app.load('lib/checkout-reservations.js')
  const listing={id:'stock_item',salesLimit:1}
  const params={mode:'payment',line_items:[{price_data:{currency:'sek',unit_amount:5000}}],metadata:{file_id:listing.id,seller_id:'seller1'}}
  const scope={accountId:'acct_merchant',listingId:listing.id,sellerId:'seller1',amount:5000,currency:'sek'}
  const first=randomUUID(),second=randomUUID()
  const results=await Promise.allSettled([reservation.createReservedCheckout(client,listing,first,params,scope),reservation.createReservedCheckout(client,listing,second,params,scope)])
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(state.creates.length,1)
  await assert.rejects(()=>reservation.createReservedCheckout(client,listing,randomUUID(),params,scope),/Another buyer/)
  const initial=[...state.sessions.values()][0];initial.status='expired'
  const next=await reservation.createReservedCheckout(client,listing,randomUUID(),params,scope)
  assert.equal(state.creates.length,2)
  next.status='complete';next.payment_status='paid'
  await assert.rejects(()=>reservation.createReservedCheckout(client,listing,randomUUID(),params,scope),/sold out/)
})

test('publish idempotency, no subscription bypass and historical platform payments stay readable',async()=>{
  const {app,state,seller,client,store}=await fixture()
  const pub=await app.load('lib/publish-listing.js')
  const body={requestId:randomUUID(),accepted:true}
  const first=await pub.publishListing(seller,body,{name:'First',kind:'digital'})
  const retry=await pub.publishListing(seller,body,{name:'Must not overwrite'})
  assert.equal(first.id,retry.id);assert.equal(retry.name,'First')
  state.sub.status='past_due'
  const free=await pub.publishListing(seller,{...body,requestId:randomUUID()},{name:'Free tier',priceUsd:10,priceCents:1000})
  assert.equal(free.billingMode,'freemium')
  assert.equal(free.feeBps,500)
  await assert.rejects(()=>pub.publishListing(seller,{...body,requestId:randomUUID()},{name:'Too cheap',priceUsd:1,priceCents:100}),/at least \$10/)
  await assert.rejects(()=>pub.publishListing(seller,{...body,accepted:false},{name:'Other'}),/Confirm your age/)
  state.sessions.set('cs_test_legacy',{id:'cs_test_legacy',mode:'payment',payment_status:'paid',metadata:{file_id:'legacy'},account:null})
  const payments=await app.load('lib/payment-context.js')
  assert.equal((await payments.retrieveCheckout(client,'cs_test_legacy','legacy')).payment_status,'paid')
  await assert.rejects(()=>payments.retrieveCheckout(client,'cs_test_legacy',first.id),/does not match/)
})
