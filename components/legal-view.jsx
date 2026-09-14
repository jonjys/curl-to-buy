'use client'

import { useLocale } from './locale'
import { SUPPORT } from '../lib/site'

const PRIVACY_EMAIL = 'privacy@nyttolabs.com'
const DOCS = {
  terms: {
    en: { title: 'Terms', lead: 'Curl-to-Buy is a Nytto Labs service for selling digital files.', sections: [
      ['Who may sell', 'Sellers must be at least 18 years old and legally able to enter a contract. Buyers may be subject to additional age rules for particular content.'],
      ['How it works', 'A seller uploads one file or a pack, sets a price and optional limits. A buyer pays by card through Stripe before downloading.'],
      ['Fees', 'Nytto Labs retains a 5% platform fee on each sale; card-processing fees may also apply.'],
      ['What you may sell', 'Only sell files you own or have the right to distribute. No malware, scams, illegal material, sexual content involving anyone under 18, exploitation, or unlicensed copyrighted work. Links may be removed without notice.'],
      ['Download limits', 'The seller may limit buyers or downloads. Limits reduce casual sharing but cannot guarantee that a buyer will not copy or redistribute a downloaded file.'],
      ['Contact', `Questions: ${SUPPORT}.`],
    ] },
    sv: { title: 'Villkor', lead: 'Curl-to-Buy är en Nytto Labs-tjänst för försäljning av digitala filer.', sections: [
      ['Vem får sälja', 'Säljare måste vara minst 18 år och få ingå avtal. För vissa typer av innehåll kan ytterligare ålderskrav gälla för köpare.'],
      ['Så fungerar det', 'Säljaren laddar upp en fil eller ett paket, sätter pris och valfria gränser. Köparen betalar med kort via Stripe före nedladdning.'],
      ['Avgifter', 'Nytto Labs behåller 5% plattformsavgift per försäljning. Kortavgift kan också tillkomma.'],
      ['Vad du får sälja', 'Sälj bara filer du äger eller får sprida. Ingen skadlig kod, bedrägeri, olagligt material, sexuellt innehåll med någon under 18, exploatering eller olovligt upphovsrättsskyddat material. Länkar kan tas bort utan förvarning.'],
      ['Nedladdningsgränser', 'Säljaren kan begränsa köpare och nedladdningar. Gränser minskar enkel delning men kan inte hindra en köpare från att kopiera en redan nedladdad fil.'],
      ['Kontakt', `Frågor: ${SUPPORT}.`],
    ] },
  },
  refunds: {
    en: { title: 'Refunds', lead: 'Digital files are delivered immediately after payment.', sections: [['Generally final', 'Purchases are generally final once downloads are made available.'], ['Problems', `If a paid file is missing, corrupt or materially not as described, contact ${SUPPORT}.`], ['Payment', 'Approved refunds return to the original card through Stripe.']] },
    sv: { title: 'Återbetalning', lead: 'Digitala filer levereras direkt efter betalning.', sections: [['Vanligtvis slutgiltigt', 'Köp är normalt slutgiltiga när nedladdningen gjorts tillgänglig.'], ['Problem', `Om en betald fil saknas, är trasig eller tydligt felbeskriven, kontakta ${SUPPORT}.`], ['Betalning', 'Godkända återbetalningar går tillbaka till det ursprungliga kortet via Stripe.']] },
  },
  privacy: {
    en: { title: 'Privacy', lead: 'What Curl-to-Buy stores and who processes it.', sections: [['What we store', 'Uploaded files, file names, price, limits and a random link id. We do not store card numbers.'], ['Processors', 'Stripe handles payments. Vercel hosts the service and stores files.'], ['Contact', `Privacy questions: ${PRIVACY_EMAIL}.`]] },
    sv: { title: 'Integritet', lead: 'Vad Curl-to-Buy lagrar och vem som behandlar det.', sections: [['Vad vi lagrar', 'Uppladdade filer, filnamn, pris, gränser och ett slumpat länk-id. Vi lagrar inga kortnummer.'], ['Underbiträden', 'Stripe hanterar betalningar. Vercel driver tjänsten och lagrar filer.'], ['Kontakt', `Integritetsfrågor: ${PRIVACY_EMAIL}.`]] },
  },
}

export default function LegalView({ slug }) {
  const { locale } = useLocale(); const doc = DOCS[slug][locale] || DOCS[slug].en
  return <article className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6"><h1 className="font-display text-3xl font-black tracking-tight">{doc.title}</h1><p className="mt-3 text-base text-ink-soft">{doc.lead}</p><div className="mt-8 space-y-6">{doc.sections.map(([heading, body]) => <section key={heading}><h2 className="font-display text-lg font-bold">{heading}</h2><p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{body}</p></section>)}</div></article>
}
