## Krok 3 - co i dlaczego

Zbudowałam cofanie odrzucenia wiadomości, bo kiedy tylko wypróbowałam przyciski, to chciałam to cofnąć - pomyślałam, że klient niejednokrotnie usunie coś tam przez przypadek albo będzie chciał wrócić do tego, co odrzucił. Dodałam też formularz do ręcznego dodawania wiadomości (POST /api/classify), theme toggle, oraz keyword-based fallback classifier, który działa bez klucza OpenAI, bo nie migłam sobie niestety pozwolić na zakup tokenów. Styling w 99% jest w globals.css - uważam, że kolory i style nie powinny być rozproszone po komponentach.

## AI - jak używałam

- Narzędzia: Claude Code
- Prompt który zadziałał najlepiej: "Could you delete every obsolete className EVERYWHERE? we should always change styling IN STYLING FILE. globals.css babes"
- Gdzie AI się pomylił i co poprawiłam ręcznie: Przy ustawianiu kolorów w light/dark mode Claude zrobił to nieczytelnie i nabałaganił - ustawił jasny tekst na jasnym tle, co było nieczytelne. Podkreśliłam, żeby nigdy nie ustawiał jasnego tekstu na jasnym tle (tekst ciemny, tło jasne w light mode; tekst jasny, tło ciemne w dark mode). Po tej poprawce było ładnie i czysto. Poza tym, rozrzucił klasy kolorów po TSX zamiast trzymać je w globals.css - musiałam go poprosić o refactor do semantic CSS classes.
- Szacowany udział AI w kodzie: około 60% wygenerowane (głównie styling, boilerplate, fallback classifier - wszystkie takie "mechaniczne" rzeczy, koniecznie poprosiłam Claude'a o zrobienie wiadomości dla OpenAI, AI AI zrozumie pewnie najlepiej), około 40% napisane ręcznie (logika route.ts, logika stanu w queue/page.tsx - wszystkie "architekct" rzeczy:)