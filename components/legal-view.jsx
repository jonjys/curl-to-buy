'use client'

import { useLocale } from './locale'
import { SUPPORT } from '../lib/site'

const PRIVACY_EMAIL = 'privacy@nyttolabs.com'
const DOCS = {
  terms: {
    en: { title: 'Terms', lead: 'Curl-to-Buy is a Nytto Labs service for selling physical products and digital files.', sections: [
      ['Who may sell', 'Sellers must be at least 18 years old and legally able to enter a contract. Buyers may be subject to additional age rules for particular content.'],
      ['How it works', 'A seller uploads one file or a pack, sets a price and optional limits. A buyer pays by card through Stripe before downloading.'],
      ['Fees', 'The monthly subscription is what you pay Nytto Labs for new links. Curl-to-Buy takes no percentage of each sale. Stripe deducts its card fee from the seller. Existing links created under the earlier per-sale agreement retain that agreement until replaced. Subscription prices and link allowances are shown before payment; subscriptions renew monthly until canceled.'],
      ['What you may sell', 'Only sell files you own or have the right to distribute. No malware, scams, illegal material, sexual content involving anyone under 18, exploitation, or unlicensed copyrighted work. Links may be removed without notice.'],
      ['Download limits', 'The seller may limit buyers or downloads. Limits reduce casual sharing but cannot guarantee that a buyer will not copy or redistribute a downloaded file.'],
      ['Physical products', 'The seller is responsible for product descriptions, required seller information, taxes, delivery and returns. Shipping is included in the displayed price for the selected countries. The buyer enters delivery details in Stripe Checkout and the seller can view them in their orders.'],
      ['Subscriptions', 'New links require an active paid subscription. Link allowances renew each billing period. Cancel through subscription management; access continues through the paid period. If payment fails or the subscription ends, new sales are paused; customers retain access to already paid purchases.'],
      ['Contact', `Questions: ${SUPPORT}.`],
    ] },
    sv: { title: 'Villkor', lead: 'Curl-to-Buy är en Nytto Labs-tjänst för försäljning av fysiska produkter och digitala filer.', sections: [
      ['Vem får sälja', 'Säljare måste vara minst 18 år och få ingå avtal. För vissa typer av innehåll kan ytterligare ålderskrav gälla för köpare.'],
      ['Så fungerar det', 'Säljaren laddar upp en fil eller ett paket, sätter pris och valfria gränser. Köparen betalar med kort via Stripe före nedladdning.'],
      ['Avgifter', 'Månadsabonnemanget är det du betalar till Nytto Labs för nya länkar. Curl-to-Buy tar ingen procent på varje försäljning. Stripe drar sin kortavgift från säljaren. Befintliga länkar enligt det tidigare avtalet om avgift per köp behåller det avtalet tills de ersätts. Pris och länkgräns visas före betalning. Abonnemang förnyas varje månad tills det sägs upp.'],
      ['Vad du får sälja', 'Sälj bara filer du äger eller får sprida. Ingen skadlig kod, bedrägeri, olagligt material, sexuellt innehåll med någon under 18, exploatering eller olovligt upphovsrättsskyddat material. Länkar kan tas bort utan förvarning.'],
      ['Nedladdningsgränser', 'Säljaren kan begränsa köpare och nedladdningar. Gränser minskar enkel delning men kan inte hindra en köpare från att kopiera en redan nedladdad fil.'],
      ['Fysiska produkter', 'Säljaren ansvarar för varubeskrivning, obligatorisk säljarinformation, skatter, leverans och returer. Frakt till valda länder ingår i det visade priset. Köparen anger leveransuppgifter hos Stripe och säljaren kan se dem bland sina beställningar.'],
      ['Abonnemang', 'Nya länkar kräver ett aktivt betalt abonnemang. Länkgränsen förnyas varje betalperiod. Avsluta i abonnemangshanteringen; åtkomsten gäller till den betalda periodens slut. Vid misslyckad betalning eller avslutat abonnemang pausas nya köp. Redan betalda köp är fortsatt tillgängliga för köparen.'],
      ['Kontakt', `Frågor: ${SUPPORT}.`],
    ] },
  },
  refunds: {
    en: { title: 'Refunds', lead: 'Digital files are delivered immediately after payment.', sections: [['Your rights', 'Statutory cancellation, return and refund rights remain applicable. For physical products, contact the seller using the product page. For subscription billing or delivery problems, contact support.'], ['Problems', `If a paid file is missing, corrupt or materially not as described, contact ${SUPPORT}.`], ['Payment', 'Approved refunds return to the original card through Stripe.']] },
    sv: { title: 'Återbetalning', lead: 'Digitala filer levereras direkt efter betalning.', sections: [['Dina rättigheter', 'Lagstadgad ångerrätt, returrätt och rätt till återbetalning gäller. För fysiska produkter kontaktar du säljaren via produktsidan. För abonnemangsbetalning eller leveransproblem kontaktar du support.'], ['Problem', `Om en betald fil saknas, är trasig eller tydligt felbeskriven, kontakta ${SUPPORT}.`], ['Betalning', 'Godkända återbetalningar går tillbaka till det ursprungliga kortet via Stripe.']] },
  },
  privacy: {
    en: { title: 'Privacy', lead: 'What Curl-to-Buy stores and who processes it.', sections: [['What we store', 'Product and file details, prices, link limits, seller contact and payment account references, subscriptions and purchase references. Stripe holds buyer contact and shipping details; the service retrieves them for the authenticated seller to fulfill the order. We do not store card numbers.'], ['Processors', 'Stripe handles payments. Vercel hosts the service and stores files.'], ['Contact', `Privacy questions: ${PRIVACY_EMAIL}.`]] },
    sv: { title: 'Integritet', lead: 'Vad Curl-to-Buy lagrar och vem som behandlar det.', sections: [['Vad vi lagrar', 'Produkt- och filuppgifter, pris, länkgränser, säljarens kontakt- och betalningsreferenser, abonnemang och köpreferenser. Köparens kontakt- och leveransuppgifter finns hos Stripe och hämtas för den inloggade säljaren för leverans. Vi lagrar inga kortnummer.'], ['Underbiträden', 'Stripe hanterar betalningar. Vercel driver tjänsten och lagrar filer.'], ['Kontakt', `Integritetsfrågor: ${PRIVACY_EMAIL}.`]] },
  },
}

export default function LegalView({ slug }) {
  const { locale } = useLocale(); const doc = DOCS[slug][locale] || DOCS[slug].en
  return <article className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6"><h1 className="font-display text-3xl font-black tracking-tight">{doc.title}</h1><p className="mt-3 text-base text-ink-soft">{doc.lead}</p><div className="mt-8 space-y-6">{doc.sections.map(([heading, body]) => <section key={heading}><h2 className="font-display text-lg font-bold">{heading}</h2><p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{body}</p></section>)}</div></article>
}

