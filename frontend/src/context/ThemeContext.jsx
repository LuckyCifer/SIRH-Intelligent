import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} })

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('gsria-theme') || 'light'
  )

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode')
      document.body.classList.remove('light-mode')
    } else {
      document.body.classList.remove('dark-mode')
      document.body.classList.add('light-mode')
    }
    localStorage.setItem('gsria-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'))

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- hook co-localisé avec son contexte (n'affecte que le rechargement à chaud)
export function useTheme() {
  return useContext(ThemeContext)
}
