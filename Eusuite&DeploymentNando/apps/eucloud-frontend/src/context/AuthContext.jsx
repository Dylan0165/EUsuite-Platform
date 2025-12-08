import React, { createContext, useState, useContext, useEffect, useCallback } from 'react'

// SSO Authentication Context - EUsuite Single Sign-On
const AuthContext = createContext(null)

// Base URLs for SSO
const API_BASE_URL = 'http://192.168.124.50:30500'
const LOGIN_URL = 'http://192.168.124.50:30090/login'
const EUCLOUD_BASE_URL = 'http://192.168.124.50:30080'

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const getRedirectUrl = useCallback(() => {
    // Build full URL with EUCloud base
    return EUCLOUD_BASE_URL + window.location.pathname + window.location.search
  }, [])

  const redirectToLogin = useCallback(() => {
    const redirectUrl = getRedirectUrl()
    window.location.href = `${LOGIN_URL}?redirect=${encodeURIComponent(redirectUrl)}`
  }, [getRedirectUrl])

  const validateSession = useCallback(async () => {
    try {
      console.log('🔐 EUCloud: Validating SSO session...')
      
      // Call /api/auth/validate with cookie credentials
      const response = await fetch(`${API_BASE_URL}/api/auth/validate`, {
        method: 'GET',
        credentials: 'include'
      })
      
      if (response.status === 401) {
        // Not authenticated - redirect to SSO login portal
        console.log('❌ EUCloud: No valid session, redirecting to login portal')
        redirectToLogin()
        return
      }
      
      if (!response.ok) {
        // Other error (500, 502, etc) - don't redirect, might be temporary
        console.error('EUCloud: Backend error', response.status)
        setLoading(false)
        return
      }
      
      const data = await response.json()
      
      if (data.valid) {
        // Handle both response formats (user object or top-level fields)
        const userData = data.user || { 
          username: data.username, 
          email: data.email,
          user_id: data.user_id 
        }
        
        if (userData.username || userData.email) {
          setUser(userData)
          console.log('✅ EUCloud: SSO authentication successful:', userData.email || userData.username)
        } else {
          console.log('⚠️ EUCloud: Invalid user data, redirecting to login')
          redirectToLogin()
        }
      } else {
        console.log('⚠️ EUCloud: Session not valid, redirecting to login')
        redirectToLogin()
      }
    } catch (error) {
      // Network error - don't redirect, might be temporary
      console.error('💥 EUCloud: SSO validation network error:', error)
    } finally {
      setLoading(false)
    }
  }, [redirectToLogin])

  useEffect(() => {
    validateSession()
  }, [validateSession])

  const logout = async () => {
    try {
      console.log('🚪 EUCloud: Logging out...')
      
      // Call logout endpoint to delete cookie
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      })
      
      // Clear local state
      setUser(null)
      
      // Redirect to login portal with EUCloud as redirect target
      window.location.href = `${LOGIN_URL}?redirect=${encodeURIComponent(EUCLOUD_BASE_URL)}`
    } catch (error) {
      console.error('Logout error:', error)
      // Redirect anyway on error
      window.location.href = `${LOGIN_URL}?redirect=${encodeURIComponent(EUCLOUD_BASE_URL)}`
    }
  }

  const value = {
    user,
    loading,
    logout,
    refreshUser: validateSession
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
