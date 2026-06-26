import { createContext, useContext, useState } from 'react'

/**
 * ViewAsContext — lets admin/supervisor "preview" a student's dashboard
 * in read-only mode without switching accounts.
 *
 * viewingAs: { id, full_name } | null
 */

const ViewAsContext = createContext(null)

export function ViewAsProvider({ children }) {
  const [viewingAs, setViewingAsState] = useState(null)

  const setViewingAs = (student) => {
    // student: { id, full_name }
    setViewingAsState(student)
  }

  const exitViewAs = () => {
    setViewingAsState(null)
  }

  return (
    <ViewAsContext.Provider value={{ viewingAs, setViewingAs, exitViewAs }}>
      {children}
    </ViewAsContext.Provider>
  )
}

export function useViewAs() {
  const ctx = useContext(ViewAsContext)
  if (!ctx) throw new Error('useViewAs must be used within ViewAsProvider')
  return ctx
}
