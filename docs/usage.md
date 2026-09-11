# Usage

## Set up a timetable

1. Open **Timetable Settings**. Set the first Monday, semester length (1–30 weeks), and the start/end times of 12 daily class periods.
2. Choose **Start fresh** to clear the sample, or **Import Timetable** to import your schedule. Review the replacement option before confirming.
3. Use **Add course** or an empty timetable cell to add a class. Click a card to edit or delete it.
4. Navigate weeks using the arrows or sidebar calendar. Search by course, teacher, or room; switch to the list view for a compact overview.

Time conflicts are shown before saving or importing. Overlapping classes can be kept and appear side by side. The upcoming list follows the actual date, independently of the displayed week.

## Language

Use the language menu in the top bar to choose **English**, **简体中文**, or **繁體中文**. The first visit follows the first supported browser language, falling back to Simplified Chinese; an explicit choice is saved per browser and origin. Dates, controls, validation messages, and Excel templates follow this choice. Sample courses are translated for display; your own course names, teachers, rooms, notes, and custom semester names stay as entered.

## Appearance

Use the sun, moon, and monitor buttons in the top bar for **Light mode**, **Dark mode**, or **Follow system**. The default follows your device and updates when its appearance changes. An explicit light or dark choice overrides the device setting and is remembered in this browser independently of course data.

## Import Excel or CSV

Click **Import Timetable**, download the Excel template, and replace or delete its example row. Select or drag in your file, review the preview, and confirm an append or full replacement.

Templates and export headers use the selected language. Imports accept English, Simplified Chinese, and Traditional Chinese headers regardless of the interface language. Traditional headers include `課程名稱`, `開始節次`, `結束節次`, `週次`, `教師`, and `備註`; `週一`–`週日` and `禮拜一`–`禮拜日` are accepted day names.

Each row represents one weekly meeting. For a course meeting on several days, add a row per meeting. The first nonempty row contains column headers; columns may be reordered.

| English header | Chinese header | Required | Example / accepted values                        |
| -------------- | -------------- | -------- | ------------------------------------------------ |
| `name`         | `课程名称`     | Yes      | `Calculus`                                       |
| `day`          | `星期`         | Yes      | `1`–`7` (Monday–Sunday), `Mon`, `Monday`, `周一` |
| `start`        | `开始节次`     | Yes      | `1`–`12`                                         |
| `end`          | `结束节次`     | Yes      | `1`–`12`, no earlier than `start`                |
| `weeks`        | `周次`         | Yes      | `1-16`, `1,3,5`, `1-16(单)`, `2-16(双)`          |
| `room`         | `教室`         | No       | `A-302`                                          |
| `teacher`      | `教师`         | No       | `Dr. Chen`                                       |
| `note`         | `备注`         | No       | `Bring textbook`                                 |

`单` means odd weeks; `双` means even weeks. The equivalent markers `單` / `雙` and `odd` / `even` are also accepted in every interface language, for example `1-16(odd)` or `2-16(雙)`. Weeks must fall within the configured semester.

```csv
name,day,start,end,weeks,room,teacher,note
Calculus,Mon,1,2,1-16,A-302,Dr. Chen,Bring textbook
Design,Wed,5,6,"1,3,5",Studio,Ada,
```

- Supported files: `.xlsx` and UTF-8 `.csv`, up to 10 MiB and 2,000 meetings. For XLSX, keep the used worksheet within 2,001 rows including the header.
- Excel reads the first nonempty worksheet; its name appears in the preview. Blank data rows are skipped.
- Invalid rows block the entire import. Fix the reported rows and select the file again; nothing is imported until confirmation.
- The preview displays up to 50 valid rows; confirmation imports all valid rows once errors are resolved.
- Convert legacy `.xls` files to `.xlsx`. Merged-cell calendar layouts and arbitrary school-export formats are not automatically recognized.

## Export and storage

Use the download icon above the timetable to export all course meetings as Excel. Exported courses can be imported again. Semester settings, class times, and custom colors are not included in this export.

Courses and settings are automatically stored in this browser's `localStorage`. A normal site update preserves them while the origin and storage format remain compatible. Clearing site data removes them; private sessions may discard them on exit.

Different browsers, devices, ports, and domains have separate storage. To move courses between them, export from the old location and import at the new one; re-enter semester settings as needed. If saving fails, the app displays a warning—export before closing the page.

## Current scope

The app manages one timetable of recurring weekly classes. Accounts, cloud sync, school-system scraping, push notifications, one-off rescheduling, exams, and multiple timetables are not implemented. Google Fonts is the external font source, with system-font fallback; spreadsheet parsing stays in the browser.
