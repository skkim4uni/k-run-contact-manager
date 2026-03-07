"use client"

import { useState, useEffect, useCallback } from "react"

/**
 * localStorage와 동기화되는 useState 대체 훅.
 * SSR(Next.js) 환경에서 hydration mismatch 없이 동작.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue)

  // 클라이언트 마운트 후 localStorage에서 초기값 로드
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) {
        setValue(JSON.parse(stored) as T)
      }
    } catch {
      // 파싱 실패 시 initialValue 유지
    }
  }, [key])

  const setStoredValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next =
          typeof newValue === "function"
            ? (newValue as (prev: T) => T)(prev)
            : newValue
        try {
          localStorage.setItem(key, JSON.stringify(next))
        } catch {
          // 프라이빗 브라우징 등 저장 실패 시 무시
        }
        return next
      })
    },
    [key]
  )

  return [value, setStoredValue] as const
}
