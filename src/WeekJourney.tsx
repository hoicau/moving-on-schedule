import { useI18n } from './LocaleProvider';
import { weekElapsedPercent, type Settings } from './schedule';

export function WeekJourney({
  settings,
  week,
  now,
}: {
  settings: Settings;
  week: number;
  now: Date;
}) {
  const { t } = useI18n();
  const progress = weekElapsedPercent(settings, week, now);
  return (
    <section
      className="week-progress sidebar-journey"
      aria-labelledby="journey-title"
    >
      <div>
        <span id="journey-title">{t('schedule.weekJourney')}</span>
        <strong>
          {progress}
          <small>%</small>
        </strong>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-labelledby="journey-title"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
    </section>
  );
}
