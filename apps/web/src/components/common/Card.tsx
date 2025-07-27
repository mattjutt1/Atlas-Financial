import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hoverable?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  onClick?: () => void
}

export function Card({ 
  children, 
  className = '', 
  hoverable = false, 
  padding = 'md',
  onClick 
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  const baseClasses = 'card'
  const hoverClasses = hoverable ? 'hover:shadow-md transition-shadow' : ''
  const cursorClasses = onClick ? 'cursor-pointer' : ''
  
  return (
    <div 
      className={`${baseClasses} ${paddingClasses[padding]} ${hoverClasses} ${cursorClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}