import './style.css'

import { GlobalProvider } from '../global-context'
import { NextIntlProvider } from 'next-intl'
import { Analytics } from '@vercel/analytics/react'
export default function MyApp({ Component, pageProps }) {
  return (
    <NextIntlProvider messages={pageProps?.messages} locale={pageProps?.locale}>
      <GlobalProvider>
        <Component {...pageProps} />
        <Analytics />
      </GlobalProvider>
    </NextIntlProvider>
  )
}
