import { buildInfo } from './buildInfo';
import { useI18n } from './LocaleProvider';
import { filingConfig } from './filing-config';

export function Footer() {
  const { t, date } = useI18n();
  const icpText = filingConfig.icp.text.trim();
  const publicSecurityText = filingConfig.publicSecurity.text.trim();
  const publicSecurityIcon = filingConfig.publicSecurity.icon.trim();
  const version = buildInfo.version.replace(/^(\d+\.\d+)\.0$/, '$1');
  const commit = buildInfo.commit;
  const builtAt = date(new Date(buildInfo.builtAt), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  const details = [
    t('footer.builtAt', { 0: builtAt }),
    buildInfo.dirty && t('footer.uncommittedChanges'),
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <footer className="app-footer">
      <span className="app-version" title={details}>
        Moving-on Schedule v{version}
        {commit && (
          <>
            {' ('}
            <a
              href={`https://github.com/hoicau/moving-on-schedule/commit/${commit}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('footer.viewCommit', { 0: commit.slice(0, 7) })}
            >
              {commit.slice(0, 7)}
            </a>
            {buildInfo.dirty && '*'}
            {')'}
          </>
        )}
      </span>
      {icpText && (
        <a
          className="app-filing"
          href={filingConfig.icp.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          {icpText}
        </a>
      )}
      {publicSecurityText && (
        <a
          className="app-filing"
          href={filingConfig.publicSecurity.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          {publicSecurityIcon && (
            <img src={publicSecurityIcon} alt="" width="16" height="16" />
          )}
          <span>{publicSecurityText}</span>
        </a>
      )}
    </footer>
  );
}
