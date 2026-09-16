import { buildInfo } from './buildInfo';
import { useI18n } from './LocaleProvider';
import { icpConfig } from './icp-config';

export function Footer() {
  const { t, date } = useI18n();
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
      <span className="app-version">
        <span title={details}>
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

        {icpConfig && (
          <span>
            &nbsp;
            <a href={icpConfig.link} target="_blank" rel="noopener noreferrer">
              {icpConfig.text}
            </a>
          </span>
        )}
      </span>
    </footer>
  );
}
