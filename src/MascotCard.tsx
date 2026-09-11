import { useI18n } from './LocaleProvider';

export function MascotCard() {
  const { t } = useI18n();
  return (
    <section className="quote-card mascot-card">
      <div className="mascot-art" aria-hidden="true">
        <svg viewBox="0 0 180 150" fill="none" aria-hidden="true">
          <ellipse cx="89" cy="133" rx="63" ry="10" fill="#d8ecff" />
          <path
            d="M35 128c-14 0-16-19-3-23 0-15 23-20 30-8 8-8 26-2 24 11 18-3 23 20 7 23H35Z"
            fill="white"
          />
          <g className="bunny">
            <ellipse
              cx="72"
              cy="42"
              rx="13"
              ry="31"
              transform="rotate(-13 72 42)"
              fill="#fffefd"
              stroke="#93bfdf"
              strokeWidth="2"
            />
            <ellipse
              cx="107"
              cy="42"
              rx="13"
              ry="31"
              transform="rotate(13 107 42)"
              fill="#fffefd"
              stroke="#93bfdf"
              strokeWidth="2"
            />
            <ellipse
              cx="72"
              cy="39"
              rx="6"
              ry="19"
              transform="rotate(-13 72 39)"
              fill="#f9dfe9"
            />
            <ellipse
              cx="107"
              cy="39"
              rx="6"
              ry="19"
              transform="rotate(13 107 39)"
              fill="#f9dfe9"
            />
            <ellipse
              cx="90"
              cy="108"
              rx="29"
              ry="26"
              fill="#fffefd"
              stroke="#93bfdf"
              strokeWidth="2"
            />
            <path
              d="M48 79c0-24 19-37 42-37s42 13 42 37c0 24-19 31-42 31S48 103 48 79Z"
              fill="#fffefd"
              stroke="#93bfdf"
              strokeWidth="2"
            />
            <ellipse cx="63" cy="87" rx="8" ry="5" fill="#f6cbdc" />
            <ellipse cx="117" cy="87" rx="8" ry="5" fill="#f6cbdc" />
            <ellipse cx="75" cy="78" rx="3.5" ry="5" fill="#426b8c" />
            <ellipse cx="105" cy="78" rx="3.5" ry="5" fill="#426b8c" />
            <circle cx="76" cy="76" r="1.2" fill="white" />
            <circle cx="106" cy="76" r="1.2" fill="white" />
            <path
              d="m87 85 3 2 3-2m-9 5c2 4 5 4 6 0 1 4 4 4 6 0"
              stroke="#426b8c"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="m66 111 24 4 24-4v24l-24 4-24-4Z"
              fill="#b6dcfb"
              stroke="#78aad2"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M90 116v22m-17-19 10 2m-10 5 10 2m14-7 10-2m-10 9 10-2"
              stroke="#78aad2"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <ellipse
              cx="63"
              cy="117"
              rx="7"
              ry="5"
              fill="#fffefd"
              stroke="#93bfdf"
              strokeWidth="1.5"
            />
            <ellipse
              cx="117"
              cy="117"
              rx="7"
              ry="5"
              fill="#fffefd"
              stroke="#93bfdf"
              strokeWidth="1.5"
            />
          </g>
          <path
            className="mascot-star"
            d="m145 35 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"
            fill="#f9df8d"
            stroke="#dbc47b"
            strokeLinejoin="round"
          />
          <path d="m30 64 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#b5d9f7" />
          <circle cx="148" cy="92" r="3" fill="#f5c9dc" />
          <circle cx="37" cy="39" r="2" fill="#b5d9f7" />
        </svg>
      </div>
      <span className="quote-kicker">YOUR LITTLE CHEER SQUAD</span>
      <h3 className="mascot-title">{t('mascot.title')}</h3>
      <p className="mascot-description">{t('mascot.description')}</p>
    </section>
  );
}
