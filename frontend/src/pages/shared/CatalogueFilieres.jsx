import useAuthStore from '../../store/authStore'
import EmployeLayout  from '../../components/layout/EmployeLayout'
import ManagerLayout  from '../../components/layout/ManagerLayout'
import RHLayout       from '../../components/layout/RHLayout'
import { FILIERES }   from '../../constants/filieres'

const LAYOUT_MAP = {
  EMPLOYE:  EmployeLayout,
  MANAGER:  ManagerLayout,
  RH:       RHLayout,
  ADMIN:    RHLayout,
}

export default function CatalogueFilieres() {
  const { user } = useAuthStore()
  const Layout = LAYOUT_MAP[user?.role] || EmployeLayout

  return (
    <Layout pageTitle="Postes & Métiers SIRH">

      {/* ── Introduction ── */}
      <div className="alert alert-info py-3 mb-4" style={{ fontSize: 13 }}>
        <div className="d-flex align-items-start">
          <i className="fas fa-graduation-cap fa-2x mr-3 mt-1" />
          <div>
            <strong>Les 8 domaines de formation ACERFI</strong>
            <p className="mb-0 mt-1" style={{ color: 'var(--text-secondary)' }}>
              ACERFI Formation propose des programmes certifiants dans 8 domaines clés du numérique,
              pensés pour les professionnels et futurs experts du marché africain.
            </p>
          </div>
        </div>
      </div>

      {/* ── Grille 2×4 ── */}
      <div className="row">
        {FILIERES.filter(f => f.code !== 'AUTRE').map(f => (
          <div className="col-lg-3 col-md-4 col-sm-6 mb-4" key={f.code}>
            <div className="card h-100" style={{
              borderTop:    `4px solid ${f.couleur}`,
              borderRadius: 10,
              transition:   'transform .15s, box-shadow .15s',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = `0 8px 24px ${f.couleur}33`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = ''
                e.currentTarget.style.boxShadow = ''
              }}
            >
              <div className="card-body d-flex flex-column align-items-center text-center pt-4">

                {/* Icône */}
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background:   f.couleur,
                  display:      'flex', alignItems: 'center', justifyContent: 'center',
                  color:        f.couleurTexte, fontSize: 26, marginBottom: 12,
                  flexShrink:   0,
                }}>
                  <i className={f.icone} />
                </div>

                {/* Label */}
                <h6 className="font-weight-bold mb-2" style={{ color: 'var(--page-title)', fontSize: 14 }}>
                  {f.label}
                </h6>

                {/* Badge code */}
                <span style={{
                  background:   f.couleur + '22',
                  color:        f.couleur,
                  border:       `1px solid ${f.couleur}55`,
                  borderRadius: 20,
                  padding:      '2px 10px',
                  fontSize:     10,
                  fontWeight:   700,
                  marginBottom: 10,
                  letterSpacing: '.5px',
                }}>
                  {f.code}
                </span>

                {/* Description */}
                <p className="text-muted mb-0" style={{ fontSize: 12, lineHeight: 1.5 }}>
                  {f.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Note bas de page ── */}
      <div className="mt-2 text-center text-muted" style={{ fontSize: 12 }}>
        <i className="fas fa-info-circle mr-1" />
        Source : <strong>acerfi.net/formations</strong> — Yaoundé, Cameroun
      </div>

    </Layout>
  )
}
