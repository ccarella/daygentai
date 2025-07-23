'use client'

import { ReactNode, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

interface TransitionWrapperProps {
  children: ReactNode
}

export function TransitionWrapper({ children }: TransitionWrapperProps) {
  const pathname = usePathname()
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    setIsTransitioning(true)
    const timer = setTimeout(() => {
      setIsTransitioning(false)
    }, 50)
    return () => clearTimeout(timer)
  }, [pathname])

  return (
    <div 
      className={`flex-1 transition-all duration-200 ease-in-out ${
        isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      }`}
    >
      {children}
    </div>
  )
}