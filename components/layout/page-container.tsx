import { ReactNode } from 'react'

interface PageContainerProps {
  children: ReactNode
  noPadding?: boolean
}

export function PageContainer({ children, noPadding = false }: PageContainerProps) {
  return (
    <div className={noPadding ? '' : 'pt-11'}>
      {children}
    </div>
  )
}