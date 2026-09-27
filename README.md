# moribin
my first repositry

## 英語雑談ボット（English Chat）

Claude くんと英語（CEFR B2 = 東大レベル）で雑談しながら、ミスを添削して
Claude Docs の「[要注意 文法・単語集](https://claude.ai/code/artifact/d07d57d4-88ef-4514-8097-8b1322a80f7e)」に記録します。

使い方: このリポジトリで Claude Code を開き、`/english-chat` と打つ（または「英語で雑談しよう」と話しかける）。

- 返答の下に `📝 Corrections`（× → ○ と日本語の理由）が付きます。
- ミスはドキュメント冒頭の「編集ルール」に従って【ミス集】に記録されます（既存項目なら回数 +1、5 回以上は 🔴）。
- 「まとめ」「日本語で」「レベル上げて/下げて」「おわり」が使えます。
- 記録には Claude Docs connector が必要です。

中身は `.claude/skills/english-chat/SKILL.md` にあります。
