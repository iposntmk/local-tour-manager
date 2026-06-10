# Agent Memory Index — Local Tour Manager

> Start here. This index tells you which document to read for each type of task.

## Documents

| File | When to read |
|------|-------------|
| [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) | First time on this project, tech stack, commands |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Finding files, understanding data flow, key patterns |
| [DATA_MODEL.md](DATA_MODEL.md) | Working with types, DB tables, Tour/Master/User entities |
| [WORKFLOWS.md](WORKFLOWS.md) | Settlement, commission, OCR import, Excel export flows |
| [CODING_RULES.md](CODING_RULES.md) | How to write code, common mistakes, adding new features |
| [KNOWN_DECISIONS.md](KNOWN_DECISIONS.md) | WHY things are the way they are, decisions not to revert |
| [RECENT_CHANGES.md](RECENT_CHANGES.md) | What changed recently, what's in progress |

## Quick Reference

### "Where is X?" — key locations
| What | Where |
|------|-------|
| All DB access | `src/lib/datastore/` |
| Tour types | `src/types/tour.ts` |
| Master data types | `src/types/master.ts` |
| Permission definitions | `src/types/user-permissions.ts` |
| Excel export entry | `src/lib/excel-utils.ts` → `src/lib/excel/` |
| Tour summary calc | `src/lib/tour-utils.ts` |
| Settlement utils | `src/lib/settlement-utils.ts` |
| Line review utils | `src/lib/tour-line-utils.ts` |
| Translations (i18n) | `src/lib/i18n.ts` |
| OCR parsing | `src/lib/ocr/` |
| Auth context/hook | `src/contexts/AuthContext.tsx` |
| Tour list page | `src/pages/Tours.tsx` + `src/pages/tours/` |
| Tour detail page | `src/pages/TourDetail.tsx` + `src/hooks/useTourDetail.ts` |
| DB migrations | `supabase/migrations/` |

### Critical rules (tl;dr)
1. **Never** use Supabase client directly — always `store` from `@/lib/datastore`
2. **Max 350 lines** per file, split if growing
3. **Excel export** needs no settlement approval — do NOT add back that check
4. **All dates** are `YYYY-MM-DD`, `totalDays` is INCLUSIVE `(end - start) + 1`
5. **All UI text** is Vietnamese
6. **Master admin**: `iposntmk@gmail.com` is hardcoded admin
7. **Supabase project**: `tuypgzkejqbbvubwomov`, already linked — skip login/link steps
