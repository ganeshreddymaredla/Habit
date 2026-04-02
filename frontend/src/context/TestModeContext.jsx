import { createContext, useContext, useState } from 'react'

const TestModeContext = createContext(null)

export function TestModeProvider({ children }) {
  const [isTestMode, setIsTestMode]       = useState(false)
  const [simulatedDate, setSimulatedDate] = useState(() => {
    // Default to today's date string
    return new Date().toISOString().split('T')[0]
  })

  const toggle = () => setIsTestMode(v => !v)

  const reset = () => {
    setIsTestMode(false)
    setSimulatedDate(new Date().toISOString().split('T')[0])
  }

  return (
    <TestModeContext.Provider value={{ isTestMode, simulatedDate, setSimulatedDate, toggle, reset }}>
      {children}
    </TestModeContext.Provider>
  )
}

export const useTestMode = () => useContext(TestModeContext)
