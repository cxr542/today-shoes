# Today Shoes: existing component contract

Date Run Phase 1–2 preserves the existing Expo/React Native home design.
Sources: src/theme.ts, src/ui.tsx, src/screens/HomeTab.tsx.

## Tokens

Use theme.bg/card/cardMuted for surfaces, theme.text/textSecondary for text,
theme.orange for the distance and primary action, theme.greenDark for selected
status, and theme.danger for storage errors. Space and radius use theme tokens.
Existing cardShadow remains owned by Card.

## Typography

System font; existing body 13px/21px, label 15px/800, unit 18px/800.
Date Run distance uses 40px/900 with tabular numbers as the primary information.
Date label uses 13px. Text may wrap and respect platform font scaling.

## Layout

Home ScrollView owns scrolling. Date Run appears after the dashboard and before
the tip banner. Horizontal margin and bottom gap are theme.space.md.
Use the existing WebAppFrame and bottom tabs without changing their layout.

## Primitives and states

Reuse Card and PrimaryButton. DateRunCard contains live text and a single action.
States: loading, available, selected, saving, load failure, save failure.
Selected uses green text and a muted instruction surface; cancel uses outline.
Loading/saving disable the action. Error text offers retry without claiming success.
No new animations, theme system, UI dependencies, or automatic watch transfer.

## Accessibility and accepted existing limitations

Status uses a polite live region and error uses alert semantics.
Preserve the existing Pressable interaction and theme in both OS color schemes.
The project currently has a single light palette; adding a dark palette or replacing
shared button semantics is outside this feature's scope. New tools/dependencies
for a framework-wide redesign are also outside the requested additive MVP.
