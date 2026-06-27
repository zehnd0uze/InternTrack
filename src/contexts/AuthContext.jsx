import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  // activeRole: the role currently displayed — can be profile.role or profile.secondary_role
  const [activeRole, setActiveRole] = useState(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
          setActiveRole(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
      // Reset active role to primary role on profile refresh
      setActiveRole(data.role)
    } catch (err) {
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signInWithOAuth = async (provider) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/student/dashboard`,
      }
    })
    return { data, error }
  }

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (!error && data.user) {
      // Insert profile row; trigger may also do this, upsert is safe
      await supabase.from('users').upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        role: 'student',
        is_active: true,
        target_hours: 240,
      })
    }
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
      setProfile(null)
      setActiveRole(null)
    }
    return { error }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  /**
   * switchRole — toggles between primary role and secondary_role.
   * Only available if profile.secondary_role is set.
   */
  const switchRole = () => {
    if (!profile?.secondary_role) return
    setActiveRole(prev =>
      prev === profile.role ? profile.secondary_role : profile.role
    )
  }

  // Convenience booleans based on activeRole (not profile.role directly)
  const resolvedRole = activeRole || profile?.role || null

  const value = {
    user,
    profile,
    loading,
    signIn,
    signInWithOAuth,
    signUp,
    signOut,
    refreshProfile,
    switchRole,
    activeRole: resolvedRole,
    // Keep role as the actual DB role for data queries / RLS
    role: resolvedRole,
    isStudent: resolvedRole === 'student',
    isSupervisor: resolvedRole === 'supervisor',
    isMentor: resolvedRole === 'mentor',
    isAdmin: resolvedRole === 'admin',
    // Whether this user has a secondary role available
    hasDualRole: !!(profile?.secondary_role),
    // The "other" role they can switch to
    alternateRole: profile?.secondary_role
      ? (resolvedRole === profile.role ? profile.secondary_role : profile.role)
      : null,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
