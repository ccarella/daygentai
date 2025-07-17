import { HeaderWrapper } from './header-wrapper'

export function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HeaderWrapper />
      <div className="pt-11">
        {children}
      </div>
    </>
  )
}