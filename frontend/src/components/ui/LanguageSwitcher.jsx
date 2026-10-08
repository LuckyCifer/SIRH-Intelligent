import { useTranslation } from 'react-i18next'

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.language?.startsWith('en') ? 'en' : 'fr'

  function switchTo(lang) {
    i18n.changeLanguage(lang)
  }

  return (
    <li className="nav-item ml-1 mr-1">
      <div style={{ display: 'flex', gap: 2 }}>
        <button
          onClick={() => switchTo('fr')}
          style={{
            padding: '2px 7px',
            fontSize: 11,
            fontWeight: current === 'fr' ? 700 : 400,
            border: '1px solid',
            borderColor: current === 'fr' ? 'var(--acerfi-blue, #2E74B5)' : '#ccc',
            borderRadius: '3px 0 0 3px',
            background: current === 'fr' ? 'var(--acerfi-blue, #2E74B5)' : 'transparent',
            color: current === 'fr' ? '#fff' : 'var(--text-secondary, #666)',
            cursor: 'pointer',
            lineHeight: '1.4',
          }}
          title="Français"
        >
          FR
        </button>
        <button
          onClick={() => switchTo('en')}
          style={{
            padding: '2px 7px',
            fontSize: 11,
            fontWeight: current === 'en' ? 700 : 400,
            border: '1px solid',
            borderColor: current === 'en' ? 'var(--acerfi-blue, #2E74B5)' : '#ccc',
            borderRadius: '0 3px 3px 0',
            marginLeft: -1,
            background: current === 'en' ? 'var(--acerfi-blue, #2E74B5)' : 'transparent',
            color: current === 'en' ? '#fff' : 'var(--text-secondary, #666)',
            cursor: 'pointer',
            lineHeight: '1.4',
          }}
          title="English"
        >
          EN
        </button>
      </div>
    </li>
  )
}
