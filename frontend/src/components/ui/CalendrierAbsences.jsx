import { useState } from 'react'

const MONTH_NAMES = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

export default function CalendrierAbsences({ demandes = [] }) {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const daysInMonth = getDaysInMonth(year, month)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Build employee map (id → detail)
  const empMap = {}
  demandes.forEach(d => {
    if (d.employe_detail?.id) empMap[d.employe_detail.id] = d.employe_detail
  })
  const employes = Object.values(empMap)

  // Build absence map: empId → { dayNumber: couleur }
  const absMap = {}
  demandes.forEach(d => {
    const empId = d.employe_detail?.id
    if (!empId) return
    if (!absMap[empId]) absMap[empId] = {}
    const debut = new Date(d.date_debut + 'T00:00:00')
    const fin   = new Date(d.date_fin   + 'T00:00:00')
    for (let cur = new Date(debut); cur <= fin; cur.setDate(cur.getDate() + 1)) {
      if (cur.getFullYear() === year && cur.getMonth() === month) {
        absMap[empId][cur.getDate()] = d.type_conge_detail?.couleur || '#2E74B5'
      }
    }
  })

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // Build legend
  const typesLegend = []
  const seen = new Set()
  demandes.forEach(d => {
    const tc = d.type_conge_detail
    if (tc && !seen.has(tc.id)) { seen.add(tc.id); typesLegend.push(tc) }
  })

  return (
    <div>
      {/* Navigation mois */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <button className="btn btn-sm btn-outline-secondary" onClick={prevMonth}>
          <i className="fas fa-chevron-left" />
        </button>
        <strong style={{ color: 'var(--page-title)', fontSize: 14 }}>
          {MONTH_NAMES[month]} {year}
        </strong>
        <button className="btn btn-sm btn-outline-secondary" onClick={nextMonth}>
          <i className="fas fa-chevron-right" />
        </button>
      </div>

      {employes.length === 0 ? (
        <div className="text-center py-4 text-muted" style={{ fontSize: 13 }}>
          <i className="fas fa-calendar-times fa-2x mb-2 d-block" />
          Aucune absence approuvée ce mois.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered table-sm mb-2" style={{ fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{
                  minWidth: 130, position: 'sticky', left: 0, zIndex: 2,
                  background: 'var(--card-bg)', color: 'var(--text-primary)',
                }}>
                  Employé
                </th>
                {days.map(d => (
                  <th key={d} className="text-center p-0"
                    style={{
                      width: 22, minWidth: 22,
                      background: 'var(--card-bg)', color: 'var(--text-muted)',
                    }}>
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employes.map(emp => (
                <tr key={emp.id}>
                  <td style={{
                    fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap',
                    color: 'var(--text-primary)', position: 'sticky', left: 0,
                    background: 'var(--card-bg)', zIndex: 1,
                  }}>
                    {emp.full_name || emp.username}
                  </td>
                  {days.map(day => {
                    const color = absMap[emp.id]?.[day]
                    return (
                      <td key={day} className="p-0"
                        title={color ? (emp.full_name || emp.username) : ''}
                        style={{ background: color || 'transparent', height: 18, cursor: color ? 'default' : 'auto' }} />
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Légende types */}
      {typesLegend.length > 0 && (
        <div className="d-flex flex-wrap mt-1">
          {typesLegend.map(tc => (
            <span key={tc.id} className="badge mr-2 mb-1"
              style={{ background: tc.couleur, color: '#fff', fontSize: 11 }}>
              {tc.nom}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
