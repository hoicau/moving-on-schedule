import { useId } from 'react';
import { useI18n } from './LocaleProvider';

export function CourseVisibilityToggle({
  visible,
  onChange,
}: {
  visible: boolean;
  onChange: (visible: boolean) => void;
}) {
  const { t } = useI18n();
  const id = useId();
  return (
    <div className="course-visibility">
      <div className="course-visibility-copy">
        <label htmlFor={id}>{t('course.showOnTimetable')}</label>
        <p id={`${id}-help`}>{t('course.visibilityHelp')}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={visible}
        aria-label={t('course.showOnTimetable')}
        aria-describedby={`${id}-help`}
        className="course-visibility-switch"
        onClick={() => onChange(!visible)}
      >
        <span aria-hidden="true" />
      </button>
    </div>
  );
}
