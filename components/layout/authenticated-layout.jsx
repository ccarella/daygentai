import { HeaderWrapper } from './header-wrapper';
export function AuthenticatedLayout({ children }) {
    return (<>
      <HeaderWrapper />
      <div className="pt-11">
        {children}
      </div>
    </>);
}
