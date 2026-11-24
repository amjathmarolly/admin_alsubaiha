import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/lib/auth-context"
import { CategoriesProvider } from "@/lib/categories-context"
import { OrdersProvider } from "@/lib/orders-context"
import { CustomersProvider } from "@/lib/customers-context"
import { ProductsProvider } from "@/lib/products-context"
import { CurrencyProvider } from "@/lib/currency-context"
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Alsubaiha - Admin Dashboard',
  description: 'Alsubaiha - Luxury Furniture Dubai admin dashboard',
  generator: '@Venkat',
  icons: {
    icon: [
      {
        url: '/favicon.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/favicon.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/favicon.png',
        type: 'image/*',
      },
    ],
    apple: '/favicon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <CategoriesProvider>
              <OrdersProvider>
                <CustomersProvider>
                  <ProductsProvider>
                    <CurrencyProvider>
                      {children}
                      <Toaster />
                    </CurrencyProvider>
                  </ProductsProvider>
                </CustomersProvider>
              </OrdersProvider>
            </CategoriesProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
