'use client'

import { useLocale } from './locale'
import { SUPPORT } from '../lib/site'

const PRIVACY_EMAIL = 'privacy@nyttolabs.com'

const DOCS = {
  terms: {
    en: {
      title: 'Terms',
      lead: 'Curl-to-Buy is a service by Nytto Labs (operated by Fredrik Kornelind, Sweden) for selling digital files.',
      sections: [
        ['How it works', 'A seller uploads a file and sets a price. A buyer pays by card through Stripe and downloads the file. Cards only — no Klarna.'],
        ['Fees', 'Nytto Labs retains a 5% platform fee on each sale; the seller keeps 95%. Card-processing fees are charged by Stripe.'],
        ['What you may sell', 'You may only upload files you own or have the right to sell, and the content must be lawful. No malware, no illegal material, and no third-party copyrighted work you are not licensed to distribute. Files or links that break these terms may be removed without notice.'],
        ['No warranty', 'The service is provided “as is”, without warranties. Nytto Labs is not the author of files sold through Curl-to-Buy and is not responsible for their content.'],
        ['Contact', `Questions: ${SUPPORT}.`],
      ],
    },
    sv: {
      title: 'Villkor',
      lead: 'Curl-to-Buy är en tjänst från Nytto Labs (drivs av Fredrik Kornelind, Sverige) för att sälja digitala filer.',
      sections: [
        ['Så fungerar det', 'En säljare laddar upp en fil och sätter ett pris. En köpare betalar med kort via Stripe och laddar ner filen. Endast kort — inte Klarna.'],
        ['Avgifter', 'Nytto Labs behåller 5% plattformsavgift per försäljning; säljaren behåller 95%. Kortavgifter tas ut av Stripe.'],
        ['Vad du får sälja', 'Du får bara ladda upp filer du äger eller har rätt att sälja, och innehållet måste vara lagligt. Ingen skadlig kod, inget olagligt material och inget upphovsrättsskyddat verk du saknar licens att sprida. Filer eller länkar som bryter mot villkoren kan tas bort utan förvarning.'],
        ['Ingen garanti', 'Tjänsten tillhandahålls “i befintligt skick”, utan garantier. Nytto Labs är inte upphovsman till filer som säljs via Curl-to-Buy och ansvarar inte för deras innehåll.'],
        ['Kontakt', `Frågor: ${SUPPORT}.`],
      ],
    },
  },
  refunds: {
    en: {
      title: 'Refunds',
      lead: 'Digital files are delivered immediately after payment.',
      sections: [
        ['Generally final', 'Because the file is delivered instantly, purchases are generally final once the download has been made available.'],
        ['When we refund', 'If you were charged but the download failed, the file was missing or corrupt, or it was clearly not as described, email ' + SUPPORT + ' and we will investigate and refund where warranted.'],
        ['How refunds are paid', 'Approved refunds are returned to the original card through Stripe. The Stripe processing fee may not be recoverable.'],
      ],
    },
    sv: {
      title: 'Återbetalning',
      lead: 'Digitala filer levereras direkt efter betalning.',
      sections: [
        ['Vanligtvis slutgiltigt', 'Eftersom filen levereras direkt är köp normalt slutgiltiga när nedladdningen har gjorts tillgänglig.'],
        ['När vi återbetalar', 'Om du debiterades men nedladdningen misslyckades, filen saknades eller var trasig, eller uppenbart inte stämde med beskrivningen — mejla ' + SUPPORT + ' så utreder vi och återbetalar när det är befogat.'],
        ['Hur återbetalning sker', 'Godkända återbetalningar går tillbaka till det ursprungliga kortet via Stripe. Stripes avgift kan vara ej återvinningsbar.'],
      ],
    },
  },
  privacy: {
    en: {
      title: 'Privacy',
      lead: 'What Curl-to-Buy stores, and who processes it.',
      sections: [
        ['What we store', 'The uploaded file, its name, the price you set, and a random link id. We do not store card numbers — payments are handled entirely by Stripe.'],
        ['Payments', 'When a buyer pays, Stripe processes the card and any receipt email. We receive confirmation that a session was paid so we can release the download.'],
        ['Processors', 'Stripe (payments) and Vercel (hosting and file storage). Files are served through our servers only after a paid session is verified.'],
        ['Contact', `Privacy questions: ${PRIVACY_EMAIL}. The company-wide policy is at nyttolabs.com/privacy.`],
      ],
    },
    sv: {
      title: 'Integritet',
      lead: 'Vad Curl-to-Buy lagrar och vem som behandlar det.',
      sections: [
        ['Vad vi lagrar', 'Den uppladdade filen, dess namn, priset du satt och ett slumpat länk-id. Vi lagrar inga kortnummer — betalningar hanteras helt av Stripe.'],
        ['Betalningar', 'När en köpare betalar hanterar Stripe kortet och eventuellt kvittomejl. Vi får bekräftelse på att en session betalats så att vi kan släppa nedladdningen.'],
        ['Underbiträden', 'Stripe (betalning) och Vercel (drift och fillagring). Filer serveras via våra servrar först efter att en betald session verifierats.'],
        ['Kontakt', `Integritetsfrågor: ${PRIVACY_EMAIL}. Företagets policy finns på nyttolabs.com/privacy.`],
      ],
    },
  },
}

export default function LegalView({ slug }) {
  const { locale } = useLocale()
  const doc = DOCS[slug][locale] || DOCS[slug].en
  return (
    <article className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-black tracking-tight">{doc.title}</h1>
      <p className="mt-3 text-base text-ink-soft">{doc.lead}</p>
      <div className="mt-8 space-y-6">
        {doc.sections.map(([h, b]) => (
          <section key={h}>
            <h2 className="font-display text-lg font-bold">{h}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{b}</p>
          </section>
        ))}
      </div>
    </article>
  )
}
