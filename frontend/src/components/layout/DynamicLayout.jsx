import useAuthStore from '../../store/authStore'
import RHLayout from './RHLayout'
import ManagerLayout from './ManagerLayout'
import EmployeLayout from './EmployeLayout'

export default function DynamicLayout({ children, pageTitle }) {
  const user = useAuthStore(s => s.user)

  if (!user) return <>{children}</>

  switch (user.role) {
    case 'RH':
    case 'ADMIN':
      return <RHLayout pageTitle={pageTitle}>{children}</RHLayout>
    case 'MANAGER':
      return <ManagerLayout pageTitle={pageTitle}>{children}</ManagerLayout>
    case 'EMPLOYE':
    default:
      return <EmployeLayout pageTitle={pageTitle}>{children}</EmployeLayout>
  }
}
