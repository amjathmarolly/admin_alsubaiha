"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"

export type CurrencyCode = "usd" | "eur" | "gbp" | "aed"

interface CurrencyInfo {
  code: CurrencyCode
  symbol: string
  name: string
  locale: string
}

const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  usd: { code: "usd", symbol: "$", name: "USD", locale: "en-US" },
  eur: { code: "eur", symbol: "€", name: "EUR", locale: "de-DE" },
  gbp: { code: "gbp", symbol: "£", name: "GBP", locale: "en-GB" },
  aed: { code: "aed", symbol: "د.إ", name: "AED", locale: "ar-AE" },
}

interface CurrencyContextType {
  currency: CurrencyCode
  currencyInfo: CurrencyInfo
  setCurrency: (currency: CurrencyCode) => void
  formatPrice: (amount: number) => string
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("usd")
  const [isLoaded, setIsLoaded] = useState(false)

  const currencyInfo = CURRENCIES[currency]

  // Fetch currency from database on mount
  useEffect(() => {
    const fetchCurrency = async () => {
      try {
        const response = await fetch('/api/settings')
        
        if (response.ok) {
          const data = await response.json()
          if (data.currency && CURRENCIES[data.currency as CurrencyCode]) {
            setCurrencyState(data.currency as CurrencyCode)
          }
        }
      } catch (error) {
        console.error("Failed to fetch currency setting:", error)
      } finally {
        setIsLoaded(true)
      }
    }
    fetchCurrency()
  }, [])

  const setCurrency = useCallback((newCurrency: CurrencyCode) => {
    setCurrencyState(newCurrency)
  }, [])

  const formatPrice = useCallback((amount: number) => {
    const info = CURRENCIES[currency]
    
    // For AED, we format manually to show the symbol correctly
    if (currency === "aed") {
      return `${info.symbol} ${amount.toLocaleString("en-US")}`
    }
    
    return new Intl.NumberFormat(info.locale, {
      style: "currency",
      currency: info.code.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  }, [currency])

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        currencyInfo,
        setCurrency,
        formatPrice,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider")
  }
  return context
}
