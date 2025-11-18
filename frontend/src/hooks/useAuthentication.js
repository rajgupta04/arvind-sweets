import { useContext, useMemo } from 'react'
import { AuthContext } from '../context/AuthContext.jsx'

export function useAuthenticated() {
  const auth = useContext(AuthContext)
  const authenticated = Boolean(auth?.user)

  return useMemo(() => ({
    authenticated,
    user: auth?.user
  }), [authenticated, auth?.user])
}
