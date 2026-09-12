# Usage

## Set up a timetable

1. Open **Timetable settings** at the bottom of the sidebar. Set the **First day of semester**, semester length (1–30 weeks), and **Periods per day** (1–30, default 12). The first day may be any weekday. Set period start/end times if needed. Use 24-hour `HH:mm` (for example `08:00` or `14:30`). Times default to blank; existing saved times are preserved.
2. Choose **Start fresh** to clear the sample, or **Import Timetable** to import your schedule. Review the replacement option before confirming.
3. Use **Add course** or an empty timetable cell to add a class. Click a card for details, then choose **Edit course** to edit or delete it. In **Start time / period** and **End time / period**, use period integers (`1`, `2`) or 24-hour clock times (`08:00`, `09:40`). Both ends must use the same format; clock-time courses must end later on the same day.
4. Navigate weeks using the arrows or sidebar calendar. Search by course, teacher, or room; use **All courses** in the sidebar for a compact overview. The timetable always uses the weekly grid.

Weeks run Monday–Sunday. A semester starting on Thursday has a partial first week; courses before that Thursday are omitted. Increasing the daily period count adds blank rows. Before reducing it, adjust any courses that use the periods being removed.

Time conflicts are shown before saving or importing. Overlapping classes can be kept and appear side by side. **Coming up** previews the next three meetings across dates, retaining all ongoing or uncertain immediate candidates. Its timeline sits on the right on desktop and landscape tablets, and runs horizontally above the timetable on phones and portrait tablets. Course tags keep their colors; remarks appear below course names. The timeline follows the actual date, independently of the displayed week. **This week’s journey** below the sidebar calendar shows elapsed time in the selected week, not course completion. The rabbit card appears below Coming up on desktop and landscape tablets, and below the timetable on phones and portrait tablets. Finished courses retain their color under a subtle dark overlay. When clock times are missing, it shows dates and period numbers with an explicit time-not-set label. Today’s period courses with incomplete times remain visible without being classified as in progress. Courses entered with clock times work independently of the daily period settings and appear in a separate **By time** band under their dates. When daily times are missing, conflicts between clock-time and period courses are explicitly marked as uncertain.

## Language

Use the language menu in the top bar to choose **English**, **简体中文**, or **繁體中文**. The first visit follows the first supported browser language, falling back to English; an explicit choice is saved per browser and origin. Dates, controls, validation messages, and Excel templates follow this choice. Sample courses are translated for display; your own course names, teachers, rooms, remarks, and custom semester names stay as entered.

Locales use `en`, `zh-Hans`, and `zh-Hant`. Previously saved `zh-CN` / `zh-TW` preferences migrate automatically.

## Home display

Open **Display** above the timetable to toggle **Weekends** and **Show remarks on home**. Both choices are remembered in this browser. Remarks are hidden by default; enabling them shows nonempty remarks in course cards, the list, and Coming up. Long remarks are abbreviated on the home page and always available in full in course details. Hiding remarks never removes their contents.

If weekends are hidden while the viewed week has weekend classes, a visible notice lets you reveal them. On desktop, the timetable sets the content height; the right-hand cards fit that height, with a shared bottom edge and space below the content. Upcoming entries scroll when needed. The **Source code** link below **Getting started** in the sidebar opens the GitHub repository in a new tab. On mobile, open the navigation menu and scroll to the bottom of the sidebar to reach it.

## Appearance

Use the sun, moon, and monitor buttons in the top bar for **Light mode**, **Dark mode**, or **Follow system**. The default follows your device and updates when its appearance changes. An explicit light or dark choice overrides the device setting and is remembered in this browser independently of course data.

## Import Excel or CSV

Click **Import timetable** at the top of the home page, download the Excel template, and replace or delete its example row. Select or drag in your file, review the preview, and confirm an append or full replacement.

Templates and export headers use the selected language. The `start` and `end` columns accept period numbers or clock times using the same format in each row. Combined Chinese headers (`开始时间/节次`, `结束时间/节次`) and legacy period headers are accepted. Imports accept English, Simplified Chinese, and Traditional Chinese headers regardless of the interface language. Traditional headers include `課程名稱`, `開始節次`, `結束節次`, `週次`, `教師`, and `備註`; `週一`–`週日` and `禮拜一`–`禮拜日` are accepted day names.

The English remark header is `remark`; legacy `note` / `notes` and `remarks` are still accepted.

Each row represents one weekly meeting. For a course meeting on several days, add a row per meeting. The first nonempty row contains column headers; columns may be reordered.

| English header | Chinese header  | Required | Example / accepted values                                                    |
| -------------- | --------------- | -------- | ---------------------------------------------------------------------------- |
| `name`         | `课程名称`      | Yes      | `Calculus`                                                                   |
| `day`          | `星期`          | Yes      | `1`–`7` (Monday–Sunday), `Mon`, `Monday`, `周一`                             |
| `start`        | `开始时间/节次` | Yes      | Period `1`–your configured daily count or `HH:mm`                            |
| `end`          | `结束时间/节次` | Yes      | Period `1`–your configured daily count or `HH:mm`, matching the start format |
| `weeks`        | `周次`          | Yes      | `1-16`, `1,3,5`, `1-16(单)`, `2-16(双)`                                      |
| `room`         | `教室`          | No       | `A-302`                                                                      |
| `teacher`      | `教师`          | No       | `Dr. Chen`                                                                   |
| `remark`       | `备注`          | No       | `Bring textbook`                                                             |

`单` means odd weeks; `双` means even weeks. The equivalent markers `單` / `雙` and `odd` / `even` are also accepted in every interface language, for example `1-16(odd)` or `2-16(雙)`. Weeks must fall within the configured semester.

```csv
name,day,start,end,weeks,room,teacher,remark
Calculus,Mon,1,2,1-16,A-302,Dr. Chen,Bring textbook
Design,Wed,14:00,15:30,"1,3,5",Studio,Ada,
```

- Supported files: `.xlsx` and UTF-8 `.csv`, up to 10 MiB and 2,000 meetings. For XLSX, keep the used worksheet within 2,001 rows including the header.
- Excel reads the first nonempty worksheet; its name appears in the preview. Blank data rows are skipped.
- Invalid rows block the entire import. Fix the reported rows and select the file again; nothing is imported until confirmation.
- The preview displays up to 50 valid rows; confirmation imports all valid rows once errors are resolved.
- Convert legacy `.xls` files to `.xlsx`. Merged-cell calendar layouts and arbitrary school-export formats are not automatically recognized.

## Export and storage

Use **Display → Export Excel timetable** above the timetable to export all course meetings as Excel. Exported courses can be imported again. Semester settings, class times, and custom colors are not included in this export.

Courses and settings are automatically stored in this browser's `localStorage`. A normal site update preserves them while the origin and storage format remain compatible. Clearing site data removes them; private sessions may discard them on exit.

Different browsers, devices, ports, and domains have separate storage. To move courses between them, export from the old location and import at the new one; re-enter semester settings as needed. If saving fails, the app displays a warning—export before closing the page.

## Current scope

The app manages one timetable of recurring weekly classes. Accounts, cloud sync, school-system scraping, push notifications, one-off rescheduling, exams, and multiple timetables are not implemented. Google Fonts is the external font source, with system-font fallback; spreadsheet parsing stays in the browser.

The header language selector and appearance switch share a 40px control height, including on mobile.
