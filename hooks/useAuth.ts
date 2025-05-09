import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

interface UseAuthReturn {
  user: User | null
  loading: boolean
  error: Error | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Récupérer l'utilisateur actuel au chargement
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true)
        setError(null)

        // Récupérer la session actuelle
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        if (session?.user) {
          setUser(session.user)
        }
      } catch (err: any) {
        console.error("Erreur lors de la récupération de l'utilisateur:", err)
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Fonction de connexion
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        throw signInError
      }

      setUser(data.user)
    } catch (err: any) {
      console.error("Erreur lors de la connexion:", err)
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Fonction de déconnexion
  const signOut = async () => {
    try {
      setLoading(true)
      setError(null)

      const { error: signOutError } = await supabase.auth.signOut()

      if (signOutError) {
        throw signOutError
      }

      setUser(null)
    } catch (err: any) {
      console.error("Erreur lors de la déconnexion:", err)
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    user,
    loading,
    error,
    signIn,
    signOut,
  }
}
